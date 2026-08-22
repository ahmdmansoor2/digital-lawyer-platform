#!/usr/bin/env node
/**
 * CloudFam Uploader v3 — stable
 *
 * - Saves progress immediately after each successful batch
 * - Detects Google sign-in interception and waits for user
 * - Uses single navigation, no re-navigation per batch
 * - Verifies via V3 API count
 */

const fs = require('fs');
const path = require('path');
const p = require('puppeteer-core');
const https = require('https');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = path.join(PROJECT_ROOT, 'public', 'books');
const HOME = process.env.USERPROFILE || process.env.HOME;
const PROGRESS_FILE = path.join(HOME, 'cf-upload-progress.json');
const DEBUG_PORT = 9222;
const API_KEY = '78716f75d7a9de417a797babd9bfc064d99a4d5e92d24d3be2f676517c22f061';

const BATCH_SIZE = parseInt(process.env.CF_BATCH_SIZE || '20', 10);
const BATCH_PAUSE_MS = parseInt(process.env.CF_BATCH_PAUSE || '15000', 10);
const MAX_BOOKS = parseInt(process.env.CF_MAX_BOOKS || '999999', 10);
const MAX_RETRIES = 2;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function apiCall(pathname) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://cloudfam.io' + pathname);
    const req = https.get({
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { 'X-API-Key': API_KEY, 'User-Agent': 'Mavis-CF/3.0' },
      timeout: 30000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Bad JSON')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Timeout')));
  });
}

async function getCloudFamFileCount() {
  let total = 0;
  for (let page = 1; page <= 50; page++) {
    const r = await apiCall(`/api/v3/files?limit=200&page=${page}`);
    if (!r.success) break;
    const items = r.data || [];
    if (items.length === 0) break;
    total += items.length;
    if (items.length < 200) break;
  }
  return total;
}

function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (e) {
    console.log('  !! Failed to save progress:', e.message);
  }
}

async function waitForUserToSolveGoogleSignIn(page) {
  console.log('  !! Google sign-in interception detected!');
  console.log('  !! Please solve the Google sign-in alert in the Chrome window.');
  console.log('  !! Waiting for you to complete it...');
  const start = Date.now();
  while (Date.now() - start < 5 * 60 * 1000) {
    await sleep(10000);
    const url = page.url();
    if (url.includes('user.cloudfam.io') || url.includes('cloudfam.io/dashboard') || url.includes('cloudfam.io/')) {
      if (!url.includes('signin') && !url.includes('accounts.google')) {
        console.log('  ✓ You solved it! Continuing...');
        return true;
      }
    }
  }
  throw new Error('User did not solve Google sign-in within 5 minutes');
}

async function main() {
  console.log('=== CloudFam Uploader v3 (stable) ===');
  console.log(`Config: ${BATCH_SIZE}/batch, ${BATCH_PAUSE_MS/1000}s pause, max ${MAX_BOOKS} books`);

  // Initial count
  let initialCount = 0;
  try {
    initialCount = await getCloudFamFileCount();
  } catch (e) {
    console.log('!! Failed to get initial count:', e.message);
    initialCount = 0;
  }
  console.log(`CloudFam current files: ${initialCount}`);

  // Progress
  let progress = { uploaded: [], failed: [] };
  if (fs.existsSync(PROGRESS_FILE)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch (e) { /* ignore */ }
  }
  const allFiles = fs.readdirSync(BOOKS_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .slice(0, MAX_BOOKS);
  const doneSet = new Set(progress.uploaded.map(u => u.filename));
  const remaining = allFiles.filter(f => !doneSet.has(f));
  console.log(`Local PDFs: ${allFiles.length} | Done: ${progress.uploaded.length} | Remaining: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log('\nAll files uploaded!');
    return;
  }

  // Connect to Chrome
  console.log('\nConnecting to Chrome...');
  const browser = await p.connect({ browserURL: `http://127.0.0.1:${DEBUG_PORT}`, defaultViewport: null });
  let page = (await browser.pages()).find(pg => pg.url().includes('user.cloudfam.io') || (pg.url().includes('cloudfam.io') && !pg.url().includes('signin') && !pg.url().includes('accounts.google')));
  if (!page) {
    page = await browser.newPage();
  }
  console.log(`Using tab: ${page.url()}`);

  // Initial navigation
  console.log('\nNavigating to user.cloudfam.io...');
  try {
    await page.goto('https://user.cloudfam.io/', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log('  Navigation error:', e.message);
  }
  await sleep(3000);

  // Check for Google sign-in
  const currentUrl = page.url();
  if (currentUrl.includes('signin') || currentUrl.includes('accounts.google') || currentUrl.includes('signin-dice-web-intercept')) {
    await waitForUserToSolveGoogleSignIn(page);
  }
  console.log(`Current URL: ${page.url()}`);

  // Find file input ONCE
  let fileInput = await page.$('input[type="file"]');
  if (!fileInput) {
    // Try clicking the upload zone / drag area
    console.log('  No file input visible, looking for dropzone...');
    const dz = await page.evaluate(() => {
      // Click on the upload area to trigger file input
      const areas = Array.from(document.querySelectorAll('[class*="drop"], [class*="upload"], button'));
      for (const el of areas) {
        const text = (el.innerText || '').toLowerCase();
        if (text.includes('upload') || text.includes('drop') || text.includes('browse')) {
          el.click();
          return 'clicked';
        }
      }
      return 'not found';
    });
    console.log('  Dropzone click:', dz);
    await sleep(2000);
    fileInput = await page.$('input[type="file"]');
  }
  if (!fileInput) {
    throw new Error('File input not found even after dropzone click');
  }
  console.log('  ✓ File input ready');

  // Process batches
  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);
  console.log(`\nProcessing ${totalBatches} batches...\n`);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batchPaths = batch.map(f => path.join(BOOKS_DIR, f));
    console.log(`[Batch ${batchNum}/${totalBatches}] ${batch.length} files`);
    process.stdout.write(`  Uploading... `);

    let success = false;
    let actualDelta = 0;
    for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
      const beforeCount = await getCloudFamFileCount();
      try {
        // Re-find input (in case it was detached)
        const inp = await page.$('input[type="file"]');
        if (!inp) {
          console.log('\n  !! File input disappeared, refreshing page...');
          await page.goto('https://user.cloudfam.io/', { waitUntil: 'networkidle2' });
          await sleep(3000);
          // Check Google sign-in
          if (page.url().includes('signin') || page.url().includes('accounts.google')) {
            await waitForUserToSolveGoogleSignIn(page);
          }
          continue;
        }
        await inp.uploadFile(...batchPaths);
      } catch (e) {
        console.log(`\n  !! uploadFile failed: ${e.message}`);
        continue;
      }

      // Wait and verify
      const start = Date.now();
      const maxWait = 4 * 60 * 1000;
      let lastCount = beforeCount;
      let stable = 0;
      while (Date.now() - start < maxWait) {
        await sleep(20000);
        try {
          const now = await getCloudFamFileCount();
          if (now > lastCount) {
            lastCount = now;
            stable = 0;
            process.stdout.write('.');
          } else if (now > beforeCount) {
            stable++;
            if (stable >= 2) {
              actualDelta = now - beforeCount;
              process.stdout.write(` done (delta +${actualDelta})`);
              success = true;
              break;
            }
          }
        } catch (e) {}
      }
      if (!success) {
        const final = await getCloudFamFileCount();
        actualDelta = Math.max(0, final - beforeCount);
        console.log(`\n  Attempt ${attempt} partial: +${actualDelta}/${batch.length}`);
        if (actualDelta >= batch.length) {
          success = true;
        } else if (actualDelta > 0 && attempt === MAX_RETRIES) {
          // Accept partial
          success = true;
        }
      }
    }

    if (success) {
      const uploadedCount = Math.min(actualDelta, batch.length);
      progress.uploaded.push(...batch.slice(0, uploadedCount).map(f => ({
        filename: f,
        uploaded_at: new Date().toISOString()
      })));
      if (uploadedCount < batch.length) {
        progress.failed.push(...batch.slice(uploadedCount).map(f => ({
          filename: f,
          error: 'partial',
          at: new Date().toISOString()
        })));
      }
    } else {
      progress.failed.push(...batch.map(f => ({
        filename: f,
        error: 'failed',
        at: new Date().toISOString()
      })));
    }
    saveProgress(progress);
    console.log(`\n  Total: ${progress.uploaded.length} done, ${progress.failed.length} failed`);

    if (i + BATCH_SIZE < remaining.length) {
      console.log(`  Pausing ${BATCH_PAUSE_MS/1000}s...\n`);
      await sleep(BATCH_PAUSE_MS);
    }
  }

  console.log('\n=== UPLOAD COMPLETE ===');
  const finalCount = await getCloudFamFileCount();
  console.log(`Final CloudFam files: ${finalCount}`);
  console.log(`Progress: ${progress.uploaded.length} done, ${progress.failed.length} failed`);

  await browser.disconnect();
}

main().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
