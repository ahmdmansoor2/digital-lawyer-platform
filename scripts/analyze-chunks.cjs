// analyze-chunks.cjs
const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = 'D:\\قانوني 7\\public\\data\\forms-chunks';
const CATALOG = 'D:\\قانوني 7\\public\\data\\legal-catalog-summary.json';

console.log('=== CHUNKS ===');
const files = fs.readdirSync(CHUNKS_DIR).filter(f => f.endsWith('.json'));
console.log('Chunk files:', files.length);

let allKeys = new Set();
let totalEntries = 0;
let byChunk = {};
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8'));
  const keys = Object.keys(data);
  byChunk[f] = keys.length;
  keys.forEach(k => allKeys.add(k));
  totalEntries += keys.length;
}
console.log('Total entries in all chunks:', totalEntries);
console.log('Unique keys:', allKeys.size);
console.log('');
console.log('Per-chunk:');
Object.entries(byChunk).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
console.log('');

console.log('=== CATALOG ===');
const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const items = cat.items;
console.log('Total items:', items.length);
const byId = {};
const byTitle = {};
items.forEach(it => {
  if (it.i) byId[it.i] = it;
  if (it.t) byTitle[normalize(it.t)] = it;
});
console.log('Unique IDs:', Object.keys(byId).length);
console.log('');

console.log('=== CROSS-CHECK ===');
console.log('Chunk keys sample:');
Array.from(allKeys).slice(0, 5).forEach(k => console.log('  ' + k));
console.log('Catalog IDs sample:');
Object.keys(byId).slice(0, 5).forEach(k => console.log('  ' + k));
console.log('');

// Try to match by title
let titleMatched = 0;
let titleMissing = 0;
for (const [k, item] of Object.entries(byId)) {
  const normTitle = normalize(item.t);
  if (byTitle[normTitle]) titleMatched++;
  else titleMissing++;
}
console.log('Catalog items with title in forms-chunks: ~' + titleMatched);
console.log('Items without title match:', titleMissing);

function normalize(s) {
  return (s || '').replace(/[\s\-_.,]/g, '').toLowerCase();
}
