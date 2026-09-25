const fs = require('fs');

const files = [
  'public/blog/alimony-calculation-egypt.html',
  'public/calculate-inheritance.html',
  'public/features.html',
  'public/kuwait-legal-hub.html',
  'public/bahrain-legal-hub.html',
  'public/blog/property-tax-egypt.html',
  'public/blog/shahr-aqary-apartment-registration-guide-2026.html',
  'public/blog/old-rent-law-2026-eviction-and-increase.html',
  'public/blog/content-creators-tax-law-egypt.html',
  'public/about.html',
  'public/blog/index.html',
  'public/blog/real-estate-registration-vs-customary-sale.html',
  'public/blog/execution-judgments-egypt.html',
  'public/blog/bounced-check-laws-egypt.html'
];

let updated = 0;
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log('File not found:', file);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('name="robots"') && !content.includes("name='robots'")) {
    if (content.includes('rel="canonical"') || content.includes("rel='canonical'")) {
      content = content.replace(/(<link[^>]*rel=["']canonical["'][^>]*>)/i, '$1\n  <meta name="robots" content="index, follow, max-image-preview:large" />');
    } else {
      content = content.replace('</head>', '  <meta name="robots" content="index, follow, max-image-preview:large" />\n</head>');
    }
    fs.writeFileSync(file, content, 'utf8');
    updated++;
    console.log('Updated robots in:', file);
  }
}
console.log('Total files updated with explicit robots meta:', updated);
