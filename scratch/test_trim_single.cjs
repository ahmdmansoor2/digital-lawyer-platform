const fs = require('fs');
const path = require('path');

const file = 'public/blog/inheritance-registration.html';
let content = fs.readFileSync(file, 'utf8');

const initialLength = content.length;
const pos15 = content.search(/<h2\b[^>]*>\s*(?:<span[^>]*>)?15[\.\s<]/i);
const endMarkerMatch = content.slice(pos15).search(/<div\s+class=["'](?:disclaimer-box|related-articles|back-link)["']/i);

if (pos15 !== -1 && endMarkerMatch !== -1) {
  const cutEnd = pos15 + endMarkerMatch;
  const trimmed = content.slice(0, pos15).trimEnd() + '\n\n      ' + content.slice(cutEnd);
  console.log('Original length:', initialLength);
  console.log('Trimmed length:', trimmed.length);
  console.log('Reduction:', initialLength - trimmed.length, 'chars');
  
  // Verify structure
  const h2After = trimmed.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi) || [];
  console.log('H2 count after trim:', h2After.length);
}
