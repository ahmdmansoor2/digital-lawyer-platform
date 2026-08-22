const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Ensure header.css is linked
  if (!content.includes('/header.css')) {
    content = content.replace('</head>', '  <link rel="stylesheet" href="/header.css?v=20260823-v1" />\n</head>');
    changed = true;
  }

  // 2. If body has solid background in inline style, replace with transparent
  if (content.includes('background: var(--bg);')) {
    content = content.replace(/background:\s*var\(--bg\);/g, 'background: transparent;');
    changed = true;
  }
  if (content.includes('background-color: #0f172a;')) {
    content = content.replace(/background-color:\s*#0f172a;/g, 'background-color: transparent;');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated background in: ${path.relative(publicDir, filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      // Don't modify chunks or legacy
      if (f !== 'data' && f !== 'books' && f !== 'dist-legacy') {
        walkDir(full);
      }
    } else if (f.endsWith('.html')) {
      processFile(full);
    }
  }
}

walkDir(publicDir);
console.log('✅ Background unification completed successfully across all HTML pages!');
