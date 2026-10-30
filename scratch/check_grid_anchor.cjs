const fs = require('fs');
const html = fs.readFileSync('public/blog/index.html', 'utf8');
const gridIdx = html.indexOf('<div class="posts-grid">');
console.log(html.slice(gridIdx, gridIdx + 150));
