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

  return cleaned;
}

// Test on sample radar file
const sampleRadar = fs.readFileSync('public/radar-topics/2026-10-16-turki-al-alshikh.html', 'utf8');
const cleanedRadar = removeAdSense(sampleRadar);
console.log('Original has ads:', /google-adsense-account|pagead2\.googlesyndication\.com|adsbygoogle/i.test(sampleRadar));
console.log('Cleaned has ads:', /google-adsense-account|pagead2\.googlesyndication\.com|adsbygoogle/i.test(cleanedRadar));
console.log('Diff length:', sampleRadar.length - cleanedRadar.length);

// Test on sample form file
const sampleForm = fs.readFileSync('public/legal-forms-docs/lease_contract.html', 'utf8');
const cleanedForm = removeAdSense(sampleForm);
console.log('Form original has ads:', /google-adsense-account|pagead2\.googlesyndication\.com|adsbygoogle/i.test(sampleForm));
console.log('Form cleaned has ads:', /google-adsense-account|pagead2\.googlesyndication\.com|adsbygoogle/i.test(cleanedForm));
console.log('Form diff length:', sampleForm.length - cleanedForm.length);

// Test on sample root calc file
const sampleCalc = fs.readFileSync('public/calculate-old-rent.html', 'utf8');
const cleanedCalc = removeAdSense(sampleCalc);
console.log('Calc original has ads:', /google-adsense-account|pagead2\.googlesyndication\.com|adsbygoogle/i.test(sampleCalc));
console.log('Calc cleaned has ads:', /google-adsense-account|pagead2\.googlesyndication\.com|adsbygoogle/i.test(cleanedCalc));
console.log('Calc diff length:', sampleCalc.length - cleanedCalc.length);
