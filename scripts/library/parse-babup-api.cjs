'use strict';
const https = require('https');

https.get('https://www.babup.com/api', res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    // Find authorize section
    const idx = body.indexOf('/authorize');
    if (idx !== -1) {
      // Find the detailed section lower down in the page
      const secondIdx = body.indexOf('/authorize', idx + 100);
      if (secondIdx !== -1) {
        console.log('--- /authorize Documentation ---');
        console.log(body.substring(secondIdx, secondIdx + 2000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
      }
      
      const uploadIdx = body.indexOf('/file/upload', idx + 100);
      if (uploadIdx !== -1) {
        console.log('\n--- /file/upload Documentation ---');
        console.log(body.substring(uploadIdx, uploadIdx + 2000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
      }
    }
  });
}).on('error', e => console.error(e.message));
