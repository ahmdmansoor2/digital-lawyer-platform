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
const dirCounts = {};

files.forEach(f => {
  const html = fs.readFileSync(f, 'utf8');
  const hasAd = /google-adsense-account|pagead2\.googlesyndication\.com/i.test(html);
  if (hasAd) {
    const rel = path.relative('public', f);
    const topDir = rel.includes(path.sep) ? rel.split(path.sep)[0] : 'root';
    dirCounts[topDir] = (dirCounts[topDir] || 0) + 1;
  }
});

console.log('AdSense presence by public/ directory:');
Object.entries(dirCounts).forEach(([d, c]) => console.log(`  ${d}: ${c} files`));
