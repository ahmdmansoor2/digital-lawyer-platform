/**
 * sidebar.js — Global Glassmorphism Sidebar for static HTML pages & blog
 * High-definition SVG icons, smooth right-coordinate animation (RTL-proof),
 * auto-injected top navbar trigger button, and crisp Cairo typography.
 * @license SPDX-License-Identifier: Apache-2.0
 */
(function () {
  'use strict';

  // Do not initialize if React's root is active on the page
  if (document.getElementById('lawfirm-app-root') || document.getElementById('root')) {
    if (window.__REACT_SIDEBAR_ACTIVE__) return;
  }

  // Prevent duplicate mounts
  if (document.getElementById('gs-trigger') || document.getElementById('gs-drawer')) return;

  var ICONS = {
    compass: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    globe: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    users: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    gavel: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 12.5-8 8a2.12 2.12 0 0 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></svg>',
    book: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    newspaper: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>',
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    extLink: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  };

  var SECTIONS = [
    {
      id: 'gulf',
      title: 'بوابات الدول والخدمات الإقليمية',
      color: '#34d399',
      borderColor: 'rgba(52, 211, 153, 0.3)',
      bg: 'rgba(52, 211, 153, 0.05)',
      iconSvg: ICONS.globe,
      links: [
        { label: 'مصر — المنصة الرئيسية', href: '/', icon: '🇪🇬' },
        { label: 'المملكة العربية السعودية', href: '/saudi-legal-hub.html', icon: '🇸🇦' },
        { label: 'دولة الإمارات العربية المتحدة', href: '/uae-legal-hub.html', icon: '🇦🇪' },
        { label: 'دولة قطر', href: '/qatar-legal-hub.html', icon: '🇶🇦' },
      ],
      open: true,
    },
    {
      id: 'citizens',
      title: 'خدمات واستشارات المواطنين',
      color: '#22d3ee',
      borderColor: 'rgba(34, 211, 238, 0.3)',
      bg: 'rgba(34, 211, 238, 0.05)',
      iconSvg: ICONS.users,
      links: [
        { label: 'الاستشارات القانونية الفورية', href: '/legal-consultations.html', icon: '💬' },
        { label: 'شكاوى وبلاغات المواطنين', href: '/citizen-complaints.html', icon: '📢' },
        { label: 'التقاضي الإلكتروني والخدمات القضائية', href: '/e-justice-services.html', icon: '🏛️' },
        { label: 'تشخيص النزاع القضائي الذكي', href: '/legal-diagnostics.html', icon: '🔍' },
        { label: 'دليل المحاكم والشهر العقاري', href: '/courts-directory.html', icon: '🗺️' },
      ],
      open: false,
    },
    {
      id: 'lawyers',
      title: 'أدوات ومنظومة المحامين',
      color: '#818cf8',
      borderColor: 'rgba(129, 140, 248, 0.3)',
      bg: 'rgba(129, 140, 248, 0.05)',
      iconSvg: ICONS.gavel,
      links: [
        { label: 'دخول نظام إدارة القضايا والمكاتب', href: '/', icon: '🚀' },
        { label: 'دليل وتسجيل المحامين', href: '/lawyers-directory.html', icon: '👨‍⚖️' },
        { label: 'موسوعة صيغ العقود والدعاوى', href: '/legal-forms.html', icon: '📝' },
        { label: 'بوابة الحاسبات القانونية', href: '/legal-calculators.html', icon: '🧮' },
        { label: 'دليل تأسيس الشركات (GAFI)', href: '/company-incorporation.html', icon: '💼' },
        { label: 'مميزات المنظومة الكاملة', href: '/features.html', icon: '⚡' },
      ],
      open: false,
    },
    {
      id: 'library',
      title: 'الموسوعات والأكواد ومبادئ النقض',
      color: '#a78bfa',
      borderColor: 'rgba(167, 139, 250, 0.3)',
      bg: 'rgba(167, 139, 250, 0.05)',
      iconSvg: ICONS.book,
      links: [
        { label: 'بنك مبادئ محكمة النقض الكبرى', href: '/court-precedents.html', icon: '⚖️' },
        { label: 'المراجع والأكواد التشريعية الشاملة', href: '/pillars/', icon: '📚' },
        { label: 'رصد المحامي والجريدة الرسمية', href: '/legal-radar.html', icon: '📡' },
      ],
      open: false,
    },
    {
      id: 'blog',
      title: 'المدونة والتعريف بالمنصة',
      color: '#f472b6',
      borderColor: 'rgba(244, 114, 182, 0.3)',
      bg: 'rgba(244, 114, 182, 0.05)',
      iconSvg: ICONS.newspaper,
      links: [
        { label: 'المدونة القانونية (+140 مقال)', href: '/blog/', icon: '📰' },
        { label: 'الميزات والتعريف بالمنصة', href: '/features.html', icon: '🎬' },
        { label: 'سياسة الخصوصية والتواصل', href: '/privacy.html', icon: '🛡️' },
      ],
      open: false,
    },
  ];

  var isOpen = false;
  var openState = {};
  SECTIONS.forEach(function (s) { openState[s.id] = s.open; });

  // ── Inject CSS ──
  var style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

    #gs-trigger, #gs-trigger *,
    #gs-drawer, #gs-drawer * {
      box-sizing: border-box !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
    }

    #gs-trigger {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      left: auto !important;
      z-index: 999990 !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 12px 18px !important;
      border-radius: 16px !important;
      background: rgba(15, 23, 42, 0.95) !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      color: #ffffff !important;
      font-size: 13.5px !important;
      font-weight: 800 !important;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7) !important;
      backdrop-filter: blur(24px) !important;
      -webkit-backdrop-filter: blur(24px) !important;
      cursor: pointer !important;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      direction: rtl !important;
      user-select: none !important;
    }
    #gs-trigger:hover {
      background: rgba(30, 41, 59, 0.98) !important;
      border-color: rgba(99, 102, 241, 0.7) !important;
      transform: scale(1.05) !important;
      box-shadow: 0 16px 40px rgba(99, 102, 241, 0.3), 0 12px 36px rgba(0, 0, 0, 0.7) !important;
    }
    #gs-trigger .gs-icon-wrap {
      width: 24px;
      height: 24px;
      border-radius: 8px;
      background: rgba(99, 102, 241, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #818cf8;
      transition: transform 0.3s ease;
    }
    #gs-trigger:hover .gs-icon-wrap {
      transform: rotate(20deg) scale(1.1);
    }

    #gs-backdrop {
      position: fixed !important;
      inset: 0 !important;
      z-index: 999998 !important;
      background: rgba(0, 0, 0, 0.65) !important;
      backdrop-filter: blur(6px) !important;
      -webkit-backdrop-filter: blur(6px) !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.3s ease !important;
    }
    #gs-backdrop.gs-active {
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    #gs-drawer {
      position: fixed !important;
      top: 0 !important;
      right: -380px !important;
      bottom: 0 !important;
      height: 100vh !important;
      width: 330px !important;
      max-width: 85vw !important;
      z-index: 999999 !important;
      background: rgba(2, 6, 23, 0.96) !important;
      backdrop-filter: blur(28px) !important;
      -webkit-backdrop-filter: blur(28px) !important;
      border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
      display: flex !important;
      flex-direction: column !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transition: right 0.32s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.32s, box-shadow 0.32s !important;
      overflow: hidden !important;
      direction: rtl !important;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      user-select: none !important;
    }
    #gs-drawer.gs-active {
      right: 0px !important;
      visibility: visible !important;
      pointer-events: auto !important;
      box-shadow: -12px 0 40px rgba(0, 0, 0, 0.85) !important;
    }

    .gs-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.7);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .gs-header-logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .gs-logo-box {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #9333ea);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
      flex-shrink: 0;
    }
    .gs-logo-title {
      color: #ffffff;
      font-weight: 900;
      font-size: 14px;
      line-height: 1.25;
      margin: 0;
    }
    .gs-logo-sub {
      color: #94a3b8;
      font-size: 10.5px;
      font-weight: 500;
      margin: 0;
    }
    .gs-close {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      transition: all 0.2s;
    }
    .gs-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .gs-body {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
    }

    .gs-section {
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .gs-section-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: right;
      transition: background 0.18s;
      font-family: inherit;
    }
    .gs-section-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .gs-section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .gs-section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .gs-section-title {
      font-size: 12px;
      font-weight: 700;
    }
    .gs-chevron {
      display: flex;
      align-items: center;
      color: #94a3b8;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .gs-chevron.open {
      transform: rotate(180deg);
    }

    .gs-links {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 8px 10px;
    }
    .gs-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
      line-height: 1.4;
    }
    .gs-link:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .gs-link-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    .gs-link-label {
      flex: 1;
    }
    .gs-link-arrow {
      color: #64748b;
      opacity: 0;
      display: flex;
      align-items: center;
      transition: opacity 0.15s, color 0.15s;
    }
    .gs-link:hover .gs-link-arrow {
      opacity: 1;
      color: #818cf8;
    }

    .gs-footer {
      flex-shrink: 0;
      padding: 12px 20px;
      background: rgba(15, 23, 42, 0.4);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      text-align: center;
      color: #64748b;
      font-size: 10px;
      line-height: 1.5;
    }

    @media (max-width: 480px) {
      #gs-drawer { width: 300px !important; }
      #gs-trigger span { display: none; }
      #gs-trigger { padding: 12px !important; border-radius: 50% !important; }
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM ──
  var trigger = document.createElement('button');
  trigger.id = 'gs-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'فتح فهرس المنصة السريع');
  trigger.innerHTML = '<div class="gs-icon-wrap">' + ICONS.compass + '</div><span>فهرس المنصة</span>';

  var backdrop = document.createElement('div');
  backdrop.id = 'gs-backdrop';

  var drawer = document.createElement('aside');
  drawer.id = 'gs-drawer';
  drawer.setAttribute('aria-label', 'الشريط الجانبي للمنصة');

  var header = document.createElement('div');
  header.className = 'gs-header';
  header.innerHTML = `
    <div class="gs-header-logo">
      <div class="gs-logo-box">${ICONS.compass}</div>
      <div>
        <h3 class="gs-logo-title">فهرس المنصة الشامل</h3>
        <p class="gs-logo-sub">منصة المحامي الرقمية 2026</p>
      </div>
    </div>
    <button class="gs-close" id="gs-close-btn" type="button" aria-label="إغلاق الفهرس">${ICONS.close}</button>
  `;

  var body = document.createElement('div');
  body.className = 'gs-body';

  SECTIONS.forEach(function (section) {
    var sectionEl = document.createElement('div');
    sectionEl.className = 'gs-section';
    sectionEl.style.border = '1px solid ' + section.borderColor;
    sectionEl.style.background = section.bg;

    var btn = document.createElement('button');
    btn.className = 'gs-section-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <div class="gs-section-title-wrap">
        <span class="gs-section-icon" style="color:${section.color}">${section.iconSvg}</span>
        <span class="gs-section-title" style="color:${section.color}">${section.title}</span>
      </div>
      <span class="gs-chevron ${openState[section.id] ? 'open' : ''}">${ICONS.chevron}</span>
    `;

    var linksEl = document.createElement('div');
    linksEl.className = 'gs-links';
    linksEl.style.display = openState[section.id] ? 'flex' : 'none';

    section.links.forEach(function (link) {
      var a = document.createElement('a');
      a.className = 'gs-link';
      a.href = link.href;
      a.innerHTML = `
        <span class="gs-link-icon">${link.icon}</span>
        <span class="gs-link-label">${link.label}</span>
        <span class="gs-link-arrow">${ICONS.extLink}</span>
      `;
      a.addEventListener('click', function () { closeDrawer(); });
      linksEl.appendChild(a);
    });

    btn.addEventListener('click', function () {
      openState[section.id] = !openState[section.id];
      var chevron = btn.querySelector('.gs-chevron');
      if (chevron) chevron.classList.toggle('open', openState[section.id]);
      linksEl.style.display = openState[section.id] ? 'flex' : 'none';
    });

    sectionEl.appendChild(btn);
    sectionEl.appendChild(linksEl);
    body.appendChild(sectionEl);
  });

  var footer = document.createElement('div');
  footer.className = 'gs-footer';
  footer.textContent = '© 2026 منصة المحامي الرقمية — mohamidigital.online';

  drawer.appendChild(header);
  drawer.appendChild(body);
  drawer.appendChild(footer);

  function mount() {
    document.body.appendChild(trigger);
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    trigger.addEventListener('click', function () {
      if (isOpen) closeDrawer();
      else openDrawer();
    });

    backdrop.addEventListener('click', closeDrawer);
    var closeBtn = document.getElementById('gs-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeDrawer();
    });

    // ── Global Custom Event Listeners (من الهيدر أو أي زر) ──
    window.addEventListener('toggle-mohami-sidebar', function () {
      if (isOpen) closeDrawer();
      else openDrawer();
    });
    window.addEventListener('open-mohami-sidebar', function () {
      openDrawer();
    });
    window.addEventListener('close-mohami-sidebar', function () {
      closeDrawer();
    });

    // ── Auto-inject Top Navbar Trigger into .uh-actions if missing ──
    var uhActions = document.querySelector('.uh-actions');
    if (uhActions && !uhActions.querySelector('.gs-nav-trigger') && !uhActions.querySelector('[title*="فهرس"]')) {
      var navBtn = document.createElement('button');
      navBtn.type = 'button';
      navBtn.className = 'uh-cta uh-cta--ghost gs-nav-trigger';
      navBtn.style.cssText = 'padding: 7px 12px; font-size: 0.82rem; border-color: rgba(99, 102, 241, 0.4); cursor: pointer; display: inline-flex; align-items: center; gap: 6px;';
      navBtn.title = 'فتح فهرس المنصة الشامل';
      navBtn.innerHTML = '<span>🧭 الفهرس</span>';
      navBtn.addEventListener('click', function () {
        if (isOpen) closeDrawer();
        else openDrawer();
      });
      uhActions.insertBefore(navBtn, uhActions.firstChild);
    }
  }

  function openDrawer() {
    isOpen = true;
    drawer.classList.add('gs-active');
    backdrop.classList.add('gs-active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    isOpen = false;
    drawer.classList.remove('gs-active');
    backdrop.classList.remove('gs-active');
    document.body.style.overflow = '';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
