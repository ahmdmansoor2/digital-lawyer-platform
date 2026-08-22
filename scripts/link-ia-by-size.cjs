#!/usr/bin/env node
/**
 * Link IA to catalog by file SIZE
 *
 * Fetches HEAD on each IA file to get size, then matches against local PDFs.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = path.join(PROJECT_ROOT, 'public', 'books');
const CATALOG = path.join(PROJECT_ROOT, 'public', 'data', 'legal-catalog-summary.json');
const IA_LOG = path.join(PROJECT_ROOT, 'scripts', 'ia-upload-log.json');
const IA_BASE = 'https://archive.org/download/mohamidigital-library/';
const PARALLEL = 20;

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 15000 }, res => {
      resolve({ status: res.statusCode, size: parseInt(res.headers['content-length'] || '0', 10) });
    });
    req.on('error', () => resolve({ status: 0, size: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, size: 0 }); });
    req.end();
  });
}

async function getIaSizes(iaFiles) {
  const sizeMap = new Map(); // size → iaFile
  let done = 0;
  // Process in parallel batches
  for (let i = 0; i < iaFiles.length; i += PARALLEL) {
    const batch = iaFiles.slice(i, i + PARALLEL);
    const results = await Promise.all(batch.map(async f => {
      const r = await head(IA_BASE + encodeURIComponent(f));
      return { file: f, ...r };
    }));
    for (const r of results) {
      if (r.size > 0) sizeMap.set(r.size, r.file);
    }
    done += batch.length;
    if (done % 100 === 0 || done === iaFiles.length) {
      process.stdout.write(`  IA HEAD: ${done}/${iaFiles.length}\r`);
    }
  }
  console.log('');
  return sizeMap;
}

async function main() {
  console.log('=== Link IA to catalog by size ===');

  const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const catalog = Array.isArray(raw) ? raw : (raw.items || []);
  const iaLog = JSON.parse(fs.readFileSync(IA_LOG, 'utf8'));
  const iaDone = iaLog.done || [];

  console.log(`Catalog: ${catalog.length} | IA done: ${iaDone.length}`);

  // Build local size map
  const localSizeMap = new Map(); // size → local filename
  const localFiles = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.pdf'));
  for (const f of localFiles) {
    const size = fs.statSync(path.join(BOOKS_DIR, f)).size;
    if (!localSizeMap.has(size)) localSizeMap.set(size, f);
  }
  console.log(`Local PDFs with size map: ${localSizeMap.size} unique sizes`);

  // Build local filename → size
  const localFileSize = new Map();
  for (const f of localFiles) {
    const size = fs.statSync(path.join(BOOKS_DIR, f)).size;
    localFileSize.set(f, size);
  }

  // Build IA size map (HEAD requests in parallel)
  console.log(`\nFetching IA HEAD responses (${iaDone.length} files)...`);
  const iaSizeMap = await getIaSizes(iaDone);
  console.log(`IA size map: ${iaSizeMap.size} unique sizes`);

  // Now link: for each catalog item, find local file → size → IA file
  let updated = 0;
  let noMatch = 0;
  const noMatchItems = [];

  for (const book of catalog) {
    if (!book.u) continue;
    const m = book.u.match(/\/books\/([^/]+\.pdf)$/i);
    if (!m) continue;
    let localFile;
    try { localFile = decodeURIComponent(m[1]); } catch (e) { localFile = m[1]; }

    const localSize = localFileSize.get(localFile);
    if (!localSize) {
      noMatch++;
      if (noMatchItems.length < 30) noMatchItems.push({ id: book.i, file: localFile, reason: 'local not found' });
      continue;
    }

    const iaFile = iaSizeMap.get(localSize);
    if (iaFile) {
      book.u = `${IA_BASE}${iaFile}`;
      book.ia_url = book.u;
      updated++;
    } else {
      noMatch++;
      if (noMatchItems.length < 30) noMatchItems.push({ id: book.i, file: localFile, size: localSize, reason: 'no IA match' });
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Updated: ${updated}`);
  console.log(`No match: ${noMatch}`);
  if (noMatchItems.length > 0) {
    console.log(`\nFirst 30 unmatched:`);
    noMatchItems.slice(0, 30).forEach(m => console.log(`  ${m.id} | ${m.file} | ${m.reason} ${m.size || ''}`));
  }

  // Save
  fs.writeFileSync(CATALOG, JSON.stringify(raw, null, 2), 'utf8');
  const distCatalog = path.join(PROJECT_ROOT, 'dist', 'data', 'legal-catalog-summary.json');
  if (fs.existsSync(path.dirname(distCatalog))) {
    fs.writeFileSync(distCatalog, JSON.stringify(raw, null, 2), 'utf8');
  }
  console.log(`\nSaved: ${CATALOG}`);
}

main().catch(e => { console.error('FATAL:', e.message); console.error(e.stack); process.exit(1); });
