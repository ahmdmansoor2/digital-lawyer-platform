const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const adTag = html.match(/<script[\s\S]*?pagead2\.googlesyndication\.com[\s\S]*?<\/script>/gi);
const metaAd = html.match(/<meta\s+name=["']google-adsense-account["'][\s\S]*?>/gi);
console.log('Ad script in index.html:', adTag ? adTag.length : 0);
console.log('Meta tag in index.html:', metaAd ? metaAd[0] : 'None');
