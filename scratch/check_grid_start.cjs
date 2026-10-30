const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');
const gridStart = indexHtml.indexOf('<div class="posts-grid">');
console.log('HTML before posts-grid:');
console.log(indexHtml.slice(gridStart - 500, gridStart + 30));
