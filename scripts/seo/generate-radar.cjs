#!/usr/bin/env node
/**
 * generate-radar.cjs — توليد/تحديث صفحة «رصد المحامي» (legal-radar.html)
 *
 * آلية العمل اليومية:
 *   1. يجلب أهم ترندات Google لمصر (geo=EG) وللعالم (RSS بلا geo).
 *   2. يستخدم Gemini لصياغة «مقال اليوم» — تحليل ترندات من زاوية قانونية/مهنية.
 *   3. ينشر المقال + الترندات على الصفحة، مع أرشيف آخر الأيام.
 *
 * ملاحظات:
 *   - المقال يُولَّد مرة واحدة يومياً فقط (يُخزَّن في public/radar-archive.json
 *     ويُتجاهل لو اليوم موجود بالفعل) حتى لا تُستنزف حصة Gemini في الرنات
 *     المتكررة (الـ workflow يعمل حتى 5 مرات يومياً).
 *   - بدون GEMINI_API_KEY تتحول الصفحة لوضع عرض الترندات فقط (بدون مقال).
 *   - تُشغَّل تلقائياً في daily-blog-post.yml بعد الناشر الذكي.
 *
 * الاستخدام:
 *   GEMINI_API_KEY=... node scripts/seo/generate-radar.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
try {
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: path.join(ROOT, '.env') });
} catch {}

const OUT_FILE = path.join(ROOT, 'public', 'legal-radar.html');
const ARCHIVE_FILE = path.join(ROOT, 'public', 'radar-archive.json');
const BASE_URL = 'https://mohamidigital.online';
const EG_FEED = 'https://trends.google.com/trending/rss?geo=EG';
const WORLD_FEED = 'https://trends.google.com/trending/rss';
const MAX_TRENDS = 10;
const MAX_ARCHIVE = 12;
const MAX_ARCHIVE_SHOWN = 7;
const AD_CLIENT = 'ca-pub-7725405859334364';
const AD_SLOT = '2168039898';
const MODELS = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.0-flash'];

let log = console.log;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cairoNow() {
  const d = new Date(Date.now() + 120 * 60000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function todayStr() {
  return new Date(Date.now() + 120 * 60000).toISOString().slice(0, 10);
}

// ─── جلب الترندات ───

async function fetchFeed(url, region) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; mohamidigital-radar/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const items = (text.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, MAX_TRENDS);
    const trends = items
      .map((item) => {
        const title = (item.match(/<title>(.*?)<\/title>/) || [])[1]?.trim();
        const traffic = (item.match(/ht_approx_traffic>([^<]+)</) || [])[1]?.trim();
        if (!title) return null;
        return { title, traffic, region };
      })
      .filter(Boolean);
    log(`[radar] ✅ ${region}: ${trends.length} ترنداً`);
    return trends;
  } catch (e) {
    log(`[radar] ⚠️ فشل جلب ترندات ${region}: ${e.message}`);
    return [];
  }
}

async function fetchTrends() {
  const [eg, world] = await Promise.all([fetchFeed(EG_FEED, 'مصر'), fetchFeed(WORLD_FEED, 'عالمي')]);
  const seen = new Set();
  const all = [...eg, ...world].filter((t) => {
    if (seen.has(t.title)) return false;
    seen.add(t.title);
    return true;
  });
  if (all.length) return all;

  // احتياط: بيانات الناشر الذكي
  try {
    const tf = path.join(ROOT, 'scripts', 'trending-topics.json');
    if (fs.existsSync(tf)) {
      const data = JSON.parse(fs.readFileSync(tf, 'utf8'));
      if (Array.isArray(data.topics)) {
        return data.topics.map((t) => ({ title: t.title || '', traffic: '', region: 'مصر' })).slice(0, MAX_TRENDS);
      }
    }
  } catch {}
  return [];
}

// ─── Gemini: توليد مقال اليوم ───

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractJson(text) {
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('لا يوجد JSON في رد Gemini');
  return JSON.parse(s.slice(start, end + 1));
}

function buildArticlePrompt(trends) {
  const list = trends
    .map((t, i) => `${i + 1}. [${t.region}] ${t.title}${t.traffic ? ` (${t.traffic} بحث)` : ''}`)
    .join('\n');
  return `أنت كاتب تحليلي قانوني خبير في تحرير النشرة اليومية لموقع «منصة المحامي الرقمية» (مصري).

أهم الترندات الفعلية على Google اليوم (مصر + العالم):
${list}

اكتب مقال «مقال اليوم» لصفحة رصد المحامي كالتالي:
- العنوان: عنوان جذاب يعكس مضمون أهم الترندات.
- مقدمة: 2-3 جمل تشير لأهم ما يدور عالمياً ومحلياً.
- 3 إلى 5 أقسام، كل قسم يغطي ترنداً مهماً واحداً من القائمة من زاوية تحليلية عملية للمواطن المصري والمحامي (انعكاسه القانوني أو الاقتصادي أو الاجتماعي إن وُجد — دون اختلاق صلة قانونية حين لا توجد).
- كل قسم: عنوان قصير + 2-3 فقرات (60-100 كلمة للفقرة).
- أسلوب صحفي مهني محايد، عربي فصيح بلا مصطلحات أجنبية، بلا Markdown.
أعد الناتج JSON فقط بهذا الشكل الصارم:
{"title":"...","intro":"...","sections":[{"heading":"...","body":"...\n\n..."}]}`;
}

async function generateArticle(trends) {
  let ai = null;
  try {
    // eslint-disable-next-line global-require
    const { GoogleGenAI } = require('@google/genai');
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    log('[radar] ⚠️ @google/genai غير متاح — لن يُولَّد مقال اليوم');
    return null;
  }

  const prompt = buildArticlePrompt(trends);
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      log(`[radar] ✍️ توليد مقال اليوم عبر Gemini (${model})...`);
      const result = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.7 },
      });
      const text = result?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      if (!text) throw new Error('رد فارغ');
      const article = extractJson(text);
      if (!article.title || !article.sections?.length) throw new Error('بنية مقال غير صالحة');
      log(`[radar] ✅ اكتمل مقال اليوم (${article.sections.length} أقسام): ${article.title}`);
      return article;
    } catch (e) {
      log(`[radar] ⚠️ محاولة ${model} فشلت: ${e.message}`);
      if (e.status === 429 || String(e.message).includes('429') || String(e.message).includes('Quota')) {
        await sleep(15000);
      }
    }
  }
  return null;
}

// ─── الأرشيف ───

function loadArchive() {
  try {
    if (fs.existsSync(ARCHIVE_FILE)) {
      const data = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
      if (Array.isArray(data.articles)) return data.articles;
    }
  } catch (e) {
    log(`[radar] ⚠️ أرشيف تالف — نبدأ من جديد: ${e.message}`);
  }
  return [];
}

function saveArchive(articles) {
  const data = {
    baseUrl: BASE_URL,
    updatedAt: cairoNow(),
    articles: articles.slice(0, MAX_ARCHIVE),
  };
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── البناء ───

function buildTopicCards(article) {
  if (!article) return '';
  const cards = (article.sections || [])
    .map(
      (s, i) => `<article class="topic-card">
        <div class="topic-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="topic-body">
          <h3>${esc(s.heading)}</h3>
          ${String(s.body || '')
            .split(/\n+/)
            .map((p) => `<p>${esc(p.trim())}</p>`)
            .join('\n          ')}
        </div>
      </article>`
    )
    .join('\n    ');
  return cards;
}

function buildArticle(article, date) {
  if (!article) return '';
  return `<section class="article" id="article-today">
    <div class="article-badge">📰 موضوعات اليوم — ${esc(date)}</div>
    <h2 class="article-title">${esc(article.title)}</h2>
    <div class="article-intro">
      ${esc(article.intro || '').split(/\n+/).map((p) => `<p>${esc(p.trim())}</p>`).join('\n      ')}
    </div>
    <div class="topic-grid">
    ${buildTopicCards(article)}
    </div>
  </section>`;
}

function buildArchive(entries) {
  if (!entries.length) return '';
  const details = entries
    .map((e) => {
      const sections = (e.article?.sections || [])
        .map(
          (s) => `<div class="arch-sec">
            <h4>${esc(s.heading)}</h4>
            ${String(s.body || '')
              .split(/\n+/)
              .map((p) => `<p>${esc(p.trim())}</p>`)
              .join('\n            ')}
          </div>`
        )
        .join('\n          ');
      return `<details class="arch-item">
    <summary>${esc(e.date)} — ${esc(e.article?.title || 'مقال اليوم')}</summary>
    <div class="arch-body">
      ${esc(e.article?.intro || '')}
      ${sections}
    </div>
  </details>`;
    })
    .join('\n  ');
  return `<div class="archive">
    <div class="section-title"><span class="dot dot-cyan"></span> أرشيف الأيام الأخيرة</div>
    <p class="section-sub">مقالات رصد المحامي السابقة — اضغط على أي يوم لعرض مقاله كاملاً.</p>
    ${details}
  </div>`;
}

function buildPage(todayArticle, archiveEntries, generatedAt) {
  const articleHtml = buildArticle(todayArticle, todayStr());
  const archiveHtml = buildArchive(archiveEntries);
  const nowISO = new Date(Date.now() + 120 * 60000).toISOString();

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>رصد المحامي</title>
  <meta name="description" content="رصد المحامي — نشرة يومية تحليلية لأهم الترندات المصرية والعالمية على Google، بصياغة تحليلية عملية للمواطن والمحامي المصري." />
  <meta name="keywords" content="رصد المحامي, ترندات مصر, أخبار مصر اليوم, الأكثر بحثاً, ترند جوجل مصر, أخبار عربية, أخبار عالمية, تحليل ترندات" />
  <meta name="author" content="منصة المحامي الرقمية" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${BASE_URL}/legal-radar.html" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="رصد المحامي" />
  <meta property="og:description" content="نشرة يومية تحليلية لأهم الترندات المصرية والعالمية على Google." />
  <meta property="og:url" content="${BASE_URL}/legal-radar.html" />
  <meta property="og:site_name" content="منصة المحامي الرقمية" />
  <meta property="og:locale" content="ar_EG" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}" crossorigin="anonymous"></script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}","logo":"${BASE_URL}/logo.png"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"${esc(todayArticle?.title || 'رصد المحامي — مقال اليوم')}","datePublished":"${nowISO}","dateModified":"${nowISO}","inLanguage":"ar-EG","author":{"@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"publisher":{"@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"mainEntityOfPage":"${BASE_URL}/legal-radar.html"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"${BASE_URL}"},{"@type":"ListItem","position":2,"name":"رصد المحامي","item":"${BASE_URL}/legal-radar.html"}]}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f172a;
      --border: rgba(148,163,184,0.12);
      --indigo: #6366f1;
      --purple: #7c3aed;
      --emerald: #10b981;
      --rose: #f43f5e;
      --cyan: #06b6d4;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --card-bg: rgba(15,23,42,0.7);
    }
    html { scroll-behavior: smooth; scroll-padding-top: 90px; }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.8;
      background-image:
        radial-gradient(ellipse at 30% 0%, rgba(124,58,237,0.18) 0%, transparent 55%),
        radial-gradient(ellipse at 90% 70%, rgba(16,185,129,0.1) 0%, transparent 50%);
    }

    nav { position: sticky; top: 0; z-index: 100; background: rgba(15,23,42,0.82); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .logo-icon { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, var(--indigo), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 20px rgba(99,102,241,0.35); }
    .logo-name { font-size: 15px; font-weight: 900; color: #fff; line-height: 1.2; }
    .logo-sub { font-size: 10px; color: var(--emerald); font-weight: 700; }
    .nav-links { display: flex; align-items: center; gap: 28px; }
    .nav-links a { font-size: 13px; font-weight: 700; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--indigo); }
    .nav-cta { padding: 9px 22px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), var(--purple)); color: #fff; font-size: 12px; font-weight: 900; text-decoration: none; box-shadow: 0 4px 16px rgba(99,102,241,0.3); }

    .breadcrumbs { max-width: 1200px; margin: 0 auto; padding: 14px 24px 0; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .breadcrumbs a { color: var(--muted); text-decoration: none; transition: color 0.2s; font-weight: 700; }
    .breadcrumbs a:hover { color: var(--indigo); }
    .breadcrumbs .current { color: var(--text); font-weight: 800; }
    .breadcrumbs .sep { color: var(--muted); opacity: 0.4; font-size: 10px; }

    .hero { max-width: 860px; margin: 0 auto; padding: 50px 24px 28px; text-align: center; }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 999px; background: rgba(244,63,94,0.12); border: 1px solid rgba(244,63,94,0.3); color: #fda4af; font-size: 11px; font-weight: 800; margin-bottom: 20px; }
    .hero h1 { font-size: clamp(1.9rem, 5vw, 3.1rem); font-weight: 900; line-height: 1.25; margin-bottom: 16px; background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 50%, #fda4af 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 16px; color: var(--muted); max-width: 640px; margin: 0 auto; font-weight: 600; }
    .updated { display: inline-block; margin-top: 16px; padding: 6px 16px; border-radius: 999px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #6ee7b7; font-size: 11px; font-weight: 800; }

    .section { max-width: 900px; margin: 0 auto; padding: 0 24px 40px; }
    .section-title { font-size: 20px; font-weight: 900; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 10px; }
    .section-title .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--rose); box-shadow: 0 0 14px rgba(244,63,94,0.7); animation: pulse 2s infinite; }
    .section-title .dot-cyan { background: var(--cyan); box-shadow: 0 0 14px rgba(6,182,212,0.7); }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.35)} }
    .section-sub { font-size: 13px; color: var(--muted); margin-bottom: 22px; }

    .article { max-width: 900px; margin: 0 auto; padding: 0 24px 40px; }
    .article-badge { display: inline-block; padding: 6px 16px; border-radius: 999px; background: rgba(244,63,94,0.12); border: 1px solid rgba(244,63,94,0.3); color: #fda4af; font-size: 11px; font-weight: 800; margin-bottom: 14px; }
    .article-title { font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 900; color: #fff; line-height: 1.4; margin-bottom: 10px; }
    .article-intro { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 18px 22px; margin-bottom: 20px; }
    .article-intro p { font-size: 14.5px; color: #e2e8f0; margin-bottom: 10px; }
    .article-intro p:last-child { margin-bottom: 0; }

    .topic-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .topic-card { display: flex; gap: 16px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 18px; padding: 20px 22px; transition: border-color 0.25s, transform 0.25s; }
    .topic-card:hover { border-color: rgba(244,63,94,0.35); transform: translateY(-3px); }
    .topic-num { font-size: 20px; font-weight: 900; color: transparent; background: linear-gradient(135deg, #f43f5e, #a855f7); -webkit-background-clip: text; background-clip: text; min-width: 40px; text-align: center; line-height: 1.3; }
    .topic-body h3 { font-size: 15.5px; font-weight: 900; color: #fff; line-height: 1.5; margin-bottom: 8px; }
    .topic-body p { font-size: 13.5px; color: #cbd5e1; line-height: 1.85; margin-bottom: 8px; }
    .topic-body p:last-child { margin-bottom: 0; }

    .archive { max-width: 900px; margin: 0 auto; padding: 0 24px 56px; }
    .arch-item { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
    .arch-item summary { cursor: pointer; padding: 15px 20px; font-size: 14px; font-weight: 800; color: #e2e8f0; list-style: none; display: flex; align-items: center; gap: 10px; transition: color 0.2s; }
    .arch-item summary:hover { color: #a5b4fc; }
    .arch-item summary::before { content: "◀"; font-size: 10px; color: var(--cyan); transition: transform 0.2s; }
    .arch-item[open] summary::before { transform: rotate(-90deg); }
    .arch-body { padding: 0 22px 18px; font-size: 14px; color: #cbd5e1; border-top: 1px dashed var(--border); padding-top: 14px; }
    .arch-body p { margin-bottom: 10px; }
    .arch-sec { margin-top: 14px; }
    .arch-sec h4 { font-size: 14px; font-weight: 900; color: #fda4af; margin-bottom: 6px; }

    .ad-slot { margin: 28px auto; max-width: 100%; text-align: center; min-height: 90px; }
    .ad-label { display: block; font-size: 10px; color: var(--muted); text-align: center; margin-bottom: 6px; letter-spacing: 0.5px; font-weight: 700; }

    .cta-section { text-align: center; padding: 0 24px 64px; }
    .cta-btn { display: inline-flex; align-items: center; gap: 10px; padding: 15px 44px; border-radius: 14px; background: linear-gradient(135deg, var(--emerald), #0891b2, var(--indigo)); color: #fff; font-size: 14px; font-weight: 900; text-decoration: none; box-shadow: 0 8px 32px rgba(16,185,129,0.25); }

    footer { border-top: 1px solid var(--border); background: rgba(15,23,42,0.95); padding: 56px 24px 32px; }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 36px; }
    .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .footer-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .footer-logo-name { font-size: 15px; font-weight: 900; color: #fff; }
    .footer-desc { font-size: 12px; color: var(--muted); line-height: 1.8; max-width: 280px; }
    .footer-email { font-size: 12px; color: var(--indigo); margin-top: 10px; font-weight: 700; }
    .footer-email a { color: var(--indigo); text-decoration: none; }
    .footer-col h4 { font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 14px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
    .footer-col ul a { font-size: 12px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .footer-col ul a:hover { color: var(--indigo); }
    .footer-bottom { border-top: 1px solid rgba(148,163,184,0.08); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(148,163,184,0.5); }

    @media (max-width: 760px) { .topic-grid { grid-template-columns: 1fr; } .footer-grid { grid-template-columns: 1fr; gap: 28px; } .nav-links { display: none; } }
  </style>
</head>
<body>
  <nav>
    <div class="nav-inner">
      <a href="/" class="nav-logo">
        <div class="logo-icon">⚖️</div>
        <div>
          <div class="logo-name">منصة المحامي الرقمية</div>
          <div class="logo-sub">مجاني 100% • نظام إدارة مكاتب المحاماة</div>
        </div>
      </a>
      <div class="nav-links">
        <a href="/">الرئيسية</a>
        <a href="/features.html">المميزات</a>
        <a href="/blog/">المدونة</a>
        <a href="/legal-forms.html">صيغ العقود والدعاوي</a>
        <a href="/contact.html">تواصل معنا</a>
      </div>
      <a href="/" class="nav-cta">دخول المنصة مجاناً 🚀</a>
    </div>
  </nav>
  <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span class="sep">›</span><span class="current">رصد المحامي</span></nav>

  <div class="hero">
    <div class="badge">📡 نشرة يومية — ترندات مصر والعالم</div>
    <h1>رصد المحامي</h1>
    <p>نشرة يومية تُصاغ بالذكاء الاصطناعي عن أهم الترندات المصرية والعالمية على Google، بتحليل عملي للمواطن والمحامي.</p>
    <span class="updated">آخر تحديث: ${esc(generatedAt)} بتوقيت القاهرة</span>
  </div>

  ${articleHtml}

  <!-- TOP AD -->
  <div class="ad-slot" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  ${archiveHtml}

  <div class="cta-section">
    <a href="/" class="cta-btn">جرّب منصة المحامي الرقمية مجاناً 🚀</a>
  </div>

  <footer>
    <div class="footer-inner">
      <div class="footer-grid">
        <div>
          <div class="footer-logo">
            <div class="footer-logo-icon">⚖️</div>
            <span class="footer-logo-name">منصة المحامي الرقمية</span>
          </div>
          <p class="footer-desc">النظام البرمجي المتكامل والمجاني لإدارة مكاتب المحاماة في جمهورية مصر العربية.</p>
          <p class="footer-email">التواصل: <a href="mailto:ahmdmansoor222@gmail.com">ahmdmansoor222@gmail.com</a></p>
        </div>
        <div class="footer-col">
          <h4>أقسام المنصة</h4>
          <ul>
            <li><a href="/">الرئيسية</a></li>
            <li><a href="/about.html">عن المنصة</a></li>
            <li><a href="/features.html">المميزات</a></li>
            <li><a href="/blog/">المدونة القانونية</a></li>
            <li><a href="/pillars/">المراجع القانونية</a></li>
            <li><a href="/legal-forms.html">صيغ العقود والدعاوي</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>السياسات والتواصل</h4>
          <ul>
            <li><a href="/legal-radar.html">رصد المحامي</a></li>
            <li><a href="/privacy.html">سياسة الخصوصية</a></li>
            <li><a href="/terms.html">شروط الاستخدام</a></li>
            <li><a href="/contact.html">تواصل معنا</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 منصة المحامي الرقمية — جميع الحقوق محفوظة</span>
        <span>محتوى تحليلي استرشادي — يُراجع مع مختص قبل الاعتماد عليه</span>
      </div>
    </div>
  </footer>

  <script>
    (function() {
      try {
        var p = new URLSearchParams(window.location.search);
        if (p.get('from') === 'app') {
          var cta = document.querySelector('.nav-cta');
          if (cta) { cta.innerHTML = '← العودة إلى لوحة التحكم'; cta.setAttribute('href', '/'); }
        }
      } catch(e) {}
    })();
  </script>
</body>
</html>
`;
}

// ─── المدخل الرئيسي ───

async function main() {
  const generatedAt = cairoNow();
  const today = todayStr();

  // 1) جلب الترندات
  const freshTrends = await fetchTrends();
  if (!freshTrends.length) {
    log('[radar] ⚠️ لا توجد بيانات ترندات متاحة — لن تُحدَّث الصفحة.');
    process.exit(0);
  }

  // 2) الأرشيف
  const articles = loadArchive();
  let todayEntry = articles.find((e) => e.date === today);

  // 3) مقال اليوم (مرة واحدة فقط في اليوم)
  if (!todayEntry && process.env.GEMINI_API_KEY) {
    const article = await generateArticle(freshTrends);
    if (article) {
      todayEntry = {
        date: today,
        generatedAt,
        title: article.title,
        article,
        trends: freshTrends,
      };
      articles.unshift(todayEntry);
      saveArchive(articles);
    }
  }

  const archiveEntries = articles.filter((e) => e.date !== today).slice(0, MAX_ARCHIVE_SHOWN);

  // 4) بناء الصفحة
  const html = buildPage(todayEntry?.article || null, archiveEntries, generatedAt);
  fs.writeFileSync(OUT_FILE, html, 'utf8');

  const articleStatus = todayEntry ? `موضوعات: «${todayEntry.title}»` : (process.env.GEMINI_API_KEY ? 'لا موضوعات (فشل التوليد)' : 'بدون GEMINI_API_KEY');
  log(`[radar] ✅ تم توليد ${OUT_FILE} (${articleStatus} | أرشيف ${archiveEntries.length} يوم)`);
}

main().catch((e) => {
  console.error('[radar] ❌ خطأ:', e.message);
  process.exit(0);
});
