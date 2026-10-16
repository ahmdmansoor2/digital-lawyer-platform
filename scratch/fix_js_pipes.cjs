const fs = require('fs');
const path = require('path');

function fixPipesInDir(dirPath) {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));
  let fixedCount = 0;

  for (const f of files) {
    const p = path.join(dirPath, f);
    let content = fs.readFileSync(p, 'utf8');
    const original = content;

    // Process every script block that is not JSON-LD
    content = content.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, body) => {
      if (/application\/ld\+json/i.test(attrs)) return match;

      // Fix specific known broken single pipe patterns in JS
      let fixedBody = body
        // fix: localStorage.getItem(...) | '...'
        .replace(/(\.getItem\([^\)]+\))\s*\|\s*(['"\[])/g, '$1 || $2')
        // fix: .value | '' or .value.trim() | ''
        .replace(/(\.value(?:\.trim\(\))?)\s*\|\s*(['"\[])/g, '$1 || $2')
        // fix: (a | b | '')
        .replace(/(\b\w+\.\w+)\s*\|\s*(\b\w+\.\w+)\s*\|\s*(['"\[])/g, '$1 || $2 || $3')
        // fix: (l.whatsapp | l.phone | '')
        .replace(/(\b\w+\.\w+)\s*\|\s*(['"\[])/g, '$1 || $2')
        // fix: (l.specialties | [])
        .replace(/(\b\w+\.\w+)\s*\|\s*(\[\])/g, '$1 || $2')
        // fix: (!q | l.name) -> (!q || l.name)
        .replace(/(!\w+)\s*\|\s*(\w+)/g, '$1 || $2')
        // fix: (=== 'all' | l.) -> (=== 'all' || l.)
        .replace(/(=== ['"][^'"]+['"])\s*\|\s*(\w+)/g, '$1 || $2')
        // fix: (l.degree.includes(...) | l.degreeBadge)
        .replace(/(\.includes\([^\)]+\))\s*\|\s*(\w+)/g, '$1 || $2')
        // fix: (LEGAL_KNOWLEDGE[branch] | LEGAL_KNOWLEDGE.civil)
        .replace(/(\[[^\]]+\])\s*\|\s*(\w+\.\w+)/g, '$1 || $2')
        // fix: window.adsbygoogle | []
        .replace(/(window\.adsbygoogle)\s*\|\s*(\[\])/g, '$1 || $2')
        // fix: remaining safe JS logical pipe pattern: variable | 'fallback'
        .replace(/\b([a-zA-Z0-9_\)\]])\s*\|\s*(['"\[\{]|true|false|null|undefined)/g, '$1 || $2');

      return `<script${attrs}>${fixedBody}</script>`;
    });

    if (content !== original) {
      fs.writeFileSync(p, content, 'utf8');
      fixedCount++;
      console.log(`Fixed JS pipes in: ${f}`);
    }
  }

  return { dir: dirPath, fixedCount, total: files.length };
}

console.log('Fixing public/*.html...');
const resPublic = fixPipesInDir('public');
console.log(`Result: ${resPublic.fixedCount}/${resPublic.total} files fixed in public.`);

console.log('Fixing public/pillars/*.html...');
const resPillars = fixPipesInDir('public/pillars');
console.log(`Result: ${resPillars.fixedCount}/${resPillars.total} files fixed in public/pillars.`);
