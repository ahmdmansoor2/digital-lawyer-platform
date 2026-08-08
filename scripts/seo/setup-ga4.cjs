#!/usr/bin/env node
/**
 * setup-ga4.cjs — إضافة Google Analytics 4 للصفحات الثابتة
 *
 * الاستخدام:
 *   1) روح https://analytics.google.com/
 *   2) أنشئ property لموقعك (URL: https://mohamidigital.online/)
 *   3) اختار "Web" stream
 *   4) انسخ الـ Measurement ID (مثل: G-XXXXXXXXXX)
 *   5) شغّل: node scripts/seo/setup-ga4.cjs G-XXXXXXXXXX
 *
 * السكريبت بيضيف:
 *   - GA4 tracking code في كل صفحات public/*.html
 *   - تحديث index.html للـ React app
 *   - بنية analytics events (مستقبلي)
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const PUBLIC_DIR = path.join(ROOT, 'public');
const measurementId = process.argv[2] || process.env.GA4_MEASUREMENT_ID;

if (!measurementId) {
  console.log('استخدام: node scripts/seo/setup-ga4.cjs <G-XXXXXXXXXX>');
  console.log('');
  console.log('الخطوات:');
  console.log('1) روح https://analytics.google.com/');
  console.log('2) أنشئ property لموقعك');
  console.log('3) انسخ الـ Measurement ID');
  console.log('4) شغّل السكريبت ده بالـ ID');
  process.exit(1);
}

if (!/^G-[A-Z0-9]{8,12}$/i.test(measurementId)) {
  console.error(`❌ الـ ID مش صالح: ${measurementId}`);
  console.error('   لازم يكون شكله: G-XXXXXXXXXX (10-12 حرف)');
  process.exit(1);
}

const GA4_SNIPPET = `    <!-- Google Analytics 4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    </script>`;

const files = fs.readdirSync(PUBLIC_DIR)
  .filter(f => f.endsWith('.html') && f !== 'index.html')
  .map(f => path.join(PUBLIC_DIR, f));

let updated = 0;
let skipped = 0;

for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  if (html.includes('googletagmanager.com/gtag')) {
    console.log(`⊘ ${path.basename(f)}: GA4 موجود بالفعل`);
    skipped++;
    continue;
  }
  if (!html.includes('<head>')) continue;
  // أضف الـ snippet بعد آخر meta tag في الـ head
  const gaSnippet = GA4_SNIPPET.replace(/^    /, '  '); // نضبط الـ indentation
  // Try to insert before </head>
  html = html.replace('</head>', `  ${gaSnippet}\n  </head>`);
  fs.writeFileSync(f, html, 'utf8');
  updated++;
  console.log(`✓ ${path.basename(f)}`);
}

// أضف للـ main index.html (React)
const mainIndex = path.join(ROOT, 'index.html');
if (fs.existsSync(mainIndex)) {
  let html = fs.readFileSync(mainIndex, 'utf8');
  if (html.includes('googletagmanager.com/gtag')) {
    console.log(`⊘ index.html: GA4 موجود بالفعل`);
  } else {
    html = html.replace('</head>', `${GA4_SNIPPET}\n  </head>`);
    fs.writeFileSync(mainIndex, html, 'utf8');
    updated++;
    console.log(`✓ index.html (React app)`);
  }
}

// حفظ الـ ID في .env لو مش موجود
const envFile = path.join(ROOT, '.env');
let envContent = fs.readFileSync(envFile, 'utf8');
if (!envContent.includes('GA4_MEASUREMENT_ID=')) {
  envContent += `\n# Google Analytics 4 Measurement ID\nGA4_MEASUREMENT_ID=${measurementId}\n`;
  fs.writeFileSync(envFile, envContent, 'utf8');
  console.log(`\n✓ تم حفظ ID في .env`);
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`✓ تم التحديث: ${updated} ملف`);
console.log(`⊘ تم التخطي: ${skipped} ملف (موجود بالفعل)`);
console.log(`\n⏭️  الخطوة الجاية:`);
console.log(`1) npm run build`);
console.log(`2) npx firebase deploy --only hosting`);
console.log(`3) افتح analytics.google.com → شوف Real-time traffic`);
