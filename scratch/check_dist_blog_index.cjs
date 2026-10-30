const fs = require('fs');
const html = fs.readFileSync('dist/blog/index.html', 'utf8');
const count = (html.match(/class="post-card"/g) || []).length;
console.log('Cards in dist/blog/index.html:', count);
console.log('Size of dist/blog/index.html:', html.length);
