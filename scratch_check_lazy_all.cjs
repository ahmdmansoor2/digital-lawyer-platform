'use strict';
const fs = require('fs');
const path = require('path');

function checkPages(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  let totalImgs = 0;
  let missingLazy = 0;
  let pagesWithMissingLazy = 0;

  files.forEach(f => {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    const imgs = html.match(/<img\b[^>]*>/gi) || [];
    let pageMissing = 0;
    imgs.forEach(img => {
      totalImgs++;
      if (!img.includes('loading="lazy"') && !img.includes("loading='lazy'")) {
        missingLazy++;
        pageMissing++;
      }
    });
    if (pageMissing > 0) pagesWithMissingLazy++;
  });

  console.log(`Directory ${dir}:`);
  console.log(`  Total HTML pages: ${files.length}`);
  console.log(`  Total <img> tags: ${totalImgs}`);
  console.log(`  Missing loading="lazy": ${missingLazy}`);
  console.log(`  Pages with missing lazy: ${pagesWithMissingLazy}`);
}

checkPages('public/blog');
checkPages('public/radar-topics');
checkPages('public/courts');
checkPages('public/pillars');
