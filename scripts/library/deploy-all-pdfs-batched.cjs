const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.resolve('public/books');
const distDir = path.resolve('dist/books');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const allPdfs = fs.readdirSync(srcDir).filter(f => f.endsWith('.pdf'));
console.log(`🚀 بدء الرفع التراكمي لـ ${allPdfs.length} ملف PDF عبر دفعات...`);

const BATCH_SIZE = 100;
let currentDistFiles = new Set(fs.readdirSync(distDir));

for (let i = 0; i < allPdfs.length; i += BATCH_SIZE) {
  const batch = allPdfs.slice(i, i + BATCH_SIZE);
  console.log(`\n📦 معالجة الدفعة [${i + 1} إلى ${Math.min(i + BATCH_SIZE, allPdfs.length)}] من ${allPdfs.length}...`);

  let added = 0;
  batch.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const dstFile = path.join(distDir, file);
    if (!fs.existsSync(dstFile)) {
      fs.copyFileSync(srcFile, dstFile);
      added++;
    }
  });

  console.log(`  -> تم إلحاق ${added} ملفات جديدة إلى dist/books.`);
  console.log(`  -> إجمالي الكتب في dist/books الآن: ${fs.readdirSync(distDir).filter(f => f.endsWith('.pdf')).length}`);

  console.log(`  -> جاري النشر إلى Firebase Hosting...`);
  try {
    // Clear cache to prevent undefined path error
    try {
      const cacheDir = path.resolve('.firebase');
      if (fs.existsSync(cacheDir)) {
        fs.readdirSync(cacheDir).forEach(f => {
          if (f.startsWith('hosting.')) {
            fs.unlinkSync(path.join(cacheDir, f));
          }
        });
      }
    } catch (_) {}

    execSync('npx firebase deploy --only hosting:app --project justice-91571', {
      stdio: 'inherit',
      cwd: path.resolve('.')
    });
    console.log(`  ✅ نجاح نشر الدفعة.`);
  } catch (err) {
    console.error(`  ⚠️ فشل في الدفعة، جاري إعادة المحاولة بعد 5 ثوانٍ...`);
    execSync('powershell -Command "Start-Sleep -Seconds 5"');
    execSync('npx firebase deploy --only hosting:app --project justice-91571', {
      stdio: 'inherit',
      cwd: path.resolve('.')
    });
  }
}

console.log('\n🎉 تم رفع ونشر كافة ملفات الـ PDF بنجاح بنسبة 100%!');
