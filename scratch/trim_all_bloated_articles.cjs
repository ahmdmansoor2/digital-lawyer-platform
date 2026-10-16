const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'public', 'blog');
const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');

let trimmedCount = 0;
let totalCharsSaved = 0;
const trimmedFiles = [];

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const h2Matches = content.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi) || [];
  if (h2Matches.length >= 20) {
    // Find the 15th section (or 16th if 15 is missing)
    const pos15 = content.search(/<h2\b[^>]*>\s*(?:<span[^>]*>)?15[\.\s<]/i);
    if (pos15 !== -1) {
      const remaining = content.slice(pos15);
      const endMarkerMatch = remaining.search(/<div\s+class=["'](?:disclaimer-box|related-articles|back-link|article-footer)["']/i);
      if (endMarkerMatch !== -1) {
        const cutEnd = pos15 + endMarkerMatch;
        const beforeCut = content.slice(0, pos15).trimEnd();
        const afterCut = content.slice(cutEnd);
        const trimmed = beforeCut + '\n\n      ' + afterCut;

        const saved = content.length - trimmed.length;
        if (saved > 5000) {
          fs.writeFileSync(filePath, trimmed, 'utf8');
          trimmedCount++;
          totalCharsSaved += saved;
          trimmedFiles.push({ file, saved, beforeH2: h2Matches.length });
        }
      }
    }
  }
}

console.log(`\n=== تم تشذيب المقالات المتضخمة (Content Stuffing Trim) ===`);
console.log(`عدد المقالات التي تم تشذيبها: ${trimmedCount}`);
console.log(`إجمالي الحروف والمحتوى المكرر المحذوف: ${totalCharsSaved.toLocaleString()} حرفاً (~${Math.round(totalCharsSaved / 7).toLocaleString()} كلمة)`);
trimmedFiles.forEach((x, i) => {
  console.log(`${i + 1}. ${x.file}: قل من ${x.beforeH2} عنوان إلى 14 عنوان (تم توفير ${x.saved.toLocaleString()} حرفاً)`);
});
