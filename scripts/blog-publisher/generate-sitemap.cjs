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
const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');
const SITEMAP_FILE = path.join(ROOT, 'public', 'sitemap.xml');
const BASE_URL = 'https://justice-91571.web.app';

function cairoDateStr() {
  return new Date(Date.now() + 120 * 60000).toISOString().slice(0, 10);
}

function buildSitemap() {
  const blogFiles = fs.existsSync(BLOG_DIR)
    ? fs.readdirSync(BLOG_DIR).filter(f => /^[a-z0-9-]+\.html$/.test(f) && f !== 'index.html').sort()
    : [];
  const pillarFiles = fs.existsSync(PILLARS_DIR)
    ? fs.readdirSync(PILLARS_DIR).filter(f => /^[a-z0-9-]+\.html$/.test(f) && f !== 'index.html').sort()
    : [];
  const today = cairoDateStr();
  const urls = [];

  // الصفحات الأساسية للتطبيق
  const main = [
    { loc: '/', pri: '1.0', freq: 'daily' },
    { loc: '/blog/', pri: '0.9', freq: 'daily' },
    { loc: '/legal-library.html', pri: '0.9', freq: 'monthly' },
    { loc: '/search.html', pri: '0.7', freq: 'monthly' },
    { loc: '/features.html', pri: '0.8', freq: 'monthly' },
    { loc: '/pricing.html', pri: '0.7', freq: 'monthly' },
    { loc: '/about.html', pri: '0.6', freq: 'monthly' },
    { loc: '/contact.html', pri: '0.6', freq: 'monthly' },
    { loc: '/privacy.html', pri: '0.3', freq: 'yearly' },
    { loc: '/terms.html', pri: '0.3', freq: 'yearly' },
    { loc: '/sitemap.html', pri: '0.3', freq: 'monthly' },
  ];
  for (const m of main) {
    urls.push(`  <url>\n    <loc>${BASE_URL}${m.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${m.freq}</changefreq>\n    <priority>${m.pri}</priority>\n  </url>`);
  }

  // صفحة pillars الرئيسية
  urls.push(`  <url>\n    <loc>${BASE_URL}/pillars/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`);

  // كل صفحات pillars (المراجع الشاملة)
  for (const f of pillarFiles) {
    urls.push(`  <url>\n    <loc>${BASE_URL}/pillars/${f}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`);
  }

  // كل مقالات المدونة
  for (const f of blogFiles) {
    const slug = f.replace(/\.html$/, '');
    urls.push(`  <url>\n    <loc>${BASE_URL}/blog/${f}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

const xml = buildSitemap();
fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');
const count = (xml.match(/<loc>/g) || []).length;
console.log(`[sitemap] تم توليد sitemap.xml: ${count} رابطاً (${SITEMAP_FILE})`);
