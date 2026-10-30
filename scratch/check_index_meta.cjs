const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const ogSiteName = html.match(/<meta\s+property=["']og:site_name["'][\s\S]*?>/i);
const ogTitle = html.match(/<meta\s+property=["']og:title["'][\s\S]*?>/i);
const title = html.match(/<title>[\s\S]*?<\/title>/i);
console.log('title:', title ? title[0] : 'None');
console.log('og:site_name:', ogSiteName ? ogSiteName[0] : 'None');
console.log('og:title:', ogTitle ? ogTitle[0] : 'None');
