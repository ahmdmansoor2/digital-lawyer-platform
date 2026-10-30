const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');
const gridStart = indexHtml.indexOf('<div class="posts-grid">');

// Find the end of posts-grid
// Notice in check_grid_end.cjs:
// </div>
// </div>
// <footer>
// The grid is inside <div class="section"> <div class="posts-grid"> ... </div> </div>

const lastCard = indexHtml.lastIndexOf('</a>');
console.log('lastCard index:', lastCard);
console.log('Context after lastCard:', indexHtml.slice(lastCard + 4, lastCard + 400));
