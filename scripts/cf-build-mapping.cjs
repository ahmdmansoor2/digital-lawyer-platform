#!/usr/bin/env node
/**
 * CloudFam → Catalog Mapping Builder
 *
 * Fetches all uploaded files from CloudFam API (paginated),
 * sorts them by file size, and matches against the local upload manifest
 * (also sorted by size). Outputs cf-mapping.json.
 *
 * Usage:
 *   node scripts/cf-build-mapping.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = '78716f75d7a9de417a797babd9bfc064d99a4d5e92d24d3be2f676517c22f061';
const BASE = 'https://cloudfam.io/api/v3';
const MANIFEST = path.join(process.env.USERPROFILE || process.env.HOME, 'cf-upload-manifest.json');
const OUTPUT = path.join(process.env.USERPROFILE || process.env.HOME, 'cf-mapping.json');
const DRY_RUN = process.argv.includes('--dry-run');

function api(pathname) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + pathname);
    const req = https.get({
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { 'X-API-Key': API_KEY, 'User-Agent': 'Mavis-CF-Mapper/1.0' },
      timeout: 60000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const obj = JSON.parse(data);
          resolve(obj);
        } catch (e) {
          reject(new Error(`Bad JSON from ${pathname}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Timeout')));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAllFiles() {
  const all = [];
  let page = 1;
  const limit = 200;
  while (true) {
    const r = await api(`/files?limit=${limit}&page=${page}`);
    if (!r.success) throw new Error('API error: ' + JSON.stringify(r));
    const items = r.data || [];
    all.push(...items);
    console.log(`  Page ${page}: +${items.length} (total ${all.length})`);
    if (items.length < limit) break;
    page++;
    if (page > 100) break; // safety
    await sleep(500);
  }
  return all;
}

async function main() {
  console.log('=== CloudFam → Catalog Mapping Builder ===');
  if (DRY_RUN) console.log('[DRY RUN — no file written]');

  // Load manifest
  if (!fs.existsSync(MANIFEST)) {
    console.error('!! Manifest not found. Run cf-upload-manifest.cjs first.');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  console.log(`Manifest: ${manifest.total_files} local PDFs, ${manifest.total_size_gb} GB`);

  // Fetch all CloudFam files
  console.log('\nFetching CloudFam files...');
  const cfFiles = await fetchAllFiles();
  console.log(`CloudFam: ${cfFiles.length} files`);

  if (cfFiles.length === 0) {
    console.log('\n!! No files on CloudFam yet. Upload some first.');
    process.exit(0);
  }

  // Sort both by size
  const localBySize = [...manifest.files].sort((a, b) => a.size_bytes - b.size_bytes);
  const cfBySize = [...cfFiles].sort((a, b) => a.file_size_bytes - b.file_size_bytes);

  // Match 1:1 by size (each PDF has unique size in the library)
  const mapping = [];
  const unmatched = [];
  let i = 0, j = 0;
  while (i < localBySize.length && j < cfBySize.length) {
    const local = localBySize[i];
    const remote = cfBySize[j];
    if (local.size_bytes === remote.file_size_bytes) {
      mapping.push({
        local_filename: local.filename,
        local_size: local.size_bytes,
        cf_file_id: remote.id,
        cf_short_id: remote.short_url_id,
        cf_original_filename: remote.original_filename,
        cf_download_url: remote.download_url,
        cf_uploaded_at: remote.uploaded_at,
        branch: local.branch,
        title: local.title
      });
      i++; j++;
    } else if (local.size_bytes < remote.file_size_bytes) {
      unmatched.push({ kind: 'local_only', filename: local.filename, size: local.size_bytes });
      i++;
    } else {
      unmatched.push({ kind: 'cloudfam_only', cf_id: remote.id, short: remote.short_url_id, size: remote.file_size_bytes });
      j++;
    }
  }
  // Drain remainder
  while (i < localBySize.length) { unmatched.push({ kind: 'local_only', filename: localBySize[i].filename, size: localBySize[i].size_bytes }); i++; }
  while (j < cfBySize.length) { unmatched.push({ kind: 'cloudfam_only', cf_id: cfBySize[j].id, short: cfBySize[j].short_url_id, size: cfBySize[j].file_size_bytes }); j++; }

  // Build per-book lookup (filename → mapping)
  const byFilename = new Map();
  for (const m of mapping) byFilename.set(m.local_filename, m);

  const out = {
    built_at: new Date().toISOString(),
    matched: mapping.length,
    unmatched_local: unmatched.filter(u => u.kind === 'local_only').length,
    unmatched_cloudfam: unmatched.filter(u => u.kind === 'cloudfam_only').length,
    total_local: manifest.total_files,
    total_cloudfam: cfFiles.length,
    mapping,
    unmatched
  };
  if (!DRY_RUN) fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf8');

  console.log(`\nMatched: ${mapping.length}`);
  console.log(`Unmatched local: ${out.unmatched_local}`);
  console.log(`Unmatched CloudFam: ${out.unmatched_cloudfam}`);
  console.log(`Output: ${DRY_RUN ? '(dry-run, not written)' : OUTPUT}`);

  if (out.unmatched_local > 0) {
    console.log(`\nFirst 10 unmatched local files:`);
    unmatched.filter(u => u.kind === 'local_only').slice(0, 10).forEach(u => console.log(`  ${u.filename} (${u.size} bytes)`));
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
