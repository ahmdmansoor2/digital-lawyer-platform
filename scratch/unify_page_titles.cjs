const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', '.git', 'dist'].includes(e.name)) res.push(...walk(f));
    } else if (e.name.endsWith('.html')) {
      res.push(f);
    }
  });
  return res;
}

const files = walk(path.join(__dirname, '..', 'public'));
let updatedCount = 0;

files.forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1].includes('منصة المحامي الرقمية')) {
    const oldTitle = titleMatch[1];
    const newTitle = oldTitle.replace(/منصة\s+المحامي\s+الرقمية/g, 'المحامي الرقمي');
    const newHtml = html.replace(`<title>${oldTitle}</title>`, `<title>${newTitle}</title>`);
    if (newHtml !== html) {
      fs.writeFileSync(f, newHtml, 'utf8');
      updatedCount++;
    }
  }
});

console.log(`Updated ${updatedCount} files to use 'المحامي الرقمي' in <title>`);
