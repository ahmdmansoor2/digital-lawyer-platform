const fs = require('fs');

function inspectNewThings(file) {
  const v6 = fs.readFileSync('scratch/extracted_v6/' + file, 'utf8');
  const pub = fs.readFileSync('public/' + file, 'utf8');
  console.log(`=== ${file} ===`);
  console.log('v6 length:', v6.length, 'public length:', pub.length);
  // Check headings
  const h2V6 = [...v6.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const h2Pub = new Set([...pub.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim()));
  const newHeadings = h2V6.filter(h => !h2Pub.has(h));
  console.log('New Headings in v6:', newHeadings);
}

inspectNewThings('legal-calculators.html');
inspectNewThings('law-students-hub.html');
inspectNewThings('citizen-complaints.html');
inspectNewThings('real-estate.html');
