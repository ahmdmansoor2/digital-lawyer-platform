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

const entries = [];
for (const f of fs.readdirSync(blogDir)) {
  if (!f.endsWith('.html') || f === 'index.html') continue;
  const full = path.join(blogDir, f);
  const st = fs.statSync(full);
  if (st.mtimeMs < cutoff) continue;
  const html = fs.readFileSync(full, 'utf8');
  const title =
    ((html.match(/<meta\s+property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1] ||
    ((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '')).trim();
  const kw = ((html.match(/<meta\s+name=["']keywords["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '')
    .split(/[،,]/).map(s => s.trim()).filter(Boolean).slice(0, 8).join(', ');
  entries.push({
    loc: BASE + '/blog/' + f,
    title: esc(title),
    date: new Date(st.mtime).toISOString(),
    keywords: esc(kw),
  });
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
