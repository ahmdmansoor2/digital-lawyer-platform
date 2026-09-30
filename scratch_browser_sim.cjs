'use strict';
const https = require('https');

// Simulate what a browser sees step by step
function fetchWithRedirects(url, maxRedirects) {
  maxRedirects = maxRedirects || 5;
  return new Promise(function(resolve) {
    var visited = [];
    
    function doFetch(currentUrl) {
      visited.push(currentUrl);
      var req = https.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      }, function(res) {
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location && visited.length < maxRedirects) {
          res.destroy();
          doFetch(res.headers.location);
        } else {
          let body = '';
          res.on('data', function(c) { if (body.length < 3000) body += c; });
          res.on('end', function() {
            resolve({ chain: visited, finalStatus: res.statusCode, headers: res.headers, bodyStart: body.slice(0, 400) });
          });
        }
      });
      req.on('error', function(e) { resolve({ chain: visited, finalStatus: 'ERROR', error: e.message }); });
      req.setTimeout(10000, function() { req.destroy(); resolve({ chain: visited, finalStatus: 'TIMEOUT' }); });
    }
    
    doFetch(url);
  });
}

(async function() {
  console.log('=== Browser Simulation — ' + new Date().toISOString() + ' ===\n');
  
  var urls = [
    'https://mohamidigital.online/',
    'https://mohamidigital.online',
    'https://mohamidigital.online/index.html',
    'https://www.mohamidigital.online/',
    'https://mohamidigital.online/blog/',
    'https://mohamidigital.online/about.html',
  ];

  for (var i = 0; i < urls.length; i++) {
    var r = await fetchWithRedirects(urls[i]);
    var icon = r.finalStatus === 200 ? '✅' : r.finalStatus === 404 ? '❌ 404' : '⚠️';
    console.log(icon + ' Final: ' + r.finalStatus + ' | ' + urls[i]);
    if (r.chain.length > 1) console.log('   Redirect chain: ' + r.chain.join(' → '));
    if (r.finalStatus === 404) {
      console.log('   404 BODY: ' + r.bodyStart.slice(0, 200));
    }
    if (r.headers) {
      var cacheCtrl = r.headers['cache-control'];
      var xCache = r.headers['x-cache'];
      var server = r.headers['server'];
      if (cacheCtrl) console.log('   Cache-Control: ' + cacheCtrl);
      if (xCache) console.log('   x-cache: ' + xCache);
      if (server) console.log('   Server: ' + server);
    }
  }

  // Check the 404.html page in dist
  const fs = require('fs');
  console.log('\n=== 404.html in dist ===');
  if (fs.existsSync('dist/404.html')) {
    const notFound = fs.readFileSync('dist/404.html', 'utf8');
    const text = notFound.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log('dist/404.html size: ' + notFound.length + ' bytes');
    console.log('Text sample: ' + text.slice(0, 300));
  } else {
    console.log('dist/404.html NOT FOUND');
  }
  
  // Check firebase.json 404 config
  const fbJson = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
  const hosting = Array.isArray(fbJson.hosting) ? fbJson.hosting[0] : fbJson.hosting;
  console.log('\n=== Firebase 404 config ===');
  console.log('Custom 404:', hosting['trailingSlash'] || 'N/A');
  console.log('Rewrites count:', (hosting.rewrites || []).length);
  // Check if there is a catch-all rewrite to index.html
  var rewrites = hosting.rewrites || [];
  var catchAll = rewrites.filter(function(r) { return r.source === '/**' || r.source === '/index.html'; });
  console.log('Catch-all rewrites:', JSON.stringify(catchAll));
})();
