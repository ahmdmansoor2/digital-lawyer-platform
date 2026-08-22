'use strict';
const fs = require('fs');

const files = [
  'public/about.html',
  'public/features.html',
  'public/pricing.html',
  'public/contact.html',
  'public/legal-forms.html',
  'public/search.html',
  'public/legal-library.html',
  'public/privacy.html',
  'public/terms.html',
].filter(f => fs.existsSync(f));

files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const kwMatch = c.match(/meta name="keywords" content="([^"]+)"/);
  const descMatch = c.match(/meta name="description" content="([^"]+)"/);
  const kw = kwMatch ? kwMatch[1] : 'NONE';
  const desc = descMatch ? descMatch[1] : 'NONE';
  console.log('FILE:', f);
  console.log('KW:', kw.substring(0, 150));
  console.log('DESC:', desc.substring(0, 150));
  console.log('---');
});
