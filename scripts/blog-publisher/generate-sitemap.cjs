#!/usr/bin/env node
/**
 * generate-sitemap.cjs — إعادة توليد public/sitemap.xml و public/sitemap.html من المحتوى الفعلي
 * يُستدعى تلقائياً في نهاية daily-publish.cjs بعد كل نشر، أو يدوياً:
 *   node scripts/blog-publisher/generate-sitemap.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { headerMarkup, HEADER_CSS } = require('../seo/unified-header.cjs');

const ROOT = path.join(__dirname, '..', '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');
const FORMS_DOCS_DIR = path.join(ROOT, 'public', 'legal-forms-docs');
const RADAR_TOPICS_DIR = path.join(ROOT, 'public', 'radar-topics');
const LIBRARY_TOPICS_DIR = path.join(ROOT, 'public', 'legal-library-topics');
const SITEMAP_FILE = path.join(ROOT, 'public', 'sitemap.xml');
const SITEMAP_HTML_FILE = path.join(ROOT, 'public', 'sitemap.html');
const BASE_URL = 'https://mohamidigital.online';

function listHtml(dir) {
  return fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /^[a-z0-9_-]+\.html$/.test(f) && f !== 'index.html').sort()
    : [];
}

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
  const blogFiles = listHtml(BLOG_DIR);
  const pillarFiles = listHtml(PILLARS_DIR);
  const formsDocFiles = listHtml(FORMS_DOCS_DIR);
  const radarTopicFiles = listHtml(RADAR_TOPICS_DIR);
  const libraryTopicFiles = listHtml(LIBRARY_TOPICS_DIR);
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
    { loc: '/why-trust-us.html', pri: '0.6', freq: 'monthly' },
    { loc: '/contact.html', pri: '0.6', freq: 'monthly' },
    { loc: '/privacy.html', pri: '0.3', freq: 'yearly' },
    { loc: '/terms.html', pri: '0.3', freq: 'yearly' },
    { loc: '/sitemap.html', pri: '0.3', freq: 'monthly' },
    { loc: '/legal-forms.html', pri: '0.8', freq: 'monthly' },
    { loc: '/legal-radar.html', pri: '0.6', freq: 'daily' },
    // بوابات دول الخليج
    { loc: '/saudi-legal-hub.html', pri: '0.85', freq: 'monthly' },
    { loc: '/saudi-legal-hub-en.html', pri: '0.8', freq: 'monthly' },
    { loc: '/uae-legal-hub.html', pri: '0.85', freq: 'monthly' },
    { loc: '/uae-legal-hub-en.html', pri: '0.8', freq: 'monthly' },
    { loc: '/qatar-legal-hub.html', pri: '0.85', freq: 'monthly' },
    { loc: '/qatar-legal-hub-en.html', pri: '0.8', freq: 'monthly' },
    { loc: '/oman-legal-hub.html', pri: '0.85', freq: 'monthly' },
    { loc: '/oman-legal-hub-en.html', pri: '0.8', freq: 'monthly' },
    // البوابات والخدمات العامة
    { loc: '/courts-directory.html', pri: '0.8', freq: 'monthly' },
    { loc: '/legal-calculators.html', pri: '0.8', freq: 'monthly' },
    { loc: '/court-precedents.html', pri: '0.85', freq: 'weekly' },
    { loc: '/lawyers-directory.html', pri: '0.8', freq: 'monthly' },
    { loc: '/legal-consultations.html', pri: '0.8', freq: 'monthly' },
    { loc: '/citizen-complaints.html', pri: '0.75', freq: 'monthly' },
    { loc: '/e-justice-services.html', pri: '0.75', freq: 'monthly' },
    { loc: '/company-incorporation.html', pri: '0.75', freq: 'monthly' },
    { loc: '/legal-diagnostics.html', pri: '0.7', freq: 'monthly' },
    { loc: '/disclaimer.html', pri: '0.3', freq: 'yearly' },
    { loc: '/editorial-policy.html', pri: '0.6', freq: 'yearly' },
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

  // كل صفحات صيغ العقود المستقلة
  for (const f of formsDocFiles) {
    urls.push(`  <url>\n    <loc>${BASE_URL}/legal-forms-docs/${f}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
  }

  // كل صفحات موضوعات رصد المحامي المستقلة
  for (const f of radarTopicFiles) {
    urls.push(`  <url>\n    <loc>${BASE_URL}/radar-topics/${f}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.5</priority>\n  </url>`);
  }

  // كل أدلة المكتبة القانونية
  for (const f of libraryTopicFiles) {
    urls.push(`  <url>\n    <loc>${BASE_URL}/legal-library-topics/${f}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSitemapHtml() {
  const blogFiles = listHtml(BLOG_DIR);
  const pillarFiles = listHtml(PILLARS_DIR);
  const formsDocFiles = listHtml(FORMS_DOCS_DIR);
  const radarTopicFiles = listHtml(RADAR_TOPICS_DIR);
  const libraryTopicFiles = listHtml(LIBRARY_TOPICS_DIR);

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

  const formsDocs = formsDocFiles.map((f) => {
    let title = f.replace(/\.html$/, '').replace(/-/g, ' ');
    try {
      const html = fs.readFileSync(path.join(FORMS_DOCS_DIR, f), 'utf8');
      title = extractTitle(html) || title;
    } catch {}
    return { file: f, title };
  });

  const radarTopics = radarTopicFiles.map((f) => {
    let title = f.replace(/\.html$/, '').replace(/-/g, ' ');
    try {
      const html = fs.readFileSync(path.join(RADAR_TOPICS_DIR, f), 'utf8');
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

  const formsDocItems = formsDocs
    .map((p) => `        <li><a href="/legal-forms-docs/${p.file}">${esc(p.title)}</a></li>`)
    .join('\n');

  const radarTopicItems = radarTopics
    .map((p) => `        <li><a href="/radar-topics/${p.file}">${esc(p.title)}</a></li>`)
    .join('\n');

  const libraryTopics = libraryTopicFiles.map((f) => {
    let title = f.replace(/\.html$/, '').replace(/-/g, ' ');
    try {
      const html = fs.readFileSync(path.join(LIBRARY_TOPICS_DIR, f), 'utf8');
      title = extractTitle(html) || title;
    } catch {}
    return { file: f, title };
  });

  const libraryTopicItems = libraryTopics
    .map((p) => `        <li><a href="/legal-library-topics/${p.file}">${esc(p.title)}</a></li>`)
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
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
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
  ${HEADER_CSS}
  <link rel="stylesheet" href="/search.css" />
</head>
<body>

  <header class="uh-bar" id="siteHeader">
    <div class="uh-inner">
      <a href="/" class="uh-logo" aria-label="منصة المحامي الرقمية">
        <span class="uh-badge">⚖️</span>
        <span class="uh-brand">
          <span class="uh-title">المحامي الرقمي</span>
          <span class="uh-sub">مساعدك القانوني الذكي · مجاناً</span>
        </span>
      </a>

      <nav class="uh-nav" id="headerNav" role="navigation" aria-label="القائمة الرئيسية">
        <a href="/" class="uh-link active">🏠 الرئيسية</a>
        <a href="/blog/" class="uh-link">📰 المدونة القانونية</a>
        <a href="/legal-library.html" class="uh-link">📚 المكتبة القانونية</a>
        <a href="/pillars/" class="uh-link">🏛️ المراجع الشاملة</a>
        <a href="/legal-forms.html" class="uh-link">📝 صيغ العقود والدعاوي</a>
        <a href="/legal-radar.html" class="uh-link">🔍 رصد المحامي</a>
        <div class="uh-more" id="uhMore">
          <button class="uh-more-btn" type="button" aria-expanded="false" aria-haspopup="true">
            <span>المزيد</span><span class="uh-caret">▾</span>
          </button>
          <div class="uh-menu">
            <a href="/about.html" class="uh-menu-item">⚖️ عن المنصة</a>
            <a href="/features.html" class="uh-menu-item">⚡ المميزات الكاملة</a>
            <a href="/pricing.html" class="uh-menu-item">🎁 الأسعار — مجاني 100%</a>
            <a href="/why-trust-us.html" class="uh-menu-item">🛡️ لماذا تثق بنا</a>
            <a href="/privacy.html" class="uh-menu-item">🔐 سياسة الخصوصية</a>
            <a href="/terms.html" class="uh-menu-item">📜 الشروط والأحكام</a>
            <a href="/contact.html" class="uh-menu-item">📬 تواصل معنا</a>
          </div>
        </div>
      </nav>

      <div class="uh-actions">
        <a href="/" class="uh-cta"><span>🚀 دخول التطبيق</span></a>
        <button class="uh-burger" id="uhBurger" type="button" aria-label="فتح القائمة" aria-expanded="false" aria-controls="headerNav">☰</button>
      </div>
    </div>
  </header>
  <script>
    (function(){
      var hdr=document.getElementById('siteHeader');
      var nav=document.getElementById('headerNav');
      var burger=document.getElementById('uhBurger');
      var more=document.getElementById('uhMore');
      var moreBtn=more?more.querySelector('.uh-more-btn'):null;
      if(hdr)window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>20);},{passive:true});
      function closeMobile(){
        if(nav)nav.classList.remove('active');
        if(burger){burger.setAttribute('aria-expanded','false');burger.innerHTML='☰';burger.setAttribute('aria-label','فتح القائمة');}
      }
      if(burger){burger.addEventListener('click',function(){
        var open=nav.classList.toggle('active');
        burger.setAttribute('aria-expanded',open);
        burger.innerHTML=open?'✕':'☰';
        burger.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');
        if(!open&&more){more.classList.remove('open');}
      });}
      if(moreBtn&&more){
        moreBtn.addEventListener('click',function(e){
          e.stopPropagation();
          var open=more.classList.toggle('open');
          moreBtn.setAttribute('aria-expanded',open);
        });
      }
      document.addEventListener('click',function(e){
        if(more&&more.classList.contains('open')&&!more.contains(e.target)){
          more.classList.remove('open');
          if(moreBtn)moreBtn.setAttribute('aria-expanded','false');
        }
        if(nav&&nav.classList.contains('active')&&burger&&!nav.contains(e.target)&&!burger.contains(e.target)){
          closeMobile();
        }
      });
    })();
  </script>
  <div class="container">
    <a href="/" class="back-home">← العودة للرئيسية</a>
    <h1>🗺️ خريطة الموقع</h1>
    <p class="lead">كل صفحات منصة المحامي الرقمية في مكان واحد — للزوار ومحركات البحث. محدّثة بانتظام مع كل محتوى جديد.</p>

    <div class="section">
      <h2>🏠 الصفحات الرئيسية</h2>
      <ul class="link-list">
        <li><a href="/">الصفحة الرئيسية</a> <span class="pill">indexed</span></li>
        <li><a href="/about.html">عن المنصة</a></li>
        <li><a href="/why-trust-us.html">🛡️ لماذا تثق بنا</a></li>
        <li><a href="/features.html">مميزات النظام</a></li>
        <li><a href="/legal-library.html">📚 المكتبة القانونية الشاملة</a></li>
        <li><a href="/legal-forms.html">📄 صيغ العقود والدعاوي</a></li>
        <li><a href="/legal-radar.html">📡 رصد المحامي — أخبار وترندات مصر</a></li>
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
      <h2>📄 صيغ العقود والدعاوي</h2>
      <p class="meta">صفحات مستقلة لكل عقد وصحيفة — النصوص الكاملة والبنود</p>
      <ul class="link-list">
        <li><a href="/legal-forms.html">صفحة الصيغ الرئيسية</a></li>
${formsDocItems}
      </ul>
    </div>

    <div class="section">
      <h2>📡 موضوعات رصد المحامي</h2>
      <p class="meta">تحليلات يومية لكل موضوع — >3000 كلمة</p>
      <ul class="link-list">
        <li><a href="/legal-radar.html">صفحة الرصد الرئيسية</a></li>
${radarTopicItems}
      </ul>
    </div>

    <div class="section">
      <h2>📚 أدلة المكتبة القانونية</h2>
      <p class="meta">أدلة متخصصة في فروع القانون المصري — ≥3000 كلمة</p>
      <ul class="link-list">
        <li><a href="/legal-library.html">صفحة المكتبة الرئيسية</a></li>
${libraryTopicItems}
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
