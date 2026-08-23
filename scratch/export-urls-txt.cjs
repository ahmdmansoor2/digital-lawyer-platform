const fs = require('fs');
const path = require('path');

const publicSitemap = path.join(__dirname, '..', 'public', 'sitemap.xml');
const xml = fs.readFileSync(publicSitemap, 'utf8');

const regex = /<loc>(https:\/\/[^<]+)<\/loc>/g;
let match;
const urls = [];

while ((match = regex.exec(xml)) !== null) {
  urls.push(match[1]);
}

console.log(`Extracted ${urls.length} URLs`);

// Save plain text list of all URLs
const urlsTxtPathPublic = path.join(__dirname, '..', 'public', 'urls.txt');
const urlsTxtPathDist = path.join(__dirname, '..', 'dist', 'urls.txt');

const urlsText = urls.join('\n') + '\n';
fs.writeFileSync(urlsTxtPathPublic, urlsText, 'utf8');
if (fs.existsSync(path.dirname(urlsTxtPathDist))) {
  fs.writeFileSync(urlsTxtPathDist, urlsText, 'utf8');
}

console.log('Saved urls.txt in public and dist!');
