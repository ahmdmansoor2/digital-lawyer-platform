#!/usr/bin/env node
/**
 * extract-forms.cjs — محرك استخراج وفهرسة نصوص صيغ العقود والدعاوى (2,940+ صيغة)
 * 
 * وضع القراءة فقط (READ-ONLY) — يقرأ ملفات Word ويستخرج النصوص العربية النظيفة
 * ويصنفها إلى أقسام موضوعية دقيقة مع تجهيزها للعرض والنسخ والتحميل كملفات Word.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_LIBRARY = 'D:\\المكتبة القانونية';
const FORMS_DIR = path.join(ROOT_LIBRARY, 'الفلاشة 2', 'صيغ');
const PROCEDURES_DIR = path.join(ROOT_LIBRARY, 'الفلاشة 2', 'إجراءات دعاوي');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const FORMS_OUTPUT = path.join(OUTPUT_DIR, 'legal-forms-catalog.json');
const FORMS_STATS_OUTPUT = path.join(OUTPUT_DIR, 'legal-forms-stats.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// دالة استخراج النص العربي النظيف من ملف Word (.doc / .docx)
function extractTextFromDoc(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // 1. إذا كان docx أو ZIP
    if (ext === '.docx' || (buf[0] === 0x50 && buf[1] === 0x4B)) {
      try {
        const xmlContent = buf.toString('utf8');
        const matches = xmlContent.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
        if (text.trim().length > 20) return cleanExtractedText(text);
      } catch(e) {}
    }

    // 2. إذا كان doc ثنائي (Word 97-2003) — تجربة UTF-16LE
    try {
      const utf16Str = buf.toString('utf16le');
      const arabicBlocks = utf16Str.match(/[\u0600-\u06FF\s\d\p{P}]{15,}/gu) || [];
      if (arabicBlocks.length > 0) {
        const combined = arabicBlocks.join('\n');
        if (combined.length > 30) return cleanExtractedText(combined);
      }
    } catch(e) {}

    // 3. تجربة UTF-8
    try {
      const utf8Str = buf.toString('utf8');
      const arabicBlocks = utf8Str.match(/[\u0600-\u06FF\s\d\p{P}]{15,}/gu) || [];
      if (arabicBlocks.length > 0) {
        const combined = arabicBlocks.join('\n');
        if (combined.length > 30) return cleanExtractedText(combined);
      }
    } catch(e) {}

  } catch(err) {}
  return '';
}

function cleanExtractedText(text) {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

function cleanTitle(filename) {
  const ext = path.extname(filename);
  let name = path.basename(filename, ext);
  name = name.replace(/^[\d\s_\-—.]+/, '').replace(/[\d\s_\-—.]+$/, '');
  name = name.replace(/[_\-]+/g, ' ').trim();
  return name || path.basename(filename, ext);
}

// خريطة التصنيفات الفرعية للصيغ
const CATEGORY_MAP = {
  'إعلانات وانذارات': { category: 'إنذارات وإعلانات محضرين', icon: '📜', color: '#f59e0b' },
  'استئنافات': { category: 'صحف استئناف وطعون', icon: '⚖️', color: '#ef4444' },
  'اشكال': { category: 'إشكالات تنفيذ ووقف تنفيذ', icon: '🛑', color: '#dc2626' },
  'تظلمات': { category: 'تظلمات وأوامر أداء', icon: '📝', color: '#8b5cf6' },
  'جنح': { category: 'عرائض جنح ومذكرات جنائية', icon: '🛡️', color: '#ef4444' },
  'دفاع ودفوع': { category: 'مذكرات دفاع ودفوع قانونية', icon: '📑', color: '#06b6d4' },
  'شئون الاسرة': { category: 'دعاوى الأسرة والأحوال الشخصية', icon: '👨‍👩‍👧‍👦', color: '#ec4899' },
  'شهر عقاري': { category: 'توكيلات وإقرارات الشهر العقاري', icon: '🏢', color: '#10b981' },
  'صيغ الدعاوي': { category: 'صحف الدعاوى المدنية والتجارية', icon: '📕', color: '#3b82f6' },
  'طلبات ونماذج هامة لكل محامي': { category: 'طلبات قضائية وإدارية ونماذج', icon: '📋', color: '#6366f1' },
  'مذكرات دفاع متنوعة': { category: 'مذكرات دفاع شاملة', icon: '📚', color: '#a855f7' },
  'نماذج عقود وورد': { category: 'عقود بيع وإيجار وشركات واتفاقيات', icon: '🤝', color: '#10b981' },
  'إجراءات دعاوي': { category: 'إجراءات التقاضي وخطوات الدعاوى', icon: '⚙️', color: '#06b6d4' },
  'منوعات': { category: 'صيغ ونماذج متنوعة', icon: '📂', color: '#64748b' }
};

console.log('🚀 بدء استخراج وفهرسة نصوص صيغ العقود والدعاوى (2,940+ صيغة)...');
console.time('formsExtraction');

const allForms = [];
const categoryStats = {};

let formId = 1;

function processFolder(folderPath, defaultCategoryName) {
  if (!fs.existsSync(folderPath)) return;
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        const catInfo = CATEGORY_MAP[entry.name] || { category: entry.name, icon: '📄', color: '#64748b' };
        processFolder(fullPath, catInfo.category);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (entry.name.startsWith('~$') || (ext !== '.doc' && ext !== '.docx' && ext !== '.rtf' && ext !== '.txt')) continue;

        try {
          const stat = fs.statSync(fullPath);
          const title = cleanTitle(entry.name);
          const relPath = path.relative(ROOT_LIBRARY, fullPath).replace(/\\/g, '/');
          const parentFolder = path.basename(path.dirname(fullPath));
          const catMeta = CATEGORY_MAP[parentFolder] || CATEGORY_MAP[defaultCategoryName] || { category: defaultCategoryName || 'صيغ متنوعة', icon: '📄', color: '#64748b' };
          
          const text = extractTextFromDoc(fullPath);
          const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

          const formItem = {
            id: `form-${formId++}`,
            title,
            originalName: entry.name,
            relPath,
            category: catMeta.category,
            icon: catMeta.icon,
            color: catMeta.color,
            ext: ext.replace('.', ''),
            sizeBytes: stat.size,
            sizeFormatted: (stat.size / 1024).toFixed(1) + ' KB',
            wordCount,
            hasText: text.length > 50,
            textPreview: text ? text.slice(0, 350).replace(/\s+/g, ' ') + '...' : '',
            fullText: text || ''
          };

          allForms.push(formItem);

          if (!categoryStats[catMeta.category]) {
            categoryStats[catMeta.category] = { category: catMeta.category, icon: catMeta.icon, color: catMeta.color, count: 0, withTextCount: 0 };
          }
          categoryStats[catMeta.category].count++;
          if (formItem.hasText) categoryStats[catMeta.category].withTextCount++;

        } catch(err) {}
      }
    }
  } catch(err) {}
}

// فحص مجلد الصيغ ومجلد إجراءات الدعاوى
processFolder(FORMS_DIR, 'صيغ ونماذج عامة');
processFolder(PROCEDURES_DIR, 'إجراءات التقاضي وخطوات الدعاوى');

console.timeEnd('formsExtraction');
console.log(`✅ تم استخراج وفهرسة ${allForms.length} صيغة ونموذج قانوني بنجاح!`);

// تصدير الفهرس المكتمل
const formsData = {
  version: '2.0.0',
  generatedAt: new Date().toISOString(),
  totalForms: allForms.length,
  categories: Object.values(categoryStats),
  forms: allForms
};

fs.writeFileSync(FORMS_OUTPUT, JSON.stringify(formsData), 'utf8');
fs.writeFileSync(FORMS_STATS_OUTPUT, JSON.stringify({
  totalForms: allForms.length,
  categories: Object.values(categoryStats)
}, null, 2), 'utf8');

console.log(`📁 تم حفظ فهرس الصيغ في: ${FORMS_OUTPUT} (الحجم: ${(fs.statSync(FORMS_OUTPUT).size / (1024 * 1024)).toFixed(2)} MB)`);
console.log('\n📊 إحصاءات أقسام الصيغ:');
Object.values(categoryStats).forEach(c => {
  console.log(`  - ${c.icon} ${c.category}: ${c.count} صيغة (تم استخراج نصوص: ${c.withTextCount})`);
});
