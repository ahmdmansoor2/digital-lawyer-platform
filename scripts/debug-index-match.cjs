// debug-index-match.cjs
const fs = require('fs');
const cat = JSON.parse(fs.readFileSync('D:\\قانوني 7\\public\\data\\legal-catalog-summary.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('D:\\قانوني 7\\public\\data\\doc-index-map.json', 'utf8'));

// Count by branch
const byBranch = {};
cat.items.forEach(it => {
  if (!it.u || it.u === '') {
    byBranch[it.b] = (byBranch[it.b] || 0) + 1;
  }
});
console.log('=== Items with null URL by branch ===');
Object.entries(byBranch).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
console.log('');

// Pick 5 forms items
const forms = cat.items.filter(it => it.b === 'forms' && (!it.u || it.u === '')).slice(0, 10);
console.log('=== Sample forms items ===');
forms.forEach(f => {
  const inIndex = idx[f.t] ? 'YES' : 'NO';
  console.log('  [' + inIndex + '] ' + f.t);
});
console.log('');

// Try with normalization
function normalize(s) {
  return (s || '')
    .trim()
    .replace(/^[\d\s\-_.,#()\[\]$@~+*]+/g, '')
    .replace(/[\$~\-_–—@#^*|\\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}
console.log('=== After normalize ===');
forms.forEach(f => {
  const n = normalize(f.t);
  const inIndex = idx[n] ? 'YES' : 'NO';
  console.log('  [' + inIndex + '] ' + f.t + ' -> norm: ' + n);
});
console.log('');

// Index titles vs forms titles
console.log('=== Index sample (first 20 non-form titles) ===');
const titleKeys = Object.keys(idx).filter(k => !k.startsWith('_') && !k.match(/^form-\d+$/)).slice(0, 20);
titleKeys.forEach(k => console.log('  ' + k));
