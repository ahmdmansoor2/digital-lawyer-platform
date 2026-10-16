const fs = require('fs');
const path = require('path');

const fbPath = path.join(__dirname, '..', 'firebase.json');
const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
const hosting = fb.hosting.find(h => h.target === 'app');

const CANONICAL_BLOG_REDIRECTS = {
    "blog/bounced-checks-laws-egypt.html": "blog/bounced-check-laws-egypt.html",
    "blog/bounced-cheque-laws-egypt.html": "blog/bounced-check-laws-egypt.html",
    "blog/bounced-check-penalties-egypt.html": "blog/bounced-check-laws-egypt.html",
    "blog/bounced-cheque-penalties-egypt.html": "blog/bounced-check-laws-egypt.html",
    "blog/bounced-checks-provisions-egypt.html": "blog/bounced-check-laws-egypt.html",
    "blog/cheque-return-egypt.html": "blog/bounced-check-laws-egypt.html",
    "blog/Check-without-balance-penalties-egypt.html": "blog/bounced-check-laws-egypt.html",
    "blog/debt-collection-egypt.html": "blog/bounced-check-laws-egypt.html",
    "blog/cybercrime-law-extortion-egypt.html": "blog/cybercrime-extortion-laws-egypt.html",
    "blog/cybercrime-blackmail-laws-egypt.html": "blog/cybercrime-extortion-laws-egypt.html",
    "blog/cybercrime-phone-extortion-egypt.html": "blog/cybercrime-extortion-laws-egypt.html",
    "blog/cyber-extortion-report-egypt.html": "blog/cybercrime-extortion-laws-egypt.html",
    "blog/cybercrime-reporting-egypt.html": "blog/cybercrime-extortion-laws-egypt.html",
    "blog/cybercrime-law-defamation-egypt.html": "blog/cybercrime-defamation-laws-egypt.html",
    "blog/cyber-defamation-slander-laws-egypt.html": "blog/cybercrime-defamation-laws-egypt.html",
    "blog/cyberbullying-defamation-law-egypt.html": "blog/cybercrime-defamation-laws-egypt.html",
    "blog/cybercrime-law-data-leaks-egypt.html": "blog/cybercrime-data-leaks-laws-egypt.html",
    "blog/personal-data-protection-law.html": "blog/cybercrime-data-leaks-laws-egypt.html",
    "blog/data-protection-egypt.html": "blog/cybercrime-data-leaks-laws-egypt.html",
    "blog/sports-contracts-egyptian-law.html": "blog/sports-contracts-law-egypt.html",
    "blog/sports-player-contracts-law-egypt.html": "blog/sports-contracts-law-egypt.html",
    "blog/egyptian-sports-law-player-contracts.html": "blog/sports-contracts-law-egypt.html",
    "blog/sports-player-contracts-arbitration-egypt.html": "blog/sports-contracts-arbitration-egypt.html",
    "blog/foreign-currency-illegal-trading-egypt.html": "blog/foreign-currency-laws-egypt.html",
    "blog/foreign-currency-trading-laws-egypt.html": "blog/foreign-currency-laws-egypt.html",
    "blog/foreign-currency-trading-penalties-egypt.html": "blog/foreign-currency-laws-egypt.html",
    "blog/illegal-currency-trading-penalties-egypt.html": "blog/foreign-currency-laws-egypt.html",
    "blog/khul-divorce-procedure.html": "blog/khul-divorce-procedures-egypt.html",
    "blog/khula-laws-personal-status-egypt.html": "blog/khul-divorce-procedures-egypt.html",
    "blog/official-holidays-labor-rights-egypt.html": "blog/official-holidays-labor-law-egypt.html",
    "blog/official-holidays-overtime-labor-law-egypt.html": "blog/official-holidays-labor-law-egypt.html",
    "blog/force-majeure-clause-egyptian-law.html": "blog/force-majeure-contract-law-egypt.html",
    "blog/currency-fluctuation-impact-contracts-egypt.html": "blog/currency-devaluation-contract-effects.html",
    "blog/educational-guardianship-divorced-mother-egypt.html": "blog/educational-guardianship-divorce-egypt.html",
    "blog/takaful-karama-social-pension-conditions.html": "blog/takaful-karama-pension-legal-eligibility.html",
    "blog/university-tanseeq-appeals-egypt.html": "blog/university-admission-coordination-appeals-egypt.html",
    "blog/judicial-recess-deadlines-egypt.html": "blog/judicial-recess-court-deadlines-egypt.html",
    "blog/company-formation-egypt.html": "blog/company-incorporation-egypt.html",
    "blog/administrative-appeals-egypt.html": "blog/administrative-court-state-council.html",
    "blog/consumer-protection-egypt.html": "blog/consumer-protection-return-policy.html",
    "blog/electronic-signature-egypt.html": "blog/electronic-signature-evidence-law.html",
    "blog/trademark-registration-egypt.html": "blog/intellectual-property-trademark-registration.html",
    "blog/tax-disputes-egypt.html": "blog/tax-disputes-settlement-egypt.html",
    "blog/real-estate-registration-egypt.html": "blog/real-estate-registration-laws.html",
    "blog/marriage-foreigners-egypt.html": "blog/foreigners-ownership-marriage-egypt.html",
    "blog/travel-ban-egypt.html": "blog/travel-ban-lifting-procedures.html",
    "blog/old-rent-law-egypt.html": "blog/old-rent-law-amendments-eviction.html",
    "blog/building-reconciliation-law.html": "blog/new-building-reconciliation-law.html",
    "blog/criminal-defense-rights.html": "blog/pretrial-detention-laws-egypt.html",
    "blog/criminal-polygraph-law.html": "blog/pretrial-detention-laws-egypt.html",
    "blog/martial-rape-custody.html": "blog/child-custody-visitation-hosting-laws.html",
    "blog/medical-liability-law-egypt.html": "blog/medical-malpractice-lawsuits-egypt.html"
};

const existingSources = new Set(hosting.redirects.map(r => r.source));
let added = 0;

for (const [src, dest] of Object.entries(CANONICAL_BLOG_REDIRECTS)) {
  const sourceWithSlash = '/' + src;
  const sourceNoHtml = '/' + src.replace(/\.html$/, '');
  const destWithSlash = '/' + dest;

  if (!existingSources.has(sourceWithSlash)) {
    hosting.redirects.push({
      source: sourceWithSlash,
      destination: destWithSlash,
      type: 301
    });
    existingSources.add(sourceWithSlash);
    added++;
  }

  if (!existingSources.has(sourceNoHtml)) {
    hosting.redirects.push({
      source: sourceNoHtml,
      destination: destWithSlash,
      type: 301
    });
    existingSources.add(sourceNoHtml);
    added++;
  }
}

fs.writeFileSync(fbPath, JSON.stringify(fb, null, 2), 'utf8');
console.log(`Added ${added} new 301 redirects to firebase.json.`);
