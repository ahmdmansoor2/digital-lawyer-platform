#!/usr/bin/env node
/**
 * scripts/blog-publisher/rebuild-blog-index.cjs
 * سكريبت إعادة بناء وتحديث فهرس المدونة الرئيسي (public/blog/index.html)
 * يجمع كافة المقالات الموجودة في public/blog ويرتبها زمنياً تنازلياً (الأحدث أولاً)
 * ويضع وسم الإدراج التلقائي <!-- NEW_CARD_ANCHOR --> في بداية الشبكة
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const BLOG_INDEX = path.join(BLOG_DIR, 'index.html');
const LOG_FILE = path.join(ROOT, 'scripts', 'published-log.json');

console.log('🔄 بدء إعادة بناء وتحديث فهرس المدونة بالكامل (public/blog/index.html)...');

// 1. قراءة سجل النشر المعتمد
let publishedLog = { published: [] };
if (fs.existsSync(LOG_FILE)) {
  try {
    publishedLog = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    if (!publishedLog.published) publishedLog.published = [];
  } catch (err) {
    console.error('خطأ في قراءة published-log.json:', err.message);
  }
}

const logBySlug = {};
publishedLog.published.forEach(p => {
  logBySlug[p.slug] = p;
  logBySlug[p.slug + '.html'] = p;
});

// 2. قراءة كافة ملفات المقالات من public/blog
const htmlFiles = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');
console.log(`📋 إجمالي ملفات المقالات المكتشفة: ${htmlFiles.length} مقالاً`);

const articles = [];

// استخراج الأنماط ثلاثية الأبعاد الاحتياطية
const DEFAULT_IMAGES = [
  '/blog/assets/civil-compensation.jpg',
  '/blog/assets/consumer-protection.jpg',
  '/blog/assets/company.jpg',
  '/blog/assets/family-law.jpg',
  '/blog/assets/inheritance.jpg',
  '/blog/assets/real-estate.jpg'
];

function formatArabicDate(dateStr) {
  if (!dateStr) return 'أكتوبر ٢٠٢٦';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

for (const file of htmlFiles) {
  const filePath = path.join(BLOG_DIR, file);
  const slug = file.replace(/\.html$/, '');
  const html = fs.readFileSync(filePath, 'utf8');

  // استخراج العنوان
  let title = '';
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/\s*\|.*$/, '').trim();
  }
  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) title = h1Match[1].trim();
  }

  // استخراج الوصف التعريفي
  let metaDesc = '';
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  if (descMatch) metaDesc = descMatch[1].trim();

  // استخراج التاريخ
  let date = '';
  if (logBySlug[slug] && logBySlug[slug].date) {
    date = logBySlug[slug].date;
  }
  if (!date) {
    const timeMatch = html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
    if (timeMatch) date = timeMatch[1].trim();
  }
  if (!date) {
    const schemaMatch = html.match(/"datePublished":\s*"([^"]+)"/);
    if (schemaMatch) date = schemaMatch[1].slice(0, 10);
  }
  if (!date) {
    const arDateMatch = html.match(/📅\s*([^\n<]+)/);
    if (arDateMatch) date = arDateMatch[1].trim();
  }
  if (!date) {
    date = '2026-10-15';
  }

  // استخراج التصنيف
  let tag = '';
  if (logBySlug[slug] && logBySlug[slug].tags && logBySlug[slug].tags.length > 0) {
    tag = logBySlug[slug].tags[0];
  }
  if (!tag) {
    const tagMatch = html.match(/<span\s+class=["'][^"']*tag[^"']*["']>([^<]+)<\/span>/i) ||
                     html.match(/<a\s+class=["'][^"']*category[^"']*["']>([^<]+)<\/a>/i);
    if (tagMatch) tag = tagMatch[1].trim();
  }
  if (!tag) tag = 'استشارات تشريعية';

  // استخراج وقت القراءة
  let readTime = '6';
  const rtMatch = html.match(/⏱️\s*(\d+)\s*دقائق?/);
  if (rtMatch) readTime = rtMatch[1];

  // استخراج الصورة البارزة
  let image = '';
  const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogImgMatch) {
    image = ogImgMatch[1].trim();
    if (image.startsWith('https://mohamidigital.online')) {
      image = image.replace('https://mohamidigital.online', '');
    }
  }
  if (!image || image.includes('undefined')) {
    if (fs.existsSync(path.join(BLOG_DIR, 'images', `${slug}.jpg`))) {
      image = `/blog/images/${slug}.jpg`;
    } else if (fs.existsSync(path.join(BLOG_DIR, 'images', `${slug}.webp`))) {
      image = `/blog/images/${slug}.webp`;
    } else {
      image = DEFAULT_IMAGES[Math.abs(slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % DEFAULT_IMAGES.length];
    }
  }

  articles.push({
    file,
    slug,
    title: title || slug,
    metaDesc: metaDesc || 'دليل تشريعي وقضائي متخصص وموثق وفق نصوص القانون المصري وأحدث أحكام محكمة النقض.',
    date,
    tag,
    readTime,
    image
  });
}

// 3. الترتيب الزمني التنازلي الحاسم (الأحدث في المقدمة)
articles.sort((a, b) => {
  const da = new Date(a.date).getTime() || 0;
  const db = new Date(b.date).getTime() || 0;
  return db - da;
});

console.log('✅ تم ترتيب المقالات، أول 3 مقالات ستظهر في الفهرس:');
articles.slice(0, 3).forEach((a, i) => {
  console.log(`   ${i + 1}. [${a.date}] ${a.title}`);
});

// 4. بناء كود HTML لجميع البطاقات
const cardsHtml = articles.map(a => {
  const formattedDate = a.date.includes('٢٠٢٦') || a.date.includes('سبتمبر') || a.date.includes('أكتوبر') || a.date.includes('أغسطس')
    ? a.date
    : formatArabicDate(a.date);

  return `      <a href="/blog/${a.slug}.html" class="post-card">
        <div class="post-cover">
          <img src="${a.image}" alt="${a.title}" class="post-cover-img" loading="lazy" decoding="async"/>
          <span class="post-cover-tag">${a.tag}</span>
        </div>
        <div class="post-body">
          <div class="post-meta">
            <span>📅 ${formattedDate}</span>
            <span>⏱️ ${a.readTime} دقائق</span>
          </div>
          <h3>${a.title}</h3>
          <p>${a.metaDesc}</p>
          <div class="post-cta">اقرأ المقال ←</div>
        </div>
      </a>`;
}).join('\n\n');

// 5. تحديث ملف public/blog/index.html
let indexContent = fs.readFileSync(BLOG_INDEX, 'utf8');

// استبدال الشبكة بالكامل مع وضع وسم NEW_CARD_ANCHOR في قمة الشبكة
const gridRegex = /<div class="posts-grid">[\s\S]*?<\/div><!-- \/posts-grid -->/;

const newGridHtml = `<div class="posts-grid">
      <!-- NEW_CARD_ANCHOR -->

${cardsHtml}

    </div><!-- /posts-grid -->`;

if (gridRegex.test(indexContent)) {
  indexContent = indexContent.replace(gridRegex, newGridHtml);
} else {
  // بديل في حال لم يكن الكومنت موجوداً
  const fallbackRegex = /<div class="posts-grid">[\s\S]*?(?=<div class="info-card">)/;
  if (fallbackRegex.test(indexContent)) {
    indexContent = indexContent.replace(fallbackRegex, newGridHtml + '\n\n    ');
  } else {
    console.error('❌ تعذر العثور على حاوية posts-grid في index.html');
    process.exit(1);
  }
}

// تحديث شارة الهيرو لتعكس الواقع المتجدد للمدونة
indexContent = indexContent.replace(
  /<div class="badge">\s*<span class="badge-dot"><\/span>\s*[^<]+\s*<\/div>/,
  `<div class="badge">\n      <span class="badge-dot"></span>\n      مقالات قانونية يومية متجددة · أكثر من ${articles.length} مقال تشريعي\n    </div>`
);

fs.writeFileSync(BLOG_INDEX, indexContent, 'utf8');
console.log(`🎉 تم تحديث ${BLOG_INDEX} بنجاح تام! يضم الآن ${articles.length} بطاقة مقال مرتبة من الأحدث إلى الأقدم.`);
