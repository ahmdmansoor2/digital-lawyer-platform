const fs = require('fs');

const logData = JSON.parse(fs.readFileSync('scripts/published-log.json', 'utf8'));
const published = logData.published || [];
console.log('Total published articles in published-log.json:', published.length);
if (published.length > 0) {
  console.log('Earliest:', published[0].date || published[0].publishedAt || published[0]);
  console.log('Latest 5:');
  published.slice(-5).forEach(p => console.log(p.slug, p.date || p.publishedAt, p.title));
}

// Check dates distribution in published
const dateCounts = {};
published.forEach(p => {
  const d = (p.date || p.publishedAt || 'unknown').slice(0, 10);
  dateCounts[d] = (dateCounts[d] || 0) + 1;
});
console.log('Date counts in published-log:');
Object.keys(dateCounts).sort().forEach(d => console.log(d, ':', dateCounts[d]));

// Also check the dates inside public/blog/index.html
const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');
// Let's see what dates appear in public/blog/index.html
const datesInIndex = indexHtml.match(/\d{4}-\d{2}-\d{2}/g) || [];
const uniqueDatesInIndex = Array.from(new Set(datesInIndex)).sort();
console.log('Dates found in public/blog/index.html:', uniqueDatesInIndex);
