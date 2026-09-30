'use strict';
const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '..', '..', 'public', 'blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));

let fixedCount = 0;
let modifiedFiles = 0;

files.forEach(f => {
  const filePath = path.join(blogDir, f);
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace <img that does NOT have loading=
  const updatedHtml = html.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
    let newAttrs = attrs;
    let modified = false;

    if (!attrs.includes('loading=')) {
      newAttrs += ' loading="lazy"';
      modified = true;
    }
    if (!attrs.includes('decoding=')) {
      newAttrs += ' decoding="async"';
      modified = true;
    }

    if (modified) {
      fixedCount++;
      changed = true;
      return `<img${newAttrs}>`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, updatedHtml, 'utf8');
    modifiedFiles++;
  }
});

console.log(`Finished lazy loading injection:`);
console.log(`  Modified files: ${modifiedFiles}`);
console.log(`  Updated <img> tags: ${fixedCount}`);
