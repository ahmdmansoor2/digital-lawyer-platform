const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const CANNIBALIZATION_REDIRECTS = {
  // Cluster 1: Bounced Checks -> bounced-cheque-penalties-and-statute-of-limitations.html
  'bounced-check-laws-egypt.html': 'bounced-cheque-penalties-and-statute-of-limitations.html',
  'bounced-check-penalties-egypt.html': 'bounced-cheque-penalties-and-statute-of-limitations.html',
  'bounced-checks-laws-egypt.html': 'bounced-cheque-penalties-and-statute-of-limitations.html',
  'bounced-checks-provisions-egypt.html': 'bounced-cheque-penalties-and-statute-of-limitations.html',
  'bounced-cheque-laws-egypt.html': 'bounced-cheque-penalties-and-statute-of-limitations.html',
  'bounced-cheque-penalties-egypt.html': 'bounced-cheque-penalties-and-statute-of-limitations.html',
  'bounced-cheques-bank-loans-egypt.html': 'bounced-cheque-penalties-and-statute-of-limitations.html',
  'cheque-fraud-defense.html': 'bounced-cheque-penalties-and-statute-of-limitations.html',
  'cheque-return-egypt.html': 'bounced-cheque-penalties-and-statute-of-limitations.html',

  // Cluster 2A: Cyber Extortion -> cybercrime-extortion-laws-egypt.html
  'cybercrime-blackmail-laws-egypt.html': 'cybercrime-extortion-laws-egypt.html',
  'cybercrime-extortion-banking-fraud-egypt.html': 'cybercrime-extortion-laws-egypt.html',
  'cybercrime-law-extortion-egypt.html': 'cybercrime-extortion-laws-egypt.html',
  'cybercrime-phone-extortion-egypt.html': 'cybercrime-extortion-laws-egypt.html',
  'instapay-fraud-cybercrime-egypt-law.html': 'cybercrime-extortion-laws-egypt.html',

  // Cluster 2B: Cyber Defamation / Data Leaks -> cyber-defamation-slander-laws-egypt.html
  'cyberbullying-defamation-law-egypt.html': 'cyber-defamation-slander-laws-egypt.html',
  'cybercrime-defamation-laws-egypt.html': 'cyber-defamation-slander-laws-egypt.html',
  'cybercrime-law-defamation-egypt.html': 'cyber-defamation-slander-laws-egypt.html',
  'cyber-defamation-whatsapp-police-report-and-penalties.html': 'cyber-defamation-slander-laws-egypt.html',
  'cybercrime-data-leaks-laws-egypt.html': 'cyber-defamation-slander-laws-egypt.html',
  'cybercrime-law-data-leaks-egypt.html': 'cyber-defamation-slander-laws-egypt.html',

  // Cluster 3: Sports Contracts -> sports-contracts-arbitration-egypt.html
  'egyptian-sports-law-player-contracts.html': 'sports-contracts-arbitration-egypt.html',
  'sports-contracts-egyptian-law.html': 'sports-contracts-arbitration-egypt.html',
  'sports-contracts-law-egypt.html': 'sports-contracts-arbitration-egypt.html',
  'sports-contracts-player-transfers-egypt.html': 'sports-contracts-arbitration-egypt.html',
  'sports-contracts-professionalism-law-lessons-from-salah.html': 'sports-contracts-arbitration-egypt.html',
  'sports-player-contracts-arbitration-egypt.html': 'sports-contracts-arbitration-egypt.html',
  'sports-player-contracts-egypt.html': 'sports-contracts-arbitration-egypt.html',
  'sports-player-contracts-law-egypt.html': 'sports-contracts-arbitration-egypt.html',

  // Cluster 4: Foreign Currency -> foreign-currency-illegal-trading-egypt.html
  'foreign-currency-laws-egypt.html': 'foreign-currency-illegal-trading-egypt.html',
  'foreign-currency-trading-laws-egypt.html': 'foreign-currency-illegal-trading-egypt.html',
  'foreign-currency-trading-penalties-egypt.html': 'foreign-currency-illegal-trading-egypt.html',
  'illegal-currency-trading-penalties-egypt.html': 'foreign-currency-illegal-trading-egypt.html',

  // Cluster 5: Khul -> khula-divorce-lawsuit-procedures-and-dowry-return.html
  'khul-divorce-procedure.html': 'khula-divorce-lawsuit-procedures-and-dowry-return.html',
  'khul-divorce-procedures-egypt.html': 'khula-divorce-lawsuit-procedures-and-dowry-return.html',
  'khula-laws-personal-status-egypt.html': 'khula-divorce-lawsuit-procedures-and-dowry-return.html'
};

console.log('Processing cannibalization duplicates count:', Object.keys(CANNIBALIZATION_REDIRECTS).length);

// 1. Update HTML files for duplicates
let updatedHtmlCount = 0;
for (const [duplicateFile, masterFile] of Object.entries(CANNIBALIZATION_REDIRECTS)) {
  const filePath = path.join(ROOT, 'public', 'blog', duplicateFile);
  if (fs.existsSync(filePath)) {
    let html = fs.readFileSync(filePath, 'utf8');
    
    // Set canonical to master article
    const masterUrl = `https://mohamidigital.online/blog/${masterFile}`;
    if (html.includes('rel="canonical"')) {
      html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, `<link rel="canonical" href="${masterUrl}" />`);
    } else {
      html = html.replace(/<head>/i, `<head>\n  <link rel="canonical" href="${masterUrl}" />`);
    }

    // Set robots to noindex, follow
    if (html.includes('name="robots"')) {
      html = html.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '<meta name="robots" content="noindex, follow" />');
    } else {
      html = html.replace(/<head>/i, '<head>\n  <meta name="robots" content="noindex, follow" />');
    }

    fs.writeFileSync(filePath, html, 'utf8');
    updatedHtmlCount++;
  }
}
console.log(`Updated canonical and noindex on ${updatedHtmlCount} duplicate HTML articles.`);

// 2. Update firebase.json redirects
const fbPath = path.join(ROOT, 'firebase.json');
if (fs.existsSync(fbPath)) {
  const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
  const hosting = fb.hosting.find(h => h.target === 'app');
  if (hosting) {
    if (!hosting.redirects) hosting.redirects = [];
    
    // Existing sources
    const existingSources = new Set(hosting.redirects.map(r => r.source));

    let addedRedirects = 0;
    for (const [duplicateFile, masterFile] of Object.entries(CANNIBALIZATION_REDIRECTS)) {
      const slugNoExt = duplicateFile.replace(/\.html$/, '');
      const masterDest = `/blog/${masterFile}`;

      // Redirect for /blog/<file>.html
      const srcWithHtml = `/blog/${duplicateFile}`;
      if (!existingSources.has(srcWithHtml)) {
        hosting.redirects.push({
          source: srcWithHtml,
          destination: masterDest,
          type: 301
        });
        existingSources.add(srcWithHtml);
        addedRedirects++;
      }

      // Redirect for /blog/<slug>
      const srcNoHtml = `/blog/${slugNoExt}`;
      if (!existingSources.has(srcNoHtml)) {
        hosting.redirects.push({
          source: srcNoHtml,
          destination: masterDest,
          type: 301
        });
        existingSources.add(srcNoHtml);
        addedRedirects++;
      }
    }
    fs.writeFileSync(fbPath, JSON.stringify(fb, null, 2), 'utf8');
    console.log(`Added ${addedRedirects} 301 redirects to firebase.json.`);
  }
}

// 3. Update generate-sitemap.cjs to exclude these duplicates and sitemap.html and radar-topics
const genSitemapPath = path.join(ROOT, 'scripts', 'blog-publisher', 'generate-sitemap.cjs');
if (fs.existsSync(genSitemapPath)) {
  let gCode = fs.readFileSync(genSitemapPath, 'utf8');

  // Remove sitemap.html from main array
  gCode = gCode.replace(/\s*\{\s*loc:\s*['"]\/sitemap\.html['"],\s*pri:\s*['"]0\.3['"],\s*freq:\s*['"]monthly['"]\s*\},?/g, '');

  // Add CANNIBALIZATION_EXCLUSIONS Set if not already present
  if (!gCode.includes('CANNIBALIZATION_EXCLUSIONS')) {
    const exclusionsArray = JSON.stringify(Object.keys(CANNIBALIZATION_REDIRECTS), null, 2);
    const injection = `
// Excluded duplicate articles to prevent keyword cannibalization
const CANNIBALIZATION_EXCLUSIONS = new Set(${exclusionsArray});
`;
    gCode = gCode.replace(/const TOPIC_GROUPS =/, `${injection}\nconst TOPIC_GROUPS =`);
  }

  // Filter blogFiles in buildSitemap
  if (gCode.includes('const blogFiles = listHtml(BLOG_DIR);')) {
    gCode = gCode.replace(
      'const blogFiles = listHtml(BLOG_DIR);',
      'const blogFiles = listHtml(BLOG_DIR).filter(f => !CANNIBALIZATION_EXCLUSIONS.has(f));'
    );
  }

  // Remove radar-topics from sitemap urls
  gCode = gCode.replace(
    /\s*\/\/\s*كل صفحات موضوعات رصد المحامي المستقلة[\s\S]*?urls\.push\(`\s*<url>\s*<loc>\${BASE_URL}\/radar-topics\/\${f}<\/loc>[\s\S]*?`\);\s*\}/g,
    '\n  // تم إخراج صفحات radar-topics من sitemap لأنها مؤرشفة داخلياً لمنع Scaled Content Abuse\n'
  );

  fs.writeFileSync(genSitemapPath, gCode, 'utf8');
  console.log('generate-sitemap.cjs updated to exclude cannibalization duplicates, sitemap.html, and radar-topics.');
}

console.log('--- CANNIBALIZATION CONSOLIDATION COMPLETED SUCCESSFULLY ---');
