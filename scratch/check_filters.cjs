const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');
const filterStart = indexHtml.indexOf('class="filter-');
console.log('filter tabs snippet:');
console.log(indexHtml.slice(filterStart - 100, filterStart + 800));
