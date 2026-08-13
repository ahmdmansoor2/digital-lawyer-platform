#!/usr/bin/env node
/**
 * generate-legal-library.cjs — توليد «المكتبة القانونية» بمحتوى حقيقي مُدار عبر Gemini
 *
 * يُنتج:
 *   - public/legal-library-topics/<slug>.html — دليل متخصص (≥3000 كلمة) لكل فرع قانوني
 *   - public/legal-library.html — فهرس المكتبة بإحصاءات حقيقية محسوبة من الملفات الفعلية
 *   - scripts/seo/legal-library-topics.json — منشور (slug → meta) لمنع الازدواج
 *
 * الاستخدام:
 *   node scripts/seo/generate-legal-library.cjs                 (كل الفروع المتاحة)
 *   node scripts/seo/generate-legal-library.cjs --branch civil  (فرع واحد)
 *   node scripts/seo/generate-legal-library.cjs --force         (إعادة توليد منشور)
 *   node scripts/seo/generate-legal-library.cjs --limit 2       (عدد محدود للاختبار)
 */

const fs = require('fs');
const path = require('path');
const { headerMarkup, HEADER_CSS } = require('./unified-header.cjs');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

const ROOT = path.resolve(__dirname, '..', '..');
const TOPICS_DIR = path.join(ROOT, 'public', 'legal-library-topics');
const MANIFEST_FILE = path.join(__dirname, 'legal-library-topics.json');
const INDEX_FILE = path.join(ROOT, 'public', 'legal-library.html');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');
const FORMS_DOCS_DIR = path.join(ROOT, 'public', 'legal-forms-docs');

dotenv.config({ path: path.join(ROOT, '.env') });

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
if (!ai) {
  console.error('❌ GEMINI_API_KEY غير مضبوط');
  process.exit(1);
}

const TEXT_MODELS = [
  process.env.TEXT_MODEL || 'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
];
let modelIdx = 0;
const currentModel = () => TEXT_MODELS[modelIdx % TEXT_MODELS.length];

const BASE_URL = 'https://mohamidigital.online';

/* ══════════════════════════ إعداد الفروع الثمانية ══════════════════════════ */
const BRANCHES = [
  {
    slug: 'civil-law-egypt-guide',
    branch: 'القانون المدني',
    keyword: 'القانون المدني المصري (رقم 131 لسنة 1948) والالتزامات والعقود والمسؤولية التقصيرية',
    icon: '📕',
    color: 'blue',
    desc: 'العقود والالتزامات، المسؤولية التقصيرية، الملكية، الوكالة، والتعويضات.',
    blogLinks: ['civil-compensation-lawsuits', 'contract-legal-requirements', 'force-majeure-clause-egyptian-law', 'car-accident-compensation-egypt', 'traffic-accident-claims', 'real-estate-contract-risks', 'debt-collection-egypt', 'debt-statute-limitations'],
    pillarLinks: ['egyptian-civil-code-ultimate-guide', 'egyptian-evidence-law-comprehensive-guide', 'legal-contract-drafting-egypt'],
    formLinks: ['sale_contract', 'compensation_lawsuit', 'civil_money_claim', 'signature_verification', 'trust_receipt', 'ownership_claim'],
  },
  {
    slug: 'criminal-law-egypt-guide',
    branch: 'القانون الجنائي',
    keyword: 'القانون الجنائي المصري وقانون العقوبات (رقم 58 لسنة 1937) والجرائم والعقوبات',
    icon: '⚖️',
    color: 'red',
    desc: 'الجنايات والجنح، الإجراءات الجنائية، الدفوع، والإفراج عن المتهمين.',
    blogLinks: ['criminal-defense-rights', 'criminal-investigation-rights', 'drug-offense-defense', 'pretrial-detention-law-egypt', 'remand-in-custody-egyptian-law', 'witness-testimony-egypt', 'forensic-medicine-procedures-egypt', 'criminal-polygraph-law', 'cheque-fraud-defense'],
    pillarLinks: ['egyptian-penal-code-guide', 'egyptian-criminal-procedure-code-guide'],
    formLinks: ['fraud_claim', 'bounced_check_lawsuit', 'trust_receipt_lawsuit'],
  },
  {
    slug: 'personal-status-law-egypt-guide',
    branch: 'قانون الأحوال الشخصية',
    keyword: 'قانون الأحوال الشخصية المصري (قانون 25 لسنة 1929 وتعديلاته) والأسرة والزواج والطلاق',
    icon: '👨‍👩‍👧',
    color: 'emerald',
    desc: 'الزواج، الطلاق، الخلع، الحضانة، النفقة، والميراث.',
    blogLinks: ['khul-divorce-procedure', 'khul-divorce-procedures-egypt', 'divorce-procedures-egypt', 'divorce-damages-claim', 'child-custody-egypt', 'alimony-calculation-egypt', 'marital-housing-rights', 'paternity-dna-test', 'inheritance-women-rights', 'khula-laws-personal-status-egypt'],
    pillarLinks: ['personal-status-law-egypt-comprehensive-guide'],
    formLinks: ['khul_claim', 'divorce_for_harm', 'divorce_for_discord', 'alimony_lawsuit', 'alimony_muta_idda', 'child_maintenance_claim', 'custody_lawsuit', 'visitation_claim', 'marriage_proof_claim', 'paternity_claim', 'dowry_recovery_claim'],
  },
  {
    slug: 'administrative-law-egypt-guide',
    branch: 'القانون الإداري',
    keyword: 'القانون الإداري المصري ومجلس الدولة والقرارات الإدارية والطعن بالإلغاء',
    icon: '🏛️',
    color: 'amber',
    desc: 'القرارات الإدارية، الطعون، التعويض عن أعمال الإدارة، والتظلمات.',
    blogLinks: ['administrative-appeals-egypt', 'administrative-grievance', 'administrative-dismissal-appeal', 'government-complaints-system-egypt', 'high-school-grievance-procedure', 'public-utilities-damage-compensation'],
    pillarLinks: ['egyptian-administrative-judiciary-state-council-guide'],
    formLinks: ['thanawya_appeal'],
  },
  {
    slug: 'commercial-law-egypt-guide',
    branch: 'القانون التجاري',
    keyword: 'القانون التجاري المصري (رقم 17 لسنة 1999) والشركات والأوراق التجارية',
    icon: '💼',
    color: 'purple',
    desc: 'التجار، الأوراق التجارية، الشركات، الإفلاس، والعلامات التجارية.',
    blogLinks: ['limited-liability-company', 'company-formation-egypt', 'company-incorporation-egypt', 'company-board-liability', 'bankruptcy-judicial-settlement', 'bounced-cheques-laws-egypt', 'bounced-cheque-laws-egypt', 'trademark-registration-egypt', 'egyptian-stock-market-legal-guide'],
    pillarLinks: ['egyptian-commercial-law-ultimate-guide', 'egyptian-arbitration-law-commercial-disputes-guide', 'egyptian-economic-courts-law-guide'],
    formLinks: ['llc_incorporation', 'sole_shareholder_llc', 'partnership_contract', 'contractors_company', 'brokerage_contract'],
  },
  {
    slug: 'labor-law-egypt-guide',
    branch: 'قانون العمل',
    keyword: 'قانون العمل المصري (رقم 12 لسنة 2003) وحقوق العامل وعقود العمل',
    icon: '👷',
    color: 'indigo',
    desc: 'عقد العمل، الأجور، الإجازات، الفصل، والمنازعات العمالية.',
    blogLinks: ['labor-contracts-egypt', 'employment-contract-termination', 'labor-rights-termination', 'labor-dismissal-compensation', 'trial-period-rights', 'official-holidays-labor-law-egypt', 'official-holidays-overtime-labor-law-egypt', 'labor-insurance-egypt', 'labor-overtime-rights', 'workplace-harassment-law', 'egyptian-social-insurance-pension-guide'],
    pillarLinks: ['egyptian-labor-law-2026-comprehensive-guide'],
    formLinks: ['employment_contract', 'fixed_term_employment', 'unfair_dismissal_claim', 'formal_notice_employee'],
  },
  {
    slug: 'constitution-egypt-guide',
    branch: 'الدستور والقانون الدستوري',
    keyword: 'الدستور المصري لعام 2014 والحقوق والحريات والسلطات العامة',
    icon: '📜',
    color: 'slate',
    desc: 'الحقوق والحريات، السلطات العامة، والرقابة على دستورية القوانين.',
    blogLinks: ['pretrial-detention-law-egypt', 'criminal-defense-rights', 'travel-ban-reasons', 'private-international-law', 'egypt-digital-notary-services'],
    pillarLinks: ['egyptian-criminal-procedure-code-guide', 'egyptian-administrative-judiciary-state-council-guide'],
    formLinks: ['power_of_attorney', 'special_vehicle_poa'],
  },
  {
    slug: 'civil-procedure-law-egypt-guide',
    branch: 'قانون المرافعات',
    keyword: 'قانون المرافعات المدنية والتجارية المصري (رقم 13 لسنة 1968) والتنفيذ',
    icon: '🗂️',
    color: 'cyan',
    desc: 'الدعاوى، الطعون، التنفيذ، الاختصاص، والرسوم القضائية.',
    blogLinks: ['judicial-fees-court', 'judicial-recess-deadlines-egypt', 'small-claims-court', 'execution-judgments-egypt', 'shahr-aqary-registration-procedures', 'real-estate-registration-egypt'],
    pillarLinks: ['complete-guide-egyptian-civil-commercial-procedures-law', 'egyptian-shahr-aqary-real-estate-registration-guide', 'egyptian-evidence-law-comprehensive-guide'],
    formLinks: ['eviction_lawsuit', 'eviction_after_expiry', 'unlawful_occupation_eviction', 'civil_money_claim', 'signature_verification', 'trust_receipt_lawsuit', 'estate_partition_agreement', 'partition_lawsuit'],
  },
];

/* ══════════════════════════ أدوات ══════════════════════════ */
function parseArgs() {
  const args = { branch: null, force: false, limit: null };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--branch') args.branch = process.argv[++i];
    else if (a === '--force') args.force = true;
    else if (a === '--limit') args.limit = parseInt(process.argv[++i], 10) || null;
  }
  return args;
}

function listHtml(dir, excludeIndex = true) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^[a-z0-9_-]+\.html$/.test(f) && (!excludeIndex || f !== 'index.html'))
    .sort();
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function extractTitle(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const m = html.match(/<title>([\s\S]*?)<\/title>/);
    if (m)
      return m[1]
        .replace(/ - منصة المحامي الرقمية\s*$/, '')
        .replace(/ — منصة المحامي الرقمية\s*$/, '')
        .replace(/ \| منصة المحامي الرقمية\s*$/, '')
        .trim();
  } catch {}
  return null;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripTags(html) {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function arabicWordCount(html) {
  const text = stripTags(html);
  return (text.match(/[\u0600-\u06FF]+/g) || []).length;
}

/* ══════════════════════════ توليد المحتوى عبر Gemini ══════════════════════════ */
const PROMPT_TEMPLATE = `أنت مستشار قانوني خبير في القانون المصري وكاتب محتوى قانوني احترافي.
اكتب دليلاً قانونياً شاملاً ومفصلاً عن: "KEYWORD".

قواعد صارمة:
- الحد الأدنى 3000 كلمة، بالعربية الفصحى المبسطة (في متناول المحامين والمتقاضين).
- المرجعية: استند إلى القوانين المصرية الفعلية بأرقامها (مثل القانون المدني رقم 131 لسنة 1948، قانون العقوبات رقم 58 لسنة 1937، قانون 25 لسنة 1929 للاحوال الشخصية، قانون العمل رقم 12 لسنة 2003، قانون المرافعات رقم 13 لسنة 1968، قانون التجارة رقم 17 لسنة 1999، الدستور 2014، قانون 47 لسنة 1972 لمجلس الدولة).
- عند الشك في رقم مادة أو نص: لا تختلق — استخدم صيغة آمنة مثل «ينظمه القانون وفقاً للتعديلات الأخيرة» أو «وفقاً لأحدث تعديل».
- لا تستخدم أي روابط أو عناوين URL أو علامات Markdown داخل المحتوى (ستُضاف روابط داخلية حقيقية تلقائياً لاحقاً).
- اذكر أحكاماً ومبادئ قضائية معروفة لمحكمة النقض والمحكمة الإدارية العليا فقط إن كنت متأكداً منها.

الهيكل المطلوب:
1. فقرة تمهيدية (intro) من فقرتين: أهمية الموضوع في الممارسة المصرية + ماذا سيستفيد القارئ.
2. TOC بستة إلى تسعة أقسام.
3. أقسام H2 (6-9)، بعضها بحواشي H3، كل قسم 3-5 فقرات غنية.
4. قسم «قائمة المراجع القانونية» يعدّد القوانين والأحكام بأرقامها.
5. أسئلة شائعة FAQ (5-6 أسئلة بإجابات مفصلة).
6. CTA واقعي يوجه القارئ للاستعانة بمحامٍ.

أرجع JSON فقط بهذه الصيغة بالضبط (دون أي نص خارجها):
{
  "title": "عنوان جذاب يحوي الكلمة المفتاحية",
  "meta_description": "وصف من 150 إلى 160 حرفاً",
  "h1": "العنوان الرئيسي",
  "intro": "فقرتان في HTML (p)",
  "toc": ["قسم 1", "قسم 2"],
  "sections": [{"h2": "عنوان القسم", "content": "محتوى HTML كامل بفقرات وقوائم"}],
  "faq": [{"q": "سؤال", "a": "إجابة مفصلة من 3-4 جمل"}],
  "cta": "نص الـ call-to-action"
}`;

async function generateTopic(branch) {
  let lastError = null;
  for (let pass = 0; pass < 2; pass++) {
    const extra =
      pass === 1
        ? '\n\n⚠️ المحتوى السابق لم يبلغ الحد الأدنى. أعد كتابة الدليل بمحتوى أطول وأكثر تفصيلاً: لا تقل عن 3000 كلمة عربية، وأضف أقساماً فرعية H3 ومزيداً من التفاصيل العملية والأمثلة.'
        : '';
    const prompt = PROMPT_TEMPLATE.replace('KEYWORD', branch.keyword) + extra;
    for (let i = 0; i < TEXT_MODELS.length; i++) {
      try {
        console.log(`[lib] توليد ${branch.slug} بـ ${currentModel()} (محاولة ${pass + 1})...`);
        const resp = await ai.models.generateContent({
          model: currentModel(),
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: 0.7 },
        });
        const text = resp.text?.trim();
        if (!text) throw new Error('لا يوجد رد');
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('الرد ليس JSON');
        const parsed = JSON.parse(match[0]);
        const wc = arabicWordCount(
          (parsed.intro || '') + (parsed.sections || []).map((s) => s.content || '').join(' ')
        );
        if (wc < 2500 && pass === 0) {
          console.warn(`↻ قصير (~${wc} كلمة) — إعادة محاولة بمحتوى أطول`);
          break;
        }
        return parsed;
      } catch (e) {
        lastError = e;
        console.warn(`⚠️ فشل: ${String(e.message).substring(0, 100)}`);
        modelIdx++;
      }
    }
  }
  throw new Error(`فشل توليد ${branch.slug}: ${lastError ? lastError.message : 'غير معروف'}`);
}

/* ══════════════════════════ بناء صفحة الموضوع ══════════════════════════ */
function buildTopicHtml(branch, topic, wordCount) {
  const { title, meta_description, h1, intro, toc, sections, faq, cta } = topic;
  const url = `${BASE_URL}/legal-library-topics/${branch.slug}.html`;

  const tocHtml = (toc || []).map((t, i) => `<li><a href="#section-${i + 1}">${esc(t)}</a></li>`).join('\n');
  const sectionsHtml = (sections || []).map((s, i) => `
    <section id="section-${i + 1}">
      <h2>${s.h2}</h2>
      ${s.content}
    </section>
  `).join('\n');
  const faqHtml = (faq || []).map((f) => `
    <div class="faq-item">
      <h3>${f.q}</h3>
      <p>${f.a}</p>
    </div>
  `).join('\n');

  const relatedBlog = branch.blogLinks
    .filter((s) => fs.existsSync(path.join(BLOG_DIR, `${s}.html`)))
    .map((s) => {
      const t = extractTitle(path.join(BLOG_DIR, `${s}.html`)) || s;
      return `        <li><a href="/blog/${s}.html">${esc(t)}</a></li>`;
    }).join('\n');
  const relatedPillars = branch.pillarLinks
    .filter((s) => fs.existsSync(path.join(PILLARS_DIR, `${s}.html`)))
    .map((s) => {
      const t = extractTitle(path.join(PILLARS_DIR, `${s}.html`)) || s;
      return `        <li><a href="/pillars/${s}.html">${esc(t)}</a></li>`;
    }).join('\n');
  const relatedForms = branch.formLinks
    .filter((s) => fs.existsSync(path.join(FORMS_DOCS_DIR, `${s}.html`)))
    .map((s) => {
      const t = extractTitle(path.join(FORMS_DOCS_DIR, `${s}.html`)) || s;
      return `        <li><a href="/legal-forms-docs/${s}.html">${esc(t)}</a></li>`;
    }).join('\n');

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: meta_description,
    author: { '@type': 'Person', name: 'الأستاذ أحمد منصور', jobTitle: 'مستشار قانوني' },
    publisher: { '@type': 'Organization', name: 'منصة المحامي الرقمية', logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` } },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: `${BASE_URL}/og-image.jpg`,
    inLanguage: 'ar-EG',
    articleSection: branch.branch,
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (faq || []).map((f) => ({
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
      { '@type': 'ListItem', position: 2, name: 'المكتبة القانونية', item: `${BASE_URL}/legal-library.html` },
      { '@type': 'ListItem', position: 3, name: title, item: url },
    ],
  };

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} | منصة المحامي الرقمية</title>
  <meta name="description" content="${esc(meta_description || '')}" />
  <meta name="keywords" content="${esc(branch.branch)}, قانون مصري, ${esc(branch.keyword.split('(')[0].trim())}" />
  <meta name="author" content="الأستاذ أحمد منصور - مستشار قانوني" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(meta_description || '')}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${BASE_URL}/og-image.jpg" />
  <meta property="article:author" content="الأستاذ أحمد منصور" />
  <meta property="article:published_time" content="${new Date().toISOString()}" />
  <meta property="article:section" content="${esc(branch.branch)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
  <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  ${HEADER_CSS}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', sans-serif;
      background: #0f172a; color: #f1f5f9; line-height: 1.8;
      background-image: linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
      background-size: 48px 48px;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 2.3rem; color: #fde047; margin-bottom: 16px; line-height: 1.3; }
    h2 { font-size: 1.7rem; color: #a5b4fc; margin: 40px 0 16px; border-right: 4px solid #6366f1; padding-right: 16px; }
    h3 { font-size: 1.25rem; color: #c4b5fd; margin: 24px 0 12px; }
    p, li { font-size: 1.03rem; margin-bottom: 12px; color: #e2e8f0; }
    ul, ol { padding-right: 28px; margin-bottom: 16px; }
    a { color: #818cf8; text-decoration: none; }
    a:hover { color: #fde047; text-decoration: underline; }
    .intro { background: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.25); border-radius: 14px; padding: 24px; margin: 24px 0; }
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
    .related h2 { color: #10b981; border: none; padding: 0; }
    .related h3 { color: #c4b5fd; font-size: 1.05rem; margin-top: 16px; }
    nav.breadcrumb { font-size: 0.9rem; padding: 16px 24px; background: rgba(15,23,42,0.6); border-bottom: 1px solid rgba(148,163,184,0.1); }
    nav.breadcrumb a { color: #94a3b8; }
    .update-badge { display: inline-block; padding: 4px 14px; border-radius: 999px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; font-size: 11px; font-weight: 800; margin-bottom: 12px; }
  </style>
</head>
<body>
  ${headerMarkup('lib')}
  <nav class="breadcrumb">
    <a href="/">الرئيسية</a> › <a href="/legal-library.html">المكتبة القانونية</a> › <span>${esc(title)}</span>
  </nav>

  <article class="container">
    <div class="update-badge">⚖️ دليل قانوني · آخر تحديث: ${new Date().toLocaleDateString('ar-EG')}</div>
    <h1>${h1}</h1>
    <p style="color:#94a3b8; font-size:0.9rem;">${esc(branch.branch)} · ${wordCount.toLocaleString('ar-EG')} كلمة</p>

    <div class="intro">${intro}</div>

    <aside class="toc">
      <h2>📑 محتويات الدليل</h2>
      <ol>${tocHtml}</ol>
    </aside>

    <!-- إعلان Google AdSense رسمي بداخل الدليل (In-Article Ad Unit) -->
    <div class="sponsor-frame" style="margin: 40px 0; text-align: center; overflow: hidden; background: rgba(15, 23, 42, 0.8); border: 2px dashed #6366f1; border-radius: 16px; padding: 20px; min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
      <div style="font-size: 12px; color: #a5b4fc; font-weight: bold; margin-bottom: 12px; display: flex; items-center; gap: 6px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
        <span>مساحة إعلانية — In-Article</span>
      </div>
      <ins class="adsbygoogle"
           style="display:block; text-align:center; width:100%; min-height:200px;"
           data-ad-layout="in-article"
           data-ad-format="fluid"
           data-ad-client="ca-pub-7725405859334364"
           data-ad-slot="3911754995"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
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
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>

    <aside class="faq">
      <h2 style="color:#fde047; border:none; padding:0; margin-bottom:20px;">❓ الأسئلة الشائعة</h2>
      ${faqHtml}
    </aside>

    <aside class="related">
      <h2>📚 مراجع ذات صلة من المنصة</h2>
      <h3>مقالات المدونة القانونية</h3>
      <ul>${relatedBlog}</ul>
      <h3>المراجع القانونية الشاملة</h3>
      <ul>${relatedPillars}</ul>
      <h3>صيغ العقود والدعاوي</h3>
      <ul>${relatedForms}</ul>
    </aside>

    <aside class="cta">
      <h2>${cta || 'هل تبحث عن مساعدة قانونية؟'}</h2>
      <p>منصة المحامي الرقمية — نظام مجاني 100% لإدارة القضايا والموكلين والجلسات، ومكتبة قانونية تُحدَّث بانتظام.</p>
      <a href="/" class="cta-button">جرب المنصة مجاناً</a>
    </aside>
  </article>
</body>
</html>`;
}

/* ══════════════════════════ بناء فهرس المكتبة ══════════════════════════ */
function buildIndexHtml(manifest) {
  const topics = listHtml(TOPICS_DIR);
  const blogs = listHtml(BLOG_DIR);
  const pillars = listHtml(PILLARS_DIR);
  const forms = listHtml(FORMS_DOCS_DIR);

  const generated = BRANCHES.filter((b) => fs.existsSync(path.join(TOPICS_DIR, `${b.slug}.html`)));

  const cardsHtml = generated.map((b) => {
    const t = extractTitle(path.join(TOPICS_DIR, `${b.slug}.html`)) || b.title;
    const words = manifest[b.slug]?.wordCount || 0;
    return `
      <a href="/legal-library-topics/${b.slug}.html" class="cat-card ${b.color}">
        <div class="cat-icon">${b.icon}</div>
        <h3>${esc(b.branch)}</h3>
        <p>${esc(b.desc)}</p>
        <span class="cat-count">${words ? words.toLocaleString('ar-EG') + ' كلمة' : 'دليل متخصص'}</span>
      </a>`;
  }).join('\n');

  const topicItems = generated.map((b) => {
    const t = extractTitle(path.join(TOPICS_DIR, `${b.slug}.html`)) || b.title;
    return `        <li><a href="/legal-library-topics/${b.slug}.html">${esc(t)}</a></li>`;
  }).join('\n');

  const blogItems = blogs.slice(0, 12).map((f) => {
    const t = extractTitle(path.join(BLOG_DIR, f)) || f.replace(/\.html$/, '');
    return `        <li><a href="/blog/${f}">${esc(t)}</a></li>`;
  }).join('\n');

  // عينات حقيقية من أول دليلين مولّدين
  let sampleCards = '';
  if (generated.length >= 1) {
    sampleCards = generated.slice(0, 2).map((b) => {
      const file = path.join(TOPICS_DIR, `${b.slug}.html`);
      let quote = '';
      try {
        const html = fs.readFileSync(file, 'utf8');
        const introMatch = html.match(/<div class="intro">([\s\S]*?)<\/div>/);
        if (introMatch) {
          quote = stripTags(introMatch[1]).slice(0, 320);
        }
      } catch {}
      const t = extractTitle(file) || b.title;
      return `
      <div class="sample-card ${b.color === 'red' ? 'prec' : 'law'}">
        <span class="sample-tag">دليل حقيقي · ${esc(b.branch)}</span>
        <p class="sample-quote">"${esc(quote || b.desc)}"</p>
        <p class="sample-source"><a href="/legal-library-topics/${b.slug}.html">${esc(t)} — اقرأ الدليل كاملاً</a></p>
      </div>`;
    }).join('\n');
  }

  const statsTopics = topics.length;
  const statsBranches = generated.length;
  const statsBlogs = blogs.length;
  const statsForms = forms.length;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>المكتبة القانونية — أدلة قانونية مصرية حقيقية | منصة المحامي الرقمية</title>
  <meta name="description" content="مكتبة قانونية مصرية بمحتوى حقيقي: أدلة متخصصة في كل فروع القانون المصري (مدني، جنائي، أحوال شخصية، إداري، تجاري، عمل، دستوري، مرافعات) + ${statsBlogs} مقالاً + ${statsForms} صيغة عقد ودعوى." />
  <meta name="keywords" content="مكتبة قانونية, أدلة قانونية مصرية, قانون مدني, قانون جنائي, قانون أحوال شخصية, قانون عمل, قانون إداري, قانون تجاري, مرافعات, محامي مصر" />
  <link rel="canonical" href="${BASE_URL}/legal-library.html" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="المكتبة القانونية — أدلة قانونية مصرية حقيقية" />
  <meta property="og:description" content="أدلة متخصصة في كل فروع القانون المصري + مقالات وصيغ عقود حقيقية. مجاناً وبلا تسجيل." />
  <meta property="og:url" content="${BASE_URL}/legal-library.html" />
  <meta property="og:site_name" content="منصة المحامي الرقمية" />
  <meta property="og:locale" content="ar_EG" />
  <link rel="alternate" hreflang="ar-EG" href="${BASE_URL}/legal-library.html" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/header.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f172a;
      --border: rgba(148,163,184,0.12);
      --indigo: #6366f1;
      --emerald: #10b981;
      --red: #ef4444;
      --blue: #3b82f6;
      --cyan: #06b6d4;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --card-bg: rgba(15,23,42,0.7);
    }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.7;
      background-image:
        radial-gradient(ellipse at 30% 0%, rgba(124,58,237,0.18) 0%, transparent 55%),
        radial-gradient(ellipse at 90% 70%, rgba(16,185,129,0.1) 0%, transparent 50%),
        linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 48px 48px, 48px 48px;
    }
    .hero { max-width: 920px; margin: 0 auto; padding: 72px 24px 40px; text-align: center; }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 999px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; font-size: 11px; font-weight: 800; margin-bottom: 24px; }
    .badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #6ee7b7; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.4rem); font-weight: 900; line-height: 1.2; margin-bottom: 20px; background: linear-gradient(135deg, #e2e8f0 0%, #6ee7b7 50%, #a5b4fc 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 17px; color: var(--muted); max-width: 680px; margin: 0 auto; font-weight: 600; }
    .hero-stats { display: flex; justify-content: center; gap: 40px; margin-top: 36px; flex-wrap: wrap; }
    .hero-stat { text-align: center; }
    .hero-stat-num { font-size: 36px; font-weight: 900; background: linear-gradient(135deg, #a5b4fc, #6ee7b7); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; }
    .hero-stat-label { font-size: 12px; color: var(--muted); font-weight: 700; margin-top: 6px; }
    .section { max-width: 1180px; margin: 0 auto; padding: 0 24px 64px; }
    .section-title { font-size: 28px; font-weight: 900; color: #fff; text-align: center; margin-bottom: 12px; }
    .section-sub { font-size: 14px; color: var(--muted); text-align: center; max-width: 600px; margin: 0 auto 48px; font-weight: 600; }
    .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 40px; }
    .cat-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 18px; padding: 26px 22px; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: all 0.25s; position: relative; overflow: hidden; text-decoration: none; display: block; }
    .cat-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.4); box-shadow: 0 16px 48px rgba(0,0,0,0.25); }
    .cat-card::before { content: ''; position: absolute; top: 0; right: 0; width: 100px; height: 100px; border-radius: 50%; filter: blur(40px); opacity: 0.15; pointer-events: none; }
    .cat-card.blue::before { background: var(--blue); }
    .cat-card.red::before { background: var(--red); }
    .cat-card.emerald::before { background: var(--emerald); }
    .cat-card.purple::before { background: #7c3aed; }
    .cat-card.indigo::before { background: var(--indigo); }
    .cat-card.slate::before { background: #64748b; }
    .cat-card.cyan::before { background: var(--cyan); }
    .cat-card.amber::before { background: #f59e0b; }
    .cat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
    .cat-card.blue .cat-icon { background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); }
    .cat-card.red .cat-icon { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); }
    .cat-card.emerald .cat-icon { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); }
    .cat-card.purple .cat-icon { background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); }
    .cat-card.indigo .cat-icon { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); }
    .cat-card.slate .cat-icon { background: rgba(100,116,139,0.15); border: 1px solid rgba(100,116,139,0.3); }
    .cat-card.cyan .cat-icon { background: rgba(6,182,212,0.15); border: 1px solid rgba(6,182,212,0.3); }
    .cat-card.amber .cat-icon { background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); }
    .cat-card h3 { font-size: 15px; font-weight: 900; color: #fff; margin-bottom: 6px; }
    .cat-card p { font-size: 12px; color: var(--muted); line-height: 1.6; }
    .cat-count { display: inline-block; margin-top: 10px; padding: 3px 10px; border-radius: 999px; background: rgba(99,102,241,0.15); color: #a5b4fc; font-size: 10px; font-weight: 800; }
    .samples { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-bottom: 56px; }
    .sample-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 18px; padding: 26px; border-right: 3px solid var(--indigo); }
    .sample-card.law { border-right-color: #f59e0b; }
    .sample-card.prec { border-right-color: var(--red); }
    .sample-tag { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 10px; font-weight: 800; margin-bottom: 12px; background: rgba(16,185,129,0.15); color: #6ee7b7; }
    .sample-quote { font-size: 14px; color: var(--text); line-height: 1.9; font-weight: 600; margin-bottom: 14px; }
    .sample-source { font-size: 11px; color: var(--muted); font-weight: 700; }
    .sample-source a { color: #818cf8; }
    .link-box { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 20px; }
    .link-box h3 { font-size: 17px; font-weight: 900; color: #fff; margin-bottom: 12px; }
    .link-box ul { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
    .link-box li a { color: #cbd5e1; text-decoration: none; font-size: 13px; }
    .link-box li a:hover { color: #fde047; }
    .note { text-align: center; color: var(--muted); font-size: 13px; font-weight: 600; margin-top: 16px; }
    .faq-section { max-width: 800px; margin: 0 auto 56px; padding: 0 24px; }
    .faq-item { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 20px 24px; margin-bottom: 12px; }
    .faq-q { font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 8px; }
    .faq-a { font-size: 13px; color: var(--muted); line-height: 1.8; }
    .cta-section { text-align: center; padding: 0 24px 80px; }
    .cta-box { max-width: 720px; margin: 0 auto; background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(99,102,241,0.12)); border: 1px solid rgba(16,185,129,0.3); border-radius: 24px; padding: 48px 32px; }
    .cta-box h2 { font-size: 28px; font-weight: 900; color: #fff; margin-bottom: 12px; }
    .cta-box p { font-size: 15px; color: var(--muted); max-width: 500px; margin: 0 auto 24px; font-weight: 600; }
    .cta-btn { display: inline-flex; align-items: center; gap: 10px; padding: 16px 48px; border-radius: 14px; background: linear-gradient(135deg, var(--emerald), #0891b2, var(--indigo)); color: #fff; font-size: 15px; font-weight: 900; text-decoration: none; box-shadow: 0 8px 32px rgba(16,185,129,0.25); transition: transform 0.2s, box-shadow 0.2s; }
    .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(16,185,129,0.4); }
    footer { border-top: 1px solid var(--border); background: rgba(15,23,42,0.95); padding: 56px 24px 32px; }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 36px; }
    .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .footer-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .footer-logo-name { font-size: 15px; font-weight: 900; color: #fff; }
    .footer-desc { font-size: 12px; color: var(--muted); line-height: 1.8; max-width: 280px; }
    .footer-email { font-size: 12px; color: var(--indigo); margin-top: 10px; font-weight: 700; }
    .footer-email a { color: var(--indigo); text-decoration: none; }
    .footer-email a:hover { text-decoration: underline; }
    .footer-col h4 { font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 14px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
    .footer-col ul a { font-size: 12px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .footer-col ul a:hover { color: var(--indigo); }
    .footer-bottom { border-top: 1px solid rgba(148,163,184,0.08); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(148,163,184,0.5); }
    .breadcrumbs { max-width: 1200px; margin: 0 auto; padding: 14px 24px 0; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .breadcrumbs a { color: var(--muted); text-decoration: none; transition: color 0.2s; font-weight: 700; }
    .breadcrumbs a:hover { color: var(--indigo); }
    .breadcrumbs .current { color: var(--text); font-weight: 800; }
    .breadcrumbs .sep { color: var(--muted); opacity: 0.4; font-size: 10px; }
    .ad-slot { margin: 28px auto; max-width: 100%; text-align: center; min-height: 90px; }
    .ad-slot--top { margin-top: 8px; margin-bottom: 36px; }
    .ad-slot--bottom { margin: 36px auto 8px; }
    .ad-label { display: block; font-size: 10px; color: var(--muted); text-align: center; margin-bottom: 6px; letter-spacing: 0.5px; font-weight: 700; }
    @media (max-width: 980px) { .cat-grid { grid-template-columns: repeat(2, 1fr); } .samples, .link-box ul { grid-template-columns: 1fr; } }
    @media (max-width: 640px) { .cat-grid { grid-template-columns: 1fr; } .footer-grid { grid-template-columns: 1fr; gap: 28px; } }
  </style>

  <!-- Schema: CollectionPage -->
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","name":"المكتبة القانونية — أدلة قانونية مصرية حقيقية","description":"أدلة متخصصة في كل فروع القانون المصري","url":"${BASE_URL}/legal-library.html","inLanguage":"ar-EG","isPartOf":{"@type":"WebSite","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"publisher":{"@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}"}}</script>

  <!-- Schema: ItemList (أقسام المكتبة) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "أدلة المكتبة القانونية",
    "itemListElement": [
${generated.map((b, i) => `      {"@type": "ListItem", "position": ${i + 1}, "name": "${esc(b.branch)}", "url": "${BASE_URL}/legal-library-topics/${b.slug}.html"}`).join(',\n')}
    ]
  }
  </script>

  <!-- Schema: BreadcrumbList -->
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"${BASE_URL}"},{"@type":"ListItem","position":2,"name":"المكتبة القانونية","item":"${BASE_URL}/legal-library.html"}]}</script>
  <link rel="stylesheet" href="/search.css" />
</head>
<body>
  ${headerMarkup('lib')}
  <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span class="sep">›</span><span class="current">المكتبة القانونية</span></nav>

  <div class="hero">
    <div class="badge">
      <span class="badge-dot"></span>
      محتوى حقيقي — مجاني 100%
    </div>
    <h1>المكتبة القانونية المصرية</h1>
    <p>أدلة متخصصة في كل فروع القانون المصري + مقالات وصيغ عقود ودعاوى حقيقية — كلها في مكان واحد وبدون تسجيل.</p>
    <div class="hero-stats">
      <div class="hero-stat">
        <div class="hero-stat-num">${statsBranches}</div>
        <div class="hero-stat-label">فرع قانوني</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-num">${statsTopics}</div>
        <div class="hero-stat-label">دليل متخصص</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-num">+${statsBlogs}</div>
        <div class="hero-stat-label">مقال قانوني</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-num">${statsForms}</div>
        <div class="hero-stat-label">صيغة عقد ودعوى</div>
      </div>
    </div>
  </div>

  <!-- TOP AD -->
  <div class="ad-slot ad-slot--top" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-7725405859334364"
         data-ad-slot="2168039898"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <!-- الأدلة: كل فرع -->
  <div class="section">
    <h2 class="section-title">أدلة متخصصة في فروع القانون</h2>
    <p class="section-sub">كل دليل ≥3000 كلمة — يستند إلى القوانين المصرية بأرقامها وبإحالات داخلية حقيقية</p>

    <div class="cat-grid">
${cardsHtml}
    </div>
    <p class="note">تُضاف أدلة وموضوعات جديدة بانتظام.</p>
  </div>

  <!-- نماذج من المحتوى -->
  <div class="section">
    <h2 class="section-title">نماذج من المحتوى</h2>
    <p class="section-sub">مقتطفات حقيقية من الأدلة المنشورة</p>
    <div class="samples">
${sampleCards}
    </div>
  </div>

  <!-- روابط حقيقية: مدونة + مراجع + صيغ -->
  <div class="section">
    <h2 class="section-title">كل محتوى الموقع القانوني</h2>
    <p class="section-sub">المراجع الشاملة وصيغ العقود وأحدث مقالات المدونة</p>

    <div class="link-box">
      <h3>المراجع القانونية الشاملة</h3>
      <ul>
${pillars.map((f) => `        <li><a href="/pillars/${f}">${esc(extractTitle(path.join(PILLARS_DIR, f)) || f.replace(/\.html$/, ''))}</a></li>`).join('\n')}
      </ul>
    </div>

    <div class="link-box">
      <h3>أحدث مقالات المدونة</h3>
      <ul>
${blogItems}
      </ul>
      <p class="note"><a href="/blog/" style="color:#818cf8;">كل المقالات (${statsBlogs}) ›</a></p>
    </div>
  </div>

  <!-- FAQ -->
  <div class="faq-section">
    <h2 class="section-title">الأسئلة الشائعة</h2>
    <p class="section-sub">إجابات صادقة عن المكتبة القانونية</p>

    <div class="faq-item">
      <div class="faq-q">هل المكتبة القانونية مجانية؟</div>
      <div class="faq-a">نعم، كل الأدلة والمقالات وصيغ العقود متاحة مجاناً بالكامل من المتصفح دون تسجيل.</div>
    </div>

    <div class="faq-item">
      <div class="faq-q">هل المحتوى محدّث؟</div>
      <div class="faq-a">تُضاف أدلة وموضوعات جديدة بانتظام (أسبوعياً تقريباً)، لكن النصوص القانونية المنشورة مرجعية — يُرجى مراجعة النص الرسمي للقانون قبل الاعتماد عليه في أي إجراء قضائي.</div>
    </div>

    <div class="faq-item">
      <div class="faq-q">هل الأدلة تستند إلى قوانين فعلية؟</div>
      <div class="faq-a">نعم، تُصاغ الأدلة على أساس القوانين المصرية بأرقامها (المدني ١٣١/١٩٤٨، العقوبات ٥٨/١٩٣٧، العمل ١٢/٢٠٠٣، المرافعات ١٣/١٩٦٨، التجارة ١٧/١٩٩٩، الدستور ٢٠١٤...) وتُرفق بإحالات داخلية حقيقية للمقالات والمراجع والصيغ ذات الصلة.</div>
    </div>

    <div class="faq-item">
      <div class="faq-q">هل يمكنني تصدير دليل أو عقد كملف Word؟</div>
      <div class="faq-a">صفحات صيغ العقود توفر نسخ النص الكامل، ويمكنك نسخ أي جزء من الأدلة واستخدامه مع مراعاة الاستشهاد بالمصدر الرسمي.</div>
    </div>
  </div>

  <!-- CTA -->
  <div class="cta-section">
    <div class="cta-box">
      <h2>ادارة مكتب محاماة بسهولة</h2>
      <p>منصة المحامي الرقمية — نظام مجاني لإدارة القضايا والموكلين والجلسات بجانب هذه المكتبة.</p>
      <a href="/" class="cta-btn">جرب المنصة مجاناً 🚀</a>
    </div>
  </div>

  <footer>
    <div class="footer-inner">
      <div class="footer-grid">
        <div>
          <div class="footer-logo">
            <div class="footer-logo-icon">⚖️</div>
            <span class="footer-logo-name">منصة المحامي الرقمية</span>
          </div>
          <p class="footer-desc">النظام البرمجي المتكامل والمجاني لإدارة مكاتب المحاماة في جمهورية مصر العربية.</p>
          <p class="footer-email">التواصل: <a href="mailto:ahmdmansoor222@gmail.com">ahmdmansoor222@gmail.com</a></p>
        </div>
        <div class="footer-col">
          <h4>روابط سريعة</h4>
          <ul>
            <li><a href="/features.html">مميزات المنصة</a></li>
            <li><a href="/legal-library.html">المكتبة القانونية</a></li>
            <li><a href="/blog/">المدونة القانونية</a></li>
            <li><a href="/pillars/">المراجع الشاملة</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>أقسام المنصة</h4>
          <ul>
            <li><a href="/pricing.html">مجانية بالكامل</a></li>
            <li><a href="/about.html">عن المنصة</a></li>
            <li><a href="/contact.html">تواصل معنا</a></li>
            <li><a href="/privacy.html">سياسة الخصوصية</a></li>
            <li><a href="/why-trust-us.html">لماذا تثق بنا</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 منصة المحامي الرقمية — جميع الحقوق محفوظة</span>
        <span>آخر تحديث للمكتبة: ${new Date().toLocaleDateString('ar-EG')}</span>
      </div>
    </div>
  </footer>

  <!-- BOTTOM AD -->
  <div class="ad-slot ad-slot--bottom" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-7725405859334364"
         data-ad-slot="2168039898"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <script src="/search.js" defer></script>
</body>
</html>`;
}

/* ══════════════════════════ main ══════════════════════════ */
async function main() {
  const args = parseArgs();
  if (!fs.existsSync(TOPICS_DIR)) fs.mkdirSync(TOPICS_DIR, { recursive: true });

  const manifest = loadManifest();
  let branches = BRANCHES;
  if (args.branch) {
    const match = BRANCHES.filter((b) => b.slug === args.branch);
    if (!match.length) {
      console.error(`❌ لا يوجد فرع يطابق "${args.branch}"`);
      process.exit(1);
    }
    branches = match;
  }
  if (args.limit) branches = branches.slice(0, args.limit);

  console.log(`\n📚 توليد المكتبة القانونية — ${branches.length} فرع\n`);

  let generated = 0;
  let skipped = 0;
  for (const branch of branches) {
    if (!args.force && manifest[branch.slug]?.status === 'done' && fs.existsSync(path.join(TOPICS_DIR, `${branch.slug}.html`))) {
      console.log(`⏭️ متخطي (منشور): ${branch.slug}`);
      skipped++;
      continue;
    }
    try {
      const topic = await generateTopic(branch);
      const html = buildTopicHtml(branch, topic, 0);
      const wordCount = arabicWordCount(html);
      const finalHtml = buildTopicHtml(branch, topic, wordCount);
      const outputPath = path.join(TOPICS_DIR, `${branch.slug}.html`);
      fs.writeFileSync(outputPath, finalHtml, 'utf8');
      manifest[branch.slug] = {
        title: topic.title,
        branch: branch.branch,
        keyword: branch.keyword,
        datePublished: new Date().toISOString(),
        wordCount,
        sections: (topic.sections || []).length,
        faq: (topic.faq || []).length,
        status: 'done',
      };
      fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
      console.log(`✅ ${branch.slug}: ~${wordCount.toLocaleString('ar-EG')} كلمة · ${topic.sections?.length} أقسام · ${topic.faq?.length} FAQ`);
      generated++;
    } catch (e) {
      console.error(`❌ فشل ${branch.slug}: ${e.message}`);
    }
  }

  if (generated || skipped || !fs.existsSync(INDEX_FILE)) {
    const indexHtml = buildIndexHtml(manifest);
    fs.writeFileSync(INDEX_FILE, indexHtml, 'utf8');
    console.log(`\n✅ إعادة بناء ${INDEX_FILE}`);
  }

  const topicsCount = listHtml(TOPICS_DIR).length;
  const blogsCount = listHtml(BLOG_DIR).length;
  const formsCount = listHtml(FORMS_DOCS_DIR).length;
  const pillarsCount = listHtml(PILLARS_DIR).length;
  console.log(`\n📊 الإحصاءات الحقيقية: ${topicsCount} دليلاً · ${blogsCount} مقالاً · ${formsCount} صيغة · ${pillarsCount} مرجعاً شاملاً`);
  console.log(`📝 المنشور: ${MANIFEST_FILE}`);
  console.log(`\nالمجموع: أنشئ ${generated} · متخطي ${skipped}`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
