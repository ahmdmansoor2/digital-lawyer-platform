#!/usr/bin/env node
/**
 * reels-publish.cjs — توليد Reels من مقالات المدونة + نشرها على Facebook
 *
 * يعيد استخدام video pipeline من tiktok-publisher:
 *   - scene-generator (Gemini للسكريبت + صور)
 *   - tts-generator (Edge TTS للصوت العربي)
 *   - video-composer (ffmpeg لتركيب MP4)
 *
 * يختلف فقط في الـ OAuth والـ API call (Facebook بدل TikTok).
 *
 * الاستخدام:
 *   node reels-publish.cjs                           # آخر مقال في المدونة
 *   node reels-publish.cjs --article <slug>          # مقال محدد
 *   node reels-publish.cjs --topic <id>              # من topics.json
 *   node reels-publish.cjs --dry-run                 # بدون نشر
 *   node reels-publish.cjs --skip-video              # بدون تركيب فيديو
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TIKTOK_DIR = path.join(ROOT, 'scripts', 'tiktok-publisher');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const BLOG_LOG = path.join(ROOT, 'scripts', 'blog-publisher', 'published-log.json');
const TOPICS_FILE = path.join(__dirname, '..', 'tiktok-publisher', 'topics.json');
const LOG_FILE = path.join(__dirname, 'facebook-reels-log.json');
const OUTPUT_DIR = path.join(__dirname, 'output');

// استيراد الموديولات المشتركة
const { planScenes, renderScenes } = require(path.join(TIKTOK_DIR, 'scene-generator.cjs'));
const { synthesize } = require(path.join(TIKTOK_DIR, 'tts-generator.cjs'));
const { composeVideo } = require(path.join(TIKTOK_DIR, 'video-composer.cjs'));
const { getPageAccessToken } = require('./facebook-oauth.cjs');

// ─── أدوات ───────────────────────────────────────────────────────────────
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function parseArgs() {
  const args = { count: 1, topic: null, article: null, latestArticle: false, dryRun: false, skipVideo: false };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--count') args.count = parseInt(process.argv[++i], 10);
    else if (a === '--topic') args.topic = process.argv[++i];
    else if (a === '--article') args.article = process.argv[++i];
    else if (a === '--latest-article') args.latestArticle = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--skip-video') args.skipVideo = true;
  }
  return args;
}

// ─── قراءة مقال مدونة ───────────────────────────────────────────────────
function readBlogArticle(slug) {
  const htmlPath = path.join(BLOG_DIR, `${slug}.html`);
  if (!fs.existsSync(htmlPath)) throw new Error(`المقال مش موجود: ${htmlPath}`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s*\|\s*.*$/, '') : slug;
  let articleHtml = html;
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) articleHtml = articleMatch[0];
  else {
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
    if (mainMatch) articleHtml = mainMatch[0];
  }
  articleHtml = articleHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' ');
  const text = articleHtml
    .replace(/<\/h[1-3]>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n• ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const excerpt = text.length > 3000 ? text.substring(0, 3000) : text;
  return { slug, title, content: excerpt, fullText: text };
}
function pickLatestArticle() {
  const log = readJson(BLOG_LOG, { published: [] });
  if (!log.published?.length) throw new Error('مفيش مقالات في السجل');
  return log.published[0].slug;
}
function topicFromArticle(slug) {
  const article = readBlogArticle(slug);
  const cats = ['قانون عمالي', 'قانون مدني', 'قانون إداري', 'قانون جنائي'];
  const cat = cats.find(c => article.fullText.includes(c)) || 'قانون';
  return {
    id: `reel-${slug}`,
    title: article.title,
    category: cat,
    keywords: article.fullText.split(/[\s،؛,.!?]+/).filter(w => w.length > 4 && w.length < 20).slice(0, 5),
    angle: `ملخص لـ: ${article.title}`,
    source_article: slug,
    full_text: article.content,
  };
}
function pickTopics(count, specificId) {
  const { topics } = readJson(TOPICS_FILE, { topics: [] });
  const log = readJson(LOG_FILE, { entries: [] });
  const published = new Set(log.entries.map(e => e.topicId));
  if (specificId) {
    const t = topics.find(x => x.id === specificId);
    if (!t) throw new Error(`الموضوع مش موجود: ${specificId}`);
    return [t];
  }
  return topics.filter(t => !published.has(t.id)).slice(0, count);
}
function logPublished(entry) {
  const log = readJson(LOG_FILE, { entries: [] });
  log.entries.push({ ...entry, publishedAt: new Date().toISOString(), source: entry.source || 'topics.json' });
  writeJson(LOG_FILE, log);
}

// ─── النشر على Facebook Reels (Graph API) ────────────────────────────────
async function publishToFacebook({ videoPath, title, hashtags, dryRun }) {
  if (dryRun) {
    console.log(`[fb] DRY-RUN: لن يُنشر`);
    console.log(`     العنوان: ${title}`);
    console.log(`     الهاشتاجات: ${hashtags.join(' ')}`);
    console.log(`     الفيديو: ${videoPath}`);
    return { dryRun: true };
  }

  console.log('[fb] جاري النشر على Facebook Reels...');
  const { pageId, pageName, accessToken } = getPageAccessToken();
  console.log(`[fb] الصفحة: ${pageName} (ID: ${pageId})`);

  const videoStat = fs.statSync(videoPath);
  if (videoStat.size > 1024 * 1024 * 1024) {
    throw new Error('الفيديو أكبر من 1 GB — الحد الأقصى لـ Facebook.');
  }

  const description = `${title}\n\n${hashtags.map(h => '#' + h).join(' ')}\n\n⚖️ منصة المحامي الرقمية`;

  // Graph API endpoint للفيديو على Page
  // نستخدم graph-video.facebook.com للنشر (أسرع للملفات الكبيرة)
  const url = `https://graph-video.facebook.com/v21.0/${pageId}/videos`;
  const FormData = (await import('form-data')).default;

  const form = new FormData();
  form.append('access_token', accessToken);
  form.append('description', description);
  form.append('published', 'true');
  // 'content_category' = 'BEAUTY_FASHION' / 'NEWS' / etc. — اختياري
  form.append('content_category', 'NEWS');
  form.append('file', fs.createReadStream(videoPath), { knownLength: videoStat.size });

  const resp = await fetch(url, { method: 'POST', body: form });
  const data = await resp.json();
  if (data.error) {
    throw new Error(`Facebook API فشل: ${data.error.message} (code ${data.error.code})`);
  }
  console.log(`[fb] ✓ تم النشر — video_id: ${data.id}`);
  return { videoId: data.id, pageId, pageName };
}

// ─── المعالجة الكاملة ───────────────────────────────────────────────────
async function processTopic(topic, opts) {
  const tag = `[${topic.id}]`;
  console.log(`\n${tag} ═══ بدء معالجة Reel: ${topic.title} ═══`);

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
    console.log(`${tag} ⏭️  تخطي تركيب الفيديو`);
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

  console.log(`${tag} [5/5] النشر على Facebook...`);
  const fb = await publishToFacebook({
    videoPath: video.outputPath,
    title: plan.hook,
    hashtags: plan.hashtags || [],
    dryRun: opts.dryRun,
  });

  return { topic, plan, audio: tts, scenes, video, fb };
}

// ─── main ───────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  if (args.dryRun) console.log('🧪 DRY-RUN MODE — لن يُنشر على Facebook\n');

  let topics;
  if (args.latestArticle) {
    const slug = pickLatestArticle();
    console.log(`[main] آخر مقال: ${slug}`);
    topics = [topicFromArticle(slug)];
  } else if (args.article) {
    topics = [topicFromArticle(args.article)];
  } else {
    topics = pickTopics(args.count, args.topic);
  }

  if (!topics.length) {
    console.log('[main] ⚠️  مفيش مواضيع متاحة.');
    return;
  }

  let success = 0;
  for (const topic of topics) {
    try {
      const result = await processTopic(topic, args);
      logPublished({
        topicId: topic.id,
        title: topic.title,
        hashtags: result.plan.hashtags,
        videoPath: result.video?.outputPath || null,
        fb: result.fb,
        source: topic.source_article ? 'blog' : 'topics.json',
      });
      success++;
    } catch (e) {
      console.error(`❌ [${topic.id}] فشل: ${e.message}`);
      if (process.env.DEBUG) console.error(e.stack);
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✓ تم بنجاح: ${success}/${topics.length}`);
}

main().catch(e => {
  console.error('❌ خطأ غير متوقع:', e.message);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
