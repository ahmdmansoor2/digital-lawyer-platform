#!/usr/bin/env node
/**
 * add-faq-schema.cjs — استخراج أسئلة FAQ من الـ Pillar pages وتحويلها لـ JSON-LD Schema
 *
 * بنقرأ H3 من المحتوى + نص الإجابة (paragraph بعدها)
 * بنولد FAQPage schema
 * بنضيفه قبل </head> (لو مش موجود)
 */

const fs = require('fs');
const path = require('path');

const PILLARS_DIR = path.resolve(__dirname, '..', '..', 'public', 'pillars');
const BASE_URL = 'https://mohamidigital.online';

function extractFAQFromHTML(html) {
  // الـ pillar pages فيها FAQ section
  // بندوّر على <aside class="faq"> ثم <h3> و <p>
  const faqMatch = html.match(/<aside class="faq"[^>]*>([\s\S]*?)<\/aside>/i);
  if (!faqMatch) return [];

  const faqSection = faqMatch[1];
  const faqs = [];
  // كل FAQ item = <h3>question</h3> <p>answer</p>
  const itemRegex = /<div class="faq-item">\s*<h3>([^<]+)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g;
  let match;
  while ((match = itemRegex.exec(faqSection)) !== null) {
    // بنضف الـ HTML من tags
    const cleanAnswer = match[2].replace(/<[^>]+>/g, '').trim();
    faqs.push({
      question: match[1].trim(),
      answer: cleanAnswer,
    });
  }
  return faqs;
}

function buildFAQSchema(faqs, pageTitle, pageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: pageTitle,
    url: pageUrl,
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

function injectFAQSchema(html, schema) {
  // لو فيه FAQPage schema موجود بالفعل، ما نضيفش تاني
  if (html.includes('"@type": "FAQPage"') || html.includes('"@type":"FAQPage"')) {
    return html;
  }
  if (!html.includes('</head>')) return html;
  const script = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  return html.replace('</head>', `${script}\n</head>`);
}

function processFile(filepath) {
  const slug = path.basename(filepath, '.html');
  const html = fs.readFileSync(filepath, 'utf8');
  const faqs = extractFAQFromHTML(html);
  if (faqs.length === 0) {
    console.log(`⊘ ${slug}: لا يوجد FAQ`);
    return;
  }

  // استخراج العنوان من <h1>
  const h1Match = html.match(/<h1>([^<]+)<\/h1>/);
  const title = h1Match ? h1Match[1].trim() : slug;

  const url = `${BASE_URL}/pillars/${slug}.html`;
  const schema = buildFAQSchema(faqs, title, url);
  const newHtml = injectFAQSchema(html, schema);
  fs.writeFileSync(filepath, newHtml, 'utf8');
  console.log(`✓ ${slug}: تم إضافة ${faqs.length} أسئلة لـ FAQPage schema`);
}

console.log(`📝 فحص FAQ schemas في الـ pillars...\n`);
const files = fs.readdirSync(PILLARS_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');
files.forEach(f => processFile(path.join(PILLARS_DIR, f)));
console.log('\n✅ تم');
