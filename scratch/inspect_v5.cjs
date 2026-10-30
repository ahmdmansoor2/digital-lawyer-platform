const fs = require('fs');

const v5Radar = fs.readFileSync('scratch/extracted_v5/legal-radar.html', 'utf8');
const pubRadar = fs.readFileSync('public/legal-radar.html', 'utf8');

const m1 = v5Radar.match(/class=["']radar-day-header["']/g) || [];
const m2 = pubRadar.match(/class=["']radar-day-header["']/g) || [];

console.log('v5 radar days count:', m1.length);
console.log('pub radar days count:', m2.length);

const v5Blog = fs.readFileSync('scratch/extracted_v5/blog/index.html', 'utf8');
const pubBlog = fs.readFileSync('public/blog/index.html', 'utf8');
console.log('v5 blog index size:', v5Blog.length, 'pub blog index size:', pubBlog.length);
