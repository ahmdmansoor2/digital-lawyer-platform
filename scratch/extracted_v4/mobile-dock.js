/**
 * mobile-dock.js — شريط التنقل السفلي الذكي للموبايل (Mobile Bottom Dock)
 * يحول تصفح المنصة على الهواتف إلى تجربة تطبيق أصلي فائق السلاسة
 * منصة المحامي الرقمية 2026
 */
(function() {
  'use strict';

  function injectDockStyles() {
    if (document.getElementById('site-mobile-dock-core-style')) return;
    var style = document.createElement('style');
    style.id = 'site-mobile-dock-core-style';
    style.textContent = `
      @media (max-width: 768px) {
        body {
          padding-bottom: 84px !important;
        }
        .site-mobile-dock {
          position: fixed !important;
          bottom: 12px !important;
          left: 12px !important;
          right: 12px !important;
          z-index: 9999999 !important;
          background: rgba(10, 15, 30, 0.94) !important;
          -webkit-backdrop-filter: blur(20px) saturate(1.8) !important;
          backdrop-filter: blur(20px) saturate(1.8) !important;
          border: 1px solid rgba(99, 102, 241, 0.4) !important;
          border-radius: 20px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(99, 102, 241, 0.2) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-around !important;
          padding: 6px 4px !important;
          max-width: 440px !important;
          margin: 0 auto !important;
          direction: rtl !important;
        }
        .site-mobile-dock .dock-item {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          color: #94a3b8 !important;
          text-decoration: none !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          padding: 6px 4px !important;
          border-radius: 12px !important;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          flex: 1 !important;
          text-align: center !important;
          -webkit-tap-highlight-color: transparent !important;
          font-family: 'Cairo', sans-serif !important;
        }
        .site-mobile-dock .dock-item:active {
          transform: scale(0.92) !important;
        }
        .site-mobile-dock .dock-item.active,
        .site-mobile-dock .dock-item:hover {
          color: #ffffff !important;
          background: rgba(99, 102, 241, 0.25) !important;
          border: 1px solid rgba(99, 102, 241, 0.3) !important;
        }
        .site-mobile-dock .dock-item .dock-icon {
          font-size: 19px !important;
          line-height: 1.2 !important;
          margin-bottom: 2px !important;
        }
        .site-mobile-dock .dock-item.active .dock-icon {
          transform: translateY(-1px) !important;
          filter: drop-shadow(0 2px 8px rgba(99, 102, 241, 0.6)) !important;
        }
        .site-mobile-dock .dock-item .dock-label {
          font-size: 10.5px !important;
          letter-spacing: -0.2px !important;
        }
      }
      @media (min-width: 769px) {
        .site-mobile-dock {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function initMobileDock() {
    if (document.getElementById('siteMobileDock')) return;
    injectDockStyles();

    var p = window.location.pathname.toLowerCase();
    var items = [
      { label: 'الرئيسية', icon: '🏠', href: '/', active: p === '/' || p === '/index.html' },
      { label: 'الحاسبات', icon: '🧮', href: '/legal-calculators.html', active: p.includes('calc') || p.includes('real-estate') || p.includes('appeal-deadlines') },
      { label: 'المحاكم', icon: '🏛️', href: '/courts-directory.html', active: p.includes('court') },
      { label: 'الصيغ', icon: '📝', href: '/legal-forms.html', active: p.includes('form') || p.includes('contract') },
      { label: 'المدونة', icon: '📰', href: '/blog/', active: p.includes('blog') || p.includes('radar') }
    ];

    var dock = document.createElement('nav');
    dock.id = 'siteMobileDock';
    dock.className = 'site-mobile-dock no-print';
    dock.setAttribute('role', 'navigation');
    dock.setAttribute('aria-label', 'شريط التنقل السريع للموبايل');

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      html += '<a href="' + it.href + '" class="dock-item' + (it.active ? ' active' : '') + '" title="' + it.label + '">' +
                '<span class="dock-icon">' + it.icon + '</span>' +
                '<span class="dock-label">' + it.label + '</span>' +
              '</a>';
    }

    dock.innerHTML = html;
    if (document.body) {
      document.body.appendChild(dock);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        document.body.appendChild(dock);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileDock);
  } else {
    initMobileDock();
  }
})();
