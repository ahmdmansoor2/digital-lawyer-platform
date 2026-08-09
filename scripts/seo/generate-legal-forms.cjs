#!/usr/bin/env node
/**
 * generate-legal-forms.cjs — توليد صفحة «صيغ العقود والدعاوي» (legal-forms.html)
 *
 * يقرأ قوالب العقود والمذكرات من src/data ويبني صفحة SEO ثابتة تعرض
 * النصوص الكاملة لكل العقود ببنودها مع الحقول التكميلية قابلة للتعبئة.
 *
 * الاستخدام:
 *   node scripts/seo/generate-legal-forms.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_FILE = path.join(ROOT, 'public', 'legal-forms.html');
const CONTRACTS_FILE = path.join(ROOT, 'src', 'data', 'contractTemplates.ts');
const LEGAL_FILE = path.join(ROOT, 'src', 'data', 'legalTemplates.ts');
const BASE_URL = 'https://mohamidigital.online';
const AD_CLIENT = 'ca-pub-7725405859334364';
const AD_SLOT = '2168039898';

// ─── أدوات عامة ───

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripEmoji(s) {
  return String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '');
}

// خريطة إصلاح الرموز التالفة (بقايا CP1256) في بيانات العقود
const REPAIR_MAP = {
  'ѡ': 'ر', 'ϡ': 'د', '֡': 'ض', '͡': 'ح', 'ޡ': 'ق', '̡': 'ر', 'ӡ': 'س', 'Ϻ': 'د',
};

function repair(s) {
  if (!s) return '';
  let out = '';
  for (const ch of String(s)) {
    out += REPAIR_MAP[ch] || ch;
  }
  return out;
}

function escAndRepair(s) {
  return esc(repair(s));
}

// ─── قراءة ملفات المصدر ───

function extractArray(tsPath, marker) {
  const raw = fs.readFileSync(tsPath, 'utf8');
  const start = raw.indexOf(marker);
  if (start === -1) throw new Error(`لم يوجد: ${marker}`);
  const arrStart = raw.indexOf('[', start);
  const arrEnd = raw.indexOf('];', arrStart);
  const arrText = raw.slice(arrStart, arrEnd + 2);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${arrText};`)();
}

function loadContracts() {
  return extractArray(CONTRACTS_FILE, 'PRESET_TEMPLATES');
}

function loadLegalTemplates() {
  const templates = extractArray(LEGAL_FILE, 'LEGAL_TEMPLATES');
  const snippets = extractArray(LEGAL_FILE, 'LEGAL_SNIPPETS');
  return { templates, snippets };
}

// ─── معالجة النصوص ───

function toParagraphs(text) {
  return String(text)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function renderFieldedText(text, fieldMap) {
  const paras = toParagraphs(text);
  return paras
    .map((p) => {
      let html = escAndRepair(p);
      html = html.replace(/\[([^\]]+)\]/g, (m, key) => {
        const k = key.trim();
        const f = fieldMap[k];
        const label = f ? f.label : k;
        const tip = f && f.defaultValue ? f.defaultValue : '';
        return `<span class="fld" title="${esc(repair(tip))}">${esc(repair(label))}</span>`;
      });
      return `<p>${html}</p>`;
    })
    .join('\n      ');
}

function cleanTemplateHtml(html) {
  let h = String(html).replace(/\sstyle="[^"]*"/g, '');
  h = h.replace(/<br\s*\/?\s*>/gi, '<br/>');
  h = h.replace(/\n\s*\n/g, '\n');
  return stripEmoji(h);
}

function buildFieldMap(contract) {
  const m = {};
  for (const f of contract.fields || []) m[f.key] = f;
  return m;
}

function plainTextOf(contract, fieldMap) {
  const parts = [];
  parts.push(...toParagraphs(repair(contract.arabicIntro || '')));
  for (const c of contract.clauses || []) {
    parts.push(c.title || '');
    parts.push(...toParagraphs(repair(c.defaultText || '')));
  }
  return parts.join('\n\n');
}

// ─── بناء HTML ───

function buildFieldChips(contract) {
  const chips = (contract.fields || [])
    .map((f) => {
      const ex = f.defaultValue ? esc(repair(f.defaultValue)) : '<span class="empty">…</span>';
      return `<div class="fld-chip"><span class="fld-label">${esc(repair(f.label))}</span><span class="fld-ex">${ex}</span></div>`;
    })
    .join('\n      ');
  if (!chips) return '';
  return `<div class="fields-box">
      <div class="fields-title">📋 الحقول التكميلية (تُملأ قبل التعاقد)</div>
      <div class="fields-grid">
      ${chips}
      </div>
    </div>`;
}

function buildClauses(contract, fieldMap) {
  return (contract.clauses || [])
    .map((c) => {
      const optionalBadge = c.optional ? '<span class="chip-opt">اختياري</span>' : '';
      const helper = c.helper ? `<div class="clause-helper">${esc(repair(c.helper))}</div>` : '';
      return `<div class="clause">
      <h4 class="clause-title">${esc(repair(c.title))} ${optionalBadge}</h4>
      <div class="clause-body">
      ${renderFieldedText(c.defaultText, fieldMap)}
      </div>
      ${helper}
    </div>`;
    })
    .join('\n    ');
}

function buildContractDoc(contract, idx) {
  const fieldMap = buildFieldMap(contract);
  const plain = plainTextOf(contract, fieldMap);
  const clausesHtml = buildClauses(contract, fieldMap);
  const introHtml = renderFieldedText(contract.arabicIntro || '', fieldMap);
  const fieldsHtml = buildFieldChips(contract);
  return `<details class="doc doc-card" id="doc-${esc(contract.id)}">
    <summary class="doc-head">
      <div>
        <div class="doc-cat">${esc(repair(contract.category))}</div>
        <h3 class="doc-title"><span class="doc-num">${String(idx + 1).padStart(2, '0')}</span>${esc(repair(contract.name))}</h3>
        <p class="doc-desc">${esc(repair(contract.description))}</p>
        <span class="doc-hint">📖 اضغط لعرض النص كاملاً</span>
      </div>
      <button class="copy-btn" type="button" onclick="event.stopPropagation(); copyText(this)" data-plain="${esc(JSON.stringify(plain))}">📄 نسخ النص كاملاً</button>
    </summary>
    ${fieldsHtml}
    <div class="doc-body">
      ${introHtml}
      ${clausesHtml}
    </div>
  </details>`;
}

function buildSections(contracts) {
  const order = ['عقود البيع والشراء', 'عقود الإيجار والاستغلال', 'عقود الشركات والتضامن', 'صحف دعاوى قضائية'];
  const byCat = {};
  for (const c of contracts) {
    (byCat[c.category] = byCat[c.category] || []).push(c);
  }
  return order
    .filter((cat) => byCat[cat] && byCat[cat].length)
    .map((cat) => {
      const docs = byCat[cat].map((c, i) => buildContractDoc(c, i)).join('\n    ');
      return `<div class="cat-block">
    <h2 class="cat-title">${esc(cat)}</h2>
    <p class="cat-sub">كل عقد في بطاقة مستقلة — اضغط على أي بطاقة لعرض نص العقد كاملاً.</p>
    ${docs}
    </div>`;
    })
    .join('\n  ');
}

function buildMemos(templates) {
  const t = (id) => templates.find((x) => x.id === id);
  const build = (name, headerId, desc) => {
    const parts = [t(headerId), t('memo-body-facts'), t('memo-body-defense'), t('memo-body-requests')]
      .filter(Boolean)
      .map((x) => `<div class="memo-part">${cleanTemplateHtml(x.html)}</div>`)
      .join('\n');
    return `<section class="doc memo-doc" id="doc-${esc(headerId)}">
    <div class="doc-head">
      <div>
        <div class="doc-cat">مذكرات الدفاع</div>
        <h3 class="doc-title">${esc(name)}</h3>
        <p class="doc-desc">${esc(desc)}</p>
      </div>
    </div>
    <div class="doc-body memo">
      ${parts}
    </div>
  </section>`;
  };
  return `${build('مذكرة دفاع في دعوى مدنية', 'memo-header-civil', 'قالب جاهز لصياغة مذكرة دفاع أمام المحاكم المدنية — وقائع ثم دفاع ثم طلبات.')}
    ${build('مذكرة دفاع في دعوى جنائية', 'memo-header-criminal', 'قالب جاهز لصياغة مذكرة دفاع في الجنح والجنايات — موضوع التهمة ثم الدفاع ثم الطلبات.')}`;
}

function buildContractSections(templates) {
  const ids = ['contract-party', 'contract-object', 'contract-rent', 'contract-duration'];
  const blocks = ids
    .map((id) => templates.find((x) => x.id === id))
    .filter(Boolean)
    .map((x) => `<div class="mini-doc">${cleanTemplateHtml(x.html)}</div>`)
    .join('\n    ');
  return blocks;
}

function buildCitations(templates, snippets) {
  const cit = ['citation-court-ruling', 'citation-law-article']
    .map((id) => templates.find((x) => x.id === id))
    .filter(Boolean)
    .map((x) => `<div class="mini-doc">${cleanTemplateHtml(x.html)}</div>`)
    .join('\n    ');
  const snips = (snippets || [])
    .map((s) => `<div class="snippet"><strong>${esc(s.label)}</strong><p>${escAndRepair(s.text)}</p></div>`)
    .join('\n      ');
  return `${cit}\n    <div class="snippets-grid">\n      ${snips}\n    </div>`;
}

function buildToc(contracts) {
  const links = contracts
    .map((c) => `<li><a href="#doc-${esc(c.id)}">${esc(repair(c.name))}</a></li>`)
    .join('\n        ');
  return links;
}

function buildPage(contracts, legal) {
  const { templates, snippets } = legal;
  const nowISO = new Date(Date.now() + 120 * 60000).toISOString();

  const itemList = contracts
    .map((c, i) => `{"@type":"ListItem","position":${i + 1},"name":"${esc(repair(c.name))}"}`)
    .join(',');

  const faqList = [
    { q: 'ما هي صيغ العقود والدعاوي المتوفرة؟', a: 'تتضمن الصفحة نصوصاً كاملة لستة نماذج تشمل عقود البيع (ابتدائي ونهائي)، عقود الإيجار (عين تجارية ونموذج ١٥ بنداً شاملاً)، عقد تأسيس شركة تضامن، وصحيفة دعوى صحة توقيع على عقد بيع، إضافة إلى قوالب مذكرات الدفاع المدني والجنائي.' },
    { q: 'هل يمكن استخدام هذه الصيغ مباشرة؟', a: 'النماذج منشورة بنصوصها الكاملة مع الحقول التكميلية بين قوسين مربعين. يُنصح دائماً بمراجعة الصيغة وتعبئة البيانات، ومعاينة المحامي المختص قبل التوقيع أو رفع الدعوى لضمان ملاءمتها لحالة المتعاقدين.' },
    { q: 'هل الصيغ وفق القانون المصري؟', a: 'نعم، الصيغ مبنية على القانون المدني المصري وقانون الإثبات وقانون المرافعات وقوانين إيجار الأماكن، مثل المادة 45 من قانون الإثبات الخاصة بصحة التوقيع.' },
  ];
  const faqJson = faqList
    .map((f) => `{"@type":"Question","name":"${esc(f.q)}","acceptedAnswer":{"@type":"Answer","text":"${esc(f.a)}"}}`)
    .join(',');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>صيغ العقود والدعاوي - نصوص قانونية كاملة جاهزة للتعبئة | منصة المحامي الرقمية</title>
  <meta name="description" content="صيغ عقود ودعاوي قانونية مصرية كاملة النصوص والبنود: عقود البيع والشراء، عقود الإيجار، عقد تأسيس شركة تضامن، صحيفة دعوى صحة توقيع، ومذكرات دفاع جاهزة للتعبئة والاستخدام." />
  <meta name="keywords" content="صيغ عقود, عقود قانونية, عقد بيع, عقد إيجار, صحيفة دعوى, صحة توقيع, مذكرة دفاع, عقود مصرية, صيغ دعاوى, نماذج عقود قانونية" />
  <meta name="author" content="منصة المحامي الرقمية" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${BASE_URL}/legal-forms.html" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="صيغ العقود والدعاوي - نصوص قانونية كاملة جاهزة للتعبئة" />
  <meta property="og:description" content="نصوص كاملة لستة عقود ودعاوى مصرية مع قوالب مذكرات الدفاع والاستشهادات القانونية." />
  <meta property="og:url" content="${BASE_URL}/legal-forms.html" />
  <meta property="og:site_name" content="منصة المحامي الرقمية" />
  <meta property="og:locale" content="ar_EG" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}" crossorigin="anonymous"></script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}","logo":"${BASE_URL}/logo.png"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"صيغ العقود والدعاوي","url":"${BASE_URL}/legal-forms.html","isPartOf":{"@type":"WebSite","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"inLanguage":"ar-EG","dateModified":"${nowISO}"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"${BASE_URL}"},{"@type":"ListItem","position":2,"name":"صيغ العقود والدعاوي","item":"${BASE_URL}/legal-forms.html"}]}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"ItemList","name":"صيغ العقود والدعاوي","itemListElement":[${itemList}]}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${faqJson}]}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f172a;
      --border: rgba(148,163,184,0.12);
      --indigo: #6366f1;
      --purple: #7c3aed;
      --emerald: #10b981;
      --cyan: #06b6d4;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --card-bg: rgba(15,23,42,0.7);
    }
    html { scroll-behavior: smooth; scroll-padding-top: 90px; }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.8;
      background-image:
        radial-gradient(ellipse at 20% 0%, rgba(6,182,212,0.14) 0%, transparent 55%),
        radial-gradient(ellipse at 90% 30%, rgba(124,58,237,0.14) 0%, transparent 50%);
    }

    nav { position: sticky; top: 0; z-index: 100; background: rgba(15,23,42,0.82); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .logo-icon { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, var(--indigo), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 20px rgba(99,102,241,0.35); }
    .logo-name { font-size: 15px; font-weight: 900; color: #fff; line-height: 1.2; }
    .logo-sub { font-size: 10px; color: var(--emerald); font-weight: 700; }
    .nav-links { display: flex; align-items: center; gap: 28px; }
    .nav-links a { font-size: 13px; font-weight: 700; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--indigo); }
    .nav-cta { padding: 9px 22px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), var(--purple)); color: #fff; font-size: 12px; font-weight: 900; text-decoration: none; box-shadow: 0 4px 16px rgba(99,102,241,0.3); }

    .breadcrumbs { max-width: 1200px; margin: 0 auto; padding: 14px 24px 0; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .breadcrumbs a { color: var(--muted); text-decoration: none; transition: color 0.2s; font-weight: 700; }
    .breadcrumbs a:hover { color: var(--indigo); }
    .breadcrumbs .current { color: var(--text); font-weight: 800; }
    .breadcrumbs .sep { color: var(--muted); opacity: 0.4; font-size: 10px; }

    .hero { max-width: 880px; margin: 0 auto; padding: 54px 24px 30px; text-align: center; }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 999px; background: rgba(6,182,212,0.12); border: 1px solid rgba(6,182,212,0.3); color: #67e8f9; font-size: 11px; font-weight: 800; margin-bottom: 20px; }
    .hero h1 { font-size: clamp(1.9rem, 5vw, 3.1rem); font-weight: 900; line-height: 1.25; margin-bottom: 16px; background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 50%, #67e8f9 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 16px; color: var(--muted); max-width: 640px; margin: 0 auto; font-weight: 600; }

    .toc-wrap { max-width: 1200px; margin: 0 auto; padding: 10px 24px 26px; }
    .toc { background: var(--card-bg); border: 1px solid var(--border); border-radius: 18px; padding: 22px 26px; }
    .toc h4 { font-size: 14px; font-weight: 900; color: #fff; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    .toc ol { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 22px; counter-reset: t; }
    .toc ol li { counter-increment: t; }
    .toc ol li a { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); text-decoration: none; font-weight: 700; padding: 8px 12px; border-radius: 10px; transition: all 0.2s; }
    .toc ol li a::before { content: counter(t, decimal-leading-zero); font-size: 11px; font-weight: 900; color: var(--cyan); }
    .toc ol li a:hover { background: rgba(99,102,241,0.08); color: #fff; }

    .container { max-width: 1000px; margin: 0 auto; padding: 0 24px 40px; }
    .cat-title { font-size: 22px; font-weight: 900; color: #fff; margin: 36px 0 20px; display: flex; align-items: center; gap: 12px; }
    .cat-title::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(6,182,212,0.4), transparent); }
    .cat-sub { font-size: 12.5px; color: var(--muted); margin-top: -14px; margin-bottom: 18px; }

    .doc { background: var(--card-bg); border: 1px solid var(--border); border-radius: 18px; padding: 24px 26px; margin-bottom: 20px; transition: border-color 0.25s, transform 0.25s; }
    .doc:hover { border-color: rgba(6,182,212,0.35); transform: translateY(-2px); }
    .doc-card[open] { border-color: rgba(6,182,212,0.5); }
    .doc-card > .doc-head { list-style: none; cursor: pointer; margin-bottom: 0; }
    .doc-card > .doc-head::-webkit-details-marker { display: none; }
    .doc-card[open] > .doc-head { border-bottom: 1px solid var(--border); padding-bottom: 14px; margin-bottom: 16px; }
    .memo-doc > .doc-head { margin-bottom: 18px; }
    .doc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; flex-wrap: wrap; }
    .doc-cat { display: inline-block; font-size: 10px; font-weight: 800; color: #67e8f9; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.25); padding: 4px 12px; border-radius: 999px; margin-bottom: 8px; }
    .doc-title { display: flex; align-items: center; gap: 10px; font-size: 19px; font-weight: 900; color: #fff; line-height: 1.4; }
    .doc-num { font-size: 17px; font-weight: 900; color: transparent; background: linear-gradient(135deg, #06b6d4, #a855f7); -webkit-background-clip: text; background-clip: text; min-width: 30px; text-align: center; }
    .doc-desc { font-size: 12.5px; color: var(--muted); margin-top: 6px; line-height: 1.7; }
    .doc-hint { display: inline-block; margin-top: 10px; font-size: 11px; font-weight: 800; color: var(--cyan); }
    .doc-card[open] .doc-hint::after { content: " ▲"; font-size: 9px; }
    .doc-card:not([open]) .doc-hint::after { content: " ▼"; font-size: 9px; }
    .copy-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; border: 1px solid rgba(16,185,129,0.4); background: rgba(16,185,129,0.1); color: #6ee7b7; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .copy-btn:hover { background: rgba(16,185,129,0.2); }

    .fields-box { background: rgba(99,102,241,0.06); border: 1px dashed rgba(99,102,241,0.35); border-radius: 14px; padding: 16px 18px; margin-bottom: 18px; }
    .fields-title { font-size: 12.5px; font-weight: 800; color: #a5b4fc; margin-bottom: 12px; }
    .fields-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .fld-chip { display: inline-flex; align-items: center; gap: 8px; background: rgba(15,23,42,0.9); border: 1px solid var(--border); border-radius: 10px; padding: 6px 12px; font-size: 11.5px; }
    .fld-label { color: #c7d2fe; font-weight: 800; }
    .fld-ex { color: var(--muted); }
    .fld-ex .empty { color: rgba(148,163,184,0.5); }

    .doc-body { border-top: 1px solid var(--border); padding-top: 18px; font-size: 14.5px; }
    .doc-body p { margin-bottom: 12px; color: #e2e8f0; }
    .clause { margin-top: 18px; padding: 16px 18px; background: rgba(15,23,42,0.55); border: 1px solid var(--border); border-right: 3px solid var(--emerald); border-radius: 12px; }
    .clause-title { font-size: 14px; font-weight: 900; color: #fff; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
    .chip-opt { font-size: 9.5px; font-weight: 800; color: var(--muted); border: 1px solid var(--border); padding: 2px 9px; border-radius: 999px; }
    .clause-body p { font-size: 14px; }
    .clause-helper { margin-top: 10px; font-size: 11.5px; color: var(--muted); background: rgba(16,185,129,0.06); border-right: 2px solid rgba(16,185,129,0.4); padding: 6px 12px; border-radius: 8px; }

    .fld { display: inline; background: rgba(16,185,129,0.16); border: 1px dashed rgba(16,185,129,0.45); color: #6ee7b7; font-weight: 800; padding: 0 6px; border-radius: 6px; font-size: 13px; }

    .mini-doc { background: rgba(15,23,42,0.6); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; margin-bottom: 14px; }
    .mini-doc h3 { font-size: 15px; font-weight: 900; color: #fff; margin-bottom: 8px; }
    .mini-doc p, .mini-doc li { font-size: 13.5px; color: #e2e8f0; margin-bottom: 6px; }
    .mini-doc ul, .mini-doc ol { padding-right: 22px; }

    .memo-doc .doc-body h1, .memo-doc .doc-body h2 { text-align: center; }
    .memo-doc .doc-body h1 { font-size: 20px; font-weight: 900; color: #fff; margin: 6px 0 10px; }
    .memo-doc .doc-body h2 { font-size: 16px; font-weight: 900; color: #a5b4fc; margin: 18px 0 8px; }
    .memo-doc .doc-body h3 { font-size: 14px; font-weight: 800; color: #6ee7b7; margin: 12px 0 6px; }
    .memo-doc .doc-body ol { padding-right: 22px; }
    .memo-doc .doc-body blockquote { margin: 10px 0; padding: 10px 14px; border-right: 3px solid var(--indigo); background: rgba(99,102,241,0.08); border-radius: 10px; color: #c7d2fe; font-size: 13px; }
    .memo-doc hr { border: none; border-top: 1px solid var(--border); margin: 14px 0; }

    .snippets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .snippet { background: rgba(15,23,42,0.6); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }
    .snippet strong { font-size: 12px; font-weight: 900; color: #a5b4fc; display: block; margin-bottom: 6px; }
    .snippet p { font-size: 12.5px; color: #e2e8f0; line-height: 1.8; }

    .ad-slot { margin: 28px auto; max-width: 100%; text-align: center; min-height: 90px; }
    .ad-label { display: block; font-size: 10px; color: var(--muted); text-align: center; margin-bottom: 6px; letter-spacing: 0.5px; font-weight: 700; }

    .cta-section { text-align: center; padding: 0 24px 64px; }
    .cta-btn { display: inline-flex; align-items: center; gap: 10px; padding: 15px 44px; border-radius: 14px; background: linear-gradient(135deg, var(--emerald), #0891b2, var(--indigo)); color: #fff; font-size: 14px; font-weight: 900; text-decoration: none; box-shadow: 0 8px 32px rgba(16,185,129,0.25); }

    footer { border-top: 1px solid var(--border); background: rgba(15,23,42,0.95); padding: 56px 24px 32px; }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 36px; }
    .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .footer-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .footer-logo-name { font-size: 15px; font-weight: 900; color: #fff; }
    .footer-desc { font-size: 12px; color: var(--muted); line-height: 1.8; max-width: 280px; }
    .footer-email { font-size: 12px; color: var(--indigo); margin-top: 10px; font-weight: 700; }
    .footer-email a { color: var(--indigo); text-decoration: none; }
    .footer-col h4 { font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 14px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
    .footer-col ul a { font-size: 12px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .footer-col ul a:hover { color: var(--indigo); }
    .footer-bottom { border-top: 1px solid rgba(148,163,184,0.08); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(148,163,184,0.5); }

    @media (max-width: 760px) {
      .toc ol { grid-template-columns: 1fr; }
      .snippets-grid { grid-template-columns: 1fr; }
      .doc-head { flex-direction: column; }
      .footer-grid { grid-template-columns: 1fr; gap: 28px; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="nav-inner">
      <a href="/" class="nav-logo">
        <div class="logo-icon">⚖️</div>
        <div>
          <div class="logo-name">منصة المحامي الرقمية</div>
          <div class="logo-sub">مجاني 100% • نظام إدارة مكاتب المحاماة</div>
        </div>
      </a>
      <div class="nav-links">
        <a href="/">الرئيسية</a>
        <a href="/features.html">المميزات</a>
        <a href="/blog/">المدونة</a>
        <a href="/legal-radar.html">رصد المحامي</a>
        <a href="/contact.html">تواصل معنا</a>
      </div>
      <a href="/" class="nav-cta">دخول المنصة مجاناً 🚀</a>
    </div>
  </nav>
  <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span class="sep">›</span><span class="current">صيغ العقود والدعاوي</span></nav>

  <div class="hero">
    <div class="badge">⚖️ نصوص قانونية مصرية كاملة البنود</div>
    <h1>صيغ العقود والدعاوي — نصوص كاملة جاهزة للتعبئة</h1>
    <p>صيغ قانونية شاملة بنصوصها الكاملة وكل بنودها، مع الحقول التكميلية المطلوب ملؤها قبل التعاقد أو رفع الدعوى — وفق القانون المدني المصري وقانون الإثبات والمرافعات.</p>
  </div>

  <!-- TOP AD -->
  <div class="ad-slot" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <div class="toc-wrap">
    <div class="toc">
      <h4>محتويات الصفحة</h4>
      <ol>
        ${buildToc(contracts)}
      </ol>
    </div>
  </div>

  <div class="container">
    ${buildSections(contracts)}

    <div class="cat-title">قوالب مذكرات الدفاع</div>
    ${buildMemos(templates)}

    <div class="cat-title">بنود العقود القياسية</div>
    ${buildContractSections(templates)}

    <div class="cat-title">الاستشهادات والعبارات القانونية الجاهزة</div>
    ${buildCitations(templates, snippets)}

    <!-- MIDDLE AD -->
    <div class="ad-slot" role="complementary" aria-label="إعلان">
      <span class="ad-label">إعلان</span>
      <ins class="adsbygoogle" style="display:block" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>
  </div>

  <div class="cta-section">
    <a href="/" class="cta-btn">جرّب منصة المحامي الرقمية مجاناً 🚀</a>
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
          <h4>أقسام المنصة</h4>
          <ul>
            <li><a href="/">الرئيسية</a></li>
            <li><a href="/about.html">عن المنصة</a></li>
            <li><a href="/features.html">المميزات</a></li>
            <li><a href="/blog/">المدونة القانونية</a></li>
            <li><a href="/pillars/">المراجع القانونية</a></li>
            <li><a href="/legal-radar.html">رصد المحامي</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>السياسات والتواصل</h4>
          <ul>
            <li><a href="/legal-forms.html">صيغ العقود والدعاوي</a></li>
            <li><a href="/privacy.html">سياسة الخصوصية</a></li>
            <li><a href="/terms.html">شروط الاستخدام</a></li>
            <li><a href="/contact.html">تواصل معنا</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 منصة المحامي الرقمية — جميع الحقوق محفوظة</span>
        <span>صيغ قانونية استرشادية — تُراجع مع محامٍ مختص قبل الاستخدام</span>
      </div>
    </div>
  </footer>

  <script>
    function copyText(btn) {
      var text = btn.getAttribute('data-plain');
      function done() { btn.innerHTML = '✓ تم النسخ'; btn.style.color = '#fff'; setTimeout(function(){ btn.innerHTML = '📄 نسخ النص كاملاً'; btn.style.color = ''; }, 2200); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch(e) {}
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else fallback();
    }
    (function() {
      try {
        var p = new URLSearchParams(window.location.search);
        if (p.get('from') === 'app') {
          var cta = document.querySelector('.nav-cta');
          if (cta) { cta.innerHTML = '← العودة إلى لوحة التحكم'; cta.setAttribute('href', '/'); }
        }
      } catch(e) {}
    })();
  </script>
</body>
</html>
`;
}

function main() {
  const contracts = loadContracts();
  const legal = loadLegalTemplates();
  if (!Array.isArray(contracts) || !contracts.length) throw new Error('لا توجد عقود');
  const html = buildPage(contracts, legal);
  fs.writeFileSync(OUT_FILE, html, 'utf8');
  console.log(`[legal-forms] ✅ تم توليد ${OUT_FILE} (${contracts.length} عقود + ${legal.templates.length} قوالب + ${legal.snippets.length} عبارات)`);
}

try {
  main();
} catch (e) {
  console.error('[legal-forms] ❌ خطأ:', e.message);
  process.exit(1);
}
