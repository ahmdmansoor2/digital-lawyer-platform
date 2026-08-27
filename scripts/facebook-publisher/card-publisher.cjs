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
    process.env.TEXT_MODEL || 'gemini-2.5-pro',
    'gemini-1.5-pro',
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest',
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

// ─── بناء SVG البطاقة الاحترافية (مربعة 1080×1080) ─────────────────────────
function buildCardSvg(card) {
  const W = CARD_WIDTH;   // 1080
  const H = CARD_HEIGHT;  // 1080
  const pad = 56;         // هامش أفقي
  const rX = W - pad;     // نقطة اليمين للنص RTL
  const lX = pad;         // نقطة اليسار

  const FONT = "'Cairo', Tahoma, 'Segoe UI', Arial, sans-serif";
  const hashtags = normalizeHashtags(card.hashtags).slice(0, 4).join(' ');
  const cat = escapeXml(card.category || 'قانون');

  // نص مختصر — بطاقة احترافية تعرض فكرة واحدة واضحة
  const hookLine = (wrapText(card.hook, 36)[0] || '').trim();
  const titleLines = wrapText(card.title, 22).slice(0, 2);
  const tipLines = wrapText(card.tip, 52).slice(0, 2);
  const ctaLine = escapeXml(card.cta || 'استشر محامياً مختصاً الآن');

  // النقاط — عنوان فقط بدون تفاصيل (أكثر وضوحاً)
  const pts = (card.points || []).slice(0, 3).map((p, i) => ({
    num: i + 1,
    label: (wrapText(String(p.label || p.detail || ''), 30)[0] || '').trim(),
    grad: ['url(#g1)', 'url(#g2)', 'url(#g3)'][i],
  }));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <style>@font-face{font-family:'Cairo';src:url('${CAIRO_FONT_URL}') format('truetype');font-weight:100 900;}</style>
  <!-- خلفية متدرجة غامقة -->
  <linearGradient id="bgTop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#080D1A"/>
    <stop offset="60%" stop-color="#0C1325"/>
    <stop offset="100%" stop-color="#111827"/>
  </linearGradient>
  <!-- توهج ذهبي في الزاوية العلوية اليمنى -->
  <radialGradient id="gGold" cx="1" cy="0" r="0.7">
    <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
  </radialGradient>
  <!-- توهج أخضر في الزاوية السفلية اليسرى -->
  <radialGradient id="gGreen" cx="0" cy="1" r="0.6">
    <stop offset="0%" stop-color="#059669" stop-opacity="0.14"/>
    <stop offset="100%" stop-color="#059669" stop-opacity="0"/>
  </radialGradient>
  <!-- شريط ذهبي أعلى/أسفل -->
  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#78350F"/>
    <stop offset="30%" stop-color="#F59E0B"/>
    <stop offset="70%" stop-color="#D97706"/>
    <stop offset="100%" stop-color="#78350F"/>
  </linearGradient>
  <!-- أرقام النقاط -->
  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FBBF24"/><stop offset="100%" stop-color="#D97706"/></linearGradient>
  <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#34D399"/><stop offset="100%" stop-color="#059669"/></linearGradient>
  <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#818CF8"/><stop offset="100%" stop-color="#4F46E5"/></linearGradient>
  <!-- تدرج صندوق النصيحة -->
  <linearGradient id="tipGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#064E3B"/>
    <stop offset="100%" stop-color="#065F46"/>
  </linearGradient>
  <!-- ظل الحدود -->
  <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
    <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.5"/>
  </filter>
</defs>

<!-- === الخلفية === -->
<rect width="${W}" height="${H}" fill="url(#bgTop)" fill-opacity="0.82"/>
<rect width="${W}" height="${H}" fill="url(#gGold)"/>
<rect width="${W}" height="${H}" fill="url(#gGreen)"/>

<!-- شريط علوي ذهبي -->
<rect x="0" y="0" width="${W}" height="8" fill="url(#barGrad)"/>

<!-- === رأس البطاقة === -->
<!-- اسم المنصة (يمين) -->
<text x="${rX}" y="62" font-family="${FONT}" font-size="26" font-weight="700" fill="#F59E0B" direction="rtl" text-anchor="start" letter-spacing="0.5">⚖ منصة المحامي الرقمية</text>

<!-- تصنيف الموضوع (يسار) — حبة ملونة -->
<rect x="${lX}" y="34" width="168" height="38" rx="19" fill="#1E3A5F" stroke="#3B82F6" stroke-width="1.5"/>
<text x="${lX + 84}" y="59" font-family="${FONT}" font-size="19" font-weight="700" fill="#93C5FD" text-anchor="middle">${cat}</text>

<!-- خط فاصل رفيع -->
<line x1="${lX}" y1="94" x2="${rX}" y2="94" stroke="#F59E0B" stroke-opacity="0.35" stroke-width="1"/>

<!-- === الهوك (السؤال الجاذب) === -->
<text x="${rX}" y="148" font-family="${FONT}" font-size="30" font-weight="700" fill="#FCD34D" direction="rtl" text-anchor="start">${escapeXml(hookLine)}</text>

<!-- === العنوان الرئيسي === -->
<text x="${rX}" y="228" font-family="${FONT}" font-size="52" font-weight="900" fill="#FFFFFF" direction="rtl" text-anchor="start">${escapeXml(titleLines[0] || '')}</text>
${titleLines[1] ? `<text x="${rX}" y="296" font-family="${FONT}" font-size="52" font-weight="900" fill="#FFFFFF" direction="rtl" text-anchor="start">${escapeXml(titleLines[1])}</text>` : ''}

<!-- خط فاصل تحت العنوان -->
<line x1="${lX}" y1="330" x2="${rX}" y2="330" stroke="#374151" stroke-width="1"/>

${pts.map((p) => {
  const pointYMap = [370, 490, 610];
  const y = pointYMap[p.num - 1];
  const numCX = rX - 32;
  return `
<!-- نقطة ${p.num} -->
<circle cx="${numCX}" cy="${y + 20}" r="28" fill="${p.grad}" filter="url(#shadow)"/>
<text x="${numCX}" y="${y + 28}" font-family="${FONT}" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle">${p.num}</text>
<text x="${numCX - 68}" y="${y + 28}" font-family="${FONT}" font-size="30" font-weight="700" fill="#F1F5F9" direction="rtl" text-anchor="start">${escapeXml(p.label)}</text>`;
}).join('')}

<!-- خط فاصل قبل النصيحة -->
<line x1="${lX}" y1="692" x2="${rX}" y2="692" stroke="#374151" stroke-width="1"/>

<!-- === صندوق النصيحة === -->
<rect x="${lX}" y="710" width="${W - pad * 2}" height="${tipLines[1] ? 128 : 100}" rx="16" fill="url(#tipGrad)" stroke="#059669" stroke-width="1.5"/>
<text x="${rX - 22}" y="748" font-family="${FONT}" font-size="22" font-weight="800" fill="#6EE7B7" direction="rtl" text-anchor="start">💡 نصيحة قانونية:</text>
<text x="${rX - 22}" y="786" font-family="${FONT}" font-size="23" font-weight="600" fill="#D1FAE5" direction="rtl" text-anchor="start">${escapeXml(tipLines[0])}</text>
${tipLines[1] ? `<text x="${rX - 22}" y="820" font-family="${FONT}" font-size="23" font-weight="600" fill="#D1FAE5" direction="rtl" text-anchor="start">${escapeXml(tipLines[1])}</text>` : ''}

<!-- === CTA === -->
<text x="${rX}" y="878" font-family="${FONT}" font-size="27" font-weight="800" fill="#F59E0B" direction="rtl" text-anchor="start">${ctaLine} ←</text>

<!-- خط فاصل سفلي -->
<line x1="${lX}" y1="910" x2="${rX}" y2="910" stroke="#F59E0B" stroke-opacity="0.25" stroke-width="1"/>

<!-- === هاشتاجات + watermark === -->
<text x="${W / 2}" y="948" font-family="${FONT}" font-size="20" font-weight="500" fill="#4B5563" text-anchor="middle">${escapeXml(hashtags)}</text>
<text x="${W / 2}" y="978" font-family="${FONT}" font-size="17" font-weight="400" fill="#2D3748" text-anchor="middle">mohamidigital.online</text>

<!-- شريط سفلي ذهبي -->
<rect x="0" y="${H - 8}" width="${W}" height="8" fill="url(#barGrad)"/>
</svg>`;
}

// ─── توليد صورة توضيحية حية بالذكاء الاصطناعي ──────────────────────────────
async function generateCardIllustration(card) {
  const promptEn = `Egyptian legal and judicial concept, ${card.category || 'Law'} theme, ${card.title}, scales of justice, law books, elegant gavel, dramatic cinematic lighting, deep blue and gold atmosphere, ultra realistic 3D digital art, 8k resolution, no text, no letters, no typography`;

  // 1. تجربة Nano Banana عبر Gemini إن كان متاحاً
  if (ai) {
    for (const model of ['gemini-2.5-flash-image', 'gemini-3-pro-image', 'gemini-3.1-flash-image']) {
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
          console.log(`  ✓ صورة توضيحية حية مولدة عبر Nano Banana (${model})`);
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
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 5000) {
        console.log(`  ✓ صورة توضيحية حية مولدة بالذكاء الاصطناعي (AI Engine)`);
        return buf;
      }
    }
  } catch (err) {
    console.warn(`  ⚠️ تعذر جلب الصورة التوضيحية الحية: ${err.message}`);
  }

  return null;
}

// ─── توليد البطاقة PNG عبر sharp ─────────────────────────────────────────
async function renderCard(card, slug) {
  const sharp = require('sharp');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const pngPath = path.join(OUTPUT_DIR, `${slug}.png`);
  const svg = buildCardSvg(card);
  const svgBuf = Buffer.from(svg);

  // توليد صورة توضيحية حية بالذكاء الاصطناعي
  const aiIllustrationBuf = await generateCardIllustration(card);

  if (aiIllustrationBuf) {
    // دمج الصورة التوضيحية الحية في خلفية البطاقة مع تعتيم فخم وSVG Glassmorphism
    const darkenedBg = await sharp(aiIllustrationBuf)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .modulate({ brightness: 0.38, saturation: 1.15 })
      .toBuffer();

    await sharp(darkenedBg)
      .composite([{ input: svgBuf, top: 0, left: 0 }])
      .png({ quality: 95 })
      .toFile(pngPath);
  } else {
    await sharp(svgBuf, { density: 200 })
      .resize(CARD_WIDTH, CARD_HEIGHT)
      .png({ quality: 95 })
      .toFile(pngPath);
  }

  console.log(`  ✓ البطاقة: ${pngPath} (${(fs.statSync(pngPath).size / 1024).toFixed(0)} KB)`);
  return pngPath;
}

// ─── بناء الكابشن ─────────────────────────────────────────────────────────
function buildCaption(card) {
  const points = (card.points || []).map((p) => `• ${p.label}: ${p.detail}`).join('\n');
  const hashtags = normalizeHashtags(card.hashtags).join(' ');
  return [
    `🃏 ${card.title}`,
    ``,
    `${card.hook}`,
    ``,
    points,
    ``,
    `💡 نصيحة قانونية: ${card.tip}`,
    ``,
    hashtags,
    ``,
    `⚖️ منصة المحامي الرقمية — ${card.cta}`,
    `🌐 تصفح المنصة واستشر محاميك مجاناً: https://mohamidigital.online`,
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
