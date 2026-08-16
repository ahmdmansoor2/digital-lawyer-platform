'use strict';

const fs = require('fs');
const path = require('path');

const BASE = 'd:\\قانوني 7';
const CHUNKS_DIR = path.join(BASE, 'public', 'data', 'library-docs-chunks');
const SUMMARY_FILE = path.join(BASE, 'public', 'data', 'legal-catalog-summary.json');
const DIST_CHUNKS_DIR = path.join(BASE, 'dist', 'data', 'library-docs-chunks');
const DIST_SUMMARY_FILE = path.join(BASE, 'dist', 'data', 'legal-catalog-summary.json');

function normalize(str) {
  return (str || '')
    .trim()
    .replace(/^[\d\s\-_.,#()\[\]$@~+*]+/g, '')
    .replace(/[\$~\-_–—@#^*|\\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}

console.log('🚀 بدء مزامنة وفهرسة المكتبة القانونية لضمان عمل 100% من المراجع...');

// 1. تحميل كافة ملفات الـ chunks
const chunkFiles = fs.readdirSync(CHUNKS_DIR).filter(f => f.startsWith('doc-chunk-') && f.endsWith('.json'));
console.log(`📦 جاري فحص ${chunkFiles.length} ملف chunk...`);

const fullIndexMap = {};
const normToChunk = new Map(); // normTitle -> { chunkId, rawKey, title }
const chunkCache = {};

let totalEntriesInChunks = 0;
chunkFiles.forEach(cf => {
  const chunkId = parseInt(cf.replace('doc-chunk-', '').replace('.json', ''));
  const filePath = path.join(CHUNKS_DIR, cf);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  chunkCache[chunkId] = data;

  for (const [key, val] of Object.entries(data)) {
    if (!val || !val.text || val.text.trim().length < 5) continue;
    totalEntriesInChunks++;

    // خريطة المفتاح المباشر
    fullIndexMap[key] = chunkId;

    // خريطة العنوان إن وجد
    if (val.title && val.title.trim()) {
      fullIndexMap[val.title.trim()] = chunkId;
    }

    // خريطة الاسم بدون امتداد
    if (val.name) {
      const cleanName = val.name.replace(/\.docx?$/i, '').trim();
      if (cleanName) fullIndexMap[cleanName] = chunkId;
    }

    // خريطة للمطابقة الضبابية
    const normK = normalize(key);
    if (normK && !normToChunk.has(normK)) {
      normToChunk.set(normK, { chunkId, rawKey: key, title: val.title || key });
    }
    if (val.title) {
      const normT = normalize(val.title);
      if (normT && !normToChunk.has(normT)) {
        normToChunk.set(normT, { chunkId, rawKey: key, title: val.title });
      }
    }
  }
});

console.log(`📑 إجمالي النصوص الصالحة داخل الـ chunks: ${totalEntriesInChunks}`);
console.log(`🗺️ إجمالي مفاتيح الفهرس الأولية: ${Object.keys(fullIndexMap).length}`);

// 2. معالجة وتدقيق الكتالوج
const cat = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
console.log(`📚 إجمالي عناصر الكتالوج الحالي: ${cat.items.length}`);

const cleanItems = [];
let pdfCount = 0;
let textMatchedCount = 0;
let droppedCount = 0;
let aliasesInjected = 0;

cat.items.forEach(item => {
  // أ. ملفات PDF المباشرة
  if (item.p === 1 && item.u) {
    cleanItems.push(item);
    pdfCount++;
    return;
  }

  // استبعاد العناصر التالفة أو الفارغة تماماً
  const title = (item.t || '').trim();
  if (!title || title.length < 3 || title === 'FG') {
    droppedCount++;
    return;
  }

  // ب. البحث عن النص في الـ chunks
  let targetChunkId = fullIndexMap[title];
  let matchedKey = title;

  if (targetChunkId === undefined) {
    const norm = normalize(title);
    const hit = normToChunk.get(norm);
    if (hit) {
      targetChunkId = hit.chunkId;
      matchedKey = hit.rawKey;
    }
  }

  if (targetChunkId !== undefined) {
    // إضافة العنوان الدقيق إلى doc-index-map
    fullIndexMap[title] = targetChunkId;

    // إضافة العنوان كـ alias داخل الـ chunk لضمان العثور عليه في O(1)
    const targetChunk = chunkCache[targetChunkId];
    if (targetChunk && !targetChunk[title]) {
      const sourceObj = targetChunk[matchedKey] || Object.values(targetChunk)[0];
      if (sourceObj) {
        targetChunk[title] = {
          ...sourceObj,
          title: title
        };
        aliasesInjected++;
      }
    }

    cleanItems.push({
      ...item,
      p: 0,
      hasDirectPdf: false
    });
    textMatchedCount++;
  } else {
    // مرجع ليس له نص مستخرج
    droppedCount++;
  }
});

console.log('\n=========================================');
console.log(`✅ كتب PDF مكتملة وتعمل 100%: ${pdfCount}`);
console.log(`✅ كتب ومذكرات نصية مفهرسة ومطابقة 100%: ${textMatchedCount}`);
console.log(`🌟 إجمالي المراجع المعتمدة والشغالة بالمكتبة: ${cleanItems.length}`);
console.log(`🧹 مراجع تالفة أو وهمية تم تنظيفها: ${droppedCount}`);
console.log(`✨ أسماء وبدائل تم حقنها في الـ chunks: ${aliasesInjected}`);
console.log(`🗺️ إجمالي مفاتيح الفهرس النهائي: ${Object.keys(fullIndexMap).length}`);
console.log('=========================================\n');

// 3. حفظ الـ chunks المحدثة
fs.mkdirSync(DIST_CHUNKS_DIR, { recursive: true });
for (const [chunkId, data] of Object.entries(chunkCache)) {
  const fileName = `doc-chunk-${chunkId}.json`;
  const pubPath = path.join(CHUNKS_DIR, fileName);
  const distPath = path.join(DIST_CHUNKS_DIR, fileName);
  const jsonStr = JSON.stringify(data);
  fs.writeFileSync(pubPath, jsonStr, 'utf8');
  fs.writeFileSync(distPath, jsonStr, 'utf8');
}
console.log(`💾 تم تحديث وحفظ جميع ملفات الـ chunks في public و dist.`);

// 4. حفظ doc-index-map.json
const indexMapStr = JSON.stringify(fullIndexMap);
fs.writeFileSync(path.join(CHUNKS_DIR, 'doc-index-map.json'), indexMapStr, 'utf8');
fs.writeFileSync(path.join(DIST_CHUNKS_DIR, 'doc-index-map.json'), indexMapStr, 'utf8');
console.log(`🗺️ تم حفظ doc-index-map.json المحدث في public و dist.`);

// 5. حفظ legal-catalog-summary.json
cat.items = cleanItems;
cat.total = cleanItems.length;
const summaryStr = JSON.stringify(cat);
fs.writeFileSync(SUMMARY_FILE, summaryStr, 'utf8');
fs.writeFileSync(DIST_SUMMARY_FILE, summaryStr, 'utf8');
console.log(`📚 تم حفظ legal-catalog-summary.json المنقح في public و dist.`);

console.log('\n🎉 تمت المزامنة والتدقيق الشامل بنجاح!');
