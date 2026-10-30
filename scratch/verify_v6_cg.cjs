const fs = require('fs');

const v6 = fs.readFileSync('scratch/extracted_v6/contract-generator.html', 'utf8');

const checks = [
  'officeHeaderName',
  'inheritance_division',
  'alimony_lawsuit',
  'labor_lawsuit',
  'appeal_memo',
  'contract-risk-checker',
  'runContractRiskAudit',
  'injectMissingProtectiveClauses',
  'google-adsense-account'
];

checks.forEach(c => {
  console.log(c, 'is in v6:', v6.includes(c));
});

// Check if any line breaks syntax bug exists before </body></html>
const hasSyntaxBug = /<\/pre>\s*\n\s*<\/body><\/html>'/.test(v6);
console.log('Has syntax bug before closing:', hasSyntaxBug);
