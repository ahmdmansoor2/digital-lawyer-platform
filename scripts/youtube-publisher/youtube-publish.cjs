#!/usr/bin/env node
/**
 * youtube-publish.cjs — النشر اليومي على قناة YouTube
 *
 * يرفع الفيديوهات التي يولّدها النظام على YouTube عبر YouTube Data API v3
 * (رفع Resumable — يعمل مع OAuth2 refresh token فقط، لا يكفي API key).
 *
 * وضعا التشغيل:
 *   --from-fb-log        يرفع آخر فيديو ريلز سجّله reel-publisher (نفس الـ workflow — الموصى به)
 *   --from-tiktok-log    يرفع آخر فيديو سجّله tiktok-publish.cjs
 *   (بدون فلاج)          يولّد فيديو جديد بنفس خط إنتاج TikTok ثم يرفعه
 *
 * الاستخدام:
 *   node youtube-publish.cjs --from-fb-log             # رفع آخر فيديو فيسبوك (ريلز)
 *   node youtube-publish.cjs --from-tiktok-log         # رفع آخر فيديو TikTok
 *   node youtube-publish.cjs                           # توليد فيديو جديد + رفع
 *   node youtube-publish.cjs --topic demo-001          # موضوع محدد
 *   node youtube-publish.cjs --count 2                 # عدد المواضيع
 *   node youtube-publish.cjs --latest-article          # من آخر مقال مدونة
 *   node youtube-publish.cjs --privacy unlisted        # عدم إدراج عام
 *   node youtube-publish.cjs --dry-run                 # بدون رفع حقيقي
 *   node youtube-publish.cjs --from-fb-log --dry-run
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const { getValidAccessToken } = require('./youtube-oauth.cjs');
const {
  planScenes, renderScenes,
} = require('../tiktok-publisher/scene-generator.cjs');
const { synthesize } = require('../tiktok-publisher/tts-generator.cjs');
const { composeVideo } = require('../tiktok-publisher/video-composer.cjs');
const {
  syncTopicsFromSources, topicFromArticle, pickTopics, pickLatestArticle,
} = require('../tiktok-publisher/tiktok-publish.cjs');

const OUTPUT_DIR = path.join(__dirname, 'output');
const LOG_FILE = path.join(__dirname, 'youtube-published-log.json');
const TIKTOK_LOG = path.join(ROOT, 'scripts', 'tiktok-publisher', 'tiktok-published-log.json');
const FB_LOG = path.join(ROOT, 'scripts', 'facebook-publisher', 'facebook-published-log.json');
const FB_OUTPUT_DIR = path.join(ROOT, 'scripts', 'facebook-publisher', 'output');
const CHANNEL_URL = process.env.YT_CHANNEL_URL || 'https://www.youtube.com/channel/UClYcsQJiwn0TkpmeVCQy-VA';
const CATEGORY_EDUCATION = '27'; // Education

// ─── أدوات JSON ──────────────────────────────────────────────────────────────
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ─── CLI args ────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = {
    fromTiktokLog: false, fromFbLog: false, count: 1, topic: null, article: null, latestArticle: false,
    privacy: 'public', tags: [], dryRun: false, skipVideo: false, categoryId: CATEGORY_EDUCATION,
  };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--from-tiktok-log') args.fromTiktokLog = true;
    else if (a === '--from-fb-log') args.fromFbLog = true;
    else if (a === '--count') args.count = parseInt(process.argv[++i], 10);
    else if (a === '--topic') args.topic = process.argv[++i];
    else if (a === '--article') args.article = process.argv[++i];
    else if (a === '--latest-article') args.latestArticle = true;
    else if (a === '--privacy') args.privacy = process.argv[++i];
    else if (a === '--tags') args.tags = process.argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--category') args.categoryId = process.argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--skip-video') args.skipVideo = true;
  }
  return args;
}

function truncateTitle(title, max = 95) {
  return title.length > max ? title.substring(0, max).trim() : title;
}

function buildDescription(text, hashtags) {
  const tags = (hashtags || []).map(h => '#' + h.replace(/^#/, '')).join(' ');
  const body = (text || '').substring(0, 300).trim();
  return [
    body,
    '',
    '⚖️ منصة المحامي الرقمية — محتوى قانوني مبسّط للمواطن المصري',
    'للمزيد من المقالات القانونية: ' + CHANNEL_URL,
    '',
    tags,
  ].join('\n').trim();
}

// ─── رفع فيديو على YouTube (Resumable) ──────────────────────────────────────
async function uploadToYouTube({ videoPath, title, description, tags, privacyStatus, categoryId, dryRun }) {
  if (dryRun) {
    console.log('[youtube] DRY-RUN: لن يُرفع على YouTube');
    console.log(`          العنوان: ${title}`);
    console.log(`          الفيديو: ${videoPath}`);
    console.log(`          الخصوصية: ${privacyStatus}`);
    return { dryRun: true };
  }

  console.log('[youtube] جاري الرفع على YouTube...');
  const accessToken = await getValidAccessToken();
  const videoBuffer = fs.readFileSync(videoPath);
  if (videoBuffer.length > 128 * 1024 * 1024) {
    throw new Error('الفيديو أكبر من 128 MB — الحد الأقصى العملي للرفع أحادي الدفعة.');
  }

  // 1) init — نطلب location للرفع
  const initResp = await fetch(
    'https://youtube.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.length),
      },
      body: JSON.stringify({
        snippet: {
          title: truncateTitle(title),
          description,
          tags: tags.length ? tags : undefined,
          categoryId,
        },
        status: {
          privacyStatus,
          madeForKids: false,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );
  if (initResp.status !== 200) {
    const body = await initResp.text();
    throw new Error(`YouTube init فشل (${initResp.status}): ${body}`);
  }
  const uploadUrl = initResp.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube لم يُرجع Location header للرفع.');

  // 2) رفع الملف
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(videoBuffer.length) },
    body: videoBuffer,
  });
  if (uploadResp.status !== 200 && uploadResp.status !== 201) {
    const body = await uploadResp.text();
    throw new Error(`YouTube upload فشل (${uploadResp.status}): ${body}`);
  }
  const data = await uploadResp.json();
  if (!data.id) throw new Error('YouTube لم يُرجع video id.');
  console.log(`[youtube] ✓ تم الرفع — video id: ${data.id} → https://www.youtube.com/watch?v=${data.id}`);
  return { videoId: data.id, url: `https://www.youtube.com/watch?v=${data.id}` };
}

// ─── سجل النشر ───────────────────────────────────────────────────────────────
function logPublished(entry) {
  const log = readJson(LOG_FILE, { entries: [] });
  log.entries.push({ ...entry, publishedAt: new Date().toISOString() });
  writeJson(LOG_FILE, log);
}

function alreadyPublished(topicId) {
  const log = readJson(LOG_FILE, { entries: [] });
  return log.entries.some(e => e.topicId === topicId);
}

// ─── رفع آخر فيديو سجّله TikTok (نفس الـ run) ───────────────────────────────
async function publishLatestTiktokVideo(opts) {
  const log = readJson(TIKTOK_LOG, { entries: [] });
  const candidates = [...(log.entries || [])].reverse().filter(e => {
    if (!e.videoPath) return false;
    const p = path.isAbsolute(e.videoPath) ? e.videoPath : path.join(ROOT, e.videoPath);
    return fs.existsSync(p);
  });
  if (!candidates.length) {
    console.log('[youtube] ⚠️ لا يوجد فيديو مسجل في tiktok-published-log.json مع ملف موجود.');
    return 0;
  }
  const entry = candidates[0];
  const videoPath = path.isAbsolute(entry.videoPath) ? entry.videoPath : path.join(ROOT, entry.videoPath);

  if (alreadyPublished(entry.topicId)) {
    console.log(`[youtube] ⏭️  ${entry.topicId} منشور مسبقاً على YouTube — تخطي.`);
    return 0;
  }

  console.log(`\n[youtube] ═══ رفع آخر فيديو TikTok: ${entry.title} ═══`);
  const yt = await uploadToYouTube({
    videoPath,
    title: entry.title,
    description: buildDescription(entry.title, entry.hashtags),
    tags: entry.hashtags || [],
    privacyStatus: opts.privacy,
    categoryId: opts.categoryId,
    dryRun: opts.dryRun,
  });
  if (!opts.dryRun) {
    logPublished({
      topicId: entry.topicId,
      title: entry.title,
      videoPath,
      source: entry.source || 'tiktok-log',
      videoId: yt.videoId,
      url: yt.url,
    });
  }
  return 1;
}

// ─── رفع آخر فيديو ريلز سجّله Facebook (نفس الـ run) ────────────────────────
async function publishLatestFbVideo(opts) {
  const log = readJson(FB_LOG, { entries: [] });
  const candidates = [...(log.entries || [])].reverse().filter(e => {
    if (!e.topicId) return false;
    const local = e.videoPath && fs.existsSync(e.videoPath) ? e.videoPath : null;
    const ci = path.join(FB_OUTPUT_DIR, `fb-${e.topicId}.mp4`);
    return local ? true : fs.existsSync(ci);
  });
  if (!candidates.length) {
    console.log('[youtube] ⚠️ لا يوجد فيديو ريلز مسجل في facebook-published-log.json مع ملف موجود.');
    return 0;
  }
  const entry = candidates[0];
  const videoPath = (entry.videoPath && fs.existsSync(entry.videoPath))
    ? entry.videoPath
    : path.join(FB_OUTPUT_DIR, `fb-${entry.topicId}.mp4`);

  if (alreadyPublished(entry.topicId)) {
    console.log(`[youtube] ⏭️  ${entry.topicId} منشور مسبقاً على YouTube — تخطي.`);
    return 0;
  }

  console.log(`\n[youtube] ═══ رفع آخر فيديو ريلز: ${entry.title} ═══`);
  const yt = await uploadToYouTube({
    videoPath,
    title: entry.title,
    description: buildDescription(entry.title, entry.hashtags),
    tags: entry.hashtags || [],
    privacyStatus: opts.privacy,
    categoryId: opts.categoryId,
    dryRun: opts.dryRun,
  });
  if (!opts.dryRun) {
    logPublished({
      topicId: entry.topicId,
      title: entry.title,
      videoPath,
      source: entry.source || 'fb-log',
      videoId: yt.videoId,
      url: yt.url,
      fbPermalink: entry.permalink,
    });
  }
  return 1;
}

// ─── توليد فيديو جديد + رفعه (نفس خط إنتاج TikTok) ─────────────────────────
async function processTopic(topic, opts) {
  const tag = `[${topic.id}]`;
  console.log(`\n${tag} ═══ بدء معالجة: ${topic.title} ═══`);

  console.log(`${tag} [1/5] توليد سكريبت...`);
  const plan = await planScenes(topic, { fullText: topic.full_text });
  if (!plan.scenes?.length) throw new Error('السكريبت فارغ');

  console.log(`${tag} [2/5] توليد الصوت...`);
  const tts = await synthesize(plan.full_text, {
    filename: `tts-${topic.id}`,
    outputDir: path.join(OUTPUT_DIR, 'audio'),
  });

  console.log(`${tag} [3/5] توليد صور المشاهد...`);
  const scenes = await renderScenes(plan, {
    outputDir: path.join(OUTPUT_DIR, 'images', topic.id),
  });

  if (opts.skipVideo) {
    console.log(`${tag} ⏭️  تخطي تركيب الفيديو (--skip-video)`);
    return { topic, plan, audio: tts, scenes, video: null };
  }

  console.log(`${tag} [4/5] تركيب الفيديو...`);
  const video = await composeVideo({
    scenes,
    audioPath: tts.audioPath,
    outputPath: path.join(OUTPUT_DIR, 'videos', `${topic.id}.mp4`),
    title: plan.hook,
    branding: 'منصة المحامي الرقمية ⚖️',
    subtitles: tts.subtitles || [],
  });

  console.log(`${tag} [5/5] الرفع على YouTube...`);
  const yt = await uploadToYouTube({
    videoPath: video.outputPath,
    title: plan.hook,
    description: buildDescription(plan.full_text, plan.hashtags),
    tags: plan.hashtags || [],
    privacyStatus: opts.privacy,
    categoryId: opts.categoryId,
    dryRun: opts.dryRun,
  });

  return { topic, plan, audio: tts, scenes, video, youtube: yt };
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  if (args.dryRun) console.log('🧪 DRY-RUN MODE — لن يُرفع أي شيء حقيقي\n');

  // وضع CI الموصى به: رفع الفيديو الذي أنتجه الريلز في نفس الـ workflow
  if (args.fromFbLog) {
    await publishLatestFbVideo(args);
    return;
  }
  if (args.fromTiktokLog) {
    await publishLatestTiktokVideo(args);
    return;
  }

  let topics;
  if (args.latestArticle) {
    const slug = pickLatestArticle();
    console.log(`[main] آخر مقال في المدونة: ${slug}`);
    topics = [topicFromArticle(slug)];
  } else if (args.article) {
    topics = [topicFromArticle(args.article)];
  } else if (args.topic) {
    topics = pickTopics(args.count, args.topic);
  } else {
    console.log('[main] 🔀 وضع المزامنة: ترندات جوجل + مقالات المدونة');
    topics = syncTopicsFromSources(args.count);
  }

  if (!topics.length) {
    console.log('[main] ⚠️ لا توجد مواضيع جديدة متاحة.');
    return;
  }

  let success = 0;
  for (const topic of topics) {
    if (alreadyPublished(topic.id)) {
      console.log(`[main] ⏭️  ${topic.id} منشور مسبقاً على YouTube — تخطي.`);
      continue;
    }
    try {
      const result = await processTopic(topic, args);
      if (!args.dryRun) {
        logPublished({
          topicId: topic.id,
          title: topic.title,
          videoPath: result.video?.outputPath || null,
          source: topic.source || (topic.source_article ? 'blog' : 'topics.json'),
          videoId: result.youtube?.videoId,
          url: result.youtube?.url,
        });
      }
      success++;
    } catch (e) {
      console.error(`❌ [${topic.id}] فشل: ${e.message}`);
      if (process.env.DEBUG) console.error(e.stack);
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✓ تم بنجاح: ${success}/${topics.length}`);
}

if (require.main === module) {
  main().catch(e => {
    console.error('❌ خطأ غير متوقع:', e.message);
    if (process.env.DEBUG) console.error(e.stack);
    process.exit(1);
  });
}

module.exports = { uploadToYouTube, buildDescription, alreadyPublished };
