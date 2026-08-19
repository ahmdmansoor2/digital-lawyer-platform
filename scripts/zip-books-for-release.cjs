/**
 * zip-books-for-release.cjs — يحزّم مجلد books إلى عدة zip parts (≤ 1.8 GB)
 * للاستخدام مع GitHub Release لتغذية GitHub Actions
 *
 * الاستخدام:
 *   node scripts/zip-books-for-release.cjs                    # افتراضي
 *   node scripts/zip-books-for-release.cjs --max-size 1500   # حجم أقصى بـ MB
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const maxSizeMB = (() => {
  const idx = args.indexOf('--max-size');
  return idx > -1 ? parseInt(args[idx + 1], 10) : 1800; // 1.8 GB default
})();
const maxSize = maxSizeMB * 1024 * 1024;

const BOOKS_DIR = 'D:\\قانوني 7\\public\\books';
const OUT_DIR = 'D:\\قانوني 7\\.ia-release-cache';

if (!fs.existsSync(BOOKS_DIR)) {
  console.error('BOOKS_DIR not found: ' + BOOKS_DIR);
  process.exit(1);
}
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(BOOKS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
const fileSizes = files.map(f => ({ name: f, size: fs.statSync(path.join(BOOKS_DIR, f)).size }));
const totalSize = fileSizes.reduce((s, f) => s + f.size, 0);

console.log('Books: ' + files.length);
console.log('Total size: ' + (totalSize / 1024 / 1024).toFixed(1) + ' MB (' + (totalSize / 1024 / 1024 / 1024).toFixed(2) + ' GB)');
console.log('Max part size: ' + maxSizeMB + ' MB');
console.log('');

// greedy: رتّب أبجدياً (يحافظ على الترتيب)، احشر أكبر ملف ممكن في كل جزء
fileSizes.sort((a, b) => b.size - a.size); // الأكبر أولاً (bin packing)

const parts = [];
let current = { files: [], size: 0 };
for (const f of fileSizes) {
  if (current.size + f.size > maxSize && current.files.length > 0) {
    parts.push(current);
    current = { files: [], size: 0 };
  }
  current.files.push(f.name);
  current.size += f.size;
}
if (current.files.length > 0) parts.push(current);

console.log('Parts: ' + parts.length);
parts.forEach((p, i) => console.log('  Part ' + (i + 1) + ': ' + p.files.length + ' files, ' + (p.size / 1024 / 1024).toFixed(1) + ' MB'));

// إنشاء قائمة الملفات
const manifest = {
  created: new Date().toISOString(),
  totalFiles: files.length,
  totalSizeBytes: totalSize,
  parts: parts.map((p, i) => ({
    name: 'books-part-' + String(i + 1).padStart(3, '0') + '.zip',
    fileCount: p.files.length,
    sizeBytes: p.size,
    files: p.files
  }))
};
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('');
console.log('Manifest: ' + path.join(OUT_DIR, 'manifest.json'));
console.log('');
console.log('Run PowerShell command:');
parts.forEach((p, i) => {
  const partName = 'books-part-' + String(i + 1).padStart(3, '0') + '.zip';
  // Compress-Archive: بطيئة على 1.5 GB. استخدم 7z لو متاح.
  console.log('  Compress-Archive -Path "' + BOOKS_DIR + '\\<file>" -DestinationPath "' + path.join(OUT_DIR, partName) + '" -Force');
});
console.log('');
console.log('Or use 7z (faster):');
parts.forEach((p, i) => {
  const partName = 'books-part-' + String(i + 1).padStart(3, '0') + '.7z';
  const fileList = p.files.map(f => '"' + f + '"').join(' ');
  console.log('  7z a -t7z -mx=3 "' + path.join(OUT_DIR, partName) + '" ' + fileList);
});
