const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const targets = [
  path.join(ROOT, 'public', 'books'),
  path.join(ROOT, 'dist', 'books'),
  path.join(ROOT, '_temp_dist_books'),
  path.join(ROOT, 'public', 'library-pdfs'),
  path.join(ROOT, 'dist', 'library-pdfs'),
  path.join(ROOT, 'public', 'legal-library-topics'),
  path.join(ROOT, 'dist', 'legal-library-topics'),
  path.join(ROOT, 'public', 'data', 'legal-catalog.json'),
  path.join(ROOT, 'dist', 'data', 'legal-catalog.json'),
  path.join(ROOT, 'public', 'data', 'legal-catalog-summary.json'),
  path.join(ROOT, 'dist', 'data', 'legal-catalog-summary.json'),
  path.join(ROOT, 'public', 'data', 'library-docs-chunks'),
  path.join(ROOT, 'dist', 'data', 'library-docs-chunks'),
  path.join(ROOT, 'public', 'data', 'legal-library-stats.json'),
  path.join(ROOT, 'dist', 'data', 'legal-library-stats.json'),
  path.join(ROOT, 'public', 'legal-library.html'),
  path.join(ROOT, 'dist', 'legal-library.html'),
  path.join(ROOT, '_backup_legal_library'),
  path.join(ROOT, '.github', 'workflows', 'legal-library-update.yml')
];

let freedBytes = 0;

targets.forEach(t => {
  if (fs.existsSync(t)) {
    try {
      const stat = fs.statSync(t);
      if (stat.isDirectory()) {
        fs.rmSync(t, { recursive: true, force: true });
        console.log(`🗑️ Removed directory: ${path.relative(ROOT, t)}`);
      } else {
        freedBytes += stat.size;
        fs.unlinkSync(t);
        console.log(`🗑️ Removed file: ${path.relative(ROOT, t)}`);
      }
    } catch (e) {
      console.warn(`⚠️ Could not remove ${t}:`, e.message);
    }
  }
});

console.log('✅ Legal library completely removed from filesystem.');
