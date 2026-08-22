const p = require('puppeteer-core');
const https = require('https');

const API_KEY = '78716f75d7a9de417a797babd9bfc064d99a4d5e92d24d3be2f676517c22f061';

function apiCall(pathname) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://cloudfam.io' + pathname);
    const req = https.get({
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { 'X-API-Key': API_KEY, 'User-Agent': 'Mavis-Check/1.0' },
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

async function getFiles() {
  let all = [];
  for (let p = 1; p <= 30; p++) {
    const r = await apiCall(`/api/v3/files?limit=200&page=${p}`);
    if (!r.success) break;
    const items = r.data || [];
    if (items.length === 0) break;
    all.push(...items);
    if (items.length < 200) break;
  }
  return all;
}

(async () => {
  console.log('=== Storage truth check ===');
  const browser = await p.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(pg => pg.url().includes('user.cloudfam.io'));
  if (page) {
    const profile = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/(\d+(?:\.\d+)?)\s*(?:MB|GB)\s*used/);
      const matchPercent = text.match(/(\d+)%/);
      return { storage: match ? match[0] : null, percent: matchPercent ? matchPercent[0] : null };
    });
    console.log('CloudFam UI says:', profile);
  }
  await browser.disconnect();

  console.log('\n=== V3 API ===');
  const files = await getFiles();
  const totalSize = files.reduce((s, f) => s + f.file_size_bytes, 0);
  console.log(`Files: ${files.length}, Size: ${(totalSize/1024/1024).toFixed(2)} MB`);

  // Distinct sizes
  const distinct = [...new Set(files.map(f => f.file_size_bytes))].length;
  console.log(`Distinct sizes: ${distinct}`);

  // Check if there are files with very common test sizes
  const testFiles = files.filter(f => f.original_filename && f.original_filename.startsWith('file_'));
  console.log(`Browser-renamed test files: ${testFiles.length}`);
})();
