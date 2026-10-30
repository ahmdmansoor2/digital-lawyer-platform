const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\احمد منصور';
const desktopDir = path.join(userProfile, 'Desktop');

console.log('Desktop dir exists:', fs.existsSync(desktopDir));
const files = fs.readdirSync(desktopDir);
const docxFiles = files.filter(f => f.endsWith('.docx'));
console.log('Docx files on Desktop:');
docxFiles.forEach(f => {
  const stat = fs.statSync(path.join(desktopDir, f));
  console.log(` - ${f} (${stat.size} bytes, modified: ${stat.mtime})`);
});
