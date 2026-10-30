const fs = require('fs');

const cgV6 = fs.readFileSync('scratch/extracted_v6/contract-generator.html', 'utf8');
const cgPub = fs.readFileSync('public/contract-generator.html', 'utf8');

// Check what templates are in v6 vs public
const matchesV6 = [...cgV6.matchAll(/value=["']([a-zA-Z0-9_-]+)["'][^>]*>([^<]+)<\/option>/g)].map(m => ({ id: m[1], name: m[2].trim() }));
const matchesPub = [...cgPub.matchAll(/value=["']([a-zA-Z0-9_-]+)["'][^>]*>([^<]+)<\/option>/g)].map(m => ({ id: m[1], name: m[2].trim() }));

console.log('--- Contract Generator Templates Count ---');
console.log('v6 options count:', matchesV6.length);
console.log('public options count:', matchesPub.length);

const pubIds = new Set(matchesPub.map(m => m.id));
const newInV6 = matchesV6.filter(m => !pubIds.has(m.id));
console.log('New templates in v6:', newInV6);

console.log('--- Lawyers Directory v6 Inspection ---');
const ldV6 = fs.readFileSync('scratch/extracted_v6/lawyers-directory.html', 'utf8');
const ldPub = fs.readFileSync('public/lawyers-directory.html', 'utf8');

console.log('v6 has gold verification modal:', ldV6.includes('lawyerRegisterModal'));
console.log('v6 has whatsapp contact:', ldV6.includes('wa.me'));
console.log('v6 has export feature:', ldV6.includes('export') || ldV6.includes('print'));

console.log('--- Legal Glossary Inspection ---');
const lgV6 = fs.readFileSync('scratch/extracted_v6/legal-glossary.html', 'utf8');
console.log('Glossary title:', lgV6.match(/<title>([^<]+)<\/title>/)?.[1]);
console.log('Glossary terms count (approx):', (lgV6.match(/class=["']glossary-item["']/g) || lgV6.match(/<dt>/g) || lgV6.match(/<h3>/g) || []).length);
