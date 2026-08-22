'use strict';
/**
 * rebuild-index-with-fuzzy.cjs
 * يُعيد بناء doc-index-map.json بإضافة mapping إضافي
 * يربط العنوان المُنقّح (من legal-catalog-summary) بالـ chunk الصحيح
 * عبر مطابقة ضبابية بين عنوان الـ catalog وأسماء الملفات في الـ chunks
 */

const fs = require('fs');
const path = require('path');

const BASE = 'd:\\قانوني 7';
const CHUNKS_DIR = path.join(BASE, 'public/data/library-docs-chunks');
const SUMMARY_FILE = path.join(BASE, 'public/data/legal-catalog-summary.json');

// دالة تنظيف النص للمقارنة الضبابية
function normalize(str) {
  return (str || '')
    .trim()
    .replace(/[-–—_~$@#^*|\\\/]/g, ' ')   // إزالة رموز خاصة
    .replace(/\s+/g, ' ')                   // توحيد المسافات
    .replace(/[أإآا]/g, 'ا')               // توحيد الألف
    .replace(/[ىي]/g, 'ي')                 // توحيد الياء
    .replace(/ة/g, 'ه')                    // توحيد التاء المربوطة
    .toLowerCase()
    .trim();
}

// 1. تحميل الـ index map الحالي
const indexMap = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, 'doc-index-map.json'), 'utf8'));
console.log('Current index map keys:', Object.keys(indexMap).length);

// 2. بناء map من النص المُنقّح -> {originalKey, chunkId}
const normalizedIndex = {};
Object.entries(indexMap).forEach(([k, chunkId]) => {
  const norm = normalize(k);
  if (!normalizedIndex[norm]) {
    normalizedIndex[norm] = { originalKey: k, chunkId };
  }
});
console.log('Normalized index keys:', Object.keys(normalizedIndex).length);

// 3. تحميل الـ summary وإيجاد الـ docs المفقودة
const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
const docItems = summary.items.filter(i => i.e !== 'pdf');
console.log('Doc items in summary:', docItems.length);

let resolved = 0;
let stillMissing = 0;
const newEntries = {};

docItems.forEach(item => {
  const t = (item.t || '').trim();
  
  // إذا موجود بالفعل -> لا شيء
  if (indexMap[t] !== undefined) return;
  
  // حاول المطابقة الضبابية
  const normT = normalize(t);
  const match = normalizedIndex[normT];
  
  if (match) {
    // أضف مدخلاً جديداً للـ indexMap بعنوان الـ catalog
    newEntries[t] = match.chunkId;
    resolved++;
  } else {
    stillMissing++;
    // لا يوجد ملف مطابق — هذه المذكرة ليس لها نص
  }
});

console.log('\nResolved via fuzzy match:', resolved);
console.log('Still truly missing:', stillMissing);

// 4. دمج المدخلات الجديدة في الـ index map
const updatedMap = { ...indexMap, ...newEntries };
fs.writeFileSync(path.join(CHUNKS_DIR, 'doc-index-map.json'), JSON.stringify(updatedMap), 'utf8');
console.log('Updated index map total keys:', Object.keys(updatedMap).length);

// 5. تحديث كل chunk بإضافة العناوين الجديدة كـ aliases
let aliasesAdded = 0;
const chunkCache = {};

Object.entries(newEntries).forEach(([catalogTitle, chunkId]) => {
  // جلب الـ chunk
  if (!chunkCache[chunkId]) {
    const chunkFile = path.join(CHUNKS_DIR, `doc-chunk-${chunkId}.json`);
    chunkCache[chunkId] = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
  }
  
  const chunk = chunkCache[chunkId];
  
  // إيجاد الـ original key في الـ chunk
  const normCatalog = normalize(catalogTitle);
  const originalKey = Object.keys(chunk).find(k => normalize(k) === normCatalog);
  
  if (originalKey && chunk[originalKey]) {
    // أضف alias بعنوان الـ catalog
    chunk[catalogTitle] = {
      ...chunk[originalKey],
      title: catalogTitle  // استخدم عنوان الـ catalog
    };
    aliasesAdded++;
  }
});

// 6. حفظ الـ chunks المحدّثة
let savedChunks = 0;
Object.entries(chunkCache).forEach(([chunkId, chunkData]) => {
  const chunkFile = path.join(CHUNKS_DIR, `doc-chunk-${chunkId}.json`);
  fs.writeFileSync(chunkFile, JSON.stringify(chunkData), 'utf8');
  savedChunks++;
});

console.log('Aliases added:', aliasesAdded);
console.log('Chunks updated:', savedChunks);
console.log('\n✅ اكتمل! يمكن الآن نشر library-docs-chunks على Firebase.');
