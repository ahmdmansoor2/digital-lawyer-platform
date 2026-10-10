'use strict';
const https = require('https');

function check(url) {
  https.get(url, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('URL:', url);
      console.log('  Status:', res.statusCode);
      console.log('  Length:', d.length);
      const title = d.match(/<title>([^<]+)<\/title>/i);
      console.log('  Title:', title ? title[1] : 'None');
      const canonical = d.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
      console.log('  Canonical:', canonical ? canonical[1] : 'None');
      const is404 = d.includes('404') && (d.includes('الصفحة غير موجودة') || d.includes('Page Not Found'));
      console.log('  Is 404 page?', is404);
      console.log('  Is homepage fallback?', title && title[1].includes('منصة المحامي الرقمية | المنظومة القانونية الذكية الأولى'));
    });
  });
}

check('https://mohamidigital.online/lawyers-directory.htm');
check('https://mohamidigital.online/features.htm');
