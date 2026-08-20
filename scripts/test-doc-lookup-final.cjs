// test-doc-lookup-final.cjs
// يختبر منطق legal-library.html بدقة - forms items بس
const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = 'D:\\قانوني 7\\public\\data\\forms-chunks';
const INDEX_FILE = 'D:\\قانوني 7\\public\\data\\doc-index-map.json';
const CATALOG = 'D:\\قانوني 7\\public\\data\\legal-catalog-summary.json';

const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));

function normalizeSearchKey(str) {
  return (str || '')
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

function loadChunk(chunkId) {
  const p = path.join(CHUNKS_DIR, chunkId + '.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function extractFromChunk(chunkData, titleKey) {
  if (!chunkData) return null;
  let item = chunkData[titleKey];
  if (item) return item;
  item = chunkData['form-' + titleKey];
  if (item) return item;
  const nKey = normalizeSearchKey(titleKey);
  for (const ck of Object.keys(chunkData)) {
    const entry = chunkData[ck];
    if (normalizeSearchKey(ck) === nKey ||
        (entry && normalizeSearchKey(entry.title || '') === nKey) ||
        (entry && normalizeSearchKey(entry.name || '') === nKey)) {
      return entry;
    }
  }
  return null;
}

// Forms items only - test 500 random for speed
const allForms = cat.items.filter(it => it.b === 'forms' && (!it.u || it.u === ''));
const forms = allForms.sort(() => Math.random() - 0.5).slice(0, 500);
console.log('Total forms items in catalog: ' + allForms.length + ' (testing 500 random)');
console.log('');

let ok = 0, fail = 0;
const failReasons = {};
const samples = [];

forms.forEach((item, idx) => {
  const title = item.t || '';
  let chunkId = index[title];
  if (!chunkId) {
    const n = normalizeSearchKey(title);
    chunkId = index[n];
  }
  if (!chunkId) {
    fail++;
    failReasons['no-chunk-id'] = (failReasons['no-chunk-id'] || 0) + 1;
    if (samples.length < 5) samples.push({ stage: 'no-chunk-id', title });
    return;
  }
  const chunk = loadChunk(chunkId);
  if (!chunk) {
    fail++;
    failReasons['chunk-not-found'] = (failReasons['chunk-not-found'] || 0) + 1;
    if (samples.length < 5) samples.push({ stage: 'chunk-not-found', title, chunkId });
    return;
  }
  const entry = extractFromChunk(chunk, title);
  if (!entry) {
    fail++;
    failReasons['extract-fail'] = (failReasons['extract-fail'] || 0) + 1;
    if (samples.length < 5) samples.push({ stage: 'extract-fail', title, chunkId });
    return;
  }
  ok++;
});

console.log('=== Result for all ' + forms.length + ' forms items ===');
console.log('  ✓ OK: ' + ok + ' (' + (ok / forms.length * 100).toFixed(1) + '%)');
console.log('  ✗ Failed: ' + fail);
console.log('');
Object.entries(failReasons).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
if (samples.length > 0) {
  console.log('');
  console.log('=== Sample failures ===');
  samples.forEach(s => {
    console.log('  [' + s.stage + '] ' + s.title.substring(0, 60));
  });
}
