#!/usr/bin/env node
/**
 * generate-pillar.cjs — توليد Pillar Content (3000+ كلمة) لموقعك
 *
 * الـ Pillar Content = محتوى ضخم شامل يغطي موضوع كامل، يرتبط بمقالات فرعية.
 * مثالي لـ Topical Authority في SEO.
 *
 * المخرجات:
 *   - public/pillars/<name>.html — الصفحة الكاملة
 *   - Article + BreadcrumbList + FAQ schema
 *
 * الاستخدام:
 *   node scripts/seo/generate-pillar.cjs --name law-firm-management --keyword "إدارة مكاتب المحاماة"
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

const ROOT = path.resolve(__dirname, '..', '..');
const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');
dotenv.config({ path: path.join(ROOT, '.env') });

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

if (!ai) {
  console.error('❌ GEMINI_API_KEY مش متضبوط');
  process.exit(1);
}

if (!fs.existsSync(PILLARS_DIR)) fs.mkdirSync(PILLARS_DIR, { recursive: true });

const TEXT_MODELS = [
  process.env.TEXT_MODEL || 'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
];
let modelIdx = 0;
const currentModel = () => TEXT_MODELS[modelIdx % TEXT_MODELS.length];

const BASE_URL = 'https://mohamidigital.online';

function parseArgs() {
  const args = { name: null, keyword: null, category: 'إدارة مكاتب المحاماة' };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--name') args.name = process.argv[++i];
    else if (a === '--keyword') args.keyword = process.argv[++i];
    else if (a === '--category') args.category = process.argv[++i];
  }
  return args;
}

async function generatePillarContent(keyword, category) {
  const prompt = `أنت كاتب محتوى قانوني محترف وخبير SEO. اكتب pillar content شامل عن: "${keyword}" في السوق المصري.

قواعد:
- **الحد الأدنى: 3500 كلمة** (محتوى شامل ومفصل)
- بالعربية الفصحى المبسطة (في متناول المحامين والمستخدمين)
- هيكل SEO مثالي:
  - H1 واضح يحوي الكلمة المفتاحية
  - H2 للأقسام الرئيسية (8-10 أقسام)
  - H3 للأقسام الفرعية
  - TOC (Table of Contents) في البداية
  - FAQ في النهاية (5 أسئلة شائعة)
  - CTA واضح في النهاية
- اعتمد على القانون المصري الفعلي ومراجع قانونية
- أمثلة عملية وحالات واقعية
- أرقام وإحصائيات (مصر)
- 5-7 internal links لمقالات أخرى (استخدم placeholders: [INTERNAL:slug-name])
- 2-3 external links لمصادر قانونية مصرية موثوقة

أرجع JSON فقط:
{
  "title": "عنوان جذاب يحوي الكلمة المفتاحية",
  "meta_description": "وصف 155-160 حرف",
  "slug": "english-slug-with-keyword",
  "category": "${category}",
  "h1": "العنوان الرئيسي",
  "toc": ["قسم 1", "قسم 2", "..."],
  "sections": [
    {
      "h2": "عنوان القسم",
      "content": "محتوى HTML كامل (3-4 فقرات) — فيه كلمات مفتاحية طبيعية"
    }
  ],
  "faq": [
    {"q": "سؤال شائع 1", "a": "إجابة مفصلة 3-4 جمل"}
  ],
  "cta": "نص الـ call-to-action في النهاية",
  "related_articles": [
    {"slug": "existing-article-slug", "anchor": "نص الرابط"}
  ]
}`;

  for (let i = 0; i < TEXT_MODELS.length; i++) {
    try {
      console.log(`[pillar] توليد بـ ${currentModel()}...`);
      const resp = await ai.models.generateContent({
        model: currentModel(),
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.7 },
      });
      const text = resp.text?.trim();
      if (!text) throw new Error('مفيش رد');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('رد مش JSON');
      return JSON.parse(match[0]);
    } catch (e) {
      console.warn(`⚠️ فشل: ${e.message?.substring(0, 100)}`);
      modelIdx++;
    }
  }
  throw new Error('فشل توليد الـ pillar');
}

function buildHtml(pillar, keyword) {
  const { title, meta_description, slug, h1, toc, sections, faq, cta, category, related_articles } = pillar;

  // بناء TOC
  const tocHtml = toc.map((t, i) => `<li><a href="#section-${i + 1}">${t}</a></li>`).join('\n');

  // بناء المحتوى
  const sectionsHtml = sections.map((s, i) => `
    <section id="section-${i + 1}">
      <h2>${s.h2}</h2>
      ${s.content}
    </section>
  `).join('\n');

  // FAQ
  const faqHtml = faq.map((f, i) => `
    <div class="faq-item">
      <h3>${f.q}</h3>
      <p>${f.a}</p>
    </div>
  `).join('\n');

  // Related articles
  const relatedHtml = (related_articles || []).map(r =>
    `<li><a href="/blog/${r.slug}.html">${r.anchor}</a></li>`
  ).join('\n');

  // Schema.org
  const url = `${BASE_URL}/pillars/${slug}.html`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: meta_description,
    author: {
      '@type': 'Person',
      name: 'الأستاذ أحمد منصور',
      jobTitle: 'مستشار قانوني',
    },
    publisher: {
      '@type': 'Organization',
      name: 'منصة المحامي الرقمية',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
    },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: `${BASE_URL}/og-image.jpg`,
    inLanguage: 'ar-EG',
    articleSection: category,
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'المراجع', item: `${BASE_URL}/pillars/` },
      { '@type': 'ListItem', position: 3, name: title, item: url },
    ],
  };

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | منصة المحامي الرقمية</title>
  <meta name="description" content="${meta_description}" />
  <meta name="keywords" content="${keyword}, ${category}, قانون مصري, محامي" />
  <meta name="author" content="الأستاذ أحمد منصور - مستشار قانوني" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${meta_description}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${BASE_URL}/og-image.jpg" />
  <meta property="article:author" content="الأستاذ أحمد منصور" />
  <meta property="article:published_time" content="${new Date().toISOString()}" />
  <meta property="article:section" content="${category}" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
  <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', sans-serif;
      background: #0f172a; color: #f1f5f9; line-height: 1.8;
      background-image: linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
      background-size: 48px 48px;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 2.5rem; color: #fde047; margin-bottom: 16px; line-height: 1.3; }
    h2 { font-size: 1.8rem; color: #a5b4fc; margin: 40px 0 16px; border-right: 4px solid #6366f1; padding-right: 16px; }
    h3 { font-size: 1.3rem; color: #c4b5fd; margin: 24px 0 12px; }
    p, li { font-size: 1.05rem; margin-bottom: 12px; color: #e2e8f0; }
    ul, ol { padding-right: 28px; margin-bottom: 16px; }
    a { color: #818cf8; text-decoration: none; }
    a:hover { color: #fde047; text-decoration: underline; }
    .toc { background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 24px; margin: 32px 0; }
    .toc h2 { font-size: 1.3rem; margin: 0 0 16px; border: none; padding: 0; color: #fde047; }
    .toc ol { padding-right: 20px; }
    .faq { background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 24px; margin: 32px 0; }
    .faq-item { margin-bottom: 20px; }
    .faq-item h3 { color: #fde047; font-size: 1.15rem; }
    .cta { background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.15)); border: 2px solid #6366f1; border-radius: 16px; padding: 32px; text-align: center; margin: 40px 0; }
    .cta h2 { color: #fde047; text-align: center; border: none; padding: 0; }
    .cta-button { display: inline-block; background: #6366f1; color: white; padding: 16px 40px; border-radius: 8px; font-weight: bold; margin-top: 16px; }
    .related { background: rgba(16,185,129,0.05); border-radius: 12px; padding: 24px; margin: 32px 0; }
    nav.breadcrumb { font-size: 0.9rem; padding: 16px 24px; background: rgba(15,23,42,0.6); border-bottom: 1px solid rgba(148,163,184,0.1); }
    nav.breadcrumb a { color: #94a3b8; }
  </style>
</head>
<body>
  <nav class="breadcrumb">
    <a href="/">الرئيسية</a> › <a href="/pillars/">المراجع القانونية</a> › <span>${title}</span>
  </nav>

  <article class="container">
    <h1>${h1}</h1>
    <p style="color:#94a3b8; font-size:0.9rem;">آخر تحديث: ${new Date().toLocaleDateString('ar-EG')} · ${category}</p>

    <aside class="toc">
      <h2>📑 محتويات الدليل</h2>
      <ol>${tocHtml}</ol>
    </aside>

    <!-- إعلان Google AdSense رسمي بداخل المقال (In-Article Ad Unit) -->
    <div class="sponsor-frame" style="margin: 40px 0; text-align: center; overflow: hidden; background: rgba(15, 23, 42, 0.8); border: 2px dashed #6366f1; border-radius: 16px; padding: 20px; min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
      <div style="font-size: 12px; color: #a5b4fc; font-weight: bold; margin-bottom: 12px; display: flex; items-center; gap: 6px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
        <span>مساحة إعلانية (أعلى المقال) — In-Article</span>
      </div>
      <ins class="adsbygoogle"
           style="display:block; text-align:center; width:100%; min-height:200px;"
           data-ad-layout="in-article"
           data-ad-format="fluid"
           data-ad-client="ca-pub-7725405859334364"
           data-ad-slot="3911754995"></ins>
      <script>
           (adsbygoogle = window.adsbygoogle || []).push({});
      </script>
    </div>

    ${sectionsHtml}

    <!-- إعلان Google AdSense المتطابق التلقائي (Multiplex Ad Unit - Slot 8981348923) -->
    <div class="sponsor-frame" style="margin: 40px 0; text-align: center; overflow: hidden; background: rgba(15, 23, 42, 0.8); border: 2px dashed #10b981; border-radius: 16px; padding: 20px; min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
      <div style="font-size: 12px; color: #6ee7b7; font-weight: bold; margin-bottom: 12px; display: flex; items-center; gap: 6px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#6366f1;"></span>
        <span>محتوى مقترح وإعلانات متطابقة — Google AdSense</span>
      </div>
      <ins class="adsbygoogle"
           style="display:block; width:100%; min-height:200px;"
           data-ad-format="autorelaxed"
           data-ad-client="ca-pub-7725405859334364"
           data-ad-slot="8981348923"></ins>
      <script>
           (adsbygoogle = window.adsbygoogle || []).push({});
      </script>
    </div>


    <aside class="faq">

      <h2 style="color:#fde047; border:none; padding:0; margin-bottom:20px;">❓ الأسئلة الشائعة</h2>
      ${faqHtml}
    </aside>

    <aside class="related">
      <h2 style="color:#10b981; border:none; padding:0;">📚 مقالات ذات صلة</h2>
      <ul>${relatedHtml}</ul>
    </aside>

    <aside class="cta">
      <h2>${cta || 'هل تبحث عن نظام متكامل لإدارة مكتبك؟'}</h2>
      <p>منصة المحامي الرقمية — نظام مجاني 100% لإدارة القضايا والموكلين والجلسات.</p>
      <a href="/" class="cta-button">جرب المنصة مجاناً</a>
    </aside>
  </article>
</body>
</html>`;
}

async function main() {
  const args = parseArgs();
  if (!args.name || !args.keyword) {
    console.log('استخدام: node scripts/seo/generate-pillar.cjs --name <slug> --keyword "<keyword>" [--category "<cat>"]');
    console.log('مثال: node scripts/seo/generate-pillar.cjs --name law-firm-management --keyword "إدارة مكاتب المحاماة"');
    process.exit(1);
  }

  console.log(`\n📝 توليد Pillar: ${args.keyword}\n`);
  const content = await generatePillarContent(args.keyword, args.category);
  if (args.name) content.slug = args.name;

  const html = buildHtml(content, args.keyword);
  const outputPath = path.join(PILLARS_DIR, `${content.slug}.html`);
  fs.writeFileSync(outputPath, html, 'utf8');

  // حساب عدد الكلمات
  const wordCount = (html.match(/[\u0600-\u06FF]+/g) || []).length;
  console.log(`\n✅ تم إنشاء: ${outputPath}`);
  console.log(`📊 عدد الكلمات العربية: ~${wordCount}`);
  console.log(`📑 عدد الأقسام: ${content.sections?.length || 0}`);
  console.log(`❓ عدد الأسئلة الشائعة: ${content.faq?.length || 0}`);
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
