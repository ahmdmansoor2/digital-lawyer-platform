#!/usr/bin/env node
/**
 * generate-sitemap.cjs — إعادة توليد public/sitemap.xml و public/sitemap.html من المحتوى الفعلي
 * يُستدعى تلقائياً في نهاية daily-publish.cjs بعد كل نشر، أو يدوياً:
 *   node scripts/blog-publisher/generate-sitemap.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');
const SITEMAP_FILE = path.join(ROOT, 'public', 'sitemap.xml');
const SITEMAP_HTML_FILE = path.join(ROOT, 'public', 'sitemap.html');
const BASE_URL = 'https://justice-91571.web.app';

function cairoDateStr() {
  return new Date(Date.now() + 120 * 60000).toISOString().slice(0, 10);
}

// خريطة مواضيعية لتجميع مقالات المدونة في sitemap.html
const TOPIC_GROUPS = [
  { id: 'lawfirm', title: 'إدارة مكاتب المحاماة', slugs: ['legal-practice-tips', 'case-management-guide', 'tech-for-lawyers', 'courtroom-advocacy', 'law-firm-marketing'] },
  { id: 'labor', title: 'قانون العمل', slugs: ['labor-contracts-egypt', 'employment-contract-termination', 'labor-rights-termination', 'labor-dismissal-compensation', 'trial-period-rights', 'official-holidays-labor-law-egypt', 'official-holidays-overtime-labor-law-egypt', 'labor-insurance-egypt', 'workplace-harassment-law'] },
  { id: 'family', title: 'قانون الأسرة والأحوال الشخصية', slugs: ['khul-divorce-procedure', 'khul-divorce-procedures-egypt', 'divorce-procedures-egypt', 'divorce-damages-claim', 'child-custody-egypt', 'alimony-calculation-egypt', 'civil-marriage-contract', 'prenuptial-agreement', 'shabka-and-engagement-gifts-law-egypt', 'private-international-law', 'paternity-dna-test'] },
  { id: 'inheritance', title: 'الميراث والتركات', slugs: ['inheritance-debt-priority', 'inheritance-law-egypt', 'inheritance-registration', 'inheritance-shares-egypt'] },
  { id: 'realestate', title: 'العقارات والإيجار', slugs: ['building-collapse-liability-egypt', 'force-majeure-real-estate-contracts-egypt', 'late-tenant-payment', 'real-estate-contract-risks', 'real-estate-disposal-tax-egypt', 'real-estate-fraud', 'real-estate-ownership-transfer', 'real-estate-registration-egypt', 'rent-eviction-cases', 'rent-increase-egypt', 'rental-deposit-rights', 'shahr-aqary-registration-procedures'] },
  { id: 'companies', title: 'الشركات والتجاري', slugs: ['bankruptcy-judicial-settlement', 'company-board-liability', 'company-formation-egypt', 'company-incorporation-egypt', 'limited-liability-company'] },
  { id: 'debt', title: 'الشيكات والديون', slugs: ['bounced-checks-laws-egypt', 'bounced-cheque-laws-egypt', 'cheque-return-egypt', 'debt-collection-egypt', 'debt-statute-limitations', 'execution-judgments-egypt'] },
  { id: 'tax', title: 'الضرائب', slugs: ['tax-dispute-procedure', 'tax-evasion-penalties', 'real-estate-disposal-tax-egypt'] },
  { id: 'currency', title: 'العملة والتجارة', slugs: ['foreign-currency-illegal-trading-egypt', 'foreign-currency-trading-laws-egypt', 'egypt-customs-duty-mobile-phones-law'] },
  { id: 'criminal', title: 'القانون الجنائي', slugs: ['criminal-defense-rights', 'criminal-investigation-rights', 'drug-offense-defense', 'forensic-medicine-procedures-egypt', 'pretrial-detention-law-egypt', 'witness-testimony-egypt'] },
  { id: 'admin', title: 'القانون الإداري', slugs: ['administrative-appeals-egypt', 'administrative-grievance'] },
  { id: 'civil', title: 'القانون المدني والعقود', slugs: ['car-accident-compensation-egypt', 'civil-compensation-lawsuits', 'contract-legal-requirements', 'force-majeure-clause-egyptian-law', 'traffic-accident-claims'] },
  { id: 'cyber', title: 'جرائم الإنترنت والملكية الفكرية', slugs: ['bitcoin-crypto-law-egypt', 'cybercrime-defamation-laws-egypt', 'cybercrime-extortion-laws-egypt', 'digital-copyright', 'intellectual-property-artist-rights-egypt', 'intellectual-property-digital-piracy-egypt'] },
  { id: 'consumer', title: 'حقوق المستهلك والاتصالات', slugs: ['consumer-protection-egypt', 'consumer-rights-egypt', 'private-school-fees-legal-rights', 'telecom-user-rights-and-complaints-egypt'] },
  { id: 'courts', title: 'التقاضي والمحاكم', slugs: ['judicial-fees-court', 'judicial-recess-deadlines-egypt', 'small-claims-court'] },
  { id: 'sports', title: 'القانون الرياضي', slugs: ['sports-contracts-arbitration-egypt', 'sports-player-contracts-arbitration-egypt'] },
  { id: 'personal', title: 'أوراق رسمية وإجراءات', slugs: ['power-of-attorney-egypt', 'travel-ban-reasons'] },
];

// مقالة غير مصنفة → تُضاف لقسم "قضايا أخرى"
const FALLBACK_TITLE = 'قضايا قانونية أخرى';

function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/);
  if (!m) return null;
  return m[1].replace(/ - منصة المحامي الرقمية\s*$/, '').replace(/ — منصة المحامي الرقمية\s*$/, '').trim();
}

function buildSitemap() {
  const blogFiles = fs.existsSync(BLOG_DIR)
    ? fs.readdirSync(BLOG_DIR).filter(f => /^[a-z0-9-]+\.html$/.test(f) && f !== 'index.html').sort()
    : [];
  const pillarFiles = fs.existsSync(PILLARS_DIR)
    ? fs.readdirSync(PILLARS_DIR).filter(f => /^[a-z0-9-]+\.html$/.test(f) && f !== 'index.html').sort()
    : [];
  const today = cairoDateStr();
  const urls = [];

  // الصفحات الأساسية للتطبيق
  const main = [
    { loc: '/', pri: '1.0', freq: 'daily' },
    { loc: '/blog/', pri: '0.9', freq: 'daily' },
    { loc: '/legal-library.html', pri: '0.9', freq: 'monthly' },
    { loc: '/search.html', pri: '0.7', freq: 'monthly' },
    { loc: '/features.html', pri: '0.8', freq: 'monthly' },
    { loc: '/pricing.html', pri: '0.7', freq: 'monthly' },
    { loc: '/about.html', pri: '0.6', freq: 'monthly' },
    { loc: '/contact.html', pri: '0.6', freq: 'monthly' },
    { loc: '/privacy.html', pri: '0.3', freq: 'yearly' },
    { loc: '/terms.html', pri: '0.3', freq: 'yearly' },
    { loc: '/sitemap.html', pri: '0.3', freq: 'monthly' },
  ];
  for (const m of main) {
    urls.push(`  <url>\n    <loc>${BASE_URL}${m.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${m.freq}</changefreq>\n    <priority>${m.pri}</priority>\n  </url>`);
  }

  // صفحة pillars الرئيسية
  urls.push(`  <url>\n    <loc>${BASE_URL}/pillars/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`);

  // كل صفحات pillars (المراجع الشاملة)
  for (const f of pillarFiles) {
    urls.push(`  <url>\n    <loc>${BASE_URL}/pillars/${f}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`);
  }

  // كل مقالات المدونة
  for (const f of blogFiles) {
    const slug = f.replace(/\.html$/, '');
    urls.push(`  <url>\n    <loc>${BASE_URL}/blog/${f}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSitemapHtml() {
  const blogFiles = fs.existsSync(BLOG_DIR)
    ? fs.readdirSync(BLOG_DIR).filter(f => /^[a-z0-9-]+\.html$/.test(f) && f !== 'index.html').sort()
    : [];
  const pillarFiles = fs.existsSync(PILLARS_DIR)
    ? fs.readdirSync(PILLARS_DIR).filter(f => /^[a-z0-9-]+\.html$/.test(f) && f !== 'index.html').sort()
    : [];

  // slug → {title, file}
  const articles = {};
  for (const f of blogFiles) {
    const slug = f.replace(/\.html$/, '');
    let title = slug;
    try {
      const html = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
      title = extractTitle(html) || slug;
    } catch {}
    articles[slug] = { title, file: f };
  }

  // تجميع المقالات حسب الخريطة + فئة "قضايا أخرى" للمقالات غير المصنفة
  const grouped = TOPIC_GROUPS.map((g) => ({
    ...g,
    items: g.slugs.filter((s) => articles[s]).map((s) => articles[s]),
  }));
  const groupedSlugs = new Set(TOPIC_GROUPS.flatMap((g) => g.slugs));
  const fallback = Object.values(articles).filter((a) => !groupedSlugs.has(a.file.replace(/\.html$/, '')));
  if (fallback.length) {
    grouped.push({ id: 'other', title: FALLBACK_TITLE, slugs: [], items: fallback });
  }

  const pillars = pillarFiles.map((f) => {
    let title = f.replace(/\.html$/, '').replace(/-/g, ' ');
    try {
      const html = fs.readFileSync(path.join(PILLARS_DIR, f), 'utf8');
      title = extractTitle(html) || title;
    } catch {}
    return { file: f, title };
  });

  const blogSections = grouped
    .filter((g) => g.items.length)
    .map((g) => {
      const items = g.items
        .map((a) => `        <li><a href="/blog/${a.file}">${esc(a.title)}</a></li>`)
        .join('\n');
      return `        <h3>${esc(g.title)}</h3>\n${items}`;
    })
    .join('\n\n');

  const pillarItems = pillars
    .map((p) => `        <li><a href="/pillars/${p.file}">${esc(p.title)}</a></li>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>خريطة الموقع - منصة المحامي الرقمية</title>
  <meta name="description" content="كل صفحات موقع منصة المحامي الرقمية في مكان واحد. دليل شامل للخدمات، المدونة، المراجع القانونية، ومكتبة قانونية." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${BASE_URL}/sitemap.html" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      line-height: 1.7;
      padding: 40px 20px;
      background-image: radial-gradient(ellipse at 30% 0%, rgba(124,58,237,0.18) 0%, transparent 55%),
                        radial-gradient(ellipse at 90% 70%, rgba(16,185,129,0.1) 0%, transparent 50%);
    }
    .container { max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 2.4rem; font-weight: 900; margin-bottom: 12px; background: linear-gradient(135deg, #fde047, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .lead { color: #94a3b8; font-size: 1.1rem; margin-bottom: 40px; }
    .section { background: rgba(30,41,59,0.6); border: 1px solid rgba(148,163,184,0.12); border-radius: 16px; padding: 32px; margin-bottom: 24px; }
    .section h2 { color: #fde047; font-size: 1.5rem; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid rgba(245,158,11,0.3); }
    .section h3 { color: #c4b5fd; font-size: 1.15rem; margin: 20px 0 10px; }
    ul.link-list { list-style: none; padding: 0; }
    ul.link-list li { margin: 6px 0; }
    ul.link-list a { color: #cbd5e1; text-decoration: none; padding: 8px 12px; display: block; border-radius: 8px; transition: all 0.2s; }
    ul.link-list a:hover { background: rgba(99,102,241,0.15); color: #fde047; transform: translateX(-4px); }
    .pill { display: inline-block; background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 2px 8px; border-radius: 100px; font-size: 0.75rem; margin-right: 8px; }
    .meta { color: #64748b; font-size: 0.85rem; }
    .back-home { display: inline-block; background: linear-gradient(135deg, #6366f1, #7c3aed); color: white; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 600; margin-bottom: 30px; }
  </style>
  <link rel="stylesheet" href="/search.css" />
</head>
<body>
  <div class="container">
    <a href="/" class="back-home">← العودة للرئيسية</a>
    <h1>🗺️ خريطة الموقع</h1>
    <p class="lead">كل صفحات منصة المحامي الرقمية في مكان واحد — للزوار ومحركات البحث. محدّثة بانتظام مع كل محتوى جديد.</p>

    <div class="section">
      <h2>🏠 الصفحات الرئيسية</h2>
      <ul class="link-list">
        <li><a href="/">الصفحة الرئيسية</a> <span class="pill">indexed</span></li>
        <li><a href="/about.html">عن المنصة</a></li>
        <li><a href="/features.html">مميزات النظام</a></li>
        <li><a href="/legal-library.html">📚 المكتبة القانونية الشاملة</a></li>
        <li><a href="/search.html">🔍 بحث في الموقع</a></li>
        <li><a href="/pricing.html">الأسعار (مجاني بالكامل)</a></li>
        <li><a href="/contact.html">تواصل معنا</a></li>
      </ul>
    </div>

    <div class="section">
      <h2>⚖️ المراجع القانونية</h2>
      <p class="meta">أدلة شاملة (2000-3500 كلمة) — محتوى احترافي للمحامين</p>
      <ul class="link-list">
        <li><a href="/pillars/">صفحة المراجع الرئيسية</a></li>
${pillarItems}
      </ul>
    </div>

    <div class="section">
      <h2>📚 المدونة القانونية</h2>
      <p class="meta">مقالات متخصصة — محتوى يومي عن القانون المصري</p>
      <ul class="link-list">
        <li><a href="/blog/">كل المقالات</a></li>

${blogSections}
      </ul>
    </div>

    <div class="section">
      <h2>📄 الصفحات القانونية</h2>
      <ul class="link-list">
        <li><a href="/privacy.html">سياسة الخصوصية</a></li>
        <li><a href="/terms.html">شروط الاستخدام</a></li>
      </ul>
    </div>

    <div class="section">
      <h2>🔧 للمطورين</h2>
      <ul class="link-list">
        <li><a href="/sitemap.xml">XML Sitemap (للـ Google)</a></li>
        <li><a href="/sitemap.html">HTML Sitemap (للزوار)</a></li>
        <li><a href="/robots.txt">robots.txt</a></li>
      </ul>
    </div>

    <p class="meta" style="text-align:center; margin-top:40px;">
      © 2026 منصة المحامي الرقمية · آخر تحديث: <span id="date"></span>
    </p>
  </div>
  <script>document.getElementById('date').textContent = new Date().toLocaleDateString('ar-EG');</script>
  <script src="/search.js" defer></script>
</body>
</html>
`;
}

const xml = buildSitemap();
fs.writeFileSync(SITEMAP_FILE, xml, 'utf8');
const count = (xml.match(/<loc>/g) || []).length;
console.log(`[sitemap] تم توليد sitemap.xml: ${count} رابطاً (${SITEMAP_FILE})`);

const html = buildSitemapHtml();
fs.writeFileSync(SITEMAP_HTML_FILE, html, 'utf8');
const htmlCount = (html.match(/href="\/blog\/[a-z0-9-]+\.html"/g) || []).filter((x, i, a) => a.indexOf(x) === i).length;
console.log(`[sitemap] تم توليد sitemap.html: ${htmlCount} مقالاً (${SITEMAP_HTML_FILE})`);
