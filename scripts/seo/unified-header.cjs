/**
 * unified-header.cjs — الشريط العلوي الزجاجي الموحّد 2026 لمنصة المحامي الرقمية
 * يُستورد من مولدات الصفحات (radar / pillar / legal-forms / legal-library / sitemap / blog)
 * حتى تخرج كل الصفحات الجديدة بنفس الشريط (روابط أساسية + قائمة «المزيد» + CTA).
 * التصميم في public/header.css (كلاسات .uh-*).
 */
const ACTIVE = ' active';
const VERSION = '20260814-v5';
const HEADER_CSS = `<link rel="stylesheet" href="/header.css?v=${VERSION}">`;

function navItem(href, label, isActive) {
  return `<a href="${href}" class="uh-link${isActive ? ACTIVE : ''}">${label}</a>`;
}
function moreItem(href, label, isActive) {
  return `<a href="${href}" class="uh-menu-item${isActive ? ACTIVE : ''}">${label}</a>`;
}

/**
 * activeKey: home | blog | lib | pillars | forms | radar | about | features |
 *            pricing | trust | privacy | terms | contact | (اختياري)
 * opts.ctaHref  : وجهة زر «دخول التطبيق» (افتراضياً '/')
 * opts.hideCta  : إخفاء الزر (لصفحات الدخول مثلاً)
 * opts.ctaLabel : نص الزر (افتراضياً «🚀 دخول التطبيق»)
 */
function headerMarkup(activeKey, opts = {}) {
  const A = (k) => (k === activeKey);
  const ctaHref = opts.ctaHref || '/';
  const ctaLabel = opts.ctaLabel || '🚀 دخول التطبيق';
  const cta = opts.hideCta
    ? ''
    : `<a href="${ctaHref}" class="uh-cta"><span>${ctaLabel}</span></a>`;

  return `<header class="uh-bar" id="siteHeader">
    <div class="uh-inner">
      <a href="/" class="uh-logo" aria-label="منصة المحامي الرقمية">
        <span class="uh-badge">⚖️</span>
        <span class="uh-brand">
          <span class="uh-title">المحامي الرقمي</span>
          <span class="uh-sub">مساعدك القانوني الذكي · مجاناً</span>
        </span>
      </a>

      <nav class="uh-nav" id="headerNav" role="navigation" aria-label="القائمة الرئيسية">
        ${navItem('/', '🏠 الرئيسية', A('home'))}
        ${navItem('/blog/', '📰 المدونة القانونية', A('blog'))}
        ${navItem('/legal-library.html', '📚 المكتبة القانونية', A('lib'))}
        ${navItem('/pillars/', '🏛️ المراجع الشاملة', A('pillars'))}
        ${navItem('/legal-forms.html', '📝 صيغ العقود والدعاوي', A('forms'))}
        ${navItem('/legal-radar.html', '🔍 رصد المحامي', A('radar'))}
        <div class="uh-more" id="uhMore">
          <button class="uh-more-btn" type="button" aria-expanded="false" aria-haspopup="true">
            <span>المزيد</span><span class="uh-caret">▾</span>
          </button>
          <div class="uh-menu">
            ${moreItem('/about.html', '⚖️ عن المنصة', A('about'))}
            ${moreItem('/features.html', '⚡ المميزات الكاملة', A('features'))}
            ${moreItem('/pricing.html', '🎁 الأسعار — مجاني 100%', A('pricing'))}
            ${moreItem('/why-trust-us.html', '🛡️ لماذا تثق بنا', A('trust'))}
            ${moreItem('/privacy.html', '🔐 سياسة الخصوصية', A('privacy'))}
            ${moreItem('/terms.html', '📜 الشروط والأحكام', A('terms'))}
            ${moreItem('/contact.html', '📬 تواصل معنا', A('contact'))}
          </div>
        </div>
      </nav>

      <div class="uh-actions">
        ${cta}
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
  </script>`;
}

module.exports = { headerMarkup, HEADER_CSS, VERSION };
