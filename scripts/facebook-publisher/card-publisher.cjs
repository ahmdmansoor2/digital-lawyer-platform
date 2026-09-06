#!/usr/bin/env node
/**
 * card-publisher.cjs — ناشر البطاقات التعليمية اليومية على فيسبوك
 *
 * يأخذ الترند الأعلى من جوجل (من trending-topics.json — يولّده smart-publisher)
 * ويحوّله إلى بطاقة تعليمية بستايل بطاقات إنستجرام (أفقية 1200×628، خلفية داكنة أنيقة)
 * ثم ينشرها منشور صورة على صفحة فيسبوك عبر Graph API.
 *
 * ملاحظة: لا يوجد API عام لـ NotebookLM — يُولَّد محتوى البطاقة مباشرة عبر Gemini
 * بنفس الجودة والستايل (قرار معتمد من المستخدم).
 *
 * الاستخدام:
 *   node card-publisher.cjs                    # نشر بطاقة من أعلى ترند اليوم
 *   node card-publisher.cjs --dry-run          # توليد البطاقة بدون نشر
 *   node card-publisher.cjs --topic <slug>     # من ترند محدد
 *   node card-publisher.cjs --status           # عرض حالة السجل
 *   node card-publisher.cjs --allow-reel-overlap  # السماح بنفس موضوع الريلز
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const FB_PUBLISHER_DIR = __dirname;
const TRENDING_FILE = path.join(ROOT, 'scripts', 'trending-topics.json');
const REEL_LOG_FILE = path.join(FB_PUBLISHER_DIR, 'facebook-published-log.json');
const CARD_LOG_FILE = path.join(FB_PUBLISHER_DIR, 'facebook-cards-published-log.json');
const OUTPUT_DIR = path.join(FB_PUBLISHER_DIR, 'output', 'cards');

const CARD_WIDTH = 1280;
const CARD_HEIGHT = 720;

const CAIRO_FONT_URL = pathToFileURL(
  path.join(FB_PUBLISHER_DIR, 'fonts', 'Cairo.ttf')
).href;

const { publishPhoto } = require(path.join(FB_PUBLISHER_DIR, 'facebook-graph.cjs'));
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// ─── أدوات مساعدة ─────────────────────────────────────────────────────────
function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// توحيد الهاشتاجات: يضمن بادئة # ويزيل الفراغات
function normalizeHashtags(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((t) => String(t).trim().replace(/^#+/, '').replace(/\s+/g, '_'))
    .filter(Boolean)
    .map((t) => `#${t}`)
    .slice(0, 6);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, topic: null, status: false, allowReelOverlap: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--topic') opts.topic = args[++i];
    else if (args[i] === '--status') opts.status = true;
    else if (args[i] === '--allow-reel-overlap') opts.allowReelOverlap = true;
  }
  return opts;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// تقسيم النص العربي لسطور (حسب حدود الكلمات + maxChars لكل سطر)
function wrapText(text, maxChars) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines;
}

// ─── السجلات ───────────────────────────────────────────────────────────────
function readCardLog() {
  return readJson(CARD_LOG_FILE, { entries: [] });
}

function isCardPublished(slug) {
  const log = readCardLog();
  return log.entries.some((e) => e.slug === slug);
}

function isReelPublished(slug) {
  const log = readJson(REEL_LOG_FILE, { entries: [] });
  return log.entries.some((e) => e.topicId === `trend-${slug}`);
}

function logCardEntry(entry) {
  const log = readCardLog();
  log.entries.push({ ...entry, publishedAt: new Date().toISOString() });
  writeJson(CARD_LOG_FILE, log);
}

// ─── اختيار الترند الأعلى ─────────────────────────────────────────────────
function selectTopUnpublishedTopic(allowReelOverlap = false) {
  const trending = readJson(TRENDING_FILE, null);
  if (!trending || !Array.isArray(trending.topics) || trending.topics.length === 0) {
    console.log('ℹ️  ملف trending-topics.json غير موجود أو فارغ.');
    return null;
  }

  const cardLog = readJson(CARD_LOG_FILE, { entries: [] });
  const reelLog = readJson(REEL_LOG_FILE, { entries: [] });

  const first = trending.topics.find((t) => {
    const slug = t.slug;
    if (isCardPublished(slug)) return false;
    if (!allowReelOverlap && isReelPublished(slug)) return false;
    return true;
  });

  if (!first) {
    console.log('ℹ️  لا يوجد ترند جديد متاح (كل المواضيع منشورة بطاقات أو ريلز).');
    return null;
  }
  return { ...first, date: trending.date };
}

function pickTopTrend(opts) {
  if (opts.topic) {
    const trending = readJson(TRENDING_FILE, { date: '', topics: [] });
    const t = trending.topics.find((x) => x.slug === opts.topic);
    if (!t) {
      console.error(`❌ الترند "${opts.topic}" غير موجود`);
      process.exit(1);
    }
    return { ...t, date: trending.date };
  }
  return selectTopUnpublishedTopic(opts.allowReelOverlap);
}

// ─── توليد محتوى البطاقة عبر Gemini ───────────────────────────────────────
async function generateCardContent(topic, retryIdx = 0) {
  const models = [
    'gemini-flash-lite-latest',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];
  const model = models[retryIdx % models.length];

  const prompt = `أنت محرك NotebookLM Pro القانوني المتخصص في صياغة الأدلة والبطاقات التعليمية القضائية رفيعة المستوى لمنصة المحامي الرقمية.
حوّل الموضوع القانوني التالي إلى «بطاقة تعليمية مؤصلة وشاملة» بأسلوب NotebookLM Pro المنهجي فائق العمق والدقة والتأثير:

الموضوع: ${topic.title}
التصنيف: ${topic.tag || 'قانون مصري'}
الكلمات المفتاحية: ${topic.keywords || ''}

أرجع JSON فقط وفق هذا الهيكل الهندسي الدقيق:
{
  "title": "عنوان البطاقة التعليمية (واضح، حاسم، جذاب ومؤصل، 6-10 كلمات)",
  "scenario": "الموقف أو الواقعة العملية في سطرين يجيب عن: ما المشكلة الحقيقية التي تواجه المواطن أو المتعامل على أرض الواقع؟ (20-30 كلمة)",
  "legal_grounding": "التأصيل والسند التشريعي: اذكر نصوص المواد بدقة وأرقام القوانين المصرية السارية 2026 ذات الصلة (25-40 كلمة)",
  "cassation_rule": "قاعدة ومبدأ محكمة النقض الحاسم: السابقة القضائية المستقرة التي حسمت هذا النزاع بنص المبدأ (25-40 كلمة)",
  "action_steps": [
    { "step": "الخطوة الأولى", "action": "إجراء قانوني عملي حاسم (10-18 كلمة)" },
    { "step": "الخطوة الثانية", "action": "إجراء توثيقي أو قضائي دقيق (10-18 كلمة)" },
    { "step": "الخطوة الثالثة", "action": "إجراء وقائي أو تنفيذي حاسم (10-18 كلمة)" }
  ],
  "expert_tip": "نصيحة الخبير القانوني الذهبية لحماية الحق وتفادي الثغرات (15-25 كلمة)",
  "hashtags": ["هاشتاج1", "هاشتاج2", "هاشتاج3", "هاشتاج4", "هاشتاج5"]
}

قواعد الجودة الصارمة لـ NotebookLM:
1. الدقة والأمانة التشريعية 100% وفق القوانين المصرية وأحكام محكمة النقض.
2. لغة عربية فصحى قانونية أنيقة وسهلة الفهم تجمع بين الرصانة الأكاديمية والواقعية العملية.
3. التزام كامل بالهيكل المطلوب دون أي نصوص خارج الـ JSON.`;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.6, maxOutputTokens: 2500 },
    });
    let raw = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
    if (!parsed.title || !parsed.legal_grounding) throw new Error('JSON ناقص');
    return parsed;
  } catch (err) {
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Quota') || retryIdx < models.length - 1) {
      console.warn(`⏳ إعادة المحاولة بنموذج آخر (${models[(retryIdx + 1) % models.length]})...`);
      await sleep(15000);
      return generateCardContent(topic, retryIdx + 1);
    }
    throw new Error(`فشل توليد بطاقة NotebookLM التعليمية: ${err.message}`);
  }
}

// ─── بناء SVG البطاقة الاحترافية الفاخرة (مربعة 1080×1080) ────────────────
function buildCardSvg(card) {
  const W = CARD_WIDTH;   // 1080
  const H = CARD_HEIGHT;  // 1080
  const pad = 52;         // هامش أفقي
  const rX = W - pad;     // نقطة اليمين للنص RTL
  const lX = pad;         // نقطة اليسار
  const contentW = W - pad * 2;

  const FONT = "'Cairo', Tahoma, 'Segoe UI', Arial, sans-serif";
  const hashtags = normalizeHashtags(card.hashtags).slice(0, 4).join(' ');
  const cat = escapeXml(card.category || 'ثقافة تشريعية');

  // نصوص مهيأة للموبايل بدقة عالية
  const hookLine = (wrapText(card.hook, 38)[0] || '').trim();
  const titleLines = wrapText(card.title, 22).slice(0, 2);
  const tipLines = wrapText(card.tip, 52).slice(0, 2);
  const ctaLine = escapeXml(card.cta || 'احسب موقفك القانوني واستشر المستشار الآن');

  // النقاط الثلاث داخل حاويات زجاجية
  const pts = (card.points || []).slice(0, 3).map((p, i) => ({
    num: i + 1,
    label: (wrapText(String(p.label || p.detail || ''), 32)[0] || '').trim(),
    grad: ['url(#gGoldPill)', 'url(#gEmeraldPill)', 'url(#gIndigoPill)'][i],
    accent: ['#F59E0B', '#10B981', '#6366F1'][i]
  }));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <style>@font-face{font-family:'Cairo';src:url('${CAIRO_FONT_URL}') format('truetype');font-weight:100 900;}</style>
  
  <!-- خلفية متدرجة ملكية كحلية داكنة -->
  <linearGradient id="bgBase" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#050811"/>
    <stop offset="50%" stop-color="#0A0F1E"/>
    <stop offset="100%" stop-color="#0F172A"/>
  </linearGradient>

  <!-- توهجات سينمائية متدرجة -->
  <radialGradient id="glowTopGold" cx="0.9" cy="0.1" r="0.75">
    <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.22"/>
    <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowBottomCyan" cx="0.1" cy="0.85" r="0.65">
    <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="#06B6D4" stop-opacity="0"/>
  </radialGradient>

  <!-- أشرطة وبطاقات Glassmorphism -->
  <linearGradient id="barLuxury" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#78350F"/>
    <stop offset="25%" stop-color="#F59E0B"/>
    <stop offset="50%" stop-color="#FDE68A"/>
    <stop offset="75%" stop-color="#D97706"/>
    <stop offset="100%" stop-color="#78350F"/>
  </linearGradient>

  <linearGradient id="glassCardGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#1E293B" stop-opacity="0.75"/>
    <stop offset="100%" stop-color="#0F172A" stop-opacity="0.88"/>
  </linearGradient>

  <!-- تدرج صندوق النصيحة الذهبي / الزمردي -->
  <linearGradient id="tipBoxGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#064E3B" stop-opacity="0.92"/>
    <stop offset="100%" stop-color="#022C22" stop-opacity="0.95"/>
  </linearGradient>

  <!-- تدرجات أرقام النقاط -->
  <linearGradient id="gGoldPill" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FDE047"/><stop offset="100%" stop-color="#D97706"/></linearGradient>
  <linearGradient id="gEmeraldPill" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6EE7B7"/><stop offset="100%" stop-color="#059669"/></linearGradient>
  <linearGradient id="gIndigoPill" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#A5B4FC"/><stop offset="100%" stop-color="#4F46E5"/></linearGradient>

  <!-- فلاتر الظل والبروز -->
  <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
    <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.55"/>
  </filter>
  <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.8"/>
  </filter>
</defs>

<!-- === الخلفية الأساسية والتوهج === -->
<rect width="${W}" height="${H}" fill="url(#bgBase)" fill-opacity="0.88"/>
<rect width="${W}" height="${H}" fill="url(#glowTopGold)"/>
<rect width="${W}" height="${H}" fill="url(#glowBottomCyan)"/>

<!-- شريط علوي ذهبي ملكي -->
<rect x="0" y="0" width="${W}" height="8" fill="url(#barLuxury)"/>

<!-- === رأس البطاقة (Header) === -->
<!-- اسم المنصة مع شارة التوثيق (يمين) -->
<g filter="url(#textGlow)">
  <text x="${rX}" y="56" font-family="${FONT}" font-size="27" font-weight="900" fill="#F59E0B" direction="rtl" text-anchor="start">⚖️ منصة المحامي الرقمية</text>
  <text x="${rX}" y="78" font-family="${FONT}" font-size="14" font-weight="600" fill="#94A3B8" direction="rtl" text-anchor="start">المرجع التشريعي الأول في مصر • بنك الأحكام والحاسبات</text>
</g>

<!-- كبسولة التصنيف المضيئة (يسار) -->
<rect x="${lX}" y="36" width="180" height="42" rx="21" fill="#0C2548" stroke="#38BDF8" stroke-width="1.6" filter="url(#softShadow)"/>
<text x="${lX + 90}" y="63" font-family="${FONT}" font-size="18" font-weight="800" fill="#E0F2FE" text-anchor="middle">${cat}</text>

<!-- خط فاصل زجاجي تحت الهيدر -->
<line x1="${lX}" y1="96" x2="${rX}" y2="96" stroke="rgba(245, 158, 11, 0.3)" stroke-width="1.2"/>

<!-- === شارة الهوك التفاعلية (Hook Badge) === -->
<rect x="${lX}" y="116" width="${contentW}" height="52" rx="14" fill="#FEF3C7" fill-opacity="0.07" stroke="#F59E0B" stroke-opacity="0.45" stroke-width="1.2"/>
<text x="${rX - 20}" y="150" font-family="${FONT}" font-size="24" font-weight="800" fill="#FDE047" direction="rtl" text-anchor="start" filter="url(#textGlow)">🔥 ${escapeXml(hookLine)}</text>

<!-- === العنوان الرئيسي الكبير === -->
<g filter="url(#textGlow)">
  <text x="${rX}" y="222" font-family="${FONT}" font-size="46" font-weight="900" fill="#FFFFFF" direction="rtl" text-anchor="start">${escapeXml(titleLines[0] || '')}</text>
  ${titleLines[1] ? `<text x="${rX}" y="282" font-family="${FONT}" font-size="46" font-weight="900" fill="#FFFFFF" direction="rtl" text-anchor="start">${escapeXml(titleLines[1])}</text>` : ''}
</g>

<!-- خط فاصل زجاجي تحت العنوان -->
<line x1="${lX}" y1="316" x2="${rX}" y2="316" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1"/>

<!-- === بطاقات النقاط الزجاجية المجسمة (Glass Cards) === -->
${pts.map((p) => {
  const yMap = [340, 452, 564];
  const y = yMap[p.num - 1];
  const numCX = rX - 44;
  return `
<!-- بطاقة النقطة ${p.num} -->
<rect x="${lX}" y="${y}" width="${contentW}" height="94" rx="18" fill="url(#glassCardGrad)" stroke="rgba(255, 255, 255, 0.14)" stroke-width="1.4" filter="url(#softShadow)"/>
<rect x="${rX - 6}" y="${y}" width="6" height="94" rx="3" fill="${p.accent}"/>
<circle cx="${numCX}" cy="${y + 47}" r="26" fill="${p.grad}" filter="url(#softShadow)"/>
<text x="${numCX}" cy="${y + 47}" y="${y + 56}" font-family="${FONT}" font-size="26" font-weight="900" fill="#0F172A" text-anchor="middle">${p.num}</text>
<text x="${numCX - 48}" y="${y + 56}" font-family="${FONT}" font-size="28" font-weight="800" fill="#F8FAFC" direction="rtl" text-anchor="start" filter="url(#textGlow)">${escapeXml(p.label)}</text>`;
}).join('')}

<!-- === صندوق كبسولة النقض / النصيحة الذهبية === -->
<rect x="${lX}" y="684" width="${contentW}" height="${tipLines[1] ? 130 : 100}" rx="18" fill="url(#tipBoxGrad)" stroke="#10B981" stroke-width="1.8" filter="url(#softShadow)"/>
<rect x="${rX - 6}" y="684" width="6" height="${tipLines[1] ? 130 : 100}" rx="3" fill="#34D399"/>
<text x="${rX - 24}" y="722" font-family="${FONT}" font-size="23" font-weight="900" fill="#6EE7B7" direction="rtl" text-anchor="start">💡 كبسولة النقض والنصيحة القانونية:</text>
<text x="${rX - 24}" y="760" font-family="${FONT}" font-size="23" font-weight="700" fill="#ECFDF5" direction="rtl" text-anchor="start">${escapeXml(tipLines[0])}</text>
${tipLines[1] ? `<text x="${rX - 24}" y="796" font-family="${FONT}" font-size="23" font-weight="700" fill="#ECFDF5" direction="rtl" text-anchor="start">${escapeXml(tipLines[1])}</text>` : ''}

<!-- === شريط الحث على الإجراء (CTA & Website Bar) === -->
<rect x="${lX}" y="842" width="${contentW}" height="64" rx="16" fill="#1E293B" fill-opacity="0.82" stroke="rgba(245, 158, 11, 0.45)" stroke-width="1.4" filter="url(#softShadow)"/>
<text x="${rX - 20}" y="882" font-family="${FONT}" font-size="23" font-weight="800" fill="#FBBF24" direction="rtl" text-anchor="start">${ctaLine} 👈</text>
<text x="${lX + 24}" y="882" font-family="${FONT}" font-size="20" font-weight="800" fill="#38BDF8" text-anchor="start">mohamidigital.online</text>

<!-- === الهاشتاجات وتذييل الحقوق === -->
<text x="${W / 2}" y="946" font-family="${FONT}" font-size="19" font-weight="600" fill="#64748B" text-anchor="middle">${escapeXml(hashtags)}</text>
<text x="${W / 2}" y="976" font-family="${FONT}" font-size="15" font-weight="500" fill="#475569" text-anchor="middle">جميع الحقوق محفوظة © 2026 منصة المحامي الرقمية • المستشار أحمد منصور</text>

<!-- شريط سفلي ذهبي ملكي -->
<rect x="0" y="${H - 8}" width="${W}" height="8" fill="url(#barLuxury)"/>
</svg>`;
}

// ─── توليد صورة توضيحية حية بالذكاء الاصطناعي (سينمائية ثلاثية الأبعاد) ──────
// ─── اختيار النمط البصري من أسطول الأنماط السبعة المعتمدة (Rule #5) ────────
function selectMasterStyle(topic, category) {
  const text = `${topic} ${category || ''}`.toLowerCase();

  // النمط 6: الدرع والأمن السيبراني
  if (/ابتزاز|جرائم إلكترونية|مباحث الإنترنت|سايبر|واتساب|فيسبوك|نصب إلكتروني|تهديد/.test(text)) {
    return {
      id: 6,
      name: '3D Cyber Defense & Digital Forensics',
      prompt: `3D masterwork, cyber defense and digital forensics, glowing cryptographic shield of justice with streaming blue data circuits, floating dark glassmorphism panels displaying encrypted WhatsApp chat proof, digital tracking map, internet police report, and severe prison sentence badge, dramatic volumetric cinematic neon lighting, ray tracing, 8k resolution, ultra-photorealistic, zero cartoon, zero anime`
    };
  }

  // النمط 7: المنظومة المعمارية وصك الملكية
  if (/تطوير عقاري|ترخيص|تصالح|مخالفات بناء|شهر عقاري|عقد بيع شقة|تسجيل عقار/.test(text)) {
    return {
      id: 7,
      name: '3D Architectural Blueprint & Royal Deed',
      prompt: `3D architectural masterpiece, glowing navy blueprint with a rising photorealistic miniature glass modern tower, authentic Egyptian royal property deed with golden embossed seal and red wax stamp, royal golden key, floating glass inspection cards for construction license, chain of title, and cadastral survey, cinematic ray-traced lighting, 8k render, zero cartoon, zero anime`
    };
  }

  // النمط 4: المصفوفة الثنائية المقارنة
  if (/مقارنة|شيك|إيصال أمانة|استمارة 6|فصل تعسفي|بيع عرفي|تسجيل رسمي/.test(text)) {
    return {
      id: 4,
      name: '3D Split Contrast & Duality Matrix',
      prompt: `3D split-screen matrix divided vertically by a vertical beam of golden light. Right side has dark crimson warning tones showing illegal risky action with a cracked red seal and caution icon. Left side has royal emerald green tones showing the legal protected action with a pristine official stamped contract, brass balance scale of justice, photorealistic 8k render, cinematic volumetric lighting, zero cartoon, zero anime`
    };
  }

  // النمط 5: لوحة المؤشرات والحاسبات الذكية
  if (/مواريث|ميراث|تركة|حاسبة|تعويض|مواعيد|طعن|سقوط|مدد/.test(text)) {
    return {
      id: 5,
      name: '3D Glassmorphism Fintech Dashboard',
      prompt: `3D luxury glassmorphism fintech and judicial dashboard, floating dark glass cards displaying illuminated golden Arabic legal numerals and countdown counters, an antique polished brass balance scale of justice, a heavy dark mahogany judge's gavel on wooden sound block, official Egyptian succession deed with red wax seal, sunbeams streaming into grand classical courthouse, 8k render, zero cartoon, zero anime`
    };
  }

  // النمط 3: نمط غرفة الأدلة الجنائية
  if (/جنايات|قتل|تزوير|مخدرات|سموم|حبس احتياطي|تلبس/.test(text)) {
    return {
      id: 3,
      name: '3D Forensic Evidence & Investigation Board',
      prompt: `3D forensic investigation board, antique dark mahogany table illuminated by dramatic focused spotlight, official police investigation files tied with red ribbon and red wax seal, forensic magnifying glass inspecting legal documents, official forensic medical report, brass balance scale of justice, moody cinematic detective courtroom atmosphere, 8k photorealistic render, zero cartoon, zero anime`
    };
  }

  // النمط 1: النمط الانسيابي الزجاجي
  if (/عمل|إجراءات|دعوى|محضرين|عقد/.test(text)) {
    return {
      id: 1,
      name: '3D Glassmorphism Sequential Flowchart',
      prompt: `3D sequential glassmorphism legal flowchart, 4 floating luxury dark glass cards connected by flowing luminous golden arrows, miniature photorealistic 3D legal symbols inside each card, polished brass scales of justice, stamped official Egyptian court document, golden Arabic legal title at top, cinematic ray tracing, 8k render, zero cartoon, zero anime`
    };
  }

  // النمط 2 الافتراضي: النمط السينمائي الحي
  return {
    id: 2,
    name: 'Photorealistic 3D Live-Action Cinematic Mind Map',
    prompt: `Photorealistic 3D cinematic legal mind map, central charismatic modern Egyptian legal advocate in formal bespoke navy suit gesturing towards glowing holographic justice symbols, 4 floating translucent glass panels in the corners displaying legal articles and gold scales of justice, majestic neoclassical Egyptian marble courtroom, dramatic sunbeams through grand arched windows, ray-traced lighting, 8k resolution, zero cartoon, zero anime`
  };
}

// ─── توليد وصف بصري إنجليزي فائق الدقة والتعبير عن الموضوع ──────────────────
async function generateTopicVisualPrompt(card) {
  const masterStyle = selectMasterStyle(card.title, card.category);
  console.log(`  🎨 النمط المعتمد المختار: [النمط ${masterStyle.id}: ${masterStyle.name}]`);

  try {
    if (ai) {
      const resp = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: `You are an art director for a prestigious Egyptian legal platform enforcing photorealistic 3D visual mastery (Rule #5).
Generate a rich, highly descriptive visual prompt in English for an AI image generator (16:9 widescreen) matching this exact topic and style:
Topic: "${card.title}"
Category: "${card.category || 'Egyptian Law'}"
Scenario: "${card.scenario || ''}"
Key Steps: "${(card.action_steps || []).map(s => s.step + ': ' + s.action).join('; ')}"
Selected Master Style: "${masterStyle.name}"
Base Style Prompt: "${masterStyle.prompt}"

STRICT REQUIREMENTS:
- 16:9 cinematic widescreen aspect ratio.
- Photorealistic 8k render, Unreal Engine 5 quality, ray tracing, cinematic volumetric light.
- Neoclassical Egyptian courtroom, polished brass scales of justice, dark mahogany gavel, official stamped Arabic legal parchment with red wax seal.
- ABSOLUTELY ZERO CARTOON, ZERO ANIME, ZERO COMIC, ZERO MANGA, NO COMIC PANELS, NO SPEECH BUBBLES.
- Output ONLY the descriptive prompt in English.`
      });
      const txt = resp.text?.trim().replace(/^["']|["']$/g, '');
      if (txt && txt.length > 25 && !/comic|manga|cartoon/i.test(txt)) return txt;
    }
  } catch (e) {}

  return `${masterStyle.prompt}, topic: ${card.title}, 16:9 aspect ratio, 8k photorealistic render, cinematic lighting, zero cartoon, zero anime`;
}

// ─── توليد صورة توضيحية حية بالذكاء الاصطناعي (سينمائية ثلاثية الأبعاد عبر نانو بنانا برو) ──────
async function generateCardIllustration(card) {
  const promptEn = await generateTopicVisualPrompt(card);
  console.log(`  🎨 الوصف البصري التعبيري: "${promptEn.slice(0, 100)}..."`);

  // 1. تجربة Google GenAI Image Models
  if (ai) {
    for (const model of ['gemini-2.5-flash-image', 'gemini-3.1-flash-image']) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: [{ text: `${promptEn}. Aspect ratio 16:9, ultra photorealistic 8k.` }],
        });
        const parts = resp.candidates?.[0]?.content?.parts || [];
        const img = parts.find((p) => p.inlineData && p.inlineData.data);
        if (img) {
          console.log(`  ✓ صورة تعبيرية حصرية مولدة عبر Nano Banana Pro (${model})`);
          return Buffer.from(img.inlineData.data, 'base64');
        }
      } catch (err) {
        // تابع للـ fallback
      }
    }
  }

  // 2. محرك التوليد الفائق (Pollinations مع موديل Flux فائق الدقة والسرعة 8K بنسبة 16:9)
  try {
    const cleanPrompt = encodeURIComponent(`${promptEn}, photorealistic 3D, 8k, cinematic lighting, zero cartoon, zero anime`);
    const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&nologo=true&model=flux&seed=${Math.floor(Math.random() * 100000)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 15000) {
        console.log(`  ✓ صورة تعبيرية سينمائية ثلاثية الأبعاد 16:9 مولدة بالذكاء الاصطناعي (Flux Engine 8K)`);
        return buf;
      }
    }
  } catch (err) {
    console.warn(`  ⚠️ تعذر جلب صورة Flux: ${err.message}`);
  }

  // 3. Fallback سينمائي وقضائي موثق عبر مكتبة الصور الفوتوغرافية العالمية (Pexels 4K Legal)
  if (process.env.PEXELS_API_KEY) {
    try {
      const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=lawyer+courtroom+justice+judge&per_page=15`, {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        signal: AbortSignal.timeout(10000)
      });
      if (pexelsRes.ok) {
        const pData = await pexelsRes.json();
        const photos = pData.photos || [];
        if (photos.length > 0) {
          const randPhoto = photos[Math.floor(Math.random() * photos.length)];
          const imgUrl = randPhoto.src?.large2x || randPhoto.src?.original;
          const imgFetch = await fetch(imgUrl, { signal: AbortSignal.timeout(15000) });
          if (imgFetch.ok) {
            console.log(`  ✓ صورة قضائية فوتوغرافية فائقة الجودة من الأرشيف المعتمد (Pexels Legal)`);
            return Buffer.from(await imgFetch.arrayBuffer());
          }
        }
      }
    } catch (pErr) {
      console.warn(`  ⚠️ تعذر جلب صورة Pexels: ${pErr.message}`);
    }
  }

  return null;
}

// ─── توليد الصورة النهائية للنشر على فيسبوك ──────────────────────────────
async function renderCard(card, slug) {
  const sharp = require('sharp');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const pngPath = path.join(OUTPUT_DIR, `${slug}.png`);

  // توليد صورة تعبيرية حصرية فائقة الواقعية عبر نانو بنانا برو / فلكس (نقية 100% بدون أي كتابة)
  const aiIllustrationBuf = await generateCardIllustration(card);

  if (aiIllustrationBuf) {
    await sharp(aiIllustrationBuf)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .png({ quality: 95 })
      .toFile(pngPath);
    console.log(`  ✓ تم حفظ الصورة التعبيرية السينمائية النقية بنجاح: ${pngPath} (${(fs.statSync(pngPath).size / 1024).toFixed(0)} KB)`);
    return pngPath;
  }

  // في حال تعذر الاتصال تماماً: توليد خلفية ملكية وقضائية راقية بدون نصوص مكدسة
  const blankCanvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
    <defs>
      <radialGradient id="bgG" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#1E293B"/>
        <stop offset="50%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <linearGradient id="goldG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#D97706"/>
      </linearGradient>
    </defs>
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bgG)"/>
    <circle cx="540" cy="500" r="320" fill="none" stroke="rgba(245, 158, 11, 0.12)" stroke-width="2"/>
    <text x="540" y="480" font-family="'Cairo', sans-serif" font-size="120" text-anchor="middle" fill="url(#goldG)">⚖️</text>
    <text x="540" y="600" font-family="'Cairo', sans-serif" font-size="34" font-weight="900" text-anchor="middle" fill="#F8FAFC">منصة المحامي الرقمية</text>
    <text x="540" y="650" font-family="'Cairo', sans-serif" font-size="22" font-weight="600" text-anchor="middle" fill="#94A3B8">بطاقة تعليمية قضائية موثقة</text>
  </svg>`;

  await sharp(Buffer.from(blankCanvas))
    .png({ quality: 95 })
    .toFile(pngPath);
  console.log(`  ✓ تم حفظ خلفية الهيبة القضائية النقية: ${pngPath}`);
  return pngPath;
}

// ─── بناء كابشن البطاقة بنظام NotebookLM Pro ─────────────────────────
function buildCaption(card) {
  const steps = (card.action_steps || []).map((s, i) => `${i + 1}️⃣ ${s.step}: ${s.action}`).join('\n');
  const hashtags = normalizeHashtags(card.hashtags).join(' ');

  return [
    `⚖️ ${card.title}`,
    ``,
    `📌 الواقعة والمسألة القانونية:`,
    `${card.scenario || ''}`,
    ``,
    `🏛️ التأصيل والسند التشريعي المصري الساري:`,
    `${card.legal_grounding || ''}`,
    ``,
    `⚖️ مبدأ محكمة النقض الحاسم:`,
    `${card.cassation_rule || ''}`,
    ``,
    `📋 الدليل الإجرائي العملي (3 خطوات حاسمة):`,
    steps,
    ``,
    `💡 نصيحة الخبير الذهبية:`,
    `${card.expert_tip || ''}`,
    ``,
    hashtags,
    `───────────────────────`,
    `⚖️ منصة المحامي الرقمية | المرجع التشريعي الأول في مصر`,
    `📌 نصوص القوانين المصرية كاملة • بنك أحكام محكمة النقض • موسوعة العقود والصيغ • 15 حاسبة قانونية ذكية مجاناً 100%`,
    `🧮 احسب مستحقاتك والتعويضات والمدد القانونية فوراً:`,
    `👉 https://mohamidigital.online/legal-calculators.html`,
    `🌐 تفضل بزيارة المنصة وتجربة كافة الخدمات الذكية:`,
    `👉 https://mohamidigital.online/`,
  ].join('\n');
}

// ─── مفتش الجودة والنزاهة البصرية التلقائي (Pre-Flight Visual Quality Gate) ────
async function inspectVisualQuality(imagePath, topicTitle) {
  console.log('\n[2.5/3] 🛡️ جاري فحص النزاهة والجودة البصرية للبطاقة قبل النشر...');

  if (!fs.existsSync(imagePath)) {
    return { passed: false, reason: 'ملف الصورة غير موجود على القرص' };
  }

  const imageBuf = fs.readFileSync(imagePath);
  if (imageBuf.length < 15000) {
    return { passed: false, reason: `حجم ملف الصورة غير كافٍ (${imageBuf.length} بايت)` };
  }

  // فحص الأبعاد الإلزامية بنسبة 16:9
  try {
    const sharp = require('sharp');
    const meta = await sharp(imageBuf).metadata();
    if (meta.width !== 1280 || meta.height !== 720) {
      console.warn(`  ⚠️ إعادة ضبط الأبعاد إجبارياً إلى 1280x720 (16:9)`);
      await sharp(imageBuf)
        .resize(1280, 720, { fit: 'cover' })
        .png({ quality: 95 })
        .toFile(imagePath);
    }
  } catch (shErr) {
    console.warn(`  ⚠️ تنبيه معالجة Sharp: ${shErr.message}`);
  }

  // فحص الذكاء الاصطناعي البصري (Gemini Vision) لمكافحة الهلوسة والكرتون والتشوه
  if (ai) {
    try {
      const refreshedBuf = fs.readFileSync(imagePath);
      const base64Data = refreshedBuf.toString('base64');
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: [
          {
            text: `You are the strict Chief Visual Integrity Inspector for the Egyptian digital lawyer platform 'المحامي الرقمي'.
Examine this image generated for legal card topic: "${topicTitle}".

STRICT REJECTION CRITERIA:
1. Cartoon / Comic / Manga / Anime / Doodle (Must FAIL)
2. Hallucinated abstract shapes, blurry discs, alien scribbles, corrupted textures (Must FAIL)
3. Distorted, creepy, or illegible gibberish text in focal areas (Must FAIL)
4. Absence of dignified legal/judicial atmosphere (Must FAIL)

PASS CRITERIA:
- Realistic 3D render or dignified photorealistic legal elements (scales of justice, courtroom, gavel, legal documents, glassmorphism dashboard).

Return ONLY a JSON object:
{
  "passed": boolean,
  "confidence_score": number (0-100),
  "is_cartoon": boolean,
  "is_hallucinated": boolean,
  "reason": "short explanation in Arabic"
}`
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Data
            }
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const audit = JSON.parse(response.text?.trim() || '{}');
      console.log(`  🛡️ نتيجة فحص الرؤية: passed=${audit.passed}, score=${audit.confidence_score}%, سبب=${audit.reason}`);

      if (audit.is_cartoon || audit.is_hallucinated || audit.confidence_score < 65) {
        return {
          passed: false,
          reason: audit.reason || 'الصورة مرفوضة: تتضمن كرتون أو تشوهات بصرية تخالف ميثاق المنصة'
        };
      }

      return { passed: true, score: audit.confidence_score, reason: audit.reason };
    } catch (vErr) {
      console.warn(`  ⚠️ تعذر فحص Gemini Vision (${vErr.message})`);
    }
  }

  return { passed: true, reason: 'تم اجتياز الفحص الهيكلي' };
}

// ─── العملية الرئيسية ─────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  if (opts.status) {
    const log = readCardLog();
    console.log('─── حالة سجل بطاقات فيسبوك ───');
    console.log(`إجمالي النشر: ${log.entries.length}`);
    for (const e of log.entries.slice(-5)) {
      console.log(`  ${e.publishedAt?.slice(0, 10)} | ${e.title?.slice(0, 40)} | ${e.photoId || '?'}`);
    }
    return;
  }

  if (!process.env.FB_PAGE_ID || !process.env.FB_PAGE_TOKEN) {
    console.error('❌ FB_PAGE_ID و FB_PAGE_TOKEN مش متضبطين في .env');
    process.exit(1);
  }

  console.log('🃏 Facebook Card Publisher — منصة المحامي الرقمية');
  console.log(`📝 الوضع: ${opts.dryRun ? 'اختبار (dry-run)' : 'نشر حقيقي'}`);

  const topic = pickTopTrend(opts);
  if (!topic) return;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📌 الترند: ${topic.title}`);
  console.log(`📂 التصنيف: ${topic.tag} | التاريخ: ${topic.date || '؟'}`);
  console.log(`${'═'.repeat(60)}`);

  // 1. توليد المحتوى
  console.log('\n[1/3] جاري توليد محتوى البطاقة عبر Gemini...');
  const card = await generateCardContent({ title: topic.title, tag: topic.tag, keywords: topic.keywords });
  card.category = topic.tag;
  card.hashtags = normalizeHashtags(card.hashtags);
  card.points = card.action_steps || [];
  console.log(`  ✓ ${card.action_steps?.length || 0} خطوات إجرائية | ${card.hashtags.length} هاشتاجات`);

  // 2. رسم البطاقة
  console.log('\n[2/3] جاري رسم البطاقة (1280×720 بنسبة 16:9)...');
  const pngPath = await renderCard(card, topic.slug);

  // 2.5 مفتش الجودة والنزاهة البصرية (Rule #5 Quality Gate)
  const quality = await inspectVisualQuality(pngPath, card.title);
  if (!quality.passed) {
    console.error(`\n❌ [حظر الجودة التلقائي] تم منع النشر فوراً لحماية هيبة المنصة!`);
    console.error(`   السبب: ${quality.reason}`);

    try {
      const { sendTelegram } = require('../telegram-bot/assistant.cjs');
      await sendTelegram(`🚨 <b>إنذار حراسة الجودة والنزاهة البصرية:</b>\nتم منع نشر بطاقة فيسبوك تلقائياً لعدم اجتيازها معايير النزاهة الفنية.\n\n📌 <b>الموضوع:</b> ${card.title}\n⚠️ <b>سبب الرفض:</b> ${quality.reason}\n🛡️ لم يتم نشر أي شيء على فيسبوك لحماية المنصة.`);
    } catch (e) {}

    process.exit(1);
  }

  // 3. النشر
  if (!opts.dryRun) {
    console.log('\n[3/3] جاري النشر على فيسبوك...');
    const caption = buildCaption(card);
    const result = await publishPhoto({ imagePath: pngPath, caption, published: true });

    logCardEntry({
      slug: topic.slug,
      title: card.title,
      topicTitle: topic.title,
      category: topic.tag,
      photoId: result.photo_id,
      postId: result.post_id,
      permalink: result.permalink_url,
      imagePath: pngPath,
      hashtags: card.hashtags,
    });

    console.log(`\n✅ تم نشر البطاقة بنجاح!`);
    console.log(`   🔗 ${result.permalink_url}`);

    // إشعار تليجرام للمستشار أحمد منصور
    try {
      const { sendTelegram } = require('../telegram-bot/assistant.cjs');
      const tgMsg = `🃏 <b>تم نشر بطاقة فيسبوك تعليمية جديدة!</b>\n\n📌 <b>الموضوع:</b> ${card.title}\n📂 <b>التصنيف:</b> ${topic.tag}\n🔗 <b>رابط المنشور:</b> <a href="${result.permalink_url}">فتح على فيسبوك</a>\n\n🌐 تم توجيه المتابعين لدعم المنصة وحاسباتها القانونية.`;
      await sendTelegram(tgMsg);
    } catch (tgErr) {
      console.error('[telegram] تعذر إرسال الإشعار:', tgErr.message);
    }
  } else {
    console.log('\n[3/3] 🔍 [DRY RUN] لم يُنشر — البطاقة محفوظة في:');
    console.log(`   ${pngPath}`);
    console.log('\n── الكابشن المقترح ──');
    console.log(buildCaption(card));
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ خطأ غير متوقع:', err.message);
    process.exit(1);
  });
}

module.exports = { generateCardContent, buildCardSvg, renderCard, buildCaption, pickTopTrend, readCardLog, isCardPublished };
