#!/usr/bin/env node
/**
 * backfill-wide.cjs — تحويل الريلز السابقة (المنشورة كـ Shorts) إلى فيديوهات أفقية 16:9
 * وإعادة نشرها على قناة YouTube لتظهر في تبويب Videos بصفحة القناة.
 *
 * المصدر: نسترجّع كل ريلز من الصفحة (فيسبوك Graph API / source) — لأن الملفات
 * الأصلية كانت في الـ CI فقط وغير محفوظة محلياً. لو وُجد ملف محلي نستخدمه مباشرة.
 *
 * الاستخدام:
 *   node backfill-wide.cjs --dry-run          # معاينة (بدون تحميل/رفع)
 *   node backfill-wide.cjs --limit 3          # أول 3 فقط
 *   node backfill-wide.cjs --topic X          # موضوع محدد
 *   node backfill-wide.cjs                    # كل الريلز التي لها Short بلا نسخة أفقية
 */
'use strict';
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const { uploadToYouTube, buildDescription, alreadyPublished, toHorizontal16x9, truncateTitle } = require('./youtube-publish.cjs');

const LOG_FILE = path.join(__dirname, 'youtube-published-log.json');
const FB_LOG = path.join(ROOT, 'scripts', 'facebook-publisher', 'facebook-published-log.json');
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const BACKFILL_DIR = path.join(__dirname, 'output', 'backfill');
const GRAPH = 'https://graph.facebook.com/v19.0';
const CATEGORY_EDUCATION = '27';

// مسارات محلية محتملة للفيديوهات المولّدة محلياً
const LOCAL_DIRS = [
  path.join(ROOT, 'scripts', 'facebook-publisher', 'output'),
  path.join(ROOT, 'scripts', 'tiktok-publisher', 'output'),
  path.join(__dirname, 'output', 'videos'),
  path.join(__dirname, 'output'),
];

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function logPublished(entry) {
  const log = readJson(LOG_FILE, { entries: [] });
  log.entries.push({ ...entry, publishedAt: new Date().toISOString() });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

function findLocalFile(topicId) {
  for (const dir of LOCAL_DIRS) {
    const f = path.join(dir, `${topicId}.mp4`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

async function downloadVideo(videoId, dest) {
  const url = `${GRAPH}/${videoId}?fields=source,length&access_token=${encodeURIComponent(FB_PAGE_TOKEN)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.source) throw new Error(`لا يوجد source للفيديو ${videoId}: ${JSON.stringify(data).slice(0, 200)}`);
  const dl = await fetch(data.source, { signal: AbortSignal.timeout(180000) });
  if (!dl.ok) throw new Error(`فشل تحميل الفيديو من Facebook (${dl.status})`);
  const buf = Buffer.from(await dl.arrayBuffer());
  if (buf.length < 100_000) throw new Error(`ملف صغير بشكل مريب (${buf.length} بايت) — ربما clip ناقص`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return dest;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;
  const topicArg = process.argv.indexOf('--topic');
  const onlyTopic = topicArg !== -1 ? process.argv[topicArg + 1] : null;

  if (!FB_PAGE_TOKEN) {
    console.error('❌ يلزم FB_PAGE_TOKEN في .env');
    process.exit(1);
  }

  const fbLog = readJson(FB_LOG, { entries: [] });
  const ytLog = readJson(LOG_FILE, { entries: [] });
  const byTopic = new Map(fbLog.entries.map(e => [e.topicId, e]));

  // الموضوعات التي لها Short ولا توجد لها نسخة أفقية (kind: video)
  const topics = [...new Set(ytLog.entries.map(e => e.topicId))]
    .filter(t => {
      const ys = ytLog.entries.filter(e => e.topicId === t);
      return ys.some(e => (e.kind || 'short') === 'short') && !ys.some(e => e.kind === 'video');
    })
    .filter(t => !onlyTopic || t === onlyTopic);

  console.log(`🎯 الريلز المرشحة للتحويل إلى فيديو أفقي: ${topics.length}`);
  console.log(dryRun ? '🧪 DRY-RUN — لن يُحمّل أو يُرفع شيء.\n' : '');

  let ok = 0;
  for (const topicId of topics.slice(0, limit)) {
    console.log(`\n═══ ${topicId} ═══`);
    try {      const fb = byTopic.get(topicId);
      if (!fb || !fb.videoId) {
        console.log(`⏭️  لا يوجد سجل فيسبوك (videoId) — تخطي`);
        continue;
      }
      const dest = path.join(BACKFILL_DIR, `${topicId}.mp4`);
      const wide = path.join(BACKFILL_DIR, `${topicId}-wide.mp4`);
      const title = fb.title || topicId;
      const wideTitle = `${truncateTitle(title, 80)} — فيديو أفقي`;

      // 1) المصدر: ملف محلي إن وجد، وإلا تحميل من فيسبوك
      let src = findLocalFile(topicId);
      if (src) {
        console.log(`✓ ملف محلي موجود: ${path.relative(ROOT, src)}`);
      } else {
        if (dryRun) { console.log(`(سيُحمَّل من فيسبوك: ${fb.videoId})`); }
        else {
          console.log(`⬇️  تحميل من فيسبوك (${fb.videoId})...`);
          src = await downloadVideo(fb.videoId, dest);
          console.log(`✓ تم التحميل (${(fs.statSync(src).size / 1048576).toFixed(1)} MB)`);
        }
      }

      // 2) التحويل إلى أفقي 16:9
      if (!dryRun) {
        if (!fs.existsSync(wide)) toHorizontal16x9(src, wide);
        console.log('✓ النسخة الأفقية جاهزة');
      }

      // 3) الرفع
      const yt = await uploadToYouTube({
        videoPath: dryRun ? (src || dest) : wide,
        title: wideTitle,
        description: buildDescription(title, fb.hashtags) + '\n\nنسخة أفقية من الريلز للعرض على الشاشات.',
        tags: fb.hashtags || [],
        privacyStatus: 'public',
        categoryId: CATEGORY_EDUCATION,
        dryRun,
      });
      if (!dryRun) {
        logPublished({
          topicId,
          title: wideTitle,
          videoPath: wide,
          source: src ? 'backfill-local' : 'backfill-fb',
          videoId: yt.videoId,
          url: yt.url,
          kind: 'video',
          fbPermalink: fb.permalink,
        });
      }
      ok++;
    } catch (e) {
      console.error(`❌ فشل ${topicId}: ${e.message}`);
      if (process.env.DEBUG) console.error(e.stack);
      if (/quota|dailyLimit|quotaExceeded|403/i.test(e.message)) {
        console.error('⛔ استُنفدت حصة YouTube اليومية — أكمل الباقي لاحقاً (يُعاد تشغيل نفس السكربت، التكرار آمن).');
        break;
      }
    }
  }
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✓ تم بنجاح: ${ok}/${topics.length}`);
}

main().catch(e => {
  console.error('❌ خطأ غير متوقع:', e.message);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
