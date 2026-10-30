const fs = require('fs');
const path = require('path');

function removeAdSense(html) {
  let cleaned = html;

  // 1. Remove meta tag
  cleaned = cleaned.replace(/<meta\s+name=["']google-adsense-account["']\s+content=["']ca-pub-7725405859334364["']\s*\/?>\r?\n?/gi, '');

  // 2. Remove script tag for adsbygoogle.js
  cleaned = cleaned.replace(/<script\s+async\s+src=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-7725405859334364["']\s+crossorigin=["']anonymous["']><\/script>\r?\n?/gi, '');
  cleaned = cleaned.replace(/<script\s+async\s+crossorigin=["']anonymous["']\s+src=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-7725405859334364["']><\/script>\r?\n?/gi, '');

  // 3. Remove ad-slot containers and content-ad containers
  cleaned = cleaned.replace(/<!--\s*(?:TOP|BOTTOM|MIDDLE|CONTENT)?\s*AD\s*-->\r?\n?\s*<div\s+class=["'](?:ad-slot|content-ad|sidebar-ad)["'][^>]*>[\s\S]*?<\/div>\r?\n?/gi, '');
  
  // 4. Remove any remaining ad-slot or content-ad divs containing adsbygoogle
  cleaned = cleaned.replace(/<div\s+class=["'][^"']*(?:ad-slot|content-ad)[^"']*["'][^>]*>[\s\S]*?<ins\s+class=["']adsbygoogle["'][\s\S]*?<\/div>\r?\n?/gi, '');

  // 5. Remove any standalone ins and push script
  cleaned = cleaned.replace(/<ins\s+class=["']adsbygoogle["'][\s\S]*?<\/ins>\r?\n?\s*<script>\s*\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{\}\);\s*<\/script>\r?\n?/gi, '');

  // 6. Remove any remaining standalone ins tag
  cleaned = cleaned.replace(/<ins\s+class=["']adsbygoogle["'][\s\S]*?<\/ins>\r?\n?/gi, '');

  // 7. Remove any remaining standalone push script
  cleaned = cleaned.replace(/<script>\s*\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{\}\);\s*<\/script>\r?\n?/gi, '');

  return cleaned;
}

const targetDirs = [
  'public/radar-topics',
  'public/courts',
  'public/lawyers',
  'public/legal-forms-docs',
  'public/newsletter'
];

let modifiedCount = 0;

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  files.forEach(f => {
    const full = path.join(dir, f);
    const original = fs.readFileSync(full, 'utf8');
    const cleaned = removeAdSense(original);
    if (cleaned !== original) {
      fs.writeFileSync(full, cleaned, 'utf8');
      modifiedCount++;
    }
  });
});

// Clean root HTML files (EXCEPT index.html)
const rootFiles = fs.readdirSync('public').filter(f => f.endsWith('.html') && f !== 'index.html');
rootFiles.forEach(f => {
  const full = path.join('public', f);
  const original = fs.readFileSync(full, 'utf8');
  const cleaned = removeAdSense(original);
  if (cleaned !== original) {
    fs.writeFileSync(full, cleaned, 'utf8');
    modifiedCount++;
  }
});

console.log(`Successfully cleaned AdSense from ${modifiedCount} files!`);
