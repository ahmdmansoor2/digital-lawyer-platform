const https = require('https');

https.get('https://mohamidigital.online/blog/', (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Total bytes received:', data.length);
    const postCardsCount = (data.match(/class="post-card"/g) || []).length;
    console.log('Live post-cards on https://mohamidigital.online/blog/ :', postCardsCount);
    
    // Check first 3 articles
    const titles = [...data.matchAll(/<h3>([^<]+)<\/h3>/g)].map(m => m[1]);
    console.log('First 5 live article titles:');
    titles.slice(0, 5).forEach((t, i) => console.log(`${i + 1}. ${t}`));

    // Check dates in first 5
    const dates = [...data.matchAll(/📅\s*([^<\n]+)/g)].map(m => m[1].trim());
    console.log('First 5 live dates:');
    dates.slice(0, 5).forEach((d, i) => console.log(`${i + 1}. ${d}`));
  });
}).on('error', (e) => {
  console.error('Error fetching live blog:', e.message);
});
