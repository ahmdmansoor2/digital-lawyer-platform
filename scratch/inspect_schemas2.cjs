const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const schemas = [...content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('--- FULL SCHEMA 2 ---');
console.log(schemas[1]);
