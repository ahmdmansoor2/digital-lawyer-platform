#!/usr/bin/env node
/**
 * Sitemap Generator v2 — with accurate lastmod
 *
 * Reads all HTML files in public/, generates sitemap.xml with:
 * - Accurate lastmod (from file mtime)
 * - Priority based on URL depth and type
 * - Changefreq hints
 *
 * Usage: node scripts/generate-sitemap.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const SITEMAP_OUT = path.join(PUBLIC_DIR, 'sitemap.xml');
const BASE_URL = 'https://mohamidigital.online';

// Priority rules
const HIGH_PRIORITY = ['/', '/legal-library', '/blog/'];
const MEDIUM_PRIORITY = ['/features', '/pricing', '/about', '/contact', '/search'];

function walkDir(dir, base = dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'data', 'admin', 'images', 'assets', 'legal-categories'].includes(entry.name)) continue;
      results.push(...walkDir(fullPath, base));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function urlForPath(filePath) {
  const rel = path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/');
  let url = BASE_URL + '/' + rel;
  if (url.endsWith('/index.html')) url = url.replace(/index\.html$/, '');
  return url;
}

function getPriority(url) {
  const path = url.replace(BASE_URL, '');
  if (HIGH_PRIORITY.some(p => path === p || path === p + 'index.html' || path === p.replace(/\/$/, ''))) return '1.0';
  if (MEDIUM_PRIORITY.some(p => path.startsWith(p))) return '0.8';
  if (path.startsWith('/blog/')) return '0.7';
  if (path.startsWith('/legal-library-topics/')) return '0.7';
  if (path.startsWith('/legal-categories/')) return '0.6';
  if (path.includes('pillar')) return '0.7';
  return '0.5';
}

function getChangefreq(url) {
  const path = url.replace(BASE_URL, '');
  if (path === '/' || path === '') return 'daily';
  if (path.startsWith('/blog/')) return 'weekly';
  if (path.startsWith('/legal-library')) return 'monthly';
  return 'monthly';
}

function main() {
  console.log('=== Sitemap Generator v2 ===');
  console.log('Source:', PUBLIC_DIR);
  console.log('Output:', SITEMAP_OUT);

  const htmlFiles = walkDir(PUBLIC_DIR);
  console.log(`Found ${htmlFiles.length} HTML files`);

  const urls = htmlFiles.map(f => ({
    loc: urlForPath(f),
    lastmod: fs.statSync(f).mtime.toISOString(),
    changefreq: '',
    priority: ''
  }));

  // Calculate priority/changefreq per URL
  for (const u of urls) {
    u.priority = getPriority(u.loc);
    u.changefreq = getChangefreq(u.loc);
  }

  // Sort: home first, then library, blog, then others
  urls.sort((a, b) => {
    const aP = a.loc === BASE_URL + '/' ? 0 : a.loc.includes('legal-library') ? 1 : a.loc.includes('blog') ? 2 : 3;
    const bP = b.loc === BASE_URL + '/' ? 0 : b.loc.includes('legal-library') ? 1 : b.loc.includes('blog') ? 2 : 3;
    if (aP !== bP) return aP - bP;
    return a.loc.localeCompare(b.loc);
  });

  // Build XML
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url>\n' +
      `    <loc>${u.loc}</loc>\n` +
      `    <lastmod>${u.lastmod}</lastmod>\n` +
      `    <changefreq>${u.changefreq}</changefreq>\n` +
      `    <priority>${u.priority}</priority>\n` +
      '  </url>').join('\n') +
    '\n</urlset>\n';

  fs.writeFileSync(SITEMAP_OUT, xml, 'utf8');
  console.log(`\nSitemap written: ${SITEMAP_OUT}`);
  console.log(`Size: ${(xml.length / 1024).toFixed(1)} KB`);
  console.log(`URLs: ${urls.length}`);

  // Stats
  const byPriority = {};
  urls.forEach(u => byPriority[u.priority] = (byPriority[u.priority] || 0) + 1);
  console.log('\nBy priority:');
  Object.entries(byPriority).sort().forEach(([p, c]) => console.log(`  ${p}: ${c}`));

  // Mirror to dist
  const distSitemap = path.join(PROJECT_ROOT, 'dist', 'sitemap.xml');
  if (fs.existsSync(path.dirname(distSitemap))) {
    fs.writeFileSync(distSitemap, xml, 'utf8');
    console.log(`\nMirrored to: ${distSitemap}`);
  }
}

main();
