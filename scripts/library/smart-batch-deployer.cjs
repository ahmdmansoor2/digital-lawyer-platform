#!/usr/bin/env node
/**
 * smart-batch-deployer.cjs
 * يرفع كتب الـ PDF تدريجياً على دفعات صغيرة (15 إلى 25 كتاب في كل دفعة)
 * حتى لا يحدث Timeout في Firebase Hosting Upload API
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const PUBLIC_BOOKS = path.join(PROJECT_ROOT, 'public', 'books');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const DIST_BOOKS = path.join(DIST_DIR, 'books');
const STASH_BOOKS = path.join(PROJECT_ROOT, '_staged_all_books');

// 1. إنشاء مجلد التخزين المؤقت ونقل كل الكتب إليه
if (!fs.existsSync(STASH_BOOKS)) {
  fs.mkdirSync(STASH_BOOKS, { recursive: true });
}

console.log('🔄 فحص وتنظيم ملفات الكتب للنشر التدريجي المستقر...');

// نقل الكتب من public/books و dist/books إلى STASH_BOOKS
const allAvailablePdfs = new Set();

if (fs.existsSync(PUBLIC_BOOKS)) {
  fs.readdirSync(PUBLIC_BOOKS).filter(f => f.endsWith('.pdf')).forEach(f => {
    allAvailablePdfs.add(f);
    const src = path.join(PUBLIC_BOOKS, f);
    const dest = path.join(STASH_BOOKS, f);
    if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  });
}

if (fs.existsSync(DIST_BOOKS)) {
  fs.readdirSync(DIST_BOOKS).filter(f => f.endsWith('.pdf')).forEach(f => {
    allAvailablePdfs.add(f);
    const src = path.join(DIST_BOOKS, f);
    const dest = path.join(STASH_BOOKS, f);
    if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
  });
}

console.log(`📚 إجمالي الكتب الجاهزة للرفع التدريجي: ${allAvailablePdfs.size} كتاب.`);

// مسار سجل الكتب المنشورة بالفعل على Firebase
const DEPLOYED_LOG = path.join(__dirname, 'deployed-books-list.json');
let deployedBooks = new Set();
if (fs.existsSync(DEPLOYED_LOG)) {
  try {
    const list = JSON.parse(fs.readFileSync(DEPLOYED_LOG, 'utf8'));
    deployedBooks = new Set(list);
  } catch(e) {}
}

const remainingBooks = Array.from(allAvailablePdfs).filter(f => !deployedBooks.has(f));
console.log(`✅ تم نشر واستقرار: ${deployedBooks.size} كتاب سابقاً.`);
console.log(`🚀 المتبقي للنشر: ${remainingBooks.length} كتاب.\n`);

const BATCH_SIZE = 25; // 25 كتاب في كل دورة
const currentBatch = remainingBooks.slice(0, BATCH_SIZE);

if (currentBatch.length === 0) {
  console.log('🎉 تهانينا! جميع الكتب المتاحة تم رفعها ونشرها بنجاح 100%.');
  process.exit(0);
}

console.log(`📦 جاري تجهيز الدفعة الحالية (${currentBatch.length} كتاب)...`);

// تنظيف dist/books و public/books وإبقاء الكتب المنشورة + الدفعة الحالية
fs.mkdirSync(PUBLIC_BOOKS, { recursive: true });
fs.mkdirSync(DIST_BOOKS, { recursive: true });

// إبقاء جميع المنشور مسبقاً + الدفعة الحالية
const activeBooks = new Set([...deployedBooks, ...currentBatch]);

activeBooks.forEach(filename => {
  const src = path.join(STASH_BOOKS, filename);
  const pDest = path.join(PUBLIC_BOOKS, filename);
  const dDest = path.join(DIST_BOOKS, filename);
  if (fs.existsSync(src)) {
    if (!fs.existsSync(pDest)) fs.copyFileSync(src, pDest);
    if (!fs.existsSync(dDest)) fs.copyFileSync(src, dDest);
  }
});

// حذف ملف الكاش لـ firebase
const cacheDir = path.join(PROJECT_ROOT, '.firebase');
if (fs.existsSync(cacheDir)) {
  fs.readdirSync(cacheDir)
    .filter(f => f.startsWith('hosting.') && f.endsWith('.cache'))
    .forEach(f => { try { fs.unlinkSync(path.join(cacheDir, f)); } catch {} });
}

console.log(`🚀 بدء Deploy الدفعة (${deployedBooks.size + currentBatch.length} / ${allAvailablePdfs.size})...`);

try {
  const deployOut = execSync('npx firebase deploy --only hosting:app --project justice-91571', {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 300000
  });
  console.log(deployOut);
  
  // إذا نجح Deploy، نعتمد الدفعة الحالية
  currentBatch.forEach(b => deployedBooks.add(b));
  fs.writeFileSync(DEPLOYED_LOG, JSON.stringify(Array.from(deployedBooks), null, 2), 'utf8');
  console.log(`\n✅ تم نشر الدفعة بنجاح! الإجمالي على الموقع الآن: ${deployedBooks.size} كتاب.`);
  console.log(`⏳ المتبقي: ${remainingBooks.length - currentBatch.length} كتاب.`);
} catch (err) {
  console.error('❌ حدث خطأ أثناء deploy الدفعة:', err.stdout || err.message);
  process.exit(1);
}
