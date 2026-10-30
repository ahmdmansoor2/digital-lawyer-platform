const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', e => resolve({ error: e.message }));
  });
}

async function verify() {
  const ts = Date.now();
  console.log('=== Live Verification on https://mohamidigital.online ===\n');

  // 1. Homepage MUST have AdSense
  const home = await get(`https://mohamidigital.online/?ts=${ts}`);
  const homeHasAds = home.data.includes('ca-pub-7725405859334364');
  console.log('Homepage status:', home.status, '| Has AdSense:', homeHasAds, '(Expected: true)');

  // 2. Blog sample MUST have AdSense
  const blog = await get(`https://mohamidigital.online/blog/commodity-hoarding-price-manipulation-law.html?ts=${ts}`);
  const blogHasAds = blog.data.includes('ca-pub-7725405859334364');
  console.log('Blog article status:', blog.status, '| Has AdSense:', blogHasAds, '(Expected: true)');

  // 3. Pillar sample MUST have AdSense
  const pillar = await get(`https://mohamidigital.online/pillars/criminal-law-egypt.html?ts=${ts}`);
  const pillarHasAds = pillar.data.includes('ca-pub-7725405859334364');
  console.log('Pillar status:', pillar.status, '| Has AdSense:', pillarHasAds, '(Expected: true)');

  // 4. Calculator MUST NOT have AdSense
  const calc = await get(`https://mohamidigital.online/calculate-old-rent.html?ts=${ts}`);
  const calcHasAds = calc.data.includes('ca-pub-7725405859334364') || calc.data.includes('adsbygoogle');
  console.log('Calculator status:', calc.status, '| Has AdSense:', calcHasAds, '(Expected: false)');

  // 5. Radar topic MUST NOT have AdSense
  const radar = await get(`https://mohamidigital.online/radar-topics/2026-10-16-turki-al-alshikh.html?ts=${ts}`);
  const radarHasAds = radar.data.includes('ca-pub-7725405859334364') || radar.data.includes('adsbygoogle');
  console.log('Radar topic status:', radar.status, '| Has AdSense:', radarHasAds, '(Expected: false)');

  // 6. Court page MUST NOT have AdSense
  const court = await get(`https://mohamidigital.online/courts/abbassia-north-cairo-court.html?ts=${ts}`);
  const courtHasAds = court.data.includes('ca-pub-7725405859334364') || court.data.includes('adsbygoogle');
  console.log('Court page status:', court.status, '| Has AdSense:', courtHasAds, '(Expected: false)');

  // 7. Form doc MUST NOT have AdSense
  const form = await get(`https://mohamidigital.online/legal-forms-docs/lease_contract.html?ts=${ts}`);
  const formHasAds = form.data.includes('ca-pub-7725405859334364') || form.data.includes('adsbygoogle');
  console.log('Legal form doc status:', form.status, '| Has AdSense:', formHasAds, '(Expected: false)');

  console.log('\n=== Live Verification Complete ===');
}

verify();
