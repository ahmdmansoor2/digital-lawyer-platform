'use strict';
const fs = require('fs');
const path = require('path');

const ROBOTS_INDEX = '  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />';
const ROBOTS_NOINDEX = '  <meta name="robots" content="noindex, follow" />';

const targets = [
  { file: 'public/appeal-deadlines.html', type: 'index' },
  { file: 'public/bahrain-legal-hub-en.html', type: 'index' },
  { file: 'public/calculate-alimony.html', type: 'index' },
  { file: 'public/calculate-end-of-service.html', type: 'index' },
  { file: 'public/contact.html', type: 'index' },
  { file: 'public/disclaimer.html', type: 'index' },
  { file: 'public/economic-hub.html', type: 'index' },
  { file: 'public/editorial-policy.html', type: 'index' },
  { file: 'public/kuwait-investors-egypt.html', type: 'index' },
  { file: 'public/kuwait-legal-hub-en.html', type: 'index' },
  { file: 'public/law-students-hub.html', type: 'index' },
  { file: 'public/newsletter/latest.html', type: 'index' },
  { file: 'public/oman-legal-hub-en.html', type: 'index' },
  { file: 'public/oman-legal-hub.html', type: 'index' },
  { file: 'public/pillars/egyptian-labor-law-2026-comprehensive-guide.html', type: 'index' },
  { file: 'public/pricing.html', type: 'index' },
  { file: 'public/privacy.html', type: 'index' },
  { file: 'public/qatar-legal-hub-en.html', type: 'index' },
  { file: 'public/qatar-legal-hub.html', type: 'index' },
  { file: 'public/real-estate-registration-fees.html', type: 'index' },
  { file: 'public/saudi-investors-egypt.html', type: 'index' },
  { file: 'public/saudi-legal-hub-en.html', type: 'index' },
  { file: 'public/saudi-legal-hub.html', type: 'index' },
  { file: 'public/terms.html', type: 'index' },
  { file: 'public/uae-investors-egypt.html', type: 'index' },
  { file: 'public/uae-legal-hub-en.html', type: 'index' },
  { file: 'public/uae-legal-hub.html', type: 'index' },
  { file: 'public/why-trust-us.html', type: 'index' },
  { file: 'public/search.html', type: 'noindex' }
];

let updated = 0;

targets.forEach(t => {
  const fullPath = path.resolve(t.file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping missing file: ${t.file}`);
    return;
  }

  let html = fs.readFileSync(fullPath, 'utf8');
  if (html.includes('name="robots"') || html.includes("name='robots'")) {
    console.log(`Already has robots: ${t.file}`);
    return;
  }

  const metaTag = t.type === 'noindex' ? ROBOTS_NOINDEX : ROBOTS_INDEX;

  if (html.includes('</head>')) {
    html = html.replace('</head>', `${metaTag}\n</head>`);
    fs.writeFileSync(fullPath, html, 'utf8');
    updated++;
    console.log(`Injected robots into: ${t.file} (${t.type})`);
  } else {
    console.log(`No </head> found in: ${t.file}`);
  }
});

console.log(`\nSuccessfully injected robots meta into ${updated} files.`);
