#!/usr/bin/env node
/**
 * upload-batch-direct.cjs
 * يرفع دفعات تصاعدية بحجم 50 كتاب في كل مرة بسرعة وثبات فائق
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const STASH_BOOKS = path.join(PROJECT_ROOT, '_staged_all_books');
const DIST_BOOKS = path.join(PROJECT_ROOT, 'dist', 'books');
const PUBLIC_BOOKS = path.join(PROJECT_ROOT, 'public', 'books');
const PROGRESS_FILE = path.join(__dirname, 'live-uploaded-books.json');

let uploadedList = [];
if (fs.existsSync(PROGRESS_FILE)) {
  try { uploadedList = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch(e) {}
}
const uploadedSet = new Set(uploadedList);

const allBooks = fs.readdirSync(STASH_BOOKS).filter(f => f.endsWith('.pdf'));
const pendingBooks = allBooks.filter(f => !uploadedSet.has(f));

console.log(`📚 إجمالي الكتب بالمستودع: ${allBooks.length}`);
console.log(`✅ المرفوع والمستقر: ${uploadedSet.size}`);
console.log(`⏳ المتبقي للرفع: ${pendingBooks.length}`);

if (pendingBooks.length === 0) {
  console.log('🎉 تهانينا! اكتمل رفع كافة محتويات المكتبة القانونية 100%.');
  process.exit(0);
}

// زيادة حجم الدفعة إلى 50 كتاب بعد التأكد من سرعة وثبات النشر
const BATCH_SIZE = 50;
const currentBatch = pendingBooks.slice(0, BATCH_SIZE);

console.log(`\n🚀 تجهيز ودمج الدفعة القادمة (${currentBatch.length} كتاب)...`);

currentBatch.forEach(file => {
  const src = path.join(STASH_BOOKS, file);
  const pDest = path.join(PUBLIC_BOOKS, file);
  const dDest = path.join(DIST_BOOKS, file);
  fs.copyFileSync(src, pDest);
  fs.copyFileSync(src, dDest);
  uploadedSet.add(file);
});

// حفظ السجل المحدث
fs.writeFileSync(PROGRESS_FILE, JSON.stringify(Array.from(uploadedSet), null, 2), 'utf8');

// تنظيف كاش firebase
const cacheDir = path.join(PROJECT_ROOT, '.firebase');
if (fs.existsSync(cacheDir)) {
  fs.readdirSync(cacheDir)
    .filter(f => f.startsWith('hosting.') && f.endsWith('.cache'))
    .forEach(f => { try { fs.unlinkSync(path.join(cacheDir, f)); } catch {} });
}

console.log(`📡 جاري النشر والرفع على Firebase Hosting...`);
const deployResult = execSync('npx firebase deploy --only hosting:app --project justice-91571', {
  cwd: PROJECT_ROOT,
  encoding: 'utf8',
  timeout: 300000
});

console.log(deployResult);
console.log(`\n✨ تم نشر الدفعة بنجاح! الإجمالي على الموقع الآن: ${uploadedSet.size} كتاب.`);
