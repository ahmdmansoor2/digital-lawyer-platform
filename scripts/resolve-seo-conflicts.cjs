/**
 * resolve-seo-conflicts.cjs — يحل تعارضات Git في <script type="application/ld+json">
 * الاستراتيجية: نأخذ من remote لكن نضيف حقول keywords إذا كانت مفقودة
 */
const fs = require('fs');
const path = require('path');

function getAllConflictedFiles(root) {
  const result = [];
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.isFile() && e.name.endsWith('.html')) {
        const c = fs.readFileSync(f, 'utf8');
        if (c.includes('<<<<<<<') || c.includes('=======') || c.includes('>>>>>>>')) {
          result.push(f);
        }
      }
    }
  }
  walk(root);
  return result;
}

function resolveConflict(content) {
  // Find all conflict blocks and resolve them
  while (true) {
    const start = content.indexOf('<<<<<<<');
    if (start === -1) break;
    const sep1 = content.indexOf('=======', start);
    const end = content.indexOf('>>>>>>>', sep1);
    if (sep1 === -1 || end === -1) break;
    // Extract both sides
    const ourSide = content.substring(start + ('<<<<<<< HEAD').length, sep1).trim();
    const theirSide = content.substring(sep1 + ('=======').length, end).trim();
    // Resolve: prefer "theirs" (theirsSide) for content, but ensure keywords is present
    let chosen = theirSide;
    // If ours has a more complete Organization JSON-LD (with keywords), merge it
    // Try to detect: if theirs has Organization without keywords and ours has it with keywords, use ours
    const oursHasKeywords = /"keywords"\s*:\s*\[/.test(ourSide);
    const theirsHasKeywords = /"keywords"\s*:\s*\[/.test(theirSide);
    if (oursHasKeywords && !theirsHasKeywords) {
      // Try to extract keywords from ours and add to theirs
      const kwMatch = ourSide.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);
      if (kwMatch) {
        // Insert keywords into their Organization JSON-LD
        chosen = theirSide.replace(
          /(<script type="application\/ld\+json">\{[^<]*"name":\s*"منصة المحامي الرقمية"[^<]*?)\}/,
          `$1, "keywords": [${kwMatch[1]}]}`
        );
        // If no match, just use ours
        if (chosen === theirSide) {
          chosen = ourSide;
        }
      } else {
        chosen = ourSide;
      }
    }
    // Replace the conflict block
    content = content.substring(0, start) + chosen + content.substring(end + ('>>>>>>>').length);
  }
  return content;
}

const root = 'D:\\قانوني 7\\public';
const files = getAllConflictedFiles(root);
console.log('Found ' + files.length + ' conflicted files');

let resolved = 0;
let errors = 0;
for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    const resolved_content = resolveConflict(content);
    if (resolved_content !== content) {
      fs.writeFileSync(f, resolved_content, 'utf8');
      resolved++;
      console.log('  [OK] ' + path.relative(root, f));
    }
  } catch (e) {
    console.log('  [ERR] ' + path.relative(root, f) + ': ' + e.message);
    errors++;
  }
}

console.log('');
console.log('Resolved: ' + resolved);
console.log('Errors: ' + errors);

// Verify no more conflicts
const remaining = getAllConflictedFiles(root);
console.log('Remaining conflicts: ' + remaining.length);
