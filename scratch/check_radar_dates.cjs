const fs = require('fs');

const v5Radar = fs.readFileSync('scratch/extracted_v5/legal-radar.html', 'utf8');
const pubRadar = fs.readFileSync('public/legal-radar.html', 'utf8');

console.log('v5 legal radar includes 2026-10-16:', v5Radar.includes('2026-10-16'));
console.log('pub legal radar includes 2026-10-16:', pubRadar.includes('2026-10-16'));

const v5Dates = (v5Radar.match(/\d{4}-\d{2}-\d{2}/g) || []);
const pubDates = (pubRadar.match(/\d{4}-\d{2}-\d{2}/g) || []);

console.log('Unique dates in v5 radar:', new Set(v5Dates).size);
console.log('Unique dates in pub radar:', new Set(pubDates).size);
