#!/usr/bin/env node
/**
 * extract-library-docs-text.cjs
 * يقوم باستخراج النصوص العربية وتقسيمها إلى Chunks خفيفة (60 مدخلاً لكل chunk لتكون الملفات < 15MB)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const ROOT_LIB = 'D:\\المكتبة القانونية';
const OUT_DIR = path.join(__dirname, '..', '..', 'public', 'data', 'library-docs-chunks');
const SUMMARY_FILE = path.join(__dirname, '..', '..', 'public', 'data', 'legal-catalog-summary.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

// مسح أي chunks سابقة
fs.readdirSync(OUT_DIR).forEach(f => {
  if (f.startsWith('doc-chunk-') || f === 'doc-index-map.json') {
    fs.unlinkSync(path.join(OUT_DIR, f));
  }
});

console.log('🔍 مسح واستخراج النصوص من ملفات الوورد والمذكرات القانونية...');

function extractDocx(buffer) {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    const xml = zip.readAsText('word/document.xml');
    if (!xml) return '';
    const text = xml
      .replace(/<w:p[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .trim();
    return text;
  } catch (e) {
    return '';
  }
}

function extractDoc(buffer) {
  let text = '';
  try {
    const u16 = buffer.toString('utf16le');
    const arabicU16Matches = u16.match(/[\u0600-\u06FF\u0750-\u077F\s\d.,:;()!؟"'\-\n\r]{10,}/g);
    if (arabicU16Matches && arabicU16Matches.join(' ').length > 80) {
      text = arabicU16Matches.join('\n').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 50) return text;
    }
  } catch (e) {}

  try {
    const cp1256 = iconv.decode(buffer, 'win1256');
    const arabicMatches = cp1256.match(/[\u0600-\u06FF\u0750-\u077F\s\d.,:;()!؟"'\-\n\r]{8,}/g);
    if (arabicMatches && arabicMatches.join(' ').length > 50) {
      text = arabicMatches.join('\n').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').replace(/\s+/g, ' ').trim();
      return text;
    }
  } catch (e) {}

  return text;
}

function findDocFiles(dir, list = []) {
  let entries;
  try { entries = fs.readdirSync(dir); } catch (e) { return list; }
  for (const e of entries) {
    const full = path.join(dir, e);
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      findDocFiles(full, list);
    } else {
      const ext = path.extname(e).toLowerCase().replace('.', '');
      if (ext === 'doc' || ext === 'docx') {
        list.push({ path: full, name: e, ext, size: stat.size });
      }
    }
  }
  return list;
}

const docFiles = findDocFiles(ROOT_LIB);
console.log(`📄 تم العثور على ${docFiles.length} ملف وورد ومذكرة قانونية.`);

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

const docsData = {};
let count = 0;

for (let i = 0; i < docFiles.length; i++) {
  const f = docFiles[i];
  try {
    const buf = fs.readFileSync(f.path);
    let content = f.ext === 'docx' ? extractDocx(buf) : extractDoc(buf);

    if (content && content.length >= 20) {
      const key = f.name.replace(/\.(doc|docx)$/i, '').trim();
      docsData[key] = {
        name: f.name,
        title: key,
        ext: f.ext,
        sizeFormatted: (f.size / 1024).toFixed(1) + ' KB',
        text: content
      };
      count++;
    }
  } catch (err) {}
}

console.log(`\n✅ تم استخراج النصوص بنجاح لـ ${count} مذكرة ومرجع وفتوى قانونية!`);

// تقسيم إلى Chunks خفيفة (60 ملف لكل جزء حتى لا يتجاوز أي ملف 15-20 MB)
const CHUNK_SIZE = 60;
const rawKeys = Object.keys(docsData);
const totalChunks = Math.ceil(rawKeys.length / CHUNK_SIZE);
const docIndexMap = {};
const normChunkMap = {};

for (let c = 0; c < totalChunks; c++) {
  const chunkKeys = rawKeys.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
  const chunkObj = {};
  chunkKeys.forEach(k => {
    chunkObj[k] = docsData[k];
    docIndexMap[k] = c;

    const norm = normalizeDeep(k);
    if (norm && !normChunkMap[norm]) {
      normChunkMap[norm] = { chunkId: c, item: docsData[k] };
    }
  });
  const chunkFile = path.join(OUT_DIR, `doc-chunk-${c}.json`);
  fs.writeFileSync(chunkFile, JSON.stringify(chunkObj), 'utf8');
}

// مطابقة عناصر الكتالوج لضمان ربط 100% من العناوين
const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
const docItems = summary.items.filter(i => i.e !== 'pdf');

let catalogMatched = 0;
docItems.forEach(doc => {
  const title = (doc.t || '').trim();
  if (!title) return;

  if (docIndexMap[title] !== undefined) {
    catalogMatched++;
    return;
  }

  const norm = normalizeDeep(title);
  if (normChunkMap[norm]) {
    docIndexMap[title] = normChunkMap[norm].chunkId;
    catalogMatched++;
    return;
  }

  if (norm.length >= 10) {
    const candidate = Object.keys(normChunkMap).find(k => k.length >= 10 && (k.includes(norm) || norm.includes(k)));
    if (candidate) {
      docIndexMap[title] = normChunkMap[candidate].chunkId;
      catalogMatched++;
    }
  }
});

fs.writeFileSync(path.join(OUT_DIR, 'doc-index-map.json'), JSON.stringify(docIndexMap), 'utf8');
console.log(`📦 تم تقسيم وحفظ النصوص في ${totalChunks} أجزاء خفيفة (<15MB لكل ملف).`);
console.log(`🗺️ تم ربط ${catalogMatched} / ${docItems.length} عنصر كتالوج في doc-index-map.json.`);

// نسخ البيانات إلى dist
const distChunksDir = path.join(__dirname, '..', '..', 'dist', 'data', 'library-docs-chunks');
fs.mkdirSync(distChunksDir, { recursive: true });
fs.readdirSync(OUT_DIR).forEach(f => {
  fs.copyFileSync(path.join(OUT_DIR, f), path.join(distChunksDir, f));
});
console.log('📁 تم تحديث مجلد dist بالكامل.');
