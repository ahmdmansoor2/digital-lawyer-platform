#!/usr/bin/env node
/**
 * tiktok-publish.cjs — السكربت الرئيسي للنشر على TikTok
 *
 * التدفّق الكامل:
 *   1) اختيار موضوع من topics.json أو مقال من المدونة
 *   2) توليد سكريبت + مشاهد (Gemini)
 *   3) توليد صوت عربي (Edge TTS) + word timings
 *   4) توليد/جلب صور المشاهد (Pexels → Gemini → SVG fallback)
 *   5) تركيب الفيديو (ffmpeg + captions + transitions + music)
 *   6) النشر على TikTok (Content Posting API)
 *
 * الاستخدام:
 *   node tiktok-publish.cjs                         # ينشر من ترندات جوجل + مقالات المدونة (الوضع الافتراضي)
 *   node tiktok-publish.cjs --count 3               # ينشر 3 مواضيع
 *   node tiktok-publish.cjs --topic demo-001        # موضوع محدد من topics.json
 *   node tiktok-publish.cjs --article <slug>        # من مقال مدونة منشور
 *   node tiktok-publish.cjs --latest-article        # آخر مقال في المدونة
 *   node tiktok-publish.cjs --sync                  # مواضيع مركّبة (ترندات + مدونة + manual)
 *   node tiktok-publish.cjs --dry-run               # بدون نشر حقيقي
 *   node tiktok-publish.cjs --skip-video            # بدون تركيب فيديو
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOPICS_FILE = path.join(__dirname, 'topics.json');
const LOG_FILE = path.join(__dirname, 'tiktok-published-log.json');
const OUTPUT_DIR = path.join(__dirname, 'output');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const BLOG_LOG = path.join(ROOT, 'scripts', 'blog-publisher', 'published-log.json');
// مواضيع ترندات جوجل التي يولّدها smart-publisher.cjs يومياً (Trending RSS geo=EG)
const TRENDING_FILE = path.join(ROOT, 'scripts', 'trending-topics.json');

const { planScenes, renderScenes } = require('./scene-generator.cjs');
const { synthesize } = require('./tts-generator.cjs');
const { composeVideo } = require('./video-composer.cjs');
const { getValidAccessToken } = require('./oauth-handler.cjs');

// ─── أدوات JSON ──────────────────────────────────────────────────────────────
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ─── CLI args ───────────────────────────────────────────────────────────────
function parseArgs() {
  const args = {
    count: 1, topic: null, article: null, latestArticle: false,
    sync: false, dryRun: false, skipVideo: false,
  };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--count') args.count = parseInt(process.argv[++i], 10);
    else if (a === '--topic') args.topic = process.argv[++i];
    else if (a === '--article') args.article = process.argv[++i];
    else if (a === '--latest-article') args.latestArticle = true;
    else if (a === '--sync') args.sync = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--skip-video') args.skipVideo = true;
  }
  return args;
}

// ─── قراءة مقال من المدونة ─────────────────────────────────────────────────
function readBlogArticle(slug) {
  const htmlPath = path.join(BLOG_DIR, `${slug}.html`);
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`المقال مش موجود: ${htmlPath}`);
  }
  const html = fs.readFileSync(htmlPath, 'utf8');

  // استخراج العنوان من <title> أو <h1>
  const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s*\|\s*.*$/, '') : slug;

  // استخراج المقال (article أو main)
  let articleHtml = html;
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) articleHtml = articleMatch[0];
  else {
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
    if (mainMatch) articleHtml = mainMatch[0];
  }

  // نظّف HTML — شيل السكربتات والستايل
  articleHtml = articleHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' ');

  // حوّل HTML لـ text
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

  // اختصر لأول ~3000 حرف (كفاية للسكريبت)
  const excerpt = text.length > 3000 ? text.substring(0, 3000) : text;

  return { slug, title, content: excerpt, fullText: text };
}

function pickLatestArticle() {
  if (!fs.existsSync(BLOG_LOG)) {
    throw new Error('مفيش سجل مدونة. شغّل daily-publish.cjs الأول.');
  }
  const log = readJson(BLOG_LOG, { published: [] });
  if (!log.published?.length) throw new Error('مفيش مقالات منشورة في السجل.');
  // الأحدث أولاً (المفروض السجل مرتب)
  const latest = log.published[0];
  return latest.slug;
}

// ─── اختيار المواضيع ───────────────────────────────────────────────────────
function pickTopics(count, specificId) {
  const { topics } = readJson(TOPICS_FILE, { topics: [] });
  const log = readJson(LOG_FILE, { entries: [] });
  const published = new Set(log.entries.map(e => e.topicId));

  if (specificId) {
    const t = topics.find(x => x.id === specificId);
    if (!t) throw new Error(`الموضوع مش موجود: ${specificId}`);
    return [t];
  }

  const available = topics.filter(t => !published.has(t.id));
  if (!available.length) {
    console.log('[main] ⚠️  كل المواضيع اتنشرت. أضف مواضيع جديدة في topics.json.');
    return [];
  }
  return available.slice(0, count);
}

// ─── مواضيع مركّبة من مصادر النشر الأخرى ─────────────────────────────────
// القرار (من المستخدم): مواضيع TikTok = ترندات جوجل (من smart-publisher)
// + مقالات المدونة المنشورة + مواضيع topics.json اليدوية، مع تجاهل ما اتنشر.
function syncTopicsFromSources(count) {
  const log = readJson(LOG_FILE, { entries: [] });
  const done = new Set(log.entries.map(e => e.topicId));
  const candidates = [];

  // A) ترندات جوجل — من trending-topics.json (يُكتب يومياً بواسطة smart-publisher)
  const trends = readJson(TRENDING_FILE, { topics: [] });
  const trendTopics = (trends.topics || []);
  if (trendTopics.length) console.log(`[main] 📈 ترندات جوجل متاحة: ${trendTopics.length} (${trends.date || '?'})`);
  for (const t of trendTopics) {
    const id = `trend-${t.slug || ''}`;
    if (done.has(id)) continue;
    candidates.push({
      id,
      title: t.title || t.slug,
      category: t.tag || 'قانون',
      keywords: Array.isArray(t.keywords) ? t.keywords : String(t.keywords || '').split(',').map(s => s.trim()).filter(Boolean),
      angle: `موضوع رائج اليوم في مصر: ${t.title || t.slug}`,
      source: 'trending-topics.json',
      source_article: null,
    });
  }

  // B) مقالات المدونة (الأحدث أولاً) — لم تُحوَّل بعد لفيديو
  const blogLog = readJson(BLOG_LOG, { published: [] });
  const blogArticles = [...(blogLog.published || [])].reverse();
  for (const art of blogArticles) {
    const id = `blog-${art.slug}`;
    if (done.has(id)) continue;
    const htmlPath = path.join(BLOG_DIR, `${art.slug}.html`);
    if (!fs.existsSync(htmlPath)) continue;
    try {
      candidates.push(topicFromArticle(art.slug));
    } catch {
      /* تجاهل المقالات التالفة */
    }
  }

  // C) مواضيع topics.json اليدوية (دائماً في الذيل — مصدر احتياطي)
  const { topics } = readJson(TOPICS_FILE, { topics: [] });
  for (const t of topics) {
    if (done.has(t.id)) continue;
    candidates.push(t);
  }

  // D) تداخل Round-robin: ترند ثم مدونة ثم ترند... للحصول على مزيج متنوّع
  const trendList = candidates.filter(c => c.source === 'trending-topics.json');
  const blogList = candidates.filter(c => c.source === 'blog');
  const restList = candidates.filter(c => c.source !== 'trending-topics.json' && c.source !== 'blog');
  const mixed = [];
  const maxLen = Math.max(trendList.length, blogList.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < trendList.length) mixed.push(trendList[i]);
    if (i < blogList.length) mixed.push(blogList[i]);
  }
  return mixed.concat(restList).slice(0, count);
}

function logPublished(entry) {
  const log = readJson(LOG_FILE, { entries: [] });
  log.entries.push({ ...entry, publishedAt: new Date().toISOString(), source: entry.source || 'topics.json' });
  writeJson(LOG_FILE, log);
}

// ─── النشر على TikTok (Content Posting API) ───────────────────────────────
async function publishToTikTok({ videoPath, title, hashtags, dryRun }) {
  if (dryRun) {
    console.log(`[tiktok] DRY-RUN: لن يُنشر`);
    console.log(`         العنوان: ${title}`);
    console.log(`         الهاشتاجات: ${hashtags.join(' ')}`);
    console.log(`         الفيديو: ${videoPath}`);
    return { dryRun: true };
  }

  console.log('[tiktok] جاري النشر...');
  const accessToken = await getValidAccessToken();
  const videoStat = fs.statSync(videoPath);

  if (videoStat.size > 287 * 1024 * 1024) {
    throw new Error('الفيديو أكبر من 287 MB — الحد الأقصى لـ TikTok.');
  }

  const initResp = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: `${title}\n\n${hashtags.map(h => '#' + h).join(' ')}`,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoStat.size,
        chunk_size: videoStat.size,
        total_chunk_count: 1,
      },
    }),
  });
  const initData = await initResp.json();
  if (initData.error?.code) {
    throw new Error(`TikTok init فشل: ${initData.error.code} — ${initData.error.message}`);
  }

  const { upload_url, publish_id } = initData.data;
  const videoBuffer = fs.readFileSync(videoPath);
  const uploadResp = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(videoBuffer.length) },
    body: videoBuffer,
  });
  if (!uploadResp.ok) {
    throw new Error(`Upload فشل: ${uploadResp.status} ${uploadResp.statusText}`);
  }

  console.log(`[tiktok] ✓ تم الرفع — publish_id: ${publish_id}`);
  return { publishId: publish_id, status: 'processing' };
}

// ─── بناء Topic من مقال مدونة ─────────────────────────────────────────────
function topicFromArticle(slug) {
  const article = readBlogArticle(slug);
  return {
    id: `blog-${slug}`,
    title: article.title,
    category: extractCategory(article.fullText),
    keywords: extractKeywords(article.fullText),
    angle: `ملخص لـ: ${article.title}`,
    source: 'blog',
    source_article: slug,
    full_text: article.content,
  };
}

function extractCategory(text) {
  const cats = ['قانون عمالي', 'قانون مدني', 'قانون إداري', 'قانون جنائي', 'قانون تجاري', 'قانون الأسرة'];
  for (const c of cats) if (text.includes(c)) return c;
  return 'قانون';
}

function extractKeywords(text) {
  // بسيط: أول 5 كلمات مميزة
  const words = text.split(/[\s،؛,.!?]+/).filter(w => w.length > 4 && w.length < 20);
  return [...new Set(words)].slice(0, 5);
}

// ─── المعالجة الكاملة لموضوع واحد ────────────────────────────────────────
async function processTopic(topic, opts) {
  const tag = `[${topic.id}]`;
  console.log(`\n${tag} ═══ بدء معالجة: ${topic.title} ═══`);

  // 1) سكريبت + خطة المشاهد
  console.log(`${tag} [1/5] توليد سكريبت...`);
  const plan = await planScenes(topic, { fullText: topic.full_text });
  if (!plan.scenes?.length) throw new Error('السكريبت فارغ');

  // 2) الصوت
  console.log(`${tag} [2/5] توليد الصوت...`);
  const tts = await synthesize(plan.full_text, {
    filename: `tts-${topic.id}`,
    outputDir: path.join(OUTPUT_DIR, 'audio'),
  });

  // 3) صور المشاهد (Pexels → Imagen → SVG)
  console.log(`${tag} [3/5] توليد صور المشاهد...`);
  const scenes = await renderScenes(plan, {
    outputDir: path.join(OUTPUT_DIR, 'images', topic.id),
  });

  if (opts.skipVideo) {
    console.log(`${tag} ⏭️  تخطي تركيب الفيديو (--skip-video)`);
    return { topic, plan, audio: tts, scenes, video: null };
  }

  // 4) تركيب الفيديو (مع captions + transitions)
  console.log(`${tag} [4/5] تركيب الفيديو...`);
  const video = await composeVideo({
    scenes,
    audioPath: tts.audioPath,
    outputPath: path.join(OUTPUT_DIR, 'videos', `${topic.id}.mp4`),
    title: plan.hook,
    branding: 'منصة المحامي الرقمية ⚖️',
    subtitles: tts.subtitles || [],
  });

  // 5) النشر
  console.log(`${tag} [5/5] النشر على TikTok...`);
  const tiktok = await publishToTikTok({
    videoPath: video.outputPath,
    title: `${plan.hook}\n\n${plan.full_text.substring(0, 200)}...`,
    hashtags: plan.hashtags || [],
    dryRun: opts.dryRun,
  });

  return { topic, plan, audio: tts, scenes, video, tiktok };
}

// ─── main ──────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  if (args.dryRun) console.log('🧪 DRY-RUN MODE — لن يُنشر أي شيء حقيقي\n');

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
    // الوضع الافتراضي: ترندات جوجل + مقالات المدونة + topics.json
    console.log('[main] 🔀 وضع المزامنة: ترندات جوجل + مقالات المدونة');
    topics = syncTopicsFromSources(args.count);
  }

  if (!topics.length) return;

  let success = 0;
  for (const topic of topics) {
    try {
      const result = await processTopic(topic, args);
      // لا تُسجَّل تجارب الـ dry-run في سجل النشر — وإلا تمنع إعادة نشر الموضوع حقيقياً
      if (!args.dryRun) {
        logPublished({
          topicId: topic.id,
          title: topic.title,
          hashtags: result.plan.hashtags,
          videoPath: result.video?.outputPath || null,
          tiktok: result.tiktok,
          source: topic.source || (topic.source_article ? 'blog' : 'topics.json'),
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

module.exports = { syncTopicsFromSources, topicFromArticle, pickTopics, pickLatestArticle };
