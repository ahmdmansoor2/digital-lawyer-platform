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
    }
  }
  if (line) lines.push(line);
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
function pickTopTrend(opts) {
  const trending = readJson(TRENDING_FILE, { date: '', topics: [] });
  const topics = trending.topics || [];

  if (opts.topic) {
    const t = topics.find((x) => x.slug === opts.topic);
    if (!t) {
      console.error(`❌ الترند "${opts.topic}" غير موجود في trending-topics.json`);
      process.exit(1);
    }
    return { ...t, date: trending.date };
  }

  const first = topics.find((t) => {
    if (isCardPublished(t.slug)) return false;
    if (!opts.allowReelOverlap && isReelPublished(t.slug)) return false;
    return true;
  });

  if (!first) {
    console.log('ℹ️  لا يوجد ترند جديد متاح (كل المواضيع منشورة بطاقات أو ريلز).');
    return null;
  }
  return { ...first, date: trending.date };
}

// ─── توليد محتوى البطاقة عبر Gemini ───────────────────────────────────────
async function generateCardContent(topic, retryIdx = 0) {
  if (!ai) throw new Error('GEMINI_API_KEY مش متضبط');

  const models = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-flash-lite-latest', 'gemini-2.0-flash'];
  const model = models[retryIdx % models.length];

  const prompt = `أنت خبير قانوني مصري ومصمم بطاقات تعليمية احترافية بستايل بطاقات إنستجرام القانونية.
صمّم بطاقة تعليمية جذابة وبسيطة عن الموضوع التالي:

العنوان: ${topic.title}
التصنيف: ${topic.tag || 'قانون'}
الكلمات المفتاحية: ${topic.keywords || ''}

أرجع JSON فقط بدون أي كلام إضافي:
{
  "hook": "سطر جذب قصير (5-8 كلمات، سؤال أو حقيقة صادمة)",
  "title": "عنوان قصير وجذاب للبطاقة (6-10 كلمات)",
  "points": [
    { "label": "عنوان النقطة (2-4 كلمات)", "detail": "شرح مختصر (8-14 كلمة) بمعلومة قانونية دقيقة" }
  ],
  "tip": "نصيحة قانونية عملية في جملة واحدة (10-15 كلمة)",
  "hashtags": ["هاشتاج1", "هاشتاج2", "هاشتاج3", "هاشتاج4"],
  "cta": "عبارة CTA قصيرة تدعو لاستشارة محامٍ (4-8 كلمات)"
}

القواعد:
- الدقة القانونية 100٪ — اذكر المادة أو القانون عند اللزوم (مثل "المادة 65 من قانون العمل 12 لسنة 2003")
- عربية فصحى سليمة، بدون عامية
- 3 نقاط فقط كحد أقصى
- كل detail قصير ليتناسب مع بطاقة 1200×628
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

// ─── بناء SVG البطاقة (داكنة أنيقة، 1200×628) ─────────────────────────────
// تخطيط ثابت (deterministic) — لا يتكدس عمودياً مهما تغيّر طول النصوص:
//   الشعار/التصنيف ← hook (سطر واحد) ← العنوان (سطران كحد أقصى) ← 3 نقاط
//   ← صندوق النصيحة (سطران كحد أقصى) ← السطر السفلي (CTA + هاشتاجات)
function buildCardSvg(card) {
  const pad = 56;
  const rightX = CARD_WIDTH - pad; // نقطة بداية النص RTL (يمين البطاقة)
  const leftX = pad;
  const textX = rightX - 56; // أقصى عرض للنص (يسار رقم النقطة)

  const hashtagText = normalizeHashtags(card.hashtags).join('  ');

  // تحضير الأسطر (بحدود قصوى مضمونة تناسب التخطيط)
  const titleLines = wrapText(card.title, 30).slice(0, 2);
  const hookLines = wrapText(card.hook, 56).slice(0, 1);
  const tipLines = wrapText(card.tip, 58).slice(0, 2);

  const points = (card.points || []).slice(0, 3).map((p, i) => ({
    num: i + 1,
    label: (wrapText(p.label, 28)[0] || ''),
    detail: (wrapText(p.detail, 55)[0] || ''),
  }));

  const badge = 'منصة المحامي الرقمية';
  const cat = escapeXml(card.category || 'قانون');

  // مواضع رأسية ثابتة (تخطيط متحفظ يناسب الحالة القصوى: عنوان سطران + 3 نقاط + نصيحة سطران)
  const BADGE_Y = 58;
  const CHIP_Y = 28;
  const HOOK_Y = 128;
  const TITLE_Y = 178;
  const TITLE_STEP = 52;
  const POINT_ROWS = [300, 366, 432];
  const TIP_Y = 458;
  const TIP_LINE = 30;
  const FOOTER_Y = 592;

  const FONT = "'Noto Sans Arabic', Tahoma, 'Segoe UI', Arial, sans-serif";

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.5" stop-color="#111c33"/>
      <stop offset="1" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#10b981"/>
      <stop offset="1" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="numGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="1" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="chipGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#10b981"/>
      <stop offset="1" stop-color="#6366f1"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.92" cy="0.08" r="0.6">
      <stop offset="0" stop-color="#10b981" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.06" cy="0.94" r="0.6">
      <stop offset="0" stop-color="#6366f1" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="42" height="42" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.6" fill="#ffffff" opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)"/>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#glow1)"/>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#glow2)"/>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#dots)"/>
  <rect x="0" y="0" width="${CARD_WIDTH}" height="10" fill="url(#accent)"/>
  <rect x="0" y="${CARD_HEIGHT - 10}" width="${CARD_WIDTH}" height="10" fill="url(#accent)"/>
  <circle cx="${CARD_WIDTH - 92}" cy="66" r="4" fill="#34d399" opacity="0.9"/>
  <circle cx="${CARD_WIDTH - 118}" cy="40" r="6" fill="#10b981" opacity="0.45"/>`;

  // ─── الشعار (يمين) + التصنيف (شريحة يسار) ─────────────────────────────
  svg += `
  <text x="${rightX}" y="${BADGE_Y}" font-family="${FONT}" font-size="26" font-weight="700" fill="#e2e8f0" direction="rtl" text-anchor="start">${escapeXml(badge)}</text>
  <rect x="${leftX}" y="${CHIP_Y}" width="${Math.min(230, 44 + cat.length * 14)}" height="40" rx="20" fill="url(#chipGrad)" opacity="0.9"/>
  <text x="${leftX + 20}" y="${CHIP_Y + 27}" font-family="${FONT}" font-size="22" font-weight="700" fill="#ffffff" direction="rtl" text-anchor="end">${cat}</text>`;

  // ─── Hook (سطر واحد، بتدرج ملون) ──────────────────────────────────────
  if (hookLines[0]) {
    svg += `
  <text x="${rightX}" y="${HOOK_Y}" font-family="${FONT}" font-size="32" font-weight="800" fill="#6ee7b7" direction="rtl" text-anchor="start">${escapeXml(hookLines[0])}</text>`;
  }

  // ─── العنوان الرئيسي (سطران كحد أقصى) ────────────────────────────────
  titleLines.forEach((line, i) => {
    svg += `
  <text x="${rightX}" y="${TITLE_Y + i * TITLE_STEP}" font-family="${FONT}" font-size="44" font-weight="800" fill="#f8fafc" direction="rtl" text-anchor="start">${escapeXml(line)}</text>`;
  });

  // ─── النقاط (3 صفوف ثابتة) ────────────────────────────────────────────
  points.forEach((p, i) => {
    const rowY = POINT_ROWS[i];
    const numCX = rightX - 24;
    svg += `
  <circle cx="${numCX}" cy="${rowY - 27}" r="22" fill="url(#numGrad)" opacity="0.95"/>
  <text x="${numCX}" y="${rowY - 19}" font-family="Tahoma, Arial, sans-serif" font-size="23" font-weight="800" fill="#ffffff" text-anchor="middle">${p.num}</text>`;
    if (p.label) {
      svg += `
  <text x="${textX}" y="${rowY - 30}" font-family="${FONT}" font-size="28" font-weight="800" fill="#f1f5f9" direction="rtl" text-anchor="start">${escapeXml(p.label)}</text>`;
    }
    if (p.detail) {
      svg += `
  <text x="${textX}" y="${rowY + 3}" font-family="${FONT}" font-size="23" font-weight="400" fill="#a5b4fc" direction="rtl" text-anchor="start">${escapeXml(p.detail)}</text>`;
    }
  });

  // ─── صندوق النصيحة القانونية (سطران كحد أقصى) ─────────────────────────
  const tipBoxH = 44 + tipLines.length * TIP_LINE;
  svg += `
  <rect x="${pad}" y="${TIP_Y}" width="${CARD_WIDTH - pad * 2}" height="${tipBoxH}" rx="16" fill="#10b981" opacity="0.10" stroke="#34d399" stroke-width="1.5"/>`;
  if (tipLines[0]) {
    svg += `
  <text x="${rightX - 24}" y="${TIP_Y + 34}" font-family="${FONT}" font-size="24" font-weight="800" fill="#34d399" direction="rtl" text-anchor="start">نصيحة قانونية: ${escapeXml(tipLines[0])}</text>`;
    for (let i = 1; i < tipLines.length; i++) {
      svg += `
  <text x="${rightX - 24}" y="${TIP_Y + 34 + i * TIP_LINE}" font-family="${FONT}" font-size="22" font-weight="400" fill="#a7f3d0" direction="rtl" text-anchor="start">${escapeXml(tipLines[i])}</text>`;
    }
  }

  // ─── السطر السفلي: CTA (يمين) + الهاشتاجات (يسار) ─────────────────────
  svg += `
  <text x="${rightX}" y="${FOOTER_Y}" font-family="${FONT}" font-size="24" font-weight="800" fill="#e2e8f0" direction="rtl" text-anchor="start">${escapeXml(card.cta || 'استشر محامياً مختصاً')} ←</text>
  <text x="${leftX + 20}" y="${FOOTER_Y}" font-family="${FONT}" font-size="20" font-weight="600" fill="#64748b" direction="rtl" text-anchor="end">${escapeXml(hashtagText)}</text>`;

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
  console.log('\n[2/3] جاري رسم البطاقة (1200×628، فاتحة)...');
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
