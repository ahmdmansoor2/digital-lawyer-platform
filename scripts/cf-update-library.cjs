#!/usr/bin/env node
/**
 * CloudFam → Legal Library Updater
 *
 * Reads cf-mapping.json and:
 * 1. Adds `cf_url` field to each catalog entry that has a CloudFam match
 * 2. Updates public/legal-library.html to prefer cf_url over IA url
 * 3. Outputs updated catalog to public/data/legal-catalog-summary.json
 * 4. Copies to dist/data/legal-catalog-summary.json for next build
 *
 * Usage:
 *   node scripts/cf-update-library.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(PROJECT_ROOT, 'public', 'data', 'legal-catalog-summary.json');
const HTML_SRC = path.join(PROJECT_ROOT, 'public', 'legal-library.html');
const HTML_DIST = path.join(PROJECT_ROOT, 'dist', 'legal-library.html');
const MAPPING = path.join(process.env.USERPROFILE || process.env.HOME, 'cf-mapping.json');
const DRY_RUN = process.argv.includes('--dry-run');

function main() {
  console.log('=== CloudFam → Legal Library Updater ===');
  if (DRY_RUN) console.log('[DRY RUN]');

  if (!fs.existsSync(MAPPING)) {
    console.error('!! cf-mapping.json not found. Run cf-build-mapping.cjs first.');
    process.exit(1);
  }
  const mapping = JSON.parse(fs.readFileSync(MAPPING, 'utf8'));
  console.log(`Mapping: ${mapping.matched} matched`);

  // Load catalog
  const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const catalog = Array.isArray(raw) ? raw : (raw.items || []);
  console.log(`Catalog: ${catalog.length} books`);

  // Build filename → cf_url lookup
  const cfByFilename = new Map();
  for (const m of mapping.mapping) {
    cfByFilename.set(m.local_filename, m.cf_download_url);
  }

  // Update catalog
  let updated = 0;
  for (const book of catalog) {
    if (book.u) {
      const filename = book.u.split('/').pop();
      const cf = cfByFilename.get(filename);
      if (cf) {
        book.cf_url = cf;
        updated++;
      }
    }
  }
  console.log(`Catalog entries updated: ${updated}`);

  if (!DRY_RUN) {
    fs.writeFileSync(CATALOG, JSON.stringify(catalog), 'utf8');
    console.log(`Saved: ${CATALOG}`);

    // Mirror to dist
    if (fs.existsSync(path.dirname(HTML_DIST))) {
      fs.copyFileSync(CATALOG, path.join(PROJECT_ROOT, 'dist', 'data', 'legal-catalog-summary.json'));
      console.log(`Mirrored to dist/`);
    }
  }

  // Update legal-library.html — find where the download URL is used and prefer cf_url
  if (fs.existsSync(HTML_SRC)) {
    let html = fs.readFileSync(HTML_SRC, 'utf8');
    const before = html.length;

    // Find the openDocTextReader function and add CloudFam URL preference
    // Look for the "u:" or "url:" usage
    // Strategy: replace `book.u` (or `item.u`) in the reader fallback chain with `item.cf_url || item.u`
    const patterns = [
      { find: 'item.u ||', replace: 'item.cf_url || item.u ||' },
      { find: 'book.u ||', replace: 'book.cf_url || book.u ||' },
      { find: 'data.u', replace: 'data.cf_url || data.u' },
      { find: 'const u = book.u;', replace: 'const u = book.cf_url || book.u;' },
      { find: 'const url = book.u', replace: 'const url = book.cf_url || book.u' }
    ];
    let changed = 0;
    for (const p of patterns) {
      if (html.includes(p.find)) {
        html = html.split(p.find).join(p.replace);
        changed++;
      }
    }
    console.log(`HTML patterns replaced: ${changed}`);
    console.log(`HTML size: ${before} → ${html.length}`);

    if (!DRY_RUN && changed > 0) {
      fs.writeFileSync(HTML_SRC, html, 'utf8');
      console.log(`Saved: ${HTML_SRC}`);
      if (fs.existsSync(HTML_DIST)) {
        fs.writeFileSync(HTML_DIST, html, 'utf8');
        console.log(`Mirrored to dist/`);
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Books with CloudFam URL: ${updated} / ${catalog.length}`);
  console.log(`Next: cd "D:\\قانوني 7" && npm run build && npx firebase deploy --only hosting:app --project justice-91571 --force`);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
