#!/usr/bin/env node
/**
 * generate-rss-digest.cjs — قناتان مملوكتان للجمهور:
 *   1) public/rss.xml        — RSS 2.0 لأحدث 30 عنصراً (مدونة + رادار) بالتاريخ الهابط.
 *   2) public/newsletter/latest.html — صفحة النشرة الأسبوعية: أحدث 12 مقالاً + أحدث نشرة رادار.
 * تعتمد على search-index.json (يجب توليده قبل هذا السكربت).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', '..', 'public');
const BASE = 'https://mohamidigital.online';
const SITE_NAME = 'منصة المحامي الرقمية';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const idxPath = path.join(PUBLIC, 'search-index.json');
if (!fs.existsSync(idxPath)) {
  console.error('[rss] search-index.json غير موجود — شغّل build-search-index أولاً');
  process.exit(1);
}
const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));

const feedItems = idx.items
  .filter(i => i.type === 'blog' || i.type === 'radar')
  .map(i => ({
    ...i,
    _d: i.dateModified ? Date.parse(i.dateModified) : (i.dateModified = new Date(0).toISOString(), 0),
  }))
  .sort((a, b) => b._d - a._d);

// ── 1) RSS ────────────────────────────────────────────────────────────────
const latest30 = feedItems.slice(0, 30);
const rss =
`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(SITE_NAME)} — المدونة القانونية ورصد المحامي</title>
  <link>${BASE}</link>
  <description>مقالات قانونية ونصائح للمحامين والمواطنين المصريين، ونشرة رصد المحامي اليومية.</description>
  <language>ar</language>
  <lastBuildDate>${new Date(feedItems[0]?._d || Date.now()).toUTCString()}</lastBuildDate>
  <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml" />
${latest30.map(i => `  <item>
    <title>${esc(i.title)}</title>
    <link>${i.url}</link>
    <guid isPermaLink="true">${i.url}</guid>
    <pubDate>${new Date(i.dateModified).toUTCString()}</pubDate>
    <description>${esc((i.description || i.snippet || '').slice(0, 300))}</description>
    <category>${esc(i.type === 'radar' ? 'رصد المحامي' : 'مدونة قانونية')}</category>
  </item>`).join('\n')}
</channel>
</rss>
`;
fs.writeFileSync(path.join(PUBLIC, 'rss.xml'), rss, 'utf8');
console.log(`[rss] ✓ ${latest30.length} عنصراً → public/rss.xml`);

// ── 2) صفحة النشرة ───────────────────────────────────────────────────────
const { headerMarkup } = require(path.join(__dirname, '..', 'seo', 'unified-header.cjs'));

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return ''; }
}

const blogs = feedItems.filter(i => i.type === 'blog').slice(0, 12);
const radars = feedItems.filter(i => i.type === 'radar').slice(0, 4);

const card = (i, accent) => `
    <a class="nd-card" href="${esc(i.url)}" target="_blank" rel="noopener">
      <span class="nd-chip" style="color:${accent};background:${accent}22;border-color:${accent}55">${i.type === 'radar' ? '📡 رصد المحامي' : '📰 مقال'}</span>
      <h3>${esc(i.title)}</h3>
      <p>${esc((i.description || i.snippet || '').slice(0, 160))}…</p>
      <time>${fmtDate(i.dateModified)}</time>
    </a>`;

const page = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>النشرة القانونية الأسبوعية | ${esc(SITE_NAME)}</title>
<meta name="description" content="ملخص أحدث المقالات القانونية ونشرات رصد المحامي — تُحدَّث تلقائياً بعد كل نشر."/>
<link rel="canonical" href="${BASE}/newsletter/latest.html"/>
<meta property="og:title" content="النشرة القانونية الأسبوعية — ${esc(SITE_NAME)}"/>
<link rel="alternate" type="application/rss+xml" title="RSS — ${esc(SITE_NAME)}" href="/rss.xml"/>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" rel="stylesheet">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
<script>if(location.hostname==="www.mohamidigital.online")location.replace("https://mohamidigital.online"+location.pathname+location.search)</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Cairo',sans-serif;background:#0f172a;color:#f1f5f9;min-height:100vh;line-height:1.7;
background-image:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,.18) 0%,transparent 60%),radial-gradient(ellipse at 80% 60%,rgba(16,185,129,.10) 0%,transparent 50%)}
.wrap{max-width:900px;margin:0 auto;padding:40px 20px 70px}
.badge{display:inline-flex;padding:6px 18px;border-radius:999px;background:rgba(99,102,241,.14);border:1px solid rgba(99,102,241,.35);color:#a5b4fc;font-size:12px;font-weight:800;margin-bottom:16px}
h1{font-size:clamp(1.6rem,4vw,2.4rem);font-weight:900;background:linear-gradient(135deg,#e2e8f0,#a5b4fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px}
.lead{color:#94a3b8;font-size:14px;margin-bottom:34px}
.nd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:44px}
.nd-card{display:flex;flex-direction:column;gap:8px;padding:18px;border-radius:16px;text-decoration:none;color:inherit;background:rgba(15,23,42,.72);border:1px solid rgba(99,102,241,.2);transition:.2s}
.nd-card:hover{transform:translateY(-3px);border-color:rgba(99,102,241,.55)}
.nd-chip{align-self:flex-start;font-size:10px;font-weight:800;padding:2px 10px;border-radius:999px;border:1px solid}
.nd-card h3{font-size:15px;font-weight:800;line-height:1.6;color:#fff}
.nd-card p{font-size:12px;color:#94a3b8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nd-card time{font-size:10.5px;color:#64748b;font-weight:700}
h2.sec{font-size:19px;font-weight:900;color:#fff;margin:0 0 18px}
.rss-note{margin-top:36px;padding:16px 20px;border-radius:14px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);font-size:13px;color:#a7f3d0}
.rss-note a{color:#6ee7b7;font-weight:800}
footer{border-top:1px solid rgba(148,163,184,.12);padding:26px;text-align:center;font-size:11.5px;color:#64748b;background:rgba(15,23,42,.95)}
</style>
</head>
<body>
${headerMarkup('home')}
<div class="wrap">
  <div class="badge">📬 النشرة القانونية · تُحدَّث تلقائياً بعد كل نشر</div>
  <h1>أحدث ما نُشر على المنصة</h1>
  <p class="lead">ملخص أحدث المقالات القانونية ونشرات «رصد المحامي» — الصفحة المرجعية الدائمة للنشرة.</p>

  <h2 class="sec">📰 أحدث المقالات</h2>
  <div class="nd-grid">${blogs.map(b => card(b, '#a5b4fc')).join('')}</div>

  <h2 class="sec">📡 آخر تحليلات الرادار</h2>
  <div class="nd-grid">${radars.map(r => card(r, '#67e8f9')).join('')}</div>

  <div class="rss-note">
    📡 تابعنا من قارئ RSS المفضل لديك: <a href="/rss.xml">/rss.xml</a> — أو فعّل إشعارات المتصفح من أيقونة الجرس في الرئيسية.
  </div>
</div>
<footer>© ${new Date().getFullYear()} ${esc(SITE_NAME)} · النشرة تُولَّد آلياً من فهرس المحتوى</footer>
</body>
</html>
`;

const nlDir = path.join(PUBLIC, 'newsletter');
fs.mkdirSync(nlDir, { recursive: true });
fs.writeFileSync(path.join(nlDir, 'latest.html'), page, 'utf8');
console.log(`[digest] ✓ النشرة → public/newsletter/latest.html (${blogs.length} مقالاً + ${radars.length} رادار)`);
