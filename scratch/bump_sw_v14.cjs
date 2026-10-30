const fs = require('fs');

// 1. Update public/sw.js
let sw = fs.readFileSync('public/sw.js', 'utf8');
sw = sw.replace(/mohami-v13-domination-20261020/g, 'mohami-v14-brand-20261023');
fs.writeFileSync('public/sw.js', sw, 'utf8');

// 2. Update public/sw-register.js
let reg = fs.readFileSync('public/sw-register.js', 'utf8');
reg = reg.replace(/20261020v13/g, '20261023v14');
fs.writeFileSync('public/sw-register.js', reg, 'utf8');

// 3. Update index.html sw-register script tag query if present
let index = fs.readFileSync('index.html', 'utf8');
index = index.replace(/sw-register\.js\?v=[a-zA-Z0-9_-]+/g, 'sw-register.js?v=20261023v14');
fs.writeFileSync('index.html', index, 'utf8');

console.log('Service worker version bumped to v14 across all registration files');
