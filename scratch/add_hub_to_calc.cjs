const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'legal-calculators.html');
let content = fs.readFileSync(filePath, 'utf8');

const target = '/inheritance-deed-generator.html';
if (content.includes(target) && !content.includes('/html-sitemap-hub.html')) {
  const insert = `      <a href="/html-sitemap-hub.html" style="background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px 14px; text-decoration:none; display:flex; align-items:center; gap:10px; transition:border-color 0.2s;">
        <span style="font-size:1.4rem;">🗺️</span>
        <div>
          <div style="font-size:0.86rem; font-weight:800; color:#f1f5f9;">الفهرس القانوني الشامل للمنصة</div>
          <div style="font-size:0.72rem; color:#94a3b8;">دليل كافة المقالات والمحاكم والأدوات</div>
        </div>
      </a>\n`;

  // Look for the end of the grid:
  const anchor = '      <a href="/inheritance-deed-generator.html"';
  const anchorEnd = content.indexOf('</a>', content.indexOf(anchor)) + 4;
  content = content.slice(0, anchorEnd) + '\n' + insert + content.slice(anchorEnd);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully inserted html-sitemap-hub.html into legal-calculators.html!');
} else {
  console.log('Target not found or already included.');
}
