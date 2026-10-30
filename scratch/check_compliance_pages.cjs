const fs = require('fs');

const p = fs.readFileSync('public/privacy.html', 'utf8');
console.log('privacy.html length:', p.length);
console.log('privacy mentions adsense/cookies/doubleclick/google:');
console.log('  google:', p.includes('Google') || p.includes('جوجل'));
console.log('  adsense:', p.includes('AdSense') || p.includes('أدسنس') || p.includes('ادسنس'));
console.log('  cookies:', p.includes('cookies') || p.includes('كوكيز') || p.includes('ملفات تعريف الارتباط'));

const a = fs.readFileSync('public/about.html', 'utf8');
console.log('\nabout.html length:', a.length);

const c = fs.readFileSync('public/contact.html', 'utf8');
console.log('\ncontact.html length:', c.length);
