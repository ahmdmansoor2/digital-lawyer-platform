#!/usr/bin/env node
/**
 * add-article-schema.cjs — إضافة Article + BreadcrumbList schema لمقالات المدونة
 *
 * يقرأ كل ملفات HTML في public/blog/ ويحقن:
 *   - Article schema (JSON-LD) — للظهور في Google News + rich snippets
 *   - BreadcrumbList schema — للظهور في breadcrumbs بنتائج البحث
 *   - تحسينات meta tags (article:author, article:published_time)
 *
 * الاستخدام:
 *   node scripts/seo/add-article-schema.cjs             # يعالج كل المقالات
 *   node scripts/seo/add-article-schema.cjs <slug>      # مقال واحد
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const BASE_URL = 'https://mohamidigital.online';

// معلومات الناشر (مستخرجة من index.html)
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

/**
 * يستخرج معلومات المقال من HTML
 */
function extractArticleInfo(html, slug) {
  const info = { slug, title: '', description: '', datePublished: '', image: '', category: '' };

  // العنوان
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    info.title = titleMatch[1].trim().replace(/\s*\|\s*.*$/, '').replace(/\s*-\s*منصة.*$/, '');
  }
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (h1Match && !info.title) info.title = h1Match[1].trim();

  // الوصف
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if (descMatch) info.description = descMatch[1];

  // الصورة
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (ogImage) info.image = ogImage[1];

  // تاريخ النشر
  const publishedMatch = html.match(/<meta\s+property="article:published_time"\s+content="([^"]+)"/) ||
                        html.match(/<time\s+datetime="([^"]+)"/);
  if (publishedMatch) info.datePublished = publishedMatch[1];

  // التصنيف
  const categoryMatch = html.match(/<meta\s+property="article:section"\s+content="([^"]+)"/);
  if (categoryMatch) info.category = categoryMatch[1];

  return info;
}

/**
 * يبني JSON-LD schema للمقال
 */
function buildArticleSchema(info) {
  const url = `${BASE_URL}/blog/${info.slug}.html`;
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
    ...(info.category && { articleSection: info.category }),
    keywords: extractKeywords(info),
  };
}

function extractKeywords(info) {
  // بسيط: نأخذ أول 5 كلمات مميزة من العنوان
  const words = info.title.split(/[\s،؛:,.\-!?]+/).filter(w => w.length > 3);
  return [...new Set(words)].slice(0, 5);
}

/**
 * يبني BreadcrumbList schema
 */
function buildBreadcrumbSchema(slug, title) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'المدونة', item: `${BASE_URL}/blog/` },
      { '@type': 'ListItem', position: 3, name: title, item: `${BASE_URL}/blog/${slug}.html` },
    ],
  };
}

/**
 * يحقن الـ schemas في HTML
 */
function injectSchemas(html, articleSchema, breadcrumbSchema) {
  // لو Article schema موجود مسبقاً → نحذفه ونحقن الجديد
  const cleanedHtml = html.replace(
    /<script type="application\/ld\+json">\s*\{[^<]*"@type":\s*"Article"[^<]*<\/script>/g,
    ''
  ).replace(
    /<script type="application\/ld\+json">\s*\{[^<]*"@type":\s*"BreadcrumbList"[^<]*<\/script>/g,
    ''
  );

  // إضافة meta tags للمقالات
  const articleMetaTags = `
    <meta property="article:author" content="${AUTHOR.name}" />
    <meta property="article:published_time" content="${articleSchema.datePublished}" />
    <meta property="article:modified_time" content="${articleSchema.dateModified}" />
    <meta property="article:section" content="${articleSchema.articleSection || 'قانون'}" />
    <meta property="article:publisher" content="${PUBLISHER.name}" />`;

  // إضافة الـ meta tags قبل </head>
  let result = cleanedHtml.replace('</head>', `${articleMetaTags}\n  </head>`);

  // إضافة الـ schemas قبل </head>
  const schemasScript = `
    <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;
  result = result.replace('</head>', `${schemasScript}\n  </head>`);

  return result;
}

/**
 * يعالج ملف واحد
 */
function processFile(filePath) {
  const slug = path.basename(filePath, '.html');
  const html = fs.readFileSync(filePath, 'utf8');
  const info = extractArticleInfo(html, slug);
  const articleSchema = buildArticleSchema(info);
  const breadcrumbSchema = buildBreadcrumbSchema(slug, info.title);
  const newHtml = injectSchemas(html, articleSchema, breadcrumbSchema);
  fs.writeFileSync(filePath, newHtml, 'utf8');
  console.log(`✓ ${slug}: تم إضافة Article + Breadcrumb schema`);
  return { slug, title: info.title, date: articleSchema.datePublished };
}

/**
 * main
 */
function main() {
  const targetSlug = process.argv[2];

  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`❌ مجلد المدونة غير موجود: ${BLOG_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => path.join(BLOG_DIR, f));

  const targets = targetSlug
    ? files.filter(f => path.basename(f, '.html') === targetSlug)
    : files;

  if (!targets.length) {
    console.error(`❌ لم يتم العثور على المقال: ${targetSlug}`);
    process.exit(1);
  }

  console.log(`📝 معالجة ${targets.length} مقال...\n`);
  for (const f of targets) {
    try { processFile(f); } catch (e) { console.error(`❌ ${f}: ${e.message}`); }
  }
  console.log('\n✅ تم بنجاح');
}

if (require.main === module) main();
module.exports = { processFile, buildArticleSchema, buildBreadcrumbSchema };
