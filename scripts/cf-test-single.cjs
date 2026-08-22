const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== Test single file upload ===');
  const browser = await p.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(pg => pg.url().includes('user.cloudfam.io') || pg.url().includes('cloudfam.io'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://user.cloudfam.io/', { waitUntil: 'networkidle2' });
  } else {
    await page.goto('https://user.cloudfam.io/', { waitUntil: 'networkidle2' });
  }
  await new Promise(r => setTimeout(r, 5000));

  page.on('console', msg => console.log(`  [console.${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`  [pageerror] ${err.message}`));
  page.on('response', resp => {
    const u = resp.url();
    if (u.includes('cloudfam.io') && (u.includes('upload') || u.includes('file'))) {
      console.log(`  [response] ${resp.status()} ${u}`);
    }
  });
  page.on('request', req => {
    const u = req.url();
    if (u.includes('cloudfam.io') && (u.includes('upload') || u.includes('file'))) {
      console.log(`  [request] ${req.method()} ${u}`);
    }
  });

  // Find a test file
  const books = fs.readdirSync('D:\\قانوني 7\\public\\books').filter(f => f.endsWith('.pdf'));
  const testFile = path.join('D:\\قانوني 7\\public\\books', books[0]);
  console.log('Test file:', testFile);
  console.log('Size:', fs.statSync(testFile).size, 'bytes');

  // Find the file input
  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) {
    console.log('!! No file input found');
    await browser.disconnect();
    return;
  }
  console.log('File input found');

  // Upload
  console.log('Uploading...');
  await fileInput.uploadFile(testFile);

  // Wait and observe
  await new Promise(r => setTimeout(r, 30000));

  // Take a screenshot for debugging
  await page.screenshot({ path: 'C:\\Users\\احمد منصور\\cf-after-upload.png', fullPage: true });
  console.log('Screenshot saved');

  // Get state
  const state = await page.evaluate(() => {
    const fileInput = document.querySelector('input[type="file"]');
    return {
      url: location.href,
      fileInputFiles: fileInput ? fileInput.files.length : -1,
      title: document.title,
      bodyTextSample: document.body.innerText.substring(0, 500)
    };
  });
  console.log('State:', JSON.stringify(state, null, 2));

  await browser.disconnect();
  console.log('Done');
})().catch(e => { console.error('FAIL:', e.message); console.error(e.stack); process.exit(1); });
