const fs = require('fs');
const path = require('path');

const fbPath = path.join(__dirname, '..', 'firebase.json');
const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
const hosting = fb.hosting.find(h => h.target === 'app');

const fixedRedirects = [];

for (const r of hosting.redirects) {
  // If destination is one of the broken non-existent files:
  if (r.destination === '/blog/administrative-court-state-council.html') continue; // real article exists at source
  if (r.destination === '/blog/consumer-protection-return-policy.html') continue; // real article exists at source
  if (r.destination === '/blog/intellectual-property-trademark-registration.html') continue; // real article exists at source
  if (r.destination === '/blog/real-estate-registration-laws.html') continue; // real article exists at source
  
  if (r.destination === '/blog/electronic-signature-evidence-law.html') {
    r.destination = '/blog/electronic-tax-invoicing-system-egypt.html';
  }
  if (r.destination === '/blog/tax-disputes-settlement-egypt.html') {
    r.destination = '/blog/tax-dispute-procedure.html';
  }
  if (r.destination === '/blog/foreigners-ownership-marriage-egypt.html') {
    r.destination = '/blog/civil-marriage-contract.html';
  }
  if (r.destination === '/blog/travel-ban-lifting-procedures.html') {
    r.destination = '/blog/travel-ban-reasons.html';
  }
  if (r.destination === '/blog/old-rent-law-amendments-eviction.html') {
    r.destination = '/blog/old-rent-law-2026-eviction-and-increase.html';
  }
  if (r.destination === '/blog/new-building-reconciliation-law.html') {
    r.destination = '/blog/building-violation-reconciliation-law-updates-model-8.html';
  }
  if (r.destination === '/blog/pretrial-detention-laws-egypt.html') {
    if (r.source.includes('criminal-polygraph-law') || r.source.includes('criminal-defense-rights')) {
      continue; // keep real articles!
    }
    r.destination = '/blog/pretrial-detention-law-egypt.html';
  }
  if (r.destination === '/blog/child-custody-visitation-hosting-laws.html') {
    if (r.source.includes('martial-rape-custody')) continue; // keep real article
    r.destination = '/blog/child-custody-remarriage-and-father-visitation-rights.html';
  }

  // Double check existence of destination
  let dest = r.destination.replace(/^\//, '');
  if (fs.existsSync(path.join(__dirname, '..', 'public', dest))) {
    fixedRedirects.push(r);
  } else {
    console.warn('Dropping redirect with non-existent destination:', r.source, '-->', r.destination);
  }
}

hosting.redirects = fixedRedirects;
fs.writeFileSync(fbPath, JSON.stringify(fb, null, 2), 'utf8');
console.log('Successfully saved firebase.json with', hosting.redirects.length, 'verified redirects.');
