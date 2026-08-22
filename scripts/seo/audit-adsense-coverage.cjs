'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = 'd:\\قانوني 7';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'dist-desktop') {
        results = results.concat(walk(full));
      }
    } else if (file.endsWith('.html')) {
      results.push(full);
    }
  });
  return results;
}

const htmlFiles = walk(path.join(ROOT, 'public')).concat([path.join(ROOT, 'index.html')]);
console.log('Total HTML pages found:', htmlFiles.length);

let withAdSenseHead = 0;
let withoutAdSenseHead = [];
let withAdUnits = 0;
let withoutAdUnits = [];

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasScript = content.includes('ca-pub-7725405859334364') || content.includes('pagead2.googlesyndication.com');
  const hasUnits = content.includes('adsbygoogle');

  if (hasScript) withAdSenseHead++;
  else withoutAdSenseHead.push(path.relative(ROOT, file));

  if (hasUnits) withAdUnits++;
  else withoutAdUnits.push(path.relative(ROOT, file));
});

console.log(`\n📊 إحصائية إعدادات Google AdSense:`);
console.log(`✅ صفحات تحتوي كود التفعيل في الهيدر: ${withAdSenseHead} / ${htmlFiles.length}`);
console.log(`❌ صفحات تفتقر لكود الهيدر: ${withoutAdSenseHead.length}`);
if (withoutAdSenseHead.length > 0) {
  console.log('عينة من الصفحات بدون كود الهيدر:', withoutAdSenseHead.slice(0, 10));
}

console.log(`\n✅ صفحات تحتوي وحدات إعلانية (Ad Units): ${withAdUnits} / ${htmlFiles.length}`);
console.log(`❌ صفحات بدون وحدات إعلانية: ${withoutAdUnits.length}`);
if (withoutAdUnits.length > 0) {
  console.log('عينة من الصفحات بدون وحدات إعلانية:', withoutAdUnits.slice(0, 10));
}

// فحص ملف ads.txt
const adsTxtPath = path.join(ROOT, 'public', 'ads.txt');
if (fs.existsSync(adsTxtPath)) {
  const adsTxt = fs.readFileSync(adsTxtPath, 'utf8').trim();
  console.log('\n📄 محتوى public/ads.txt الحالي:\n' + adsTxt);
} else {
  console.log('\n❌ ملف public/ads.txt غير موجود!');
}
