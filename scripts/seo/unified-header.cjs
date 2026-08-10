/**
 * unified-header.cjs — الشريط العلوي الموحّد لمنصة المحامي الرقمية
 * يُستورد من مولدات الصفحات (radar / pillar / legal-forms / sitemap / blog)
 * حتى تخرج كل الصفحات الجديدة بنفس الشريط العلوي (روابط أساسية + قائمة «المزيد»).
 */
const ACTIVE = ' active';

function navItem(href, label, isActive) {
  return `<a href="${href}" class="nav-item${isActive ? ACTIVE : ''}">${label}</a>`;
}
function moreItem(href, label, isActive) {
  return `<a href="${href}" class="nav-more-item${isActive ? ACTIVE : ''}">${label}</a>`;
}

/**
 * activeKey: home | blog | lib | pillars | forms | radar | about | features |
 *            pricing | trust | privacy | terms | contact | (اختياري)
 */
function headerMarkup(activeKey) {
  const A = (k) => (k === activeKey);
  return `<header class="site-header" id="siteHeader">
    <div class="header-container">
      <a href="/" class="header-logo" aria-label="منصة المحامي الرقمي">
        <div class="logo-badge">⚖️</div>
        <div class="logo-text">
          <span class="brand-title">المحامي الرقمي</span>
          <span class="brand-subtitle">مساعدك القانوني الذكي · مجاناً</span>
        </div>
      </a>

      <nav class="header-nav" id="headerNav" role="navigation" aria-label="القائمة الرئيسية">
        ${navItem('/', '🏠 الرئيسية', A('home'))}
        ${navItem('/blog/', '📰 المدونة القانونية', A('blog'))}
        ${navItem('/legal-library.html', '📚 المكتبة القانونية', A('lib'))}
        ${navItem('/pillars/', '🏛️ المراجع القانونية الشاملة', A('pillars'))}
        ${navItem('/legal-forms.html', '📝 صيغ العقود والدعاوي', A('forms'))}
        ${navItem('/legal-radar.html', '🔍 رصد المحامي', A('radar'))}
        <div class="nav-more">
          <button class="nav-more-btn" type="button" aria-expanded="false" aria-haspopup="true">
            <span>المزيد</span><span class="nav-more-caret">▾</span>
          </button>
          <div class="nav-more-menu">
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

      <div class="header-actions">
        <a href="/" class="header-cta">
          <span>🚀</span>
          <span>ابدأ مجاناً</span>
        </a>
        <button class="header-mobile-toggle" aria-label="فتح القائمة" aria-expanded="false" aria-controls="headerNav"
          onclick="(function(btn){var nav=document.getElementById('headerNav');var isOpen=nav.classList.toggle('active');btn.setAttribute('aria-expanded',isOpen);btn.setAttribute('aria-label',isOpen?'إغلاق القائمة':'فتح القائمة');btn.innerHTML=isOpen?'✕':'☰';})(this)">☰</button>
      </div>
    </div>
  </header>
  <script>
    (function(){
      var hdr=document.getElementById('siteHeader');
      var nav=document.getElementById('headerNav');
      if(hdr)window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>20);},{passive:true});
      var toggle=document.querySelector('.header-mobile-toggle');
      var more=document.querySelector('.nav-more');
      var moreBtn=document.querySelector('.nav-more-btn');
      function closeMobile(){
        if(nav)nav.classList.remove('active');
        if(toggle){toggle.setAttribute('aria-expanded','false');toggle.innerHTML='☰';}
      }
      if(toggle){toggle.addEventListener('click',function(){
        var open=nav.classList.toggle('active');
        toggle.setAttribute('aria-expanded',open);
        toggle.innerHTML=open?'✕':'☰';
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
        if(nav&&nav.classList.contains('active')&&toggle&&!nav.contains(e.target)&&!toggle.contains(e.target)){
          closeMobile();
        }
      });
    })();
  </script>`;
}

const HEADER_CSS = `<link rel="stylesheet" href="/header.css" />`;

module.exports = { headerMarkup, HEADER_CSS };
