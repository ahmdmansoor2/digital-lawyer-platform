'use strict';
// Inject robots meta tag into all blog articles missing it
const fs = require('fs');
const path = require('path');

const ROBOTS_META = '    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />';
const blogDir = path.join(__dirname, '..', '..', 'public', 'blog');

const files = fs.readdirSync(blogDir).filter(function(f) {
  return f.endsWith('.html') && f !== 'index.html';
});

let fixed = 0;
let skipped = 0;

files.forEach(function(f) {
  const filePath = path.join(blogDir, f);
  const html = fs.readFileSync(filePath, 'utf8');

  const hasRobots = html.indexOf('name="robots"') !== -1 || html.indexOf("name='robots'") !== -1;
  if (hasRobots) {
    skipped++;
    return;
  }

  // Insert after <meta name="viewport" or after <title> or before </head>
  let newHtml;
  const viewportIdx = html.indexOf('<meta name="viewport"');
  const titleEndIdx = html.indexOf('</title>');
  const headEndIdx = html.indexOf('</head>');

  if (viewportIdx !== -1) {
    // Insert right after the viewport meta tag line
    const lineEnd = html.indexOf('\n', viewportIdx);
    if (lineEnd !== -1) {
      newHtml = html.slice(0, lineEnd + 1) + ROBOTS_META + '\n' + html.slice(lineEnd + 1);
    } else {
      newHtml = html.slice(0, viewportIdx + html.slice(viewportIdx).indexOf('>') + 1) + '\n' + ROBOTS_META + '\n' + html.slice(viewportIdx + html.slice(viewportIdx).indexOf('>') + 1);
    }
  } else if (titleEndIdx !== -1) {
    newHtml = html.slice(0, titleEndIdx + 8) + '\n' + ROBOTS_META + html.slice(titleEndIdx + 8);
  } else if (headEndIdx !== -1) {
    newHtml = html.slice(0, headEndIdx) + ROBOTS_META + '\n' + html.slice(headEndIdx);
  } else {
    console.log('WARNING: Could not find insertion point in ' + f);
    skipped++;
    return;
  }

  fs.writeFileSync(filePath, newHtml, 'utf8');
  fixed++;
  if (fixed <= 5) console.log('Fixed: ' + f);
});

console.log('\nBlog robots meta injection complete:');
console.log('Fixed: ' + fixed + ' articles');
console.log('Already had robots: ' + skipped + ' articles');
