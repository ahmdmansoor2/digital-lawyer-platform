const fs = require('fs');
const path = require('path');

const rootFiles = fs.readdirSync('public').filter(f => f.endsWith('.html'));
const withAds = [];

rootFiles.forEach(f => {
  const html = fs.readFileSync(path.join('public', f), 'utf8');
  if (/google-adsense-account|pagead2\.googlesyndication\.com/i.test(html)) {
    withAds.push(f);
  }
});

console.log('Root files with AdSense:', withAds.length);
console.log(withAds.join(', '));
