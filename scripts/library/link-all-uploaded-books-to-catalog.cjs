#!/usr/bin/env node
/**
 * link-all-uploaded-books-to-catalog.cjs
 * يقوم بربط كافة الـ 1,846 ملف PDF المرفوعة بفهرس المكتبة العام
 * بحيث يتحول زر كل كتاب في الموقع من "فهرسة فقط" إلى "📖 مطالعة وتحميل فوري"
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CATALOG_FILE = path.join(__dirname, '..', '..', 'public', 'data', 'legal-catalog.json');
const UPLOADED_LOG = path.join(__dirname, 'live-uploaded-books.json');
const SCAN_FULL_LOG = 'C:\\Users\\احمد منصور\\.gemini\\antigravity\\brain\\4a33d51c-bfe6-455c-b151-deff91fe682b\\scratch\\library-pdfs-full.json';

const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
const uploadedList = JSON.parse(fs.readFileSync(UPLOADED_LOG, 'utf8'));
const uploadedSet = new Set(uploadedList);

// بناء خريطة بحث سريعة لأسماء الملفات المرفوعة
function normalizeName(str) {
  return str.replace(/[\s_.-]+/g, '').toLowerCase();
}

const uploadedNormMap = new Map();
uploadedList.forEach(filename => {
  uploadedNormMap.set(normalizeName(filename), filename);
});

let matched = 0;

catalog.items.forEach(item => {
  if (item.ext === 'pdf' || item.isPdf) {
    // محاولة المطابقة المباشرة بالاسم
    const directName = (item.title + '.pdf');
    const normTitle = normalizeName(item.title);
    
    let matchedFile = null;

    if (uploadedSet.has(directName)) {
      matchedFile = directName;
    } else if (uploadedNormMap.has(normTitle)) {
      matchedFile = uploadedNormMap.get(normTitle);
    } else {
      // مطابقة بالتقريب
      for (const [normU, realU] of uploadedNormMap.entries()) {
        if (normU.includes(normTitle) || normTitle.includes(normU)) {
          matchedFile = realU;
          break;
        }
      }
    }

    if (matchedFile) {
      item.hasDirectPdf = true;
      item.downloadUrl = `/books/${encodeURIComponent(matchedFile)}`;
      matched++;
    }
  }
});

console.log(`✅ تم ربط ${matched} كتاب من الفهرس بملفات الـ PDF المرفوعة والمباشرة على الموقع!`);

fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf8');

// إعادة بناء الفهرس الخفيف وHTML
require('./build-rich-library.cjs');
