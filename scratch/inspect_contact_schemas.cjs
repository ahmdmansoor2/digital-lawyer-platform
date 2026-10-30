const fs = require('fs');
const content = fs.readFileSync('public/contact.html', 'utf8');
const schemas = [...content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('Schemas in contact.html:', schemas.length);
schemas.forEach((s, i) => console.log('Schema ' + i + ':\n', s));
