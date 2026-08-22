#!/usr/bin/env node
/**
 * upload-to-storage.cjs
 * رفع ملفات PDF الكبيرة (>10 MB) على Firebase Storage
 * وتوليد روابط تحميل مباشرة (signed URLs أو public URLs)
 *
 * Firebase Storage مصمّم لهذا الغرض — بلا حد للحجم الإجمالي
 * الملفات تُخدَّم من storage.googleapis.com مباشرة
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BOOKS_DIR    = path.join(__dirname, '..', '..', 'public', 'books');
const PROGRESS_LOG = path.join(__dirname, 'storage-upload-progress.json');
const BUCKET       = 'gs://justice-91571.appspot.com/books';
const PUBLIC_URL   = 'https://storage.googleapis.com/justice-91571.appspot.com/books';

// تحميل سجل التقدم
let progress = { done: [], failed: [] };
if (fs.existsSync(PROGRESS_LOG)) {
  try { progress = JSON.parse(fs.readFileSync(PROGRESS_LOG, 'utf8')); } catch {}
}
const doneSet = new Set(progress.done);

// الحصول على قائمة الملفات
const allBooks = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.pdf'));
const toUpload = allBooks.filter(f => !doneSet.has(f));

console.log(`\n📚 إجمالي الكتب: ${allBooks.length}`);
console.log(`✅ مرفوع مسبقاً: ${doneSet.size}`);
console.log(`🚀 يُرفع الآن:   ${toUpload.length}\n`);

// رفع كل ملف باستخدام gsutil
let uploaded = 0;
for (let i = 0; i < toUpload.length; i++) {
  const filename = toUpload[i];
  const localPath = path.join(BOOKS_DIR, filename);
  const gcsPath = `${BUCKET}/${filename}`;
  const publicUrl = `${PUBLIC_URL}/${encodeURIComponent(filename)}`;

  try {
    // رفع مع تعيين Content-Type وجعله عاماً
    execSync(
      `gsutil -h "Content-Type:application/pdf" -h "Cache-Control:public,max-age=31536000" cp "${localPath}" "${gcsPath}"`,
      { stdio: 'pipe', encoding: 'buffer', timeout: 120000 }
    );

    // جعل الملف عاماً للقراءة
    execSync(`gsutil acl ch -u AllUsers:R "${gcsPath}"`, {
      stdio: 'pipe', encoding: 'buffer', timeout: 30000
    });

    progress.done.push(filename);
    doneSet.add(filename);
    uploaded++;
    const pct = ((i + 1) / toUpload.length * 100).toFixed(1);
    if ((i + 1) % 20 === 0 || i === 0) {
      console.log(`✅ [${i+1}/${toUpload.length}] (${pct}%) ${filename}`);
      console.log(`   🔗 ${publicUrl}`);
    }
    // حفظ كل 50 ملف
    if (uploaded % 50 === 0) {
      fs.writeFileSync(PROGRESS_LOG, JSON.stringify(progress, null, 2), 'utf8');
    }
  } catch(err) {
    console.error(`❌ فشل: ${filename} — ${err.message?.slice(0,100)}`);
    progress.failed.push({ file: filename, error: err.message?.slice(0,200) });
  }
}

fs.writeFileSync(PROGRESS_LOG, JSON.stringify(progress, null, 2), 'utf8');
console.log(`\n🎉 اكتمل الرفع على Firebase Storage!`);
console.log(`   ✅ رُفع: ${uploaded}`);
console.log(`   ❌ فشل: ${progress.failed.length}`);
console.log(`\n📂 الملفات متاحة على:`);
console.log(`   ${PUBLIC_URL}/`);
