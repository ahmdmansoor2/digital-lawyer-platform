'use strict';
const fs = require('fs');

const files = [
  'public/pillars/index.html',
  'public/economic-hub.html',
  'public/legal-calculators.html',
  'public/contract-generator.html',
  'public/appeal-deadlines.html',
  'public/calculate-alimony.html',
  'public/real-estate-registration-fees.html',
  'public/uae-legal-hub.html',
  'public/qatar-legal-hub.html',
  'public/saudi-legal-hub.html',
  'public/pillars/law-firm-management-in-egypt.html',
  'public/company-incorporation.html',
  'public/legal-diagnostics.html',
  'public/courts-directory.html',
  'public/court-precedents.html',
  'public/search.html',
  'public/pillars/legal-contract-drafting-egypt.html',
  'public/legal-library.html',
  'public/pillars/egyptian-labor-law-2026-comprehensive-guide.html',
  'public/pillars/personal-status-law-egypt-comprehensive-guide.html',
  'public/law-students-hub.html'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const html = fs.readFileSync(f, 'utf8');
    const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
    console.log(f + ': ' + (robots ? robots[1] : '❌ MISSING ROBOTS META'));
  } else {
    console.log(f + ': ❌ DOES NOT EXIST');
  }
});
