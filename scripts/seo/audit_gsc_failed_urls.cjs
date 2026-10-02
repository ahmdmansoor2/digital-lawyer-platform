'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const urls = [
  'https://mohamidigital.online/pillars/',
  'https://mohamidigital.online/economic-hub.html',
  'https://mohamidigital.online/legal-calculators.html',
  'https://mohamidigital.online/contract-generator.html',
  'https://mohamidigital.online/news-sitemap.xml',
  'https://mohamidigital.online/appeal-deadlines.html',
  'https://mohamidigital.online/calculate-alimony.html',
  'https://mohamidigital.online/real-estate-registration-fees.html',
  'https://mohamidigital.online/uae-legal-hub.html',
  'https://mohamidigital.online/qatar-legal-hub.html',
  'https://mohamidigital.online/saudi-legal-hub.html',
  'https://mohamidigital.online/pillars/law-firm-management-in-egypt.html',
  'https://mohamidigital.online/company-incorporation.html',
  'https://mohamidigital.online/legal-diagnostics.html',
  'https://mohamidigital.online/courts-directory.html',
  'https://mohamidigital.online/court-precedents.html',
  'https://mohamidigital.online/search.html',
  'https://mohamidigital.online/pillars/legal-contract-drafting-egypt.html',
  'https://mohamidigital.online/legal-library.html',
  'https://mohamidigital.online/pillars/egyptian-labor-law-2026-comprehensive-guide.html',
  'https://mohamidigital.online/pillars/personal-status-law-egypt-comprehensive-guide.html',
  'https://mohamidigital.online/law-students-hub.html'
];

function checkLocalFile(urlPath) {
  let rel = urlPath.replace('https://mohamidigital.online', '');
  if (rel.endsWith('/')) rel += 'index.html';
  if (rel.startsWith('/')) rel = rel.slice(1);
  
  const inDist = fs.existsSync(path.join('dist', rel));
  const inPublic = fs.existsSync(path.join('public', rel));
  return { rel, inDist, inPublic };
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { if (data.length < 50000) data += chunk; });
      res.on('end', () => {
        const canonicalMatch = data.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
        const robotsMatch = data.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
        const titleMatch = data.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        resolve({
          url,
          statusCode: res.statusCode,
          location: res.headers.location || null,
          contentLength: data.length,
          title: titleMatch ? titleMatch[1].trim() : 'NO_TITLE',
          canonical: canonicalMatch ? canonicalMatch[1] : 'NO_CANONICAL',
          robots: robotsMatch ? robotsMatch[1] : 'NO_ROBOTS',
          isSoft404: data.includes('404') && (data.includes('غير موجودة') || data.includes('Page Not Found'))
        });
      });
    });
    req.on('error', (err) => resolve({ url, statusCode: 'ERROR', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ url, statusCode: 'TIMEOUT' }); });
  });
}

(async () => {
  console.log('=== Checking 22 Failed GSC Validation URLs ===\n');
  
  for (const url of urls) {
    const local = checkLocalFile(url);
    const remote = await fetchUrl(url);
    
    console.log(`URL: ${url}`);
    console.log(`  Local dist: ${local.inDist ? 'EXISTS' : 'MISSING (' + local.rel + ')'} | public: ${local.inPublic ? 'EXISTS' : 'MISSING'}`);
    console.log(`  Remote HTTP: ${remote.statusCode} | Length: ${remote.contentLength} bytes`);
    if (remote.location) console.log(`  Redirect Location: ${remote.location}`);
    if (remote.title) console.log(`  Title: ${remote.title}`);
    if (remote.canonical) console.log(`  Canonical: ${remote.canonical}`);
    if (remote.robots) console.log(`  Robots: ${remote.robots}`);
    if (remote.isSoft404) console.log(`  ⚠️ WARNING: POSSIBLE SOFT 404 DETECTED!`);
    console.log('--------------------------------------------------');
  }
})();
