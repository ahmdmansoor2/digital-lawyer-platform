'use strict';
const fs = require('fs');
const path = require('path');

function scan(dir) {
  let missingSwap = 0;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== 'dist' && item !== 'data') {
        missingSwap += scan(full);
      }
    } else if (item.endsWith('.html')) {
      const html = fs.readFileSync(full, 'utf8');
      const fontMatches = html.match(/fonts\.googleapis\.com\/css2\?[^"]+/g) || [];
      for (const url of fontMatches) {
        if (!url.includes('display=swap')) {
          missingSwap++;
          console.log(`Missing display=swap in: ${full}`);
        }
      }
    }
  }
  return missingSwap;
}

const total = scan('public');
console.log('Total Google Fonts links missing display=swap: ' + total);
