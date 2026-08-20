// rebuild-doc-index.cjs
// يبني doc-index-map.json من forms-chunks ويرفعه على Firebase/IA
const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = 'D:\\قانوني 7\\public\\data\\forms-chunks';
const OUT_FILE = 'D:\\قانوني 7\\public\\data\\doc-index-map.json';

console.log('=== Building doc-index-map.json from forms-chunks ===');

const files = fs.readdirSync(CHUNKS_DIR).filter(f => f.endsWith('.json') && f.startsWith('chunk-'));
console.log('Chunk files:', files.length);

// build: title -> chunkId (chunk file basename without .json)
const titleToChunk = {};
const idToChunk = {};  // form-N -> chunkId
let totalEntries = 0;
const formIdsByChunk = {};

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8'));
  const chunkBase = f.replace('.json', '');  // e.g. "chunk-0"
  const entries = Object.keys(data);
  formIdsByChunk[chunkBase] = entries.length;
  for (const entryId of entries) {
    const entry = data[entryId];
    if (entry && entry.title) {
      // primary: title -> chunk
      titleToChunk[entry.title] = chunkBase;
      // also: id -> chunk
      idToChunk[entryId] = chunkBase;
    }
  }
  totalEntries += entries.length;
}

console.log('Total entries:', totalEntries);
console.log('Unique titles in map:', Object.keys(titleToChunk).length);
console.log('Unique form-IDs in map:', Object.keys(idToChunk).length);

// Add a few aliases for common search patterns the HTML tries
// (e.g. "al-ijaazat al-istithna'iyya" matches "الأجازة الإستثنائية")
// HTML uses normalizeSearchKey() — for safety, also map normalized forms
const normalize = s => (s || '')
  .trim()
  .replace(/^[\d\s\-_.,#()\[\]$@~+*]+/g, '')
  .replace(/[\$~\-_–—@#^*|\\\/]/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/[أإآا]/g, 'ا')
  .replace(/[ىي]/g, 'ي')
  .replace(/ة/g, 'ه')
  .toLowerCase()
  .trim();

const normToChunk = {};
for (const [title, chunk] of Object.entries(titleToChunk)) {
  const n = normalize(title);
  if (n && !normToChunk[n]) normToChunk[n] = chunk;
}

const finalMap = {
  // Versioning for cache busting
  _meta: {
    version: '3.0.0',
    builtAt: new Date().toISOString(),
    totalEntries: totalEntries,
    uniqueTitles: Object.keys(titleToChunk).length,
    normalizedTitles: Object.keys(normToChunk).length,
  },
  // Primary: title -> chunk
  ...titleToChunk,
  // Secondary: id -> chunk (for backup)
  ...idToChunk,
  // Tertiary: normalized title -> chunk
  ...normToChunk,
};

fs.writeFileSync(OUT_FILE, JSON.stringify(finalMap), 'utf8');
const size = fs.statSync(OUT_FILE).size;
console.log('');
console.log('Written: ' + OUT_FILE);
console.log('Size: ' + (size / 1024).toFixed(1) + ' KB');
console.log('Sample entries:');
const sample = Object.entries(titleToChunk).slice(0, 5);
sample.forEach(([k, v]) => console.log('  "' + k + '" -> ' + v));
