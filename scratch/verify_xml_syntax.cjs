const fs = require('fs');
const xml = fs.readFileSync('public/priority-tier1-sitemap.xml', 'utf8');

const locCount = (xml.match(/<loc>/g) || []).length;
const locCloseCount = (xml.match(/<\/loc>/g) || []).length;
const urlCount = (xml.match(/<url>/g) || []).length;
const urlCloseCount = (xml.match(/<\/url>/g) || []).length;

console.log('loc count:', locCount, 'loc close:', locCloseCount);
console.log('url count:', urlCount, 'url close:', urlCloseCount);

console.log('Starts with XML declaration?', xml.trim().startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
console.log('Ends with urlset?', xml.trim().endsWith('</urlset>'));

// Check each url
const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
console.log('Sample locs:');
locs.slice(0, 5).forEach(l => console.log(' ', l));
