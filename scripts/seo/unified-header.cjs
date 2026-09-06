/**
 * unified-header.cjs — الشريط العلوي الزجاجي الموحّد 2026 لمنصة المحامي الرقمية
 * يُستورد من مولدات الصفحات (radar / pillar / legal-forms / legal-library / sitemap / blog)
 * التصميم في public/header.css (كلاسات .uh-*).
 */
const ACTIVE = ' active';
const VERSION = '20260906-luxury-navy-v3';
const HEADER_CSS = `<link rel="stylesheet" href="/header.css?v=${VERSION}">`;

function navItem(href, label, isActive) {
  return `<a href="${href}" class="uh-link${isActive ? ACTIVE : ''}">${label}</a>`;
}
function moreItem(href, label, isActive) {
  return `<a href="${href}" class="uh-menu-item${isActive ? ACTIVE : ''}">${label}</a>`;
}

/**
 * activeKey: home | download | consultations | real-estate | library | generator | calc | calculators | blog | precedents | pillars | forms | radar | privacy | contact
 */
function headerMarkup(activeKey, opts = {}) {
  const A = (k) => (k === activeKey);

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
        ${navItem('/download.html', '💻 تحميل البرنامج', A('download'))}
        ${navItem('/legal-consultations.html', '🤖 المستشار الذكي', A('consultations'))}
        ${navItem('/real-estate.html', '🏢 التسويق العقاري', A('real-estate'))}
        ${navItem('/legal-library.html', '📚 المكتبة الكبرى', A('library'))}
        ${navItem('/contract-generator.html', '⚡ صانع العقود', A('generator'))}
        ${navItem('/legal-calculators.html', '🧮 الحاسبات', A('calc') || A('calculators'))}
        ${navItem('/blog/', '📰 المدونة', A('blog'))}
        <div class="uh-more" id="uhMore">
          <button class="uh-more-btn" type="button" aria-expanded="false" aria-haspopup="true">
            <span>المزيد</span><span class="uh-caret">▾</span>
          </button>
          <div class="uh-menu">
            ${moreItem('/court-precedents.html', '⚖️ موسوعة النقض', A('precedents'))}
            ${moreItem('/pillars/', '🏛️ المراجع والأكواد التشريعية', A('pillars'))}
            ${moreItem('/legal-forms.html', '📝 صيغ العقود والدعاوي', A('forms'))}
            ${moreItem('/saudi-legal-hub.html', '🇸🇦 بوابة السعودية والعمل', A('saudi'))}
            ${moreItem('/uae-legal-hub.html', '🇦🇪 بوابة الإمارات والتحكيم', A('uae'))}
            ${moreItem('/kuwait-legal-hub.html', '🇰🇼 بوابة الكويت والتركات', A('kuwait'))}
            ${moreItem('/qatar-legal-hub.html', '🇶🇦 بوابة قطر للعدالة', A('qatar'))}
            ${moreItem('/oman-legal-hub.html', '🇴🇲 بوابة سلطنة عُمان', A('oman'))}
            ${moreItem('/bahrain-legal-hub.html', '🇧🇭 بوابة مملكة البحرين', A('bahrain'))}
            ${moreItem('/citizen-complaints.html', '📢 شكاوى وبلاغات المواطنين', A('complaints'))}
            ${moreItem('/lawyers-directory.html', '👨‍⚖️ دليل المحامين المعتمدين', A('lawyers'))}
            ${moreItem('/company-incorporation.html', '🏢 تأسيس الشركات والتراخيص', A('companies'))}
            ${moreItem('/courts-directory.html', '🏛️ دليل المحاكم والشهر العقاري', A('courts'))}
            ${moreItem('/legal-radar.html', '🔍 رصد المحامي والجريدة الرسمية', A('radar'))}
            ${moreItem('/privacy.html', '🔐 سياسة الخصوصية والأمان', A('privacy'))}
            ${moreItem('/contact.html', '📬 تواصل معنا', A('contact'))}
          </div>
        </div>
      </nav>

      <div class="uh-actions">
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

      /* محرك التحميل المسبق الذكي فائق السرعة والموفر للشبكة (Debounced 65ms) */
      var prefetchedUrls = new Set();
      var hoverTimer = null;
      function instantPrefetch(url) {
        if (!url || prefetchedUrls.has(url) || url.includes('#') || url.startsWith('javascript:')) return;
        try {
          var u = new URL(url, window.location.origin);
          if (u.origin !== window.location.origin || u.pathname === window.location.pathname) return;
          prefetchedUrls.add(url);
          var prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = url;
          document.head.appendChild(prefetchLink);
        } catch(e){}
      }
      function onLinkEnter(e) {
        var anchor = e.target.closest('a');
        if (anchor && anchor.href) {
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(function(){ instantPrefetch(anchor.href); }, 65);
        }
      }
      function onLinkLeave() {
        clearTimeout(hoverTimer);
      }
      document.addEventListener('mouseover', onLinkEnter, {passive: true});
      document.addEventListener('mouseout', onLinkLeave, {passive: true});
      document.addEventListener('touchstart', onLinkEnter, {passive: true});
    })();
  </script>`;
}

module.exports = { headerMarkup, HEADER_CSS, VERSION };
