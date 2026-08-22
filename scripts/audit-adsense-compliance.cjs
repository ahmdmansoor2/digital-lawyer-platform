const fs = require('fs');
const path = require('path');
const blogDir = path.join('public', 'blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html') && f !== 'index.html');
console.log('Total blog articles:', files.length);

let shortArticles = [];
let dupAuthorCount = 0;
let keywordStuffed = 0;

for (const f of files) {
  const content = fs.readFileSync(path.join(blogDir, f), 'utf8');
  const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  if (wordCount < 400) {
    shortArticles.push({ file: f, words: wordCount });
  }
  const authorMatches = (content.match(/property=["']article:author["']/g) || []).length;
  if (authorMatches > 1) {
    dupAuthorCount++;
  }
  const kwMatch = content.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
  if (kwMatch && kwMatch[1].split(/[،,]/).length > 15) {
    keywordStuffed++;
  }
}

console.log('Articles with duplicate article:author meta:', dupAuthorCount);
console.log('Articles with >15 keywords (stuffed):', keywordStuffed);
console.log('Articles under 400 words:', shortArticles.length, shortArticles);
