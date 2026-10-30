const fs = require('fs');
const { fetchUrl } = require('./fetch_helper.cjs');

async function checkFiles() {
  const res = await fetchUrl('https://manshurat.org/node/13372');
  const html = res.buffer.toString('utf8');
  
  // match any links inside file or node
  const aMatches = html.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi) || [];
  for (const a of aMatches) {
    if (a.includes('file') || a.includes('download') || a.includes('pdf') || a.includes('sites/default')) {
      console.log('File link:', a);
    }
  }
}

checkFiles().catch(console.error);
