// check-library-links.cjs — يتفقد روابط المكتبة القانونية
const fs = require('fs');
const https = require('https');

const CATALOG = 'D:\\قانوني 7\\public\\data\\legal-catalog-summary.json';
const SAMPLE_SIZE = 30;

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const items = catalog.items;
console.log('Total items in catalog:', items.length);
console.log('');

const shuffled = items.slice().sort(() => Math.random() - 0.5);
const sample = shuffled.slice(0, SAMPLE_SIZE);

let ok = 0, fail = 0, redirect = 0;
const failures = [];
const startTime = Date.now();
let checked = 0;

function checkUrl(url, redirectsLeft = 3) {
  return new Promise((resolve) => {
    if (redirectsLeft < 0) return resolve({ status: -2, error: 'too many redirects' });
    const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) {
          return checkUrl(loc, redirectsLeft - 1).then(resolve);
        }
      }
      resolve({ status: res.statusCode, finalUrl: url, headers: res.headers });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: -1, error: 'timeout' }); });
    req.end();
  });
}

(async () => {
  for (const item of sample) {
    const url = item.u;
    const result = await checkUrl(url);
    checked++;
    const title = (item.t || '').substring(0, 50);
    const shortUrl = (url || '').substring(0, 70);

    if (!url) {
      fail++;
      failures.push({ title, url: '(null)', status: 'NO_URL', error: 'item has no URL' });
      console.log(`[${checked}/${SAMPLE_SIZE}] NO-URL | ${title}...`);
      continue;
    }

    if (result.status === 200) {
      ok++;
      console.log(`[${checked}/${SAMPLE_SIZE}] OK   | ${title}...`);
    } else if (result.status === 301 || result.status === 302) {
      redirect++;
      console.log(`[${checked}/${SAMPLE_SIZE}] ${result.status} | ${title}... -> ${(result.finalUrl || '').substring(0, 60)}`);
    } else {
      fail++;
      failures.push({ title, url, status: result.status, error: result.error });
      console.log(`[${checked}/${SAMPLE_SIZE}] FAIL(${result.status}) | ${title}...`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('=== Summary ===');
  console.log(`  Sampled: ${SAMPLE_SIZE} of ${items.length} (${(SAMPLE_SIZE / items.length * 100).toFixed(1)}%)`);
  console.log(`  OK: ${ok} (${(ok / SAMPLE_SIZE * 100).toFixed(1)}%)`);
  console.log(`  Redirect: ${redirect}`);
  console.log(`  Failed: ${fail} (${(fail / SAMPLE_SIZE * 100).toFixed(1)}%)`);
  console.log(`  Time: ${elapsed}s`);
  console.log('');

  if (failures.length > 0) {
    console.log('=== Sample failures ===');
    failures.slice(0, 5).forEach(f => {
      console.log(`  [${f.status}] ${f.title}`);
      console.log(`       ${f.url.substring(0, 90)}`);
    });
  }

  // Extrapolation
  const failRate = fail / SAMPLE_SIZE;
  const extrapolated = Math.round(items.length * failRate);
  console.log('');
  console.log(`=== Extrapolation ===`);
  console.log(`  Expected broken links: ~${extrapolated} of ${items.length} (${(failRate * 100).toFixed(1)}%)`);
})();
