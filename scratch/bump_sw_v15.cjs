const fs = require('fs');

// 1. Update public/sw.js
let sw = fs.readFileSync('public/sw.js', 'utf8');
sw = sw.replace(/mohami-v14-brand-20261023/g, 'mohami-v15-adsense-clean-20261030');
fs.writeFileSync('public/sw.js', sw, 'utf8');

// 2. Update public/sw-register.js
let reg = fs.readFileSync('public/sw-register.js', 'utf8');
reg = reg.replace(/20261023v14/g, '20261030v15');
fs.writeFileSync('public/sw-register.js', reg, 'utf8');

// 3. Update index.html
let index = fs.readFileSync('index.html', 'utf8');
index = index.replace(/sw-register\.js\?v=[a-zA-Z0-9_-]+/g, 'sw-register.js?v=20261030v15');
fs.writeFileSync('index.html', index, 'utf8');

console.log('Bumped SW to v15');
