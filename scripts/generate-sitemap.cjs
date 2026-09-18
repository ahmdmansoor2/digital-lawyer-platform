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
const HIGH_PRIORITY = [
  '/', '/download', '/real-estate', '/legal-library', '/legal-calculators', '/legal-forms', '/pillars', '/legal-radar', '/blog/',
  '/courts-directory', '/court-precedents', '/company-incorporation', '/legal-diagnostics'
];
const MEDIUM_PRIORITY = ['/contact', '/privacy', '/terms', '/disclaimer', '/why-trust-us', '/search', '/about', '/features', '/pricing'];

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
  if (rel === 'index.html') return BASE_URL + '/';
  let url = BASE_URL + '/' + rel;
  if (url.endsWith('/index.html')) url = url.replace(/index\.html$/, '');
  return url;
}

const GOLDEN_ARTICLES = [
  'old-rent-law-2026-eviction-and-increase',
  'shahr-aqary-apartment-registration-guide-2026',
  'end-of-service-gratuity-calculation-new-labor-law',
  'trust-receipt-validity-conditions-and-defenses-egypt',
  'divorce-for-harm-conditions-proof-and-financial-rights',
  'legal-heirship-certificate-procedures-and-documents',
  'building-violation-reconciliation-law-updates-model-8',
  'inheritance-withholding-penalties-article-49',
  'sale-contract-validity-and-enforcement-lawsuit-vs-signature',
  'instapay-accidental-transfer-legal-recovery-procedures',
  'khula-divorce-lawsuit-procedures-and-dowry-return',
  'criminal-cassation-appeal-deadlines-and-grounds-2026',
  'arbitrary-dismissal-and-form-6-challenge-labor-law',
  'civil-lawsuit-court-fees-calculation-guide',
  'bounced-cheque-penalties-and-statute-of-limitations',
  'limited-liability-company-incorporation-procedures-gafi',
  'child-custody-remarriage-and-father-visitation-rights',
  'judicial-case-inquiry-by-national-id-egypt-justice-portal',
  'cyber-defamation-whatsapp-police-report-and-penalties',
  'inheritance-distribution-single-daughter-and-wife-radd'
];

function getPriority(url) {
  const cleanPath = url.replace(BASE_URL, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (cleanPath === '/' || cleanPath === '') return '1.0';
  if (cleanPath.startsWith('/pillars')) return '1.0';
  if (GOLDEN_ARTICLES.some(g => cleanPath.includes(g))) return '1.0';
  if (HIGH_PRIORITY.some(p => {
    const cleanP = p.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    return cleanPath === cleanP;
  })) return '1.0';
  if (cleanPath.startsWith('/blog')) return '0.8';
  if (MEDIUM_PRIORITY.some(p => cleanPath.startsWith(p.replace(/\.html$/, '')))) return '0.7';
  if (cleanPath.startsWith('/legal-library')) return '0.7';
  if (cleanPath.startsWith('/radar-topics')) return '0.4';
  if (cleanPath.startsWith('/courts/')) return '0.3';
  if (cleanPath.startsWith('/legal-forms-docs/')) return '0.4';
  return '0.5';
}

function getChangefreq(url) {
  const path = url.replace(BASE_URL, '');
  if (path === '/' || path === '') return 'daily';
  if (GOLDEN_ARTICLES.some(g => path.includes(g))) return 'daily';
  if (path.startsWith('/pillars')) return 'weekly';
  if (path.startsWith('/blog/')) return 'weekly';
  if (path.startsWith('/courts/')) return 'yearly';
  if (path.startsWith('/legal-forms-docs/')) return 'yearly';
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

  // Ensure root homepage is explicitly included as the primary URL
  const rootIndex = path.join(PROJECT_ROOT, 'index.html');
  const rootMtime = fs.existsSync(rootIndex) ? fs.statSync(rootIndex).mtime.toISOString() : new Date().toISOString();
  if (!urls.some(u => u.loc === BASE_URL + '/' || u.loc === BASE_URL)) {
    urls.unshift({
      loc: BASE_URL + '/',
      lastmod: rootMtime,
      changefreq: 'daily',
      priority: '1.0'
    });
  }

  // Calculate priority/changefreq per URL
  for (const u of urls) {
    u.priority = getPriority(u.loc);
    u.changefreq = getChangefreq(u.loc);
  }

  // Sort: highest priority first, home at very top, then alphabetized
  urls.sort((a, b) => {
    if (a.loc === BASE_URL + '/') return -1;
    if (b.loc === BASE_URL + '/') return 1;
    const diff = parseFloat(b.priority) - parseFloat(a.priority);
    if (Math.abs(diff) > 0.001) return diff;
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
