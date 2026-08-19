/**
 * update-legal-library-urls.cjs — يحدّث legal-library.html لاستخدام روابط Internet Archive
 * - يستبدل /books/<name> بـ https://archive.org/download/mohamidigital-library/<name>
 * - يستبدل /data/library-docs-chunks/<name> بـ https://archive.org/download/mohamidigital-library/chunks/<name>
 */
const fs = require('fs');

const FILE = 'D:\\قانوني 7\\public\\legal-library.html';
const IA_BASE = 'https://archive.org/download/mohamidigital-library';

let content = fs.readFileSync(FILE, 'utf8');
const before = content;

// استبدال روابط الكتب
const bookPattern = /(['"\(])(\/books\/[^'"")\s]+\.pdf)(['"\)?])/g;
let bookCount = 0;
content = content.replace(bookPattern, (match, prefix, path, suffix) => {
  const filename = path.replace('/books/', '');
  bookCount++;
  return prefix + IA_BASE + '/' + filename + suffix;
});

// استبدال روابط الـ chunks
const chunkPattern = /(['"\(])(\/data\/library-docs-chunks\/[^'"")\s]+)(\?[^'"\s]*)?(['"\)?])/g;
let chunkCount = 0;
content = content.replace(chunkPattern, (match, prefix, path, query, suffix) => {
  const filepath = path.replace('/data/library-docs-chunks/', 'chunks/');
  chunkCount++;
  return prefix + IA_BASE + '/' + filepath + (query || '') + suffix;
});

if (content === before) {
  console.log('No changes made.');
} else {
  fs.writeFileSync(FILE, content, 'utf8');
  console.log('=== Updated legal-library.html ===');
  console.log('  Book references updated: ' + bookCount);
  console.log('  Chunk references updated: ' + chunkCount);
  console.log('  File: ' + FILE);
  console.log('  Size: ' + content.length + ' bytes');
}
