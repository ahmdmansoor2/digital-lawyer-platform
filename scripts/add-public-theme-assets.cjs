const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'public');
let updated = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.html')) update(fullPath);
  }
}

function update(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  if (!original.includes('/header.css') || original.includes('/theme-toggle.js')) return;

  const injection = `\n  <link rel="stylesheet" href="/public-theme.css">\n  <script>\n    (function(){\n      var saved=localStorage.getItem('mohamidigital_theme');\n      var theme=saved==='light'||saved==='dark'?saved:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');\n      document.documentElement.dataset.publicTheme=theme;\n      document.documentElement.classList.add('public-theme-'+theme);\n      document.documentElement.style.colorScheme=theme;\n    })();\n  </script>\n  <script src="/theme-toggle.js" defer></script>\n`;
  const next = original.replace('</head>', `${injection}</head>`);
  if (next !== original) {
    fs.writeFileSync(filePath, next);
    updated += 1;
  }
}

walk(root);
console.log(`Updated ${updated} static pages.`);
