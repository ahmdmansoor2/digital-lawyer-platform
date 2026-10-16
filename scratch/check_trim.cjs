const fs = require('fs');
const content = fs.readFileSync('public/blog/inheritance-registration.html', 'utf8');
const pos15 = content.search(/<h2\b[^>]*>\s*(?:<span[^>]*>)?15[\.\s<]/i);
console.log('pos15:', pos15);
if (pos15 !== -1) {
  console.log('--- BEFORE SECTION 15 (250 chars) ---');
  console.log(content.slice(pos15 - 250, pos15));
  console.log('--- AT SECTION 15 (250 chars) ---');
  console.log(content.slice(pos15, pos15 + 250));
}

// Check where the article ends (disclaimer or related-articles or back-link)
const endMarker = content.search(/<div\s+class=["'](?:disclaimer-box|related-articles|back-link|article-footer)["']/i);
console.log('endMarker pos:', endMarker);
if (endMarker !== -1) {
  console.log('--- AROUND END MARKER (300 chars) ---');
  console.log(content.slice(endMarker, endMarker + 300));
}
