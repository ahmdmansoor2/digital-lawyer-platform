'use strict';
const fs = require('fs');

const code = fs.readFileSync('src/components/InfoCenter.tsx', 'utf8');
const imgs = [];
const regex = /<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
let m;
while ((m = regex.exec(code)) !== null) {
  imgs.push(m[1]);
}
console.log('Images in InfoCenter:', imgs);

// Also check background images or video sources
const bgRegex = /url\(["']?([^"')]+)["']?\)/gi;
const bgs = [];
while ((m = bgRegex.exec(code)) !== null) {
  bgs.push(m[1]);
}
console.log('Backgrounds in InfoCenter:', bgs);
