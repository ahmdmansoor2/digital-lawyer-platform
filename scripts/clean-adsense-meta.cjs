const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');

function cleanMetaAndKeywords(content, title) {
  // 1. Clean up duplicate article:author and other meta properties
  // Find all article:* meta tags
  let seen = new Set();
  content = content.replace(/<meta\s+property=["']article:([a-z_]+)["']\s+content=["']([^"']*)["']\s*\/?>/gi, (match, prop, val) => {
    const key = `article:${prop}:${val}`;
    if (seen.has(key)) return '';
    seen.add(key);
    return match;
  });

  // 2. Fix stuffed meta keywords: keep at most 8 keywords
  content = content.replace(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']\s*\/?>/i, (match, kwContent) => {
    const kws = kwContent.split(/[،,]/).map(k => k.trim()).filter(Boolean);
    const uniqueKws = Array.from(new Set(kws)).slice(0, 7);
    return `<meta name="keywords" content="${uniqueKws.join('، ')}" />`;
  });

  // 3. Remove empty whitespace/newlines in head created by removals
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  return content;
}

// Clean all blog files
const blogFiles = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));
let modifiedBlog = 0;

for (const f of blogFiles) {
  const filePath = path.join(BLOG_DIR, f);
  const oldContent = fs.readFileSync(filePath, 'utf8');
  const newContent = cleanMetaAndKeywords(oldContent, f);
  if (newContent !== oldContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    modifiedBlog++;
  }
}

console.log(`Cleaned ${modifiedBlog} blog articles.`);

// Clean all pillar files if exists
if (fs.existsSync(PILLARS_DIR)) {
  const pillarFiles = fs.readdirSync(PILLARS_DIR).filter(f => f.endsWith('.html'));
  let modifiedPillars = 0;
  for (const f of pillarFiles) {
    const filePath = path.join(PILLARS_DIR, f);
    const oldContent = fs.readFileSync(filePath, 'utf8');
    const newContent = cleanMetaAndKeywords(oldContent, f);
    if (newContent !== oldContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      modifiedPillars++;
    }
  }
  console.log(`Cleaned ${modifiedPillars} pillar guides.`);
}
