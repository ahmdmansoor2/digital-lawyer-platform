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

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;

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
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
  const model = models[retryIdx % models.length];

  const prompt = `أنت خبير قانوني مصري + كاتب إعلانات (copywriter) محترف متخصص في محتوى فيسبوك التعليمي عالي التفاعل.
صمّم بطاقة تعليمية عن الموضوع التالي بأسلوب يحقق أعلى نسبة مشاهدات ونقرات:

العنوان: ${topic.title}
التصنيف: ${topic.tag || 'قانون'}
الكلمات المفتاحية: ${topic.keywords || ''}

أرجع JSON فقط بدون أي كلام إضافي:
{
  "hook": "خط افتتاحي يجذب الانتباه خلال ثانية واحدة (سؤال شخصي مباشر أو حقيقة قانونية مفاجئة، 5-8 كلمات)",
  "title": "عنوان رئيسي قصير بأسلوب مباشر يفيد القارئ (6-9 كلمات) — اختر أسلوب: 'اعرف حقك في...' أو 'متي يحق لك...' أو رقم/فائدة محددة",
  "points": [
    { "label": "عنوان النقطة (2-4 كلمات)", "detail": "معلومة قانونية دقيقة مختصرة (7-12 كلمة)" }
  ],
  "tip": "نصيحة عملية في جملة واحدة (8-12 كلمة)",
  "hashtags": ["هاشتاج1", "هاشتاج2", "هاشتاج3", "هاشتاج4"],
  "cta": "عبارة CTA قصيرة تدعو لاستشارة محامٍ (4-7 كلمات)"
}

القواعد الذهبية للتفاعل العالي على فيسبوك:
- الـ hook: اجعله شخصياً ومباشراً — خاطب القارئ بـ "أنت" أو اذكر سيناريو يهمه. لا تبدأ بسؤال عام مثل "هل تعلم؟"
- العنوان: ركّز على الفائدة والقيمة العملية، وفضّل ذكر رقم أو موعد أو حالة محددة
- العناوين داخل النقاط: قصيرة وحاسمة، والشرح بدقة قانونية 100٪ — اذكر المادة أو القانون عند اللزوم
- عربية فصحى سليمة بدون عامية، بأسلوب واضح يقرأه الجميع
- 3 نقاط فقط كحد أقصى
- اجعل كل النصوص قصيرة لتظهر كبيرة وواضحة على بطاقة مربعة 1080×1080
- JSON صحيح 100٪`;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature: 0.7, maxOutputTokens: 2000 },
    });
    let raw = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
    if (!parsed.title || !Array.isArray(parsed.points)) throw new Error('JSON ناقص');
    return parsed;
  } catch (err) {
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Quota') || retryIdx < models.length - 1) {
      console.warn(`⏳ إعادة المحاولة بنموذج آخر (${models[(retryIdx + 1) % models.length]})...`);
      await sleep(15000);
      return generateCardContent(topic, retryIdx + 1);
    }
    throw new Error(`فشل توليد البطاقة: ${err.message}`);
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
// ─── توليد وصف بصري إنجليزي فائق الدقة والتعبير عن الموضوع ──────────────────
async function generateTopicVisualPrompt(card) {
  try {
    if (ai) {
      const resp = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: `You are an art director for a prestigious Egyptian legal and judicial platform.
Generate a rich, highly descriptive visual prompt in English for Nano Banana Pro / Imagen 3 to generate a single photorealistic, cinematic 3D masterpiece image directly visualizing this topic:
Topic: "${card.title}"
Category: "${card.category || 'Egyptian Law'}"
Context & Points: ${(card.points || []).map((p) => p.label).join(', ')}

Guidelines:
- Create a powerful visual metaphor representing the core essence of the topic (e.g., employment contracts, real estate keys and classical architecture, family estate papers, court gavel and golden scales of justice, judicial chambers, corporate legal agreement).
- Style: Photorealistic 3D cinema concept, 8k resolution, volumetric moody lighting, deep royal navy blue, warm gold, and rich emerald tones. Classical Egyptian judicial dignity, marble columns, elegant mahogany.
- CRITICAL: Absolutely NO text, NO letters, NO typography, NO words, NO watermarks.
- Output ONLY the prompt string in English.`
      });
      const txt = resp.text?.trim().replace(/^["']|["']$/g, '');
      if (txt && txt.length > 25) return txt;
    }
  } catch (e) {}

  return `masterpiece, ultra-realistic 3D cinematic scene of modern Egyptian courtroom and judicial concept, ${card.category || 'Egyptian Law'}, ${card.title}, glowing golden scales of justice, elegant mahogany gavel, grand classical marble columns, dramatic volumetric moody lighting, deep sapphire blue and warm amber gold tones, photorealistic octane render, 8k resolution, elegant depth of field, award-winning atmosphere, no text, no letters, no watermark, clean background`;
}

// ─── توليد صورة توضيحية حية بالذكاء الاصطناعي (سينمائية ثلاثية الأبعاد عبر نانو بنانا برو) ──────
async function generateCardIllustration(card) {
  const promptEn = await generateTopicVisualPrompt(card);
  console.log(`  🎨 الوصف البصري التعبيري: "${promptEn.slice(0, 100)}..."`);

  // 1. تجربة Nano Banana Pro عبر حساب Google Pro أولاً
  if (ai) {
    for (const model of ['gemini-3-pro-image', 'imagen-3.0-generate-002', 'gemini-2.5-flash-image']) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: [{ text: promptEn }],
          config: {
            responseModalities: ['IMAGE', 'TEXT'],
            imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
          },
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

  // 2. Fallback: توليد صورة حية بالذكاء الاصطناعي عبر Pollinations / AI Engine
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptEn)}?width=1080&height=1080&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 5000) {
        console.log(`  ✓ صورة تعبيرية سينمائية ثلاثية الأبعاد مولدة بالذكاء الاصطناعي (AI Engine)`);
        return buf;
      }
    }
  } catch (err) {
    console.warn(`  ⚠️ تعذر جلب الصورة التوضيحية الحية: ${err.message}`);
  }

  return null;
}

// ─── توليد الصورة النهائية للنشر على فيسبوك ──────────────────────────────
async function renderCard(card, slug) {
  const sharp = require('sharp');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const pngPath = path.join(OUTPUT_DIR, `${slug}.png`);

  // توليد صورة تعبيرية حصرية فائقة الواقعية عبر نانو بنانا برو
  const aiIllustrationBuf = await generateCardIllustration(card);

  if (aiIllustrationBuf) {
    // حفظ الصورة التعبيرية النقية مباشرة بدون أي بطاقات نصية أو تشويه
    await sharp(aiIllustrationBuf)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .png({ quality: 95 })
      .toFile(pngPath);
    console.log(`  ✓ تم حفظ الصورة التعبيرية النقية (نانو بنانا): ${pngPath} (${(fs.statSync(pngPath).size / 1024).toFixed(0)} KB)`);
    return pngPath;
  }

  // Fallback اضطراري
  const svg = buildCardSvg(card);
  const svgBuf = Buffer.from(svg);
  await sharp(svgBuf, { density: 200 })
    .resize(CARD_WIDTH, CARD_HEIGHT)
    .png({ quality: 95 })
    .toFile(pngPath);
  console.log(`  ✓ صورة بديلة: ${pngPath}`);
  return pngPath;
}

// ─── بناء الكابشن ─────────────────────────────────────────────────────────
function buildCaption(card) {
  const points = (card.points || []).map((p) => `• ${p.label}: ${p.detail}`).join('\n');
  const hashtags = normalizeHashtags(card.hashtags).join(' ');
  return [
    `⚖️ ${card.title}`,
    ``,
    `${card.hook}`,
    ``,
    points,
    ``,
    `💡 نصيحة قانونية: ${card.tip}`,
    ``,
    hashtags,
    `───────────────────────`,
    `⚖️ منصة المحامي الرقمية | مرجعك التشريعي الأول في مصر`,
    `📌 نصوص القوانين المصرية كاملة • بنك أحكام محكمة النقض • موسوعة العقود والصيغ • 15 حاسبة قانونية ذكية مجاناً 100%`,
    `🧮 احسب مستحقاتك والتعويضات فوراً: https://mohamidigital.online/legal-calculators.html`,
    `🌐 تفضل بزيارة المنصة وتجربة كافة الخدمات الذكية لدعم نشر الثقافة القانونية:`,
    `👉 https://mohamidigital.online/`,
  ].join('\n');
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
  console.log(`  ✓ ${card.points.length} نقاط | ${card.hashtags.length} هاشتاجات`);

  // 2. رسم البطاقة
  console.log('\n[2/3] جاري رسم البطاقة (1080×1080، احترافية)...');
  const pngPath = await renderCard(card, topic.slug);

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
