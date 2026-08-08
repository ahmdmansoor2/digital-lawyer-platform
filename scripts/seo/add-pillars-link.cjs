#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const PILLARS_LINK = '<li><a href="/pillars/">المراجع القانونية</a></li>';
const BLOG_LINK = '<li><a href="/blog/">المدونة القانونية</a></li>';

const files = ['about.html', 'contact.html', 'features.html', 'pricing.html', 'privacy.html', 'terms.html'];
let updated = 0;

for (const f of files) {
  const p = path.join(PUBLIC_DIR, f);
  let html = fs.readFileSync(p, 'utf8');
  if (html.includes('المراجع القانونية')) {
    console.log(`⊘ ${f}: اللينك موجود بالفعل`);
    continue;
  }
  if (html.includes(BLOG_LINK)) {
    html = html.replace(BLOG_LINK, `${BLOG_LINK}\n            ${PILLARS_LINK}`);
    fs.writeFileSync(p, html, 'utf8');
    updated++;
    console.log(`✓ ${f}`);
  } else {
    console.log(`⚠ ${f}: مفيش رابط مدونة — لم أضف`);
  }
}
console.log(`\nتم: ${updated}/${files.length}`);
