#!/usr/bin/env node
/**
 * CloudFam Uploader v4 — SIMPLE & RELIABLE
 *
 * No complex V3 verification. Just upload + wait + continue.
 * Saves progress after each successful batch.
 * Resumes from progress file.
 *
 * Usage: node scripts/cf-upload.cjs
 */

const fs = require('fs');
const path = require('path');
const p = require('puppeteer-core');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = path.join(PROJECT_ROOT, 'public', 'books');
const HOME = process.env.USERPROFILE || process.env.HOME;
const PROGRESS_FILE = path.join(HOME, 'cf-upload-progress.json');
const DEBUG_PORT = 9222;

const BATCH_SIZE = parseInt(process.env.CF_BATCH_SIZE || '5', 10);
const BATCH_WAIT_MS = parseInt(process.env.CF_BATCH_WAIT || '90000', 10);
const MAX_BOOKS = parseInt(process.env.CF_MAX_BOOKS || '999999', 10);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function saveProgress(p) {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }
  catch (e) { console.log('!! Progress save failed:', e.message); }
}

async function main() {
  console.log('=== CloudFam Uploader v4 (Simple) ===');
  console.log(`Config: batch=${BATCH_SIZE}, wait=${BATCH_WAIT_MS/1000}s, max=${MAX_BOOKS}`);

  // Connect to existing Chrome
  console.log('\nConnecting to Chrome...');
  const browser = await p.connect({ browserURL: `http://127.0.0.1:${DEBUG_PORT}`, defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(pg => pg.url().includes('user.cloudfam.io') || pg.url().includes('cloudfam.io/dashboard'));
  if (!page) {
    page = await browser.newPage();
  }
  console.log(`Using tab: ${page.url()}`);

  // Navigate to upload page
  console.log('Navigating to user.cloudfam.io...');
  try {
    await page.goto('https://user.cloudfam.io/', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log('  nav:', e.message);
  }
  await sleep(3000);

  // If on Google sign-in, wait for user
  if (page.url().includes('signin') || page.url().includes('accounts.google')) {
    console.log('\n!! Google sign-in detected.');
    console.log('!! Please solve it in the Chrome window.');
    console.log('!! Waiting for you...');
    const start = Date.now();
    while (Date.now() - start < 5 * 60 * 1000) {
      await sleep(10000);
      if (!page.url().includes('signin') && !page.url().includes('accounts.google')) {
        console.log('  ✓ Done. Continuing.');
        break;
      }
    }
  }

  // Find file input
  const inp = await page.$('input[type="file"]');
  if (!inp) throw new Error('No file input found on upload page');
  console.log('  ✓ File input found\n');

  // Load progress
  let progress = { uploaded: [], failed: [] };
  if (fs.existsSync(PROGRESS_FILE)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch (e) {}
  }
  const allFiles = fs.readdirSync(BOOKS_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .slice(0, MAX_BOOKS);
  const doneSet = new Set(progress.uploaded.map(u => u.filename));
  const remaining = allFiles.filter(f => !doneSet.has(f));
  console.log(`Total: ${allFiles.length} | Done: ${progress.uploaded.length} | Remaining: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log('\nAll files uploaded!');
    await browser.disconnect();
    return;
  }

  // Process batches
  let batchNum = Math.floor(progress.uploaded.length / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE) + batchNum - 1;

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchPaths = batch.map(f => path.join(BOOKS_DIR, f));
    console.log(`[Batch ${batchNum}/${totalBatches}] ${batch.length} files`);

    try {
      // Re-find input (in case page state changed)
      let input = await page.$('input[type="file"]');
      if (!input) {
        console.log('  No file input, refreshing...');
        await page.goto('https://user.cloudfam.io/', { waitUntil: 'networkidle2' });
        await sleep(3000);
        if (page.url().includes('signin') || page.url().includes('accounts.google')) {
          console.log('  !! Google sign-in again, waiting for user...');
          await sleep(60000); // Give user time
        }
        input = await page.$('input[type="file"]');
        if (!input) throw new Error('File input still missing');
      }

      // Upload
      await input.uploadFile(...batchPaths);
      console.log(`  ${batch.length} files attached. Waiting ${BATCH_WAIT_MS/1000}s...`);

      // Fixed wait — no verification
      await sleep(BATCH_WAIT_MS);

      // Save as uploaded
      progress.uploaded.push(...batch.map(f => ({
        filename: f,
        uploaded_at: new Date().toISOString()
      })));
      saveProgress(progress);
      console.log(`  ✓ Saved. Total: ${progress.uploaded.length} uploaded`);

    } catch (e) {
      console.log(`  ✗ Error: ${e.message}`);
      progress.failed.push(...batch.map(f => ({
        filename: f,
        error: e.message,
        at: new Date().toISOString()
      })));
      saveProgress(progress);
    }

    batchNum++;
    if (i + BATCH_SIZE < remaining.length) {
      console.log(`  Pausing 10s...\n`);
      await sleep(10000);
    }
  }

  console.log('\n=== DONE ===');
  console.log(`Uploaded: ${progress.uploaded.length}`);
  console.log(`Failed: ${progress.failed.length}`);

  await browser.disconnect();
}

main().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
