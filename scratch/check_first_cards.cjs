const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');

// Match all post-cards
const cardMatches = [...indexHtml.matchAll(/<a href="\/blog\/([^"]+)" class="post-card">([\s\S]*?)<\/a>/g)];
console.log('Total post-cards found in index.html:', cardMatches.length);

const logData = JSON.parse(fs.readFileSync('scripts/published-log.json', 'utf8'));
const published = logData.published || [];
const logBySlug = {};
published.forEach(p => {
  logBySlug[p.slug] = p;
  logBySlug[p.slug + '.html'] = p;
});

cardMatches.slice(0, 15).forEach((m, i) => {
  const slug = m[1];
  const dateMatch = m[2].match(/📅\s*([^<\n]+)/);
  const dateStr = dateMatch ? dateMatch[1].trim() : (logBySlug[slug] ? logBySlug[slug].date : 'unknown');
  const titleMatch = m[2].match(/<h3>([^<]+)<\/h3>/);
  const title = titleMatch ? titleMatch[1].trim() : 'no title';
  console.log(`${i + 1}. [${dateStr}] ${slug} : ${title}`);
});
