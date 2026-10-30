const fs = require('fs');

const v6 = fs.readFileSync('scratch/extracted_v6/lawyers-directory.html', 'utf8');

const checks = [
  'FIRESTORE_LAWYERS_URL',
  'lawyerRegisterModal',
  'wa.me',
  'prefillDelegationForLawyer',
  'generateJudicialDelegation',
  'judicial-delegation-tool',
  'google-adsense-account'
];

checks.forEach(c => {
  console.log(c, 'is in v6:', v6.includes(c));
});
