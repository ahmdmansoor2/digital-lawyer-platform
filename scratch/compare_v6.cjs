const fs = require('fs');
const path = require('path');

const dirV6 = 'd:/قانوني 7/scratch/extracted_v6';
const dirV5 = 'd:/قانوني 7/scratch/extracted_v5';
const publicDir = 'd:/قانوني 7/public';

console.log('--- 1. Check legal-glossary.html ---');
const glossaryV6 = path.join(dirV6, 'legal-glossary.html');
const glossaryPub = path.join(publicDir, 'legal-glossary.html');
console.log('legal-glossary.html exists in public:', fs.existsSync(glossaryPub));
if (fs.existsSync(glossaryV6)) {
  console.log('legal-glossary.html in v6 size:', fs.statSync(glossaryV6).size);
}

console.log('--- 2. Check contract-generator.html changes ---');
const cgV6 = fs.readFileSync(path.join(dirV6, 'contract-generator.html'), 'utf8');
const cgPub = fs.readFileSync(path.join(publicDir, 'contract-generator.html'), 'utf8');
console.log('contract-generator v6 length:', cgV6.length, 'public length:', cgPub.length);

console.log('--- 3. Check lawyers-directory.html changes ---');
const ldV6 = fs.readFileSync(path.join(dirV6, 'lawyers-directory.html'), 'utf8');
const ldPub = fs.readFileSync(path.join(publicDir, 'lawyers-directory.html'), 'utf8');
console.log('lawyers-directory v6 length:', ldV6.length, 'public length:', ldPub.length);

console.log('--- 4. Check legal-calculators.html changes ---');
const lcV6 = fs.readFileSync(path.join(dirV6, 'legal-calculators.html'), 'utf8');
const lcPub = fs.readFileSync(path.join(publicDir, 'legal-calculators.html'), 'utf8');
console.log('legal-calculators v6 length:', lcV6.length, 'public length:', lcPub.length);

console.log('--- 5. Check law-students-hub.html changes ---');
const lsV6 = fs.readFileSync(path.join(dirV6, 'law-students-hub.html'), 'utf8');
const lsPub = fs.readFileSync(path.join(publicDir, 'law-students-hub.html'), 'utf8');
console.log('law-students-hub v6 length:', lsV6.length, 'public length:', lsPub.length);

console.log('--- 6. Check citizen-complaints.html changes ---');
const ccV6 = fs.readFileSync(path.join(dirV6, 'citizen-complaints.html'), 'utf8');
const ccPub = fs.readFileSync(path.join(publicDir, 'citizen-complaints.html'), 'utf8');
console.log('citizen-complaints v6 length:', ccV6.length, 'public length:', ccPub.length);

console.log('--- 7. Check real-estate.html changes ---');
const reV6 = fs.readFileSync(path.join(dirV6, 'real-estate.html'), 'utf8');
const rePub = fs.readFileSync(path.join(publicDir, 'real-estate.html'), 'utf8');
console.log('real-estate v6 length:', reV6.length, 'public length:', rePub.length);
