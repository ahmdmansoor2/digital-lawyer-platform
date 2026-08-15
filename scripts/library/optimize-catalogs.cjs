#!/usr/bin/env node
/**
 * optimize-catalogs.cjs — تحسين وضغط الفهارس لسرعة التحميل اللحظي على المتصفح
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const FORMS_FILE = path.join(DATA_DIR, 'legal-forms-catalog.json');
const FORMS_SUMMARY_FILE = path.join(DATA_DIR, 'legal-forms-summary.json');
const FORMS_CHUNKS_DIR = path.join(DATA_DIR, 'forms-chunks');

fs.mkdirSync(FORMS_CHUNKS_DIR, { recursive: true });

console.log('⚡ بدء تحسين وضغط فهارس الصيغ والمكتبة...');

if (fs.existsSync(FORMS_FILE)) {
  const formsData = JSON.parse(fs.readFileSync(FORMS_FILE, 'utf8'));
  const forms = formsData.forms || [];

  console.log(`معالجة ${forms.length} صيغة...`);

  // 1. إنشاء فهرس ملخص فائق الخفة (Summary)
  const summaryForms = forms.map(f => ({
    id: f.id,
    title: f.title,
    category: f.category,
    icon: f.icon,
    color: f.color,
    wordCount: f.wordCount,
    sizeFormatted: f.sizeFormatted,
    preview: f.textPreview,
    hasText: f.hasText
  }));

  const summaryData = {
    version: '2.0.0',
    totalForms: forms.length,
    categories: formsData.categories,
    forms: summaryForms
  };

  fs.writeFileSync(FORMS_SUMMARY_FILE, JSON.stringify(summaryData), 'utf8');
  console.log(`✅ تم حفظ الفهرس الخفيف: ${FORMS_SUMMARY_FILE} (الحجم: ${(fs.statSync(FORMS_SUMMARY_FILE).size / 1024).toFixed(1)} KB)`);

  // 2. تقسيم النصوص الكاملة إلى مجموعات (Chunks من 100 صيغة لكل ملف) للتحميل عند الطلب
  const CHUNK_SIZE = 100;
  let chunkIdx = 0;
  for (let i = 0; i < forms.length; i += CHUNK_SIZE) {
    const chunkForms = forms.slice(i, i + CHUNK_SIZE);
    const chunkMap = {};
    chunkForms.forEach(f => {
      chunkMap[f.id] = {
        id: f.id,
        title: f.title,
        category: f.category,
        fullText: f.fullText,
        wordCount: f.wordCount
      };
    });
    fs.writeFileSync(path.join(FORMS_CHUNKS_DIR, `chunk-${chunkIdx}.json`), JSON.stringify(chunkMap), 'utf8');
    chunkIdx++;
  }
  console.log(`✅ تم إنشاء ${chunkIdx} حزمة نصوص كاملة في forms-chunks/ للتحميل الفوري عند الطلب.`);
}
