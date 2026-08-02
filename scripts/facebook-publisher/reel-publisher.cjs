#!/usr/bin/env node
/**
 * reel-publisher.cjs — ناشر ريلز فيسبوك اليومي
 *
 * يأخذ مواضيع قانونية (ترندات جوجل + مقالات المدونة) ويُنشئ فيديو ريلز
 * ثم ينشره على صفحة فيسبوك عبر Graph API.
 *
 * الاستخدام:
 *   node reel-publisher.cjs                    # نشر فيديو واحد
 *   node reel-publisher.cjs --count 3          # نشر 3 فيديوهات
 *   node reel-publisher.cjs --dry-run          # محاكاة بدون نشر
 *   node reel-publisher.cjs --article <slug>   # من مقال مدونة محدد
 *   node reel-publisher.cjs --trend <slug>     # من ترند محدد
 *   node reel-publisher.cjs --status           # عرض حالة السجل
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// ─── المسارات ──────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const PUBLISHER_DIR = path.join(ROOT, 'scripts', 'tiktok-publisher');
const FB_PUBLISHER_DIR = __dirname;
const TRENDING_FILE = path.join(ROOT, 'scripts', 'trending-topics.json');
const BLOG_LOG = path.join(ROOT, 'scripts', 'blog-publisher', 'published-log.json');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const TOPICS_FILE = path.join(PUBLISHER_DIR, 'topics.json');
const FB_LOG_FILE = path.join(FB_PUBLISHER_DIR, 'facebook-published-log.json');
const OUTPUT_DIR = path.join(FB_PUBLISHER_DIR, 'output');

// ─── استيراد الوحدات المشتركة من tiktok-publisher ──────────────────────────
const { syncTopicsFromSources, pickTopics, pickLatestArticle } = require(path.join(PUBLISHER_DIR, 'tiktok-publish.cjs'));
const { planScenes, renderScenes, renderVideoScenes } = require(path.join(PUBLISHER_DIR, 'scene-generator.cjs'));
const { synthesize } = require(path.join(PUBLISHER_DIR, 'tts-generator.cjs'));
const { composeVideo } = require(path.join(PUBLISHER_DIR, 'video-composer.cjs'));
const { publishReel } = require(path.join(FB_PUBLISHER_DIR, 'facebook-graph.cjs'));

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

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { count: 1, dryRun: false, article: null, trend: null, status: false, photos: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--count') opts.count = parseInt(args[++i], 10) || 1;
    else if (args[i] === '--article') opts.article = args[++i];
    else if (args[i] === '--trend') opts.trend = args[++i];
    else if (args[i] === '--status') opts.status = true;
    else if (args[i] === '--photos') opts.photos = true;
  }
  return opts;
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}د ${s}ث` : `${s}ث`;
}

// ─── سجل النشر ────────────────────────────────────────────────────────────
function readLog() {
  return readJson(FB_LOG_FILE, { entries: [] });
}

function logEntry(entry) {
  const log = readLog();
  log.entries.push({ ...entry, publishedAt: new Date().toISOString() });
  writeJson(FB_LOG_FILE, log);
}

function isPublished(topicId) {
  const log = readLog();
  return log.entries.some((e) => e.topicId === topicId);
}

// ─── بناء الهاشتاجات ──────────────────────────────────────────────────────
function buildHashtags(topic) {
  const base = ['#قانون', '#محكمة', '#محامي', '#القانون_المصري', '#قضايا'];
  if (topic.category) base.push(`#${topic.category}`);
  if (topic.keywords && topic.keywords.length) {
    base.push(...topic.keywords.slice(0, 3).map((k) => `#${k.trim()}`));
  }
  return [...new Set(base)].slice(0, 8);
}

// ─── معالجة موضوع واحد ────────────────────────────────────────────────────
async function processTopic(topic, opts) {
  const startTime = Date.now();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📌 الموضوع: ${topic.title}`);
  console.log(`📂 المصدر: ${topic.source} | التصنيف: ${topic.category}`);
  console.log(`${'═'.repeat(60)}`);

  // 1. تخطيط المشاهد
  console.log('\n[1/4] جاري تخطيط المشاهد...');
  const plan = await planScenes(topic);
  console.log(`  ✓ ${plan.scenes.length} مشاهد، ${plan.scenes.reduce((s, sc) => s + sc.duration_sec, 0)} ثانية`);

  // 2. تحويل النص إلى كلام (صوت Salma — مصري أنثوي)
  console.log('\n[2/4] جاري تحويل النص إلى كلام...');
  const audio = await synthesize(plan.full_text, {
    outputDir: OUTPUT_DIR,
    filename: `fb-${topic.id}.mp3`,
    voice: 'ar-EG-SalmaNeural',
  });
  console.log(`  ✓ ${formatDuration(audio.durationSec)}`);

  // 3. عرض المشاهد (مقاطع فيديو حقيقية من Pexels افتراضياً، أو صور بـ --photos)
  console.log('\n[3/4] جاري تجهيز مشاهد الفيديو...');
  const scenes = opts.photos
    ? await renderScenes(plan, { outputDir: OUTPUT_DIR })
    : await renderVideoScenes(plan, { outputDir: OUTPUT_DIR });
  console.log(`  ✓ ${scenes.length} مشهد (${scenes.filter(s => s.videoPath).length} فيديو + ${scenes.filter(s => s.imagePath).length} صورة)`);

  // 4. تجميع الفيديو
  console.log('\n[4/4] جاري تجميع الفيديو...');
  const videoPath = path.join(OUTPUT_DIR, `fb-${topic.id}.mp4`);
  await composeVideo({
    scenes,
    audioPath: audio.audioPath,
    outputPath: videoPath,
    title: topic.title,
    subtitles: audio.subtitles,
  });
  const videoSize = fs.statSync(videoPath).size;
  console.log(`  ✓ ${(videoSize / 1024 / 1024).toFixed(1)} MB`);

  // 5. النشر على فيسبوك
  if (!opts.dryRun) {
    console.log('\n📤 جاري النشر على فيسبوك...');
    const hashtags = buildHashtags(topic);
    const description = `${plan.hook}\n\n${hashtags.join(' ')}`;

    const result = await publishReel({
      videoPath,
      description,
      published: true,
    });

    logEntry({
      topicId: topic.id,
      title: topic.title,
      hashtags,
      videoPath,
      videoId: result.video_id,
      permalink: result.permalink_url,
      source: topic.source,
      duration: formatDuration(audio.durationSec),
      size: videoSize,
    });

    console.log(`\n✅ تم النشر بنجاح!`);
    console.log(`   🔗 ${result.permalink_url}`);
  } else {
    console.log('\n🔍 [DRY RUN] لم يُنشر — الفيديو محفوظ في:');
    console.log(`   ${videoPath}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`⏱️  الإجمالي: ${formatDuration(parseInt(elapsed))}`);

  return { videoPath, videoSize, duration: audio.durationSec };
}

// ─── الوضع الرئيسي ────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();

  if (opts.status) {
    const log = readLog();
    console.log('─── حالة سجل نشر ريلز فيسبوك ───');
    console.log(`إجمالي النشر: ${log.entries.length}`);
    for (const e of log.entries.slice(-5)) {
      console.log(`  ${e.publishedAt?.slice(0, 10)} | ${e.title?.slice(0, 40)} | ${e.videoId || '?'}`);
    }
    return;
  }

  // التحقق من الإعدادات
  if (!process.env.FB_PAGE_ID || !process.env.FB_PAGE_TOKEN) {
    console.error('❌ FB_PAGE_ID و FB_PAGE_TOKEN مش متضبطين في .env');
    process.exit(1);
  }

  console.log('🎬 Facebook Reels Publisher — منصة المحامي الرقمية');
  console.log(`📝 الوضع: ${opts.dryRun ? 'اختبار (dry-run)' : 'نشر حقيقي'}`);
  console.log(`📊 العدد: ${opts.count}`);

  // جمع المواضيع
  let topics;
  if (opts.article) {
    // وضع مقال محدد
    const { topicFromArticle } = require(path.join(PUBLISHER_DIR, 'tiktok-publish.cjs'));
    const topic = topicFromArticle(opts.article);
    if (!topic) {
      console.error(`❌ المقال "${opts.article}" غير موجود`);
      process.exit(1);
    }
    topics = [topic];
  } else if (opts.trend) {
    // وضع ترند محدد
    const trending = readJson(TRENDING_FILE, { topics: [] });
    const t = trending.topics.find((x) => x.slug === opts.trend);
    if (!t) {
      console.error(`❌ الترند "${opts.trend}" غير موجود`);
      process.exit(1);
    }
    topics = [{ id: `trend-${t.slug}`, title: t.title, category: t.tag, keywords: t.keywords.split(','), source: 'trending-topics.json' }];
  } else {
    // وضع افتراضي: مزامنة من المصادر
    topics = syncTopicsFromSources();
  }

  // تصفية المنشور مسبقاً
  topics = topics.filter((t) => !isPublished(t.id));

  if (topics.length === 0) {
    console.log('ℹ️  لا توجد مواضيع جديدة للنشر.');
    return;
  }

  console.log(`\n📋 ${topics.length} مواضيع متاحة:`);
  topics.slice(0, 10).forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.title.slice(0, 50)} (${t.source})`);
  });

  // اختيار العدد المطلوب
  const selected = topics.slice(0, opts.count);

  // معالجة كل موضوع
  let successCount = 0;
  let failCount = 0;

  for (const topic of selected) {
    try {
      await processTopic(topic, opts);
      successCount++;
    } catch (err) {
      console.error(`\n❌ فشل في "${topic.title.slice(0, 30)}": ${err.message}`);
      failCount++;
    }
  }

  // الملخص
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 الملخص: ${successCount} نجح | ${failCount} فشل | ${selected.length} إجمالي`);
  console.log(`${'═'.repeat(60)}`);

  // لو فشل كل شيء في وضع النشر الفعلي → يفشل الـ job في GitHub Actions
  if (!opts.dryRun && successCount === 0 && selected.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ خطأ غير متوقع:', err.message);
    process.exit(1);
  });
}

module.exports = { processTopic, buildHashtags, readLog, logEntry, isPublished };
