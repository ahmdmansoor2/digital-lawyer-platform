const fs = require('fs');
const content = fs.readFileSync('public/about.html', 'utf8');
const schemas = [...content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('--- Schema 0 ---');
console.log(schemas[0]);
