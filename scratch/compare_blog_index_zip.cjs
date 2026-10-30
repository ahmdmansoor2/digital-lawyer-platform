const fs = require('fs');

const current = fs.readFileSync('public/blog/index.html', 'utf8');
const zipFile = fs.readFileSync('scratch/extracted_argon4/blog/index.html', 'utf8');

const currCards = (current.match(/class="post-card"/g) || []).length;
const zipCards = (zipFile.match(/class="post-card"/g) || []).length;

console.log('Current public/blog/index.html cards:', currCards);
console.log('Zip blog/index.html cards:', zipCards);

const m = zipFile.match(/📅\s*([^<\n]+)/);
console.log('First card date in zip blog/index.html:', m ? m[1].trim() : 'none');
