#!/usr/bin/env node
/**
 * check-canonicals.cjs — فحص canonical links في كل صفحات HTML
 * ويضيف اللي ناقص تلقائياً
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.resolve(__dirname, '..', '..', 'public');
const BASE_URL = 'https://mohamidigital.online';

let checked = 0, hasCanonical = 0, missing = [];

function checkCanonical(html, filepath) {
  if (html.includes('rel="canonical"')) return true;
  // بعض الـ canonicals فيها مسافات في الـ attribute
  if (/rel\s*=\s*["']canonical["']/i.test(html)) return true;
  return false;
}

function getCanonicalUrl(filepath) {
  let rel = filepath.replace(PUBLIC, '').replace(/\\/g, '/');
  // index.html في blog = /blog/
  if (rel === '/blog/index.html') return `${BASE_URL}/blog/`;
  if (rel === '/pillars/index.html') return `${BASE_URL}/pillars/`;
  return `${BASE_URL}${rel}`;
}

function addCanonical(html, canonicalUrl) {
  if (html.includes('</head>')) {
    return html.replace('</head>', `  <link rel="canonical" href="${canonicalUrl}" />\n  </head>`);
  }
  return html;
}

function processDir(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (['images', 'assets', 'fonts', 'node_modules'].includes(f)) continue;
      processDir(full);
    } else if (f.endsWith('.html') && f !== 'index.html' || (f === 'index.html' && !dir.endsWith('public'))) {
      // skip root index.html (main React app)
      if (full === path.join(PUBLIC, 'index.html')) continue;
      const html = fs.readFileSync(full, 'utf8');
      checked++;
      if (checkCanonical(html, full)) {
        hasCanonical++;
      } else {
        missing.push({ path: full, url: getCanonicalUrl(full) });
      }
    }
  }
}

processDir(PUBLIC);

console.log(`📊 فحص Canonical Links:`);
console.log(`   ✓ عنده canonical: ${hasCanonical}`);
console.log(`   ✗ ناقصه canonical: ${missing.length}`);
if (missing.length > 0) {
  console.log(`\n📝 إضافة canonical للملفات الناقصة...`);
  let added = 0;
  for (const m of missing) {
    let html = fs.readFileSync(m.path, 'utf8');
    html = addCanonical(html, m.url);
    fs.writeFileSync(m.path, html, 'utf8');
    added++;
  }
  console.log(`   ✓ تم إضافة canonical لـ ${added} ملف`);
  console.log('\n⏭️  الخطوة الجاية:');
  console.log('   npm run build && npx firebase deploy --only hosting');
}
