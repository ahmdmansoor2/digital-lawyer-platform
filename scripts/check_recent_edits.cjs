const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\احمد منصور';
const dirsToCheck = [
  path.join(userProfile, 'Desktop'),
  path.join(userProfile, 'Downloads'),
  path.join(userProfile, 'Documents'),
  path.join(userProfile, '.gemini/antigravity/brain/82e1cf6b-533a-4130-8dc1-c60b4acf8a58/.user_uploaded'),
  'D:/المذكرات القانونية',
  'd:/قانوني 7/الصياغات_القانونية_الخاصة/04_تظلمات_وشكاوى',
];

dirsToCheck.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`\n--- Files in ${dir} ---`);
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      try {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        const diffMinutes = (Date.now() - stat.mtimeMs) / (1000 * 60);
        if (diffMinutes < 60) {
          console.log(`RECENT (<60m): ${f} (${stat.size} bytes, modified: ${stat.mtime})`);
        }
      } catch (e) {}
    });
  }
});
