#!/usr/bin/env node
/**
 * news-requirements.cjs — استكمال متطلبات Google News داخل كل مقالات المدونة:
 *   1) حقن Subscribe with Google Basic (SWB) — كود Publisher Center المعتمد
 *   2) ترقية سكيما Article/BlogPosting إلى NewsArticle كاملة الحقول:
 *      author · publisher+logo · image · datePublished/Modified · mainEntityOfPage
 *   3) meta article:published_time / modified_time إن غابت (من mtime الملف)
 * آمن للتكرار (علامات مميزة). يُشغَّل يدوياً وداخل CI بعد كل نشر.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', '..', 'public');
const BLOG = path.join(PUBLIC, 'blog');
const BASE = 'https://mohamidigital.online';

const AUTHOR_NAME = 'الأستاذ أحمد منصور';
const AUTHOR_ROLE = 'مستشار قانوني';
const AUTHOR_URL = BASE + '/about.html';
const PUBLISHER_NAME = 'منصة المحامي الرقمية';

// ── 1) SWG Basic (كود Publisher Center كما ورد من جوجل) ──────────────────
const SWG =
'<script async type="application/javascript" src="https://news.google.com/swg/js/v1/swg-basic.js"></script>\n' +
'<script>\n' +
'  (self.SWG_BASIC = self.SWG_BASIC || []).push( basicSubscriptions => {\n' +
'    basicSubscriptions.init({\n' +
'      type: "NewsArticle",\n' +
'      isPartOfType: ["Product"],\n' +
'      isPartOfProductId: "CAowvaGDCw:openaccess",\n' +
'      clientOptions: { theme: "light", lang: "ar" },\n' +
'    });\n' +
'  });\n' +
'</script><!-- mohami-swg -->';

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

let swgN = 0, schemaN = 0, metaN = 0, total = 0;

for (const f of fs.readdirSync(BLOG)) {
  if (!f.endsWith('.html') || f === 'index.html') continue;
  const full = path.join(BLOG, f);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;
  total++;
  const stat = fs.statSync(full);
  const mtimeIso = stat.mtime.toISOString();

  // ── 1) SWG قبل </head> ──
  if (!html.includes('mohami-swg') && /<\/head>/i.test(html)) {
    html = html.replace(/(<\/head>)/i, SWG + '\n$1');
    swgN++;
  }

  // ── 3) metas الزمن إن غابت ──
  if (!/article:published_time/i.test(html) && /<\/head>/i.test(html)) {
    html = html.replace(/(<\/head>)/i,
      `<meta property="article:published_time" content="${mtimeIso}" />\n` +
      `<meta property="article:modified_time" content="${mtimeIso}" />\n$1`);
    metaN++;
  } else if (!/article:modified_time/i.test(html) && /<\/head>/i.test(html)) {
    html = html.replace(/(<\/head>)/i, `<meta property="article:modified_time" content="${mtimeIso}" />\n$1`);
    metaN++;
  }

  // ── 2) ترقية السكيما الأولى أو إنشاء NewsArticle كاملة إن غابت ──
  const re = /<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i;
  const mm = html.match(re);
  let handled = false;
  if (mm) {
    try {
      const obj = JSON.parse(mm[1]);
      const t = (obj['@type'] || '').toString();
      if (['Article', 'BlogPosting', 'NewsArticle', 'TechArticle'].includes(t)) {
        obj['@type'] = 'NewsArticle';
        if (!obj.headline) obj.headline = ((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '').trim();
        const ogImg = ((html.match(/property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1]) ||
                      ((html.match(/name=["']twitter:image["'][^>]*content=["']([^"']*)["']/i) || [])[1]);
        obj.image = ogImg ? [ogImg] : [BASE + '/icon.svg'];
        const pubMeta = ((html.match(/article:published_time["'][^>]*content=["']([^"']*)["']/i) || [])[1]) || mtimeIso;
        const modMeta = ((html.match(/article:modified_time["'][^>]*content=["']([^"']*)["']/i) || [])[1]) || mtimeIso;
        obj.datePublished = pubMeta;
        obj.dateModified = modMeta;
        obj.author = { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL, jobTitle: AUTHOR_ROLE };
        obj.publisher = {
          '@type': 'Organization',
          name: PUBLISHER_NAME,
          logo: { '@type': 'ImageObject', url: BASE + '/logo.svg', width: 600, height: 120 },
        };
        obj.mainEntityOfPage = { '@type': 'WebPage', '@id': BASE + '/blog/' + f };
        if (!obj.description) obj.description = ((html.match(/name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '');
        if (!obj.inLanguage) obj.inLanguage = 'ar';
        html = html.replace(mm[0], '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 2) + '\n</script>');
        schemaN++; handled = true;
      }
    } catch (e) {
      console.warn('[warn] JSON-LD غير صالح في', f, e.message);
    }
  }
  if (!handled && /<\/head>/i.test(html)) {
    // لا توجد سكيما مقال أصلاً — أنشئ NewsArticle كاملة
    const title = ((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '').replace(/\s*[\|\-–]\s*منصة.*$/i, '').trim();
    const desc = ((html.match(/name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '');
    const ogImg = ((html.match(/property=["']og:image["'][^>]*content=["']([^"']*)["']/i) || [])[1]) || BASE + '/icon.svg';
    const art = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: title,
      description: desc,
      image: [ogImg],
      datePublished: mtimeIso,
      dateModified: mtimeIso,
      inLanguage: 'ar',
      author: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL, jobTitle: AUTHOR_ROLE },
      publisher: { '@type': 'Organization', name: PUBLISHER_NAME, logo: { '@type': 'ImageObject', url: BASE + '/logo.svg', width: 600, height: 120 } },
      mainEntityOfPage: { '@type': 'WebPage', '@id': BASE + '/blog/' + f },
    };
    const block = '<script type="application/ld+json">\n' + JSON.stringify(art, null, 2) + '\n</script>';
    html = html.replace(/(<\/head>)/i, block + '\n$1');
    schemaN++;
  }

  if (html !== before) fs.writeFileSync(full, html, 'utf8');
}

console.log(`[news-req] مقالات: ${total} | SWG: ${swgN} | Schema→NewsArticle: ${schemaN} | metas زمنية: ${metaN}`);
