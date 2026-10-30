const fs = require('fs');
const { fetchUrl } = require('./fetch_helper.cjs');

async function extractBody36586() {
  const res = await fetchUrl('https://manshurat.org/node/36586');
  const html = res.buffer.toString('utf8');
  const contentMatch = html.match(/<div class="field-item even"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
  if (contentMatch) {
    console.log('Body length:', contentMatch[1].length);
    console.log('Sample:', contentMatch[1].substring(0, 1000).replace(/<[^>]+>/g, ' '));
  }
}

extractBody36586().catch(console.error);
