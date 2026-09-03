/**
 * mobile-dock.js — شريط التنقل السفلي الذكي للموبايل (Mobile Bottom Dock)
 * يحول تصفح المنصة على الهواتف إلى تجربة تطبيق أصلي فائق السلاسة
 * منصة المحامي الرقمية 2026
 */
(function() {
  'use strict';

  function initMobileDock() {
    if (document.getElementById('siteMobileDock')) return;

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
    document.body.appendChild(dock);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileDock);
  } else {
    initMobileDock();
  }
})();
