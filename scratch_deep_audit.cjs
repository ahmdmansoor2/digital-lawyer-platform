'use strict';
const https = require('https');
const fs = require('fs');

function fetch(url, ua) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0' }
    }, (res) => {
      let data = '';
      res.on('data', c => { if (data.length < 300000) data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', e => resolve({ status: 'ERROR', error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

(async () => {
  // Check homepage with normal UA
  const r = await fetch('https://mohamidigital.online/', 'Googlebot/2.1');
  console.log('=== Homepage Analysis ===');
  console.log('HTTP Status:', r.status);

  if (r.body) {
    const title = (r.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
    const canonical = (r.body.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i) || [])[1];
    const robots = (r.body.match(/<meta[^>]*name="robots"[^>]*content="([^"]+)"/i) || [])[1];
    const h1s = (r.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || []).map(h => h.replace(/<[^>]+>/g, '').trim());
    const desc = (r.body.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) || [])[1];
    const schemas = (r.body.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || []);
    const hasReactRoot = r.body.includes('id="root"');
    const links = (r.body.match(/href="([^"]+)"/gi) || []);
    const internalLinks = links.filter(l => l.includes('mohamidigital') || l.match(/href="\//));
    const textContent = r.body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const noscript = (r.body.match(/<noscript>/gi) || []).length;

    console.log('Title:', title ? title.trim().slice(0, 80) : 'MISSING');
    console.log('Canonical:', canonical || 'MISSING');
    console.log('Robots:', robots || 'NONE');
    console.log('H1s:', h1s.slice(0, 3));
    console.log('Meta Desc length:', desc ? desc.length : 'MISSING');
    console.log('Schema blocks:', schemas.length);
    console.log('React SPA root div:', hasReactRoot);
    console.log('Links total:', links.length, '| Internal:', internalLinks.length);
    console.log('Visible text length (chars):', textContent.length);
    console.log('Body size (bytes):', r.body.length);
    console.log('noscript count:', noscript);

    // Try parse schemas
    schemas.forEach((s, i) => {
      try {
        const json = JSON.parse(s.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, ''));
        const type = Array.isArray(json) ? json.map(x => x['@type']).join(', ') : json['@type'];
        console.log('Schema[' + i + ']:', type);
      } catch (e) {
        console.log('Schema[' + i + ']: PARSE ERROR');
      }
    });

    // Check for Cloaking — compare Googlebot response vs normal UA
    const r2 = await fetch('https://mohamidigital.online/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0');
    console.log('\n=== Cloaking Check ===');
    const diff = Math.abs(r.body.length - r2.body.length);
    console.log('Googlebot body size:', r.body.length);
    console.log('Normal UA body size:', r2.body.length);
    console.log('Size difference:', diff, diff > 10000 ? '<< POSSIBLE CLOAKING!' : '(normal)');
  }

  // News sitemap
  const ns = await fetch('https://mohamidigital.online/news-sitemap.xml');
  console.log('\n=== News Sitemap ===');
  console.log('Status:', ns.status);
  if (ns.body) {
    const newsUrls = (ns.body.match(/<loc>/g) || []).length;
    const dates = (ns.body.match(/<publication_date>([^<]+)<\/publication_date>/g) || []).map(d => d.replace(/<[^>]+>/g, ''));
    console.log('URLs in news sitemap:', newsUrls);
    console.log('Sample dates:', dates.slice(0, 5));
    if (newsUrls === 0) console.log('WARNING: News sitemap is EMPTY!');
  }

  // Check HTTP -> HTTPS redirect
  const http = require('http');
  console.log('\n=== HTTP -> HTTPS Check ===');
  const r3 = await new Promise((resolve) => {
    http.get('http://mohamidigital.online/', { headers: { 'User-Agent': 'Googlebot' } }, (res) => {
      resolve({ status: res.statusCode, location: res.headers.location });
    }).on('error', e => resolve({ status: 'ERROR', error: e.message }));
  });
  console.log('HTTP status:', r3.status, '| Redirects to:', r3.location || 'NONE');

  // Check blog index - is it static or rendered?
  const blog = await fetch('https://mohamidigital.online/blog/');
  console.log('\n=== Blog Index ===');
  console.log('Size:', blog.body ? blog.body.length : 'N/A', 'bytes');
  if (blog.body) {
    const articleLinks = (blog.body.match(/href="\/blog\/[a-z0-9-]+\.html"/gi) || []).length;
    const h1 = (blog.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
    console.log('Article links in blog index:', articleLinks);
    console.log('Blog H1:', h1 ? h1.replace(/<[^>]+>/g, '').trim() : 'MISSING');
  }
})();
