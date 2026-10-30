const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'current_document.xml'), 'utf8');
const paragraphs = xml.split(/<\/w:p>/);
paragraphs.forEach((p, idx) => {
  const text = p.replace(/<[^>]+>/g, '').trim();
  if (text) {
    console.log(`[Line ${idx}]: ${text}`);
  }
});
