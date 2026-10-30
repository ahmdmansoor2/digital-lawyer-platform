const { fetchUrl } = require('./fetch_helper.cjs');

async function findNode() {
  const res = await fetchUrl('https://manshurat.org/taxonomy/term/23?page=0'); // Laws taxonomy
  // Let's search directly
  const searchUrl = 'https://manshurat.org/search/node/%D9%82%D8%A7%D9%86%D9%88%D9%86%20144%20%D9%84%D8%B3%D9%86%D8%A9%202017';
  const sRes = await fetchUrl(searchUrl);
  const html = sRes.buffer.toString('utf8');
  const matches = html.match(/\/node\/\d+/g) || [];
  console.log('Matches for 144:', Array.from(new Set(matches)).slice(0, 10));
}

findNode().catch(console.error);
