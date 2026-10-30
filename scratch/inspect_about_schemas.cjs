const fs = require('fs');
const content = fs.readFileSync('public/about.html', 'utf8');
const schemas = [...content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('Schemas count in about.html:', schemas.length);
schemas.forEach((s, i) => console.log('Schema ' + i + ':\n', s.slice(0, 300)));
