const fs = require('fs');
const path = require('path');

const v4Path = path.join(__dirname, 'extracted_v4', 'index.html');
let html = fs.readFileSync(v4Path, 'utf8');

// 1. Remove hardcoded index-CksdLoUk.css lines
html = html.replace(/<link rel="stylesheet" crossorigin href="\/assets\/index-CksdLoUk\.css" media="print" onload="this\.media='all'" \/>\s*<noscript><link rel="stylesheet" crossorigin href="\/assets\/index-CksdLoUk\.css" \/><\/noscript>/g, '');

// 2. In the toggle script, remove the hardcoded modulepreloads and script injection of index-DRT7DlW7.js
const oldLoadBundle = /function loadReactBundle\(\) \{[\s\S]*?s\.src = '\/assets\/index-DRT7DlW7\.js';\s*document\.body\.appendChild\(s\);\s*\}/;
html = html.replace(oldLoadBundle, 'function loadReactBundle() { reactBundleLoaded = true; }');

// 3. Make sure /src/main.tsx is imported
if (!html.includes('/src/main.tsx')) {
  html = html.replace('</body>', '    <script type="module" src="/src/main.tsx"></script>\n  </body>');
}

// 4. Clean duplicate scripts before </body>
html = html.replace(/(<script src="\/sidebar\.js[^>]*><\/script>\s*<script src="\/mobile-dock\.js[^>]*><\/script>\s*)+/g, '<script src="/sidebar.js?v=20261016" defer></script>\n    <script src="/mobile-dock.js?v=20261016" defer></script>\n  ');

fs.writeFileSync(path.join(__dirname, '..', 'index.html'), html, 'utf8');
console.log('Successfully updated root index.html with public portal and Vite module!');
