const fs = require('fs');
const v6 = fs.readFileSync('scratch/extracted_v6/contract-generator.html', 'utf8');
const pub = fs.readFileSync('public/contract-generator.html', 'utf8');

const m1 = v6.match(/loadTemplate\('([^']+)'\)/g) || [];
const m2 = pub.match(/loadTemplate\('([^']+)'\)/g) || [];

console.log('v6 loadTemplate calls:', m1.length, m1);
console.log('pub loadTemplate calls:', m2.length, m2);

const funcsV6 = (v6.match(/function\s+([a-zA-Z0-9_]+)\s*\(/g) || []);
const funcsPub = (pub.match(/function\s+([a-zA-Z0-9_]+)\s*\(/g) || []);
console.log('v6 functions count:', funcsV6.length);
console.log('pub functions count:', funcsPub.length);
