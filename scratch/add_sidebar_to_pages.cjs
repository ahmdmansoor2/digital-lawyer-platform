const fs = require('fs');
const path = require('path');

const dir = 'public';
const exclude = ['googlec03a96f2162c19b9.html', '404.html'];
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !exclude.includes(f));

let updated = 0;
const sidebarTag = '  <script src="/sidebar.js?v=20260904" defer></script>\n</body>';

for (const f of files) {
  const p = path.join(dir, f);
  let html = fs.readFileSync(p, 'utf8');
  if (!html.includes('sidebar.js')) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', sidebarTag);
      fs.writeFileSync(p, html, 'utf8');
      updated++;
      console.log('Added sidebar.js to:', f);
    }
  }
}

console.log(`Successfully added sidebar.js to ${updated} pages.`);
