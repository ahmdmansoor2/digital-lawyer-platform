const fs = require('fs');
const html = fs.readFileSync('public/blog/index.html', 'utf8');

const bodyGridIdx = html.indexOf('<div class="posts-grid"');
console.log('bodyGridIdx:', bodyGridIdx);
console.log('--- FIRST 2000 CHARS OF HTML BODY GRID ---');
console.log(html.slice(bodyGridIdx, bodyGridIdx + 2000));
