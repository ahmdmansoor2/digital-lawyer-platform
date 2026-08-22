'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// 1. Remove public/legal-library.html and dist/legal-library.html
const pubLib = path.join(ROOT, 'public', 'legal-library.html');
const distLib = path.join(ROOT, 'dist', 'legal-library.html');

if (fs.existsSync(pubLib)) {
  fs.unlinkSync(pubLib);
  console.log('✅ Removed public/legal-library.html');
}
if (fs.existsSync(distLib)) {
  fs.unlinkSync(distLib);
  console.log('✅ Removed dist/legal-library.html');
}

// 2. Clean links from HTML files
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'dist-desktop' && file !== '_backup_legal_library') {
        results = results.concat(walk(full));
      }
    } else if (file.endsWith('.html')) {
      results.push(full);
    }
  });
  return results;
}

const htmlFiles = walk(path.join(ROOT, 'public')).concat([path.join(ROOT, 'index.html')]);

let modifiedCount = 0;

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Remove navbar link to legal library
  content = content.replace(/<a\s+href=["']\/legal-library\.html["'][^>]*>.*?<\/a>\s*/gi, '');
  content = content.replace(/<a\s+href=["']https:\/\/mohamidigital\.online\/legal-library\.html["'][^>]*>.*?<\/a>\s*(?:·\s*)?/gi, '');
  content = content.replace(/<li>.*?<a\s+href=["'][^"']*legal-library\.html["'][^>]*>.*?<\/a>.*?<\/li>\s*/gi, '');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`✅ Removed Legal Library links from ${modifiedCount} HTML files.`);
