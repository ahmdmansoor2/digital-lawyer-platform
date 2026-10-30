const fs = require('fs');

const sampleRadar = fs.readFileSync('public/radar-topics/2026-10-16-turki-al-alshikh.html', 'utf8');
const insMatch = sampleRadar.match(/<div[^>]*>[\s\S]*?<ins class="adsbygoogle"[\s\S]*?<\/div>/gi) || sampleRadar.match(/<ins class="adsbygoogle"[\s\S]*?<\/ins>/gi);
console.log('Sample ins in radar-topics:\n', insMatch ? insMatch[0] : 'None');

const sampleForm = fs.readFileSync('public/legal-forms-docs/lease_contract.html', 'utf8');
const formIns = sampleForm.match(/<div[^>]*>[\s\S]*?<ins class="adsbygoogle"[\s\S]*?<\/div>/gi) || sampleForm.match(/<ins class="adsbygoogle"[\s\S]*?<\/ins>/gi);
console.log('\nSample ins in legal-forms-docs:\n', formIns ? formIns[0] : 'None');
