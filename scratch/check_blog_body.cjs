const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');
const bodyStart = indexHtml.indexOf('<body');
const gridStart = indexHtml.indexOf('<div class="posts-grid">');

console.log(indexHtml.slice(bodyStart, gridStart));
