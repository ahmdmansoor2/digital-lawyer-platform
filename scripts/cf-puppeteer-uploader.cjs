#!/usr/bin/env node
/**
 * CloudFam Puppeteer Uploader — Final
 *
 * Flow:
 *   1. Launch visible Chrome (so user can solve reCAPTCHA)
 *   2. Navigate to /auth, user logs in
 *   3. Script captures session cookies
 *   4. Navigate to /upload
 *   5. Upload all PDFs in batches of 25
 *   6. Save progress to cf-upload-progress.json
 *
 * Usage:
 *   set CLOUDFAM_PASSWORD=yourpass
 *   node scripts/cf-puppeteer-uploader.cjs
 *
 * Or just run without env var — the script opens Chrome visible and you login manually.
 */

const fs = require('fs');
const path = require('path');
const p = require('puppeteer-core');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = path.join(PROJECT_ROOT, 'public', 'books');
const HOME = process.env.USERPROFILE || process.env.HOME;
const MAPPING_FILE = path.join(HOME, 'cf-mapping.json');
const PROGRESS_FILE = path.join(HOME, 'cf-upload-progress.json');
const COOKIES_FILE = path.join(HOME, 'cf-cookies.json');

const EMAIL = process.env.CLOUDFAM_EMAIL || 'ahmdmansoor2@gmail.com';
const PASSWORD = process.env.CLOUDFAM_PASSWORD || null;
const BATCH_SIZE = parseInt(process.env.CF_BATCH_SIZE || '25', 10);
const BATCH_PAUSE_MS = parseInt(process.env.CF_BATCH_PAUSE || '30000', 10);
const MAX_BOOKS = parseInt(process.env.CF_MAX_BOOKS || '999999', 10);
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForLogin(page) {
  console.log('  Waiting for login... (solve reCAPTCHA + sign in)');
  const start = Date.now();
  while (Date.now() - start < 5 * 60 * 1000) {
    const url = page.url();
    if (!url.includes('auth') && !url.includes('login')) {
      console.log('  ✓ Logged in! URL:', url);
      return true;
    }
    await sleep(2000);
  }
  throw new Error('Login timeout after 5 minutes');
}

async function saveCookies(page) {
  const cookies = await page.cookies('https://cloudfam.io');
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log(`  ✓ ${cookies.length} cookies saved to ${COOKIES_FILE}`);
  return cookies;
}

async function uploadBatch(page, batch) {
  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) {
    const html = await page.content();
    fs.writeFileSync(path.join(HOME, 'cf-page-dump.html'), html);
    throw new Error('No file input found on upload page. Page dumped to cf-page-dump.html');
  }
  await fileInput.uploadFile(...batch);
  // Wait for the batch to finish — heuristic: wait until no spinners and progress is gone
  console.log('    Uploading batch...');
  const start = Date.now();
  const maxWait = 15 * 60 * 1000; // 15 min max per batch
  let lastState = null;
  while (Date.now() - start < maxWait) {
    await sleep(5000);
    try {
      const state = await page.evaluate(() => {
        // Check for any active spinners, progress bars, or upload indicators
        const text = document.body.innerText || '';
        const hasSpinner = document.querySelectorAll('[class*="spin"], [class*="loader"], [class*="loading"]').length > 0;
        const hasProgress = document.querySelectorAll('progress, [class*="progress-bar"], [class*="upload-progress"]').length > 0;
        // Count visible file items
        const fileItems = document.querySelectorAll('[class*="file-item"], [class*="upload-item"], [data-file-id]');
        // Look for completion text
        const doneWords = ['complete', 'done', 'success', 'uploaded', 'finished'];
        const hasDone = doneWords.some(w => text.toLowerCase().includes(w));
        return { hasSpinner, hasProgress, fileItems: fileItems.length, hasDone, snippet: text.substring(0, 300) };
      });
      if (state.snippet !== lastState) {
        console.log('    State:', JSON.stringify({ hasSpinner: state.hasSpinner, hasProgress: state.hasProgress, fileItems: state.fileItems, hasDone: state.hasDone }));
        lastState = state.snippet;
      }
      if (!state.hasSpinner && !state.hasProgress && state.hasDone) {
        console.log('    ✓ Batch complete');
        return;
      }
    } catch (e) {
      // Page may have navigated, ok
    }
  }
  throw new Error('Batch upload timeout after 15 minutes');
}

async function main() {
  console.log('=== CloudFam Puppeteer Uploader ===');
  console.log(`Email: ${EMAIL}`);
  console.log(`Books dir: ${BOOKS_DIR}`);

  const allFiles = fs.readdirSync(BOOKS_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(BOOKS_DIR, f))
    .slice(0, MAX_BOOKS);
  console.log(`Total PDFs to upload: ${allFiles.length}`);

  // Resume support
  let progress = { uploaded: [], failed: [] };
  if (fs.existsSync(PROGRESS_FILE)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch (e) { /* ignore */ }
  }
  const doneSet = new Set(progress.uploaded.map(u => u.filename));
  const remaining = allFiles.filter(f => !doneSet.has(path.basename(f)));
  console.log(`Already uploaded: ${progress.uploaded.length} | Remaining: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log('\nAll files uploaded! Run: node scripts/cf-build-mapping.cjs');
    return;
  }

  // Launch browser (visible for reCAPTCHA solving)
  const browser = await p.launch({
    executablePath: CHROME_PATH,
    headless: false, // VISIBLE — user needs to solve reCAPTCHA
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800'
    ],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(120000);
    page.on('console', msg => {
      const t = msg.text();
      if (t.includes('recaptcha') || t.includes('error') || t.includes('Error')) {
        console.log('  [browser]', t);
      }
    });
    page.on('pageerror', err => console.log('  [pageerror]', err.message));

    // === LOGIN ===
    console.log('\n[1/3] Opening login page...');
    await page.goto('https://cloudfam.io/auth', { waitUntil: 'networkidle2' });

    if (PASSWORD) {
      // Auto-fill credentials
      await page.waitForSelector('input[name="identifier"]', { timeout: 30000 });
      await page.type('input[name="identifier"]', EMAIL, { delay: 30 });
      await page.type('input[name="password"]', PASSWORD, { delay: 30 });
      console.log('  Credentials typed. SOLVE reCAPTCHA in the browser window, then click "Sign in".');
    } else {
      console.log('  LOGIN MANUALLY in the browser window (solve reCAPTCHA).');
    }

    await waitForLogin(page);
    await saveCookies(page);

    // === NAVIGATE TO UPLOAD ===
    console.log('\n[2/3] Navigating to upload...');
    await page.goto('https://cloudfam.io/upload', { waitUntil: 'networkidle2' });
    console.log('  Current URL:', page.url());

    // Quick sanity check — make sure there's a file input
    const hasInput = await page.$('input[type="file"]');
    if (!hasInput) {
      const html = await page.content();
      fs.writeFileSync(path.join(HOME, 'cf-upload-dump.html'), html);
      throw new Error('No file input on /upload — see cf-upload-dump.html');
    }
    console.log('  ✓ File input found');

    // === UPLOAD IN BATCHES ===
    console.log(`\n[3/3] Uploading ${remaining.length} files in batches of ${BATCH_SIZE}...`);
    const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);
    for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
      const batch = remaining.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`\n  Batch ${batchNum}/${totalBatches}: ${batch.length} files`);

      try {
        await uploadBatch(page, batch);
        const uploadedNow = batch.map(f => ({
          filename: path.basename(f),
          uploaded_at: new Date().toISOString()
        }));
        progress.uploaded.push(...uploadedNow);
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
        console.log(`  ✓ Total uploaded: ${progress.uploaded.length}`);

        if (i + BATCH_SIZE < remaining.length) {
          console.log(`  Pausing ${BATCH_PAUSE_MS / 1000}s...`);
          await sleep(BATCH_PAUSE_MS);
        }
      } catch (e) {
        console.log(`  ✗ Batch failed: ${e.message}`);
        progress.failed.push(...batch.map(f => ({ filename: path.basename(f), error: e.message, at: new Date().toISOString() })));
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      }
    }

    console.log('\n=== UPLOAD COMPLETE ===');
    console.log(`Uploaded: ${progress.uploaded.length}`);
    console.log(`Failed: ${progress.failed.length}`);
    console.log('\nNext steps:');
    console.log('  1. Wait 2-3 minutes for CloudFam to index');
    console.log('  2. node scripts/cf-build-mapping.cjs');
    console.log('  3. node scripts/cf-update-library.cjs');
    console.log('  4. npm run build && firebase deploy --only hosting:app --force');
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
