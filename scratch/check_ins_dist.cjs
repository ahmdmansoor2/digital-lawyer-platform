const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
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

const files = walk('public');
const dirMap = {};

files.forEach(f => {
  const html = fs.readFileSync(f, 'utf8');
  if (html.includes('adsbygoogle')) {
    const rel = path.relative('public', f);
    const top = rel.includes(path.sep) ? rel.split(path.sep)[0] : 'root';
    dirMap[top] = (dirMap[top] || 0) + 1;
  }
});

console.log('adsbygoogle distribution:');
console.log(dirMap);
