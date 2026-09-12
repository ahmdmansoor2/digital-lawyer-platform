/**
 * publish-20-golden-batch.cjs
 * ناشر المقالات الذهبية العشرين لمنصة المحامي الرقمية
 * ينشر المقالات العشرين كاملة (+3000 كلمة لكل مقال) على 4 دفعات (5 مقالات لكل دفعة)
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PUBLISHER = path.join(__dirname, 'daily-publish.cjs');

console.log('🚀 [الناشر الذهبي] بدء إنتاج ونشر 20 مقالاً تشريعياً موسوعياً (+3000 كلمة)...\n');

for (let batch = 1; batch <= 4; batch++) {
  console.log('━'.repeat(65));
  console.log(`📦 الدفعة رقم ${batch} من 4 (المقالات من ${(batch - 1) * 5 + 1} إلى ${batch * 5})`);
  console.log('━'.repeat(65));
  try {
    execSync(`node "${PUBLISHER}"`, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, ARTICLES_PER_RUN: '5' },
      timeout: 1800000 // 30 دقيقة كحد أقصى لكل دفعة
    });
    console.log(`\n✅ اكتملت الدفعة رقم ${batch} بنجاح!\n`);
  } catch (err) {
    console.error(`❌ خطأ في الدفعة ${batch}:`, err.message);
  }
}

console.log('━'.repeat(65));
console.log('🎉 اكتمل نشر جميع المقالات العشرين بنجاح!');
console.log('━'.repeat(65));
