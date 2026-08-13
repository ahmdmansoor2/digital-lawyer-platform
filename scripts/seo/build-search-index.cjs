#!/usr/bin/env node
/**
 * build-search-index.cjs — توليد فهرس بحث موحد (search-index.json) لكل صفحات الموقع
 *
 * يقرأ كل ملفات HTML في public/ ويستخرج:
 *   - title, description, h1
 *   - نص المحتوى (بعد إزالة HTML)
 *   - URL (canonical)
 *   - type (blog | pillar | page)
 *   - keywords
 *   - og:image
 *
 * الناتج: public/search-index.json — ملف واحد يُحمَّل عند الطلب في الـ search modal
 *
 * الاستخدام:
 *   node scripts/seo/build-search-index.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'search-index.json');
const BASE_URL = 'https://mohamidigital.online';

// مسارات البحث
const SEARCH_PATHS = [
  { dir: path.join(PUBLIC_DIR, 'blog'), type: 'blog', urlPrefix: '/blog/' },
  { dir: path.join(PUBLIC_DIR, 'pillars'), type: 'pillar', urlPrefix: '/pillars/' },
  { dir: path.join(PUBLIC_DIR, 'legal-library-topics'), type: 'pillar', urlPrefix: '/legal-library-topics/' },
  { dir: PUBLIC_DIR, type: 'page', urlPrefix: '/', filter: (f) => f.endsWith('.html') && !f.startsWith('blog') && !f.startsWith('pillars') && !f.startsWith('assets') && !f.startsWith('legal-library-topics') },
];

// ملفات نتجاهلها (ليست صفحات محتوى)
const SKIP_FILES = new Set([
  'googlec03a96f2162c19b9.html',
  'BingSiteAuth.xml',
  '62c624f591cc714b7d28bf2c04c7966e.txt',
  'robots.txt',
  'sitemap.xml',
]);

/**
 * استخراج قيمة من meta tag
 */
function extractMeta(html, attr, value) {
  const re = new RegExp(`<meta\\s+[^>]*${attr}=["']${value}["'][^>]*content=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

/**
 * استخراج canonical URL
 */
function extractCanonical(html) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  return m ? m[1].trim() : '';
}

/**
 * استخراج أول h1
 */
function extractH1(html) {
  // نشيل head والـ style والـ script
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return '';
  const body = bodyMatch[1];
  const m = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * استخراج نص المحتوى (بعد إزالة HTML + nav + footer + script + style + ad)
 */
function extractContent(html) {
  // إزالة head بالكامل
  let text = html.replace(/<head[\s\S]*?<\/head>/gi, '');
  // إزالة script و style
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // إزالة nav و footer و aside
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<aside[\s\S]*?<\/aside>/gi, '');
  // إزالة AdSense
  text = text.replace(/<ins[\s\S]*?<\/ins>/gi, '');
  // إزالة Schema JSON-LD
  text = text.replace(/<script type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, '');
  // إزالة وسوم HTML
  text = text.replace(/<[^>]+>/g, ' ');
  // تنظيف المسافات
  text = text.replace(/\s+/g, ' ').trim();
  // decoding HTML entities الأساسية
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»');
  return text;
}

/**
 * استخراج OG image
 */
function extractOgImage(html) {
  const m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i);
  return m ? m[1].trim() : '';
}

/**
 * توليد snippet حول الكلمة المطابقة
 */
function makeSnippet(text, maxLen = 200) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

/**
 * استخراج category من article:section أو من filename
 */
function extractCategory(html, filename, type) {
  const m = html.match(/<meta\s+property=["']article:section["']\s+content=["']([^"']*)["']/i);
  if (m) return m[1].trim();
  // fallback من filename
  if (type === 'blog') {
    if (filename.match(/labor|عمل|فصل|إجاز|فتر|تجربة/)) return 'قانون العمل';
    if (filename.match(/family|أسرة|زواج|طلاق|حضانة|ميراث|نفقة/)) return 'قانون الأسرة';
    if (filename.match(/real|إيجار|عقار|شهر عقاري/)) return 'قانون العقارات';
    if (filename.match(/company|شركة|تجاري|إفلاس|كمبيالة|شيك/)) return 'قانون الشركات';
    if (filename.match(/criminal|جنائي|حبس|قتل|مخدرات/)) return 'قانون جنائي';
    if (filename.match(/admin|مجلس دولة|إداري|قرارات/)) return 'قانون إداري';
    if (filename.match(/civil|عقد|تعويض|مدني|مرافعات/)) return 'قانون مدني';
    if (filename.match(/tech|تكنولوجيا|تسويق|إدارة|مكتب/)) return 'إدارة مكاتب';
  }
  if (type === 'pillar') return 'مراجع شاملة';
  return 'صفحات';
}

/**
 * معالجة ملف HTML واحد
 */
function processFile(filePath, type, urlPrefix) {
  const html = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  const relativeUrl = urlPrefix + filename;

  // canonical لو موجود أفضل من التركيب
  let url = extractCanonical(html);
  if (!url) {
    url = BASE_URL + relativeUrl;
  }

  const titleRaw = extractMeta(html, 'name', 'title') || (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const title = titleRaw.replace(/\s*[\|\-–]\s*(منصة المحامي الرقمية|Moham.*)$/i, '').trim();

  const description = extractMeta(html, 'name', 'description');
  const keywords = extractMeta(html, 'name', 'keywords');
  const ogImage = extractOgImage(html);
  const h1 = extractH1(html);
  const content = extractContent(html);
  const snippet = makeSnippet(content, 280);
  const category = extractCategory(html, filename, type);

  return {
    id: relativeUrl,
    title: h1 || title,
    description: description,
    url: url,
    type: type,
    category: category,
    keywords: keywords,
    image: ogImage,
    snippet: snippet,
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * مسح المجلد
 */
function walkDir(dir, type, urlPrefix, filter) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  const results = [];
  for (const f of files) {
    if (SKIP_FILES.has(f)) continue;
    if (filter && !filter(f)) continue;
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isFile() && f.endsWith('.html')) {
      try {
        const item = processFile(fullPath, type, urlPrefix);
        if (item && item.title) {
          results.push(item);
        }
      } catch (e) {
        console.warn(`[warn] failed to process ${f}:`, e.message);
      }
    }
  }
  return results;
}

/**
 * بناء الفهرس الكامل
 */
function buildIndex() {
  const all = [];
  for (const p of SEARCH_PATHS) {
    const items = walkDir(p.dir, p.type, p.urlPrefix, p.filter);
    all.push(...items);
    console.log(`[search] ${p.type}: ${items.length} صفحة من ${path.relative(ROOT, p.dir)}`);
  }

  // ترتيب: pillars أولاً، ثم blog، ثم page
  const typeOrder = { pillar: 0, page: 1, blog: 2 };
  all.sort((a, b) => {
    if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
    return a.title.localeCompare(b.title, 'ar');
  });

  // إضافة metadata
  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    count: all.length,
    totalWords: all.reduce((sum, i) => sum + (i.wordCount || 0), 0),
    items: all,
  };

  return output;
}

const idx = buildIndex();
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(idx), 'utf8');
const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
console.log(`\n[search] ✓ تم توليد search-index.json`);
console.log(`  - عدد الصفحات: ${idx.count}`);
console.log(`  - إجمالي الكلمات: ${idx.totalWords.toLocaleString('ar-EG')}`);
console.log(`  - حجم الملف: ${sizeKB} KB`);
console.log(`  - المسار: ${path.relative(ROOT, OUTPUT_FILE)}`);
