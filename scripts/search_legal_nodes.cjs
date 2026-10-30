const { fetchUrl } = require('./fetch_helper.cjs');

async function searchManshurat(query) {
  const url = `https://manshurat.org/search/node/${encodeURIComponent(query)}`;
  const res = await fetchUrl(url);
  const html = res.buffer.toString('utf8');
  
  const results = [];
  // search results in drupal: <dt class="title"><a href="/node/XXXX">Title</a></dt>
  const regex = /<dt class="title">\s*<a href="\/node\/(\d+)">([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    results.push({
      id: m[1],
      title: m[2].replace(/<[^>]+>/g, '').trim(),
      url: `https://manshurat.org/node/${m[1]}`
    });
  }
  return results;
}

async function main() {
  const queries = [
    '143 لسنة 1981',
    '615 لسنة 2016',
    '1836 لسنة 2011',
    '1919 لسنة 2016',
    '144 لسنة 2017',
    '164 لسنة 2022 زراعة'
  ];

  for (const q of queries) {
    console.log(`\n=== Searching for: "${q}" ===`);
    try {
      const res = await searchManshurat(q);
      console.log(`Found ${res.length} results:`);
      res.slice(0, 4).forEach(r => console.log(` - Node ${r.id}: ${r.title}`));
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

main();
