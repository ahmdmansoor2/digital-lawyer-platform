const fs = require('fs');
const sw = fs.readFileSync('public/sw.js', 'utf8');
const reg = fs.readFileSync('public/sw-register.js', 'utf8');
const swV = sw.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
const regV = reg.match(/sw\.js\?v=([^'"]+)/);
console.log('sw.js CACHE_NAME:', swV ? swV[1] : 'None');
console.log('sw-register.js version query:', regV ? regV[1] : 'None');
