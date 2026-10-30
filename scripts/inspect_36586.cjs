const fs = require('fs');
const { fetchUrl } = require('./fetch_helper.cjs');

async function inspect36586() {
  const res = await fetchUrl('https://manshurat.org/node/36586');
  const html = res.buffer.toString('utf8');
  console.log('HTML size:', html.length);
  // look for any links
  const matches = html.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi) || [];
  matches.forEach(m => console.log('Link:', m));
}

inspect36586().catch(console.error);
