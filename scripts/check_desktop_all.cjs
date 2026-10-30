const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\احمد منصور';
const desktopDir = path.join(userProfile, 'Desktop');

const files = fs.readdirSync(desktopDir);
files.forEach(f => {
  if (f.includes('خطاب') || f.includes('~$') || f.includes('.docx')) {
    try {
      const stat = fs.statSync(path.join(desktopDir, f));
      console.log(`${f} (${stat.size} bytes, modified: ${stat.mtime})`);
    } catch (e) {
      console.log(`${f} (error accessing: ${e.message})`);
    }
  }
});
