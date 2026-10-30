const fs = require('fs');
const path = require('path');

const sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

let noindexList = [];
let canonicalMismatchList = [];

for (const u of urls) {
  let rel = u.replace('https://mohamidigital.online', '');
  if (rel === '' || rel === '/') rel = '/index.html';
  if (!rel.endsWith('.html') && !rel.endsWith('/')) rel += '.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const filePath = path.join(__dirname, '..', 'public', rel.replace(/^\//, ''));
  if (fs.existsSync(filePath)) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (/content=["'][^"']*noindex[^"']*["']/i.test(html)) {
      noindexList.push({ url: u, filePath });
    }
    const cMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (cMatch && cMatch[1]) {
      const can = cMatch[1].trim();
      const normU = u.replace(/\/$/, '');
      const normC = can.replace(/\/$/, '');
      if (normU !== normC) {
        canonicalMismatchList.push({ url: u, canonical: can });
      }
    }
  }
}

console.log('URLs in sitemap with noindex:', noindexList.length);
noindexList.forEach(n => console.log('  noindex:', n.url));

console.log('URLs in sitemap with canonical pointing elsewhere:', canonicalMismatchList.length);
canonicalMismatchList.slice(0, 10).forEach(c => console.log('  mismatch:', c.url, '-> canonical:', c.canonical));
