/**
 * scripts/google-flow/session-manager.cjs
 * مدير جلسة متصفح Google Flow للتحكم الآلي والتوليد
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROFILE_DIR = 'C:\\google-flow-profile';
if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

async function startSession() {
  console.log('🚀 جارٍ إطلاق متصفح Chrome لجلسة Google Flow...');
  
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null, // استخدام الحجم الكامل للشاشة
    args: [
      '--remote-debugging-port=9222',
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
  
  console.log('🌐 جارٍ فتح منصة Google Flow...');
  try {
    await page.goto('https://flow.google', { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('⚠️ جارٍ التحويل إلى labs.google/flow...');
    await page.goto('https://labs.google/flow', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  console.log('✅ تم فتح المتصفح بنجاح!');
  console.log('📌 يمكنك الآن تسجيل الدخول بحساب Google.');
  console.log('🔒 الجلسة محفوظة ومحمية، ونافذة المتصفح ستبقى نشطة للتحكم.');

  // الاستمرار في العمل لإبقاء المتصفح مفتوحاً
  await new Promise(() => {});
}

startSession().catch(err => {
  console.error('❌ خطأ في تشغيل المتصفح:', err);
});
