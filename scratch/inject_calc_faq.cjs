const fs = require('fs');

const v6 = fs.readFileSync('scratch/extracted_v6/legal-calculators.html', 'utf8');
let pub = fs.readFileSync('public/legal-calculators.html', 'utf8');

const faqMatch = v6.match(/<!-- FAQ -->[\s\S]*?<\/section>/);
if (faqMatch && !pub.includes('faq-section')) {
  console.log('Found FAQ section in v6, length:', faqMatch[0].length);
  // Inject before footer or before E-E-A-T
  if (pub.includes('<footer')) {
    pub = pub.replace('<footer', faqMatch[0] + '\n\n<footer');
    fs.writeFileSync('public/legal-calculators.html', pub, 'utf8');
    console.log('Successfully injected FAQ section into public/legal-calculators.html');
  }
} else {
  console.log('FAQ section already present or not found');
}
