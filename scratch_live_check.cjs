'use strict';
const https = require('https');

function fetchFull(url, ua) {
  return new Promise(function(resolve) {
    const req = https.get(url, {
      headers: {
        'User-Agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }, function(res) {
      let data = '';
      res.on('data', function(c) { if (data.length < 5000) data += c; });
      res.on('end', function() {
        resolve({
          url: url,
          status: res.statusCode,
          headers: res.headers,
          bodyStart: data.slice(0, 500)
        });
      });
    });
    req.on('error', function(e) { resolve({ url: url, status: 'ERROR', error: e.message }); });
    req.setTimeout(10000, function() { req.destroy(); resolve({ url: url, status: 'TIMEOUT' }); });
  });
}

const URLS = [
  'https://mohamidigital.online/',
  'https://mohamidigital.online/index.html',
  'https://mohamidigital.online/blog/',
  'https://mohamidigital.online/about.html',
  'https://mohamidigital.online/lawyers-directory.html',
  'https://mohamidigital.online/legal-radar.html',
  'https://mohamidigital.online/sitemap.xml',
  'https://mohamidigital.online/robots.txt',
];

(async function() {
  console.log('=== Live HTTP Check — ' + new Date().toISOString() + ' ===\n');
  for (var i = 0; i < URLS.length; i++) {
    var r = await fetchFull(URLS[i]);
    var status = r.status;
    var icon = status === 200 ? '✅' : status === 301 ? '↪️' : status === 404 ? '❌' : '⚠️';
    console.log(icon + ' ' + status + ' | ' + r.url);
    if (r.headers && r.headers['x-firebase-hosting-response']) {
      console.log('   Firebase: ' + r.headers['x-firebase-hosting-response']);
    }
    if (status !== 200 && r.bodyStart) {
      console.log('   Body: ' + r.bodyStart.slice(0, 150));
    }
  }
  console.log('\n=== Server Headers for / ===');
  var home = await fetchFull('https://mohamidigital.online/');
  console.log('Status: ' + home.status);
  var h = home.headers;
  console.log('Server:', h['server'] || 'N/A');
  console.log('Cache-Control:', h['cache-control'] || 'N/A');
  console.log('x-cache:', h['x-cache'] || 'N/A');
  console.log('cf-cache-status:', h['cf-cache-status'] || 'N/A');
  console.log('Body start: ' + home.bodyStart.slice(0, 200));
})();
