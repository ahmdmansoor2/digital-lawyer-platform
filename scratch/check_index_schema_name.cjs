const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
schemas.forEach((s, i) => {
  if (s[1].includes('منصة المحامي الرقمية')) {
    console.log('Schema', i, 'contains منصة المحامي الرقمية:\n', s[1].slice(0, 400));
  }
});
