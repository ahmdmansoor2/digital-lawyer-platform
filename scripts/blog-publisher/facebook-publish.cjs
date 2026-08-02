#!/usr/bin/env node
/**
 * facebook-publish.cjs — النشر اليومي التلقائي لمقالات المدونة على صفحة فيسبوك
 * - يقرأ المقالات المنشورة اليوم من سجلّي النشر (القديم + الجديد) ويوحّدهما
 * - ينشر نص كل مقال كاملاً على صفحة الفيسبوك (نفس الموضوعات/نفس الكيفية)
 * - يقسم النص الطويل إلى أجزاء متسلسلة إن تجاوز حد الفيسبوك
 * - يتجنب إعادة نشر مقال نُشر سابقاً عبر facebook-published-log.json
 * - سقف يومي (10) + سقف لكل تشغيل (5) لمنع إغراق الصفحة
 *
 * المصادر (موحّدة):
 *   scripts/published-log.json              (النظام القديم — auto-publisher.cjs)
 *   scripts/blog-publisher/published-log.json (النظام الجديد — daily-publish.cjs)
 *
 * المتطلبات (من .env أو متغيرات البيئة):
 *   FB_PAGE_ID    — معرّف صفحة الفيسبوك
 *   FB_PAGE_TOKEN — Page Access Token طويل العمر (من Graph API)
 *
 * التشغيل:
 *   node scripts/blog-publisher/facebook-publish.cjs            (يُنشر المقالات الجديدة)
 *   node scripts/blog-publisher/facebook-publish.cjs --dry-run  (معاينة فقط)
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const PUBLISHED_LOG = path.join(__dirname, 'published-log.json');
const OLD_PUBLISHED_LOG = path.join(ROOT, 'scripts', 'published-log.json');
const FB_LOG = path.join(__dirname, 'facebook-published-log.json');
const BASE_URL = 'https://justice-91571.web.app';

dotenv.config({ path: path.join(ROOT, '.env') });

const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;

// حد الفيسبوك العملي لمنشور واحد (شخصيات). Graph API يقبل حتى ~63206 حرفاً،
// لكننا نستخدم 15000 لضمان القبول ولتسهيل عرض المنشور على الموبايل.
const FB_MAX_CHARS = 15000;
// القسم التوضيحي المرفق ببداية كل منشور (والذي يُكتب لكل جزء)
const FB_PREAMBLE = '⚖️ منصة المحامي الرقمية — دليل قانوني مصري شامل';

// ── أدوات JSON آمنة ───────────────────────────────────────────────────────
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── استخراج نص المقال من ملف HTML المنشور ─────────────────────────────────
// يقشر وسوم HTML ويستخرج النص الرئيسي (h1..h3 + p + li) مرتباً بالترتيب.
function extractArticleText(slug, title) {
  const file = path.join(BLOG_DIR, `${slug}.html`);
  if (!fs.existsSync(file)) return null;

  let html = fs.readFileSync(file, 'utf8');

  // أزل النصوص المخفية (style/script)
  html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');

  // استخرج منطقة المقال الرئيسية إن وُجدت (article/main) — وإلا كامل الجسم
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) html = articleMatch[0];
  else {
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
    if (mainMatch) html = mainMatch[0];
  }

  // إزالة الأقسام غير المرغوب فيها داخل المقال (التذييل، العودة، الشارات)
  html = html.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  html = html.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  html = html.replace(/<aside[\s\S]*?<\/aside>/gi, ' ');
  html = html.replace(/<div[^>]*class="[^"]*disclaimer[^"]*"[\s\S]*?<\/div>/gi, ' ');
  html = html.replace(/<div[^>]*class="[^"]*back-link[^"]*"[\s\S]*?<\/div>/gi, ' ');

  // أزل الصور والروابط الزائدة (نحتفظ بنص الرابط فقط)
  html = html.replace(/<img[^>]*>/gi, ' ');
  html = html.replace(/<br\s*\/?\s*>/gi, '\n');
  html = html.replace(/<\/p>/gi, '\n\n');
  html = html.replace(/<\/li>/gi, '\n• ');
  html = html.replace(/<\/h1>/gi, '\n\n# ');
  html = html.replace(/<\/h2>/gi, '\n\n## ');
  html = html.replace(/<\/h3>/gi, '\n\n### ');
  html = html.replace(/<\/h4>/gi, '\n\n#### ');

  // أزل أي وسوم متبقية + الكيانات
  html = html.replace(/<[^>]+>/g, ' ');
  html = html.replace(/&nbsp;/gi, ' ');
  html = html.replace(/&amp;/gi, '&');
  html = html.replace(/&lt;/gi, '<');
  html = html.replace(/&gt;/gi, '>');
  html = html.replace(/&quot;/gi, '"');
  html = html.replace(/&#39;/gi, "'");
  html = html.replace(/&hellip;/gi, '…');
  html = html.replace(/&mdash;/gi, '—');
  html = html.replace(/&ldquo;/gi, '“');
  html = html.replace(/&rdquo;/gi, '”');

  // نظّف المسافات المتعددة والأسطر الفارغة المتكررة
  html = html.replace(/[ \t]+/g, ' ');
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.trim();

  // أزل إطار البداية/النهاية المكرر إن وُجد (مثل "منصة المحامي الرقمية")
  if (!html || html.length < 100) return null;

  // أزل العنوان الرئيسي (h1) من بداية النص — العنوان يُضاف منفصلاً في المنشور
  // كأول سطر، فتجنب تكراره. نزيل أيضاً أي سطر يطابق عنوان المقال تماماً.
  const h1Match = html.match(/^#\s+[^\n]+/m);
  if (h1Match) {
    html = html.replace(h1Match[0], '').replace(/^\s+/, '');
  }

  return html;
}

// ── تقسيم النص الطويل إلى أجزاء ──────────────────────────────────────────
function splitIntoParts(text, maxChars = FB_MAX_CHARS) {
  const parts = [];
  let remaining = text.trim();

  while (remaining.length > maxChars) {
    // اقطع عند أقرب حد فقرة/سطر قبل الحد الأقصى
    let cut = maxChars;
    const slice = remaining.slice(0, maxChars);
    const paraIdx = slice.lastIndexOf('\n\n');
    const lineIdx = slice.lastIndexOf('\n');
    const spaceIdx = slice.lastIndexOf(' ');
    if (paraIdx > maxChars * 0.5) cut = paraIdx;
    else if (lineIdx > maxChars * 0.5) cut = lineIdx;
    else if (spaceIdx > maxChars * 0.5) cut = spaceIdx;
    else cut = maxChars;

    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);

  return parts;
}

// ── نشر جزء على الفيسبوك (Graph API v19.0) ───────────────────────────────
async function postToFacebook(message, pageId, token, isPart, partInfo, articleUrl, imageUrl) {
  const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
  const bodyParams = { message, access_token: token };
  // نرفق رابط المقال (وليس picture) — فيسبوك يلتقط صورة og:image تلقائياً من الصفحة.
  if (articleUrl) bodyParams.link = articleUrl;
  const body = new URLSearchParams(bodyParams);

  const resp = await fetch(url, { method: 'POST', body });
  const data = await resp.json().catch(() => ({}));

  if (!resp.ok || data.error) {
    const err = data.error || {};
    throw new Error(`فيسبوك: ${err.message || resp.status} (${err.code || ''})`);
  }
  return data.id;
}

// ── الحصول على معرّف وتوكن الصفحة تلقائياً من الاسم إن لم يُعطَ مباشرة ─────
// يُفضَّل دائماً استخدام توكن الصفحة (من /me/accounts) بدلاً من توكن المستخدم
// عند النشر — بعض الصفحات ترفض النشر بتوكن المستخدم حتى لو كان من Administrator.
async function resolvePage(pageIdOrName, token) {
  if (/^\d+$/.test(String(pageIdOrName))) {
    // معرّف رقمي صريح — نجرّب النشر بتوكن الصفحة أولاً ثم نستعلم عن توكن الصفحة
    const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`;
    const accResp = await fetch(accountsUrl).catch(() => null);
    const accData = accResp ? await accResp.json().catch(() => ({})) : {};
    const found = (accData.data || []).find(p => String(p.id) === String(pageIdOrName));
    return { id: String(pageIdOrName), token: (found && found.access_token) || token };
  }
  const url = `https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`;
  const resp = await fetch(url);
  const data = await resp.json().catch(() => ({}));
  const pages = data.data || [];
  const found = pages.find(p => p.name === pageIdOrName) || pages.find(p => String(p.id) === String(pageIdOrName));
  if (!found) throw new Error('لم يتم العثور على الصفحة. تحقق من FB_PAGE_ID أو الاسم.');
  return { id: found.id, token: found.access_token || token };
}

// ── إيجاد صورة الغلاف لمقال عبر slug ─────────────────────────────────────
// يبحث في public/blog/images عن صورة باسم {slug}.* (svg/png/jpg/webp).
function getImageForSlug(slug) {
  try {
    const imagesDir = path.join(BLOG_DIR, 'images');
    if (!fs.existsSync(imagesDir)) return null;
    const base = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
    const file = fs.readdirSync(imagesDir).find(f => {
      const dot = f.lastIndexOf('.');
      if (dot < 0) return false;
      const name = f.slice(0, dot);
      const ext = f.slice(dot + 1).toLowerCase();
      return name === slug && base.includes(ext);
    });
    return file ? `/blog/images/${file}` : null;
  } catch {
    return null;
  }
}

// ── نشر مقال كامل (قد يكون عدة أجزاء) ─────────────────────────────────────
async function publishArticleToFacebook(article, token, pageId) {
  const slug = article.slug;
  const title = article.title || slug;
  const url = `${BASE_URL}/blog/${slug}.html`;

  const text = extractArticleText(slug, title);
  if (!text) {
    console.log(`[fb] ⚠️  لا يوجد ملف HTML لمقال ${slug} — تخطي.`);
    return { slug, status: 'no-file' };
  }

  // نص المنشور = عنوان + نص المقال + رابط
  const full = `${title}\n\n${text}\n\n📖 للمزيد: ${url}`;
  const parts = splitIntoParts(full);
  const partCount = parts.length;
  const postedIds = [];

  console.log(`[fb] نشر "${title}" على فيسبوك (${partCount} جزء/أجزاء)...`);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const header = partCount > 1
      ? `${FB_PREAMBLE}\n📄 ${title} — الجزء ${i + 1}/${partCount}\n\n${part}`
      : `${FB_PREAMBLE}\n${part}`;
    try {
      const imgRel = getImageForSlug(slug);
      const imageUrl = imgRel ? `https://justice-91571.web.app${imgRel}` : null;
      const id = await postToFacebook(header, pageId, token, partCount > 1, { i: i + 1, total: partCount }, url, imageUrl);
      postedIds.push(id);
      console.log(`[fb]   ✓ جزء ${i + 1}/${partCount} → post id ${id}`);
    } catch (err) {
      console.error(`[fb]   ✗ جزء ${i + 1}/${partCount} فشل: ${err.message}`);
      // إن فشل الجزء الأول فلا نكمل
      if (i === 0) throw err;
    }
    // مهلة بسيطة بين الأجزاء لتجنب إشارات spam
    if (i < parts.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  return { slug, status: 'published', parts: partCount, postIds: postedIds, url };
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!FB_PAGE_TOKEN) {
    if (dryRun) {
      console.log('[fb] ⚠️  FB_PAGE_TOKEN غير مضبوط — وضع المعاينة يعمل لكنه لن يُنشر فعلياً.');
      console.log('[fb]   أضف FB_PAGE_ID و FB_PAGE_TOKEN إلى D:\\قانوني 7\\.env لتفعيل النشر.');
    } else {
      console.error('[fb] خطأ: FB_PAGE_TOKEN غير موجود في .env');
      console.error('[fb]   أضف FB_PAGE_ID و FB_PAGE_TOKEN إلى D:\\قانوني 7\\.env');
      console.error('[fb]   أو كـ GitHub Secrets لتشغيل السكربت من Actions.');
      process.exit(1);
    }
  }

  // اقرأ سجلّي النشر (القديم + الجديد) وادمجهما، مع تفضيل السجل الجديد عند تكرار slug.
  const oldLog = readJson(OLD_PUBLISHED_LOG, { published: [] });
  const newLog = readJson(PUBLISHED_LOG, { published: [] });
  const mergedBySlug = new Map();
  for (const a of oldLog.published) mergedBySlug.set(a.slug, a);
  for (const a of newLog.published) mergedBySlug.set(a.slug, a);
  const allArticles = [...mergedBySlug.values()];

  const fbLog = readJson(FB_LOG, { published: [] });
  const alreadyPosted = new Set(fbLog.published.map(p => p.slug));
  const today = new Date(Date.now() + 120 * 60000).toISOString().slice(0, 10);

  // سقف يومي (15 منشوراً) لتفادي إغراق الصفحة لو تراكمت مقالات قديمة بتاريخ اليوم.
  // 15 = 5 من النظام الجديد + 5 من النظام القديم + 5 مقالات Gemini اليومية.
  const FB_MAX_POSTS_PER_DAY = 15;
  const postedToday = fbLog.published.filter(p => p.date === today).length;
  const remainingToday = Math.max(0, FB_MAX_POSTS_PER_DAY - postedToday);
  if (remainingToday <= 0) {
    console.log(`[fb] بلغنا سقف اليوم (${FB_MAX_POSTS_PER_DAY} منشورات) — تخطي.`);
    process.exit(0);
  }

  // المقالات المنشورة اليوم (آخرها أولاً) — نفس مواضيع المدونة.
  // نلتقط آخر 5 مقالات فقط (نفس عدد تشغيل واحد) مع احترام السقف اليومي.
  const MAX_FB_POSTS = 5;
  const todayArticles = allArticles
    .filter(a => a.date === today)
    .filter(a => !alreadyPosted.has(a.slug))
    .slice(-Math.min(MAX_FB_POSTS, remainingToday));

  if (todayArticles.length === 0) {
    console.log(`[fb] لا توجد مقالات جديدة لليوم (${today}) — كل المقالات نُشرت على فيسبوك مسبقاً.`);
    process.exit(0);
  }

  console.log(`[fb] === نشر ${todayArticles.length} مقالاً على فيسبوك ===`);
  if (dryRun) {
    for (const a of todayArticles) {
      console.log(`[fb] (معاينة) ${a.title} → ${BASE_URL}/blog/${a.slug}.html (${a.words || '?'} كلمة)`);
    }
    console.log('[fb] === لم يُنشر أي شيء (وضع المعاينة) ===');
    process.exit(0);
  }

  // تحويل الاسم لمعرّف وتوكن الصفحة لو لزم
  const page = await resolvePage(FB_PAGE_ID, FB_PAGE_TOKEN);
  const pageId = page.id;
  const pageToken = page.token;

  const results = [];
  for (const article of todayArticles) {
    try {
      const res = await publishArticleToFacebook(article, pageToken, pageId);
      if (res.status === 'published') {
        fbLog.published.push({
          slug: article.slug,
          title: article.title,
          date: today,
          url: article.url,
          parts: res.parts,
          postIds: res.postIds,
          postedAt: new Date().toISOString(),
        });
        results.push(res);
      }
    } catch (err) {
      console.error(`[fb] فشل نشر ${article.slug}: ${err.message}`);
    }
    // مهلة بين المقالات
    await new Promise(r => setTimeout(r, 3000));
  }

  writeJson(FB_LOG, fbLog);

  console.log(`[fb] ✅ نُشر ${results.length}/${todayArticles.length} مقالات على فيسبوك.`);
  for (const r of results) {
    console.log(`[fb]   - ${r.title} (${r.parts} جزء)`);
  }
}

main().catch(err => {
  console.error('[fb] فشل غير متوقع:', err);
  process.exit(1);
});
