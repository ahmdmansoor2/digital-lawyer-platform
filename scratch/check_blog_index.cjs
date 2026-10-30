const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');
console.log('Size of public/blog/index.html:', indexHtml.length);

const articleTags = (indexHtml.match(/<article\b/gi) || []).length;
console.log('Article tags count:', articleTags);

// Search for links inside public/blog/index.html
const blogLinks = indexHtml.match(/href="\/blog\/[^"]+"/gi) || [];
console.log('Total /blog/... links in index.html:', blogLinks.length);
console.log('First 5 links:', blogLinks.slice(0, 5));
console.log('Last 5 links:', blogLinks.slice(-5));

// Check blog files count in public/blog/
const files = fs.readdirSync('public/blog').filter(f => f.endsWith('.html') && f !== 'index.html');
console.log('Total HTML files in public/blog (excluding index.html):', files.length);

// Check scripts/published-log.json
if (fs.existsSync('scripts/published-log.json')) {
  const log = JSON.parse(fs.readFileSync('scripts/published-log.json', 'utf8'));
  console.log('Total items in scripts/published-log.json:', log.length);
  console.log('Latest 3 items in published-log.json:', JSON.stringify(log.slice(-3), null, 2));
}

// Check what script updates public/blog/index.html
// Search scripts/ directory for "public/blog/index.html"
