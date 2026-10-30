const fs = require('fs');

const indexHtml = fs.readFileSync('public/blog/index.html', 'utf8');

// Look for scripts in indexHtml
const scripts = [...indexHtml.matchAll(/<script[\s\S]*?<\/script>/gi)].map(m => m[0]);
console.log('Total scripts in blog/index.html:', scripts.length);
scripts.forEach((s, i) => {
  console.log(`--- SCRIPT ${i + 1} ---`);
  console.log(s.slice(0, 500));
});
