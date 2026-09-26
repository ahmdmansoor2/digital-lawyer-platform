const fs = require('fs');
const path = require('path');

const srcPath = path.join('d:', 'قانوني 7', 'fazlka-news', 'sawt-misr-24-theme.xml');
let xml = fs.readFileSync(srcPath, 'utf8');

// Fix 1: AdSense script tag in head
xml = xml.replace(
  /<script async='async' crossorigin='anonymous' data-ad-client='ca-pub-7725405859334364' src='https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js'\/>/g,
  "<script async='async' crossorigin='anonymous' data-ad-client='ca-pub-7725405859334364' src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'></script>"
);

// Fix 2: <ins ... /> tags
xml = xml.replace(/<ins([^>]*?)\/>/g, '<ins$1></ins>');

// Fix 3: <i ... /> tags
xml = xml.replace(/<i([^>]*?)\/>/g, '<i$1></i>');

// Write back to all targets
fs.writeFileSync(srcPath, xml, 'utf8');

const desktopPath = path.join(process.env.USERPROFILE || 'C:\\\\Users\\\\احمد منصور', 'Desktop', 'قالب_صوت_مصر_24_الجديد.xml');
fs.writeFileSync(desktopPath, xml, 'utf8');

const brainPath = 'C:\\\\Users\\\\احمد منصور\\\\.gemini\\\\antigravity\\\\brain\\\\2b9f6bf3-866d-4977-80cf-9ae85b864176\\\\sawt_misr_24_theme.xml';
fs.writeFileSync(brainPath, xml, 'utf8');

console.log('SUCCESS: All non-void self-closing tags fixed.');
