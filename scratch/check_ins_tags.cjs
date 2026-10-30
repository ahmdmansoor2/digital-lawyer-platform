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
let insCount = 0;
files.forEach(f => {
  const html = fs.readFileSync(f, 'utf8');
  if (html.includes('adsbygoogle')) {
    insCount++;
  }
});

console.log('Files with adsbygoogle in public:', insCount);
