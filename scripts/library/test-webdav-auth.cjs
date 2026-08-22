'use strict';
const https = require('https');

const hosts = [
  { host: 'dev.babup.com', path: '/webdav' },
  { host: 'www.babup.com', path: '/webdav/' },
  { host: 'babup.com', path: '/webdav/' },
  { host: 'dev.babup.com', path: '/webdav/' },
  { host: 'www.dev.babup.com', path: '/webdav' }
];

const auth = Buffer.from('ahmed1877:Ahmed1877#').toString('base64');

hosts.forEach(({ host, path }) => {
  const req = https.request({
    hostname: host,
    port: 443,
    path: path,
    method: 'PROPFIND',
    headers: {
      'Authorization': 'Basic ' + auth,
      'Depth': '0',
      'User-Agent': 'Cyberduck/8.0.0'
    }
  }, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      console.log(`[${host}${path}] -> Status: ${res.statusCode}`);
      console.log('Location:', res.headers.location || 'none');
      if (body) console.log('Body:', body.substring(0, 150));
    });
  });
  req.on('error', e => console.error(`[${host}] Error: ${e.message}`));
  req.end();
});
