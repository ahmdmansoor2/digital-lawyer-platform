const fs = require('fs');

const log = JSON.parse(fs.readFileSync('scripts/published-log.json', 'utf8'));
console.log('Type of log:', Array.isArray(log) ? 'array' : typeof log);
if (Array.isArray(log)) {
  console.log('Length:', log.length);
} else {
  console.log('Keys:', Object.keys(log).slice(0, 10));
}

// Find scripts mentioning index.html in scripts/
function findInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = dir + '/' + f;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!full.includes('node_modules') && !full.includes('.git')) {
        findInDir(full);
      }
    } else if (f.endsWith('.js') || f.endsWith('.cjs')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('blog/index.html') || content.includes('blog-index') || content.includes('updateBlogIndex') || content.includes('renderBlogIndex')) {
        console.log('Match script:', full);
      }
    }
  }
}
findInDir('scripts');
