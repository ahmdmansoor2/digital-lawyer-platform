const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const fbPath = path.join(__dirname, '..', 'firebase.json');

console.log('=== تشخيص SEO الحي والآمن لمجلد dist ومطابقته مع firebase.json ===\n');

// 1. Read firebase redirects
const fbData = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
const redirects = fbData.hosting?.[0]?.redirects || [];
const redirectMap = new Map();
redirects.forEach(r => {
  if (r.source) redirectMap.set(r.source, r.destination);
});
console.log(`✓ عدد قواعد التحويل 301 في firebase.json: ${redirectMap.size}`);

// 2. Audit sitemap.xml vs redirects
const sitemapPath = path.join(distDir, 'sitemap.xml');
let sitemapCollisions = [];
if (fs.existsSync(sitemapPath)) {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const locs = (xml.match(/<loc>(.*?)<\/loc>/g) || []).map(l => l.replace(/<\/?loc>/g, '').trim());
  console.log(`✓ عدد روابط sitemap.xml الحية: ${locs.length}`);

  locs.forEach(url => {
    let p = url.replace('https://mohamidigital.online', '');
    if (!p) p = '/';
    if (redirectMap.has(p)) {
      sitemapCollisions.push({ url, target: redirectMap.get(p) });
    }
  });

  console.log(`✓ تصادمات تحويلات الـ 301 داخل sitemap.xml: ${sitemapCollisions.length}`);
  sitemapCollisions.slice(0, 10).forEach(c => {
    console.log(`   ❌ ${c.url} -> يحوّل إلى ${c.target}`);
  });
}

// 3. Check for client-side location.replace in dist/
let clientRedirects = [];
function checkHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      checkHtmlFiles(full);
    } else if (f.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('location.replace(') && !f.includes('scratch')) {
        clientRedirects.push(path.relative(distDir, full));
      }
    }
  }
}
checkHtmlFiles(distDir);
console.log(`\n✓ ملفات تحتوي على location.replace في dist: ${clientRedirects.length} (${clientRedirects.join(', ') || 'لا يوجد'})`);

console.log('\n=== انتهاء الفحص بنجاح ===');
