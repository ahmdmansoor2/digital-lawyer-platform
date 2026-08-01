const fs = require('fs');
const path = 'D:\\قانوني 7\\tools\\md2docx\\memara.md';
let text = fs.readFileSync(path, 'utf8');

console.log('=== DIAGNOSE ===');
const patterns = [
  '8 قرارات',
  '5 سنوات و8 أشهر',
  '5 سنوات و 8 أشهر',
  '3 سنوات',
  '3 سنة',
  'للمشاركة',
  'يشارك القطاع',
  '8 قرارات إجازة',
  '7 قرارات إجازة',
  'حوالي 5 سنوات',
  'حوالي 3 سنوات',
  'يقارب 5',
  'يقارب 3',
  'استنفاد',
  'استنفاذ',
  'استنفد',
  'الثامنة',
  'السادسة',
  '16/12/1982',
  'في 15/12/1982',
  '5/12/1982',
  'بـ"ثلاث مرات"',
  'بـ"3 مرات"',
  '5 سنوات و8',
  '3 سنوات فأكثر',
];

for (const p of patterns) {
  const count = (text.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`Pattern "${p}": ${count}`);
}

function showContext(p, len = 60) {
  const idx = text.indexOf(p);
  if (idx >= 0) {
    console.log(`\nContext around "${p}": ${JSON.stringify(text.substring(Math.max(0, idx - 5), idx + len))}`);
  }
}

showContext('8 قرارات');
showContext('3 سنوات');
showContext('للمشاركة');
showContext('استنفاد');
showContext('الثامنة', 80);
showContext('5 سنوات و8', 60);
showContext('في 15/12/1982', 30);
