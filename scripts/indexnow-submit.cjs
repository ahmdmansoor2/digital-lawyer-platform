#!/usr/bin/env node
/**
 * IndexNow API — Submit URLs to Bing, Yandex, Seznam, Naver
 *
 * Usage:
 *   set BING_INDEXNOW_KEY=your_key_here
 *   node scripts/indexnow-submit.cjs
 *
 * Reads URLs from public/sitemap.xml
 * Submits in chunks of 10,000 (IndexNow limit)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SITEMAP = path.join(PROJECT_ROOT, 'public', 'sitemap.xml');
const KEY = process.env.BING_INDEXNOW_KEY;

if (!KEY) {
  console.error('!! BING_INDEXNOW_KEY env var is required.');
  console.error('   Get a key from: https://www.bing.com/webmasters → Settings → API Access');
  process.exit(1);
}

function parseSitemap(xml) {
  // Simple regex parser — good enough for well-formed sitemap
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000
    }, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch (e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Timeout')));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== IndexNow URL Submitter ===');

  if (!fs.existsSync(SITEMAP)) {
    console.error(`!! Sitemap not found: ${SITEMAP}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const allUrls = parseSitemap(xml);
  console.log(`Found ${allUrls.length} URLs in sitemap`);

  // IndexNow allows up to 10,000 URLs per request
  const CHUNK_SIZE = 10000;
  const host = new URL(allUrls[0]).hostname;
  console.log(`Host: ${host}`);

  const chunks = [];
  for (let i = 0; i < allUrls.length; i += CHUNK_SIZE) {
    chunks.push(allUrls.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Will submit in ${chunks.length} batch(es) of up to ${CHUNK_SIZE} URLs each\n`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Submitting batch ${i + 1}/${chunks.length} (${chunk.length} URLs)...`);

    const payload = {
      host,
      key: KEY,
      urlList: chunk
    };

    try {
      const r = await postJson('https://api.indexnow.org/IndexNow', payload);
      console.log(`  Status: ${r.status}`);
      console.log(`  Response:`, JSON.stringify(r.body).substring(0, 200));

      if (r.status === 200) {
        console.log('  ✓ All URLs submitted successfully');
      } else if (r.status === 202) {
        console.log('  ✓ URLs received, will be processed');
      } else {
        console.log(`  ! Unexpected status: ${r.status}`);
      }
    } catch (e) {
      console.log(`  ✗ Error: ${e.message}`);
    }
  }

  console.log('\n=== DONE ===');
  console.log('Submitted to: Bing, Yandex, Seznam, Naver');
  console.log('Note: Google does NOT participate in IndexNow.');
  console.log('For Google indexing, use Google Search Console URL Inspection.');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
