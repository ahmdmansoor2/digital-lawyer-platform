#!/usr/bin/env node
/**
 * upload-all-library.cjs
 * رفع كامل المكتبة القانونية (1,970 PDF) إلى public/books/
 * مع تجاهل الملفات المرفوعة مسبقاً، والنشر الفوري على Firebase بعد كل دفعة
 *
 * يُشغَّل مرة واحدة ويستمر حتى يكتمل كل شيء.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ─── الإعدادات ───────────────────────────────────────────────────────────────
const ROOT_LIB     = 'D:\\المكتبة القانونية';
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const PUBLIC_BOOKS = path.join(PROJECT_ROOT, 'public', 'books');
const DIST_BOOKS   = path.join(PROJECT_ROOT, 'dist',   'books');
const SCAN_JSON    = 'C:\\Users\\احمد منصور\\.gemini\\antigravity\\brain\\4a33d51c-bfe6-455c-b151-deff91fe682b\\scratch\\library-pdfs-full.json';
const PROGRESS_LOG = path.join(__dirname, 'upload-progress.json');
const DEPLOY_AFTER = 30; // ادفع على Firebase كل 30 ملف
const MAX_MB_FILE  = 49; // تجاهل الملفات الأكبر من 49 MB (حد Firebase)

// ─── تحميل الفهرس ────────────────────────────────────────────────────────────
const allPdfs = JSON.parse(fs.readFileSync(SCAN_JSON, 'utf8'));

// ─── تحميل سجل التقدم ────────────────────────────────────────────────────────
let progress = { done: [], skipped: [], failed: [], deploys: 0 };
if (fs.existsSync(PROGRESS_LOG)) {
  try { progress = JSON.parse(fs.readFileSync(PROGRESS_LOG, 'utf8')); } catch {}
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_LOG, JSON.stringify(progress, null, 2), 'utf8');
}

// ─── المسارات المرفوعة مسبقاً ────────────────────────────────────────────────
const alreadyUploaded = new Set(fs.readdirSync(PUBLIC_BOOKS));
const doneSet = new Set(progress.done);

// ─── دالة توليد اسم آمن للملف ─────────────────────────────────────────────────
function safeFileName(originalName, dirPath) {
  // إزالة الامتداد
  const base = originalName.replace(/\.pdf$/i, '');
  // استبدال الفراغات والرموز بـ -
  let safe = base
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u0600-\u06FF\u0750-\u077F.-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  // إن كان الاسم فارغاً أو قصيراً جداً — استخدم hash
  if (safe.length < 3) {
    safe = 'book-' + Buffer.from(originalName).toString('hex').slice(0, 12);
  }
  return safe + '.pdf';
}

// ─── فلترة الملفات للرفع ─────────────────────────────────────────────────────
const toUpload = allPdfs.filter(pdf => {
  if (pdf.mb > MAX_MB_FILE) return false; // أكبر من حد Firebase
  const destName = safeFileName(pdf.name, pdf.dir);
  if (alreadyUploaded.has(destName)) return false; // مرفوع مسبقاً
  if (doneSet.has(pdf.path)) return false;          // مكتمل في جلسة سابقة
  return true;
});

const skippedLarge = allPdfs.filter(p => p.mb > MAX_MB_FILE);

console.log(`\n📚 إجمالي الملفات: ${allPdfs.length}`);
console.log(`✅ مرفوع مسبقاً:   ${alreadyUploaded.size}`);
console.log(`⏩ حجم أكبر من 49 MB (يُتجاهل): ${skippedLarge.length}`);
console.log(`🚀 يُرفع الآن:     ${toUpload.length} ملف\n`);

// ─── رفع + نشر ────────────────────────────────────────────────────────────────
fs.mkdirSync(PUBLIC_BOOKS, { recursive: true });
fs.mkdirSync(DIST_BOOKS,   { recursive: true });

let batchCount   = 0;
let totalUploaded = 0;

function deployBatch() {
  console.log(`\n🚀 نشر الدفعة ${progress.deploys + 1} على Firebase...`);
  // نسخ كل public/books → dist/books
  try {
    execSync(
      `robocopy "${PUBLIC_BOOKS}" "${DIST_BOOKS}" *.pdf /NP /NFL /NDL /NJH /NJS`,
      { stdio: 'pipe', encoding: 'buffer' }
    );
  } catch(e) { /* robocopy returns non-0 on partial copy */ }

  // حذف الـ cache
  const cacheDir = path.join(PROJECT_ROOT, '.firebase');
  if (fs.existsSync(cacheDir)) {
    fs.readdirSync(cacheDir)
      .filter(f => f.startsWith('hosting.') && f.endsWith('.cache'))
      .forEach(f => { try { fs.unlinkSync(path.join(cacheDir, f)); } catch {} });
  }

  // deploy
  const r = spawnSync('npx', [
    'firebase', 'deploy',
    '--only', 'hosting:app',
    '--project', 'justice-91571'
  ], { encoding: 'utf8', timeout: 300000, cwd: __dirname });

  if (r.status === 0) {
    progress.deploys++;
    console.log(`✅ Deploy ${progress.deploys} مكتمل.`);
  } else {
    console.error('❌ Deploy فشل:', r.stderr?.slice(0,300));
  }
  saveProgress();
}

for (let i = 0; i < toUpload.length; i++) {
  const pdf = toUpload[i];
  const destName = safeFileName(pdf.name, pdf.dir);
  const destPath = path.join(PUBLIC_BOOKS, destName);

  try {
    fs.copyFileSync(pdf.path, destPath);
    progress.done.push(pdf.path);
    doneSet.add(pdf.path);
    alreadyUploaded.add(destName);
    totalUploaded++;
    batchCount++;

    const pct = ((i + 1) / toUpload.length * 100).toFixed(1);
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`📤 [${i+1}/${toUpload.length}] (${pct}%) ${pdf.mb}MB → ${destName}`);
    }

    // نشر كل DEPLOY_AFTER ملف
    if (batchCount >= DEPLOY_AFTER) {
      saveProgress();
      deployBatch();
      batchCount = 0;
    }
  } catch (err) {
    console.error(`❌ فشل نسخ: ${pdf.name} — ${err.message}`);
    progress.failed.push({ path: pdf.path, error: err.message });
  }
}

// نشر الدفعة الأخيرة
if (batchCount > 0) {
  saveProgress();
  deployBatch();
}

console.log(`\n🎉 اكتمل الرفع الكامل!`);
console.log(`   ✅ رُفع: ${totalUploaded} ملف`);
console.log(`   ❌ فشل: ${progress.failed.length} ملف`);
console.log(`   🚀 عمليات deploy: ${progress.deploys}`);
saveProgress();
