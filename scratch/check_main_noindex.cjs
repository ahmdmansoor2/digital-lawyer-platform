const fs = require('fs');
const path = require('path');

const file = 'scripts/blog-publisher/generate-sitemap.cjs';
const content = fs.readFileSync(file, 'utf8');
const mainMatch = content.match(/const main = \[([\s\S]*?)\];/);
if (mainMatch) {
  const locs = [...mainMatch[1].matchAll(/loc:\s*'([^']+)'/g)].map(m => m[1]);
  locs.forEach(loc => {
    let p = loc;
    if (p === '/') {
      const rootIndex = path.join(__dirname, '..', 'index.html');
      const html = fs.readFileSync(rootIndex, 'utf8');
      if (/content=["'][^"']*noindex[^"']*["']/i.test(html)) console.log('NOINDEX in main: /');
      return;
    }
    if (p.endsWith('/')) p += 'index.html';
    const filePath = path.join(__dirname, '..', 'public', p.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      if (fs.statSync(filePath).isFile()) {
        const html = fs.readFileSync(filePath, 'utf8');
        const hasNoindex = /content=["'][^"']*noindex[^"']*["']/i.test(html);
        if (hasNoindex) console.log('NOINDEX in main:', loc);
      }
    } else {
      console.log('MISSING file for main:', loc);
    }
  });
}
