/**
 * fix-all-site.cjs
 * 1. Comfortable cinematic background (header.css already updated via replace_file_content)
 * 2. Inject AdSense loader + 2 ad units into every blog page missing them
 * 3. Generate fresh sitemap.xml with ALL 289 pages
 */

const fs = require('fs');
const path = require('path');

const ROOT   = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST   = path.join(ROOT, 'dist');

const PUB_ID  = 'ca-pub-7725405859334364';
const DOMAIN  = 'https://mohamidigital.online';

// ── AdSense script tag ──────────────────────────────────────────────────────
const ADSENSE_SCRIPT = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB_ID}" crossorigin="anonymous"></script>`;

// ── Auto-relaxed display ad (responsive, auto) ────────────────────────────
const AD_UNIT_TOP = `
<!-- AdSense — وحدة علوية بعد العنوان -->
<ins class="adsbygoogle"
     style="display:block;margin:18px auto 10px;text-align:center;"
     data-ad-client="${PUB_ID}"
     data-ad-slot="auto"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`;

const AD_UNIT_BOTTOM = `
<!-- AdSense — وحدة سفلية قبل الفوتر -->
<ins class="adsbygoogle"
     style="display:block;margin:20px auto 10px;text-align:center;"
     data-ad-client="${PUB_ID}"
     data-ad-slot="auto"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`;

// ── 1. Inject AdSense in blog pages missing the loader ─────────────────────
const blogDir = path.join(PUBLIC, 'blog');
let adsInjected = 0;
const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));

for (const file of blogFiles) {
  const fp = path.join(blogDir, file);
  let html = fs.readFileSync(fp, 'utf8');

  if (html.includes('adsbygoogle')) continue; // already has AdSense

  // Inject script into <head> before </head>
  html = html.replace('</head>', `  ${ADSENSE_SCRIPT}\n</head>`);

  // Inject top ad: after the first <article> or after <body> + 1 h1
  if (html.includes('<article')) {
    html = html.replace(/<article([^>]*)>/, `<article$1>${AD_UNIT_TOP}`);
  } else {
    // fallback: after opening h1
    html = html.replace(/(<h1[^>]*>.*?<\/h1>)/s, `$1${AD_UNIT_TOP}`);
  }

  // Inject bottom ad: before </footer> or before </body>
  if (html.includes('</footer>')) {
    html = html.replace('</footer>', `${AD_UNIT_BOTTOM}\n</footer>`);
  } else {
    html = html.replace('</body>', `${AD_UNIT_BOTTOM}\n</body>`);
  }

  fs.writeFileSync(fp, html, 'utf8');
  adsInjected++;
}

console.log(`✅ AdSense injected into ${adsInjected} blog pages`);

// ── 2. Generate full sitemap.xml ───────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10);

function collectHtmlFiles(dir, baseUrl, excludes = []) {
  const urls = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['data', 'books', 'images', 'fonts'].includes(e.name)) continue;
      urls.push(...collectHtmlFiles(full, `${baseUrl}/${e.name}`, excludes));
    } else if (e.name.endsWith('.html')) {
      if (excludes.some(ex => full.includes(ex))) continue;
      const rel = e.name === 'index.html' ? '/' : `/${e.name}`;
      const urlPath = baseUrl.includes('/public') ? rel : `${baseUrl}/${e.name}`;
      urls.push(urlPath.replace('/public', ''));
    }
  }
  return urls;
}

// Root index
const sitemapUrls = [`${DOMAIN}/`];

// Main public pages (non-blog, non-data)
const mainFiles = fs.readdirSync(PUBLIC).filter(f => f.endsWith('.html') && f !== 'index.html');
for (const f of mainFiles) {
  const skip = ['googlec03a96f', 'pillars'].some(s => f.includes(s));
  if (!skip) sitemapUrls.push(`${DOMAIN}/${f}`);
}

// Pillars index
if (fs.existsSync(path.join(PUBLIC, 'pillars', 'index.html'))) {
  sitemapUrls.push(`${DOMAIN}/pillars/`);
}

// Blog index
if (fs.existsSync(path.join(PUBLIC, 'blog', 'index.html'))) {
  sitemapUrls.push(`${DOMAIN}/blog/`);
}

// All blog articles
for (const f of blogFiles) {
  if (f !== 'index.html') {
    sitemapUrls.push(`${DOMAIN}/blog/${f}`);
  }
}

// Build XML
const urlEntries = sitemapUrls.map(url => {
  const priority = url === `${DOMAIN}/` ? '1.0'
    : url.includes('/blog/') ? '0.80'
    : '0.90';
  const freq = url.includes('/blog/') ? 'weekly' : 'monthly';
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
</urlset>`;

const sitemapPath = path.join(PUBLIC, 'sitemap.xml');
fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
console.log(`✅ sitemap.xml generated: ${sitemapUrls.length} URLs`);

// Copy to dist if it exists
const distSitemap = path.join(DIST, 'sitemap.xml');
if (fs.existsSync(DIST)) {
  fs.writeFileSync(distSitemap, sitemapXml, 'utf8');
  console.log(`✅ sitemap.xml copied to dist/`);
}

console.log('\n🎉 All tasks completed successfully!');
console.log(`   ✔ AdSense injected in ${adsInjected} blog pages`);
console.log(`   ✔ sitemap.xml with ${sitemapUrls.length} URLs`);
