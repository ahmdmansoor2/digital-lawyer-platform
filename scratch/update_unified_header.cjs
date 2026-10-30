const fs = require('fs');
let content = fs.readFileSync('scripts/seo/unified-header.cjs', 'utf8');
content = content.replace(
  /const WWW_GUARD_SCRIPT = '<script>[\s\S]*?<\/script><!-- www-mohami-guard -->';\r?\nconst HEADER_CSS = `\$\{WWW_GUARD_SCRIPT\}\\n<link rel="stylesheet" href="\/header\.css\?v=\$\{VERSION\}">`;/,
  'const WWW_GUARD_SCRIPT = \'\';\nconst HEADER_CSS = `<link rel="stylesheet" href="/header.css?v=${VERSION}">`;'
);
fs.writeFileSync('scripts/seo/unified-header.cjs', content, 'utf8');
console.log('unified-header updated successfully');
