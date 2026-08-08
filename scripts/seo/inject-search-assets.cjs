#!/usr/bin/env node
/**
 * inject-search-assets.cjs — حقن search.js + search.css في كل صفحات HTML
 *
 * يضيف قبل </head>:
 *   <link rel="stylesheet" href="/search.css" />
 *
 * يضيف قبل </body>:
 *   <script src="/search.js" defer></script>
 *
 * يتجنب الحقن لو الـ tag موجود بالفعل
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

const CSS_LINK = '  <link rel="stylesheet" href="/search.css" />';
const JS_TAG = '  <script src="/search.js" defer></script>';

const SKIP_FILES = new Set([
  'search.html', // already has them
  'googlec03a96f2162c19b9.html',
]);

function processFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);
  if (SKIP_FILES.has(filename)) return false;
  let changed = false;

  // حقن CSS قبل </head>
  if (!html.includes('href="/search.css"')) {
    if (html.match(/<\/head>/i)) {
      html = html.replace(/<\/head>/i, CSS_LINK + '\n</head>');
      changed = true;
    }
  }

  // حقن JS قبل </body>
  if (!html.includes('src="/search.js"')) {
    if (html.match(/<\/body>/i)) {
      html = html.replace(/<\/body>/i, JS_TAG + '\n</body>');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, html, 'utf8');
  }
  return changed;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  const results = [];
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isFile() && f.endsWith('.html')) {
      results.push(full);
    } else if (fs.statSync(full).isDirectory()) {
      results.push(...walk(full));
    }
  }
  return results;
}

const files = walk(PUBLIC_DIR);
let injected = 0;
let skipped = 0;
for (const f of files) {
  if (processFile(f)) injected++;
  else skipped++;
}
console.log(`[inject] ✓ ${injected} صفحة تم حقنها، ${skipped} تم تخطيها (موجودة بالفعل)`);
