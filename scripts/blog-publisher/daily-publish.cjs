#!/usr/bin/env node
/**
 * daily-publish.cjs — النشر اليومي التلقائي للمدونة القانونية
 * - يقرأ قائمة المواضيع الجاهزة + سجل النشر
 * - ينشر 5 مواضيع يومياً (لم تُنشر بعد) — يغطي أعلى عمليات البحث في القانون المصري
 * - يولّد المقال عبر Gemini (GEMINI_API_KEY من .env) — لا يقل عن 3000 كلمة
 * - يولّد صورة توضيحية لكل مقال عبر Nano Banana (gemini-2.5-flash-image)
 *   مع fallback تلقائي إلى SVG احترافي مُصمَّم محلياً إن كانت الصور محجوبة (quota)
 * - يبني صفحة HTML كاملة بنسق المدونة الحالي مع إرفاق الصورة
 * - يحدّث index.html و published-log.json
 * - ينشر على Firebase Hosting
 *
 * التشغيل: node scripts/blog-publisher/daily-publish.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const { GoogleGenAI, Type } = require('@google/genai');
const { headerMarkup, HEADER_CSS } = require('../seo/unified-header.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const IMG_DIR = path.join(BLOG_DIR, 'images');
const TOPICS_FILE = path.join(__dirname, 'topics.json');
const LOG_FILE = path.join(__dirname, 'published-log.json');
// السجلّ الرئيسي المختوم باليدوي — يُزامن مع LOG_FILE لتفادي انفصال السجلّين
const LEGACY_LOG_FILE = path.join(ROOT, 'scripts', 'published-log.json');
const BASE_URL = 'https://mohamidigital.online';
const ARTICLES_PER_RUN = Number(process.env.ARTICLES_PER_RUN) || 5; // عدد المقالات في كل تشغيل (قابل للتجاوز عبر env)
const MIN_WORDS = 3000; // الحد الأدنى لعدد كلمات المقال
const IMAGE_MODEL = 'gemini-2.5-flash-image'; // Nano Banana
// نماذج النص المدعومة — كل نموذج له حصة مجانية يومية منفصلة، نوزّع الطلبات
// بينهم بالتناوب لرفع الطاقة الكلية اليومية (20 طلباً × عدد النماذج).
const TEXT_MODELS = [
  process.env.TEXT_MODEL || 'gemini-2.5-pro',
  'gemini-1.5-pro',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
];
// مؤشر النموذج الحالي: 0..TEXT_MODELS.length-1
let textModelIdx = 0;

function currentTextModel() {
  return TEXT_MODELS[textModelIdx % TEXT_MODELS.length];
}

// الانتقال للنموذج التالي في القائمة (يُستدعى عند استنفاد حصة النموذج الحالي)
function advanceTextModel() {
  textModelIdx = (textModelIdx + 1) % TEXT_MODELS.length;
  console.log(`[publish] ⚠️  التحويل إلى نموذج النص: ${currentTextModel()}`);
  return currentTextModel();
}

dotenv.config({ path: path.join(ROOT, '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CAIRO_OFFSET = 120; // دقائق (UTC+2)

// ── التاريخ بتوقيت القاهرة ────────────────────────────────────────────────
function cairoNow() {
  const now = new Date(Date.now() + CAIRO_OFFSET * 60000);
  return {
    iso: now.toISOString(),
    dateStr: now.toISOString().slice(0, 10),
    dateLabel: now.toLocaleDateString('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric', month: 'long', day: 'numeric',
    }),
  };
}

// ── أدوات JSON آمنة ───────────────────────────────────────────────────────
function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── مزامنة السجلّين: دمج published عبر slug مع إبقاء آخر نسخة فريدة ─────────
// السجلّان: LOG_FILE (مصدر السكربت) و LEGACY_LOG_FILE (المكتوب يدويًا قديمًا).
// المطلوب: مجموعة موحّدة من slugs المنشورة، تُستخدم لتفادي التكرار.
function loadUnifiedLog() {
  const local = readJson(LOG_FILE, { published: [], skipped: [] });
  const legacy = readJson(LEGACY_LOG_FILE, { published: [] });

  // تهيئة آمنة للمفاتيح الناقصة
  if (!Array.isArray(local.published)) local.published = [];
  if (!Array.isArray(local.skipped)) local.skipped = [];
  if (!Array.isArray(legacy.published)) legacy.published = [];
  if (typeof local.last_run !== 'string') local.last_run = null;

  // دمج published: استخدم slug كمفتاح، آخر نسخة تفوز
  const bySlug = new Map();
  for (const entry of [...legacy.published, ...local.published]) {
    if (entry && typeof entry.slug === 'string') bySlug.set(entry.slug, entry);
  }
  const unified = Array.from(bySlug.values());

  return {
    log: local,
    publishedSlugs: new Set(unified.map(e => e.slug)),
    published: unified,
  };
}

// ── كتابة السجلّ في كلا المسارين لتفادي الانفصال مستقبلًا ─────────────────
function writeLogBoth(localLog) {
  // أعِد بناء النسخة المحلية بشكل آمن
  const safeLocal = {
    published: localLog.published || [],
    skipped: localLog.skipped || [],
    last_run: localLog.last_run || null,
  };
  writeJson(LOG_FILE, safeLocal);

  // اكتب نسخة موحّدة في LEGACY_LOG_FILE مع preserve أي مفاتيح يدوية
  const legacy = readJson(LEGACY_LOG_FILE, { published: [] });
  const legacyBySlug = new Map();
  for (const e of legacy.published) if (e && e.slug) legacyBySlug.set(e.slug, e);
  for (const e of safeLocal.published) if (e && e.slug) legacyBySlug.set(e.slug, e);
  writeJson(LEGACY_LOG_FILE, { published: Array.from(legacyBySlug.values()) });
}

// ── عدّ كلمات المحتوى العربي (نص أو مصفوفة نصوص) ──────────────────────────
function countWords(content) {
  const texts = [];
  if (typeof content === 'string') texts.push(content);
  else if (Array.isArray(content)) texts.push(...content);
  for (const t of texts) {
    if (typeof t !== 'string') continue;
    // احسب الكلمات العربية واللاتينية والأرقام كوحدات
    const matches = t.match(/[\u0600-\u06FF]+|[A-Za-z0-9]+/g);
    if (matches) return matches.length;
  }
  return 0;
}

// ── حساب عدد كلمات المقال كاملاً (كل الحقول) ──────────────────────────────
function articleWordCount(data) {
  let total = countWords(data.title) + countWords(data.metaDescription) + countWords(data.intro);
  for (const sec of data.sections || []) {
    total += countWords(sec.heading) + countWords(sec.paragraphs) + countWords(sec.list);
  }
  total += countWords(data.tip) + countWords(data.conclusion);
  return total;
}

// ── توليد صورة توضيحية عبر Nano Banana (gemini-2.5-flash-image) ───────────
// تحاول التوليد عبر النموذج؛ إن مُنعت (quota 429 / billing) تُرجع null
// ليستخدم المتصل الـ fallback المحلي (SVG).
async function generateImage(ai, topic, data) {
  const imagePrompt = `ارسم صورة توضيحية احترافية بلون واحد مسطح (flat illustration) بجودة عالية للموضوع القانوني المصري التالي:
الموضوع: ${topic.title}
التصنيف: ${topic.category}
الأسلوب: رسوم توضيحية حديثة (flat design) بخلفية متدرجة داكنة (كحلي/بنفسجي)، أيقونات قانونية واضحة (ميزان، أوراق، أعمدة محكمة)، ألوان نابضة، بدون أي نصوص أو حروف مكتوبة في الصورة.`;

  const resp = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ text: imagePrompt }],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio: '16:9', imageSize: '1K' },
    },
  });

  const parts = (resp.candidates?.[0]?.content?.parts) || [];
  const img = parts.find(p => p.inlineData && p.inlineData.data);
  if (!img) return null;
  const buf = Buffer.from(img.inlineData.data, 'base64');
  if (buf.length < 5000) return null; // صورة تالفة/فارغة
  return buf;
}

// ── صور غلاف حقيقية بديلة (عند فشل Nano Banana بسبب quota 429 أو غيره) ─────
// فيسبوك لا يعرض SVG في معاينة الروابط (og:image)، لذا أي مقال بغلاف SVG فقط
// يظهر منشوره على الصفحة بلا صورة. الترتيب: Pollinations (ذكاء، مجاني) ثم
// Unsplash (صورة فوتوغرافية حسب التصنيف) ثم SVG المحلي كحل أخير.
const COVER_UNSPLASH = {
  'قانون الإيجارات': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&h=675&q=80',
  'الميراث': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&h=675&q=80',
  'قانون الأسرة': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&h=675&q=80',
  'قانون العمل': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&h=675&q=80',
  'حقوق المستهلك': 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1200&h=675&q=80',
  'الشركات': 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&h=675&q=80',
  'التنفيذ': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&h=675&q=80',
  'القانون التجاري': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&h=675&q=80',
  'العقود': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&h=675&q=80',
  'القانون المدني': 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1200&h=675&q=80',
  'القانون الإداري': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&h=675&q=80',
  'الملكية الفكرية': 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1200&h=675&q=80',
  'إجراءات قضائية': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&h=675&q=80',
  'قانون عقاري': 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&h=675&q=80',
  'قانون ضريبي': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&h=675&q=80',
  'القانون الجنائي': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&h=675&q=80',
};
const COVER_DEFAULT = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&h=675&q=80';
const COVER_EN = {
  'قانون الإيجارات': 'Egyptian real estate rent lease contract documents',
  'الميراث': 'Egyptian inheritance law legal documents family',
  'قانون الأسرة': 'Egyptian family law marriage contract legal',
  'قانون العمل': 'Egyptian labor law workers employment office',
  'حقوق المستهلك': 'Egyptian consumer protection shopping rights',
  'الشركات': 'Egyptian company law business corporate office',
  'التنفيذ': 'Egyptian court enforcement bailiff legal seizure',
  'القانون التجاري': 'Egyptian commercial law trade business contract',
  'العقود': 'Egyptian contract law signing documents pen',
  'القانون المدني': 'Egyptian civil law code scales justice',
  'القانون الإداري': 'Egyptian administrative law government building justice',
  'الملكية الفكرية': 'Egyptian intellectual property copyright creative',
  'إجراءات قضائية': 'Egyptian court procedures gavel scales justice',
  'قانون عقاري': 'Egyptian real estate law property keys documents',
  'قانون ضريبي': 'Egyptian tax law finance calculator documents',
  'القانون الجنائي': 'Egyptian criminal law justice gavel handcuffs',
};

async function downloadImage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error('صورة صغيرة/فارغة');
  return buf;
}

async function fetchPollinations(topic) {
  const prompt = `${COVER_EN[topic.category] || 'Egyptian law justice gavel scales'}, professional editorial photography, high quality, sharp, no text, no words, no letters`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=675&nologo=true&seed=${Date.now() % 100000}`;
  return downloadImage(url);
}

async function fetchUnsplash(topic) {
  return downloadImage(COVER_UNSPLASH[topic.category] || COVER_DEFAULT);
}

// يرجع Buffer (JPG 1200×675) أو null إذا فشلت كل المصادر البديلة.
async function generateFallbackImage(topic) {
  for (const [name, fn] of [['pollinations', fetchPollinations], ['unsplash', fetchUnsplash]]) {
    try {
      const buf = await fn(topic);
      const sharp = require('sharp');
      const out = await sharp(buf).resize(1200, 675, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      console.log(`[publish] ✓ غلاف حقيقي عبر ${name} (${Math.round(out.length / 1024)} KB)`);
      return out;
    } catch (e) {
      console.log(`[publish] ⚠️ ${name} غير متاح (${String((e && e.message) || e).slice(0, 70)}).`);
    }
  }
  return null;
}

// ── توليد SVG احترافي محلياً (fallback بلا تكلفة) ──────────────────────────
// يُصمَّم بنسق المدونة الداكن مع لون الغلاف الخاص بالموضوع وأيقونة فريدة.
const SVG_PALETTES = {
  amber:   ['#f59e0b', '#b45309', '#78350f'],
  indigo:  ['#6366f1', '#4f46e5', '#312e81'],
  cyan:    ['#06b6d4', '#0891b2', '#164e63'],
  purple:  ['#a855f7', '#7c3aed', '#4c1d95'],
  emerald: ['#10b981', '#059669', '#064e3b'],
};
const SVG_ICONS = ['⚖️', '📜', '🏛️', '📄', '🔒', '💼', '🏠', '💵', '🛒', '🚗', '🏢', '👶', '💔', '⏳', '™️', '🌍'];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
}

function generateSvgImage(topic) {
  const pal = SVG_PALETTES[topic.coverClass] || SVG_PALETTES.indigo;
  const icon = topic.icon || '⚖️';
  const rgb = hexToRgb(pal[0]);
  const slugSafe = (topic.slug || 'article').replace(/[^\w-]/g, '-');
  // ميزان العدالة مرسوم بشكل متجهي (متسق العرض على كل المنصات — بدل الأيقونة emoji)
  const scaleVector = `<g transform="translate(600,340)" fill="none" stroke="#e2e8f0" stroke-width="6" stroke-linecap="round">
    <line x1="0" y1="8" x2="0" y2="120"/>
    <path d="M0 8 L-88 -52 M0 8 L88 -52 M0 8 L0 -70" stroke-width="7"/>
    <circle cx="0" cy="-78" r="10" fill="none" stroke="#fbbf24" stroke-width="6"/>
    <path d="M-78 -56 q-14 -18 0 -36 q14 18 0 36 Z" fill="${pal[0]}"/>
    <path d="M78 -56 q-14 -18 0 -36 q14 18 0 36 Z" fill="${pal[0]}"/>
    <path d="M-88 -52 l-14 6 M-78 -56 l-14 6 M88 -52 l14 6 M78 -56 l14 6" stroke-width="4" opacity="0.6"/>
    <path d="M0 120 l-70 26 M0 120 l70 26" stroke-width="5"/>
    <path d="M-70 146 l-4 16 M-60 140 l-4 16 M70 146 l4 16 M60 140 l4 16" stroke-width="4" opacity="0.7"/>
  </g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:${pal[2]}"/>
    </linearGradient>
    <linearGradient id="glow" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:${pal[0]};stop-opacity:0.55"/>
      <stop offset="100%" style="stop-color:${pal[0]};stop-opacity:0.05"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="42%" r="45%">
      <stop offset="0%" style="stop-color:${pal[0]};stop-opacity:0.28"/>
      <stop offset="100%" style="stop-color:${pal[0]};stop-opacity:0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="rgba(${rgb},0.5)"/>
    </filter>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#halo)"/>
  <g opacity="0.07">
    <circle cx="180" cy="540" r="260" fill="none" stroke="#fff" stroke-width="1.5"/>
    <circle cx="180" cy="540" r="180" fill="none" stroke="#fff" stroke-width="1.5"/>
    <circle cx="1020" cy="120" r="260" fill="none" stroke="#fff" stroke-width="1.5"/>
    <circle cx="1020" cy="120" r="180" fill="none" stroke="#fff" stroke-width="1.5"/>
  </g>
  <rect x="400" y="140" width="400" height="430" rx="48" fill="url(#glow)" filter="url(#shadow)"/>
  <rect x="400" y="140" width="400" height="430" rx="48" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
  ${scaleVector}
  <rect x="300" y="600" width="600" height="4" rx="2" fill="${pal[0]}" opacity="0.6"/>
  <text x="600" y="34" font-size="26" font-weight="700" fill="${pal[0]}" text-anchor="middle" font-family="Cairo, sans-serif" letter-spacing="2">المحامي الرقمي</text>
  <text x="600" y="648" font-size="32" font-weight="700" fill="#e2e8f0" text-anchor="middle" font-family="Cairo, sans-serif">${topic.title}</text>
</svg>`;
  return { svg, ext: 'svg', mime: 'image/svg+xml' };
}

// ── حفظ صورة المقال (حقيقية أو SVG) وإرجاع مسارها النسبي ───────────────────
function saveArticleImage(bufOrSvg, topic, slug, index) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const filename = `${slug}${index > 1 ? `-${index}` : ''}`;
  if (bufOrSvg && Buffer.isBuffer(bufOrSvg)) {
    const file = path.join(IMG_DIR, `${filename}.jpg`);
    fs.writeFileSync(file, bufOrSvg);
    return `/blog/images/${filename}.jpg`;
  }
  const file = path.join(IMG_DIR, `${filename}.svg`);
  fs.writeFileSync(file, bufOrSvg.svg, 'utf8');
  return `/blog/images/${filename}.svg`;
}

// ── اختيار المواضيع ───────────────────────────────────────────────────────
// ترجع المواضيع غير المنشورة بترتيب ثابت (أقدمها أولاً) وعددها ناتج الإصدار.
function pickTopics(topics, publishedSlugs, count) {
  const set = publishedSlugs instanceof Set ? publishedSlugs : new Set([]);
  const available = topics.evergreen.filter(t => !set.has(t.slug));
  return available.slice(0, count);
}

// ── توليد المقال عبر Gemini (≥ MIN_WORDS كلمة) ─────────────────────────────
const SYSTEM_ROLE = `أنت محرر محتوى قانوني مصري خبير في منصة "المحامي الرقمية" (منصة لإدارة مكاتب المحاماة في مصر).`;

function articlePrompt(topic, usedTitles, existingSections, usedHeadings) {
  const usedTopics = (usedTitles || []).join(' | ');
  const headingsHint = (usedHeadings || []).length
    ? `\nالعناوين المستخدمة سابقاً (لا تكررها): ${usedHeadings.join(' | ')}`
    : '';

  const structureHint = existingSections && existingSections.length
    ? `\nأكمل الأقسام من حيث توقفت، أضف ${Math.max(5, 14 - existingSections.length)} أقساماً جديدة غير مكررة.`
    : '';

  // في التوليد الأول نلزم النموذج بعدد أكبر من الأقسام لإنتاج مقال كامل من دفعة واحدة
  const initialSectionsHint = existingSections && existingSections.length ? '' : `
10. في هذه الاستجابة الأولية اكتب فحسب 14 قسماً كاملة من الأقسام (heading + paragraphs + list لكل قسم)،
    ولا تكتب قسم "الخلاصة" ولا "خاتمة" بعد — ستُستكمل الأقسام الباقية لاحقاً.
11. لا تقصّر الفقرات: كل فقرة من 4-6 جمل مكتملة المعنى، وكل قسم من 3-4 فقرات.
    الهدف أن يصل هذا الجزء الأول وحده إلى 1800 كلمة على الأقل.`;

  return `${SYSTEM_ROLE}
اكتب مقالاً قانونياً شاملاً جديداً باللغة العربية الفصحى المبسطة حول الموضوع التالي:

الموضوع: ${topic.title}
التصنيف: ${topic.category}
كلمات مفتاحية مستهدفة: ${topic.keywords.join('، ')}

القواعد الصارمة:
1. المقال قانوني بحت ومرتبط بالقانون المصري تحديداً (نصوص وسوابق وممارسة عملية).
2. الطول: لا يقل إطلاقاً عن 3000 كلمة — اكتب مقالاً موسعاً وعميقاً.
3. اللغة عربية فصحى مبسطة بأسلوب صحفي/قانوني يسهل فهمه لغير المتخصصين.
4. لا تخترع أرقام مواد أو أرقام قوانين أو تواريخ غير متأكد منها — إذا لم تكن متأكداً اذكر الفكرة العامة دون رقم مادة.
5. أعد الصياغة بأسلوبك الخاص تماماً، لا تنسخ من أي مصدر.
6. البنية:
   - title: عنوان جذاب يبدأ بكلمة مفتاحية رئيسية
   - metaDescription: وصف SEO بحد أقصى 160 حرفاً
   - intro: مقدمة تشويقية من 3-4 أسطر
   - sections: من 12 إلى 16 قسماً، كل قسم بعنوان (heading) وفقرات (paragraphs: array of strings — كل فقرة من 3-5 جمل) واختيارياً list (array of strings — من 4-8 عناصر)
   - tip: نصيحة عملية قابلة للتنفيذ (سطران إلى ثلاثة أسطر)
   - conclusion: خاتمة عملية بنصيحة قابلة للتنفيذ
7. في النهاية أضف دعوة لاستخدام موقع «المحامي الرقمي» بشكل طبيعي داخل النص (مرة واحدة فقط).
8. مقالك يجب ألا يكرر هذه المواضيع المنشورة سابقاً: ${usedTopics}.
9. أجب بحصة JSON كاملة واحدة.
${initialSectionsHint}${headingsHint}${structureHint}

أجب حصراً بصيغة JSON بالبنية التالية بدون أي نص إضافي خارج JSON:
{
  "title": "...",
  "metaDescription": "...",
  "intro": "...",
  "sections": [
    { "heading": "...", "paragraphs": ["..."], "list": ["..."] }
  ],
  "tip": "...",
  "conclusion": "..."
}`;
}

// استدعاء واحد؛ يرجع JSON محللاً (لا يطبق حد الكلمات — يطبقه المستدعي).
// يعيد المحاولة على أخطاء JSON/الشبكة حتى 3 مرات قبل أن يفشل.
// عند استنفاد حصة نموذج (429) ينتقل للنموذج التالي تلقائياً ويجرب مجدداً.
async function generateArticle(ai, topic, usedTitles, existingSections, usedHeadings) {
  let lastErr;
  // محاولة على عدة نماذج: لكل نموذج حتى 3 محاولات، ثم ننتقل للنموذج التالي
  const modelsTried = new Set();
  for (let round = 0; round < TEXT_MODELS.length; round++) {
    const model = currentTextModel();
    modelsTried.add(model);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const prompt = articlePrompt(topic, usedTitles, existingSections, usedHeadings);
        const response = await ai.models.generateContent({
          model,
          contents: [{ text: prompt }],
          config: {
            responseMimeType: 'application/json',
            // رفع حد الإخراج لأقصى قيمة للسماح بمقالات طويلة (32768 طوكناً تقريباً)
            generationConfig: { maxOutputTokens: 32768, temperature: 0.8 },
          },
        });

        const text = response.text;
        if (!text) throw new Error('Gemini لم يُرجع نصاً');
        return { data: safeParseJson(text), model };
      } catch (err) {
        lastErr = err;
        const msg = String(err.message || '');
        // استنفاد الحصة: انتقل فوراً للنموذج التالي دون انتظار (الحصة اليومية لا تتجدد).
        if (msg.includes('429') || isDailyQuotaError(msg)) {
          console.log(`[publish] الحصة استُنفدت على ${model} — تجربة نموذج آخر.`);
          advanceTextModel();
          break; // اكسر حلقة المحاولات لهذا النموذج وانتقل للتالي
        }
        const isTransient = msg.includes('JSON') || msg.includes('fetch failed') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT');
        if (attempt < 3 && isTransient) {
          console.log(`[publish] استدعاء JSON فشل على ${model} (محاولة ${attempt}/3): ${msg.slice(0, 100)}`);
          await new Promise(r => setTimeout(r, 10000 * attempt));
          continue;
        }
        break; // خطأ غير قابل للاسترجاع: جرب النموذج التالي
      }
    }
    if (modelsTried.size === TEXT_MODELS.length) break;
  }
  throw lastErr;
}

// تحليل JSON مرن: يجرب التحليل المباشر، فإن فشل يستخرج أول كائن JSON مكتمل من النص
// (يحمي من محتوى زائد بعد JSON أو JSON مبتور بالخلف).
function safeParseJson(text) {
  const str = String(text).trim();
  try {
    return JSON.parse(str);
  } catch (_) {
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const candidate = str.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch (err) {
        throw new Error(`JSON غير صالح من Gemini: ${err.message}`);
      }
    }
    throw new Error('لم يُعثر على كائن JSON في رد Gemini');
  }
}

// توليد مقال طويل مع توسعات حتى يصل إلى MIN_WORDS كلمة.
async function generateLongArticle(ai, topic, usedTitles) {
  const first = await generateArticle(ai, topic, usedTitles);
  let data = first.data;
  let usedModel = first.model;
  if (!data.title || !Array.isArray(data.sections)) throw new Error('بنية المقال المولّد غير صالحة');

  let words = articleWordCount(data);
  const usedHeadings = new Set(data.sections.map(s => s.heading).filter(Boolean));

  // توسعة متكررة حتى الوصول للحد الأدنى من الكلمات (بحد أقصى 4 جولات)
  let rounds = 0;
  while (words < MIN_WORDS && rounds < 4) {
    rounds++;
    console.log(`[publish] ${topic.slug}: ${words} كلمة — جولة توسعة ${rounds}/4...`);
    let extra;
    try {
      const res = await generateArticle(ai, topic, usedTitles, data.sections, Array.from(usedHeadings));
      extra = res.data;
      usedModel = res.model;
    } catch (expandErr) {
      // فشل التوسعة لا يفقد الأقسام المتراكمة — نحتفظ بما وصلنا إليه ونواصل.
      console.log(`[publish] التوسعة فشلت (${String(expandErr.message).slice(0, 90)}). الاحتفاظ بما تراكم: ${words} كلمة.`);
      break;
    }
    if (!Array.isArray(extra.sections) || extra.sections.length === 0) {
      console.log('[publish] التوسعة لم تُرجع أقساماً جديدة، إيقاف المحاولة.');
      break;
    }
    const before = data.sections.length;
    for (const sec of extra.sections) {
      const h = sec.heading || '';
      if (h && usedHeadings.has(h)) continue; // تجنّب تكرار العناوين
      data.sections.push(sec);
      if (h) usedHeadings.add(h);
    }
    if (data.sections.length === before) {
      console.log('[publish] التوسعة أعادت عناوين مكررة فقط — إيقاف.');
      break;
    }
    if (extra.title && !data.title) data.title = extra.title;
    if (extra.metaDescription && !data.metaDescription) data.metaDescription = extra.metaDescription;
    if (extra.tip && !data.tip) data.tip = extra.tip;
    if (extra.conclusion && !data.conclusion) data.conclusion = extra.conclusion;
    words = articleWordCount(data);
  }

  console.log(`[publish] ${topic.slug}: اكتمل المقال بـ ${words} كلمة (${data.sections.length} قسماً) عبر ${usedModel}.`);
  return { data, words, model: usedModel };
}

// ── استدعاء Gemini مع إعادة محاولة ────────────────────────────────────────
// اكتشاف خطأ الحصة اليومية (429 DailyQuota): لا يعيد المحاولة — الحصة لن تجدد
// قبل منتصف الليل. يُرمى خطأ مميز يتوقف عنده النشر كاملاً.
function isDailyQuotaError(msg) {
  return /RESOURCE_EXHAUSTED|GenerateRequestsPerDay|quotaValue|daily quota|quota.?limit/i.test(msg || '') &&
         (msg || '').includes('429');
}

async function generateWithRetry(ai, topic, usedTitles, maxAttempts = 2) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await generateLongArticle(ai, topic, usedTitles);
    } catch (err) {
      lastErr = err;
      const msg = (err && (err.message || String(err))) || '';
      console.log(`[publish] محاولة ${attempt}/${maxAttempts} فشلت: ${String(msg).slice(0, 140)}`);
      // الحصة اليومية منتهية — لا جدوى من إعادة المحاولة، أوقف المقالات كلها.
      if (isDailyQuotaError(msg)) {
        const qerr = new Error('الحصة اليومية لـ Gemini انتهت (20 طلباً/يوم على الحساب المجاني). ' +
          'أعد التشغيل بعد منتصف الليل أو فعّل الفوترة.');
        qerr.dailyQuota = true;
        throw qerr;
      }
      // أخطاء مؤقتة فقط (شبكة / rate limit قصير): أعد المحاولة بانتظار متزايد.
      if (msg.includes('fetch failed') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('429')) {
        const waitMs = 20000 * attempt;
        console.log(`[publish] انتظار ${waitMs / 1000} ثانية ثم إعادة المحاولة...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

// ── بناء HTML المقال (نسق مطابق لبقية المدونة) ───────────────────────────
function buildArticleHtml(data, topic, meta, heroImagePath) {
  const canonical = `${BASE_URL}/blog/${topic.slug}.html`;
  const dateLabel = meta.dateLabel;
  const heroImage = heroImagePath
    ? `<div class="article-hero-img"><img src="${heroImagePath}" alt="${data.title}" loading="eager" width="1200" height="675" /></div>`
    : '';

  // أدرج صورة inline بعد القسم الثالث تقريباً لإثراء المقال
  const inlineImage = heroImagePath
    ? `\n\n      <div class="article-inline-img"><img src="${heroImagePath}" alt="${data.title}" loading="lazy" /></div>`
    : '';

  const sectionsHtml = data.sections.map((sec, i) => {
    const paragraphs = (sec.paragraphs || []).map(p => `      <p>${p}</p>`).join('\n');
    const list = sec.list && sec.list.length
      ? `      <ul>\n${sec.list.map(li => `        <li><strong>${li}</strong></li>`).join('\n')}\n      </ul>`
      : '';
    // أضف صورة inline بين القسم الثالث والرابع (مرة واحدة)
    const midImage = (i === 2 && inlineImage) ? inlineImage : '';
    return `      <h2><span class="num">${i + 1}</span> ${sec.heading}</h2>
${paragraphs}
${list}${midImage}`;
  }).join('\n\n');

  const articleCardCss = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f172a; --border: rgba(148,163,184,0.12);
      --indigo: #6366f1; --purple: #7c3aed; --emerald: #10b981; --cyan: #06b6d4; --amber: #f59e0b;
      --text: #f1f5f9; --muted: #94a3b8; --card-bg: rgba(15,23,42,0.75);
    }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg); color: var(--text);
      min-height: 100vh; line-height: 1.9;
      background-image:
        radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%),
        linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
      background-size: 100% 100%, 48px 48px, 48px 48px;
    }
    .breadcrumbs { max-width: 860px; margin: 16px auto 0; padding: 0 24px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
    .breadcrumbs a { color: var(--muted); text-decoration: none; font-weight: 700; }
    .breadcrumbs a:hover { color: var(--indigo); }
    .breadcrumbs .sep { color: var(--muted); opacity: 0.4; }
    .breadcrumbs .current { color: #e2e8f0; font-weight: 800; }
    .article-hero { max-width: 860px; margin: 0 auto; padding: 40px 24px 32px; }
    .article-hero-img { max-width: 860px; margin: 0 auto; padding: 0 24px 8px; }
    .article-hero-img img, .article-inline-img img { width: 100%; height: auto; border-radius: 20px; border: 1px solid rgba(148,163,184,0.18); box-shadow: 0 12px 40px rgba(0,0,0,0.35); display: block; }
    .article-inline-img { max-width: 860px; margin: 28px auto; padding: 0 24px; }
    .article-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 999px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); color: #a5b4fc; font-size: 11px; font-weight: 800; margin-bottom: 20px; }
    .article-hero h1 { font-size: clamp(1.8rem, 4vw, 2.7rem); font-weight: 900; line-height: 1.3; margin-bottom: 20px; color: #fff; }
    .article-meta { display: flex; align-items: center; gap: 20px; font-size: 12px; color: var(--muted); flex-wrap: wrap; }
    .article-meta span { display: flex; align-items: center; gap: 6px; }
    .article-container { max-width: 860px; margin: 0 auto; padding: 0 24px 64px; }
    .article-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 24px; padding: 48px 44px; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 8px 40px rgba(0,0,0,0.25); }
    .article-card h2 { font-size: 22px; font-weight: 900; color: #fff; margin: 40px 0 16px; display: flex; align-items: center; gap: 12px; line-height: 1.4; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    .article-card h2:first-of-type { margin-top: 0; }
    .article-card h2 .num { color: #a5b4fc; font-size: 13px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); padding: 2px 10px; border-radius: 999px; flex-shrink: 0; }
    .article-card h3 { font-size: 18px; font-weight: 800; color: #e2e8f0; margin: 28px 0 12px; }
    .article-card p { font-size: 15px; color: #cbd5e1; line-height: 1.95; margin-bottom: 16px; }
    .article-card strong { color: #fff; font-weight: 800; }
    .article-card ul { margin: 16px 0 24px; padding-right: 20px; list-style-position: outside; }
    .article-card li { font-size: 14px; color: #cbd5e1; line-height: 1.9; margin-bottom: 10px; }
    .article-card li strong { color: #a5b4fc; }
    .highlight { background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(124,58,237,0.08)); border: 1px solid rgba(99,102,241,0.3); border-radius: 16px; padding: 24px 28px; margin: 24px 0 32px; }
    .highlight p { color: #f1f5f9; margin-bottom: 0; font-size: 16px; font-weight: 700; line-height: 1.8; }
    .callout { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); border-radius: 16px; padding: 20px 24px; margin: 28px 0; display: flex; gap: 14px; align-items: flex-start; }
    .callout-icon { font-size: 24px; flex-shrink: 0; }
    .callout p { margin-bottom: 0; color: #6ee7b7; font-size: 14px; }
    .callout p strong { color: #fff; }
    .disclaimer { background: rgba(148,163,184,0.08); border: 1px solid rgba(148,163,184,0.2); border-radius: 14px; padding: 18px 22px; margin: 32px 0 0; }
    .disclaimer p { margin-bottom: 0; font-size: 12px; color: var(--muted); line-height: 1.8; }
    .back-link { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border); }
    .back-link a { display: inline-flex; align-items: center; gap: 8px; color: var(--indigo); font-size: 13px; font-weight: 800; text-decoration: none; padding: 10px 24px; border-radius: 12px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); }
    .cta-section { text-align: center; padding: 0 24px 64px; }
    .cta-btn { display: inline-flex; align-items: center; gap: 10px; padding: 16px 48px; border-radius: 16px; background: linear-gradient(135deg, var(--emerald), #0891b2, var(--indigo)); color: #fff; font-size: 15px; font-weight: 900; text-decoration: none; box-shadow: 0 8px 32px rgba(16,185,129,0.25); }
    footer { border-top: 1px solid var(--border); background: rgba(15,23,42,0.95); padding: 56px 24px 32px; }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 36px; }
    .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .footer-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .footer-logo-name { font-size: 15px; font-weight: 900; color: #fff; }
    .footer-desc { font-size: 12px; color: var(--muted); line-height: 1.8; max-width: 280px; }
    .footer-email { font-size: 12px; color: var(--indigo); margin-top: 10px; font-weight: 700; }
    .footer-email a { color: var(--indigo); text-decoration: none; }
    .footer-col h4 { font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 14px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
    .footer-col ul a { font-size: 12px; color: var(--muted); text-decoration: none; }
    .footer-col ul a:hover { color: var(--indigo); }
    .footer-bottom { border-top: 1px solid rgba(148,163,184,0.08); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(148,163,184,0.5); }
    @media (max-width: 768px) { .article-card { padding: 28px 20px; } .footer-grid { grid-template-columns: 1fr; gap: 28px; } }
  `;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.title} | المحامي الرقمي</title>
  <meta name="description" content="${data.metaDescription}" />
  <meta name="keywords" content="${topic.keywords.join(', ')}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${data.title}" />
  <meta property="og:description" content="${data.metaDescription}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="المحامي الرقمي" />
  ${heroImagePath ? `<meta property="og:image" content="${BASE_URL}${heroImagePath}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${BASE_URL}${heroImagePath}" />` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <meta name="google-adsense-account" content="ca-pub-7725405859334364">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
  ${HEADER_CSS}
  <link rel="manifest" href="/manifest.webmanifest"><!-- mohami-manifest -->
  <meta name="theme-color" content="#0f172a"><!-- mohami-theme -->
  <link rel="alternate" type="application/rss+xml" title="RSS - المحامي الرقمي" href="/rss.xml"><!-- mohami-rss -->
  <script>if(location.hostname==="www.mohamidigital.online")location.replace("https://mohamidigital.online"+location.pathname+location.search)</script><!-- www-mohami-guard -->
  <style>${articleCardCss}</style>
</head>
<body>


  <header class="uh-bar" id="siteHeader">
    <div class="uh-inner">
      <a href="/" class="uh-logo" aria-label="المحامي الرقمي">
        <span class="uh-badge">⚖️</span>
        <span class="uh-brand">
          <span class="uh-title">المحامي الرقمي</span>
          <span class="uh-sub">مساعدك القانوني الذكي · مجاناً</span>
        </span>
      </a>

      <nav class="uh-nav" id="headerNav" role="navigation" aria-label="القائمة الرئيسية">
        <a href="/" class="uh-link">🏠 الرئيسية</a>
        <a href="/blog/" class="uh-link active">📰 المدونة القانونية</a>
        <a href="/legal-library.html" class="uh-link">📚 المكتبة القانونية</a>
        <a href="/pillars/" class="uh-link">🏛️ المراجع الشاملة</a>
        <a href="/legal-forms.html" class="uh-link">📝 صيغ العقود والدعاوي</a>
        <a href="/legal-radar.html" class="uh-link">🔍 رصد المحامي</a>
        <div class="uh-more" id="uhMore">
          <button class="uh-more-btn" type="button" aria-expanded="false" aria-haspopup="true">
            <span>المزيد</span><span class="uh-caret">▾</span>
          </button>
          <div class="uh-menu">
            <a href="/about.html" class="uh-menu-item">⚖️ عن المنصة</a>
            <a href="/features.html" class="uh-menu-item">⚡ المميزات الكاملة</a>
            <a href="/pricing.html" class="uh-menu-item">🎁 الأسعار — مجاني 100%</a>
            <a href="/why-trust-us.html" class="uh-menu-item">🛡️ لماذا تثق بنا</a>
            <a href="/privacy.html" class="uh-menu-item">🔐 سياسة الخصوصية</a>
            <a href="/terms.html" class="uh-menu-item">📜 الشروط والأحكام</a>
            <a href="/contact.html" class="uh-menu-item">📬 تواصل معنا</a>
          </div>
        </div>
      </nav>

      <div class="uh-actions">
        <a href="/" class="uh-cta"><span>🚀 دخول التطبيق</span></a>
        <button class="uh-burger" id="uhBurger" type="button" aria-label="فتح القائمة" aria-expanded="false" aria-controls="headerNav">☰</button>
      </div>
    </div>
  </header>
  <script>
    (function(){
      var hdr=document.getElementById('siteHeader');
      var nav=document.getElementById('headerNav');
      var burger=document.getElementById('uhBurger');
      var more=document.getElementById('uhMore');
      var moreBtn=more?more.querySelector('.uh-more-btn'):null;
      if(hdr)window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>20);},{passive:true});
      function closeMobile(){
        if(nav)nav.classList.remove('active');
        if(burger){burger.setAttribute('aria-expanded','false');burger.innerHTML='☰';burger.setAttribute('aria-label','فتح القائمة');}
      }
      if(burger){burger.addEventListener('click',function(){
        var open=nav.classList.toggle('active');
        burger.setAttribute('aria-expanded',open);
        burger.innerHTML=open?'✕':'☰';
        burger.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');
        if(!open&&more){more.classList.remove('open');}
      });}
      if(moreBtn&&more){
        moreBtn.addEventListener('click',function(e){
          e.stopPropagation();
          var open=more.classList.toggle('open');
          moreBtn.setAttribute('aria-expanded',open);
        });
      }
      document.addEventListener('click',function(e){
        if(more&&more.classList.contains('open')&&!more.contains(e.target)){
          more.classList.remove('open');
          if(moreBtn)moreBtn.setAttribute('aria-expanded','false');
        }
        if(nav&&nav.classList.contains('active')&&burger&&!nav.contains(e.target)&&!burger.contains(e.target)){
          closeMobile();
        }
      });
    })();
  </script>

  <nav class="breadcrumbs" aria-label="مسار التنقل">
    <a href="/">الرئيسية</a>
    <span class="sep">‹</span>
    <a href="/blog/">المدونة القانونية</a>
    <span class="sep">‹</span>
    <span class="current">${topic.category}</span>
  </nav>

  <div class="article-hero">
    <div class="article-badge">📌 ${topic.category}</div>
    <h1>${data.title}</h1>
    <div class="article-meta">
      <span>📅 ${dateLabel}</span>
      <span>✍️ فريق المحامي الرقمي</span>
      <span>⏱️ ${Math.max(4, Math.round(data.intro.length / 350 + data.sections.length * 0.6))} دقائق قراءة</span>
    </div>
  </div>

  ${heroImage}

  <div class="article-container">
    <article class="article-card">
      <div class="highlight">
        <p>${data.intro}</p>
      </div>

${sectionsHtml}

      <div class="callout">
        <span class="callout-icon">💡</span>
        <p><strong>نصيحة عملية:</strong> ${data.tip}</p>
      </div>

      <h2>الخلاصة</h2>
      <p>${data.conclusion}</p>

      <div class="disclaimer">
        <p>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</p>
      </div>

      <div class="back-link">
        <a href="/blog/">← العودة للمدونة القانونية</a>
      </div>
    </article>
  </div>

  <div class="ad-slot ad-slot--bottom" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-7725405859334364"
         data-ad-slot="2168039898"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <div class="ad-slot ad-slot--related" role="complementary" aria-label="مقالات مقترحة">
    <span class="ad-label">مقالات مقترحة</span>
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-7725405859334364"
         data-ad-slot="8981348923"
         data-ad-format="autorelaxed"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <div class="cta-section">
    <a href="/" class="cta-btn">ابدأ استخدام المنصة مجاناً الآن 🚀</a>
  </div>

  <footer>
    <div class="footer-inner">
      <div class="footer-grid">
        <div>
          <div class="footer-logo">
            <div class="footer-logo-icon">⚖️</div>
            <span class="footer-logo-name">المحامي الرقمي</span>
          </div>
          <p class="footer-desc">النظام البرمجي المتكامل والمجاني لإدارة مكاتب المحاماة في جمهورية مصر العربية.</p>
          <p class="footer-email">التواصل: <a href="mailto:ahmdmansoor222@gmail.com">ahmdmansoor222@gmail.com</a></p>
        </div>
        <div class="footer-col">
          <h4>أقسام المنصة</h4>
          <ul>
            <li><a href="/">الرئيسية</a></li>
            <li><a href="/about.html">عن المنصة</a></li>
            <li><a href="/features.html">المميزات</a></li>
            <li><a href="/pricing.html">مجانية بالكامل</a></li>
            <li><a href="/blog/">المدونة القانونية</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>السياسات والتواصل</h4>
          <ul>
            <li><a href="/privacy.html">سياسة الخصوصية</a></li>
            <li><a href="/terms.html">شروط الاستخدام</a></li>
            <li><a href="/contact.html">تواصل معنا</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 المحامي الرقمي — جميع الحقوق محفوظة</span>
        <span>خدمة مجانية للمحامين والقانونيين في مصر</span>
      </div>
    </div>
  </footer>

  <style>
    .ad-slot { margin: 32px auto; max-width: 100%; text-align: center; min-height: 90px; }
    .ad-slot--top { margin-top: 8px; margin-bottom: 32px; }
    .ad-slot--bottom { margin: 32px auto 8px; }
    .ad-label { display: block; font-size: 10px; color: var(--muted); text-align: center; margin-bottom: 6px; font-weight: 700; letter-spacing: 0.5px; }
  </style>
  <script src="/related-articles.js?v=20260826v3" defer></script><!-- mohami-related -->
  <script src="/tts-reader.js?v=20260826v1" defer></script><!-- mohami-tts -->
  <script src="/gam.js?v=20260826v1" defer></script><!-- mohami-gam -->
  <script src="/sw-register.js?v=20260826v1" defer></script><!-- mohami-sw -->
</body>
</html>
`;
}

// ── تحديث بطاقة في index.html ─────────────────────────────────────────────
function addCardToIndex(topic, data, meta) {
  const indexPath = path.join(BLOG_DIR, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const card = `      <a href="/blog/${topic.slug}.html" class="post-card">
        <div class="post-cover ${topic.coverClass || 'indigo'}">
          <span class="post-cover-icon">${topic.icon || '📌'}</span>
          <span class="post-cover-tag">${topic.category}</span>
        </div>
        <div class="post-body">
          <div class="post-meta">
            <span>📅 ${meta.dateLabel}</span>
            <span>⏱️ 5 دقائق</span>
          </div>
          <h3>${data.title}</h3>
          <p>${data.metaDescription}</p>
          <div class="post-cta">اقرأ المقال ←</div>
        </div>
      </a>`;

  const gridEnd = '    </div>\n\n    <div class="info-card">';
  if (!html.includes(`/blog/${topic.slug}.html`)) {
    if (html.includes(gridEnd)) {
      html = html.replace(gridEnd, card + '\n\n' + gridEnd);
    } else {
      // fallback: insert right after <div class="posts-grid">
      html = html.replace('<div class="posts-grid">', '<div class="posts-grid">\n\n' + card);
    }
    fs.writeFileSync(indexPath, html, 'utf8');
  }
  return true;
}

// ── مزامنة المدونة إلى dist (لأن firebase.json ينشر من dist) ──────────────
function syncBlogToDist() {
  const DIST_BLOG = path.join(ROOT, 'dist', 'blog');
  if (!fs.existsSync(DIST_BLOG)) fs.mkdirSync(DIST_BLOG, { recursive: true });
  for (const file of fs.readdirSync(BLOG_DIR)) {
    const src = path.join(BLOG_DIR, file);
    const dst = path.join(DIST_BLOG, file);
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dst, { recursive: true, force: true });
    } else {
      fs.copyFileSync(src, dst);
    }
  }
  console.log('[publish] تمت مزامنة المدونة إلى dist/blog');
}

// ── النشر على Firebase ────────────────────────────────────────────────────
function deploy() {
  syncBlogToDist();
  execSync('npx firebase deploy --only hosting:app', {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
}

// ── الحفظ كمسودة عند الفشل ────────────────────────────────────────────────
function saveDraft(data, topic, reason) {
  const draftsDir = path.join(ROOT, 'scripts', 'blog-publisher', 'drafts');
  fs.mkdirSync(draftsDir, { recursive: true });
  const file = path.join(draftsDir, `${topic.slug}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ topic, data, reason, failedAt: new Date().toISOString() }, null, 2), 'utf8');
  return file;
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const now = cairoNow();
  const { log, publishedSlugs, published } = loadUnifiedLog();
  const topics = readJson(TOPICS_FILE, { evergreen: [] });

  // اختيار مواضيع اليوم (ARTICLES_PER_RUN موضوعاً)
  const pickedTopics = pickTopics(topics, publishedSlugs, ARTICLES_PER_RUN);

  // وضع المحاكاة: يُرجع ما سيُنشر دون كتابة ملفات ولا deploy
  if (process.argv.includes('--dry-run')) {
    console.log('[dry-run] === معاينة النشر بدون تنفيذ ===');
    console.log('[dry-run] التاريخ:', now.dateStr);
    console.log('[dry-run] المنطقة الزمنية: Africa/Cairo (UTC+2)');
    console.log('[dry-run] إجمالي المواضيع المنشورة:', published.length);
    console.log('[dry-run] عدد المقالات المستهدفة هذا التشغيل:', ARTICLES_PER_RUN);
    console.log('[dry-run] مواضيع متبقية في topics.json:', topics.evergreen.filter(t => !publishedSlugs.has(t.slug)).length);
    pickedTopics.forEach((t, i) => {
      console.log(`[dry-run]   ${i + 1}. ${t.title} — slug: ${t.slug} (${t.category})`);
    });
    if (pickedTopics.length === 0) {
      console.log('[dry-run] ⚠️  لا يوجد موضوع جديد متاح.');
    }
    console.log('[dry-run] GEMINI_API_KEY موجود؟', !!GEMINI_API_KEY);
    console.log('[dry-run] الحد الأدنى لعدد الكلمات:', MIN_WORDS);
    console.log('[dry-run] نموذج الصور:', IMAGE_MODEL, '(fallback: SVG محلي)');
    console.log('[dry-run] === لم يُكتب أي ملف ولا نُشر أي شيء ===');
    process.exit(0);
  }

  if (pickedTopics.length === 0) {
    console.log('[publish] ⚠️  لم يتبقَّ موضوع جديد في topics.json.');
    console.log('[publish] → أعد تعبئة scripts/blog-publisher/topics.json بمواضيع Evergreen جديدة.');
    log.skipped.push({ date: now.dateStr, reason: 'no_new_topic' });
    log.last_run = now.iso;
    writeLogBoth(log);
    process.exit(0);
  }

  if (!GEMINI_API_KEY) {
    const draft = saveDraft(null, pickedTopics[0], 'GEMINI_API_KEY غير موجود في .env');
    console.error('[publish] خطأ: مفتاح GEMINI_API_KEY غير موجود في .env. حُفظت مسودة عند: ' + draft);
    log.skipped.push({ date: now.dateStr, slug: pickedTopics[0].slug, reason: 'missing_api_key', draft });
    log.last_run = now.iso;
    writeLogBoth(log);
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const usedTitles = published.map(p => p.title);

  console.log(`[publish] === بدء نشر ${pickedTopics.length} مقالاً في ${now.dateStr} ===`);
  const publishedNow = [];

  for (let i = 0; i < pickedTopics.length; i++) {
    const topic = pickedTopics[i];
    console.log(`\n[publish] (${i + 1}/${pickedTopics.length}) جاري توليد: ${topic.title}`);
    try {
      // 1. توليد المقال الطويل (≥ MIN_WORDS كلمة)
      const { data, words, model } = await generateWithRetry(ai, topic, usedTitles);

      if (!data.title || !data.intro || !Array.isArray(data.sections) || data.sections.length < 4) {
        throw new Error('المقال المولّد غير مكتمل البنية');
      }

      // 2. توليد الصورة: Nano Banana → Pollinations → Unsplash → SVG محلي
      let heroImagePath = null;
      let imageSource = 'svg';
      let imgBuf = null;
      try {
        console.log(`[publish] ${topic.slug}: محاولة توليد صورة عبر ${IMAGE_MODEL}...`);
        imgBuf = await generateImage(ai, topic, data);
        if (imgBuf) imageSource = 'nano-banana';
      } catch (imgErr) {
        const msg = (imgErr && (imgErr.message || String(imgErr))) || '';
        console.log(`[publish] ${topic.slug}: ${IMAGE_MODEL} فشل (${String(msg).slice(0, 90)}).`);
      }
      if (!imgBuf) {
        console.log(`[publish] ${topic.slug}: توليد صورة حقيقية بديلة (Pollinations/Unsplash)...`);
        imgBuf = await generateFallbackImage(topic);
        if (imgBuf) imageSource = 'pollinations';
      }
      if (imgBuf) {
        heroImagePath = saveArticleImage(imgBuf, topic, topic.slug, 1);
      } else {
        console.log(`[publish] ${topic.slug}: تعذّرت كل مصادر الصور. استخدام SVG محلي.`);
        const svg = generateSvgImage(topic);
        heroImagePath = saveArticleImage(svg, topic, topic.slug, 1);
        imageSource = 'svg';
      }

      // 3. بناء HTML مع الصورة
      const meta = { dateStr: now.dateStr, dateLabel: now.dateLabel };
      const articleHtml = buildArticleHtml(data, topic, meta, heroImagePath);
      const articleFile = path.join(BLOG_DIR, `${topic.slug}.html`);
      fs.writeFileSync(articleFile, articleHtml, 'utf8');
      console.log(`[publish] تم إنشاء ملف المقال: ${articleFile} (${words} كلمة، صورة: ${imageSource})`);

      // 3.1 إضافة Article + Breadcrumb schema (JSON-LD) — للظهور في Google News و rich snippets
      try {
        const { processFile: injectSchema } = require('../seo/add-article-schema.cjs');
        injectSchema(articleFile);
      } catch (e) {
        console.warn(`[publish] تحذير: فشل حقن الـ schema: ${e.message?.substring(0, 100)}`);
      }

      addCardToIndex(topic, data, meta);
      console.log('[publish] تم تحديث index.html');

      usedTitles.push(data.title);
      publishedNow.push(topic.slug);
      log.published.push({
        title: data.title,
        date: now.dateStr,
        slug: topic.slug,
        url: `${BASE_URL}/blog/${topic.slug}.html`,
        tags: topic.keywords.slice(0, 3),
        words,
        image: imageSource,
        model: model || 'unknown',
      });

      // مهلة قصيرة بين المقالات لتفادي ضغط الـ API
      if (i < pickedTopics.length - 1) {
        const delay = 8000;
        console.log(`[publish] انتظار ${delay / 1000} ثانية بين المقالات...`);
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (err) {
      console.error(`[publish] خطأ في مقال ${topic.slug}:`, err.message);
      const draft = saveDraft(null, topic, err.message);
      log.skipped.push({ date: now.dateStr, slug: topic.slug, reason: err.message, draft });
      console.error('[publish] حُفظت مسودة للمراجعة اليدوية عند:', draft);
    }
  }

  log.last_run = now.iso;
  writeLogBoth(log);

  if (publishedNow.length === 0) {
    console.error('[publish] ⚠️  لم يُنشر أي مقال في هذا التشغيل.');
    process.exit(1);
  }

  // 4. نشر على Firebase (مرة واحدة بعد كل المقالات)
  console.log(`\n[publish] === نشر ${publishedNow.length} مقالاً على Firebase ===`);
  try {
    deploy();
  } catch (err) {
    console.error('[publish] فشل النشر على Firebase:', err.message);
    process.exit(1);
  }

  console.log(`[publish] ✅ اكتمل نشر ${publishedNow.length} مقالات بنجاح:`);
  for (const slug of publishedNow) {
    console.log(`[publish]   - ${BASE_URL}/blog/${slug}.html`);
  }

  // 4b. إعادة توليد sitemap.xml لتشمل كل المقالات (لا يكسر النشر عند فشله)
  try {
    execSync('node scripts/blog-publisher/generate-sitemap.cjs', { cwd: ROOT, stdio: 'inherit', env: { ...process.env } });
  } catch (smErr) {
    console.error(`[publish] تحذير: فشل توليد sitemap: ${smErr.message?.substring(0, 150)}`);
  }

  // 5. نشر نفس المقالات على صفحة فيسبوك (اختياري — يتطلب FB_PAGE_TOKEN)
  //    السكربت يقرأ من published-log.json (المُحدَّث أعلاه) ويقسم النص الطويل.
  if (process.env.FB_PAGE_TOKEN) {
    console.log(`\n[publish] === مشاركة المقالات على فيسبوك ===`);
    try {
      execSync('node scripts/blog-publisher/facebook-publish.cjs', {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env },
      });
    } catch (fbErr) {
      // فشل الفيسبوك لا يكسر النشر — يُسجل ويُكمل
      console.error('[publish] تحذير: فشل النشر على فيسبوك (يمكن تشغيله لاحقاً يدوياً).');
    }
  } else {
    console.log('\n[publish] ⏭️  لم يُشارك على فيسبوك: FB_PAGE_TOKEN غير مضبوط. أضِفه في .env أو GitHub Secrets.');
  }

  // 6. توليد فيديو TikTok من آخر مقال منشور (اختياري — يتطلب إعداد tiktok-publisher)
  //    يتم التفعيل عبر TIKTOK_AUTO=1 في البيئة. السكربت يحوّل آخر مقال لفيديو.
  if (process.env.TIKTOK_AUTO === '1' && publishedNow.length > 0) {
    console.log(`\n[publish] === توليد فيديو TikTok من آخر مقال ===`);
    const lastSlug = publishedNow[publishedNow.length - 1];
    try {
      execSync(`node scripts/tiktok-publisher/tiktok-publish.cjs --article ${lastSlug} --dry-run`, {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 300_000, // 5 دقايق
      });
      console.log(`[publish] ✓ تم توليد فيديو TikTok من: ${lastSlug}`);
    } catch (ttErr) {
      console.error(`[publish] تحذير: فشل توليد فيديو TikTok لـ ${lastSlug}: ${ttErr.message?.substring(0, 200)}`);
      console.error('[publish] → يمكن تشغيله يدوياً: node scripts/tiktok-publisher/tiktok-publish.cjs --article ' + lastSlug);
    }
  } else if (process.env.TIKTOK_AUTO !== '1') {
    console.log('\n[publish] ⏭️  لم يُولّد فيديو TikTok: TIKTOK_AUTO=1 غير مضبوط. أضِفها في .env لو عايز التفعيل.');
  }

  // 7. توليد ونشر Reel على Facebook من آخر مقال (اختياري — يتطلب FB_APP_ID + FB_PAGE_ID)
  //    يتم التفعيل عبر REELS_AUTO=1 في البيئة. ينشر تلقائياً على صفحة Facebook.
  if (process.env.REELS_AUTO === '1' && publishedNow.length > 0) {
    console.log(`\n[publish] === توليد ونشر Reel على Facebook ===`);
    const lastSlug = publishedNow[publishedNow.length - 1];
    try {
      execSync(`node scripts/facebook-reels/reels-publish.cjs --article ${lastSlug} --dry-run`, {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 300_000,
      });
      console.log(`[publish] ✓ تم توليد Reel لـ: ${lastSlug}`);
      console.log('[publish] 💡 شغّل بدون --dry-run للنشر الفعلي بعد التجربة.');
    } catch (reelErr) {
      console.error(`[publish] تحذير: فشل توليد Reel لـ ${lastSlug}: ${reelErr.message?.substring(0, 200)}`);
    }
  } else if (process.env.REELS_AUTO !== '1') {
    console.log('\n[publish] ⏭️  لم يُنشر Reel: REELS_AUTO=1 غير مضبوط. أضِفها في .env لو عايز التفعيل.');
  }

  // 8. إرسال المقالات الجديدة لـ IndexNow (Bing + Yandex + DuckDuckGo)
  // فهرسة فورية بدون حد يومي
  if (process.env.INDEXNOW_API_KEY && publishedNow.length > 0) {
    console.log('\n[publish] === إرسال URLs لـ IndexNow ===');
    try {
      const newUrls = publishedNow.map(slug => `${BASE_URL}/blog/${slug}.html`).join(',');
      execSync(`node scripts/seo/indexnow-submit.cjs --urls="${newUrls}"`, {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 60_000,
      });
      console.log(`[publish] ✓ تم إرسال ${publishedNow.length} URLs لـ Bing/Yandex/DuckDuckGo`);
    } catch (idxErr) {
      console.error(`[publish] تحذير: فشل إرسال IndexNow: ${idxErr.message?.substring(0, 200)}`);
    }
  }
}

main().catch(err => {
  console.error('[publish] فشل غير متوقع:', err);
  process.exit(1);
});
