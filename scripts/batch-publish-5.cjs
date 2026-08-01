// batch-publish-5.cjs — ينشر 5 مقالات جديدة دفعة واحدة
const { execSync } = require('child_process');

const BASE = 'd:\\قانوني 7';
const SCRIPT = `${BASE}\\scripts\\auto-publisher.cjs`;

console.log('🚀 بدء النشر الدفعي لـ 5 مقالات جديدة...\n');

for (let i = 1; i <= 5; i++) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`📰 المقال رقم ${i} من 5`);
  console.log(`${'━'.repeat(60)}`);
  try {
    // تشغيل الناشر — يختار تلقائياً الموضوع غير المنشور التالي
    execSync(`node "${SCRIPT}"`, {
      stdio: 'inherit',
      cwd: BASE,
      env: { ...process.env },
      timeout: 300000 // 5 دقائق لكل مقال
    });
    console.log(`✅ تم نشر المقال ${i} بنجاح\n`);
  } catch (err) {
    console.error(`❌ فشل المقال ${i}:`, err.message);
    // استمر في المقال التالي حتى لو فشل هذا
  }
}

console.log('\n🎉 اكتمل النشر الدفعي!');
