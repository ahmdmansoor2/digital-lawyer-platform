const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const VERSION = '20260823v10';

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Replace /sidebar.js with /sidebar.js?v=VERSION
      if (content.includes('/sidebar.js')) {
        content = content.replace(/\/sidebar\.js(\?v=[a-zA-Z0-9_-]+)?/g, `/sidebar.js?v=${VERSION}`);
        changed = true;
      }

      // Replace /header.css with /header.css?v=VERSION
      if (content.includes('/header.css')) {
        content = content.replace(/\/header\.css(\?v=[a-zA-Z0-9_-]+)?/g, `/header.css?v=${VERSION}`);
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', path.relative(publicDir, fullPath));
      }
    }
  }
}

processDir(publicDir);
console.log('Done cache busting all HTML files!');
