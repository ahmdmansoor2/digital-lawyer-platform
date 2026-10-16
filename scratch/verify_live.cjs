const https = require('https');

function checkUrl(url, options = {}) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    req.on('error', (e) => resolve({ url, error: e.message }));
    req.end();
  });
}

async function run() {
  console.log('=== الفحص المباشر الحي بعد النشر (Empirical Live Verification) ===');

  // 1. Homepage
  const home = await checkUrl('https://mohamidigital.online/');
  console.log('1. Homepage status:', home.statusCode);
  console.log('   Contains www-mohami-guard?:', home.data ? home.data.includes('www-mohami-guard') : false);
  console.log('   Contains cloaked noscript display:none?:', home.data ? home.data.includes('display:none') && home.data.includes('noscript-fallback') : false);

  // 2. Sitemap.xml
  const sitemap = await checkUrl('https://mohamidigital.online/sitemap.xml');
  console.log('2. sitemap.xml status:', sitemap.statusCode);
  const urlCount = (sitemap.data && sitemap.data.match(/<url>/g) || []).length;
  console.log('   sitemap.xml URLs count:', urlCount);
  console.log('   Contains radar-topics?:', sitemap.data ? sitemap.data.includes('radar-topics') : false);
  console.log('   Contains sitemap.html?:', sitemap.data ? sitemap.data.includes('sitemap.html') : false);

  // 3. 404 Status for missing file
  const notFound = await checkUrl('https://mohamidigital.online/random-non-existent-page-2026.html');
  console.log('3. Non-existent page status:', notFound.statusCode, '(Expected: 404)');

  // 4. Cannibalized 301 Redirect
  const redirectCheck = await checkUrl('https://mohamidigital.online/blog/bounced-check-laws-egypt.html');
  console.log('4. Consolidated article redirect status:', redirectCheck.statusCode, '(Expected: 301)');
  console.log('   Redirect location:', redirectCheck.headers ? redirectCheck.headers.location : 'None');

  // 5. sw.js
  const sw = await checkUrl('https://mohamidigital.online/sw.js');
  console.log('5. sw.js status:', sw.statusCode);
  console.log('   sw.js version 12?:', sw.data ? sw.data.includes('mohami-v12') : false);
  console.log('   sw.js fallback to homepage removed?:', sw.data ? !sw.data.includes("networkFirst(req, '/')") : false);
}

run();
