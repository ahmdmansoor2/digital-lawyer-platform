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

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 628;

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
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length <= maxChars || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = w;
    }
    while (line.length > maxChars) {
      lines.push(line.slice(0, maxChars));
      line = line.slice(maxChars);
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
  if (!ai) throw new Error('GEMINI_API_KEY مش متضبط');

  const models = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-flash-lite-latest', 'gemini-2.0-flash'];
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

// ─── بناء SVG البطاقة (مربعة أنيقة، 1080×1080) ──────────────────────────────
function buildCardSvg(card) {
  const pad = 60;
  const rightX = CARD_WIDTH - pad;
  const leftX = pad;
  const textX = rightX - 76;

  const hashtagText = normalizeHashtags(card.hashtags).join('  ');

  const titleLines = wrapText(card.title, 28).slice(0, 2);
  const hookLines = wrapText(card.hook, 45).slice(0, 1);
  const tipLines = wrapText(card.tip, 50).slice(0, 2);

  const points = (card.points || []).slice(0, 3).map((p, i) => ({
    num: i + 1,
    label: wrapText(p.label, 26)[0] || '',
    detail: wrapText(p.detail, 48).slice(0, 2),
  }));

  const badge = 'منصة المحامي الرقمية';
  const cat = escapeXml(card.category || 'استشارة قانونية');

  const FONT = "'Cairo', 'Segoe UI', Tahoma, sans-serif";

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
<defs>
  <style>@font-face{font-family:'Cairo';src:url('${CAIRO_FONT_URL}') format('truetype');}</style>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0b0f19"/>
    <stop offset="0.4" stop-color="#0f172a"/>
    <stop offset="1" stop-color="#1e1b4b"/>
  </linearGradient>
  <linearGradient id="goldAccent" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#f59e0b"/>
    <stop offset="0.5" stop-color="#10b981"/>
    <stop offset="1" stop-color="#6366f1"/>
  </linearGradient>
  <linearGradient id="numGrad1" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f59e0b"/>
    <stop offset="1" stop-color="#d97706"/>
  </linearGradient>
  <linearGradient id="numGrad2" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#10b981"/>
    <stop offset="1" stop-color="#059669"/>
  </linearGradient>
  <linearGradient id="numGrad3" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6366f1"/>
    <stop offset="1" stop-color="#4f46e5"/>
  </linearGradient>
  <radialGradient id="glowGold" cx="0.88" cy="0.12" r="0.55">
    <stop offset="0" stop-color="#f59e0b" stop-opacity="0.25"/>
    <stop offset="1" stop-color="#f59e0b" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowIndigo" cx="0.12" cy="0.88" r="0.55">
    <stop offset="0" stop-color="#6366f1" stop-opacity="0.30"/>
    <stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
  </radialGradient>
</defs>

<!-- Background -->
<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>
<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#glowGold)"/>
<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#glowIndigo)"/>

<!-- Top & Bottom Glowing Gold Accents -->
<rect x="0" y="0" width="${CARD_WIDTH}" height="14" fill="url(#goldAccent)"/>
<rect x="0" y="${CARD_HEIGHT - 14}" width="${CARD_WIDTH}" height="14" fill="url(#goldAccent)"/>

<!-- Header Badge -->
<text x="${rightX}" y="76" font-family="${FONT}" font-size="30" font-weight="800" fill="#f59e0b" direction="rtl" text-anchor="start">⚖️ ${escapeXml(badge)}</text>

<!-- Category Pill -->
<rect x="${leftX}" y="44" width="${Math.min(240, 48 + cat.length * 14)}" height="46" rx="23" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5"/>
<text x="${leftX + Math.min(240, 48 + cat.length * 14) / 2}" y="74" font-family="${FONT}" font-size="20" font-weight="700" fill="#fbbf24" text-anchor="middle">${cat}</text>

<!-- Hook Banner -->
<rect x="${leftX}" y="118" width="${CARD_WIDTH - pad * 2}" height="58" rx="16" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-width="1.5"/>
<text x="${rightX - 24}" y="156" font-family="${FONT}" font-size="26" font-weight="800" fill="#fbbf24" direction="rtl" text-anchor="start">${escapeXml(hookLines[0])}</text>

<!-- Title -->
<text x="${rightX}" y="235" font-family="${FONT}" font-size="40" font-weight="800" fill="#ffffff" direction="rtl" text-anchor="start">${escapeXml(titleLines[0])}</text>
${titleLines[1] ? `<text x="${rightX}" y="288" font-family="${FONT}" font-size="40" font-weight="800" fill="#ffffff" direction="rtl" text-anchor="start">${escapeXml(titleLines[1])}</text>` : ''}

  // ─── النقاط (3 صفوف ثابتة مربعة) ───────────────────────────────────────
  const numGrads = ['url(#numGrad1)', 'url(#numGrad2)', 'url(#numGrad3)'];
  const pointYs = [348, 506, 664];

  points.forEach((p, i) => {
    const y = pointYs[i];
    const boxH = 136;
    const numCX = rightX - 38;
    svg += `
  <rect x="${leftX}" y="${y}" width="${CARD_WIDTH - pad * 2}" height="${boxH}" rx="20" fill="#0f172a" fill-opacity="0.80" stroke="#334155" stroke-width="1.5"/>
  <circle cx="${numCX}" cy="${y + 46}" r="26" fill="${numGrads[i]}"/>
  <text x="${numCX}" y="${y + 55}" font-family="${FONT}" font-size="26" font-weight="800" fill="#ffffff" text-anchor="middle">${p.num}</text>
  <text x="${textX}" y="${y + 44}" font-family="${FONT}" font-size="28" font-weight="800" fill="#f8fafc" direction="rtl" text-anchor="start">${escapeXml(p.label)}</text>
  <text x="${textX}" y="${y + 82}" font-family="${FONT}" font-size="22" font-weight="500" fill="#94a3b8" direction="rtl" text-anchor="start">${escapeXml(p.detail[0] || p.detail)}</text>`;
  });

  // ─── صندوق النصيحة القانونية ─────────────────────────────────────────
  const tipY = 824;
  svg += `
  <rect x="${leftX}" y="${tipY}" width="${CARD_WIDTH - pad * 2}" height="136" rx="20" fill="#10b981" fill-opacity="0.10" stroke="#10b981" stroke-width="2"/>
  <text x="${rightX - 24}" y="${tipY + 44}" font-family="${FONT}" font-size="24" font-weight="800" fill="#34d399" direction="rtl" text-anchor="start">💡 نصيحة قانونية:</text>
  <text x="${rightX - 24}" y="${tipY + 82}" font-family="${FONT}" font-size="22" font-weight="600" fill="#e2e8f0" direction="rtl" text-anchor="start">${escapeXml(tipLines[0])}</text>
  ${tipLines[1] ? `<text x="${rightX - 24}" y="${tipY + 112}" font-family="${FONT}" font-size="22" font-weight="600" fill="#e2e8f0" direction="rtl" text-anchor="start">${escapeXml(tipLines[i] || tipLines[1])}</text>` : ''}`;

  // ─── السطر السفلي: CTA (يمين) + الهاشتاجات (يسار) ─────────────────────
  svg += `
  <text x="${rightX}" y="1018" font-family="${FONT}" font-size="24" font-weight="800" fill="#f59e0b" direction="rtl" text-anchor="start">${escapeXml(card.cta || 'استشر محامياً مختصاً الآن')} 👈</text>
  <text x="${leftX}" y="1018" font-family="${FONT}" font-size="18" font-weight="600" fill="#64748b">${escapeXml(hashtagText)}</text>`;

  svg += `
</svg>`;
  return svg;
}

// ─── توليد البطاقة PNG عبر sharp ─────────────────────────────────────────
async function renderCard(card, slug) {
  const sharp = require('sharp');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const svg = buildCardSvg(card);
  const pngPath = path.join(OUTPUT_DIR, `${slug}.png`);

  await sharp(Buffer.from(svg), { density: 200 })
    .resize(CARD_WIDTH, CARD_HEIGHT)
    .png({ quality: 95 })
    .toFile(pngPath);

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
  console.log('\n[2/3] جاري رسم البطاقة (1200×628، داكنة أنيقة)...');
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
