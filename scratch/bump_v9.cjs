const fs = require('fs');
const path = require('path');

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getHtmlFiles(full));
    } else if (file.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const files = getHtmlFiles('public');
let updatedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('header.css')) {
    const newContent = content.replace(/header\.css(\?v=[^"'\s>]*)?/g, 'header.css?v=20261016v9');
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  if (content.includes('sidebar.js')) {
    const newContent = content.replace(/sidebar\.js(\?v=[^"'\s>]*)?/g, 'sidebar.js?v=20261016v9');
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  if (content.includes('mobile-dock.js')) {
    const newContent = content.replace(/mobile-dock\.js(\?v=[^"'\s>]*)?/g, 'mobile-dock.js?v=20261016v9');
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  if (content.includes('sw-register.js')) {
    const newContent = content.replace(/sw-register\.js(\?v=[^"'\s>]*)?/g, 'sw-register.js?v=20261016v9');
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
  }
}

console.log('Batch updated files to v9:', updatedCount);
