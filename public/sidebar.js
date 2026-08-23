/**
 * sidebar.js — Global Glassmorphism Sidebar for static HTML pages & blog
 * Vanilla JS, ultra-fast, zero dependencies, high-contrast & crisp Cairo typography.
 * @license SPDX-License-Identifier: Apache-2.0
 */
(function () {
  'use strict';

  // Do not initialize if React's root is on the page to prevent duplicate triggers
  if (document.getElementById('lawfirm-app-root') || document.getElementById('root')) {
    if (window.__REACT_SIDEBAR_ACTIVE__) return;
  }

  // Prevent duplicate mounts
  if (document.getElementById('gs-trigger') || document.getElementById('gs-drawer')) return;

  const SECTIONS = [
    {
      id: 'gulf',
      title: 'بوابات الدول والخدمات الإقليمية',
      color: '#34d399',
      borderColor: 'rgba(52, 211, 153, 0.35)',
      bg: 'rgba(52, 211, 153, 0.06)',
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
      borderColor: 'rgba(34, 211, 238, 0.35)',
      bg: 'rgba(34, 211, 238, 0.06)',
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
      borderColor: 'rgba(129, 140, 248, 0.35)',
      bg: 'rgba(129, 140, 248, 0.06)',
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
      borderColor: 'rgba(167, 139, 250, 0.35)',
      bg: 'rgba(167, 139, 250, 0.06)',
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
      borderColor: 'rgba(244, 114, 182, 0.35)',
      bg: 'rgba(244, 114, 182, 0.06)',
      links: [
        { label: 'المدونة القانونية (+140 مقال)', href: '/blog/', icon: '📰' },
        { label: 'الميزات والتعريف بالمنصة', href: '/features.html', icon: '🎬' },
        { label: 'سياسة الخصوصية والتواصل', href: '/privacy.html', icon: '🛡️' },
      ],
      open: false,
    },
  ];

  let isOpen = false;
  const openState = {};
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
      box-shadow: 0 16px 40px rgba(99, 102, 241, 0.25), 0 12px 36px rgba(0, 0, 0, 0.7) !important;
    }
    #gs-trigger .gs-icon-wrap {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: rgba(99, 102, 241, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      transition: transform 0.3s ease;
    }
    #gs-trigger:hover .gs-icon-wrap {
      transform: rotate(20deg) scale(1.1);
    }

    #gs-backdrop {
      position: fixed !important;
      inset: 0 !important;
      z-index: 999998 !important;
      background: rgba(0, 0, 0, 0.7) !important;
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
      right: 0 !important;
      bottom: 0 !important;
      height: 100vh !important;
      width: 350px !important;
      max-width: 88vw !important;
      z-index: 999999 !important;
      background: rgba(2, 6, 23, 0.98) !important;
      backdrop-filter: blur(32px) !important;
      -webkit-backdrop-filter: blur(32px) !important;
      border-left: 1px solid rgba(255, 255, 255, 0.12) !important;
      box-shadow: -12px 0 45px rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      flex-direction: column !important;
      transform: translateX(100%) !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.32s !important;
      overflow: hidden !important;
      direction: rtl !important;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
    #gs-drawer.gs-active {
      transform: translateX(0) !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }

    .gs-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      background: rgba(15, 23, 42, 0.75);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }
    .gs-header-logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .gs-logo-box {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #9333ea);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 18px rgba(99, 102, 241, 0.45);
      flex-shrink: 0;
    }
    .gs-logo-title {
      color: #ffffff;
      font-weight: 900;
      font-size: 14.5px;
      line-height: 1.3;
      margin: 0;
    }
    .gs-logo-sub {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 500;
      margin: 0;
    }
    .gs-close {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 16px;
      font-weight: 700;
      transition: all 0.2s;
    }
    .gs-close:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
    }

    .gs-body {
      flex: 1;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
    }

    .gs-section {
      border-radius: 14px;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .gs-section-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 15px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: right;
      transition: background 0.18s;
      font-family: inherit;
    }
    .gs-section-btn:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .gs-section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .gs-section-icon {
      font-size: 15px;
      flex-shrink: 0;
    }
    .gs-section-title {
      font-size: 13px;
      font-weight: 800;
    }
    .gs-chevron {
      font-size: 11px;
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
      transition: all 0.25s ease;
    }
    .gs-link {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 9px 13px;
      border-radius: 10px;
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
      line-height: 1.45;
    }
    .gs-link:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      transform: translateX(-3px);
    }
    .gs-link-icon {
      font-size: 16px;
      flex-shrink: 0;
    }
    .gs-link-label {
      flex: 1;
    }
    .gs-link-arrow {
      font-size: 12px;
      color: #818cf8;
      opacity: 0;
      transition: opacity 0.15s, transform 0.15s;
    }
    .gs-link:hover .gs-link-arrow {
      opacity: 1;
      transform: translateX(-2px);
    }

    .gs-footer {
      flex-shrink: 0;
      padding: 14px 20px;
      background: rgba(15, 23, 42, 0.5);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      text-align: center;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
    }

    @media (max-width: 480px) {
      #gs-drawer { width: 310px !important; }
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
  trigger.innerHTML = '<span class="gs-icon-wrap">🧭</span><span>فهرس المنصة</span>';

  var backdrop = document.createElement('div');
  backdrop.id = 'gs-backdrop';

  var drawer = document.createElement('aside');
  drawer.id = 'gs-drawer';
  drawer.setAttribute('aria-label', 'الشريط الجانبي للمنصة');

  var header = document.createElement('div');
  header.className = 'gs-header';
  header.innerHTML = `
    <div class="gs-header-logo">
      <div class="gs-logo-box">🧭</div>
      <div>
        <div class="gs-logo-title">فهرس المنصة الشامل</div>
        <div class="gs-logo-sub">منصة المحامي الرقمية 2026</div>
      </div>
    </div>
    <button class="gs-close" id="gs-close-btn" aria-label="إغلاق الفهرس">✕</button>
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
        <span class="gs-section-icon" style="color:${section.color}">●</span>
        <span class="gs-section-title" style="color:${section.color}">${section.title}</span>
      </div>
      <span class="gs-chevron ${openState[section.id] ? 'open' : ''}">▼</span>
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
        <span class="gs-link-arrow">↗</span>
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

    // ── Global Custom Event Listeners (من الهيدر أو أي زر في الصفحة) ──
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
