const fs = require('fs');
const path = require('path');
const cp1256_patterns = [
  // cp1256 Arabic characters incorrectly encoded as Latin-1 byte sequences
  // These appear in source as the cp1256-byte-sequence mapped to Unicode escapes
  '\\u0638\\u0645\\u062a\\u062f\\u0627\\u0648\\u0644\\u0629',     // متداولة (cp1256)
  '\\u0637\\u0623\\u062a\\u0639\\u0627\\u0628',                  // أتعاب (cp1256)
  '\\u0638\\u0642\\u0627\\u062f\\u0645\\u0629',                  // قادمة (cp1256)
  '\\u0638\\u0645\\u0646\\u062a\\u0647\\u064a\\u0629',           // منتهية (cp1256)
  '\\u0638\\u0645\\u062d\\u062c\\u0648\\u0632\\u0629',           // محجوزة (cp1256)
  '\\u0638\\u0648\\u0627\\u0631\\u062f',                         // وارد (cp1256)
  '\\u0637\\u0635\\u0627\\u062f\\u0631',                         // صادر (cp1256)
  '\\u0638\\u0645\\u0635\\u0631\\u0648\\u0641\\u0627\\u062a',     // مصروفات (cp1256)
];

function* walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(it.name)) yield p;
  }
}

let totalBad = 0;
const badFiles = [];
for (const file of walk('src')) {
  let c = fs.readFileSync(file, 'utf8');
  let fileBad = 0;
  for (const p of cp1256_patterns) {
    const re = new RegExp(p, 'g');
    const m = c.match(re);
    if (m) fileBad += m.length;
  }
  if (fileBad > 0) {
    badFiles.push({file, count: fileBad});
    totalBad += fileBad;
  }
}

console.log('Total cp1256 patterns found in source:', totalBad);
if (badFiles.length > 0) {
  console.log('Files with bad patterns:');
  for (const {file, count} of badFiles) console.log(`  ${file}: ${count}`);
}
