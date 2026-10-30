const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'scripts', 'blog-publisher', 'generate-sitemap.cjs');
let code = fs.readFileSync(targetPath, 'utf8');

// 1. Add fbRedirectSources and isIndexable before CANNIBALIZATION_EXCLUSIONS
const anchor1 = 'const CANNIBALIZATION_EXCLUSIONS = new Set([';
const replacement1 = `// Read 301 redirects dynamically from firebase.json
const fbPath = path.join(ROOT, 'firebase.json');
const fbRedirectSources = new Set();
try {
  const fbData = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
  const redirects = fbData.hosting?.[0]?.redirects || [];
  redirects.forEach(r => {
    if (r.source) {
      fbRedirectSources.add(r.source);
      fbRedirectSources.add(r.source.replace(/^\\//, ''));
      fbRedirectSources.add(r.source.split('/').pop());
    }
  });
} catch (e) {
  console.warn('[sitemap] Failed to load firebase.json redirects:', e.message);
}

function isIndexable(dir, filename, urlPath) {
  if (CANNIBALIZATION_EXCLUSIONS.has(filename)) return false;
  if (fbRedirectSources.has(urlPath) || fbRedirectSources.has(filename)) return false;
  try {
    const full = path.join(dir, filename);
    const html = fs.readFileSync(full, 'utf8');
    if (/content=["'][^"']*noindex[^"']*["']/i.test(html)) return false;
    const cMatch = html.match(/<link\\s+rel=["']canonical["']\\s+href=["']([^"']+)["']/i);
    if (cMatch && cMatch[1]) {
      const canonical = cMatch[1].trim();
      const targetUrl = BASE_URL + urlPath;
      if (canonical !== targetUrl && canonical !== targetUrl.replace(/\\/$/, '')) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

const CANNIBALIZATION_EXCLUSIONS = new Set([`;

code = code.replace(anchor1, replacement1);

// 2. Add 12 tools and remove legal-radar.html from main array
const mainOld = `    { loc: '/terms.html', pri: '0.3', freq: 'yearly' },
    { loc: '/legal-forms.html', pri: '0.8', freq: 'monthly' },
    { loc: '/legal-radar.html', pri: '0.6', freq: 'daily' },`;

const mainNew = `    { loc: '/terms.html', pri: '0.3', freq: 'yearly' },
    { loc: '/legal-forms.html', pri: '0.8', freq: 'monthly' },
    // أدوات ومولدات 2026 التفاعلية
    { loc: '/calculate-old-rent.html', pri: '0.85', freq: 'monthly' },
    { loc: '/calculate-building-reconciliation.html', pri: '0.85', freq: 'monthly' },
    { loc: '/calculate-court-fees.html', pri: '0.85', freq: 'monthly' },
    { loc: '/calculate-prescription-periods.html', pri: '0.85', freq: 'monthly' },
    { loc: '/calculate-attorney-fees.html', pri: '0.85', freq: 'monthly' },
    { loc: '/calculate-traffic-compensation.html', pri: '0.85', freq: 'monthly' },
    { loc: '/criminal-procedure-new.html', pri: '0.85', freq: 'monthly' },
    { loc: '/felony-appeal-generator.html', pri: '0.85', freq: 'monthly' },
    { loc: '/bailiff-notices-generator.html', pri: '0.85', freq: 'monthly' },
    { loc: '/property-buyer-checklist.html', pri: '0.85', freq: 'monthly' },
    { loc: '/inheritance-deed-generator.html', pri: '0.85', freq: 'monthly' },
    { loc: '/legal-glossary.html', pri: '0.85', freq: 'monthly' },
    { loc: '/html-sitemap-hub.html', pri: '0.7', freq: 'monthly' },`;

code = code.replace(mainOld, mainNew);

// 3. Update buildSitemap to use isIndexable for blogFiles, formsDocFiles, etc.
code = code.replace(
  'const blogFiles = listHtml(BLOG_DIR).filter(f => !CANNIBALIZATION_EXCLUSIONS.has(f));',
  'const blogFiles = listHtml(BLOG_DIR).filter(f => isIndexable(BLOG_DIR, f, `/blog/${f}`));'
);
code = code.replace(
  'const formsDocFiles = listHtml(FORMS_DOCS_DIR);',
  'const formsDocFiles = listHtml(FORMS_DOCS_DIR).filter(f => isIndexable(FORMS_DOCS_DIR, f, `/legal-forms-docs/${f}`));'
);
code = code.replace(
  'const libraryTopicFiles = listHtml(LIBRARY_TOPICS_DIR);',
  'const libraryTopicFiles = listHtml(LIBRARY_TOPICS_DIR).filter(f => isIndexable(LIBRARY_TOPICS_DIR, f, `/legal-library-topics/${f}`));'
);
code = code.replace(
  'const courtFiles = listHtml(COURTS_DIR);',
  'const courtFiles = listHtml(COURTS_DIR).filter(f => isIndexable(COURTS_DIR, f, `/courts/${f}`));'
);

// 4. Filter main items if in fbRedirectSources or noindex
const mainLoopOld = `  for (const m of main) {
    const lmod = getMainLastmod(m.loc);
    urls.push(\`  <url>\\n    <loc>\${BASE_URL}\${m.loc}</loc>\\n    <lastmod>\${lmod}</lastmod>\\n    <changefreq>\${m.freq}</changefreq>\\n    <priority>\${m.pri}</priority>\\n  </url>\`);
  }`;

const mainLoopNew = `  for (const m of main) {
    if (fbRedirectSources.has(m.loc) || fbRedirectSources.has(m.loc.replace(/^\\//, ''))) continue;
    const lmod = getMainLastmod(m.loc);
    urls.push(\`  <url>\\n    <loc>\${BASE_URL}\${m.loc}</loc>\\n    <lastmod>\${lmod}</lastmod>\\n    <changefreq>\${m.freq}</changefreq>\\n    <priority>\${m.pri}</priority>\\n  </url>\`);
  }`;

code = code.replace(mainLoopOld, mainLoopNew);

// 5. Add buildPriorityTier1Sitemap and its export/write logic at bottom
const endAnchor = `const xml = buildSitemap();`;
const endReplacement = `function buildPriorityTier1Sitemap() {
  const priorityUrls = [
    { loc: '/', pri: '1.0', freq: 'daily' },
    { loc: '/pillars/', pri: '1.0', freq: 'weekly' },
    { loc: '/blog/', pri: '0.9', freq: 'daily' },
    { loc: '/legal-calculators.html', pri: '0.9', freq: 'weekly' },
    { loc: '/legal-library.html', pri: '0.9', freq: 'weekly' },
    { loc: '/contract-generator.html', pri: '0.9', freq: 'weekly' },
    { loc: '/court-precedents.html', pri: '0.9', freq: 'weekly' },
    { loc: '/real-estate.html', pri: '0.9', freq: 'weekly' },
    { loc: '/calculate-old-rent.html', pri: '0.9', freq: 'weekly' },
    { loc: '/calculate-building-reconciliation.html', pri: '0.9', freq: 'weekly' },
    { loc: '/calculate-court-fees.html', pri: '0.9', freq: 'weekly' },
    { loc: '/calculate-prescription-periods.html', pri: '0.9', freq: 'weekly' },
    { loc: '/calculate-attorney-fees.html', pri: '0.9', freq: 'weekly' },
    { loc: '/calculate-traffic-compensation.html', pri: '0.9', freq: 'weekly' },
    { loc: '/calculate-inheritance.html', pri: '0.9', freq: 'weekly' },
    { loc: '/calculate-alimony.html', pri: '0.9', freq: 'weekly' },
    { loc: '/calculate-end-of-service.html', pri: '0.9', freq: 'weekly' },
    { loc: '/criminal-procedure-new.html', pri: '0.9', freq: 'weekly' },
    { loc: '/felony-appeal-generator.html', pri: '0.9', freq: 'weekly' },
    { loc: '/bailiff-notices-generator.html', pri: '0.9', freq: 'weekly' },
    { loc: '/property-buyer-checklist.html', pri: '0.9', freq: 'weekly' },
    { loc: '/inheritance-deed-generator.html', pri: '0.9', freq: 'weekly' },
    { loc: '/legal-glossary.html', pri: '0.9', freq: 'weekly' },
    { loc: '/html-sitemap-hub.html', pri: '0.8', freq: 'weekly' },
    { loc: '/company-incorporation.html', pri: '0.85', freq: 'monthly' },
    { loc: '/appeal-deadlines.html', pri: '0.85', freq: 'monthly' },
    { loc: '/legal-diagnostics.html', pri: '0.85', freq: 'monthly' },
    { loc: '/courts-directory.html', pri: '0.85', freq: 'monthly' },
    { loc: '/why-trust-us.html', pri: '0.8', freq: 'monthly' },
    { loc: '/features.html', pri: '0.8', freq: 'monthly' },
  ];

  const pillarFiles = listHtml(PILLARS_DIR).filter(f => isIndexable(PILLARS_DIR, f, \`/pillars/\${f}\`));
  for (const f of pillarFiles) {
    priorityUrls.push({ loc: \`/pillars/\${f}\`, pri: '0.95', freq: 'weekly' });
  }

  const goldenArticles = [
    'old-rent-law-2026-eviction-and-increase.html',
    'shahr-aqary-apartment-registration-guide-2026.html',
    'end-of-service-gratuity-calculation-new-labor-law.html',
    'trust-receipt-validity-conditions-and-defenses-egypt.html',
    'divorce-for-harm-conditions-proof-and-financial-rights.html',
    'legal-heirship-certificate-procedures-and-documents.html',
    'building-violation-reconciliation-law-updates-model-8.html',
    'inheritance-withholding-penalties-article-49.html',
    'sale-contract-validity-and-enforcement-lawsuit-vs-signature.html',
    'instapay-accidental-transfer-legal-recovery-procedures.html',
    'khula-divorce-lawsuit-procedures-and-dowry-return.html',
    'criminal-cassation-appeal-deadlines-and-grounds-2026.html',
    'arbitrary-dismissal-and-form-6-challenge-labor-law.html',
    'civil-lawsuit-court-fees-calculation-guide.html',
    'bounced-cheque-penalties-and-statute-of-limitations.html',
    'limited-liability-company-incorporation-procedures-gafi.html',
    'child-custody-remarriage-and-father-visitation-rights.html',
    'judicial-case-inquiry-by-national-id-egypt-justice-portal.html',
    'inheritance-distribution-single-daughter-and-wife-radd.html'
  ];

  for (const g of goldenArticles) {
    if (isIndexable(BLOG_DIR, g, \`/blog/\${g}\`)) {
      priorityUrls.push({ loc: \`/blog/\${g}\`, pri: '0.9', freq: 'daily' });
    }
  }

  const today = cairoDateStr();
  const entries = priorityUrls.map(u => {
    let lmod = today;
    try {
      let rel = u.loc.replace(/^\\//, '');
      if (rel === '') rel = 'index.html';
      const fp = path.join(ROOT, 'public', rel);
      if (fs.existsSync(fp)) lmod = fs.statSync(fp).mtime.toISOString().slice(0, 10);
    } catch {}
    return \`  <url>\\n    <loc>\${BASE_URL}\${u.loc}</loc>\\n    <lastmod>\${lmod}</lastmod>\\n    <changefreq>\${u.freq}</changefreq>\\n    <priority>\${u.pri}</priority>\\n  </url>\`;
  });

  return \`<?xml version="1.0" encoding="UTF-8"?>\\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n\${entries.join('\\n')}\\n</urlset>\\n\`;
}

const TIER1_FILE = path.join(ROOT, 'public', 'priority-tier1-sitemap.xml');
const tier1Xml = buildPriorityTier1Sitemap();
fs.writeFileSync(TIER1_FILE, tier1Xml, 'utf8');
const tier1Count = (tier1Xml.match(/<loc>/g) || []).length;
console.log(\`[sitemap] تم توليد priority-tier1-sitemap.xml: \${tier1Count} رابطاً (\${TIER1_FILE})\`);

const DIST_TIER1 = path.join(ROOT, 'dist', 'priority-tier1-sitemap.xml');
if (fs.existsSync(path.dirname(DIST_TIER1))) {
  fs.writeFileSync(DIST_TIER1, tier1Xml, 'utf8');
  console.log(\`[sitemap] ✓ تمت مزامنة priority-tier1-sitemap.xml مع dist/\`);
}

const xml = buildSitemap();`;

code = code.replace(endAnchor, endReplacement);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('scripts/blog-publisher/generate-sitemap.cjs updated successfully!');
