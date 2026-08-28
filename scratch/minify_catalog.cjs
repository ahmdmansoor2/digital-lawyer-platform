const fs = require('fs');
const path = require('path');

const fullJson = JSON.parse(fs.readFileSync('public/data/legal-library-catalog.json', 'utf8'));

// Save minified full catalog
fs.writeFileSync('public/data/legal-library-catalog.json', JSON.stringify(fullJson), 'utf8');
console.log('Minified full catalog size:', (fs.statSync('public/data/legal-library-catalog.json').size / 1024).toFixed(2), 'KB');

// Save top featured 200 books for instant initial render
const featured = fullJson.slice(0, 200);
fs.writeFileSync('public/data/legal-library-featured.json', JSON.stringify(featured), 'utf8');
console.log('Featured catalog saved with', featured.length, 'books.');
