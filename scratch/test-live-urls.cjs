const https = require('https');

const pages = [
  '/',
  '/legal-consultations.html',
  '/lawyers-directory.html',
  '/e-justice-services.html',
  '/citizen-complaints.html',
  '/legal-forms.html',
  '/legal-calculators.html',
  '/court-precedents.html',
  '/courts-directory.html',
  '/company-incorporation.html',
  '/legal-diagnostics.html',
  '/legal-radar.html',
  '/pillars/',
  '/blog/',
  '/features.html',
  '/sitemap.xml',
  '/robots.txt'
];

async function checkAll() {
  console.log('=== فحص الحالة الحية لكافة بوابات وصفحات المنصة المنشورة ===\n');
  for (const p of pages) {
    const url = 'https://mohamidigital.online' + p;
    await new Promise((resolve) => {
      https.get(url, (res) => {
        const status = res.statusCode;
        const icon = status === 200 ? '✅ سليم 100%' : `❌ كود ${status}`;
        console.log(`[${status}] ${p.padEnd(32)} -> ${icon}`);
        resolve();
      }).on('error', (err) => {
        console.log(`[ERR] ${p.padEnd(32)} -> ${err.message}`);
        resolve();
      });
    });
  }
}

checkAll();
