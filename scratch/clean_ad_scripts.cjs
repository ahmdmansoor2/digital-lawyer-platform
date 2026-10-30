const fs = require('fs');

// 1. Clean scripts/seo/generate-legal-forms.cjs
let c1 = fs.readFileSync('scripts/seo/generate-legal-forms.cjs', 'utf8');
// remove adsbygoogle script tags and ad divs
c1 = c1.replace(/<!--\s*(?:TOP|BOTTOM)?\s*AD\s*-->\r?\n?\s*<div\s+class="ad-slot"[\s\S]*?<\/div>/gi, '');
c1 = c1.replace(/<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com[\s\S]*?<\/script>\r?\n?/gi, '');
fs.writeFileSync('scripts/seo/generate-legal-forms.cjs', c1, 'utf8');

// 2. Clean scripts/seo/generate-radar.cjs
let c2 = fs.readFileSync('scripts/seo/generate-radar.cjs', 'utf8');
c2 = c2.replace(/<!--\s*AD\s*-->\r?\n?\s*<div\s+class="ad-slot"[\s\S]*?<\/div>/gi, '');
c2 = c2.replace(/<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com[\s\S]*?<\/script>\r?\n?/gi, '');
fs.writeFileSync('scripts/seo/generate-radar.cjs', c2, 'utf8');

console.log('Scripts cleaned from AdSense template injection successfully');
