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
const patterns = new Set();

files.forEach(f => {
  const html = fs.readFileSync(f, 'utf8');
  const m1 = html.match(/<meta[^>]*google-adsense-account[^>]*>/gi);
  if (m1) m1.forEach(m => patterns.add(m.trim()));

  const m2 = html.match(/<script[^>]*pagead2\.googlesyndication\.com[^>]*>[\s\S]*?<\/script>/gi);
  if (m2) m2.forEach(m => patterns.add(m.trim()));

  const m3 = html.match(/<script[^>]*pagead2\.googlesyndication\.com[^>]*\/>/gi);
  if (m3) m3.forEach(m => patterns.add(m.trim()));
});

console.log('Found AdSense patterns in public/*.html:');
patterns.forEach(p => console.log('--- PATTERN ---\n', p));
