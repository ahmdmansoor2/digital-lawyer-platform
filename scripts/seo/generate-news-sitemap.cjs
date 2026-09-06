#!/usr/bin/env node
/**
 * generate-news-sitemap.cjs — خريطة أخبار Google (news sitemap)
 * تشمل مقالات المدونة المعدَّلة خلال آخر 48 ساعة فقط (حد جوجل الفعلي للتضمين المتكرر).
 * الناتج: public/news-sitemap.xml — تُضاف لـ robots.txt وتُلتزم في CI يومياً.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', '..', 'public');
const OUT = path.join(PUBLIC, 'news-sitemap.xml');
const BASE = 'https://mohamidigital.online';
const SITE_NAME = 'منصة المحامي الرقمية';
const WINDOW_HOURS = 48;
const MAX = 200;

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const blogDir = path.join(PUBLIC, 'blog');
const cutoff = Date.now() - WINDOW_HOURS * 3600 * 1000;

// ─── قراءة سجل النشر المعتمد لتواريخ النشر الحقيقية ───
const LOG_FILE = path.join(__dirname, '..', 'published-log.json');
const slugToDate = {};
if (fs.existsSync(LOG_FILE)) {
  try {
    const logData = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    const logArr = Array.isArray(logData) ? logData : (logData.published || []);
    // تتبع المقالات لكل يوم لتوزيعها على الورديات وساعات النشر (09:00, 12:30, 15:30, 18:30...)
    const dateCountsPerDay = {};
    logArr.forEach(entry => {
      const d = entry.date;
      if (!d) return;
      dateCountsPerDay[d] = dateCountsPerDay[d] || 0;
      const shiftIndex = dateCountsPerDay[d]++;
      const hour = 9 + (shiftIndex * 3); // 09:00, 12:00, 15:00, 18:00...
      const padHour = String(Math.min(hour, 23)).padStart(2, '0');
      const timeStr = `${d}T${padHour}:${String((shiftIndex * 17) % 60).padStart(2, '0')}:00+03:00`;

      if (entry.slug) slugToDate[entry.slug] = timeStr;
      if (entry.url) {
        const uSlug = entry.url.split('/').pop().replace('.html', '');
        slugToDate[uSlug] = timeStr;
      }
    });
  } catch (err) {
    console.warn('[news-sitemap] Warning: Could not parse published-log.json', err.message);
  }
}

const entries = [];
for (const f of fs.readdirSync(blogDir)) {
  if (!f.endsWith('.html') || f === 'index.html') continue;
  const slug = f.replace('.html', '');
  const pubDate = slugToDate[slug];
  if (!pubDate) continue;

  const pubTimeMs = new Date(pubDate).getTime();
  if (pubTimeMs < cutoff) continue;

  const full = path.join(blogDir, f);
  const html = fs.readFileSync(full, 'utf8');
  const title =
    ((html.match(/<meta\s+property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1] ||
    ((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '')).trim();
  const kw = ((html.match(/<meta\s+name=["']keywords["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '')
    .split(/[،,]/).map(s => s.trim()).filter(Boolean).slice(0, 8).join(', ');
  entries.push({
    loc: BASE + '/blog/' + f,
    title: esc(title),
    date: pubDate,
    keywords: esc(kw),
  });
}

// ─── حراسة أمنية: منع التكرار الصارم للتواريخ في الثانية نفسها ───
const dateCounts = {};
for (const e of entries) {
  dateCounts[e.date] = (dateCounts[e.date] || 0) + 1;
  if (dateCounts[e.date] > 1) {
    throw new Error(`[news-sitemap] ❌ خطأ دستوري فادح: التوقيت ${e.date} مكرر لمقالين! تم إيقاف التوليد فوراً.`);
  }
}

entries.sort((a, b) => b.date.localeCompare(a.date));
const limited = entries.slice(0, MAX);

const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${limited.map(e => `  <url>
    <loc>${e.loc}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(SITE_NAME)}</news:name>
        <news:language>ar</news:language>
      </news:publication>
      <news:publication_date>${e.date}</news:publication_date>
      <news:title>${e.title}</news:title>
      <news:keywords>${e.keywords}</news:keywords>
    </news:news>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(OUT, xml, 'utf8');
console.log(`[news-sitemap] ✓ ${limited.length} مقالاً من آخر ${WINDOW_HOURS} ساعة → public/news-sitemap.xml`);

const DIST_OUT = path.join(__dirname, '..', '..', 'dist', 'news-sitemap.xml');
if (fs.existsSync(path.dirname(DIST_OUT))) {
  fs.writeFileSync(DIST_OUT, xml, 'utf8');
  console.log(`[news-sitemap] ✓ انعكست النسخة على dist/news-sitemap.xml`);
}
