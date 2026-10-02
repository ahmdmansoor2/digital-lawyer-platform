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
console.log(`Total HTML files in public: ${htmlFiles.length}`);

const missingRobots = [];

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('name="robots"') && !content.includes("name='robots'")) {
    missingRobots.push(file);
  }
});

console.log(`Files missing robots meta: ${missingRobots.length}`);
missingRobots.forEach(f => console.log('  ' + f));
