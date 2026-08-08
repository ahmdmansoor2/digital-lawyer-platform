#!/usr/bin/env node
/**
 * add-static-page-schema.cjs — إضافة Organization + WebPage schema للصفحات الثابتة
 *
 * بيشتغل على: about, features, pricing, contact, privacy, terms, blog
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const BASE_URL = 'https://mohamidigital.online';

const files = ['about.html', 'features.html', 'pricing.html', 'contact.html', 'privacy.html', 'terms.html', 'blog/index.html'];
let updated = 0;

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'منصة المحامي الرقمية',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
};

function buildPageSchema(filename, url) {
  // كل صفحة ليها WebPage schema مخصص
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: filename.replace('.html', '').replace(/-/g, ' '),
    url: url,
    isPartOf: { '@type': 'WebSite', name: 'منصة المحامي الرقمية', url: BASE_URL },
    inLanguage: 'ar-EG',
  };
}

function inject(html, pageUrl) {
  // استخرج العنوان من الـ title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const pageName = titleMatch ? titleMatch[1].trim().split('|')[0].trim() : 'Page';

  if (html.includes('"@type": "WebPage"') || html.includes('"@type":"WebPage"')) {
    return { html, skipped: true };
  }

  // أبني schemas
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageName,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'منصة المحامي الرقمية', url: BASE_URL },
    inLanguage: 'ar-EG',
  };
  const orgScript = `<script type="application/ld+json">${JSON.stringify(ORG_SCHEMA)}</script>`;
  const pageScript = `<script type="application/ld+json">${JSON.stringify(pageSchema)}</script>`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: pageName, item: pageUrl },
    ],
  };
  const breadcrumbScript = `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;

  return {
    html: html.replace('</head>', `${orgScript}\n${pageScript}\n${breadcrumbScript}\n</head>`),
    skipped: false,
  };
}

for (const filename of files) {
  const filepath = path.join(PUBLIC_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`⊘ ${filename}: مش موجود`);
    continue;
  }
  const html = fs.readFileSync(filepath, 'utf8');
  const pageUrl = filename === 'blog/index.html'
    ? `${BASE_URL}/blog/`
    : `${BASE_URL}/${filename}`;

  const result = inject(html, pageUrl);
  if (result.skipped) {
    console.log(`⊘ ${filename}: موجود بالفعل`);
    continue;
  }
  fs.writeFileSync(filepath, result.html, 'utf8');
  updated++;
  console.log(`✓ ${filename}`);
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`✓ تم التحديث: ${updated} ملف`);
console.log(`\n⏭️  الخطوة الجاية:`);
console.log(`1) npm run build`);
console.log(`2) npx firebase deploy --only hosting`);
console.log(`3) شغّل health-monitor للتأكد`);
