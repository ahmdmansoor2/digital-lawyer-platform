const fs = require('fs');
const html = fs.readFileSync('public/privacy.html', 'utf8');

const regex = /<h[23][^>]*>[^<]*(?:إعلانات|AdSense|جوجل|ملفات تعريف)[^<]*<\/h[23]>[\s\S]*?(?=<h[23]|$)/gi;
const matches = [...html.matchAll(regex)];
console.log('Matches count:', matches.length);
matches.forEach((m, i) => console.log(`--- Section ${i+1} ---\n`, m[0].slice(0, 500)));
