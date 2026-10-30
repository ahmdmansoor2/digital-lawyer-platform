const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');
const gridStart = indexHtml.indexOf('<div class="posts-grid">');
const gridEnd = indexHtml.indexOf('</div>', gridStart + 500); // Wait, there are many inner divs
// Let's find where the grid ends by matching next section
const nextSection = indexHtml.indexOf('<section', gridStart) !== -1 ? indexHtml.indexOf('<section', gridStart) : indexHtml.indexOf('<footer', gridStart);
console.log('gridStart:', gridStart);
console.log('next major tag after grid:', nextSection);
console.log('Snippet around end of grid:\n', indexHtml.slice(nextSection - 300, nextSection + 300));
