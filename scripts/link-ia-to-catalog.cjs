#!/usr/bin/env node
/**
 * Link IA uploads to catalog
 *
 * Reads ia-upload-log.json (done filenames) and updates legal-catalog-summary.json
 * by setting the `u` field to the IA download URL for matching items.
 *
 * IA URL pattern: https://archive.org/download/mohamidigital-library/<filename>
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(PROJECT_ROOT, 'public', 'data', 'legal-catalog-summary.json');
const IA_LOG = path.join(PROJECT_ROOT, 'scripts', 'ia-upload-log.json');
const IA_BASE = 'https://archive.org/download/mohamidigital-library/';

function main() {
  console.log('=== Link IA uploads to catalog ===');

  if (!fs.existsSync(CATALOG)) { console.error('!! Catalog not found'); process.exit(1); }
  if (!fs.existsSync(IA_LOG)) { console.error('!! IA log not found'); process.exit(1); }

  const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const catalog = Array.isArray(raw) ? raw : (raw.items || []);
  const iaLog = JSON.parse(fs.readFileSync(IA_LOG, 'utf8'));
  const iaDone = iaLog.done || [];

  console.log(`Catalog: ${catalog.length} items`);
  console.log(`IA done: ${iaDone.length} files`);

  // Build filename set
  const iaSet = new Set(iaDone);
  console.log(`Building lookup by filename (URL-decoded)...`);

  // Build decode map
  const iaDecodedMap = new Map();
  for (const f of iaDone) {
    try {
      const decoded = decodeURIComponent(f);
      iaDecodedMap.set(decoded, f);
    } catch (e) {
      iaDecodedMap.set(f, f);
    }
  }

  let updated = 0;
  let noMatch = 0;
  const noMatchList = [];
  const matchedFiles = new Set();

  for (const book of catalog) {
    if (!book.u) continue;
    // Get filename from local path like /books/<filename>.pdf
    const m = book.u.match(/\/books\/([^/]+\.pdf)$/i);
    if (!m) continue;
    const localFile = m[1];

    // Try match: directly, or URL-decoded
    let iaFile = null;
    if (iaSet.has(localFile)) {
      iaFile = localFile;
    } else if (iaDecodedMap.has(localFile)) {
      iaFile = iaDecodedMap.get(localFile);
    } else {
      // Try variations
      const variations = [
        localFile.toLowerCase(),
        localFile.replace(/%20/g, ' '),
        localFile.replace(/[^a-zA-Z0-9._-]/g, '-'),
      ];
      for (const v of variations) {
        if (iaSet.has(v)) { iaFile = v; break; }
      }
    }

    if (iaFile) {
      book.u = `${IA_BASE}${iaFile}`;
      book.ia_url = book.u;
      updated++;
      matchedFiles.add(iaFile);
    } else {
      noMatch++;
      if (noMatchList.length < 30) noMatchList.push({ id: book.i, file: localFile, t: book.t });
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Updated: ${updated}`);
  console.log(`No match: ${noMatch}`);
  console.log(`IA done files matched: ${matchedFiles.size}/${iaDone.length}`);

  if (noMatchList.length > 0) {
    console.log(`\nFirst 30 unmatched:`);
    noMatchList.slice(0, 30).forEach(m => console.log(`  ${m.id} | ${m.file} | ${m.t}`));
  }

  // Save
  fs.writeFileSync(CATALOG, JSON.stringify(raw, null, 2), 'utf8');
  // Mirror to dist
  const distCatalog = path.join(PROJECT_ROOT, 'dist', 'data', 'legal-catalog-summary.json');
  if (fs.existsSync(path.dirname(distCatalog))) {
    fs.writeFileSync(distCatalog, JSON.stringify(raw, null, 2), 'utf8');
    console.log(`Mirrored to dist/`);
  }
  console.log(`\nSaved: ${CATALOG}`);
}

main();
