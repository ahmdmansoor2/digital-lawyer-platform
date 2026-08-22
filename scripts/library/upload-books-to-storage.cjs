#!/usr/bin/env node
/**
 * upload-books-to-storage.cjs
 * رفع ملفات PDF المكتبة إلى Firebase Cloud Storage
 * وإتاحتها للعموم بروابط مباشرة دائمة
 *
 * يعمل بدون gsutil — يستخدم firebase-admin SDK مباشرة
 */
'use strict';

const fs   = require('fs');
const path = require('path');

// ─── الإعدادات ────────────────────────────────────────────────────────────────
const BOOKS_DIR      = path.join(__dirname, '..', '..', 'public', 'books');
const PROGRESS_LOG   = path.join(__dirname, 'storage-progress.json');
const SERVICE_ACCOUNT = path.join(__dirname, '..', '..', 'service-account.json');
const PROJECT_ID     = 'justice-91571';
const BUCKET_NAME    = `${PROJECT_ID}.appspot.com`;
const BUCKET_PREFIX  = 'books';
const CONCURRENCY    = 5; // رفع 5 ملفات متزامنة

async function main() {
  // تحقق من وجود service account
  if (!fs.existsSync(SERVICE_ACCOUNT)) {
    console.error('❌ ملف service-account.json غير موجود في مجلد المشروع!');
    console.error('');
    console.error('📋 للحصول عليه:');
    console.error('   1. افتح https://console.firebase.google.com/project/justice-91571/settings/serviceaccounts/adminsdk');
    console.error('   2. اضغط "Generate new private key"');
    console.error('   3. احفظ الملف باسم: d:\\قانوني 7\\service-account.json');
    process.exit(1);
  }

  const admin = require('firebase-admin');
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: BUCKET_NAME
    });
  }

  const bucket = admin.storage().bucket();

  // تحميل سجل التقدم
  let progress = { done: [], failed: [], urls: {} };
  if (fs.existsSync(PROGRESS_LOG)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_LOG, 'utf8')); } catch {}
  }
  const doneSet = new Set(progress.done);

  // قائمة الكتب
  const allBooks = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.pdf'));
  const toUpload = allBooks.filter(f => !doneSet.has(f));

  console.log(`\n📚 إجمالي الكتب: ${allBooks.length}`);
  console.log(`✅ مرفوع مسبقاً: ${doneSet.size}`);
  console.log(`🚀 يُرفع الآن:   ${toUpload.length}\n`);

  let uploaded = 0;
  let failed   = 0;

  // رفع بتزامن CONCURRENCY
  async function uploadFile(filename) {
    const localPath  = path.join(BOOKS_DIR, filename);
    const remotePath = `${BUCKET_PREFIX}/${filename}`;

    try {
      await bucket.upload(localPath, {
        destination: remotePath,
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=31536000',
        },
        public: true, // جعله عاماً مباشرة
      });

      // الرابط العام الثابت
      const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${BUCKET_PREFIX}/${encodeURIComponent(filename)}`;
      progress.done.push(filename);
      progress.urls[filename] = publicUrl;
      doneSet.add(filename);
      uploaded++;
      return { ok: true, filename, url: publicUrl };
    } catch (err) {
      progress.failed.push({ file: filename, error: err.message?.slice(0, 200) });
      failed++;
      return { ok: false, filename, error: err.message };
    }
  }

  // معالجة دفعات متزامنة
  for (let i = 0; i < toUpload.length; i += CONCURRENCY) {
    const batch = toUpload.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(uploadFile));

    results.forEach(r => {
      if (!r.ok) {
        console.error(`❌ فشل: ${r.filename} — ${r.error?.slice(0,80)}`);
      }
    });

    const pct = Math.min(((i + CONCURRENCY) / toUpload.length * 100), 100).toFixed(1);
    if ((i + CONCURRENCY) % 50 < CONCURRENCY || i === 0) {
      console.log(`📤 [${Math.min(i+CONCURRENCY, toUpload.length)}/${toUpload.length}] (${pct}%) — ✅ ${uploaded} ❌ ${failed}`);
    }

    // حفظ كل 50 ملف
    if (uploaded % 50 < CONCURRENCY) {
      fs.writeFileSync(PROGRESS_LOG, JSON.stringify(progress, null, 2), 'utf8');
    }
  }

  // حفظ نهائي
  fs.writeFileSync(PROGRESS_LOG, JSON.stringify(progress, null, 2), 'utf8');

  console.log(`\n🎉 اكتمل الرفع على Firebase Storage!`);
  console.log(`   ✅ رُفع: ${uploaded}`);
  console.log(`   ❌ فشل: ${failed}`);
  console.log(`\n📂 الروابط محفوظة في: ${PROGRESS_LOG}`);
  console.log(`🔗 نموذج رابط: https://storage.googleapis.com/${BUCKET_NAME}/books/<filename.pdf>`);
}

main().catch(console.error);
