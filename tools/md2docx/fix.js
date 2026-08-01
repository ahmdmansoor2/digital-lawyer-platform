const fs = require('fs');
const path = 'D:\\المكتبة القانونية\\مذكرات\\إجازة رعاية الطفل\\مذكرة استصدار فتوي بشأن قيد 3 مرات في إجازة رعاية الطفل.md';
let text = fs.readFileSync(path, 'utf8');

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
];

for (const p of patterns) {
  const count = (text.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`Pattern "${p}": ${count}`);
}

function showContext(p, len = 40) {
  const idx = text.indexOf(p);
  if (idx >= 0) {
    console.log(`\nContext around "${p}": ${text.substring(Math.max(0, idx - 5), idx + len)}`);
  }
}

showContext('8 قرارات');
showContext('3 سنوات');
showContext('للمشاركة');
showContext('استنفاد');
showContext('الثامنة', 50);
showContext('في 15/12/1982', 30);
