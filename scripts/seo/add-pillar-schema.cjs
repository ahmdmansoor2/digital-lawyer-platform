#!/usr/bin/env node
/**
 * add-pillar-schema.cjs — إضافة Article + Breadcrumb schema لـ pillar pages
 * (نسخة مخصصة من add-article-schema.cjs للـ pillars)
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');
const BASE_URL = 'https://mohamidigital.online';

const PUBLISHER = {
  '@type': 'Organization',
  name: 'منصة المحامي الرقمية',
  logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
  url: BASE_URL,
};
const AUTHOR = {
  '@type': 'Person',
  name: 'الأستاذ أحمد منصور',
  jobTitle: 'مستشار قانوني',
  url: `${BASE_URL}/about.html`,
  sameAs: [],
};

function extractPillarInfo(html, slug) {
  const info = { slug, title: '', description: '', datePublished: '' };
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) info.title = titleMatch[1].trim().split('|')[0].trim();
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if (descMatch) info.description = descMatch[1];
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (ogImage) info.image = ogImage[1];
  const dateMatch = html.match(/<time\s+datetime="([^"]+)"/) ||
                    html.match(/datePublished["']\s*:\s*["']([^"']+)/);
  if (dateMatch) info.datePublished = dateMatch[1];
  return info;
}

function buildSchema(info) {
  const url = `${BASE_URL}/pillars/${info.slug}.html`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: info.title,
    description: info.description,
    image: info.image ? [info.image] : [`${BASE_URL}/og-image.jpg`],
    datePublished: info.datePublished || new Date().toISOString(),
    dateModified: info.datePublished || new Date().toISOString(),
    author: AUTHOR,
    publisher: PUBLISHER,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'ar-EG',
    articleSection: 'مراجع قانونية',
  };
}

function buildBreadcrumb(slug, title) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'المراجع', item: `${BASE_URL}/pillars/` },
      { '@type': 'ListItem', position: 3, name: title, item: `${BASE_URL}/pillars/${slug}.html` },
    ],
  };
}

function inject(html, info) {
  if (html.includes('"@type": "Article"')) return html;

  const articleSchema = buildSchema(info);
  const breadcrumb = buildBreadcrumb(info.slug, info.title);
  const articleMeta = `
    <meta property="article:author" content="${AUTHOR.name}" />
    <meta property="article:published_time" content="${articleSchema.datePublished}" />
    <meta property="article:section" content="مراجع قانونية" />`;

  let result = html.replace('</head>', `${articleMeta}\n  </head>`);
  const scripts = `
    <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
  result = result.replace('</head>', `${scripts}\n  </head>`);
  return result;
}

const files = fs.readdirSync(PILLARS_DIR)
  .filter(f => f.endsWith('.html') && f !== 'index.html');

console.log(`📝 معالجة ${files.length} pillar...\n`);
for (const f of files) {
  const filepath = path.join(PILLARS_DIR, f);
  const slug = path.basename(f, '.html');
  const html = fs.readFileSync(filepath, 'utf8');
  const info = extractPillarInfo(html, slug);
  const newHtml = inject(html, info);
  fs.writeFileSync(filepath, newHtml, 'utf8');
  console.log(`✓ ${slug}: schema مضاف`);
}
console.log('\n✅ تم');
