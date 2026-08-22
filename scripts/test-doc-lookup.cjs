// test-doc-lookup.cjs
// يحاكي منطق legal-library.html end-to-end
const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = 'D:\\قانوني 7\\public\\data\\forms-chunks';
const INDEX_FILE = 'D:\\قانوني 7\\public\\data\\doc-index-map.json';
const CATALOG = 'D:\\قانوني 7\\public\\data\\legal-catalog-summary.json';

const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));

// Normalize function from legal-library.html
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
  const path_ = path.join(CHUNKS_DIR, chunkId + '.json');
  if (!fs.existsSync(path_)) return null;
  return JSON.parse(fs.readFileSync(path_, 'utf8'));
}

function extractFromChunk(chunkData, titleKey) {
  if (!chunkData) return null;
  // 1) direct title match
  let item = chunkData[titleKey];
  if (item) return item;
  // 2) form-N match (in case title is "form-123")
  item = chunkData['form-' + titleKey];
  if (item) return item;
  // 3) normalized title
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

// Pick 30 random DOC items from catalog
const docItems = cat.items.filter(it => !it.u || it.u === '').slice(0, 30);
console.log('=== Testing 30 DOC items end-to-end ===\n');

let ok = 0, fail = 0, noChunkId = 0, chunkNotFound = 0, extractFail = 0;
const failures = [];

docItems.forEach((item, idx) => {
  const title = item.t || '';
  // 1) lookup chunkId from index
  let chunkId = index[title];
  if (!chunkId) {
    const n = normalizeSearchKey(title);
    chunkId = index[n];
  }
  if (!chunkId) {
    noChunkId++;
    failures.push({ idx, title, stage: 'no-chunk-id' });
    return;
  }
  // 2) load chunk
  const chunk = loadChunk(chunkId);
  if (!chunk) {
    chunkNotFound++;
    failures.push({ idx, title, stage: 'chunk-not-found', chunkId });
    return;
  }
  // 3) extract entry
  const entry = extractFromChunk(chunk, title);
  if (!entry) {
    extractFail++;
    failures.push({ idx, title, stage: 'extract-fail', chunkId });
    return;
  }
  ok++;
  if (idx < 5) {
    console.log(`[${idx + 1}] ✓ "${title.substring(0, 40)}..." -> ${chunkId} -> "${(entry.title || '').substring(0, 40)}..." (${entry.wordCount || '?'} words)`);
  }
});

console.log(`\n=== Result ===`);
console.log(`  Tested: 30`);
console.log(`  ✓ OK: ${ok} (${(ok / 30 * 100).toFixed(0)}%)`);
console.log(`  ✗ No chunkId in index: ${noChunkId}`);
console.log(`  ✗ Chunk file not found: ${chunkNotFound}`);
console.log(`  ✗ Entry extraction failed: ${extractFail}`);
console.log('');
if (failures.length > 0 && failures.length <= 10) {
  console.log('=== Sample failures ===');
  failures.forEach(f => {
    console.log(`  [${f.stage}] "${f.title.substring(0, 50)}..."`);
  });
}
