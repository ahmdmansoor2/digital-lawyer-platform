'use strict';
const fs = require('fs');
const pages = [
  'public/contact.html',
  'public/courts-directory.html',
  'public/legal-forms.html',
  'public/calculate-inheritance.html',
  'public/sitemap.html'
];

pages.forEach(function(p) {
  const html = fs.readFileSync(p, 'utf8');
  const hasOgImage = html.indexOf('og:image') !== -1;
  const hasOgTitle = html.indexOf('og:title') !== -1;
  const hasOgUrl = html.indexOf('og:url') !== -1;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  console.log(p + ':');
  console.log('  og:image: ' + (hasOgImage ? 'YES' : 'MISSING'));
  console.log('  og:title: ' + (hasOgTitle ? 'YES' : 'MISSING'));
  console.log('  og:url: ' + (hasOgUrl ? 'YES' : 'MISSING'));
  console.log('  title: ' + (titleMatch ? titleMatch[1].trim().slice(0, 60) : 'MISSING'));
});
