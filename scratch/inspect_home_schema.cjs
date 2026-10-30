const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
schemas.forEach((s, i) => {
  try {
    const data = JSON.parse(s[1]);
    console.log('Schema', i, data['@type'] || (data['@graph'] ? 'Graph' : 'Unknown'), data.name || (data['@graph'] ? data['@graph'].map(g => g['@type'] + ':' + g.name).join(' | ') : ''));
  } catch (e) {
    console.log('Schema', i, 'Invalid JSON:', e.message);
  }
});
