const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const schemas = [...content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('Total JSON-LD schemas in root index.html:', schemas.length);
schemas.forEach((s, i) => {
  if (s.includes('Organization') || s.includes('LegalService') || s.includes('sameAs')) {
    console.log(`--- Schema ${i + 1} ---`);
    console.log(s.slice(0, 500));
  }
});
