'use strict';
const fs = require('fs');

// Pages that need OG tags added
const FIXES = [
  {
    path: 'public/contact.html',
    ogTitle: 'تواصل معنا | المحامي الرقمي',
    ogDesc: 'تواصل مع المستشار القانوني أحمد منصور وإدارة منصة المحامي الرقمية لأي استفسار قانوني.',
    ogUrl: 'https://mohamidigital.online/contact.html'
  },
  {
    path: 'public/calculate-inheritance.html',
    ogTitle: 'حاسبة المواريث والتركات الشرعية 2026 | المحامي الرقمي',
    ogDesc: 'احسب نصيبك من الميراث بدقة وفق أحكام الشريعة الإسلامية وقانون المواريث المصري رقم 77 لسنة 1943.',
    ogUrl: 'https://mohamidigital.online/calculate-inheritance.html'
  },
  {
    path: 'public/sitemap.html',
    ogTitle: 'خريطة الموقع | المحامي الرقمي',
    ogDesc: 'كل صفحات موقع المحامي الرقمي في مكان واحد. دليل شامل للخدمات والمدونة والمراجع القانونية.',
    ogUrl: 'https://mohamidigital.online/sitemap.html'
  }
];

FIXES.forEach(function(fix) {
  if (!fs.existsSync(fix.path)) {
    console.log('NOT FOUND: ' + fix.path);
    return;
  }

  let html = fs.readFileSync(fix.path, 'utf8');
  let changed = false;

  const ogBlock = [
    '  <meta property="og:type" content="website" />',
    '  <meta property="og:title" content="' + fix.ogTitle + '" />',
    '  <meta property="og:description" content="' + fix.ogDesc + '" />',
    '  <meta property="og:image" content="https://mohamidigital.online/og-image.jpg" />',
    '  <meta property="og:image:width" content="1200" />',
    '  <meta property="og:image:height" content="630" />',
    '  <meta property="og:url" content="' + fix.ogUrl + '" />',
    '  <meta property="og:site_name" content="منصة المحامي الرقمية" />',
    '  <meta property="og:locale" content="ar_EG" />'
  ].join('\n');

  if (html.indexOf('og:title') === -1 && html.indexOf('og:url') === -1) {
    // Insert full OG block before </head>
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + '\n' + ogBlock + '\n' + html.slice(headEnd);
      changed = true;
    }
  } else if (html.indexOf('og:image') === -1) {
    // Just add og:image after og:url
    const urlIdx = html.indexOf('property="og:url"');
    if (urlIdx !== -1) {
      const lineEnd = html.indexOf('\n', html.indexOf('>', urlIdx));
      if (lineEnd !== -1) {
        html = html.slice(0, lineEnd) +
          '\n  <meta property="og:image" content="https://mohamidigital.online/og-image.jpg" />' +
          '\n  <meta property="og:image:width" content="1200" />' +
          '\n  <meta property="og:image:height" content="630" />' +
          html.slice(lineEnd);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(fix.path, html, 'utf8');
    console.log('Fixed OG tags: ' + fix.path);
  } else {
    console.log('No OG changes needed: ' + fix.path);
  }
});

console.log('\nOG fix complete.');
