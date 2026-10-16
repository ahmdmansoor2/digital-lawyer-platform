const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
console.log('Root directory:', ROOT);

// Helper to recursively find all HTML files
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    if (['node_modules', '.git', 'dist', 'dist-legacy'].includes(item.name)) continue;
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getHtmlFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

// -------------------------------------------------------------
// TASK 1: Strip www-mohami-guard inline JS redirect from all HTML files
// -------------------------------------------------------------
console.log('\n--- TASK 1: Removing www-mohami-guard from all HTML files ---');
const allHtmlFiles = getHtmlFiles(ROOT);
let guardRemovedCount = 0;

for (const file of allHtmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('www-mohami-guard')) {
    // Regex matching the script tag and the comment
    const newContent = content.replace(
      /<script[^>]*>if\s*\(\s*location\.hostname\s*===\s*["']www\.mohamidigital\.online["']\s*\)\s*location\.replace\([^)]+\)\s*;?<\/script>\s*<!--\s*www-mohami-guard\s*-->/gi,
      ''
    ).replace(/<!--\s*www-mohami-guard\s*-->/gi, '');
    
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      guardRemovedCount++;
    }
  }
}
console.log(`Successfully removed www-mohami-guard from ${guardRemovedCount} files.`);

// -------------------------------------------------------------
// TASK 2: Clean index.html (remove cloaked noscript / display:none)
// -------------------------------------------------------------
console.log('\n--- TASK 2: Cleaning index.html ---');
const indexHtmlPath = path.join(ROOT, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let idx = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Remove any remaining www-mohami-guard
  idx = idx.replace(/<script[^>]*>if\s*\(\s*location\.hostname[\s\S]*?<\/script><!--\s*www-mohami-guard\s*-->/gi, '');

  // Remove the duplicate cloaked <noscript><style>#root { display: none !important; }</style>... block
  const noscriptCloakRegex = /<!--\s*Fallback HTML[\s\S]*?<noscript>[\s\S]*?#root\s*\{\s*display:\s*none\s*!important;\s*\}[\s\S]*?<\/noscript>/gi;
  if (noscriptCloakRegex.test(idx)) {
    idx = idx.replace(noscriptCloakRegex, '');
    console.log('Removed cloaked noscript fallback with #root display:none from index.html.');
  } else {
    // Alternative match if comment differs
    const noscriptStyleRegex = /<noscript>\s*<style>\s*#root\s*\{\s*display:\s*none\s*!important;\s*\}[\s\S]*?<\/noscript>/gi;
    if (noscriptStyleRegex.test(idx)) {
      idx = idx.replace(noscriptStyleRegex, '');
      console.log('Removed noscript style display:none block from index.html.');
    }
  }
  
  fs.writeFileSync(indexHtmlPath, idx, 'utf8');
  console.log('index.html cleaned successfully.');
}

// -------------------------------------------------------------
// TASK 3: Fix Service Worker (public/sw.js)
// -------------------------------------------------------------
console.log('\n--- TASK 3: Updating Service Worker (public/sw.js) ---');
const swPath = path.join(ROOT, 'public', 'sw.js');
if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  
  // Bump version to mohami-v12
  sw = sw.replace(/const VERSION = 'mohami-v\d+';/, "const VERSION = 'mohami-v12';");

  // Fix networkFirst for navigation: DO NOT pass '/' as fallback!
  // Instead pass null or handle navigation failure cleanly so missing subpages return real 404 rather than homepage
  sw = sw.replace(/e\.respondWith\(networkFirst\(req,\s*'[/]'\)\);/, `// Don't fallback to '/' for missing subpages to prevent Soft 404 / 'Alternate page with proper canonical tag'
    e.respondWith(networkFirst(req, null));`);

  fs.writeFileSync(swPath, sw, 'utf8');
  console.log('sw.js updated: bumped to mohami-v12 and removed "/" fallback for subpage navigation.');
}

// -------------------------------------------------------------
// TASK 4: Radar topics & system pages noindex, nofollow
// -------------------------------------------------------------
console.log('\n--- TASK 4: Purging radar-topics & system pages from indexing ---');
const radarDir = path.join(ROOT, 'public', 'radar-topics');
let radarNoindexCount = 0;
if (fs.existsSync(radarDir)) {
  const radarFiles = fs.readdirSync(radarDir).filter(f => f.endsWith('.html'));
  for (const f of radarFiles) {
    const p = path.join(radarDir, f);
    let html = fs.readFileSync(p, 'utf8');
    if (html.includes('name="robots"')) {
      html = html.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '<meta name="robots" content="noindex, nofollow" />');
    } else {
      html = html.replace(/<head>/i, '<head>\n  <meta name="robots" content="noindex, nofollow" />');
    }
    fs.writeFileSync(p, html, 'utf8');
    radarNoindexCount++;
  }
}
console.log(`Injected noindex, nofollow into ${radarNoindexCount} radar-topics files.`);

// Update generate-radar.cjs so future radar topics are generated with noindex, nofollow
const genRadarScript = path.join(ROOT, 'scripts', 'seo', 'generate-radar.cjs');
if (fs.existsSync(genRadarScript)) {
  let gr = fs.readFileSync(genRadarScript, 'utf8');
  gr = gr.replace(
    /<meta name="robots" content="index, follow, max-image-preview:large" \/>/g,
    '<meta name="robots" content="noindex, nofollow" />'
  );
  fs.writeFileSync(genRadarScript, gr, 'utf8');
  console.log('Updated generate-radar.cjs to set noindex, nofollow on future radar topics.');
}

// Inject noindex, nofollow to system pages (search.html, 404.html, sitemap.html)
const systemPages = ['search.html', '404.html', 'sitemap.html'];
for (const sp of systemPages) {
  const spPath = path.join(ROOT, 'public', sp);
  if (fs.existsSync(spPath)) {
    let sHtml = fs.readFileSync(spPath, 'utf8');
    if (sHtml.includes('name="robots"')) {
      sHtml = sHtml.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '<meta name="robots" content="noindex, nofollow" />');
    } else {
      sHtml = sHtml.replace(/<head>/i, '<head>\n  <meta name="robots" content="noindex, nofollow" />');
    }
    fs.writeFileSync(spPath, sHtml, 'utf8');
    console.log(`Added noindex, nofollow to ${sp}`);
  }
}

// -------------------------------------------------------------
// TASK 5: Deduplicate Schema & Clean HTML in Blog Articles
// -------------------------------------------------------------
console.log('\n--- TASK 5: Deduplicating schemas and cleaning blog articles ---');
const blogDir = path.join(ROOT, 'public', 'blog');
let cleanedBlogFiles = 0;

if (fs.existsSync(blogDir)) {
  const bFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.html') && f !== 'index.html');
  for (const bf of bFiles) {
    const bfPath = path.join(blogDir, bf);
    let html = fs.readFileSync(bfPath, 'utf8');
    let modified = false;

    // 1. Remove duplicate header.css
    if ((html.match(/<link\s+rel=["']stylesheet["']\s+href=["']\/header\.css[^"']*["']>/gi) || []).length > 1) {
      let first = true;
      html = html.replace(/<link\s+rel=["']stylesheet["']\s+href=["']\/header\.css[^"']*["']>\s*/gi, (match) => {
        if (first) { first = false; return match; }
        return '';
      });
      modified = true;
    }

    // 2. Fix title "| | المحامي الرقمي" or "| |"
    if (html.includes('| |')) {
      html = html.replace(/\|\s*\|\s*/g, '| ');
      modified = true;
    }

    // 3. Fix duplicate NewsArticle JSON-LD blocks
    // If there are multiple <script type="application/ld+json"> with "NewsArticle", keep only the first valid one!
    const schemaMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    let seenNewsArticle = false;
    let newHtml = html;

    for (const sm of schemaMatches) {
      const fullScriptTag = sm[0];
      const jsonContent = sm[1];
      if (jsonContent.includes('"NewsArticle"') || jsonContent.includes('NewsArticle')) {
        if (seenNewsArticle) {
          // Remove duplicate!
          newHtml = newHtml.replace(fullScriptTag, '');
          modified = true;
        } else {
          seenNewsArticle = true;
        }
      }
    }
    if (newHtml !== html) {
      html = newHtml;
    }

    // 4. Convert raw **markdown** bolding in article body into <strong>
    if (/\*\*[^\*]+\*\*/.test(html)) {
      html = html.replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(bfPath, html, 'utf8');
      cleanedBlogFiles++;
    }
  }
}
console.log(`Cleaned HTML, CSS, Title, and Schema duplicates across ${cleanedBlogFiles} blog articles.`);

console.log('\n--- ALL PRELIMINARY TASKS COMPLETE ---');
