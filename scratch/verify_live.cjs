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
  const home = await get('https://mohamidigital.online/?nocache=' + Date.now());
  console.log('Homepage status:', home.status);
  console.log('Contains ns-brand-headline:', home.data.includes('ns-brand-headline'));
  console.log('Contains المحامي الرقمي in H1:', home.data.includes('ns-brand-headline">المحامي الرقمي</span>'));

  const sampleTool = await get('https://mohamidigital.online/calculate-old-rent.html?nocache=' + Date.now());
  console.log('Tool status:', sampleTool.status);
  const title = sampleTool.data.match(/<title>[\s\S]*?<\/title>/i);
  console.log('Tool title:', title ? title[0] : 'None');

  const sampleBlog = await get('https://mohamidigital.online/blog/commodity-hoarding-price-manipulation-law.html?nocache=' + Date.now());
  console.log('Blog status:', sampleBlog.status);
  const blogTitle = sampleBlog.data.match(/<title>[\s\S]*?<\/title>/i);
  console.log('Blog title:', blogTitle ? blogTitle[0] : 'None');
}
verify();
