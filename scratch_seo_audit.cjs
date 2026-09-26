'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

function fetch(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36' }
    }, (res) => {
      let data = '';
      res.on('data', c => { if (data.length < 300000) data += c; });
      res.on('end', () => resolve({ url, status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', e => resolve({ url, status: 'ERROR', error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ url, status: 'TIMEOUT' }); });
  });
}

function extract(html, regex) {
  const m = html.match(regex);
  return m ? m[1].trim() : null;
}

function checkPage(url, body) {
  const issues = [];
  const title = extract(body, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = extract(body, /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const canonical = extract(body, /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const robots = extract(body, /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  const h1s = (body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || []).map(h => h.replace(/<[^>]+>/g, '').trim());
  const schema = (body.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []);
  const ogTitle = extract(body, /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const ogDesc = extract(body, /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const ogImage = extract(body, /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  const lang = extract(body, /<html[^>]*lang=["']([^"']+)["']/i);

  // Title checks
  if (!title) issues.push({ sev: 'CRITICAL', msg: 'No title tag' });
  else if (title.length < 30) issues.push({ sev: 'HIGH', msg: `Title too short (${title.length} chars): "${title}"` });
  else if (title.length > 65) issues.push({ sev: 'MEDIUM', msg: `Title too long (${title.length} chars): "${title.slice(0,60)}..."` });
  if (title && title.includes('| |')) issues.push({ sev: 'CRITICAL', msg: 'Empty separator in title: "| |"' });

  // H1 checks
  if (h1s.length === 0) issues.push({ sev: 'HIGH', msg: 'No H1 tag found' });
  if (h1s.length > 1) issues.push({ sev: 'MEDIUM', msg: `Multiple H1 tags (${h1s.length}): ${h1s.slice(0,2).join(' | ')}` });

  // Description
  if (!desc) issues.push({ sev: 'MEDIUM', msg: 'No meta description' });
  else if (desc.length < 100) issues.push({ sev: 'LOW', msg: `Meta desc too short (${desc.length} chars)` });
  else if (desc.length > 165) issues.push({ sev: 'LOW', msg: `Meta desc too long (${desc.length} chars)` });

  // Canonical
  if (!canonical) issues.push({ sev: 'MEDIUM', msg: 'No canonical tag' });
  else if (canonical !== url && !canonical.endsWith('/') && url.endsWith('/')) {
    // minor trailing slash
  } else if (canonical !== url && canonical !== url.replace(/\/$/, '') && !url.endsWith(canonical.split('mohamidigital.online')[1]||'')) {
    issues.push({ sev: 'HIGH', msg: `Canonical mismatch: canonical="${canonical}" vs url="${url}"` });
  }

  // Robots
  if (robots && (robots.includes('noindex') || robots.includes('none'))) {
    issues.push({ sev: 'CRITICAL', msg: `Page is noindex! robots="${robots}"` });
  }

  // Schema
  if (schema.length === 0) issues.push({ sev: 'LOW', msg: 'No JSON-LD structured data found' });

  // OG tags
  if (!ogTitle) issues.push({ sev: 'LOW', msg: 'No og:title' });
  if (!ogImage) issues.push({ sev: 'LOW', msg: 'No og:image' });

  // Content length check
  const textContent = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (textContent.length < 500) issues.push({ sev: 'HIGH', msg: `Very little content (${textContent.length} chars)` });

  return { title, desc, canonical, robots, h1s, schema: schema.length, ogTitle, ogImage, lang, issues };
}

const PAGES_TO_AUDIT = [
  'https://mohamidigital.online/',
  'https://mohamidigital.online/blog/',
  'https://mohamidigital.online/about.html',
  'https://mohamidigital.online/features.html',
  'https://mohamidigital.online/lawyers-directory.html',
  'https://mohamidigital.online/legal-library.html',
  'https://mohamidigital.online/calculate-inheritance.html',
  'https://mohamidigital.online/real-estate.html',
  'https://mohamidigital.online/legal-radar.html',
  'https://mohamidigital.online/pillars/egyptian-civil-code-ultimate-guide.html',
  'https://mohamidigital.online/blog/alimony-calculation-egypt.html',
  'https://mohamidigital.online/blog/bounced-check-laws-egypt.html',
  'https://mohamidigital.online/courts/assiut-primary-appeal-court.html',
  'https://mohamidigital.online/courts-directory.html',
  'https://mohamidigital.online/legal-forms.html',
  'https://mohamidigital.online/contact.html',
  'https://mohamidigital.online/sitemap.html',
];

(async () => {
  const results = {};
  for (const url of PAGES_TO_AUDIT) {
    process.stdout.write('Auditing: ' + url + '\n');
    const r = await fetch(url);
    if (r.status === 200 && r.body) {
      results[url] = checkPage(url, r.body);
      results[url].httpStatus = r.status;
      results[url].contentLength = r.body.length;
      results[url].ttfb = null; // cannot measure from node easily
    } else {
      results[url] = { httpStatus: r.status, issues: [{ sev: 'CRITICAL', msg: 'Non-200 response: ' + r.status }] };
    }
    await new Promise(res => setTimeout(res, 500));
  }
  fs.writeFileSync('scratch_seo_pages.json', JSON.stringify(results, null, 2));
  console.log('\nDone. Results saved to scratch_seo_pages.json');
})();
