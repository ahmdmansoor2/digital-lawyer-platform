const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');

// Let's find all hrefs in indexHtml
const matches = [...indexHtml.matchAll(/href="\/blog\/([a-z0-9-]+)(\.html)?"/gi)].map(m => m[1]);
console.log('Total articles linked in index.html:', matches.length);

const logData = JSON.parse(fs.readFileSync('scripts/published-log.json', 'utf8'));
const published = logData.published || [];

const logBySlug = {};
published.forEach(p => {
  logBySlug[p.slug] = p;
});

let inIndexDates = [];
matches.forEach(slug => {
  if (logBySlug[slug]) {
    inIndexDates.push(logBySlug[slug].date || logBySlug[slug].publishedAt);
  }
});

inIndexDates.sort();
console.log('Earliest date of article in index.html:', inIndexDates[0]);
console.log('Latest date of article in index.html:', inIndexDates[inIndexDates.length - 1]);

// Count by date in index.html
const dateCounts = {};
inIndexDates.forEach(d => {
  const day = d ? d.slice(0, 10) : 'unknown';
  dateCounts[day] = (dateCounts[day] || 0) + 1;
});
console.log('Dates of articles present in public/blog/index.html:');
Object.keys(dateCounts).sort().forEach(d => console.log(d, ':', dateCounts[d]));

// Let's see how many articles from published-log are MISSING from public/blog/index.html
const indexSlugSet = new Set(matches);
const missingFromIndex = published.filter(p => !indexSlugSet.has(p.slug));
console.log('Total articles in published-log missing from public/blog/index.html:', missingFromIndex.length);
if (missingFromIndex.length > 0) {
  console.log('First 5 missing from index:', missingFromIndex.slice(0, 5).map(p => ({ slug: p.slug, date: p.date })));
  console.log('Last 5 missing from index:', missingFromIndex.slice(-5).map(p => ({ slug: p.slug, date: p.date })));
}
