'use strict';
const fs = require('fs');
const path = require('path');

function scanDirectory(dir, list = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== 'dist' && item !== 'data') {
        scanDirectory(full, list);
      }
    } else if (item.endsWith('.html')) {
      list.push(full);
    }
  }
  return list;
}

const htmlFiles = scanDirectory('public');
console.log('Total HTML files in public: ' + htmlFiles.length);

const noindexFiles = [];
const missingCanonicalFiles = [];

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('noindex')) {
    noindexFiles.push(file);
  }
  if (!content.includes('rel="canonical"') && !content.includes("rel='canonical'")) {
    missingCanonicalFiles.push(file);
  }
});

console.log('\n--- Files with noindex (' + noindexFiles.length + ') ---');
noindexFiles.forEach(f => console.log('  ' + f));

console.log('\n--- Files missing canonical tag (' + missingCanonicalFiles.length + ') ---');
missingCanonicalFiles.slice(0, 20).forEach(f => console.log('  ' + f));
if (missingCanonicalFiles.length > 20) console.log('  ... and ' + (missingCanonicalFiles.length - 20) + ' more');
