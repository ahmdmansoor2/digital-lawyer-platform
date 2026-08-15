#!/usr/bin/env node
/**
 * update-web-library.cjs — تحديث وتكامل صفحات المكتبة القانونية وصيغ العقود بالبيانات الضخمة
 *
 * 1. يحدّث public/legal-library.html بإحصاءات الـ 10,329 ملفاً ومحرك بحث تفاعلي فوري + عارض كتب PDF.
 * 2. يحدّث public/legal-forms.html بـ 2,691 صيغة ونموذج تفاعلي مع النسخ والتحميل والطباعة.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'public', 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'legal-catalog.json');
const FORMS_FILE = path.join(DATA_DIR, 'legal-forms-summary.json');
const LIB_HTML_FILE = path.join(ROOT, 'public', 'legal-library.html');
const FORMS_HTML_FILE = path.join(ROOT, 'public', 'legal-forms.html');

console.log('🚀 بدء دمج وتحديث واجهات المكتبة القانونية وصيغ العقود...');

if (!fs.existsSync(CATALOG_FILE) || !fs.existsSync(FORMS_FILE)) {
  console.error('❌ ملفات الفهرس غير موجودة. شغّل index-library.cjs و extract-forms.cjs أولاً.');
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
const formsSummary = JSON.parse(fs.readFileSync(FORMS_FILE, 'utf8'));

console.log(`إجمالي المراجع المفهرسة: ${catalog.totalItems} | إجمالي الصيغ: ${formsSummary.totalForms}`);

// ── قراءة القالب الأساسي لـ legal-forms.html والتحديث التفاعلي ──
function buildInteractiveFormsHtml() {
  const categoriesJson = JSON.stringify(formsSummary.categories);
  
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>صيغ العقود والدعاوي (2,690+ صيغة قانونية جاهزة للنسخ والتحميل) | منصة المحامي الرقمية</title>
  <meta name="description" content="أكبر مكتبة صيغ عقود وصحف دعاوى ومذكرات دفاع وإنذارات رسمية في مصر (+2,690 صيغة) جاهزة للنسخ والتحميل المباشر كملفات Word قابلة للتعديل والطباعة مجاناً 100%." />
  <meta name="keywords" content="صيغ عقود, صيغ دعاوى, صحيفة دعوى, عقد بيع, عقد ايجار, مذكرات دفاع, جنحة ايصال امانة, جنحة شيك, دعوى خلع, دعوى طلاق, صحة توقيع, صحة ونفاذ, فرز وتجنيب, طرد للغصب, انذار عرض, توكيلات شهر عقاري" />
  <meta name="author" content="منصة المحامي الرقمية" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="https://mohamidigital.online/legal-forms.html" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="صيغ العقود والدعاوي (+2,690 صيغة قانونية جاهزة للنسخ والتحميل)" />
  <meta property="og:description" content="أكبر موسوعة صيغ عقود ودعاوى ومذكرات مصرية مع إمكانية البحث والنسخ والتحميل المباشر كملفات Word مجاناً." />
  <meta property="og:url" content="https://mohamidigital.online/legal-forms.html" />
  <meta property="og:site_name" content="منصة المحامي الرقمية" />
  <meta property="og:locale" content="ar_EG" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
  <link rel="stylesheet" href="/header.css?v=20260814-v5">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"منصة المحامي الرقمية","url":"https://mohamidigital.online","logo":"https://mohamidigital.online/logo.png"}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"صيغ العقود والدعاوي","url":"https://mohamidigital.online/legal-forms.html","inLanguage":"ar-EG"}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"https://mohamidigital.online"},{"@type":"ListItem","position":2,"name":"صيغ العقود والدعاوي","item":"https://mohamidigital.online/legal-forms.html"}]}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f172a;
      --border: rgba(148,163,184,0.12);
      --indigo: #6366f1;
      --purple: #7c3aed;
      --emerald: #10b981;
      --cyan: #06b6d4;
      --amber: #f59e0b;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --card-bg: rgba(15,23,42,0.7);
    }
    html { scroll-behavior: smooth; scroll-padding-top: 90px; }
    body { font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif; background-color: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.8; background-image: radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 60%, rgba(16,185,129,0.12) 0%, transparent 50%); }
    
    .breadcrumbs { max-width: 1200px; margin: 0 auto; padding: 14px 24px 0; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .breadcrumbs a { color: var(--muted); text-decoration: none; transition: color 0.2s; font-weight: 700; }
    .breadcrumbs a:hover { color: var(--indigo); }
    .breadcrumbs .current { color: var(--text); font-weight: 800; }
    .breadcrumbs .sep { color: var(--muted); opacity: 0.4; font-size: 10px; }

    .hero { max-width: 900px; margin: 0 auto; padding: 50px 24px 24px; text-align: center; }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 999px; background: rgba(6,182,212,0.12); border: 1px solid rgba(6,182,212,0.3); color: #67e8f9; font-size: 11px; font-weight: 800; margin-bottom: 20px; }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 900; line-height: 1.25; margin-bottom: 16px; background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 50%, #67e8f9 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 16px; color: var(--muted); max-width: 680px; margin: 0 auto; font-weight: 600; line-height: 1.8; }
    
    .hero-stats { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-top: 24px; }
    .stat-pill { background: var(--card-bg); border: 1px solid var(--border); padding: 8px 20px; border-radius: 14px; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 800; color: #fff; }
    .stat-pill .num { color: #67e8f9; font-size: 17px; font-weight: 900; }

    .search-wrapper { max-width: 1200px; margin: 20px auto 30px; padding: 0 24px; }
    .search-bar { background: var(--card-bg); border: 1px solid rgba(99,102,241,0.3); border-radius: 18px; padding: 6px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); transition: all 0.25s; }
    .search-bar:focus-within { border-color: #67e8f9; box-shadow: 0 0 0 3px rgba(6,182,212,0.2); }
    .search-bar input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: 15px; color: #fff; padding: 12px 4px; }
    .search-bar input::placeholder { color: var(--muted); }
    .search-btn { background: linear-gradient(135deg, var(--indigo), var(--purple)); color: #fff; border: none; padding: 10px 24px; border-radius: 12px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; transition: transform 0.2s; }
    .search-btn:hover { transform: translateY(-2px); }

    .category-pills { max-width: 1200px; margin: 0 auto 30px; padding: 0 24px; display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; scrollbar-width: thin; }
    .cat-btn { background: var(--card-bg); border: 1px solid var(--border); color: var(--muted); padding: 8px 16px; border-radius: 12px; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
    .cat-btn:hover, .cat-btn.active { background: rgba(99,102,241,0.18); border-color: rgba(99,102,241,0.5); color: #fff; }
    .cat-btn .badge-c { background: rgba(255,255,255,0.1); padding: 2px 7px; border-radius: 999px; font-size: 10.5px; }

    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px 60px; }
    .forms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
    
    .form-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; transition: all 0.25s; cursor: pointer; position: relative; overflow: hidden; }
    .form-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.4); box-shadow: 0 16px 36px rgba(0,0,0,0.35); }
    .form-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .form-badge { font-size: 11px; font-weight: 800; color: #67e8f9; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.2); padding: 3px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; }
    .form-card h3 { font-size: 15px; font-weight: 800; color: #fff; line-height: 1.5; margin-bottom: 8px; }
    .form-card p { font-size: 12px; color: var(--muted); line-height: 1.7; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 14px; }
    .form-card-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--border); padding-top: 12px; margin-top: auto; }
    .form-words { font-size: 11px; color: var(--muted); font-weight: 700; }
    .form-action-hint { font-size: 11.5px; font-weight: 800; color: #a5b4fc; display: flex; align-items: center; gap: 4px; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 9999; display: none; align-items: center; justify-content: center; padding: 20px; }
    .modal-overlay.open { display: flex; }
    .modal-box { background: #0f172a; border: 1px solid rgba(99,102,241,0.3); border-radius: 24px; width: 100%; max-width: 850px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.6); overflow: hidden; }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: rgba(15,23,42,0.9); }
    .modal-title { font-size: 18px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 10px; }
    .modal-close { background: rgba(255,255,255,0.08); border: none; color: #fff; width: 34px; height: 34px; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
    .modal-close:hover { background: rgba(239,68,68,0.3); }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; font-size: 14.5px; line-height: 2; color: #e2e8f0; white-space: pre-wrap; font-family: 'Cairo', monospace; background: rgba(2,6,23,0.4); border-radius: 12px; margin: 16px 24px; border: 1px solid var(--border); }
    .modal-actions { padding: 16px 24px 20px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: flex-end; gap: 12px; background: rgba(15,23,42,0.9); flex-wrap: wrap; }
    .btn-action { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; border: none; transition: transform 0.2s, box-shadow 0.2s; }
    .btn-copy { background: linear-gradient(135deg, var(--emerald), #059669); color: #fff; }
    .btn-download { background: linear-gradient(135deg, var(--indigo), var(--purple)); color: #fff; text-decoration: none; }
    .btn-print { background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: #fff; }
    .btn-action:hover { transform: translateY(-2px); }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 40px; flex-wrap: wrap; }
    .page-btn { background: var(--card-bg); border: 1px solid var(--border); color: #fff; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 700; transition: all 0.2s; }
    .page-btn.active, .page-btn:hover { background: var(--indigo); border-color: var(--indigo); }
    .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .ad-slot { margin: 28px auto; max-width: 100%; text-align: center; min-height: 90px; }
    .ad-label { display: block; font-size: 10px; color: var(--muted); text-align: center; margin-bottom: 6px; letter-spacing: 0.5px; font-weight: 700; }

    footer { border-top: 1px solid var(--border); background: rgba(15,23,42,0.95); padding: 56px 24px 32px; }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 36px; }
    .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .footer-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .footer-logo-name { font-size: 15px; font-weight: 900; color: #fff; }
    .footer-desc { font-size: 12px; color: var(--muted); line-height: 1.8; max-width: 280px; }
    .footer-col h4 { font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 14px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
    .footer-col ul a { font-size: 12px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .footer-col ul a:hover { color: var(--indigo); }
    .footer-bottom { border-top: 1px solid rgba(148,163,184,0.08); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(148,163,184,0.5); }
    @media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr; gap: 28px; } }
  </style>
</head>
<body>
  ${require('../seo/unified-header.cjs').headerMarkup('forms')}
  <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span class="sep">›</span><span class="current">صيغ العقود والدعاوي</span></nav>

  <div class="hero">
    <div class="badge">⚖️ نصوص قانونية كاملة مجانية 100%</div>
    <h1>صيغ ونماذج العقود والدعاوي المصرية</h1>
    <p>أكبر موسوعة رقمية للصيغ القانونية وصحف الدعاوى ومذكرات الدفاع وعقود البيع والشركات والإنذارات الرسمية — جاهزة للنسخ والتحميل المباشر كملف Word والطباعة.</p>
    <div class="hero-stats">
      <div class="stat-pill"><span class="num">${formsSummary.totalForms.toLocaleString('ar-EG')}</span> صيغة ونموذج</div>
      <div class="stat-pill"><span class="num">${formsSummary.categories.length}</span> تصنيف متخصص</div>
      <div class="stat-pill"><span class="num">100%</span> مجاني ومحدث</div>
    </div>
  </div>

  <div class="search-wrapper">
    <div class="search-bar">
      <span style="font-size:18px">🔍</span>
      <input type="text" id="formsSearchInput" placeholder="ابحث في أكثر من ${formsSummary.totalForms} صيغة (مثال: خلع، عقد بيع سيارة، إيصال أمانة، صحة ونفاذ)..." />
      <button class="search-btn" id="searchTriggerBtn">بحث فوري</button>
    </div>
  </div>

  <div class="category-pills" id="categoryPillsContainer">
    <button class="cat-btn active" data-cat="all">🌟 جميع الصيغ <span class="badge-c">${formsSummary.totalForms}</span></button>
  </div>

  <!-- TOP AD -->
  <div class="ad-slot" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-7725405859334364" data-ad-slot="2168039898" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <div class="container">
    <div class="forms-grid" id="formsGridContainer">
      <!-- يتم توليد البطاقات عبر جافاسكريبت فائق السرعة -->
    </div>
    <div class="pagination" id="paginationContainer"></div>
  </div>

  <!-- Modal -->
  <div class="modal-overlay" id="formModal">
    <div class="modal-box">
      <div class="modal-header">
        <div class="modal-title">
          <span id="modalIcon">📜</span>
          <span id="modalTitle">عنوان الصيغة</span>
        </div>
        <button class="modal-close" id="modalCloseBtn">✕</button>
      </div>
      <div class="modal-body" id="modalBodyText">جاري تحميل نص الصيغة الكامل...</div>
      <div class="modal-actions">
        <button class="btn-action btn-copy" id="btnCopyForm">📋 نسخ النص كاملاً</button>
        <button class="btn-action btn-download" id="btnDownloadWord">📥 تحميل كملف Word</button>
        <button class="btn-action btn-print" id="btnPrintForm">🖨️ طباعة</button>
      </div>
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
          <p class="footer-desc">النظام البرمجي المتكامل والمجاني لإدارة مكاتب المحاماة في مصر.</p>
        </div>
        <div class="footer-col">
          <h4>أقسام المنصة</h4>
          <ul>
            <li><a href="/">الرئيسية</a></li>
            <li><a href="/legal-library.html">المكتبة القانونية</a></li>
            <li><a href="/pillars/">المراجع الشاملة</a></li>
            <li><a href="/blog/">المدونة القانونية</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>السياسات والدعم</h4>
          <ul>
            <li><a href="/privacy.html">سياسة الخصوصية</a></li>
            <li><a href="/terms.html">شروط الاستخدام</a></li>
            <li><a href="/contact.html">تواصل معنا</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 منصة المحامي الرقمية — جميع الحقوق محفوظة</span>
        <span>صيغ ونماذج استرشادية للمحامي المصري</span>
      </div>
    </div>
  </footer>

  <script>
    (function() {
      var allForms = [];
      var filteredForms = [];
      var currentCategory = 'all';
      var currentPage = 1;
      var pageSize = 24;
      var activeFormId = null;
      var chunksCache = {};

      var grid = document.getElementById('formsGridContainer');
      var pagination = document.getElementById('paginationContainer');
      var searchInput = document.getElementById('formsSearchInput');
      var pillsContainer = document.getElementById('categoryPillsContainer');
      var modal = document.getElementById('formModal');
      var modalTitle = document.getElementById('modalTitle');
      var modalBody = document.getElementById('modalBodyText');
      var modalIcon = document.getElementById('modalIcon');

      // جلب الفهرس الخفيف
      fetch('/data/legal-forms-summary.json')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          allForms = data.forms || [];
          filteredForms = allForms;
          renderCategoryPills(data.categories || []);
          renderPage();
        })
        .catch(function(err) {
          console.error('Error loading forms:', err);
        });

      function renderCategoryPills(cats) {
        cats.forEach(function(c) {
          var btn = document.createElement('button');
          btn.className = 'cat-btn';
          btn.setAttribute('data-cat', c.category);
          btn.innerHTML = (c.icon || '📄') + ' ' + c.category + ' <span class="badge-c">' + c.count + '</span>';
          btn.onclick = function() {
            document.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentCategory = c.category;
            currentPage = 1;
            filterForms();
          };
          pillsContainer.appendChild(btn);
        });
      }

      function filterForms() {
        var q = (searchInput.value || '').trim().toLowerCase();
        filteredForms = allForms.filter(function(f) {
          var matchCat = (currentCategory === 'all' || f.category === currentCategory);
          var matchQuery = !q || f.title.toLowerCase().includes(q) || (f.preview && f.preview.toLowerCase().includes(q));
          return matchCat && matchQuery;
        });
        currentPage = 1;
        renderPage();
      }

      searchInput.addEventListener('input', filterForms);
      document.getElementById('searchTriggerBtn').addEventListener('click', filterForms);

      document.querySelector('[data-cat="all"]').onclick = function() {
        document.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        currentCategory = 'all';
        currentPage = 1;
        filterForms();
      };

      function renderPage() {
        grid.innerHTML = '';
        var start = (currentPage - 1) * pageSize;
        var pageItems = filteredForms.slice(start, start + pageSize);

        if (pageItems.length === 0) {
          grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 50px 20px; color: var(--muted); font-size:16px;">لم يتم العثور على صيغ مطابقة لكلمات البحث. جرب كلمات أخرى مثل (عقد، خلع، شيك، إيجار).</div>';
          pagination.innerHTML = '';
          return;
        }

        pageItems.forEach(function(f) {
          var card = document.createElement('div');
          card.className = 'form-card';
          card.innerHTML = 
            '<div class="form-card-top">' +
              '<span class="form-badge">' + (f.icon || '📜') + ' ' + f.category + '</span>' +
              '<span style="font-size:11px; opacity:.6;">Word</span>' +
            '</div>' +
            '<h3>' + f.title + '</h3>' +
            '<p>' + (f.preview || 'اضغط لفتح الصيغة الكاملة والنسخ والتحميل.') + '</p>' +
            '<div class="form-card-footer">' +
              '<span class="form-words">' + (f.wordCount ? f.wordCount.toLocaleString('ar-EG') + ' كلمة' : '') + '</span>' +
              '<span class="form-action-hint">عرض الصيغة ←</span>' +
            '</div>';
          
          card.onclick = function() { openFormModal(f); };
          grid.appendChild(card);
        });

        renderPagination();
      }

      function renderPagination() {
        pagination.innerHTML = '';
        var totalPages = Math.ceil(filteredForms.length / pageSize);
        if (totalPages <= 1) return;

        var prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerText = '→ السابق';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = function() { if (currentPage > 1) { currentPage--; renderPage(); window.scrollTo({top: 400, behavior:'smooth'}); } };
        pagination.appendChild(prevBtn);

        var startP = Math.max(1, currentPage - 2);
        var endP = Math.min(totalPages, currentPage + 2);

        for (var p = startP; p <= endP; p++) {
          (function(page) {
            var btn = document.createElement('button');
            btn.className = 'page-btn' + (page === currentPage ? ' active' : '');
            btn.innerText = page.toLocaleString('ar-EG');
            btn.onclick = function() { currentPage = page; renderPage(); window.scrollTo({top: 400, behavior:'smooth'}); };
            pagination.appendChild(btn);
          })(p);
        }

        var nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerText = 'التالي ←';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = function() { if (currentPage < totalPages) { currentPage++; renderPage(); window.scrollTo({top: 400, behavior:'smooth'}); } };
        pagination.appendChild(nextBtn);
      }

      // تحميل النص الكامل للصيغة من Chunks عند الطلب
      function openFormModal(f) {
        activeFormId = f.id;
        modalTitle.innerText = f.title;
        modalIcon.innerText = f.icon || '📜';
        modalBody.innerText = 'جاري جلب النص الكامل للصيغة... ⏳';
        modal.classList.add('open');

        var numId = parseInt(f.id.replace('form-', ''), 10);
        var chunkIdx = Math.floor((numId - 1) / 100);

        if (chunksCache[chunkIdx]) {
          displayChunkText(chunkIdx, f.id, f.preview);
        } else {
          fetch('/data/forms-chunks/chunk-' + chunkIdx + '.json')
            .then(function(r) { return r.json(); })
            .then(function(chunk) {
              chunksCache[chunkIdx] = chunk;
              displayChunkText(chunkIdx, f.id, f.preview);
            })
            .catch(function(e) {
              modalBody.innerText = f.preview || 'تعذر تحميل النص الكامل.';
            });
        }
      }

      function displayChunkText(chunkIdx, id, fallbackPreview) {
        var item = chunksCache[chunkIdx] && chunksCache[chunkIdx][id];
        if (item && item.fullText && item.fullText.trim()) {
          modalBody.innerText = item.fullText;
        } else {
          modalBody.innerText = fallbackPreview || 'نص الصيغة متاح في الأرشيف.';
        }
      }

      document.getElementById('modalCloseBtn').onclick = function() { modal.classList.remove('open'); };
      modal.onclick = function(e) { if (e.target === modal) modal.classList.remove('open'); };

      // نسخ النص
      document.getElementById('btnCopyForm').onclick = function() {
        var text = modalBody.innerText;
        navigator.clipboard.writeText(text).then(function() {
          var btn = document.getElementById('btnCopyForm');
          var old = btn.innerHTML;
          btn.innerHTML = '✅ تم النسخ بنجاح!';
          setTimeout(function() { btn.innerHTML = old; }, 2000);
        });
      };

      // تنزيل كملف Word
      document.getElementById('btnDownloadWord').onclick = function() {
        var text = modalBody.innerText;
        var title = modalTitle.innerText;
        var htmlContent = '<html><head><meta charset="utf-8"><title>' + title + '</title></head><body style="font-family:Arial, sans-serif; direction:rtl; text-align:right;"><h2>' + title + '</h2><hr/><pre style="white-space:pre-wrap; font-family:Arial, sans-serif;">' + text + '</pre></body></html>';
        var blob = new Blob(['\\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = title.replace(/[^\\w\\s\\u0600-\\u06FF-]/g, '') + '.doc';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      // طباعة
      document.getElementById('btnPrintForm').onclick = function() {
        var w = window.open('', '_blank');
        w.document.write('<html><head><title>' + modalTitle.innerText + '</title><style>body{font-family:Arial,sans-serif;direction:rtl;padding:30px;line-height:2;} h2{border-bottom:2px solid #000;padding-bottom:10px;}</style></head><body><h2>' + modalTitle.innerText + '</h2><p style="white-space:pre-wrap;">' + modalBody.innerText + '</p></body></html>');
        w.document.close();
        w.print();
      };

    })();
  </script>
</body>
</html>`;
}

fs.writeFileSync(FORMS_HTML_FILE, buildInteractiveFormsHtml(), 'utf8');
console.log(`✅ تم تحديث صفحة صيغ العقود والدعاوى بنجاح: ${FORMS_HTML_FILE}`);

// ── توليد صفحة المكتبة القانونية الشاملة التفاعلية ──
function buildInteractiveLegalLibraryHtml() {
  const branches = catalog.branches || [];

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>المكتبة القانونية الشاملة (+10,300 كتاب ومرجع وصيغة قانونية) | منصة المحامي الرقمية</title>
  <meta name="description" content="أضخم مكتبة قانونية مصرية مجانية: موسوعة الوسيط للسنهوري، مراجع الفقه الجنائي والمدني والإداري، موسوعات التنفيذ الجبري لمليجي، أحكام ومبادئ محكمة النقض، وأكثر من 10,300 كتاب ومرجع متاح للقراءة والتحميل المباشر مجاناً." />
  <meta name="keywords" content="المكتبة القانونية, السنهوري, الوسيط في شرح القانون المدني, احمد مليجي, المرصفاوي, رؤوف عبيد, احكام النقض, كتب قانونية, مراجع قانونية, تحميل كتب قانون, قانون مدني, قانون جنائي, مجلس الدولة, صيغ عقود" />
  <meta name="author" content="منصة المحامي الرقمية" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="https://mohamidigital.online/legal-library.html" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="المكتبة القانونية الشاملة (+10,300 كتاب ومرجع وصيغة قانونية)" />
  <meta property="og:description" content="موسوعات الفقه والقضاء والقوانين المصرية متاحة للقراءة والتحميل المباشر مجاناً 100%." />
  <meta property="og:url" content="https://mohamidigital.online/legal-library.html" />
  <meta property="og:site_name" content="منصة المحامي الرقمية" />
  <meta property="og:locale" content="ar_EG" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
  <link rel="stylesheet" href="/header.css?v=20260814-v5">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"منصة المحامي الرقمية","url":"https://mohamidigital.online","logo":"https://mohamidigital.online/logo.png"}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","name":"المكتبة القانونية المصرية الشاملة","url":"https://mohamidigital.online/legal-library.html","inLanguage":"ar-EG"}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"https://mohamidigital.online"},{"@type":"ListItem","position":2,"name":"المكتبة القانونية","item":"https://mohamidigital.online/legal-library.html"}]}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f172a;
      --border: rgba(148,163,184,0.12);
      --indigo: #6366f1;
      --purple: #7c3aed;
      --emerald: #10b981;
      --cyan: #06b6d4;
      --rose: #f43f5e;
      --amber: #f59e0b;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --card-bg: rgba(15,23,42,0.7);
    }
    html { scroll-behavior: smooth; scroll-padding-top: 90px; }
    body { font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif; background-color: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.8; background-image: radial-gradient(ellipse at 25% 0%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse at 85% 70%, rgba(6,182,212,0.12) 0%, transparent 50%); }
    
    .breadcrumbs { max-width: 1200px; margin: 0 auto; padding: 14px 24px 0; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .breadcrumbs a { color: var(--muted); text-decoration: none; transition: color 0.2s; font-weight: 700; }
    .breadcrumbs a:hover { color: var(--indigo); }
    .breadcrumbs .current { color: var(--text); font-weight: 800; }
    .breadcrumbs .sep { color: var(--muted); opacity: 0.4; font-size: 10px; }

    .hero { max-width: 900px; margin: 0 auto; padding: 50px 24px 24px; text-align: center; }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 999px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); color: #a5b4fc; font-size: 11px; font-weight: 800; margin-bottom: 20px; }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 900; line-height: 1.25; margin-bottom: 16px; background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 50%, #67e8f9 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 16px; color: var(--muted); max-width: 680px; margin: 0 auto; font-weight: 600; line-height: 1.8; }
    
    .hero-stats { display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; margin-top: 24px; }
    .stat-pill { background: var(--card-bg); border: 1px solid var(--border); padding: 8px 18px; border-radius: 14px; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 800; color: #fff; }
    .stat-pill .num { color: #a5b4fc; font-size: 17px; font-weight: 900; }

    .section-container { max-width: 1200px; margin: 0 auto; padding: 0 24px 60px; }
    .sec-head { margin-bottom: 26px; }
    .sec-title { font-size: 22px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .sec-sub { font-size: 13.5px; color: var(--muted); }

    /* Branches Grid */
    .branches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 48px; }
    .branch-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 18px; padding: 20px; transition: all 0.25s; cursor: pointer; text-decoration: none; display: flex; flex-direction: column; }
    .branch-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.5); box-shadow: 0 16px 36px rgba(0,0,0,0.35); }
    .branch-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.12); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 12px; }
    .branch-card h3 { font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 6px; }
    .branch-meta { font-size: 11.5px; color: var(--muted); font-weight: 700; margin-top: auto; display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px dashed var(--border); }

    /* Search & Explorer */
    .search-wrapper { background: var(--card-bg); border: 1px solid rgba(99,102,241,0.3); border-radius: 18px; padding: 6px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin-bottom: 24px; }
    .search-wrapper:focus-within { border-color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
    .search-wrapper input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: 15px; color: #fff; padding: 12px 4px; }
    .search-wrapper input::placeholder { color: var(--muted); }
    .search-btn { background: linear-gradient(135deg, var(--indigo), var(--purple)); color: #fff; border: none; padding: 10px 24px; border-radius: 12px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }

    .filter-pills { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 24px; scrollbar-width: thin; }
    .filter-btn { background: var(--card-bg); border: 1px solid var(--border); color: var(--muted); padding: 7px 16px; border-radius: 12px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
    .filter-btn:hover, .filter-btn.active { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.5); color: #fff; }

    .books-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 18px; }
    .book-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; transition: all 0.25s; position: relative; }
    .book-card:hover { transform: translateY(-4px); border-color: rgba(6,182,212,0.4); box-shadow: 0 16px 36px rgba(0,0,0,0.35); }
    .book-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .book-badge { font-size: 11px; font-weight: 800; color: #a5b4fc; background: rgba(99,102,241,0.12); padding: 3px 10px; border-radius: 999px; }
    .book-card h3 { font-size: 15px; font-weight: 800; color: #fff; line-height: 1.5; margin-bottom: 8px; }
    .book-author { font-size: 12px; color: #67e8f9; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .book-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--border); padding-top: 12px; margin-top: auto; }
    .book-size { font-size: 11px; color: var(--muted); font-weight: 700; }
    .book-actions { display: flex; gap: 8px; }
    .btn-book-action { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #fff; padding: 5px 12px; border-radius: 8px; font-family: inherit; font-size: 11.5px; font-weight: 800; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s; }
    .btn-book-action:hover { background: var(--indigo); }

    /* Viewer Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 9999; display: none; align-items: center; justify-content: center; padding: 20px; }
    .modal-overlay.open { display: flex; }
    .modal-box { background: #0f172a; border: 1px solid rgba(99,102,241,0.3); border-radius: 24px; width: 100%; max-width: 900px; height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.6); overflow: hidden; }
    .modal-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    .modal-title { font-size: 17px; font-weight: 900; color: #fff; }
    .modal-close { background: rgba(255,255,255,0.08); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 15px; }
    .modal-body { flex: 1; padding: 20px; overflow: hidden; display: flex; flex-direction: column; }
    .viewer-frame { width: 100%; height: 100%; border: none; border-radius: 12px; background: #1e293b; }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 40px; }
    .page-btn { background: var(--card-bg); border: 1px solid var(--border); color: #fff; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 700; }
    .page-btn.active, .page-btn:hover { background: var(--indigo); border-color: var(--indigo); }
    .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .ad-slot { margin: 28px auto; max-width: 100%; text-align: center; min-height: 90px; }
    .ad-label { display: block; font-size: 10px; color: var(--muted); text-align: center; margin-bottom: 6px; letter-spacing: 0.5px; font-weight: 700; }

    footer { border-top: 1px solid var(--border); background: rgba(15,23,42,0.95); padding: 56px 24px 32px; }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 36px; }
    .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .footer-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .footer-logo-name { font-size: 15px; font-weight: 900; color: #fff; }
    .footer-desc { font-size: 12px; color: var(--muted); line-height: 1.8; max-width: 280px; }
    .footer-col h4 { font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 14px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
    .footer-col ul a { font-size: 12px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .footer-col ul a:hover { color: var(--indigo); }
    .footer-bottom { border-top: 1px solid rgba(148,163,184,0.08); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(148,163,184,0.5); }
    @media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr; gap: 28px; } }
  </style>
</head>
<body>
  ${require('../seo/unified-header.cjs').headerMarkup('lib')}
  <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span class="sep">›</span><span class="current">المكتبة القانونية</span></nav>

  <div class="hero">
    <div class="badge">📚 أضخم مكتبة قانونية مصرية مجانية 100%</div>
    <h1>المكتبة القانونية وموسوعات الفقه والقضاء</h1>
    <p>أكثر من 10,300 كتاب ومرجع فقهي ومذكرات وأحكام نقض وصيغ دعاوى — متاح للبحث والتصفح والتحميل المباشر مجاناً.</p>
    <div class="hero-stats">
      <div class="stat-pill"><span class="num">${catalog.totalItems.toLocaleString('ar-EG')}</span> كتاب ومرجع</div>
      <div class="stat-pill"><span class="num">${catalog.branches.length}</span> فروع تخصصية</div>
      <div class="stat-pill"><span class="num">${catalog.totalSizeFormatted}</span> حجم المكتبة</div>
    </div>
  </div>

  <div class="section-container">
    <div class="sec-head">
      <div class="sec-title">🏛️ فروع وأقسام المكتبة القانونية</div>
      <div class="sec-sub">اختر أي فرع لتصفح كتبه وأبحاثه ومذكراته المتخصصة</div>
    </div>
    <div class="branches-grid">
      ${branches.map(b => `
        <div class="branch-card" onclick="filterByBranch('${b.id}')">
          <div class="branch-icon">${b.icon}</div>
          <h3>${b.name}</h3>
          <div class="branch-meta">
            <span>${b.count.toLocaleString('ar-EG')} مرجع</span>
            <span style="color:#67e8f9">تصفح ←</span>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- TOP AD -->
    <div class="ad-slot" role="complementary" aria-label="إعلان">
      <span class="ad-label">إعلان</span>
      <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-7725405859334364" data-ad-slot="2168039898" data-ad-format="auto" data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>

    <div class="sec-head" style="margin-top:40px;">
      <div class="sec-title">🔍 محرك البحث الفوري في المراجع والكتب</div>
      <div class="sec-sub">ابحث في أكثر من ${catalog.totalItems.toLocaleString('ar-EG')} مرجع وموسوعة بالاسم أو المؤلف أو الموضوع</div>
    </div>

    <div class="search-wrapper">
      <span style="font-size:18px">🔍</span>
      <input type="text" id="libSearchInput" placeholder="ابحث عن كتاب، مؤلف (السنهوري، مليجي، المرصفاوي، عبيد)، أو فرع قانوني..." />
      <button class="search-btn" id="libSearchBtn">بحث فوري</button>
    </div>

    <div class="filter-pills" id="branchFilterPills">
      <button class="filter-btn active" data-bid="all">🌟 جميع المراجع (${catalog.totalItems.toLocaleString('ar-EG')})</button>
      ${branches.map(b => `<button class="filter-btn" data-bid="${b.id}">${b.icon} ${b.name} (${b.count})</button>`).join('')}
    </div>

    <div class="books-grid" id="booksGridContainer"></div>
    <div class="pagination" id="libPaginationContainer"></div>
  </div>

  <!-- Viewer Modal -->
  <div class="modal-overlay" id="bookModal">
    <div class="modal-box">
      <div class="modal-header">
        <div class="modal-title" id="modalBookTitle">قراءة المرجع</div>
        <button class="modal-close" id="modalBookClose">✕</button>
      </div>
      <div class="modal-body">
        <div id="viewerPlaceholder" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; color:var(--muted); gap:16px;">
          <span style="font-size:48px;">📖</span>
          <h3 style="color:#fff;" id="modalBookHead">عنوان الكتاب</h3>
          <p id="modalBookDesc">هذا المرجع متاح للتحميل المباشر بصيغة PDF أو Word.</p>
          <a id="btnModalDirectDownload" href="#" class="btn-action btn-download" style="padding:12px 28px; font-size:14px;">📥 بدء التحميل المباشر</a>
        </div>
      </div>
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
        </div>
        <div class="footer-col">
          <h4>أقسام المنصة</h4>
          <ul>
            <li><a href="/">الرئيسية</a></li>
            <li><a href="/legal-forms.html">صيغ العقود والدعاوى</a></li>
            <li><a href="/pillars/">المراجع الشاملة</a></li>
            <li><a href="/blog/">المدونة القانونية</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>السياسات والدعم</h4>
          <ul>
            <li><a href="/privacy.html">سياسة الخصوصية</a></li>
            <li><a href="/terms.html">شروط الاستخدام</a></li>
            <li><a href="/contact.html">تواصل معنا</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 منصة المحامي الرقمية — جميع الحقوق محفوظة</span>
        <span>مكتبة قانونية علمية مجانية لخدمة المحامين والباحثين</span>
      </div>
    </div>
  </footer>

  <script>
    var allBooks = [];
    var filteredBooks = [];
    var currentBranch = 'all';
    var currentPage = 1;
    var pageSize = 24;

    var grid = document.getElementById('booksGridContainer');
    var pagination = document.getElementById('libPaginationContainer');
    var searchInput = document.getElementById('libSearchInput');
    var modal = document.getElementById('bookModal');
    var modalBookTitle = document.getElementById('modalBookTitle');
    var modalBookHead = document.getElementById('modalBookHead');
    var btnDownload = document.getElementById('btnModalDirectDownload');

    fetch('/data/legal-catalog.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        allBooks = data.items || [];
        filteredBooks = allBooks;
        renderBooks();
      })
      .catch(function(e) { console.error('Error loading library catalog:', e); });

    function filterByBranch(bid) {
      currentBranch = bid;
      document.querySelectorAll('.filter-btn').forEach(function(b) {
        if (b.getAttribute('data-bid') === bid) b.classList.add('active');
        else b.classList.remove('active');
      });
      applyFilters();
      window.scrollTo({ top: document.querySelector('.search-wrapper').offsetTop - 100, behavior: 'smooth' });
    }

    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.onclick = function() {
        document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentBranch = btn.getAttribute('data-bid');
        applyFilters();
      };
    });

    function applyFilters() {
      var q = (searchInput.value || '').trim().toLowerCase();
      filteredBooks = allBooks.filter(function(b) {
        var matchBranch = (currentBranch === 'all' || b.branchId === currentBranch);
        var matchQuery = !q || b.title.toLowerCase().includes(q) || (b.author && b.author.toLowerCase().includes(q));
        return matchBranch && matchQuery;
      });
      currentPage = 1;
      renderBooks();
    }

    searchInput.addEventListener('input', applyFilters);
    document.getElementById('libSearchBtn').addEventListener('click', applyFilters);

    function renderBooks() {
      grid.innerHTML = '';
      var start = (currentPage - 1) * pageSize;
      var pageItems = filteredBooks.slice(start, start + pageSize);

      if (pageItems.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 50px 20px; color: var(--muted); font-size:16px;">لم يتم العثور على مراجع مطابقة لبحثك. جرب كلمات بحث أخرى.</div>';
        pagination.innerHTML = '';
        return;
      }

      pageItems.forEach(function(b) {
        var card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = 
          '<div class="book-top">' +
            '<span class="book-badge">' + b.branchName + '</span>' +
            '<span style="font-size:11px; font-weight:800; color:' + (b.isPdf ? '#ef4444' : '#3b82f6') + '">' + (b.ext.toUpperCase()) + '</span>' +
          '</div>' +
          '<h3>' + b.title + '</h3>' +
          '<div class="book-author">✍️ ' + b.author + '</div>' +
          '<div class="book-footer">' +
            '<span class="book-size">📦 ' + b.sizeFormatted + '</span>' +
            '<div class="book-actions">' +
              '<button class="btn-book-action" onclick="openBookModal(\\'' + encodeURIComponent(JSON.stringify(b)) + '\\')">👁️ تفاصيل / تحميل</button>' +
            '</div>' +
          '</div>';
        grid.appendChild(card);
      });

      renderPagination();
    }

    function renderPagination() {
      pagination.innerHTML = '';
      var totalPages = Math.ceil(filteredBooks.length / pageSize);
      if (totalPages <= 1) return;

      var prevBtn = document.createElement('button');
      prevBtn.className = 'page-btn';
      prevBtn.innerText = '→ السابق';
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = function() { if (currentPage > 1) { currentPage--; renderBooks(); window.scrollTo({top: 800, behavior:'smooth'}); } };
      pagination.appendChild(prevBtn);

      var startP = Math.max(1, currentPage - 2);
      var endP = Math.min(totalPages, currentPage + 2);

      for (var p = startP; p <= endP; p++) {
        (function(page) {
          var btn = document.createElement('button');
          btn.className = 'page-btn' + (page === currentPage ? ' active' : '');
          btn.innerText = page.toLocaleString('ar-EG');
          btn.onclick = function() { currentPage = page; renderBooks(); window.scrollTo({top: 800, behavior:'smooth'}); };
          pagination.appendChild(btn);
        })(p);
      }

      var nextBtn = document.createElement('button');
      nextBtn.className = 'page-btn';
      nextBtn.innerText = 'التالي ←';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = function() { if (currentPage < totalPages) { currentPage++; renderBooks(); window.scrollTo({top: 800, behavior:'smooth'}); } };
      pagination.appendChild(nextBtn);
    }

    window.openBookModal = function(bookJsonStr) {
      try {
        var b = JSON.parse(decodeURIComponent(bookJsonStr));
        modalBookTitle.innerText = b.title;
        modalBookHead.innerText = b.title;
        var desc = document.getElementById('modalBookDesc');
        var viewerBox = document.getElementById('viewerPlaceholder');

        if (b.downloadUrl) {
          desc.innerHTML = '<strong>المؤلف:</strong> ' + b.author + ' | <strong>الفرع:</strong> ' + b.branchName + ' | <strong>الحجم:</strong> ' + b.sizeFormatted + '<br/><span style="color:#6ee7b7; font-weight:800;">✅ متاح للقراءة والتحميل المباشر مجاناً 100%</span>';
          btnDownload.href = b.downloadUrl;
          btnDownload.setAttribute('download', b.title + '.' + b.ext);
          btnDownload.style.display = 'inline-flex';
          btnDownload.innerHTML = '📥 بدء تحميل الكتاب (' + b.sizeFormatted + ')';

          // تضمين عارض PDF التفاعلي
          viewerBox.innerHTML = 
            '<div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:10px; flex-wrap:wrap;">' +
              '<span style="font-size:14px; font-weight:800; color:#fff;">📖 ' + b.title + '</span>' +
              '<a href="' + b.downloadUrl + '" download class="btn-action btn-download" style="padding:6px 16px; font-size:12px;">📥 تحميل مباشر (' + b.sizeFormatted + ')</a>' +
            '</div>' +
            '<iframe src="' + b.downloadUrl + '#toolbar=1" style="width:100%; height:68vh; border:1px solid var(--border); border-radius:14px; background:#1e293b;"></iframe>';
        } else {
          desc.innerHTML = '<strong>المؤلف:</strong> ' + b.author + ' | <strong>الفرع:</strong> ' + b.branchName + ' | <strong>الحجم:</strong> ' + b.sizeFormatted + ' (' + b.ext.toUpperCase() + ')<br/><span style="color:#a5b4fc; font-weight:700;">📂 هذا المرجع مفهرس ومتاح بالكامل على تطبيق الديسكتوب المحلي أو بطلب نسخة رقمية فورية.</span>';
          btnDownload.href = 'mailto:ahmdmansoor222@gmail.com?subject=طلب مرجع: ' + encodeURIComponent(b.title);
          btnDownload.removeAttribute('download');
          btnDownload.style.display = 'inline-flex';
          btnDownload.innerHTML = '📩 طلب تحميل هذا المرجع عبر البريد';

          viewerBox.innerHTML = 
            '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; color:var(--muted); gap:16px; padding:40px 20px;">' +
              '<span style="font-size:54px;">📚</span>' +
              '<h3 style="color:#fff; font-size:18px;">' + b.title + '</h3>' +
              '<p style="max-width:550px; line-height:1.8; font-size:14px;">' + desc.innerHTML + '</p>' +
              '<div style="display:flex; gap:12px; margin-top:10px; flex-wrap:wrap; justify-content:center;">' +
                '<a href="mailto:ahmdmansoor222@gmail.com?subject=طلب مرجع: ' + encodeURIComponent(b.title) + '" class="btn-action btn-copy" style="padding:10px 22px;">📩 إرسال طلب نسخة رقمية</a>' +
                '<a href="/" class="btn-action btn-print" style="padding:10px 22px;">💻 فتح في تطبيق الديسكتوب</a>' +
              '</div>' +
            '</div>';
        }

        modal.classList.add('open');
      } catch(e) {
        console.error('Modal error:', e);
      }
    };

    document.getElementById('modalBookClose').onclick = function() { modal.classList.remove('open'); };
    modal.onclick = function(e) { if (e.target === modal) modal.classList.remove('open'); };
  </script>
</body>
</html>`;
}

fs.writeFileSync(LIB_HTML_FILE, buildInteractiveLegalLibraryHtml(), 'utf8');
console.log(`✅ تم تحديث صفحة المكتبة القانونية بنجاح: ${LIB_HTML_FILE}`);

