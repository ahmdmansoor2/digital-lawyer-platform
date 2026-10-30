const https = require('https');

https.get('https://mohamidigital.online/', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Homepage Status:', res.statusCode);
    console.log('Has new-tools-heading:', d.includes('id="new-tools-heading"'));
    console.log('Has criminal-procedure-new:', d.includes('criminal-procedure-new.html'));
    console.log('Has felony-appeal-generator:', d.includes('felony-appeal-generator.html'));
    console.log('Has bailiff-notices-generator:', d.includes('bailiff-notices-generator.html'));
    console.log('Has property-buyer-checklist:', d.includes('property-buyer-checklist.html'));
    console.log('Has inheritance-deed-generator:', d.includes('inheritance-deed-generator.html'));
    console.log('Has sw-register v13:', d.includes('sw-register.js?v=20261020v13'));
  });
}).on('error', e => console.error(e));
