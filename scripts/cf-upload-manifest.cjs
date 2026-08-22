#!/usr/bin/env node
/**
 * CloudFam Upload Manifest Builder
 *
 * Generates a manifest of all PDFs in public/books/ with:
 * - filename
 * - size in bytes
 * - sha256 hash (first 16 chars) — for triple-check matching
 * - branch from catalog (criminal/civil/etc.) — for prioritization
 *
 * Sorted by size so user can drag batches and we can match on CloudFam side.
 *
 * Usage:
 *   node scripts/cf-upload-manifest.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = path.join(PROJECT_ROOT, 'public', 'books');
const CATALOG_PATH = path.join(PROJECT_ROOT, 'public', 'data', 'legal-catalog-summary.json');
const OUTPUT = path.join(process.env.USERPROFILE || process.env.HOME, 'cf-upload-manifest.json');

function sha256Short(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}

function main() {
  console.log('=== CloudFam Upload Manifest Builder ===');
  console.log('Books dir:', BOOKS_DIR);

  // Load catalog for branch info
  let catalog = [];
  if (fs.existsSync(CATALOG_PATH)) {
    const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    catalog = Array.isArray(raw) ? raw : (raw.items || []);
    console.log(`Catalog loaded: ${catalog.length} books`);
  } else {
    console.warn('!! Catalog not found, branch info will be unknown');
  }

  // Build filename → catalog-entry lookup
  const catalogByFilename = new Map();
  for (const book of catalog) {
    if (book.u) {
      const file = book.u.split('/').pop();
      catalogByFilename.set(file, book);
    }
  }

  // Scan books
  const files = fs.readdirSync(BOOKS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`PDFs found: ${files.length}`);

  const manifest = [];
  for (const filename of files) {
    const fullPath = path.join(BOOKS_DIR, filename);
    const stat = fs.statSync(fullPath);
    const buf = fs.readFileSync(fullPath);
    const hash = sha256Short(buf);
    const cat = catalogByFilename.get(filename);
    manifest.push({
      filename,
      size_bytes: stat.size,
      size_mb: +(stat.size / 1024 / 1024).toFixed(3),
      sha256_16: hash,
      title: cat ? cat.t : null,
      branch: cat ? cat.b : null,
      has_ia_url: !!cat?.u
    });
  }

  // Sort by size — so when CloudFam returns files sorted by size, we can match 1:1
  manifest.sort((a, b) => a.size_bytes - b.size_bytes);

  // Branch stats
  const branchStats = {};
  for (const m of manifest) {
    const b = m.branch || 'unknown';
    branchStats[b] = (branchStats[b] || 0) + 1;
  }

  // Write manifest
  const out = {
    generated_at: new Date().toISOString(),
    total_files: manifest.length,
    total_size_bytes: manifest.reduce((s, m) => s + m.size_bytes, 0),
    total_size_gb: +(manifest.reduce((s, m) => s + m.size_bytes, 0) / 1024 / 1024 / 1024).toFixed(3),
    branch_stats: branchStats,
    upload_instructions: {
      step1: 'افتح https://cloudfam.io/upload في المتصفح وسجل دخول',
      step2: 'اسحب كل ملفات D:\\قانوني 7\\public\\books\\ على الصفحة (أو في دفعات 100 ملف)',
      step3: 'بعد انتهاء الرفع كله، شغّل: node scripts/cf-build-mapping.cjs',
      step4: 'بعدها شغّل: node scripts/cf-update-library.cjs',
      step5: 'وأخيراً: npm run build && firebase deploy --only hosting:app'
    },
    files: manifest
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf8');

  const sizeMB = (out.total_size_bytes / 1024 / 1024).toFixed(2);
  console.log(`\nManifest written: ${OUTPUT}`);
  console.log(`Total: ${out.total_files} files, ${sizeMB} MB`);
  console.log(`\nBranch distribution:`);
  Object.entries(branchStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([b, c]) => console.log(`  ${b.padEnd(20)} ${c}`));
}

main();
