'use strict';
const fs = require('fs');

// Blog content depth audit
const blogDir = 'public/blog';
const blogFiles = fs.readdirSync(blogDir).filter(function(f) { return f.endsWith('.html') && f !== 'index.html'; });
var totalText = 0;
var thin = 0;
var veryThin = 0;
var thinList = [];

blogFiles.forEach(function(f) {
  const html = fs.readFileSync(blogDir + '/' + f, 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  totalText += text.length;
  if (text.length < 5000) { thin++; thinList.push({ f: f, len: text.length }); }
  if (text.length < 2000) veryThin++;
});

console.log('Blog articles: ' + blogFiles.length);
console.log('Avg text length: ' + Math.round(totalText / blogFiles.length) + ' chars');
console.log('Thin < 5000 chars: ' + thin);
console.log('Very thin < 2000 chars: ' + veryThin);

if (thinList.length > 0) {
  thinList.sort(function(a, b) { return a.len - b.len; });
  thinList.slice(0, 10).forEach(function(t) { console.log('  ' + t.f + ': ' + t.len + ' chars'); });
}

// AdSense check
const indexHtml = fs.readFileSync('index.html', 'utf8');
const hasAdsenseMeta = indexHtml.indexOf('google-adsense-account') !== -1;
const hasAdsenseScript = indexHtml.indexOf('pagead2.googlesyndication.com') !== -1;
console.log('\nAdSense meta tag: ' + (hasAdsenseMeta ? 'FOUND' : 'MISSING'));
console.log('AdSense script: ' + (hasAdsenseScript ? 'FOUND' : 'MISSING'));

// ads.txt
const adsTxt = fs.readFileSync('public/ads.txt', 'utf8');
console.log('ads.txt content: ' + adsTxt.trim());

// About page check
const about = fs.readFileSync('public/about.html', 'utf8');
const aboutText = about.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
console.log('\nAbout page text: ' + aboutText.length + ' chars');
console.log('Has credentials info: ' + (about.indexOf('\u0646\u0642\u0627\u0628\u0629') !== -1 ? 'YES' : 'NO'));

// Privacy policy check
const privacy = fs.readFileSync('public/privacy.html', 'utf8');
const privacyText = privacy.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
console.log('\nPrivacy policy text: ' + privacyText.length + ' chars');
const hasAdSenseInPrivacy = privacy.indexOf('AdSense') !== -1 || privacy.indexOf('adsense') !== -1;
const hasCookieInfo = privacy.indexOf('\u0643\u0648\u0643\u064a') !== -1 || privacy.indexOf('Cookie') !== -1 || privacy.indexOf('\u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641') !== -1;
const hasGoogleAds = privacy.indexOf('Google') !== -1;
console.log('Mentions AdSense/Ads: ' + (hasAdSenseInPrivacy ? 'YES' : 'NO'));
console.log('Mentions Cookies: ' + (hasCookieInfo ? 'YES' : 'NO'));
console.log('Mentions Google: ' + (hasGoogleAds ? 'YES' : 'NO'));

// Terms check
const terms = fs.readFileSync('public/terms.html', 'utf8');
const termsText = terms.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
console.log('\nTerms text: ' + termsText.length + ' chars');
