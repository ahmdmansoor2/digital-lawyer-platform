#!/usr/bin/env node
/**
 * gsc-verify.cjs — إضافة ملف تحقق Google Search Console
 *
 * الاستخدام:
 *   1) روح Google Search Console → اختار طريقة "ملف HTML"
 *   2) Google هينزّل ملف اسمه googleXXXX.html — احفظ اسمه
 *   3) شغّل: node scripts/seo/gsc-verify.cjs google1234abcd.html
 *   4) السكريبت بينسخ المحتوى (لو عندك) أو بينشئ ملف placeholder
 *   5) اعمل build + deploy
 *   6) ارجع لـ GSC واضغط "تحقق"
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const arg = process.argv[2];

if (!arg) {
  console.log('استخدام: node scripts/seo/gsc-verify.cjs <verification-filename>');
  console.log('مثال:   node scripts/seo/gsc-verify.cjs google1234abcd.html');
  console.log('');
  console.log('الخطوات:');
  console.log('1) Google Search Console → اختار طريقة HTML file');
  console.log('2) Google هينزّل ملف — احفظ اسمه');
  console.log('3) شغّل السكريبت ده بالاسم');
  console.log('4) npm run build && npx firebase deploy --only hosting');
  console.log('5) ارجع لـ GSC → اضغط "تحقق"');
  process.exit(1);
}

const filename = arg.endsWith('.html') ? arg : `${arg}.html`;
const dest = path.join(PUBLIC_DIR, filename);

if (fs.existsSync(dest)) {
  console.log(`✓ الملف موجود بالفعل: ${dest}`);
  console.log(`  محتواه: ${fs.readFileSync(dest, 'utf8').substring(0, 100)}...`);
  console.log('\nاعمل deploy كده:');
  console.log('  npm run build && npx firebase deploy --only hosting');
  process.exit(0);
}

// بنحاول ننزّل الملف من Google (لو المستخدم عنده download link)
const downloadUrl = process.argv[3];
if (downloadUrl && downloadUrl.startsWith('http')) {
  console.log(`📥 جاري تنزيل ${filename} من ${downloadUrl}...`);
  https.get(downloadUrl, (res) => {
    if (res.statusCode !== 200) {
      console.error(`❌ فشل: ${res.statusCode}`);
      process.exit(1);
    }
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      const content = Buffer.concat(chunks).toString('utf8');
      fs.writeFileSync(dest, content, 'utf8');
      console.log(`✓ تم حفظ: ${dest}`);
      console.log('اعمل deploy:');
      console.log('  npm run build && npx firebase deploy --only hosting');
    });
  });
} else {
  // بننشئ placeholder
  console.log(`ℹ️  بينشئ placeholder. للحصول على المحتوى الصح:`);
  console.log('1) روح GSC → اضغط "تحقق" → "تحقق بملف HTML"');
  console.log('2) اضغط "تنزيل ملف التحقق"');
  console.log(`3) شغّل: node scripts/seo/gsc-verify.cjs ${filename} <download-url>`);
  console.log('أو انسخ محتوى الملف يدوياً وحطه في:');
  console.log(`  ${dest}`);
  console.log('');
  fs.writeFileSync(dest, `google-site-verification-placeholder\n`, 'utf8');
  console.log(`⚠️  أُنشئ placeholder. لازم تستبدله بمحتوى الملف الحقيقي من Google.`);
}
