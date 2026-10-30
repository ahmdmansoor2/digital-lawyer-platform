const fs = require('fs');

const sitemapPath = 'public/sitemap.xml';
let xml = fs.readFileSync(sitemapPath, 'utf8');

const newCalculators = [
  { url: 'https://mohamidigital.online/calculate-old-rent.html', priority: '0.90' },
  { url: 'https://mohamidigital.online/calculate-building-reconciliation.html', priority: '0.90' },
  { url: 'https://mohamidigital.online/calculate-court-fees.html', priority: '0.90' },
  { url: 'https://mohamidigital.online/calculate-prescription-periods.html', priority: '0.90' },
  { url: 'https://mohamidigital.online/calculate-attorney-fees.html', priority: '0.90' },
  { url: 'https://mohamidigital.online/calculate-traffic-compensation.html', priority: '0.90' }
];

const today = new Date().toISOString().split('T')[0];
let added = 0;
let entries = [];

newCalculators.forEach(calc => {
  if (!xml.includes(calc.url)) {
    entries.push(`  <url>
    <loc>${calc.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${calc.priority}</priority>
  </url>`);
    added++;
  }
});

if (added > 0 && xml.includes('</urlset>')) {
  xml = xml.replace('</urlset>', entries.join('\n') + '\n</urlset>');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log('✅ Added ' + added + ' new calculator URLs to public/sitemap.xml');
} else {
  console.log('Already in sitemap or error, added: ' + added);
}

const totalLocs = (xml.match(/<loc>/g) || []).length;
console.log('Total URLs now in public/sitemap.xml:', totalLocs);
