#!/usr/bin/env node
/**
 * smart-publisher.cjs — الناشر الذكي الكامل لمنصة المحامي الرقمية
 *
 * يقوم بثلاثة أشياء في كل تشغيل:
 * 1. يستخدم Gemini لاقتراح أكثر المواضيع القانونية بحثاً على Google في مصر
 * 2. يولّد مقالاً كاملاً (3000+ كلمة) + صورة غلاف JPG عالية الجودة
 * 3. ينشر بالتوازي على المدونة (Firebase) وصفحة Facebook مع إرفاق الصورة البارزة
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const https         = require('https');
const { execSync }  = require('child_process');
const { GoogleGenAI } = require('@google/genai');
const dotenv        = require('dotenv');

// ── تحميل المتغيرات البيئية ─────────────────────────────────────────────────
const ROOT     = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const BLOG_DIR   = path.join(ROOT, 'public', 'blog');
const IMG_DIR    = path.join(BLOG_DIR, 'images');
const LOG_FILE   = path.join(__dirname, 'published-log.json');
const TREND_FILE = path.join(__dirname, 'trending-topics.json');
const FB_LOG     = path.join(__dirname, 'blog-publisher', 'facebook-published-log.json');
const BASE_URL   = 'https://mohamidigital.online';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── صورة توضيحية حسب تصنيف الموضوع (Fallback) ───────────────────────────────
// خريطة التصنيفات إلى صور Unsplash الأقرب دلالياً (عوضاً عن التكرار الدوار)
const LEGAL_IMAGE_MAP = {
  'القانون الجنائي': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&h=630&q=80',
  'الأحوال الشخصية': 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&h=630&q=80',
  'قانون الإيجارات': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&h=630&q=80',
  'الميراث': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&h=630&q=80',
  'الضرائب': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&h=630&q=80',
  'الجرائم الإلكترونية': 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&h=630&q=80',
  'قانون العمل': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&h=630&q=80',
  'الشركات': 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&h=630&q=80',
  'العقارات': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&h=630&q=80',
  'المستهلك': 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1200&h=630&q=80',
};
const LEGAL_JPG_COLLECTION = Object.values(LEGAL_IMAGE_MAP);

// وصف إنجليزي للتصنيف — يستخدم في توليد صورة Pollinations (لا يفهم العربية)
const CATEGORY_EN = {
  'القانون الجنائي': 'Egyptian criminal law court justice scale gavel',
  'الأحوال الشخصية': 'Egyptian family law marriage divorce court family',
  'قانون الإيجارات': 'Egyptian rental lease agreement contract keys apartment',
  'الميراث': 'Egyptian inheritance law family heritage documents',
  'الضرائب': 'Egyptian tax law money finance documents calculator',
  'الجرائم الإلكترونية': 'Egyptian cybercrime digital security shield laptop',
  'قانون العمل': 'Egyptian labor law employment workplace workers rights',
  'الشركات': 'Egyptian company law business incorporation building',
  'العقارات': 'Egyptian real estate property law apartment building keys',
  'المستهلك': 'Egyptian consumer protection law shopping returns warranty',
  'الشهر العقاري': 'Egyptian real estate registration notary documents',
  'إجراءات قضائية': 'Egyptian court procedures trial judge gavel',
  'التحكيم': 'Egyptian arbitration agreement handshake mediation',
  'التأمينات': 'Egyptian insurance law policy protection document',
};
const CATEGORY_FALLBACK_EN = 'Egyptian law justice balance scale columns courthouse';

// تحويل التصنيف العربي إلى كلمات إنجليزية مفتاحية للتوليد عبر Pollinations
function categoryToEnglish(topic) {
  const cat = topic.tag || topic.category || '';
  return CATEGORY_EN[cat] || CATEGORY_FALLBACK_EN;
}

// إعادة تحجيم الصورة إلى 1200×630 بدقة عالية عبر sharp (إن توفر)
async function fitCoverImage(srcPath, destPath) {
  try {
    const sharp = require('sharp');
    await sharp(srcPath)
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(destPath);
    const info = await sharp(destPath).metadata();
    return info.width === 1200 && info.height === 630;
  } catch {
    fs.copyFileSync(srcPath, destPath);
    return false;
  }
}

// توليد صورة مخصصة للموضوع عبر Pollinations.ai (مجاني بالذكاء الاصطناعي)
async function generateTopicImage(topic) {
  const prompt = categoryToEnglish(topic) + ', professional photography, modern, high quality, no text, no words, no letters';
  const seed = Math.floor(Date.now() / 1000) % 100000;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=630&nologo=true&seed=${seed}`;
  const tmp = path.join(IMG_DIR, `.tmp-${topic.slug}.jpg`);
  try {
    await downloadFile(url, tmp);
    if (!fs.existsSync(tmp) || fs.statSync(tmp).size < 10000) throw new Error('صورة صغيرة/فارغة');
    const final = path.join(IMG_DIR, `${topic.slug}.jpg`);
    await fitCoverImage(tmp, final);
    fs.unlinkSync(tmp);
    log(`✅ تم توليد صورة مخصصة بـ Pollinations: ${final} (${Math.round(fs.statSync(final).size / 1024)} KB)`);
    return `/blog/images/${topic.slug}.jpg`;
  } catch (err) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    log(`⚠️ فشل توليد صورة Pollinations: ${err.message}`);
    return null;
  }
}

// ── أدوات مساعدة ────────────────────────────────────────────────────────────
function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function todayStr() {
  return new Date(Date.now() + 180 * 60000).toISOString().slice(0, 10);
}
function slugify(text) {
  return text.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}
function log(msg) {
  console.log(`[${new Date().toLocaleTimeString('ar-EG')}] ${msg}`);
}
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

// استدعاء Gemini مع إعادة المحاولة التلقائية عند تجاوز المعدل (Rate Limit 429)
async function generateContentWithRetry(prompt, config = {}, modelIndex = 0) {
  const models = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.0-flash'];
  const modelName = models[modelIndex % models.length];

  try {
    const result = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config
    });
    return result;
  } catch (err) {
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('Quota')) {
      log(`⏳ انتظر 15 ثانية لتفادي Rate Limit لـ Gemini (${modelName})...`);
      await sleep(15000);
      return generateContentWithRetry(prompt, config, modelIndex + 1);
    }
    throw err;
  }
}

// ── STEP 1: اقتراح مواضيع ترند يومية بـ Gemini + Google Trends ──────────────
// يجلب الترندات الحقيقية لمصر من Google Trends RSS ثم يطلب من Gemini ترجمتها
// إلى مواضيع قانونية قابلة للنشر — فينتج محتوى يطابق ما يبحث عنه الناس فعلاً اليوم.
async function fetchGoogleTrends() {
  try {
    log('📊 جاري جلب الترندات الحقيقية من Google Trends (geo=EG)...');
    const res = await fetch('https://trends.google.com/trending/rss?geo=EG', {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const items = (text.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 25);
    const trends = items.map(item => {
      const title = (item.match(/<title>(.*?)<\/title>/) || [])[1]?.trim();
      const traffic = (item.match(/ht_approx_traffic>([^<]+)</) || [])[1]?.trim();
      if (!title) return null;
      return { title, traffic };
    }).filter(Boolean);
    log(`✅ Google Trends: ${trends.length} ترنداً لمصر اليوم`);
    return trends;
  } catch (e) {
    log(`⚠️ فشل جلب Google Trends: ${e.message}`);
    return [];
  }
}

async function fetchTrendingTopics(publishedSlugs) {
  log('🔍 جاري اقتراح أكثر المواضيع القانونية بحثاً اليوم...');

  const today = todayStr();
  const force = process.argv.includes('--force');
  const stored = readJson(TREND_FILE, { date: '', topics: [] });
  if (!force && stored.date === today && stored.topics.length >= 10) {
    const available = stored.topics.filter(t => !publishedSlugs.has(t.slug));
    if (available.length >= 5) {
      log(`✅ مواضيع اليوم محمّلة من الذاكرة (${available.length} موضوع متاح)`);
      return available;
    }
  }

  // الترندات الحقيقية من Google لمصر — تُزوّد بها Gemini لتوليد مواضيع قانونية مرتبطة
  const realTrends = await fetchGoogleTrends();
  const trendsHint = realTrends.length
    ? `الترندات الفعلية على Google اليوم في مصر (استلهم منها أينما كان لها بعد قانوني):\n${realTrends.map((t, i) => `${i + 1}. ${t.title}${t.traffic ? ' (' + t.traffic + ')' : ''}`).join('\n')}`
    : 'لا توجد بيانات ترند متاحة الآن — اعتمد على معرفتك باهتمامات الباحثين المصريين اليوم.';

  const prompt = `أنت خبير قانوني ومتخصص في تحسين محركات البحث (SEO) للمحتوى القانوني العربي.

هذه هي الترندات الفعلية على Google اليوم في مصر:
${trendsHint}

اقترح 20 موضوعاً قانونياً مصرياً مختلفاً يُبحث عنها كثيراً على Google اليوم في مصر.
ربط المواضيع بالترندات أعلاه عندما تكون ذات صلة قانونية (مثل ترندات العقارات، الشهر العقاري، الضرائب، الميراث، الإيجارات، الشيكات...).
ركّز على المواضيع التي يبحث عنها المواطنون والمحامون والباحثون:
مثل: حقوق العمال، عقود الإيجار، قضايا الطلاق، التوثيق، الميراث، الشيكات المرتجعة، الضرائب، الجرائم الإلكترونية، تأسيس الشركات، حقوق المستهلك...

لكل موضوع أعطني JSON بهذا الشكل بالضبط:
{
  "title": "عنوان المقال بالعربية (جذاب ومحدد ويحتوي على كلمات البحث)",
  "slug": "article-slug-in-english-with-hyphens",
  "tag": "الوسم الرئيسي",
  "metaDesc": "وصف SEO جذاب لا يتجاوز 160 حرفاً",
  "keywords": "5-7 كلمات مفتاحية مفصولة بفاصلة",
  "coverColor": "indigo",
  "coverIcon": "⚖️",
  "readTime": "12",
  "searchVolume": "high"
}

القواعد:
- الـ slug يجب أن يكون بالإنجليزية فقط (حروف وأرقام وhyphens)
- coverColor يكون أحد: indigo, cyan, purple, emerald
- لا تكرر مواضيع نُشرت بالفعل في: ${Array.from(publishedSlugs).slice(0, 20).join(', ')}

أعطني فقط مصفوفة JSON صحيحة بدون أي نص إضافي.`;

  const result = await generateContentWithRetry(prompt, { temperature: 0.9, maxOutputTokens: 4000 });

  let raw = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let topics = [];
  try {
    topics = JSON.parse(raw);
  } catch (e) {
    const matches = raw.match(/\{[\s\S]*?\}/g) || [];
    for (const m of matches) {
      try { topics.push(JSON.parse(m)); } catch {}
    }
  }

  topics = topics.filter(t => t.title && t.slug).map(t => ({
    ...t,
    slug: slugify(t.slug),
    readTime: t.readTime || '12',
    coverColor: t.coverColor || 'indigo',
    coverIcon: t.coverIcon || '⚖️'
  }));

  writeJson(TREND_FILE, { date: today, topics });
  log(`✅ تم اقتراح ${topics.length} موضوعاً جديداً من Gemini`);

  return topics.filter(t => !publishedSlugs.has(t.slug));
}

// ── STEP 2: توليد محتوى المقال بـ Gemini (3000+ كلمة) ──────────────────────
async function generateArticleContent(topic) {
  log(`✍️  جاري توليد مقال: "${topic.title}"...`);

  const prompt = `أنت كاتب قانوني متخصص في القانون المصري، متمكن من الكتابة القانونية الرصينة للجمهور العام.

اكتب مقالاً قانونياً شاملاً بالعربية الفصحى المبسطة عن: "${topic.title}"

المتطلبات الإلزامية:
1. طول المقال: لا يقل عن 3500 كلمة
2. مستند لقوانين مصرية حقيقية (برقم القانون وسنة الإصدار)
3. هيكل واضح: مقدمة + 6 أقسام رئيسية على الأقل + خاتمة
4. كل قسم يحتوي على: عنوان + نص تفصيلي + أمثلة عملية
5. قسم FAQ (أسئلة وأجوبة) في النهاية يحتوي على 4 أسئلة شائعة

اكتب المحتوى في HTML فقط (بدون DOCTYPE أو head أو body) باستخدام هذه العناصر:
- <h2> للأقسام الرئيسية
- <p> للفقرات  
- <ul>/<li> للقوائم
- <strong> للتأكيد
- <div class="callout"><span class="callout-icon">💡</span><p>...</p></div> للمعلومات المهمة
- <div class="highlight"><p>...</p></div> للمقدمة التمهيدية
- <div class="faq-grid"><div class="faq-item"><h4>❓ السؤال</h4><p>الإجابة</p></div></div> للـ FAQ
- <ol>/<li> للخطوات المرتبة

المحتوى يجب أن يتضمن:
- ذكر رقم القانون وسنته عند الإشارة لأي قانون
- أمثلة واقعية من الحياة المصرية
- أرقام ومواعيد قانونية محددة (مهل، رسوم، إجراءات)
- نصائح عملية للقارئ

أعطني فقط كود HTML المباشر بدون markdown أو تفسيرات.`;

  const result = await generateContentWithRetry(prompt, { temperature: 0.7, maxOutputTokens: 8000 });

  let content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  content = content.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

  const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  log(`📝 تم توليد المقال: ${wordCount} كلمة تقريباً`);

  return { content, wordCount };
}

// ── STEP 3: توليد صورة JPG عالية الجودة لكل مقال ─────────────────────────────
// الاستراتيجية: (1) صورة ذكاء اصطناعي مخصصة من Pollinations حسب الموضوع،
// (2) ثم صورة Unsplash مطابقة لتصنيف الموضوع،
// (3) وأخيراً أول صورة من المجموعة كـ Fallback نهائي.
async function generateArticleImage(topic, index = 0) {
  log(`🖼️  جاري إنشاء صورة غلاف JPG: "${topic.title}"...`);

  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

  const destPath = path.join(IMG_DIR, `${topic.slug}.jpg`);

  // 1. صورة مخصصة بالذكاء الاصطناعي حسب الموضوع
  const aiPath = await generateTopicImage(topic);
  if (aiPath) return aiPath;

  // 2. صورة Unsplash مطابقة للتصنيف
  const cat = topic.tag || topic.category || '';
  const imageUrl = LEGAL_IMAGE_MAP[cat] || LEGAL_JPG_COLLECTION[index % LEGAL_JPG_COLLECTION.length];

  try {
    const size = await downloadFile(imageUrl, destPath);
    await fitCoverImage(destPath, destPath);
    log(`✅ تم تجهيز صورة غلاف JPG احترافية: ${destPath} (${Math.round(size / 1024)} KB)`);
    return `/blog/images/${topic.slug}.jpg`;
  } catch (err) {
    log(`⚠️ فشل تحميل الصورة: ${err.message}`);
    await downloadFile(LEGAL_JPG_COLLECTION[0], destPath);
    return `/blog/images/${topic.slug}.jpg`;
  }
}

// ── STEP 4: بناء ملف HTML الكامل للمقال ─────────────────────────────────────
function buildArticleHTML(topic, content, imageRelPath) {
  const imageUrl  = `${BASE_URL}${imageRelPath}`;
  const articleUrl = `${BASE_URL}/blog/${topic.slug}.html`;
  const dateAr = new Date(topic.pubDate || todayStr()).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });

  const accentMap = {
    indigo:  { hex: '#6366f1', rgb: '99,102,241', light: '#a5b4fc' },
    cyan:    { hex: '#06b6d4', rgb: '6,182,212',  light: '#67e8f9' },
    purple:  { hex: '#a855f7', rgb: '168,85,247', light: '#d8b4fe' },
    emerald: { hex: '#10b981', rgb: '16,185,129', light: '#6ee7b7' },
  };
  const accent = accentMap[topic.coverColor] || accentMap.indigo;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${topic.title} — منصة المحامي الرقمية</title>
  <meta name="description" content="${topic.metaDesc}"/>
  <meta name="keywords" content="${topic.keywords}"/>
  <link rel="canonical" href="${articleUrl}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${topic.title}"/>
  <meta property="og:description" content="${topic.metaDesc}"/>
  <meta property="og:url" content="${articleUrl}"/>
  <meta property="og:image" content="${imageUrl}"/>
  <meta property="og:image:type" content="image/jpeg"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:site_name" content="منصة المحامي الرقمية"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${topic.title}"/>
  <meta name="twitter:description" content="${topic.metaDesc}"/>
  <meta name="twitter:image" content="${imageUrl}"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0f172a;--border:rgba(148,163,184,0.12);
      --indigo:#6366f1;--purple:#7c3aed;--emerald:#10b981;--cyan:#06b6d4;
      --accent:${accent.hex};--accent-light:${accent.light};
      --text:#f1f5f9;--muted:#94a3b8;--card-bg:rgba(15,23,42,0.75);
    }
    html{scroll-behavior:smooth}
    body{font-family:'Cairo',-apple-system,BlinkMacSystemFont,sans-serif;background-color:var(--bg);color:var(--text);min-height:100vh;line-height:1.9;background-image:radial-gradient(ellipse at 50% 0%,rgba(${accent.rgb},0.15) 0%,transparent 60%),linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px);background-size:100% 100%,40px 40px,40px 40px}
    nav.main-nav{position:sticky;top:0;z-index:100;background:rgba(15,23,42,0.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px}
    .nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:64px}
    .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
    .logo-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--indigo),var(--purple));display:flex;align-items:center;justify-content:center;font-size:18px}
    .logo-name{font-size:15px;font-weight:900;color:#fff}
    .logo-sub{font-size:10px;color:var(--muted);display:block}
    .nav-links{display:flex;gap:20px}
    .nav-links a{font-size:13px;color:var(--muted);text-decoration:none;font-weight:700;transition:color .2s}
    .nav-links a:hover,.nav-links a.active{color:var(--accent-light)}
    .nav-cta{padding:8px 20px;border-radius:10px;background:linear-gradient(135deg,var(--indigo),var(--purple));color:#fff;font-size:13px;font-weight:900;text-decoration:none;transition:opacity .2s}
    .nav-cta:hover{opacity:.85}
    nav.breadcrumbs{max-width:1200px;margin:16px auto;padding:0 24px;display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)}
    nav.breadcrumbs a{color:var(--muted);text-decoration:none}
    nav.breadcrumbs a:hover{color:var(--accent-light)}
    .sep{opacity:.4}
    .article-hero{max-width:900px;margin:0 auto;padding:40px 24px 20px;text-align:center}
    .article-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 18px;border-radius:999px;background:rgba(${accent.rgb},0.12);border:1px solid rgba(${accent.rgb},0.3);color:var(--accent-light);font-size:13px;font-weight:800;margin-bottom:20px}
    .article-hero h1{font-size:clamp(22px,3.5vw,40px);font-weight:900;color:#fff;line-height:1.4;margin-bottom:16px}
    .article-meta{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;font-size:13px;color:var(--muted)}
    .article-cover{max-width:900px;margin:0 auto 0;padding:0 24px}
    .article-cover img{width:100%;height:auto;max-height:450px;object-fit:cover;border-radius:20px;border:1px solid var(--border);box-shadow:0 20px 60px rgba(0,0,0,.5)}
    .ad-slot{margin:24px auto;max-width:900px;padding:0 24px;text-align:center;min-height:90px}
    .ad-label{display:block;font-size:10px;color:var(--muted);margin-bottom:6px;font-weight:700;letter-spacing:.5px}
    .article-container{max-width:900px;margin:0 auto;padding:0 24px 80px}
    .article-card{background:var(--card-bg);border:1px solid var(--border);border-radius:24px;padding:40px 48px;backdrop-filter:blur(10px)}
    .article-card h2{font-size:22px;font-weight:900;color:var(--accent-light);margin:36px 0 14px;padding-bottom:10px;border-bottom:2px solid rgba(${accent.rgb},0.2);display:flex;align-items:center;gap:10px}
    .article-card h3{font-size:18px;font-weight:800;color:#e2e8f0;margin:24px 0 10px}
    .article-card h4{font-size:16px;font-weight:700;color:var(--accent-light);margin:16px 0 8px}
    .article-card p{font-size:15px;color:#cbd5e1;line-height:1.95;margin-bottom:14px}
    .article-card strong{color:#fff;font-weight:800}
    .article-card ul,.article-card ol{margin:14px 0 20px;padding-right:22px}
    .article-card li{font-size:14px;color:#cbd5e1;line-height:1.9;margin-bottom:8px}
    .article-card li strong{color:var(--accent-light)}
    .highlight{background:linear-gradient(135deg,rgba(${accent.rgb},0.12),rgba(99,102,241,0.08));border:1px solid rgba(${accent.rgb},0.3);border-radius:16px;padding:24px 28px;margin:24px 0 28px}
    .highlight p{color:#f1f5f9;margin-bottom:0;font-size:16px;font-weight:700;line-height:1.8}
    .callout{background:rgba(${accent.rgb},0.08);border:1px solid rgba(${accent.rgb},0.3);border-radius:16px;padding:18px 22px;margin:24px 0;display:flex;gap:14px;align-items:flex-start}
    .callout-icon{font-size:22px;flex-shrink:0}
    .callout p{margin-bottom:0;color:var(--accent-light);font-size:14px}
    .callout p strong{color:#fff}
    .faq-grid{display:flex;flex-direction:column;gap:14px;margin:20px 0}
    .faq-item{background:rgba(30,41,59,0.5);border:1px solid var(--border);border-radius:14px;padding:18px 22px}
    .faq-item h4{font-size:15px;font-weight:800;color:var(--accent-light);margin-bottom:8px}
    .faq-item p{margin-bottom:0;font-size:14px;color:#cbd5e1}
    .back-link{text-align:center;margin-top:36px;padding-top:20px;border-top:1px solid var(--border)}
    .back-link a{display:inline-flex;align-items:center;gap:8px;color:var(--accent-light);font-size:13px;font-weight:800;text-decoration:none;padding:10px 24px;border-radius:12px;background:rgba(${accent.rgb},0.1);border:1px solid rgba(${accent.rgb},0.3);transition:all .2s}
    .back-link a:hover{background:rgba(${accent.rgb},0.2)}
    .cta-section{text-align:center;padding:0 24px 60px}
    .cta-btn{display:inline-flex;align-items:center;gap:10px;padding:16px 48px;border-radius:16px;background:linear-gradient(135deg,var(--emerald),#0891b2,var(--indigo));color:#fff;font-size:15px;font-weight:900;text-decoration:none;box-shadow:0 8px 32px rgba(16,185,129,.25);transition:transform .2s,box-shadow .2s}
    .cta-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(16,185,129,.4)}
    footer{border-top:1px solid var(--border);background:rgba(15,23,42,.95);padding:48px 24px 28px}
    .footer-inner{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:flex-start;gap:32px;flex-wrap:wrap}
    .footer-brand .footer-name{font-size:15px;font-weight:900;color:#fff;margin-bottom:6px}
    .footer-brand p{font-size:12px;color:var(--muted);max-width:260px;line-height:1.7}
    .footer-links{display:flex;gap:20px;flex-wrap:wrap}
    .footer-links a{font-size:12px;color:var(--muted);text-decoration:none;transition:color .2s}
    .footer-links a:hover{color:var(--accent-light)}
    .footer-copy{width:100%;text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid rgba(148,163,184,.08);font-size:11px;color:rgba(148,163,184,.4)}
    @media(max-width:768px){.article-card{padding:24px 18px}.nav-links{display:none}.footer-inner{flex-direction:column}}
  </style>
</head>
<body>
  <nav class="main-nav">
    <div class="nav-inner">
      <a href="/" class="nav-logo">
        <div class="logo-icon">${topic.coverIcon}</div>
        <div class="logo-text">
          <span class="logo-name">منصة المحامي الرقمية</span>
          <span class="logo-sub">مجاني 100% • إدارة مكاتب المحاماة</span>
        </div>
      </a>
      <div class="nav-links">
        <a href="/">الرئيسية</a>
        <a href="/about.html">عن المنصة</a>
        <a href="/features.html">المميزات</a>
        <a href="/blog/" class="active">المدونة</a>
        <a href="/contact.html">تواصل معنا</a>
      </div>
      <a href="/" class="nav-cta">دخول المنصة مجاناً 🚀</a>
    </div>
  </nav>

  <nav class="breadcrumbs" aria-label="مسار التنقل">
    <a href="/">الرئيسية</a><span class="sep">‹</span>
    <a href="/blog/">المدونة القانونية</a><span class="sep">‹</span>
    <span>${topic.tag}</span>
  </nav>

  <div class="article-hero">
    <div class="article-badge">${topic.coverIcon} ${topic.tag}</div>
    <h1>${topic.title}</h1>
    <div class="article-meta">
      <span>📅 ${dateAr}</span>
      <span>✍️ فريق منصة المحامي الرقمية</span>
      <span>⏱️ ${topic.readTime} دقائق قراءة</span>
    </div>
  </div>

  <div class="article-cover">
    <img src="${imageRelPath}" alt="${topic.title}"/>
  </div>

  <div class="ad-slot" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-7725405859334364" data-ad-slot="2168039898" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <div class="article-container">
    <article class="article-card">
      ${content}
      <div class="back-link">
        <a href="/blog/">← العودة للمدونة القانونية</a>
      </div>
    </article>
  </div>

  <div class="cta-section">
    <a href="/" class="cta-btn">🚀 جرّب منصة المحامي الرقمية مجاناً</a>
  </div>

  <footer>
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="footer-name">⚖️ منصة المحامي الرقمية</div>
        <p>نظام متكامل لإدارة مكاتب المحاماة — مجاني 100%</p>
      </div>
      <div class="footer-links">
        <a href="/">الرئيسية</a>
        <a href="/about.html">عن المنصة</a>
        <a href="/blog/">المدونة</a>
        <a href="/contact.html">تواصل معنا</a>
      </div>
      <div class="footer-copy">© 2026 منصة المحامي الرقمية — جميع الحقوق محفوظة</div>
    </div>
  </footer>
</body>
</html>`;
}

// ── STEP 5: تحديث صفحة فهرس المدونة ─────────────────────────────────────────
function updateBlogIndex(topic, imageRelPath) {
  const BLOG_INDEX = path.join(BLOG_DIR, 'index.html');
  const ANCHOR = '<!-- NEW_CARD_ANCHOR -->';
  let html = fs.readFileSync(BLOG_INDEX, 'utf8');

  if (!html.includes(ANCHOR)) return;

  const dateAr = new Date(topic.pubDate).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });
  const cardHTML = `<a href="/blog/${topic.slug}.html" class="post-card">
        <div class="post-cover">
          <img src="${imageRelPath}" alt="${topic.title}" class="post-cover-img"/>
          <span class="post-cover-tag">${topic.tag}</span>
        </div>
        <div class="post-body">
          <div class="post-meta">
            <span>📅 ${dateAr}</span>
            <span>⏱️ ${topic.readTime} دقائق</span>
          </div>
          <h3>${topic.title}</h3>
          <p>${topic.metaDesc}</p>
          <div class="post-cta">اقرأ المقال ←</div>
        </div>
      </a>

      ${ANCHOR}`;

  html = html.replace(ANCHOR, cardHTML);
  fs.writeFileSync(BLOG_INDEX, html, 'utf8');
}

// ── STEP 6: النشر على Facebook ومطالبة Facebook بمسح الصورة والصفحة ─────────
async function postToFacebook(topic, articleUrl, imageUrl) {
  const userToken = process.env.FB_PAGE_TOKEN;
  const pageId    = process.env.FB_PAGE_ID || '100701832193892';

  if (!userToken) {
    log('⚠️ FB_PAGE_TOKEN غير موجود — تخطي Facebook');
    return null;
  }

  let pageToken = userToken;
  try {
    const accounts = await httpGet(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(userToken)}`);
    const page = (accounts.data || []).find(p => p.id === pageId) || (accounts.data || [])[0];
    if (page?.access_token) pageToken = page.access_token;
  } catch {}

  // مطالبة فيسبوك بكشط الرابط
  try {
    log(`🔄 مطالبة Facebook بمسح الرابط والصورة: ${articleUrl}`);
    await httpGet(`https://graph.facebook.com/v19.0/?id=${encodeURIComponent(articleUrl)}&scrape=true&access_token=${encodeURIComponent(pageToken)}`);
  } catch (e) {}

  const tag = (topic.tag || '').replace(/\s+/g, '_');
  const message = [
    `📚 ${topic.title}`,
    ``,
    `${topic.metaDesc}`,
    ``,
    `📌 يشمل المقال:`,
    `• تفاصيل قانونية مستندة لأحدث التشريعات المصرية`,
    `• أمثلة واقعية وإجراءات عملية`,
    `• أسئلة شائعة وإجابات قانونية دقيقة`,
    ``,
    `🔗 اقرأ المقال كاملاً:`,
    articleUrl,
    ``,
    `#العدالة_القانونية #منصة_المحامي_الرقمية #قانون_مصري #${tag}`
  ].join('\n');

  // نشر صورة احترافية مباشرة عبر /photos
  if (imageUrl) {
    try {
      const photoParams = {
        url: imageUrl,
        caption: message,
        access_token: pageToken
      };
      const photoRes = await httpPost(`https://graph.facebook.com/v19.0/${pageId}/photos`, photoParams);
      if (photoRes.id || photoRes.post_id) {
        const id = photoRes.post_id || photoRes.id;
        log(`✅ Facebook: تم نشر منشور صورة رائع! Photo/Post ID: ${id}`);
        return id;
      }
    } catch (e) {
      log(`⚠️ Photo post fallback...`);
    }
  }

  const feedParams = {
    message,
    link: articleUrl,
    access_token: pageToken
  };

  try {
    const result = await httpPost(`https://graph.facebook.com/v19.0/${pageId}/feed`, feedParams);
    if (result.id) {
      log(`✅ Facebook: تم النشر! Post ID: ${result.id}`);
      return result.id;
    } else {
      log(`❌ Facebook: ${result.error?.message}`);
      return null;
    }
  } catch (err) {
    log(`❌ Facebook Error: ${err.message}`);
    return null;
  }
}

// ── أدوات HTTP ───────────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    }).on('error', reject);
  });
}

function httpPost(url, params) {
  return new Promise((resolve, reject) => {
    const postData = Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ── الدالة الرئيسية ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 الناشر الذكي — منصة المحامي الرقمية');
  console.log(`⏰ ${new Date().toLocaleString('ar-EG')}`);
  console.log('═'.repeat(60) + '\n');

  const today = todayStr();
  const publishedLog = readJson(LOG_FILE, { published: [] });
  const fbLog        = readJson(FB_LOG, { published: [] });
  const publishedSlugs = new Set(publishedLog.published.map(p => p.slug));

  const force = process.argv.includes('--force');
  const MAX_TODAY = 3;
  const todayPublished = publishedLog.published.filter(p => p.date === today).length;

  if (todayPublished >= MAX_TODAY && !force) {
    log(`✅ تم نشر ${todayPublished} مقالاً اليوم — الحد الأقصى اليومي ${MAX_TODAY}`);
    return;
  }

  const remaining = force ? MAX_TODAY : (MAX_TODAY - todayPublished);
  log(`📊 المنشور اليوم: ${todayPublished} / سيتم نشر: ${remaining}`);

  // 1. جلب المواضيع الرائجة
  const availableTopics = await fetchTrendingTopics(publishedSlugs);
  if (availableTopics.length === 0) {
    log('⚠️ لا توجد مواضيع جديدة');
    return;
  }

  const topicsToPublish = availableTopics.slice(0, remaining);
  log(`📰 سيتم نشر ${topicsToPublish.length} مقال الآن`);

  // 2. معالجة كل موضوع
  const publishedArticles = [];

  for (let i = 0; i < topicsToPublish.length; i++) {
    const topic = topicsToPublish[i];
    topic.pubDate = today;
    console.log('\n' + '─'.repeat(50));
    log(`📌 الموضوع (${i+1}/${topicsToPublish.length}): "${topic.title}"`);

    try {
      // إطلاق توليد المحتوى وتجهيز الصورة
      const [{ content, wordCount }, imageRelPath] = await Promise.all([
        generateArticleContent(topic),
        generateArticleImage(topic, i)
      ]);

      const html = buildArticleHTML(topic, content, imageRelPath);
      const htmlPath = path.join(BLOG_DIR, `${topic.slug}.html`);
      fs.writeFileSync(htmlPath, html, 'utf8');

      updateBlogIndex(topic, imageRelPath);

      const articleUrl = `${BASE_URL}/blog/${topic.slug}.html`;
      const imageUrl   = `${BASE_URL}${imageRelPath}`;

      publishedArticles.push({ topic, articleUrl, imageUrl, wordCount });
      log(`✅ تم إنشاء المقال: ${htmlPath} (${wordCount} كلمة) — الصورة: ${imageUrl}`);

      // انتظار قصير بين المقالات لتفادي rate limit لـ Gemini
      if (i < topicsToPublish.length - 1) {
        log('⏳ انتظار 3 ثوانٍ قبل الموضوع التالي...');
        await sleep(3000);
      }

    } catch (err) {
      log(`❌ فشل معالجة "${topic.title}": ${err.message}`);
    }
  }

  if (publishedArticles.length === 0) return;

  // 3. إعادة توليد sitemap ليشمل المقالات الجديدة قبل البناء
  log('\n🗺️ جاري توليد sitemap...');
  try {
    execSync('node scripts/blog-publisher/generate-sitemap.cjs', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    log(`⚠️ تعذّر توليد sitemap: ${e.message}`);
  }

  // 3b. بناء الموقع (Build)
  log('\n🔨 جاري بناء الموقع...');
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
    log('✅ اكتمل البناء');
  } catch (e) {
    log(`❌ فشل البناء: ${e.message}`);
    process.exit(1);
  }

  // 4. النشر السحابي للموقع
  log('\n🌐 جاري النشر على Firebase Hosting...');
  try {
    const tokenFlag = process.env.FIREBASE_TOKEN
      ? `--token "${process.env.FIREBASE_TOKEN}"` : '';
    execSync(`npx -y firebase-tools deploy --only hosting:app ${tokenFlag}`, {
      cwd: ROOT, stdio: 'inherit'
    });
    log('✅ تم رفع الموقع والصور الجديدة على Firebase!');
  } catch (e) {
    log(`❌ فشل النشر على Firebase: ${e.message}`);
    process.exit(1);
  }

  // 5. النشر المتوازي الفوري ⚡ على صفحة Facebook بجميع المنشورات في نفس اللحظة
  log('\n📘 جاري النشر بالتوازي المباشر في نفس اللحظة على Facebook...');
  const fbResults = await Promise.all(
    publishedArticles.map(({ topic, articleUrl, imageUrl }) =>
      postToFacebook(topic, articleUrl, imageUrl).then(postId => ({ topic, postId }))
    )
  );
  const fbPostResults = fbResults;

  // 6. تحديث السجلات
  for (const { topic, articleUrl, imageUrl, wordCount } of publishedArticles) {
    publishedLog.published.push({
      title: topic.title, date: today, slug: topic.slug,
      url: articleUrl, image: imageUrl,
      tags: [topic.tag], words: wordCount,
      model: 'gemini-2.0-flash'
    });
  }
  writeJson(LOG_FILE, publishedLog);

  const fbPostedItems = fbPostResults.filter(r => r?.postId);
  for (const { topic, postId } of fbPostedItems) {
    fbLog.published.push({
      slug: topic.slug, title: topic.title, date: today,
      postId, postedAt: new Date().toISOString()
    });
  }
  writeJson(FB_LOG, fbLog);

  // 7. ملخص نهائي
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 اكتمل النشر بنجاح مع الصور البارزة!');
  console.log('═'.repeat(60));
  for (const { topic, articleUrl, imageUrl, wordCount } of publishedArticles) {
    console.log(`\n📰 ${topic.title}`);
    console.log(`   🌐 المدونة: ${articleUrl}`);
    console.log(`   🖼️ الصورة: ${imageUrl}`);
    console.log(`   📝 الكلمات: ${wordCount}+`);
    const fb = fbPostResults.find(r => r?.topic?.slug === topic.slug);
    if (fb?.postId) console.log(`   📘 Facebook Post: https://www.facebook.com/${fb.postId}`);
  }
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('❌ خطأ غير متوقع:', err);
  process.exit(1);
});
