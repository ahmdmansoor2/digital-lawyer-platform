// analyze-catalog.cjs — يحلل الكتالوج بشكل أعمق
const fs = require('fs');

const CATALOG = 'D:\\قانوني 7\\public\\data\\legal-catalog-summary.json';
const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const items = cat.items;

console.log('Total items:', items.length);
console.log('');

let withUrl = 0;
let withNullUrl = 0;
let withEmptyStringUrl = 0;
let withUrl200 = 0;
let urlSamples = [];

items.forEach((it, i) => {
  if (it.u === null || it.u === undefined) withNullUrl++;
  else if (it.u === '') withEmptyStringUrl++;
  else {
    withUrl++;
    if (urlSamples.length < 3) urlSamples.push({ idx: i, u: it.u, t: it.t });
  }
});

console.log('=== URL field distribution ===');
console.log('  With URL:        ', withUrl);
console.log('  With null:       ', withNullUrl);
console.log('  With empty str:  ', withEmptyStringUrl);
console.log('');

console.log('=== Sample URLs ===');
urlSamples.forEach(s => console.log(`  [${s.idx}] ${s.t.substring(0, 50)}`));
console.log('  ->', urlSamples[0]?.u.substring(0, 120));
console.log('');

// h field
let withH1 = 0, withM1 = 0, withH0M0 = 0;
items.forEach(it => {
  if (it.h === 1) withH1++;
  if (it.m === 1) withM1++;
  if (it.h !== 1 && it.m !== 1) withH0M0++;
});
console.log('=== h (has PDF) / m (missing) distribution ===');
console.log('  h=1:           ', withH1);
console.log('  m=1:           ', withM1);
console.log('  neither h nor m:', withH0M0);
console.log('');

// Cross analysis: of items with URL, what are h/m?
let urlAndH1 = 0, urlAndM1 = 0, urlAndNeither = 0;
items.forEach(it => {
  if (it.u && it.u !== '') {
    if (it.h === 1) urlAndH1++;
    else if (it.m === 1) urlAndM1++;
    else urlAndNeither++;
  }
});
console.log('=== Of items WITH URL ===');
console.log('  +h=1 (has PDF):   ', urlAndH1);
console.log('  +m=1 (missing):   ', urlAndM1);
console.log('  +neither:         ', urlAndNeither);
console.log('');

// branch distribution
const branchCounts = {};
items.forEach(it => {
  branchCounts[it.b] = (branchCounts[it.b] || 0) + 1;
});
console.log('=== By branch (b) ===');
Object.entries(branchCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`  ${k}: ${v}`);
});
console.log('');

// extension distribution
const extCounts = {};
items.forEach(it => {
  extCounts[it.e] = (extCounts[it.e] || 0) + 1;
});
console.log('=== By extension (e) ===');
Object.entries(extCounts).forEach(([k, v]) => {
  console.log(`  ${k}: ${v}`);
});
