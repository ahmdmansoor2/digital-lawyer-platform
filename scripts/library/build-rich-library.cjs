#!/usr/bin/env node
/**
 * build-rich-library.cjs — بناء واجهة المكتبة القانونية التفاعلية الفورية مع عارض الكتب المتطور
 * 
 * 1. توليد legal-catalog-summary.json (خفيف وسريع جداً للبحث الفوري).
 * 2. تضمين أمهات الكتب والموسوعات الكبرى مسبقاً في HTML (Pre-rendered) للظهور الفوري دون أي انتظار.
 * 3. تزويد عارض الكتب (Reader Modal) بنظام القراءة المباشرة، التكبير، التحميل، والطباعة.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CATALOG_FILE = path.join(__dirname, '..', '..', 'public', 'data', 'legal-catalog.json');
const SUMMARY_FILE = path.join(__dirname, '..', '..', 'public', 'data', 'legal-catalog-summary.json');
const LIB_HTML_FILE = path.join(__dirname, '..', '..', 'public', 'legal-library.html');

console.log('🚀 بدء بناء واجهة المكتبة القانونية الغنية وتجهيز عارض الكتب...');

const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

// 1. توليد النسخة الخفيفة المضغوطة للفهرس
const summaryItems = catalog.items.map(item => ({
  i: item.id,
  t: item.title,
  a: item.author,
  b: item.branchId,
  bn: item.branchName,
  e: item.ext,
  s: item.sizeFormatted,
  p: item.isPdf ? 1 : 0,
  u: item.downloadUrl || null,
  h: item.hasDirectPdf ? 1 : 0,
  m: item.isMasterBook ? 1 : 0
}));

const summaryData = {
  v: '2.5.0',
  total: catalog.totalItems,
  size: catalog.totalSizeFormatted,
  branches: catalog.branches,
  items: summaryItems
};

fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summaryData), 'utf8');
console.log(`✅ تم حفظ الفهرس الخفيف: ${SUMMARY_FILE} (الحجم: ${(fs.statSync(SUMMARY_FILE).size / 1024).toFixed(1)} KB)`);

// 2. قائمة أمهات الكتب والموسوعات الكبرى المتاحة للقراءة الفورية
const MASTER_ENCLYCLOPEDIAS = [
  {
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الأول (مصادر الالتزام)',
    author: 'د. عبد الرزاق السنهوري',
    branchName: 'القانون المدني والعقود',
    sizeFormatted: '35.3 MB',
    downloadUrl: '/books/sanhouri-waseet-vol-1-sources-of-obligation.pdf',
    badge: '📕 موسوعة الوسيط',
    desc: 'المرجع الفقهي الأكبر في القانون المدني المصري والعربي — العقد، الإرادة المنفردة، العمل غير المشروع، والإثراء بلا سبب.'
  },
  {
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الثاني (الإثبات وآثار الالتزام)',
    author: 'د. عبد الرزاق السنهوري',
    branchName: 'القانون المدني والعقود',
    sizeFormatted: '44.8 MB',
    downloadUrl: '/books/sanhouri-waseet-vol-2-evidence-and-effects.pdf',
    badge: '📕 موسوعة الوسيط',
    desc: 'قواعد الإثبات، التنفيذ العيني، بطريق التعويض، ووسائل ضمان حقوق الدائنين والوفاء بمقابل.'
  },
  {
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الثالث (الأوصاف والحوالة والانقضاء)',
    author: 'د. عبد الرزاق السنهوري',
    branchName: 'القانون المدني والعقود',
    sizeFormatted: '40.6 MB',
    downloadUrl: '/books/sanhouri-waseet-vol-3-assignment-and-extinction.pdf',
    badge: '📕 موسوعة الوسيط',
    desc: 'الشرط والأجل، تعدد محل الالتزام، التضامن، حوالة الحق وحوالة الدين، وانقضاء الالتزام.'
  },
  {
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الرابع (عقود الملكية: البيع والمقايضة)',
    author: 'د. عبد الرزاق السنهوري',
    branchName: 'القانون المدني والعقود',
    sizeFormatted: '25.5 MB',
    downloadUrl: '/books/sanhouri-waseet-vol-4-sale-and-barter-contracts.pdf',
    badge: '📕 موسوعة الوسيط',
    desc: 'أركان عقد البيع، التزامات البائع والمشتري، دعوى الضمان، والمقايضة في التشريع المصري.'
  },
  {
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء السادس (العارية والإيجار)',
    author: 'د. عبد الرزاق السنهوري',
    branchName: 'قانون الإيجارات والملكية',
    sizeFormatted: '34.0 MB',
    downloadUrl: '/books/sanhouri-waseet-vol-6-1-lease-and-loan-for-use.pdf',
    badge: '🏢 موسوعة الإيجارات',
    desc: 'الشرح الشامل لأحكام الإيجار، التزامات المؤجر والمستأجر، انتهاء عقد الإيجار، وعقد العارية.'
  },
  {
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء العاشر (التأمينات العينية والشخصية)',
    author: 'د. عبد الرزاق السنهوري',
    branchName: 'القانون المدني والعقود',
    sizeFormatted: '27.3 MB',
    downloadUrl: '/books/sanhouri-waseet-vol-10-collaterals-and-guarantees.pdf',
    badge: '📕 موسوعة الوسيط',
    desc: 'الرهن الرسمي، حق الاختصاص، الرهن الحيازي، حقوق الامتياز، والكفالة الشخصية.'
  },
  {
    title: 'مبادئ الإجراءات الجنائية في القانون المصري',
    author: 'د. رؤوف عبيد',
    branchName: 'القانون الجنائي والإجراءات',
    sizeFormatted: '18.1 MB',
    downloadUrl: '/books/raouf-obeid-criminal-procedures.pdf',
    badge: '⚖️ الفقه الجنائي',
    desc: 'المرجع الكلاسيكي في شرح الدعوى الجنائية، جمع الاستدلالات، التحقيق الابتدائي، والمحاكمة الجنائية.'
  },
  {
    title: 'أصول قانون الإجراءات الجنائية — الجزء الأول',
    author: 'د. حسن صادق المرصفاوي',
    branchName: 'القانون الجنائي والإجراءات',
    sizeFormatted: '50.2 MB',
    downloadUrl: '/books/marsafawi-criminal-procedures-vol-1.pdf',
    badge: '⚖️ موسوعة المرصفاوي',
    desc: 'شرح متعمق للنظرية العامة للإجراءات الجنائية، البطلان، الضبطية القضائية، وأوامر الحبس الاحتياطي.'
  },
  {
    title: 'الموسوعة الشاملة في التنفيذ الجبري — الجزء الثاني',
    author: 'د. أحمد مليجي',
    branchName: 'المرافعات والتنفيذ الجبري',
    sizeFormatted: '51.0 MB',
    downloadUrl: '/books/meleigy-forced-execution-vol-2.pdf',
    badge: '📑 موسوعة مليجي',
    desc: 'إجراءات الحجز التنفيذي، حجز ما للمدين لدى الغير، بيع المنقولات والعقارات، وإشكالات التنفيذ الوقتية والموضوعية.'
  },
  {
    title: 'قضاء الأمور المستعجلة في القانون المصري',
    author: 'د. علي راتب',
    branchName: 'المرافعات والقضاء المستعجل',
    sizeFormatted: '7.4 MB',
    downloadUrl: '/books/ali-rateb-summary-judiciary.pdf',
    badge: '📑 القضاء المستعجل',
    desc: 'شروط اختصاص قاضي الأمور المستعجلة، عدم المساس بأصل الحق، وتطبيقات الحراسة القضائية ووقف الأعمال الجديدة.'
  },
  {
    title: 'المستحدث من مبادئ دوائر الإيجارات بمحكمة النقض',
    author: 'محكمة النقض المصرية',
    branchName: 'مبادئ وأحكام النقض',
    sizeFormatted: '0.9 MB',
    downloadUrl: '/books/cassation-leases-principles-2013-2014.pdf',
    badge: '🛡️ أحكام النقض',
    desc: 'أحدث المبادئ القضائية المستقرة لدوائر الإيجارات في الامتداد القانوني، الهدم الكلي، والإخلاء لعدم سداد الأجرة.'
  },
  {
    title: 'المستحدث من مبادئ الدوائر الجنائية بمحكمة النقض',
    author: 'محكمة النقض المصرية',
    branchName: 'مبادئ وأحكام النقض',
    sizeFormatted: '3.5 MB',
    downloadUrl: '/books/cassation-criminal-principles-2011-2012.pdf',
    badge: '🛡️ أحكام النقض',
    desc: 'مبادئ الدوائر الجنائية في إجراءات القبض والتفتيش، تسبيب الأحكام، القصد الجنائي، والقصور في التسبيب.'
  }
];

// 3. بناء صفحة الـ HTML المتطورة
function generateLegalLibraryHtml() {
  const branches = catalog.branches || [];

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>المكتبة القانونية الشاملة (+10,300 كتاب وموسوعة فقه وقضاء) | منصة المحامي الرقمية</title>
  <meta name="description" content="أضخم مكتبة قانونية مصرية مجانية: موسوعة الوسيط للسنهوري كاملة، مراجع الفقه الجنائي والمدني لمليجي والمرصفاوي، أحكام النقض، وأكثر من 10,300 كتاب ومرجع متاح للمطالعة والقراءة الفورية والتحميل المباشر مجاناً." />
  <meta name="keywords" content="المكتبة القانونية, السنهوري, الوسيط في شرح القانون المدني, احمد مليجي, المرصفاوي, رؤوف عبيد, احكام النقض, قراءة كتب قانون, تحميل كتب قانونية, قانون مدني, قانون جنائي, مجلس الدولة, صيغ عقود" />
  <meta name="author" content="منصة المحامي الرقمية" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="https://mohamidigital.online/legal-library.html" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="المكتبة القانونية الشاملة (+10,300 كتاب وموسوعة فقه وقضاء)" />
  <meta property="og:description" content="مطالعة وقراءة أمهات الكتب والموسوعات القانونية المصرية أونلاين مع إمكانية التحميل المباشر مجاناً 100%." />
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
      --card-bg: rgba(15,23,42,0.75);
    }
    html { scroll-behavior: smooth; scroll-padding-top: 90px; }
    body { font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif; background-color: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.8; background-image: radial-gradient(ellipse at 25% 0%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse at 85% 70%, rgba(6,182,212,0.12) 0%, transparent 50%); }
    
    .breadcrumbs { max-width: 1200px; margin: 0 auto; padding: 14px 24px 0; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .breadcrumbs a { color: var(--muted); text-decoration: none; transition: color 0.2s; font-weight: 700; }
    .breadcrumbs a:hover { color: var(--indigo); }
    .breadcrumbs .current { color: var(--text); font-weight: 800; }
    .breadcrumbs .sep { color: var(--muted); opacity: 0.4; font-size: 10px; }

    .hero { max-width: 960px; margin: 0 auto; padding: 46px 24px 20px; text-align: center; }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 999px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); color: #a5b4fc; font-size: 11px; font-weight: 800; margin-bottom: 18px; }
    .hero h1 { font-size: clamp(2rem, 4.8vw, 3.1rem); font-weight: 900; line-height: 1.25; margin-bottom: 14px; background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 50%, #67e8f9 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 15.5px; color: var(--muted); max-width: 720px; margin: 0 auto; font-weight: 600; line-height: 1.8; }
    
    .hero-stats { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; margin-top: 22px; }
    .stat-pill { background: var(--card-bg); border: 1px solid var(--border); padding: 8px 16px; border-radius: 14px; display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800; color: #fff; }
    .stat-pill .num { color: #a5b4fc; font-size: 16px; font-weight: 900; }

    .section-container { max-width: 1200px; margin: 0 auto; padding: 0 24px 60px; }
    .sec-head { margin-bottom: 22px; }
    .sec-title { font-size: 21px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .sec-sub { font-size: 13px; color: var(--muted); font-weight: 600; }

    /* Master Showcase Section */
    .master-section { background: linear-gradient(180deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.85) 100%); border: 1px solid rgba(99,102,241,0.25); border-radius: 24px; padding: 30px 24px; margin-bottom: 48px; box-shadow: 0 20px 45px rgba(0,0,0,0.4); }
    .master-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; margin-top: 20px; }
    .master-card { background: rgba(15,23,42,0.9); border: 1px solid rgba(99,102,241,0.35); border-radius: 18px; padding: 22px; display: flex; flex-direction: column; transition: all 0.25s; position: relative; overflow: hidden; }
    .master-card::before { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 3px; background: linear-gradient(90deg, var(--indigo), var(--cyan)); }
    .master-card:hover { transform: translateY(-4px); border-color: #67e8f9; box-shadow: 0 16px 36px rgba(0,0,0,0.5); }
    .master-badge { font-size: 11px; font-weight: 900; color: #6ee7b7; background: rgba(16,185,129,0.15); padding: 4px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 10px; align-self: flex-start; }
    .master-card h3 { font-size: 15.5px; font-weight: 900; color: #fff; line-height: 1.5; margin-bottom: 8px; }
    .master-author { font-size: 12.5px; color: #a5b4fc; font-weight: 800; margin-bottom: 10px; }
    .master-desc { font-size: 12px; color: var(--muted); line-height: 1.7; margin-bottom: 16px; flex: 1; }
    .master-footer { display: flex; gap: 8px; margin-top: auto; }
    .btn-read-now { flex: 1; background: linear-gradient(135deg, var(--indigo), var(--purple)); color: #fff; border: none; padding: 9px 12px; border-radius: 10px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; transition: all 0.2s; }
    .btn-read-now:hover { filter: brightness(1.15); transform: translateY(-1px); }
    .btn-dl-now { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: #fff; padding: 9px 12px; border-radius: 10px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s; }
    .btn-dl-now:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }

    /* Branches Grid */
    .branches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-bottom: 40px; }
    .branch-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 18px; transition: all 0.25s; cursor: pointer; text-decoration: none; display: flex; flex-direction: column; }
    .branch-card:hover { transform: translateY(-3px); border-color: rgba(99,102,241,0.5); box-shadow: 0 14px 30px rgba(0,0,0,0.35); }
    .branch-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(99,102,241,0.12); display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 10px; }
    .branch-card h3 { font-size: 14.5px; font-weight: 800; color: #fff; margin-bottom: 6px; }
    .branch-meta { font-size: 11px; color: var(--muted); font-weight: 700; margin-top: auto; display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px dashed var(--border); }

    /* Search & Explorer */
    .search-wrapper { background: var(--card-bg); border: 1px solid rgba(99,102,241,0.3); border-radius: 18px; padding: 6px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin-bottom: 20px; }
    .search-wrapper:focus-within { border-color: #a5b4fc; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
    .search-wrapper input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: 14.5px; color: #fff; padding: 10px 4px; }
    .search-wrapper input::placeholder { color: var(--muted); }
    .search-btn { background: linear-gradient(135deg, var(--indigo), var(--purple)); color: #fff; border: none; padding: 9px 22px; border-radius: 12px; font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; }

    .filter-pills { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 22px; scrollbar-width: thin; }
    .filter-btn { background: var(--card-bg); border: 1px solid var(--border); color: var(--muted); padding: 6px 14px; border-radius: 10px; font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
    .filter-btn:hover, .filter-btn.active { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.5); color: #fff; }

    .books-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 16px; }
    .book-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; transition: all 0.25s; position: relative; }
    .book-card:hover { transform: translateY(-3px); border-color: rgba(6,182,212,0.4); box-shadow: 0 14px 30px rgba(0,0,0,0.35); }
    .book-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .book-badge { font-size: 10.5px; font-weight: 800; color: #a5b4fc; background: rgba(99,102,241,0.12); padding: 2px 8px; border-radius: 999px; }
    .book-card h3 { font-size: 14.5px; font-weight: 800; color: #fff; line-height: 1.5; margin-bottom: 6px; }
    .book-author { font-size: 11.5px; color: #67e8f9; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .book-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--border); padding-top: 10px; margin-top: auto; }
    .book-size { font-size: 10.5px; color: var(--muted); font-weight: 700; }
    .book-actions { display: flex; gap: 6px; }
    .btn-book-action { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #fff; padding: 4px 10px; border-radius: 8px; font-family: inherit; font-size: 11px; font-weight: 800; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s; }
    .btn-book-action:hover { background: var(--indigo); }

    /* Reader Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); backdrop-filter: blur(10px); z-index: 9999; display: none; align-items: center; justify-content: center; padding: 14px; }
    .modal-overlay.open { display: flex; }
    .modal-box { background: #0f172a; border: 1px solid rgba(99,102,241,0.3); border-radius: 20px; width: 100%; max-width: 1000px; height: 92vh; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.7); overflow: hidden; }
    .modal-header { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: rgba(30,41,59,0.5); }
    .modal-title { font-size: 16px; font-weight: 900; color: #fff; }
    .modal-close { background: rgba(255,255,255,0.08); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 15px; }
    .modal-body { flex: 1; padding: 16px; overflow: hidden; display: flex; flex-direction: column; }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 36px; }
    .page-btn { background: var(--card-bg); border: 1px solid var(--border); color: #fff; padding: 7px 13px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 700; }
    .page-btn.active, .page-btn:hover { background: var(--indigo); border-color: var(--indigo); }
    .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .ad-slot { margin: 24px auto; max-width: 100%; text-align: center; min-height: 90px; }
    .ad-label { display: block; font-size: 10px; color: var(--muted); text-align: center; margin-bottom: 6px; letter-spacing: 0.5px; font-weight: 700; }

    footer { border-top: 1px solid var(--border); background: rgba(15,23,42,0.95); padding: 50px 24px 28px; }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 36px; margin-bottom: 30px; }
    .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .footer-logo-icon { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 15px; }
    .footer-logo-name { font-size: 15px; font-weight: 900; color: #fff; }
    .footer-desc { font-size: 12px; color: var(--muted); line-height: 1.8; max-width: 280px; }
    .footer-col h4 { font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 12px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .footer-col ul a { font-size: 12px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .footer-col ul a:hover { color: var(--indigo); }
    .footer-bottom { border-top: 1px solid rgba(148,163,184,0.08); padding-top: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(148,163,184,0.5); }
    @media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr; gap: 24px; } }
  </style>
</head>
<body>
  ${require('../seo/unified-header.cjs').headerMarkup('lib')}
  <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span class="sep">›</span><span class="current">المكتبة القانونية</span></nav>

  <div class="hero">
    <div class="badge">📚 أضخم مكتبة وموسوعة قانونية مصرية مجانية 100%</div>
    <h1>المكتبة القانونية وموسوعات الفقه والقضاء</h1>
    <p>مطالعة وقراءة أمهات الكتب والموسوعات الفقهية وأحكام النقض مباشرة أونلاين مع إمكانية التحميل الفوري — مجاناً لكافة المحامين والباحثين.</p>
    <div class="hero-stats">
      <div class="stat-pill"><span class="num">${catalog.totalItems.toLocaleString('ar-EG')}</span> كتاب ومرجع</div>
      <div class="stat-pill"><span class="num">${catalog.branches.length}</span> فروع تخصصية</div>
      <div class="stat-pill"><span class="num">${catalog.totalSizeFormatted}</span> حجم المكتبة</div>
    </div>
  </div>

  <div class="section-container">

    <!-- ⭐ قسم أمهات الكتب والموسوعات الكبرى الجاهزة للقراءة الفورية ⭐ -->
    <div class="master-section">
      <div class="sec-head">
        <div class="sec-title">⭐ أمهات الكتب والموسوعات الكبرى — جاهزة للمطالعة والتحميل الفوري</div>
        <div class="sec-sub">تصفح واقرأ موسوعة الوسيط للسنهوري، مراجع المرصفاوي، رؤوف عبيد، مليجي، ومبادئ النقض مباشرة أونلاين</div>
      </div>
      <div class="master-grid">
        ${MASTER_ENCLYCLOPEDIAS.map((b, idx) => `
          <div class="master-card">
            <span class="master-badge">${b.badge}</span>
            <h3>${b.title}</h3>
            <div class="master-author">✍️ ${b.author}</div>
            <p class="master-desc">${b.desc}</p>
            <div class="master-footer">
              <button class="btn-read-now" onclick="openDirectReader('${b.downloadUrl}', '${encodeURIComponent(b.title)}', '${encodeURIComponent(b.author)}', '${b.sizeFormatted}')">📖 قراءة وتصفح الآن</button>
              <a href="${b.downloadUrl}" download="${b.title}.pdf" class="btn-dl-now">📥 تحميل (${b.sizeFormatted})</a>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- الفروع والأقسام -->
    <div class="sec-head">
      <div class="sec-title">🏛️ تصفح المكتبة حسب الفروع القانونية المتخصصة</div>
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

    <!-- محرك البحث الفوري -->
    <div class="sec-head" style="margin-top:36px;">
      <div class="sec-title">🔍 محرك البحث الشامل في المراجع والكتب</div>
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

  <!-- Reader / Viewer Modal -->
  <div class="modal-overlay" id="bookModal">
    <div class="modal-box">
      <div class="modal-header">
        <div class="modal-title" id="modalBookTitle">📖 عارض ومطالعة الكتاب</div>
        <button class="modal-close" id="modalBookClose">✕</button>
      </div>
      <div class="modal-body" id="modalBodyContainer">
        <div id="viewerPlaceholder" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; color:var(--muted); gap:16px;">
          <span style="font-size:48px;">📖</span>
          <h3 style="color:#fff;" id="modalBookHead">عنوان الكتاب</h3>
          <p id="modalBookDesc">جاري تجهيز العارض...</p>
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
    var modalBodyContainer = document.getElementById('modalBodyContainer');

    // ── فتح عارض الكتاب المباشر ──
    window.openDirectReader = function(url, encodedTitle, encodedAuthor, size) {
      var title = decodeURIComponent(encodedTitle);
      var author = decodeURIComponent(encodedAuthor);
      modalBookTitle.innerText = '📖 ' + title;

      modalBodyContainer.innerHTML = 
        '<div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:10px; flex-wrap:wrap;">' +
          '<div>' +
            '<span style="font-size:14px; font-weight:800; color:#fff;">' + title + '</span>' +
            '<span style="font-size:12px; color:#67e8f9; margin-right:10px;">✍️ ' + author + '</span>' +
          '</div>' +
          '<div style="display:flex; gap:8px;">' +
            '<a href="' + url + '" download="' + title + '.pdf" class="btn-read-now" style="padding:6px 14px; font-size:11.5px;">📥 تحميل النسخة الكاملة (' + size + ')</a>' +
            '<button class="btn-dl-now" onclick="toggleFullScreenFrame()" style="padding:6px 12px; font-size:11.5px;">🔍 شاشة كاملة</button>' +
          '</div>' +
        '</div>' +
        '<iframe id="pdfReaderFrame" src="' + url + '#toolbar=1&navpanes=1" style="width:100%; height:75vh; border:1px solid var(--border); border-radius:12px; background:#1e293b;" allowfullscreen></iframe>';

      modal.classList.add('open');
    };

    window.toggleFullScreenFrame = function() {
      var frame = document.getElementById('pdfReaderFrame');
      if (frame) {
        if (frame.requestFullscreen) frame.requestFullscreen();
        else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
      }
    };

    // تحميل الفهرس الخفيف الفوري
    fetch('/data/legal-catalog-summary.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        allBooks = (data.items || []).map(function(item) {
          return {
            id: item.i,
            title: item.t,
            author: item.a,
            branchId: item.b,
            branchName: item.bn,
            ext: item.e,
            sizeFormatted: item.s,
            isPdf: item.p === 1,
            downloadUrl: item.u,
            hasDirectPdf: item.h === 1,
            isMasterBook: item.m === 1
          };
        });
        filteredBooks = allBooks;
        renderBooks();
      })
      .catch(function(e) {
        console.error('Error loading library catalog:', e);
      });

    function filterByBranch(bid) {
      currentBranch = bid;
      document.querySelectorAll('.filter-btn').forEach(function(b) {
        if (b.getAttribute('data-bid') === bid) b.classList.add('active');
        else b.classList.remove('active');
      });
      applyFilters();
      window.scrollTo({ top: document.querySelector('.search-wrapper').offsetTop - 90, behavior: 'smooth' });
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
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px 20px; color: var(--muted); font-size:15px;">لم يتم العثور على مراجع مطابقة لبحثك. جرب كلمات بحث أخرى.</div>';
        pagination.innerHTML = '';
        return;
      }

      pageItems.forEach(function(b) {
        var card = document.createElement('div');
        card.className = 'book-card';
        var actionBtn = b.downloadUrl
          ? '<button class="btn-book-action" style="background:linear-gradient(135deg,var(--indigo),var(--purple));" onclick="openDirectReader(\\'' + b.downloadUrl + '\\', \\'' + encodeURIComponent(b.title) + '\\', \\'' + encodeURIComponent(b.author) + '\\', \\'' + b.sizeFormatted + '\\')">📖 قراءة أونلاين</button>'
          : '<button class="btn-book-action" onclick="openBookInfo(\\'' + encodeURIComponent(JSON.stringify(b)) + '\\')">👁️ تفاصيل المرجع</button>';

        card.innerHTML = 
          '<div class="book-top">' +
            '<span class="book-badge">' + b.branchName + '</span>' +
            '<span style="font-size:11px; font-weight:800; color:' + (b.isPdf ? '#ef4444' : '#3b82f6') + '">' + (b.ext.toUpperCase()) + '</span>' +
          '</div>' +
          '<h3>' + b.title + '</h3>' +
          '<div class="book-author">✍️ ' + b.author + '</div>' +
          '<div class="book-footer">' +
            '<span class="book-size">📦 ' + b.sizeFormatted + '</span>' +
            '<div class="book-actions">' + actionBtn + '</div>' +
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
      prevBtn.onclick = function() { if (currentPage > 1) { currentPage--; renderBooks(); window.scrollTo({top: document.querySelector('.search-wrapper').offsetTop - 90, behavior:'smooth'}); } };
      pagination.appendChild(prevBtn);

      var startP = Math.max(1, currentPage - 2);
      var endP = Math.min(totalPages, currentPage + 2);

      for (var p = startP; p <= endP; p++) {
        (function(page) {
          var btn = document.createElement('button');
          btn.className = 'page-btn' + (page === currentPage ? ' active' : '');
          btn.innerText = page.toLocaleString('ar-EG');
          btn.onclick = function() { currentPage = page; renderBooks(); window.scrollTo({top: document.querySelector('.search-wrapper').offsetTop - 90, behavior:'smooth'}); };
          pagination.appendChild(btn);
        })(p);
      }

      var nextBtn = document.createElement('button');
      nextBtn.className = 'page-btn';
      nextBtn.innerText = 'التالي ←';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = function() { if (currentPage < totalPages) { currentPage++; renderBooks(); window.scrollTo({top: document.querySelector('.search-wrapper').offsetTop - 90, behavior:'smooth'}); } };
      pagination.appendChild(nextBtn);
    }

    window.openBookInfo = function(bookJsonStr) {
      try {
        var b = JSON.parse(decodeURIComponent(bookJsonStr));
        modalBookTitle.innerText = '📚 تفاصيل المرجع: ' + b.title;
        modalBodyContainer.innerHTML = 
          '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; color:var(--muted); gap:16px; padding:30px 20px;">' +
            '<span style="font-size:54px;">📖</span>' +
            '<h3 style="color:#fff; font-size:18px;">' + b.title + '</h3>' +
            '<p style="max-width:550px; line-height:1.8; font-size:14px;"><strong>المؤلف:</strong> ' + b.author + ' | <strong>الفرع:</strong> ' + b.branchName + ' | <strong>الحجم:</strong> ' + b.sizeFormatted + ' (' + b.ext.toUpperCase() + ')<br/><span style="color:#a5b4fc; font-weight:700;">📂 هذا المرجع مفهرس ومتاح بنسخته الكاملة على تطبيق الديسكتوب المحلي أو بطلب نسخة رقمية فورية.</span></p>' +
            '<div style="display:flex; gap:12px; margin-top:10px; flex-wrap:wrap; justify-content:center;">' +
              '<a href="mailto:ahmdmansoor222@gmail.com?subject=طلب مرجع: ' + encodeURIComponent(b.title) + '" class="btn-read-now" style="padding:10px 22px;">📩 إرسال طلب نسخة رقمية عبر البريد</a>' +
              '<a href="/" class="btn-dl-now" style="padding:10px 22px;">💻 فتح في تطبيق الديسكتوب</a>' +
            '</div>' +
          '</div>';
        modal.classList.add('open');
      } catch(e) {}
    };

    document.getElementById('modalBookClose').onclick = function() { modal.classList.remove('open'); };
    modal.onclick = function(e) { if (e.target === modal) modal.classList.remove('open'); };
  </script>
</body>
</html>`;
}

fs.writeFileSync(LIB_HTML_FILE, generateLegalLibraryHtml(), 'utf8');
console.log(`✅ تم إنشاء وتحديث واجهة المكتبة القانونية الغنية بنجاح: ${LIB_HTML_FILE}`);
