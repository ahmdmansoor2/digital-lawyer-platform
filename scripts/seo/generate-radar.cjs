#!/usr/bin/env node
/**
 * generate-radar.cjs — توليد/تحديث صفحة «رصد المحامي» (legal-radar.html)
 * + صفحة مستقلة لكل موضوع في public/radar-topics/
 *
 * آلية العمل اليومية:
 *   1. يجلب أهم ترندات Google لمصر (geo=EG) وللعالم (RSS بلا geo).
 *   2. يستخدم Gemini لاختيار «موضوعات اليوم» (عنوان + ملخص لكل موضوع).
 *   3. يولّد لكل موضوع مقالاً متعمقاً كاملاً (لا يقل عن 3000 كلمة) بواسطة
 *      بنداء منفصل لكل موضوع (مع استدعاء تمديد تلقائي لو نقص العدد).
 *   4. ينشر البطاقات (Card) — كل بطاقة رابط يفتح صفحة مستقلة تحمل الموضوع
 *      الكامل (public/radar-topics/<date>-<slug>.html) مع أرشيف آخر الأيام.
 *
 * ملاحظات:
 *   - الموضوعات تُولَّد مرة واحدة يومياً فقط (تُخزَّن في public/radar-archive.json
 *     ويُتجاهل لو اليوم موجود بالفعل) حتى لا تُستنزف حصة Gemini في الرنات
 *     المتكررة (الـ workflow يعمل حتى 5 مرات يومياً).
 *   - بدون GEMINI_API_KEY تتحول الصفحة لوضع عرض الترندات فقط (بدون موضوعات).
 *   - تُشغَّل تلقائياً في daily-blog-post.yml بعد الناشر الذكي.
 *
 * الاستخدام:
 *   GEMINI_API_KEY=... node scripts/seo/generate-radar.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { headerMarkup, HEADER_CSS } = require('./unified-header.cjs');

const ROOT = path.join(__dirname, '..', '..');
try {
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: path.join(ROOT, '.env') });
} catch {}

const OUT_FILE = path.join(ROOT, 'public', 'legal-radar.html');
const TOPICS_DIR = path.join(ROOT, 'public', 'radar-topics');
const ARCHIVE_FILE = path.join(ROOT, 'public', 'radar-archive.json');
const BASE_URL = 'https://mohamidigital.online';
const EG_FEED = 'https://trends.google.com/trending/rss?geo=EG';
const WORLD_FEED = 'https://trends.google.com/trending/rss';
const MAX_TRENDS = 10;
const MAX_TOPICS = 3;
const MIN_TOPIC_WORDS = 3000;
const MAX_ARCHIVE = 12;
const MAX_ARCHIVE_SHOWN = 7;
const AD_CLIENT = 'ca-pub-7725405859334364';
const AD_SLOT = '2168039898';
const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash'];

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

function topicSlug(t, i) {
  const s = String(t.slug || '').replace(/[^\w-]/g, '');
  return s || `topic-${i + 1}`;
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

// ─── Gemini: اختيار موضوعات اليوم + توليد الموضوعات الكاملة ───

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

function getAi() {
  try {
    // eslint-disable-next-line global-require
    const { GoogleGenAI } = require('@google/genai');
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    log('[radar] ⚠️ @google/genai غير متاح');
    return null;
  }
}

function isQuotaError(e) {
  const msg = String((e && e.message) || e);
  return e?.status === 429 || msg.includes('429') || msg.includes('Quota') || msg.includes('quota');
}

function buildTrendsList(trends) {
  return trends
    .map((t, i) => `${i + 1}. [${t.region}] ${t.title}${t.traffic ? ` (${t.traffic} بحث)` : ''}`)
    .join('\n');
}

function buildTopicsPrompt(trends) {
  const list = buildTrendsList(trends);
  return `أنت محرر نشرة «رصد المحامي» لموقع «منصة المحامي الرقمية» (مصري).

أهم الترندات الفعلية على Google اليوم (مصر + العالم):
${list}

اختر ${MAX_TOPICS} موضوعات هي الأهم بينها (الأكثر تأثيراً على المواطن المصري والمحامي، أو الأقرب للشأن القانوني والاقتصادي والاجتماعي) دون اختلاق صلة قانونية حين لا توجد.
لكل موضوع:
- slug: معرّف إنجليزي قصير بلا فراغات.
- title: عنوان جذاب يعكس الخبر/الموضوع.
- summary: ملخص للخبر في 2-3 جمل (60-90 كلمة) يلخص الحدث ولماذا يهم القارئ.
أعد الناتج JSON فقط بهذا الشكل الصارم:
{"topics":[{"slug":"...","title":"...","summary":"..."}]}`;
}

function buildTopicArticlePrompt(topic, trends) {
  const list = buildTrendsList(trends);
  return `أنت كاتب تحليلي قانوني مصري خبير، تكتب موضوعاً متعمقاً لصفحة «رصد المحامي».

الموضوع: ${topic.title}
ملخصه: ${topic.summary}
ترندات اليوم كسياق:
${list}

اكتب موضوعاً شاملاً عميقاً لا يقل عن ${MIN_TOPIC_WORDS} كلمة عربية (عدّ الكلمات بنفسك)، مرتّباً في 5-7 أقسام، كل قسم بعنوان فرعي قصير.
المطلوب في المحتوى:
- تغطية الخبر/الظاهرة من كل زاوية: الوقائع، السياق، الانعكاس القانوني (إن وُجد مع ذكر القانون والمادة بحذر ودون اختلاق أرقام)، الانعكاس الاقتصادي/الاجتماعي، آراء الخبراء، الأسئلة الشائعة، والتوقعات.
- كل قسم: 3-5 فقرات قصيرة (70-120 كلمة) سهلة القراءة، مع عدم كتابة قسم "الخلاصة" النهائية.
- أسلوب صحفي مهني محايد، عربي فصيح، بلا Markdown، بلا ترويسات.
أعد الناتج JSON فقط بهذا الشكل الصارم:
{"sections":[{"heading":"...","body":"..."}]}`;
}

function buildContinuePrompt(topic, currentWords) {
  return `موضوعك عن «${topic.title}» بلغ ${currentWords} كلمة ونحن بحاجة إلى ما لا يقل عن ${MIN_TOPIC_WORDS} كلمة.
أكمل التوسّع بإضافة أقسام وفقرات جديدة (زوايا وأمثلة وتفاصيل جديدة) دون تكرار ما سبق، ولا تكتب خاتمة نهائية.
أعد JSON فقط: {"sections":[{"heading":"...","body":"..."}]}`;
}

async function runGenText(ai, model, prompt, isQuota) {
  const result = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0.7, maxOutputTokens: 8192 },
  });
  const text = result?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) throw new Error('رد فارغ');
  return text;
}

async function generateTopics(ai, trends) {
  const prompt = buildTopicsPrompt(trends);
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      log(`[radar] ✍️ اختيار موضوعات اليوم عبر Gemini (${model})...`);
      const text = await runGenText(ai, model, prompt);
      const data = extractJson(text);
      const topics = (data.topics || [])
        .slice(0, MAX_TOPICS)
        .map((t) => ({ slug: String(t.slug || '').replace(/[^\w-]/g, '-'), title: String(t.title || '').trim(), summary: String(t.summary || '').trim() }))
        .filter((t) => t.title);
      if (!topics.length) throw new Error('لا موضوعات في الرد');
      log(`[radar] ✅ اختير ${topics.length} موضوعات: ${topics.map((t) => t.title).join(' | ')}`);
      return topics;
    } catch (e) {
      log(`[radar] ⚠️ محاولة ${model} فشلت: ${e.message}`);
      if (isQuotaError(e)) await sleep(15000);
    }
  }
  return [];
}

function countTopicWords(sections) {
  return (sections || []).reduce((n, s) => n + String(s.body || '').trim().split(/\s+/).filter(Boolean).length, 0);
}

async function extendTopicArticle(ai, topic, currentWords) {
  const prompt = buildContinuePrompt(topic, currentWords);
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      const text = await runGenText(ai, model, prompt);
      const data = extractJson(text);
      if (Array.isArray(data.sections)) return data.sections;
    } catch (e) {
      log(`[radar] ⚠️ تمديد ${model} فشل: ${e.message}`);
      if (isQuotaError(e)) await sleep(15000);
    }
  }
  return null;
}

async function generateTopicArticle(ai, topic, trends) {
  const prompt = buildTopicArticlePrompt(topic, trends);
  let sections = [];
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      log(`[radar] ✍️ توليد موضوع «${topic.title}» عبر Gemini (${model})...`);
      const text = await runGenText(ai, model, prompt);
      const data = extractJson(text);
      if (Array.isArray(data.sections) && data.sections.length) {
        sections = data.sections;
        break;
      }
      throw new Error('بنية موضوع غير صالحة');
    } catch (e) {
      log(`[radar] ⚠️ محاولة ${model} فشلت: ${e.message}`);
      if (isQuotaError(e)) await sleep(15000);
    }
  }
  if (!sections.length) return null;
  let words = countTopicWords(sections);
  log(`[radar] ℹ️ «${topic.title}»: ${sections.length} قسم / ${words} كلمة`);
  if (words < MIN_TOPIC_WORDS) {
    log(`[radar] ✍️ تمديد «${topic.title}» للوصول إلى ${MIN_TOPIC_WORDS}+ كلمة...`);
    const extra = await extendTopicArticle(ai, topic, words);
    if (Array.isArray(extra) && extra.length) sections = sections.concat(extra);
    words = countTopicWords(sections);
  }
  log(`[radar] ✅ «${topic.title}»: ${sections.length} قسم / ${words} كلمة`);
  return { sections };
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

function buildTopicSectionsHtml(t, emptyHint) {
  const sections = t.sections || [];
  if (!sections.length) {
    return `<div class="full-sec full-empty"><p>${esc(emptyHint || '🕐 المحتوى الكامل لهذا الموضوع قيد التوليد — سيظهر تلقائياً في التحديث القادم.')}</p></div>`;
  }
  return sections
    .map(
      (s) => `<div class="full-sec">
        <h4>${esc(s.heading)}</h4>
        ${String(s.body || '')
          .split(/\n+/)
          .map((p) => `<p>${esc(p.trim())}</p>`)
          .join('\n        ')}
      </div>`
    )
    .join('\n    ');
}

function buildTopicCard(t, i, date, isToday) {
  const words = countTopicWords(t.sections || []);
  const hint = words > 0
    ? `📖 افتح الموضوع الكامل (${words.toLocaleString('ar-EG')} كلمة)`
    : '📖 افتح الموضوع الكامل';
  const href = `/radar-topics/${date}-${topicSlug(t, i)}.html`;
  const dateBadge = isToday
    ? `<span class="card-date today-badge">🔴 اليوم — ${esc(date)}</span>`
    : `<span class="card-date">${esc(date)}</span>`;
  return `<a class="topic-card" href="${href}" title="افتح الصفحة الكاملة: ${esc(t.title)}">
      <div class="topic-head">
        <div class="card-top-row">${dateBadge}</div>
        <div class="topic-body">
          <h3>${esc(t.title)}</h3>
          <p>${esc(t.summary || '')}</p>
          <span class="topic-hint">${hint}</span>
        </div>
      </div>
  </a>`;
}

function buildToday(topics, date) {
  // لا تُستخدم منفردة — تُدمج في buildAllCards
  return '';
}

function normalizeEntryTopics(e) {
  if (Array.isArray(e?.topics) && e.topics.length) return e.topics;
  if (e?.article) {
    return [
      {
        title: e.article.title || 'مقال اليوم',
        summary: e.article.intro || '',
        sections: e.article.sections || [],
        image: null,
      },
    ];
  }
  return [];
}

// buildArchive: لم تعد تُستخدم — استُبدلت بـ buildAllCards
function buildArchive(entries) { return ''; }

// عرض جميع الموضوعات (اليوم + الأرشيف) في شبكة بطاقات موحدة
function buildAllCards(todayTopics, archiveEntries, today) {
  const allCards = [];

  // موضوعات اليوم أولاً (مع شارة "اليوم")
  if (todayTopics && todayTopics.length) {
    todayTopics.forEach((t, i) => {
      allCards.push(buildTopicCard(t, i, today, true));
    });
  }

  // موضوعات الأرشيف بعدها
  archiveEntries.forEach((e) => {
    const topics = normalizeEntryTopics(e);
    topics.forEach((t, i) => {
      allCards.push(buildTopicCard(t, i, e.date, false));
    });
  });

  if (!allCards.length) return '';

  const totalTopics = allCards.length;
  const totalDays = (todayTopics.length ? 1 : 0) + archiveEntries.length;

  return `<div class="section">
    <div class="section-title"><span class="dot"></span> جميع الموضوعات (${totalTopics} موضوعاً — ${totalDays} يوم)</div>
    <p class="section-sub">موضوعات رصد المحامي اليومية — اضغط على أي بطاقة لفتح الموضوع الكامل.</p>
    <div class="topic-grid">
    ${allCards.join('\n    ')}
    </div>
  </div>`;
}

// ─── الصفحة المستقلة للموضوع ───

function buildTopicPage(t, i, date) {
  const slug = topicSlug(t, i);
  const pageUrl = `${BASE_URL}/radar-topics/${date}-${slug}.html`;
  const nowISO = new Date(Date.now() + 120 * 60000).toISOString();
  const words = countTopicWords(t.sections || []);
  const full = buildTopicSectionsHtml(t);
  const schemas = [
    `{"@context":"https://schema.org","@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}","logo":"${BASE_URL}/logo.png"}`,
    `{"@context":"https://schema.org","@type":"NewsArticle","headline":"${esc(t.title)}","description":"${esc(t.summary || '')}","datePublished":"${date}T00:00:00+02:00","dateModified":"${nowISO}","inLanguage":"ar-EG","author":{"@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"publisher":{"@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"mainEntityOfPage":"${pageUrl}"}`,
    `{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"${BASE_URL}"},{"@type":"ListItem","position":2,"name":"رصد المحامي","item":"${BASE_URL}/legal-radar.html"},{"@type":"ListItem","position":3,"name":"${esc(t.title)}","item":"${pageUrl}"}]}`,
  ];
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(t.title)} - رصد المحامي | منصة المحامي الرقمية</title>
  <meta name="description" content="${esc(t.summary || `موضوع رصد المحامي عن ${t.title}`)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${pageUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(t.title)}" />
  <meta property="og:description" content="${esc(t.summary || '')}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:site_name" content="منصة المحامي الرقمية" />
  <meta property="og:locale" content="ar_EG" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}" crossorigin="anonymous"></script>
  ${HEADER_CSS}
${schemas.map((s) => `  <script type="application/ld+json">${s}</script>`).join('\n')}
  <style>
${RADAR_CSS}
  </style>
</head>
<body>
  ${headerMarkup('radar')}
  <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span class="sep">›</span><a href="/legal-radar.html">رصد المحامي</a><span class="sep">›</span><span class="current">${esc(t.title)}</span></nav>

  <div class="article">
    <a class="back-link" href="/legal-radar.html">→ العودة إلى رصد المحامي</a>
    <div class="topic-page-head">
      <span class="topic-page-date">📅 ${esc(date)}${words ? ` — ${words.toLocaleString('ar-EG')} كلمة` : ''}</span>
      <h1>${esc(t.title)}</h1>
      <p>${esc(t.summary || '')}</p>
    </div>
    <div class="topic-page-body">
      ${full}
    </div>
  </div>

  <!-- AD -->
  <div class="ad-slot" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

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
          var cta = document.querySelector('.uh-cta');
          if (cta) { cta.innerHTML = '← العودة إلى لوحة التحكم'; cta.setAttribute('href', '/'); }
        }
      } catch(e) {}
    })();
  </script>
</body>
</html>
`;
}

function buildPage(todayTopics, archiveEntries, generatedAt) {
  const allCardsHtml = buildAllCards(todayTopics, archiveEntries, todayStr());
  const nowISO = new Date(Date.now() + 120 * 60000).toISOString();
  const headline = todayTopics?.[0]?.title || 'رصد المحامي — موضوعات اليوم';

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
  ${HEADER_CSS}
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}","logo":"${BASE_URL}/logo.png"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"${esc(headline)}","datePublished":"${nowISO}","dateModified":"${nowISO}","inLanguage":"ar-EG","author":{"@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"publisher":{"@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"mainEntityOfPage":"${BASE_URL}/legal-radar.html"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"${BASE_URL}"},{"@type":"ListItem","position":2,"name":"رصد المحامي","item":"${BASE_URL}/legal-radar.html"}]}</script>
  <style>
${RADAR_CSS}
  </style>
</head>
<body>
  ${headerMarkup('radar')}
  <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span class="sep">›</span><span class="current">رصد المحامي</span></nav>

  <div class="hero">
    <h1>رصد المحامي</h1>
    <p>نشرة يومية تُصاغ بالذكاء الاصطناعي عن أهم الترندات المصرية والعالمية على Google، بتحليل عملي للمواطن والمحامي.</p>
    <span class="updated">آخر تحديث: ${esc(generatedAt)} بتوقيت القاهرة</span>
  </div>

  ${allCardsHtml}

  <!-- AD -->
  <div class="ad-slot" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

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
          var cta = document.querySelector('.uh-cta');
          if (cta) { cta.innerHTML = '← العودة إلى لوحة التحكم'; cta.setAttribute('href', '/'); }
        }
      } catch(e) {}
    })();
  </script>
</body>
</html>
`;
}

const RADAR_CSS = `    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
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

    .section { max-width: 1200px; margin: 0 auto; padding: 0 24px 60px; }
    .section-title { font-size: 22px; font-weight: 900; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 10px; }
    .section-title .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--rose); box-shadow: 0 0 14px rgba(244,63,94,0.7); animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.35)} }
    .section-sub { font-size: 14px; color: var(--muted); margin-bottom: 28px; }

    .article { max-width: 900px; margin: 0 auto; padding: 0 24px 40px; }

    .back-link { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; border: 1px solid rgba(6,182,212,0.3); background: rgba(6,182,212,0.08); color: #67e8f9; font-family: inherit; font-size: 12.5px; font-weight: 800; text-decoration: none; margin: 18px 0 10px; transition: background 0.2s; }
    .back-link:hover { background: rgba(6,182,212,0.16); }

    .topic-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 48px; align-items: stretch; }
    @media (max-width: 992px) { .topic-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .topic-grid { grid-template-columns: 1fr; gap: 16px; } }

    a.topic-card { text-decoration: none; color: inherit; display: flex; flex-direction: column; }
    .topic-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; height: 100%; position: relative; }
    .topic-card:hover { transform: translateY(-5px); border-color: rgba(99,102,241,0.5); box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.15); }
    
    .topic-head { display: flex; flex-direction: column; padding: 22px 22px 20px; flex: 1; }
    .card-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
    .card-date { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #94a3b8; background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.2); padding: 4px 12px; border-radius: 999px; }
    .today-badge { color: #fda4af; background: rgba(244,63,94,0.12); border-color: rgba(244,63,94,0.3); font-weight: 800; }
    
    .topic-body h3 { font-size: 16px; font-weight: 800; color: #fff; line-height: 1.55; margin-bottom: 10px; transition: color 0.2s; }
    .topic-card:hover .topic-body h3 { color: #a5b4fc; }
    .topic-body p { font-size: 13px; color: var(--muted); line-height: 1.75; margin-bottom: 16px; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .topic-hint { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: #67e8f9; margin-top: auto; transition: gap 0.2s; }
    .topic-hint::after { content: "←"; font-size: 12px; transition: transform 0.2s; }
    .topic-card:hover .topic-hint::after { transform: translateX(-4px); }

    .topic-full { padding: 8px 22px 22px; border-top: 1px dashed var(--border); margin-top: 4px; }
    .full-sec { padding: 18px 0 6px; }
    .full-sec h4 { font-size: 19px; font-weight: 900; color: #38bdf8; margin: 24px 0 12px; line-height: 1.5; }
    .full-sec p { font-size: 17.5px; color: #f1f5f9; font-weight: 500; margin-bottom: 18px; line-height: 2.05; text-align: justify; letter-spacing: 0.015em; }
    .full-empty { border-top: none !important; text-align: center; }
    .full-empty p { color: var(--muted); font-size: 14px; margin: 8px 0; }

    .topic-page-head { margin: 24px 0 20px; }
    .topic-page-date { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: var(--cyan); background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.25); padding: 5px 14px; border-radius: 999px; margin-bottom: 14px; }
    .topic-page-head h1 { font-size: clamp(1.8rem, 4.5vw, 2.6rem); font-weight: 900; color: #fff; line-height: 1.35; margin-bottom: 14px; }
    .topic-page-head p { font-size: 16px; color: var(--muted); line-height: 1.85; }
    .topic-page-body { padding: 22px 4px 10px; }
    .topic-page-body .full-sec h4 { font-size: 21px; font-weight: 900; color: #38bdf8; margin: 32px 0 14px; border-right: 4px solid var(--cyan); padding-right: 12px; }
    .topic-page-body .full-sec p { font-size: 17.5px; color: #f1f5f9; font-weight: 500; line-height: 2.05; text-align: justify; }

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

    @media (max-width: 980px) { .topic-grid { grid-template-columns: 1fr 1fr; } .arch-body { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 620px) { .topic-grid { grid-template-columns: 1fr; } .arch-body { grid-template-columns: 1fr; } }
    @media (max-width: 760px) { .footer-grid { grid-template-columns: 1fr; gap: 28px; } }`;

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

  // 2.6) تعبئة مقالات اليوم الفارغة فقط (بلا إعادة توليد الموضوعات/الصور) — عند توفر حصة Gemini
  const fillArticles = process.argv.includes('--fill-articles') || process.env.FILL_ARTICLES === '1';
  if (fillArticles && todayEntry?.topics?.length && process.env.GEMINI_API_KEY) {
    const ai = getAi();
    if (ai) {
      for (const t of todayEntry.topics) {
        if (Array.isArray(t.sections) && t.sections.length) continue;
        const article = await generateTopicArticle(ai, t, freshTrends);
        if (article?.sections?.length) {
          t.sections = article.sections;
        } else {
          log(`[radar] ⚠️ «${t.title}»: فشل توليد المقال (حصة Gemini أو خطأ)`);
        }
        await sleep(2000);
      }
      saveArchive(articles);
      log('[radar] 📝 --fill-articles: انتهت محاولة تعبئة مقالات اليوم');
    }
  }

  // 3) موضوعات اليوم (مرة واحدة فقط في اليوم) — مقال كامل لكل بطاقة
  if (!todayEntry && process.env.GEMINI_API_KEY) {
    const ai = getAi();
    if (ai) {
      const topics = await generateTopics(ai, freshTrends);
      if (topics.length) {
        const full = [];
        for (const t of topics) {
          const article = await generateTopicArticle(ai, t, freshTrends);
          full.push({ ...t, sections: article ? article.sections : [] });
          await sleep(2000);
        }
        if (full.length) {
          todayEntry = { date: today, generatedAt, topics: full, trends: freshTrends };
          articles.unshift(todayEntry);
          saveArchive(articles);
        }
      }
    }
  }

  const archiveEntries = articles.filter((e) => e.date !== today).slice(0, MAX_ARCHIVE_SHOWN);

  // 4) الصفحات المستقلة للموضوعات (اليوم + الأرشيف) — تُعاد كتابتها دائماً لتعكس آخر تحديثات المحتوى
  try {
    fs.mkdirSync(TOPICS_DIR, { recursive: true });
    let written = 0;
    for (const e of articles) {
      const topics = normalizeEntryTopics(e);
      topics.forEach((t, i) => {
        const file = path.join(TOPICS_DIR, `${e.date}-${topicSlug(t, i)}.html`);
        fs.writeFileSync(file, buildTopicPage({ ...t }, i, e.date), 'utf8');
        written++;
      });
    }
    log(`[radar] 🗂️ صفحات موضوعات مستقلة: ${written}`);
  } catch (e) {
    log(`[radar] ⚠️ فشل كتابة الصفحات المستقلة: ${e.message}`);
  }

  // 5) بناء الصفحة الرئيسية
  const html = buildPage(todayEntry?.topics || [], archiveEntries, generatedAt);
  fs.writeFileSync(OUT_FILE, html, 'utf8');

  const topicStatus = todayEntry?.topics?.length
    ? `${todayEntry.topics.length} بطاقات (${todayEntry.topics.map((t) => t.title).join(' | ')})`
    : process.env.GEMINI_API_KEY
      ? 'لا موضوعات (فشل التوليد)'
      : 'بدون GEMINI_API_KEY';
  log(`[radar] ✅ تم توليد ${OUT_FILE} (${topicStatus} | أرشيف ${archiveEntries.length} يوم)`);

  // 6) إعادة توليد sitemap لتشمل صفحات radar-topics/ المستقلة (لا تكسر التشغيل عند فشله)
  try {
    execSync('node scripts/blog-publisher/generate-sitemap.cjs', { cwd: ROOT, stdio: 'inherit', env: { ...process.env } });
  } catch (e) {
    log(`[radar] ⚠️ فشل إعادة توليد sitemap: ${e.message}`);
  }
}

main().catch((e) => {
  console.error('[radar] ❌ خطأ:', e.message);
  process.exit(0);
});
