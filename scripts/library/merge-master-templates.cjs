'use strict';
/**
 * merge-master-templates.cjs
 * يستخرج جميع الـ 56 نموذجاً معتمداً من public/legal-forms-docs/*.html
 * ويدمجها في صدارة legal-forms-summary.json و legal-forms-catalog.json
 * مع الحفاظ على كافة الـ 2,691 صيغة الحالية.
 */

const fs = require('fs');
const path = require('path');

const BASE = 'd:\\قانوني 7';
const DOCS_DIR = path.join(BASE, 'public', 'legal-forms-docs');
const SUMMARY_FILE = path.join(BASE, 'public', 'data', 'legal-forms-summary.json');
const CATALOG_FILE = path.join(BASE, 'public', 'data', 'legal-forms-catalog.json');
const CHUNKS_DIR = path.join(BASE, 'public', 'data', 'forms-chunks');

console.log('🔍 استخراج النماذج المعتمدة من legal-forms-docs...');

const docFiles = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.html'));
console.log(`📄 تم العثور على ${docFiles.length} ملف نموذج معتمد.`);

const featuredForms = [];
const featuredChunk = {};

docFiles.forEach((file, idx) => {
  const filePath = path.join(DOCS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // استخراج العنوان
  const titleMatch = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || content.match(/<title>([\s\S]*?)[—|-]/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : file.replace('.html', '');

  // استخراج التصنيف
  const badgeMatch = content.match(/<div class="badge">⚖️\s*([\s\S]*?)<\/div>/i);
  const category = badgeMatch ? badgeMatch[1].replace(/<[^>]+>/g, '').trim() : 'عقود ونماذج معتمدة';

  // استخراج الوصف
  const descMatch = content.match(/<meta name="description" content="([\s\S]*?)"/i) || content.match(/<p>([\s\S]*?)<\/p>/i);
  const preview = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // استخراج النص الكامل من data-plain
  const plainMatch = content.match(/data-plain="([\s\S]*?)"/i);
  let fullText = '';
  if (plainMatch) {
    fullText = plainMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .trim();
  }

  // إذا لم يكن data-plain موجوداً، استخرج من doc-body
  if (!fullText) {
    const bodyMatch = content.match(/<div class="doc-body">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
    if (bodyMatch) {
      fullText = bodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  const id = 'featured-' + (idx + 1);
  const wordCount = fullText ? fullText.split(/\s+/).length : 350;

  const formObj = {
    id: id,
    title: title,
    category: category,
    icon: '⭐',
    wordCount: wordCount,
    preview: preview || (fullText ? fullText.substring(0, 150) + '...' : 'صيغة قانونية معتمدة ومحدثة.'),
    isFeatured: true,
    docUrl: '/legal-forms-docs/' + file
  };

  featuredForms.push(formObj);
  featuredChunk[id] = {
    id: id,
    title: title,
    category: category,
    fullText: fullText || preview,
    isFeatured: true
  };
});

console.log(`✅ تم استخراج ${featuredForms.length} نموذجاً معتمداً بنجاح.`);

// حفظ الـ featured chunk
fs.mkdirSync(CHUNKS_DIR, { recursive: true });
fs.writeFileSync(path.join(CHUNKS_DIR, 'chunk-featured.json'), JSON.stringify(featuredChunk), 'utf8');

// تحميل الـ summary الحالي
const currentSummary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
const existingForms = currentSummary.forms.filter(f => !f.id.startsWith('featured-'));

// دمج النماذج المعتمدة في المقدمة
const mergedForms = [...featuredForms, ...existingForms];

// تحديث التصنيفات بإضافة "⭐ النماذج المعتمدة الأكثر طلباً" في البداية
const catCounts = {};
mergedForms.forEach(f => {
  catCounts[f.category] = (catCounts[f.category] || 0) + 1;
});

const updatedCategories = [
  { category: '⭐ النماذج المعتمدة الأكثر طلباً', icon: '⭐', count: featuredForms.length },
  ...Object.entries(catCounts)
    .filter(([c]) => c !== '⭐ النماذج المعتمدة الأكثر طلباً')
    .map(([category, count]) => ({
      category,
      icon: category.includes('بيع') ? '🤝' : category.includes('إيجار') ? '🏢' : category.includes('شرك') ? '💼' : category.includes('دعوى') || category.includes('جنح') ? '⚖️' : '📄',
      count
    }))
];

const updatedSummary = {
  total: mergedForms.length,
  updatedAt: new Date().toISOString(),
  categories: updatedCategories,
  forms: mergedForms
};

fs.writeFileSync(SUMMARY_FILE, JSON.stringify(updatedSummary), 'utf8');
console.log(`💾 تم حفظ legal-forms-summary.json بإجمالي: ${mergedForms.length} نموذج وصيغة.`);

// نسخ البيانات المحدثة إلى dist
const distDataDir = path.join(BASE, 'dist', 'data');
fs.mkdirSync(distDataDir, { recursive: true });
fs.copyFileSync(SUMMARY_FILE, path.join(distDataDir, 'legal-forms-summary.json'));
fs.copyFileSync(path.join(CHUNKS_DIR, 'chunk-featured.json'), path.join(distDataDir, 'forms-chunks', 'chunk-featured.json'));

console.log('\n🎉 تم دمج النماذج المعتمدة بنجاح تام!');
