const fs = require('fs');

function checkDiff(file) {
  const v6 = fs.readFileSync('scratch/extracted_v6/' + file, 'utf8');
  const pub = fs.readFileSync('public/' + file, 'utf8');
  console.log(`=== ${file} ===`);
  const h2V6 = [...v6.matchAll(/<h[123][^>]*>(.*?)<\/h[123]>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const h2Pub = new Set([...pub.matchAll(/<h[123][^>]*>(.*?)<\/h[123]>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim()));
  console.log('New Headings in v6:', h2V6.filter(h => !h2Pub.has(h)));
}

checkDiff('about.html');
checkDiff('features.html');
checkDiff('pricing.html');
