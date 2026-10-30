const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');
const gridStart = indexHtml.indexOf('<div class="posts-grid">');

const postCardMatches = [...indexHtml.matchAll(/<a href="\/blog\/[^"]+" class="post-card">[\s\S]*?<\/a>/g)];
console.log('Total post cards:', postCardMatches.length);

const firstCard = postCardMatches[0];
const lastPostCard = postCardMatches[postCardMatches.length - 1];

console.log('First card start index:', firstCard.index);
console.log('Last card end index:', lastPostCard.index + lastPostCard[0].length);

const afterLastCard = indexHtml.slice(lastPostCard.index + lastPostCard[0].length, lastPostCard.index + lastPostCard[0].length + 500);
console.log('Immediately after last post card:');
console.log(afterLastCard);
