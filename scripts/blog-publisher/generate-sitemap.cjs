#!/usr/bin/env node
/**
 * generate-sitemap.cjs — إعادة توليد public/sitemap.xml من مقالات المدونة الفعلية
 * يُستدعى تلقائياً في نهاية daily-publish.cjs بعد كل نشر، أو يدوياً:
 *   node scripts/blog-publisher/generate-sitemap.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const SITEMAP_FILE = path.join(ROOT, 'public', 'sitemap.xml');
const BASE_URL = 'https://justice-91571.web.app';

function cairoDateStr() {
  return new Date(Date.now() + 120 * 60000).toISOString().slice(0, 10);
}

function buildSitemap() {
  const files = fs.existsSync(BLOG_DIR)
    ? fs.readdirSync(BLOG_DIR).filter(f => /^[a-z0-9-]+\.html$/.test(f)).sort()
    : [];
  const today = cairoDateStr();
  const urls = [];

  // الصفحات الأساسية للتطبيق
  const main = [
    { loc: '/', pri: '1.0', freq: 'daily' },
  ];
  for (const m of main) {
    urls.push(`  <url>\n    <loc>${BASE_URL}${m.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${m.freq}</changefreq>\n    <priority>${m.pri}</priority>\n  </url>`);
  }

  // كل مقالات المدونة
  for (const f of files) {
    const slug = f.replace(/\.html$/, '');
    urls.push(`  <url>\n    <loc>${BASE_URL}/blog/${f}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

const xml = buildSitemap();
fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');
const count = (xml.match(/<loc>/g) || []).length;
console.log(`[sitemap] تم توليد sitemap.xml: ${count} رابطاً (${SITEMAP_FILE})`);
