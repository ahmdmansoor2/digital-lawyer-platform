'use strict';
const fs = require('fs');

// Check index.html (React SPA entry point)
const indexHtml = fs.readFileSync('index.html', 'utf8');

function ext(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

const title = ext(indexHtml, /<title[^>]*>([\s\S]*?)<\/title>/i);
const desc = ext(indexHtml, /<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
const canonical = ext(indexHtml, /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i);
const robots = ext(indexHtml, /<meta[^>]*name="robots"[^>]*content="([^"]+)"/i);
const schema = (indexHtml.match(/<script[^>]*type="application\/ld\+json"[^>]*>/gi) || []).length;
const ogTitle = ext(indexHtml, /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
const ogImage = ext(indexHtml, /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
const h1s = (indexHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || []);
const noscript = ext(indexHtml, /<noscript>([\s\S]*?)<\/noscript>/i);
const reactRoot = indexHtml.includes('id="root"');

console.log('=== index.html (SPA root) Analysis ===');
console.log('File size: ' + indexHtml.length + ' bytes');
console.log('Title: ' + (title ? title.trim() : 'MISSING'));
console.log('Description: ' + (desc ? desc.slice(0, 100) : 'MISSING'));
console.log('Canonical: ' + (canonical || 'MISSING'));
console.log('Robots: ' + (robots || 'MISSING'));
console.log('Schema blocks: ' + schema);
console.log('OG Title: ' + (ogTitle ? ogTitle.slice(0, 60) : 'MISSING'));
console.log('OG Image: ' + (ogImage || 'MISSING'));
console.log('H1 in static HTML: ' + h1s.length);
console.log('React root div: ' + reactRoot);
console.log('noscript content: ' + (noscript ? noscript.slice(0, 200) : 'NONE'));

// Check public folder structure
const publicFiles = fs.readdirSync('public');
console.log('\n=== public/ root files ===');
console.log('Total HTML: ' + publicFiles.filter(function(f) { return f.endsWith('.html'); }).length);
console.log('Has favicon: ' + (publicFiles.includes('favicon.ico') || publicFiles.includes('favicon.png')));
console.log('Has robots.txt: ' + publicFiles.includes('robots.txt'));
console.log('Has sitemap.xml: ' + publicFiles.includes('sitemap.xml'));
console.log('Has news-sitemap.xml: ' + publicFiles.includes('news-sitemap.xml'));

// Check news-sitemap.xml
if (fs.existsSync('public/news-sitemap.xml')) {
  const newsSitemap = fs.readFileSync('public/news-sitemap.xml', 'utf8');
  const newsUrls = (newsSitemap.match(/<loc>/g) || []).length;
  const dates = (newsSitemap.match(/<publication_date>([^<]+)<\/publication_date>/g) || []).map(function(d) { return d.replace(/<[^>]+>/g, ''); });
  console.log('\n=== news-sitemap.xml ===');
  console.log('URLs: ' + newsUrls);
  console.log('Sample dates: ' + dates.slice(0, 5).join(', '));
  if (newsUrls === 0) console.log('WARNING: News sitemap is EMPTY - Google News cannot see your content!');
}

// Check dist/index.html
console.log('\n=== dist/index.html ===');
if (fs.existsSync('dist/index.html')) {
  const distHtml = fs.readFileSync('dist/index.html', 'utf8');
  console.log('File size: ' + distHtml.length + ' bytes');
  const distTitle = ext(distHtml, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const distRobots = ext(distHtml, /<meta[^>]*name="robots"[^>]*content="([^"]+)"/i);
  const distReactRoot = distHtml.includes('id="root"');
  const distTextContent = distHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  console.log('dist Title: ' + (distTitle ? distTitle.trim() : 'MISSING'));
  console.log('dist Robots: ' + (distRobots || 'MISSING'));
  console.log('dist React root: ' + distReactRoot);
  console.log('dist Text content: ' + distTextContent + ' chars');
} else {
  console.log('dist/index.html NOT FOUND');
}

// firebase.json hosting config
console.log('\n=== firebase.json hosting config ===');
const fbJson = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const hosting = Array.isArray(fbJson.hosting) ? fbJson.hosting[0] : fbJson.hosting;
console.log('Public dir: ' + hosting.public);
console.log('Redirects count: ' + (hosting.redirects || []).length);
console.log('Rewrites count: ' + (hosting.rewrites || []).length);

// Count blog articles
const blogFiles = fs.readdirSync('public/blog').filter(function(f) { return f.endsWith('.html') && f !== 'index.html'; });
console.log('\n=== Content Stats ===');
console.log('Blog articles: ' + blogFiles.length);
const pillarFiles = fs.existsSync('public/pillars') ? fs.readdirSync('public/pillars').filter(function(f) { return f.endsWith('.html') && f !== 'index.html'; }).length : 0;
console.log('Pillar pages: ' + pillarFiles);
const courtFiles = fs.existsSync('public/courts') ? fs.readdirSync('public/courts').filter(function(f) { return f.endsWith('.html'); }).length : 0;
console.log('Court pages: ' + courtFiles);
const radarFiles = fs.existsSync('public/radar-topics') ? fs.readdirSync('public/radar-topics').filter(function(f) { return f.endsWith('.html'); }).length : 0;
console.log('Radar topics: ' + radarFiles);
