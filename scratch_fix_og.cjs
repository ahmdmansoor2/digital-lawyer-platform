'use strict';
const fs = require('fs');

const OG_IMAGE_TAG = '\n  <meta property="og:image" content="https://mohamidigital.online/og-image.jpg" />';
const OG_IMAGE_WIDTH = '\n  <meta property="og:image:width" content="1200" />';
const OG_IMAGE_HEIGHT = '\n  <meta property="og:image:height" content="630" />';

const PAGES_TO_FIX = [
  { path: 'public/contact.html', addSchema: true },
  { path: 'public/sitemap.html', addSchema: false },
  { path: 'public/courts-directory.html', addSchema: false },
  { path: 'public/legal-forms.html', addSchema: false },
  { path: 'public/calculate-inheritance.html', addSchema: false },
];

PAGES_TO_FIX.forEach(function(page) {
  if (!fs.existsSync(page.path)) {
    console.log('SKIP (not found): ' + page.path);
    return;
  }

  let html = fs.readFileSync(page.path, 'utf8');
  let changed = false;

  // Add og:image if missing
  if (html.indexOf('og:image') === -1) {
    // Find og:url or og:description to insert after
    const insertAfter = html.indexOf('property="og:url"') !== -1 ? 'property="og:url"' :
      html.indexOf('property="og:description"') !== -1 ? 'property="og:description"' :
      html.indexOf('property="og:title"') !== -1 ? 'property="og:title"' : null;

    if (insertAfter) {
      const lineEnd = html.indexOf('>', html.indexOf(insertAfter)) + 1;
      const nextNewline = html.indexOf('\n', lineEnd);
      if (nextNewline !== -1) {
        html = html.slice(0, nextNewline) + OG_IMAGE_TAG + OG_IMAGE_WIDTH + OG_IMAGE_HEIGHT + html.slice(nextNewline);
        changed = true;
      }
    }
  }

  // Add og:title if missing (for contact and calculate-inheritance)
  if (html.indexOf('og:title') === -1) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const titleText = titleMatch ? titleMatch[1].trim() : 'المحامي الرقمي';
    const ogTypeIdx = html.indexOf('property="og:type"');
    if (ogTypeIdx !== -1) {
      const lineEnd = html.indexOf('>', ogTypeIdx) + 1;
      const nextNewline = html.indexOf('\n', lineEnd);
      if (nextNewline !== -1) {
        html = html.slice(0, nextNewline) + '\n  <meta property="og:title" content="' + titleText + '" />' + html.slice(nextNewline);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(page.path, html, 'utf8');
    console.log('Fixed og:image/og:title in: ' + page.path);
  } else {
    console.log('No changes needed: ' + page.path);
  }
});

// Add ContactPage schema to contact.html
const contactPath = 'public/contact.html';
if (fs.existsSync(contactPath)) {
  let html = fs.readFileSync(contactPath, 'utf8');
  if (html.indexOf('ContactPage') === -1 && html.indexOf('ContactPoint') === -1) {
    const contactSchema = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "تواصل مع منصة المحامي الرقمية",
    "url": "https://mohamidigital.online/contact.html",
    "description": "تواصل مع المستشار القانوني أحمد منصور والإدارة لأي استفسار قانوني",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+20-100-078-7780",
      "contactType": "customer service",
      "areaServed": "EG",
      "availableLanguage": "Arabic"
    }
  }
  </script>`;
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + contactSchema + '\n' + html.slice(headEnd);
      fs.writeFileSync(contactPath, html, 'utf8');
      console.log('Added ContactPage schema to contact.html');
    }
  } else {
    console.log('Contact.html already has Schema');
  }
}

console.log('\nDone! All OG and Schema fixes applied.');
