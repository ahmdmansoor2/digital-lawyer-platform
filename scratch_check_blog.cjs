'use strict';
const fs = require('fs');

const stats = fs.statSync('public/blog/index.html');
console.log('public/blog/index.html size: ' + stats.size + ' bytes');
const content = fs.readFileSync('public/blog/index.html', 'utf8');
const articleMatches = content.match(/<article\b/g);
console.log('Number of articles listed: ' + (articleMatches ? articleMatches.length : 0));
const imgMatches = content.match(/<img\b[^>]*>/g);
console.log('Number of images in blog/index.html: ' + (imgMatches ? imgMatches.length : 0));
if (imgMatches) {
  let missingLazy = 0;
  imgMatches.forEach(img => {
    if (!img.includes('loading="lazy"') && !img.includes("loading='lazy'")) missingLazy++;
  });
  console.log('Images missing loading="lazy": ' + missingLazy);
}
