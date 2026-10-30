const https = require('https');

const opts = {
  hostname: 'mohamidigital.online',
  path: '/',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

const req = https.request(opts, (res) => {
  console.log('Status Code:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const hasSameAs = data.includes('sameAs');
    console.log('Includes sameAs on live site?', hasSameAs);
    if (hasSameAs) {
      const idx = data.indexOf('sameAs');
      console.log('Snippet from live site:\n', data.slice(idx - 20, idx + 250));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
