const fs = require('fs');

const v6 = fs.readFileSync('scratch/extracted_v6/lawyers-directory.html', 'utf8');
const pub = fs.readFileSync('public/lawyers-directory.html', 'utf8');

console.log('v6 length:', v6.length, 'pub length:', pub.length);

const funcsV6 = [...v6.matchAll(/function\s+([a-zA-Z0-9_]+)\s*\(/g)].map(m => m[1]);
const funcsPub = new Set([...pub.matchAll(/function\s+([a-zA-Z0-9_]+)\s*\(/g)].map(m => m[1]));

console.log('New functions in v6 lawyers-directory:', funcsV6.filter(f => !funcsPub.has(f)));
