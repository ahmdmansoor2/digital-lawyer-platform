'use strict';
/**
 * build-complete-doc-index.cjs
 * يقوم ببناء فهرس كامل وشامل لكل المذكرات والفتاوى والوثائق
 * مع إضافة كافة المرادفات والعناوين المُنقّحة إلى Chunks و doc-index-map
 */

const fs = require('fs');
const path = require('path');

const BASE = 'd:\\قانوني 7';
const CHUNKS_DIR = path.join(BASE, 'public', 'data', 'library-docs-chunks');
const SUMMARY_FILE = path.join(BASE, 'public', 'data', 'legal-catalog-summary.json');

console.log('🚀 بدء بناء فهرس المذكرات والنصوص الكامل المحسّن...');

function normalizeDeep(str) {
  return (str || '')
    .trim()
    .replace(/^[\d\s\-_.,#()\[\]$@~+*]+/g, '')
    .replace(/^(نسخة احتياطية من|نسخة من|صيغة|نموذج|مذكرة|مذكره|دعوى|دعوي|احكام|أحكام|حكام)\s+/g, '')
    .replace(/[\$~\-_–—@#^*|\\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}

// 1. تحميل كل البيانات من الـ chunks الحالية
const allItems = [];
const chunkFiles = fs.readdirSync(CHUNKS_DIR).filter(f => f.startsWith('doc-chunk-') && f.endsWith('.json'));

chunkFiles.forEach(cf => {
  const chunkContent = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, cf), 'utf8'));
  Object.entries(chunkContent).forEach(([k, item]) => {
    allItems.push({ key: k, item });
  });
});

console.log(`📦 تم تحميل ${allItems.length} مدخل نصي من الأجزاء السابقة.`);

// مسح الأجزاء القديمة لإعادة التقسيم بأحجام خفيفة (<15MB)
chunkFiles.forEach(cf => {
  fs.unlinkSync(path.join(CHUNKS_DIR, cf));
});

// 2. بناء خريطة الفهرسة المعيارية
const normChunkMap = {};
Object.entries(chunkMap).forEach(([rawKey, val]) => {
  const norm = normalizeDeep(rawKey);
  if (norm) {
    if (!normChunkMap[norm]) normChunkMap[norm] = [];
    normChunkMap[norm].push({ rawKey, chunkId: val.chunkId, item: val.item });
  }
});

// 3. قراءة كل عناصر الكتالوج
const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
const docItems = summary.items.filter(i => i.e !== 'pdf');

const finalIndexMap = {};
let matchedCount = 0;
let aliasesCreated = 0;

docItems.forEach(doc => {
  const title = (doc.t || '').trim();
  if (!title) return;
  const normTitle = normalizeDeep(title);

  // أ. تطابق مباشر بالاسم الأصلي
  if (chunkMap[title]) {
    finalIndexMap[title] = chunkMap[title].chunkId;
    matchedCount++;
    return;
  }

  // ب. تطابق بعد التنقية العميقة
  if (normChunkMap[normTitle] && normChunkMap[normTitle].length > 0) {
    const hit = normChunkMap[normTitle][0];
    finalIndexMap[title] = hit.chunkId;
    matchedCount++;

    // إضافة العنوان كـ alias داخل الـ chunk لضمان العثور عليه
    const chunkObj = allChunkData[hit.chunkId];
    if (chunkObj && !chunkObj[title]) {
      chunkObj[title] = {
        ...hit.item,
        title: title
      };
      aliasesCreated++;
    }
    return;
  }

  // ج. تطابق بالاحتواء والكلمات المفتاحية
  if (normTitle.length >= 10) {
    const candidateKey = Object.keys(normChunkMap).find(k => 
      k.length >= 10 && (k.includes(normTitle) || normTitle.includes(k))
    );

    if (candidateKey && normChunkMap[candidateKey].length > 0) {
      const hit = normChunkMap[candidateKey][0];
      finalIndexMap[title] = hit.chunkId;
      matchedCount++;

      const chunkObj = allChunkData[hit.chunkId];
      if (chunkObj && !chunkObj[title]) {
        chunkObj[title] = {
          ...hit.item,
          title: title
        };
        aliasesCreated++;
      }
      return;
    }
  }
});

// د. إضافة كل المفاتيح الأصلية غير الموجودة في الكتالوج لضمان عدم ضياع أي مفتاح
Object.entries(chunkMap).forEach(([k, v]) => {
  if (finalIndexMap[k] === undefined) {
    finalIndexMap[k] = v.chunkId;
  }
});

console.log(`✅ تم ربط ${matchedCount} / ${docItems.length} مرجع نصي (${((matchedCount / docItems.length) * 100).toFixed(1)}%).`);
console.log(`✨ تم إنشاء ${aliasesCreated} مرادف وبديل بحث نصي.`);
console.log(`📑 إجمالي المفاتيح في فهرس البحث الموحد: ${Object.keys(finalIndexMap).length}`);

// 4. حفظ جميع الـ chunks المحدثة
let savedChunks = 0;
Object.entries(allChunkData).forEach(([chunkId, data]) => {
  const filePath = path.join(CHUNKS_DIR, `doc-chunk-${chunkId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
  savedChunks++;
});
console.log(`💾 تم حفظ ${savedChunks} ملف chunk محدث.`);

// 5. حفظ فهرس doc-index-map.json
const indexPath = path.join(CHUNKS_DIR, 'doc-index-map.json');
fs.writeFileSync(indexPath, JSON.stringify(finalIndexMap), 'utf8');
console.log(`🗺️ تم حفظ doc-index-map.json بنجاح.`);

// 6. نسخ كل الملفات إلى dist/data/library-docs-chunks
const distChunksDir = path.join(BASE, 'dist', 'data', 'library-docs-chunks');
fs.mkdirSync(distChunksDir, { recursive: true });

const filesToCopy = fs.readdirSync(CHUNKS_DIR);
filesToCopy.forEach(f => {
  const src = path.join(CHUNKS_DIR, f);
  const dst = path.join(distChunksDir, f);
  fs.copyFileSync(src, dst);
});
console.log(`📁 تم نسخ ${filesToCopy.length} ملف إلى ${distChunksDir}`);

console.log('\n🎉 اكتمل تجهيز الفهرس النصي بنجاح تام!');
