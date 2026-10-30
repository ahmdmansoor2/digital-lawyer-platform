const fs = require('fs');
const html = fs.readFileSync('public/blog/index.html', 'utf8');

const gridIdx = html.indexOf('posts-grid');
console.log('posts-grid index:', gridIdx);
console.log('--- FIRST 2000 CHARS OF GRID ---');
console.log(html.slice(gridIdx, gridIdx + 2000));
