'use strict';
const fs = require('fs');

// Fix legal-radar.html title and meta tags
let html = fs.readFileSync('public/legal-radar.html', 'utf8');

// Fix Title (11 chars → 57 chars)
html = html.replace(
  /<title>[\u0631\u0635\u062f \u0627\u0644\u0645\u062d\u0627\u0645\u064a]+<\/title>/,
  '<title>\u0631\u0635\u062f \u0627\u0644\u0645\u062d\u0627\u0645\u064a \u0627\u0644\u0631\u0642\u0645\u064a | \u062a\u062d\u0644\u064a\u0644 \u064a\u0648\u0645\u064a \u0644\u062a\u0631\u0646\u062f \u062c\u0648\u062c\u0644 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a \u0641\u064a \u0645\u0635\u0631 2026<\/title>'
);

// Fix robots meta
html = html.replace(
  '<meta name="robots" content="index, follow, max-image-preview:large" />',
  '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />'
);

// Add og:image after og:description line
if (html.indexOf('og:image') === -1) {
  html = html.replace(
    '<meta property="og:url" content="https://mohamidigital.online/legal-radar.html" />',
    '<meta property="og:image" content="https://mohamidigital.online/og-image.jpg" />\n  <meta property="og:url" content="https://mohamidigital.online/legal-radar.html" />'
  );
}

// Fix og:title
html = html.replace(
  'content="\u0631\u0635\u062f \u0627\u0644\u0645\u062d\u0627\u0645\u064a"',
  'content="\u0631\u0635\u062f \u0627\u0644\u0645\u062d\u0627\u0645\u064a \u0627\u0644\u0631\u0642\u0645\u064a | \u062a\u062d\u0644\u064a\u0644 \u064a\u0648\u0645\u064a \u0644\u0644\u062a\u0631\u0646\u062f \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a \u0641\u064a \u0645\u0635\u0631"'
);

fs.writeFileSync('public/legal-radar.html', html, 'utf8');
console.log('legal-radar.html updated successfully');

// Verify
const newHtml = fs.readFileSync('public/legal-radar.html', 'utf8');
const titleMatch = newHtml.match(/<title>([\s\S]*?)<\/title>/);
const robotsMatch = newHtml.match(/<meta name="robots" content="([^"]+)"/);
const ogImageMatch = newHtml.indexOf('og:image') !== -1;
console.log('New title:', titleMatch ? titleMatch[1] : 'NOT FOUND');
console.log('Robots:', robotsMatch ? robotsMatch[1] : 'NOT FOUND');
console.log('OG Image:', ogImageMatch ? 'YES' : 'MISSING');
