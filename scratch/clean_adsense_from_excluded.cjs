const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const EXCLUDED_RELATIVE_PATHS = new Set([
  // System & Utility Pages
  "404.html",
  "search.html",
  "sitemap.html",
  "contact.html",
  "pricing.html",
  "terms.html",
  "privacy.html",
  "disclaimer.html",
  "about.html",
  "editorial-policy.html",
  // Memo headers in legal-forms-docs
  "legal-forms-docs/memo-header-cassation.html",
  "legal-forms-docs/memo-header-appeal.html",
  "legal-forms-docs/memo-header-criminal.html",
  "legal-forms-docs/memo-header-family.html",
]);

// Add canonical blog redirects
const CANONICAL_BLOG_REDIRECTS = [
  "blog/bounced-checks-laws-egypt.html",
  "blog/bounced-cheque-laws-egypt.html",
  "blog/bounced-check-penalties-egypt.html",
  "blog/bounced-cheque-penalties-egypt.html",
  "blog/bounced-checks-provisions-egypt.html",
  "blog/cheque-return-egypt.html",
  "blog/Check-without-balance-penalties-egypt.html",
  "blog/debt-collection-egypt.html",
  "blog/cybercrime-law-extortion-egypt.html",
  "blog/cybercrime-blackmail-laws-egypt.html",
  "blog/cybercrime-phone-extortion-egypt.html",
  "blog/cyber-extortion-report-egypt.html",
  "blog/cybercrime-reporting-egypt.html",
  "blog/cybercrime-law-defamation-egypt.html",
  "blog/cyber-defamation-slander-laws-egypt.html",
  "blog/cyberbullying-defamation-law-egypt.html",
  "blog/cybercrime-law-data-leaks-egypt.html",
  "blog/personal-data-protection-law.html",
  "blog/data-protection-egypt.html",
  "blog/sports-contracts-egyptian-law.html",
  "blog/sports-player-contracts-law-egypt.html",
  "blog/egyptian-sports-law-player-contracts.html",
  "blog/sports-player-contracts-arbitration-egypt.html",
  "blog/foreign-currency-illegal-trading-egypt.html",
  "blog/foreign-currency-trading-laws-egypt.html",
  "blog/foreign-currency-trading-penalties-egypt.html",
  "blog/illegal-currency-trading-penalties-egypt.html",
  "blog/khul-divorce-procedure.html",
  "blog/khula-laws-personal-status-egypt.html",
  "blog/official-holidays-labor-rights-egypt.html",
  "blog/official-holidays-overtime-labor-law-egypt.html",
  "blog/force-majeure-clause-egyptian-law.html",
  "blog/currency-fluctuation-impact-contracts-egypt.html",
  "blog/educational-guardianship-divorced-mother-egypt.html",
  "blog/takaful-karama-social-pension-conditions.html",
  "blog/university-tanseeq-appeals-egypt.html",
  "blog/judicial-recess-deadlines-egypt.html",
  "blog/company-formation-egypt.html",
  "blog/administrative-appeals-egypt.html",
  "blog/consumer-protection-egypt.html",
  "blog/electronic-signature-egypt.html",
  "blog/trademark-registration-egypt.html",
  "blog/tax-disputes-egypt.html",
  "blog/real-estate-registration-egypt.html",
  "blog/marriage-foreigners-egypt.html",
  "blog/travel-ban-egypt.html",
  "blog/old-rent-law-egypt.html",
  "blog/building-reconciliation-law.html",
  "blog/criminal-defense-rights.html",
  "blog/criminal-polygraph-law.html",
  "blog/martial-rape-custody.html",
  "blog/medical-liability-law-egypt.html"
];

CANONICAL_BLOG_REDIRECTS.forEach(p => EXCLUDED_RELATIVE_PATHS.add(p));

// Also include all files in public/radar-topics/
const radarDir = path.join(ROOT, 'public', 'radar-topics');
if (fs.existsSync(radarDir)) {
  fs.readdirSync(radarDir).forEach(f => {
    if (f.endsWith('.html')) EXCLUDED_RELATIVE_PATHS.add(`radar-topics/${f}`);
  });
}

const ADS_DIV_REGEX = /(?:<!--\s*AdSlot[^>]*-->\s*)?<div[^>]*>\s*<ins\s+class=["']adsbygoogle["'][\s\S]*?<\/script>\s*<\/div>/gi;
const ADS_SCRIPT_REGEX = /<script\s+async\s+src=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"']*["'][^>]*><\/script>\s*/gi;
const ADS_ACCOUNT_META = /<meta\s+name=["']google-adsense-account["'][^>]*>\s*/gi;

let cleanedCount = 0;

for (const rel of EXCLUDED_RELATIVE_PATHS) {
  const fullPath = path.join(ROOT, 'public', rel);
  if (fs.existsSync(fullPath)) {
    let html = fs.readFileSync(fullPath, 'utf8');
    const original = html;

    html = html.replace(ADS_DIV_REGEX, '');
    html = html.replace(ADS_SCRIPT_REGEX, '');
    html = html.replace(ADS_ACCOUNT_META, '');

    if (html !== original) {
      fs.writeFileSync(fullPath, html, 'utf8');
      cleanedCount++;
    }
  }
}

console.log(`Successfully removed AdSense scripts and units from ${cleanedCount} thin/utility/radar/merged pages.`);
