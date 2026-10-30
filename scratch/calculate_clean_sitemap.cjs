const fs = require('fs');
const path = require('path');

const fbData = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const redirects = fbData.hosting[0].redirects || [];
const redirectMap = new Map();
redirects.forEach(r => redirectMap.set(r.source, r.destination));

const sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

let cleanUrls = [];
let skippedRedirect = 0;
let skippedNoindex = 0;
let skippedCanonical = 0;

for (const u of urls) {
  let p = u.replace('https://mohamidigital.online', '');
  if (!p) p = '/';
  if (redirectMap.has(p) || redirectMap.has(p.replace(/\.html$/, '')) || redirectMap.has(p + '.html')) {
    skippedRedirect++;
    continue;
  }
  let rel = p;
  if (rel === '/' || rel === '') rel = '/index.html';
  if (!rel.endsWith('.html') && !rel.endsWith('/')) rel += '.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const filePath = path.join(__dirname, '..', 'public', rel.replace(/^\//, ''));
  if (fs.existsSync(filePath)) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (/content=["'][^"']*noindex[^"']*["']/i.test(html)) {
      skippedNoindex++;
      continue;
    }
    const cMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (cMatch && cMatch[1]) {
      const can = cMatch[1].trim();
      const normU = u.replace(/\/$/, '');
      const normC = can.replace(/\/$/, '');
      if (normU !== normC) {
        skippedCanonical++;
        continue;
      }
    }
    cleanUrls.push(u);
  }
}

console.log('Original URLs in sitemap:', urls.length);
console.log('Skipped 301 redirects:', skippedRedirect);
console.log('Skipped noindex:', skippedNoindex);
console.log('Skipped non-canonical:', skippedCanonical);
console.log('Pure, clean, 200 OK canonical indexable URLs:', cleanUrls.length);
