/**
 * sidebar.js — Global Glassmorphism Sidebar for static HTML pages & blog
 * 1:1 Pixel-Perfect Replica of React GlobalSidebar.tsx
 * @license SPDX-License-Identifier: Apache-2.0
 */
(function () {
  'use strict';

  // Do not initialize if React's root is active on the page
  if (document.getElementById('lawfirm-app-root') || document.getElementById('root')) {
    if (window.__REACT_SIDEBAR_ACTIVE__) return;
  }

  // Prevent duplicate mounts
  if (document.getElementById('global-sidebar-trigger') || document.getElementById('gs-drawer')) return;

  // ── Ensure Google Cairo Font is Loaded ──
  if (!document.querySelector('link[href*="family=Cairo"]')) {
    var fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap';
    document.head.appendChild(fontLink);
  }

  var ICONS = {
    compass: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    compassSm: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    globe: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    users: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    gavel: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 12.5-8 8a2.12 2.12 0 0 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></svg>',
    book: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    newspaper: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>',
    chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronUp: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    extLink: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    logIn: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
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
        { label: 'سلطنة عمان', href: '/oman-legal-hub.html', icon: '🇴🇲' },
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
      open: true,
    },
    {
      id: 'lawyers',
      title: 'أدوات ومنظومة المحامين',
      color: '#818cf8',
      borderColor: 'rgba(129, 140, 248, 0.3)',
      bg: 'rgba(129, 140, 248, 0.05)',
      iconSvg: ICONS.gavel,
      links: [
        { label: 'دخول نظام إدارة القضايا والمكاتب', href: '/', icon: '🚀', isApp: true },
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
        { label: 'المكتبة القانونية السحابية (5TB)', href: '/legal-library.html', icon: '🏛️' },
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
    #global-sidebar-trigger, #global-sidebar-trigger *,
    #gs-backdrop, #gs-drawer, #gs-drawer * {
      box-sizing: border-box !important;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
    }

    /* ── Floating Trigger Button ── */
    #global-sidebar-trigger {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      left: auto !important;
      z-index: 999990 !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 12px 16px !important;
      border-radius: 16px !important;
      background: rgba(15, 23, 42, 0.95) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      color: #ffffff !important;
      font-size: 13.5px !important;
      font-weight: 700 !important;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8) !important;
      backdrop-filter: blur(24px) !important;
      -webkit-backdrop-filter: blur(24px) !important;
      cursor: pointer !important;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
      direction: rtl !important;
      user-select: none !important;
      outline: none !important;
    }
    #global-sidebar-trigger:hover {
      background: rgba(30, 41, 59, 1) !important;
      border-color: rgba(99, 102, 241, 0.8) !important;
      transform: scale(1.05) !important;
      box-shadow: 0 16px 40px rgba(99, 102, 241, 0.25), 0 12px 36px rgba(0, 0, 0, 0.8) !important;
    }
    #global-sidebar-trigger:active {
      transform: scale(0.96) !important;
    }
    .gs-trigger-icon-box {
      width: 24px !important;
      height: 24px !important;
      border-radius: 8px !important;
      background: rgba(99, 102, 241, 0.2) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #818cf8 !important;
      flex-shrink: 0 !important;
    }

    /* ── Backdrop ── */
    #gs-backdrop {
      position: fixed !important;
      inset: 0 !important;
      z-index: 999998 !important;
      background: rgba(0, 0, 0, 0.65) !important;
      backdrop-filter: blur(4px) !important;
      -webkit-backdrop-filter: blur(4px) !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.3s ease !important;
    }
    #gs-backdrop.gs-active {
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    /* ── Glass Drawer Container ── */
    #gs-drawer {
      position: fixed !important;
      top: 0 !important;
      bottom: 0 !important;
      right: -360px !important;
      height: 100% !important;
      height: 100vh !important;
      width: 330px !important;
      max-width: 85vw !important;
      z-index: 999999 !important;
      background: rgba(2, 6, 23, 0.96) !important;
      backdrop-filter: blur(24px) !important;
      -webkit-backdrop-filter: blur(24px) !important;
      border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
      display: flex !important;
      flex-direction: column !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transition: right 0.3s ease-out, box-shadow 0.3s ease-out, visibility 0.3s !important;
      direction: rtl !important;
      user-select: none !important;
    }
    #gs-drawer.gs-active {
      right: 0px !important;
      visibility: visible !important;
      pointer-events: auto !important;
      box-shadow: -12px 0 40px rgba(0, 0, 0, 0.85) !important;
    }

    /* ── Drawer Header ── */
    .gs-header {
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 16px 20px !important;
      background: rgba(15, 23, 42, 0.7) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    .gs-header-brand {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }
    .gs-header-logo-box {
      width: 36px !important;
      height: 36px !important;
      border-radius: 12px !important;
      background: linear-gradient(135deg, #6366f1, #9333ea) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #ffffff !important;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35) !important;
      flex-shrink: 0 !important;
    }
    .gs-header-title {
      color: #ffffff !important;
      font-weight: 900 !important;
      font-size: 14px !important;
      line-height: 1.25 !important;
      margin: 0 !important;
    }
    .gs-header-sub {
      color: #94a3b8 !important;
      font-size: 10.5px !important;
      font-weight: 500 !important;
      margin: 0 !important;
    }
    .gs-close-btn {
      width: 32px !important;
      height: 32px !important;
      border-radius: 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #94a3b8 !important;
      background: transparent !important;
      border: none !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      outline: none !important;
    }
    .gs-close-btn:hover {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.1) !important;
    }

    /* ── Scrollable Sections Body ── */
    .gs-body {
      flex: 1 1 0% !important;
      min-height: 0 !important;
      overflow-y: scroll !important;
      overflow-x: hidden !important;
      -webkit-overflow-scrolling: touch !important;
      overscroll-behavior: contain !important;
      scroll-behavior: auto !important;
      padding: 16px 12px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
      scrollbar-width: thin !important;
      scrollbar-color: rgba(148, 163, 184, 0.45) rgba(15, 23, 42, 0.5) !important;
    }
    .gs-body::-webkit-scrollbar {
      width: 6px !important;
      display: block !important;
    }
    .gs-body::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.5) !important;
      border-radius: 999px !important;
    }
    .gs-body::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.4) !important;
      border-radius: 999px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
    }
    .gs-body::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.8) !important;
    }

    /* ── Section Cards ── */
    .gs-section {
      border-radius: 12px !important;
      border-width: 1px !important;
      border-style: solid !important;
      overflow: hidden !important;
      transition: all 0.2s ease !important;
      flex-shrink: 0 !important;
    }
    .gs-section-btn {
      width: 100% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 12px 14px !important;
      text-align: right !important;
      background: transparent !important;
      border: none !important;
      cursor: pointer !important;
      transition: background 0.2s !important;
      outline: none !important;
      pointer-events: auto !important;
    }
    .gs-section-btn:hover {
      background: rgba(255, 255, 255, 0.05) !important;
    }
    .gs-section-title-wrap {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      pointer-events: none !important;
    }
    .gs-section-icon {
      width: 16px !important;
      height: 16px !important;
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .gs-section-title {
      font-size: 12px !important;
      font-weight: 700 !important;
    }
    .gs-chevron {
      width: 18px !important;
      height: 18px !important;
      color: #94a3b8 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
      pointer-events: none !important;
      transition: transform 0.25s ease !important;
    }

    /* ── Links Container ── */
    .gs-links {
      padding: 0 8px 10px 8px !important;
      flex-direction: column !important;
      gap: 4px !important;
    }
    .gs-link {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 8px 12px !important;
      border-radius: 8px !important;
      color: #cbd5e1 !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      transition: all 0.15s ease !important;
      line-height: 1.4 !important;
      cursor: pointer !important;
    }
    .gs-link:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #ffffff !important;
    }
    .gs-link-icon {
      font-size: 14px !important;
      flex-shrink: 0 !important;
      line-height: 1 !important;
    }
    .gs-link-label {
      flex: 1 !important;
      line-height: 1.4 !important;
    }
    .gs-link-arrow {
      width: 14px !important;
      height: 14px !important;
      color: #64748b !important;
      opacity: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
      transition: opacity 0.15s, color 0.15s !important;
    }
    .gs-link:hover .gs-link-arrow {
      opacity: 1 !important;
      color: #818cf8 !important;
    }

    /* ── Drawer Footer ── */
    .gs-footer {
      flex-shrink: 0 !important;
      padding: 12px 16px !important;
      background: rgba(15, 23, 42, 0.4) !important;
      border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
      text-align: center !important;
    }
    .gs-footer-text {
      color: #64748b !important;
      font-size: 10px !important;
      line-height: 1.5 !important;
      margin: 0 !important;
      font-weight: 500 !important;
    }

    
    /* ── Floating Navigation Group (Bottom Left - Never overlaps Index) ── */
    #global-nav-floating-wrap {
      position: fixed !important;
      bottom: 24px !important;
      left: 24px !important;
      z-index: 999990 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-family: 'Cairo', sans-serif !important;
      direction: rtl !important;
    }
    .global-nav-pill-btn {
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 9px 14px !important;
      border-radius: 9999px !important;
      color: #ffffff !important;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35) !important;
      cursor: pointer !important;
      font-family: 'Cairo', sans-serif !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      text-decoration: none !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
    }
    #global-prev-page-trigger {
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.9) 0%, rgba(55, 48, 163, 0.9) 100%) !important;
    }
    #global-prev-page-trigger:hover {
      transform: translateY(-2px) scale(1.03) !important;
      background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%) !important;
      box-shadow: 0 8px 25px rgba(79, 70, 229, 0.5) !important;
    }
    #global-home-trigger {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%) !important;
    }
    #global-home-trigger:hover {
      transform: translateY(-2px) scale(1.03) !important;
      background: linear-gradient(135deg, rgba(51, 65, 85, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%) !important;
      box-shadow: 0 8px 25px rgba(15, 23, 42, 0.6) !important;
      border-color: rgba(99, 102, 241, 0.5) !important;
    }
    @media (max-width: 768px) {
      #global-sidebar-trigger { bottom: 84px !important; right: 14px !important; }
      #global-nav-floating-wrap { bottom: 84px !important; left: 14px !important; gap: 6px !important; }
      .global-nav-pill-btn { padding: 8px 10px !important; font-size: 11.5px !important; }
    }

    @media (max-width: 480px) {
      #gs-drawer { width: 300px !important; }
      #global-sidebar-trigger span { display: none !important; }
      #global-sidebar-trigger { padding: 12px !important; border-radius: 50% !important; bottom: 84px !important; right: 14px !important; }
    }
  `;
  document.head.appendChild(style);

  // ── Build Floating Trigger ──
  var trigger = document.createElement('button');
  trigger.id = 'global-sidebar-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'فتح فهرس المنصة السريع');
  trigger.innerHTML = '<div class="gs-trigger-icon-box">' + ICONS.compassSm + '</div><span>فهرس المنصة</span>';

  // ── Build Backdrop ──
  var backdrop = document.createElement('div');
  backdrop.id = 'gs-backdrop';

  // ── Build Drawer Container ──
  var drawer = document.createElement('aside');
  drawer.id = 'gs-drawer';
  drawer.setAttribute('role', 'navigation');
  drawer.setAttribute('aria-label', 'الشريط الجانبي للمنصة');
  drawer.setAttribute('dir', 'rtl');

  // ── Build Header ──
  var header = document.createElement('div');
  header.className = 'gs-header';
  header.innerHTML = `
    <div class="gs-header-brand">
      <div class="gs-header-logo-box">${ICONS.compass}</div>
      <div>
        <h3 class="gs-header-title">فهرس المنصة الشامل</h3>
        <p class="gs-header-sub">منصة المحامي الرقمية 2026</p>
      </div>
    </div>
    <button class="gs-close-btn" id="gs-close-btn" type="button" aria-label="إغلاق الفهرس">${ICONS.close}</button>
  `;

  // ── Build Scrollable Body ──
  var body = document.createElement('div');
  body.className = 'gs-body';

  SECTIONS.forEach(function (section) {
    var sectionEl = document.createElement('div');
    sectionEl.className = 'gs-section';
    sectionEl.style.borderColor = section.borderColor;
    sectionEl.style.backgroundColor = section.bg;

    var btn = document.createElement('button');
    btn.className = 'gs-section-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <div class="gs-section-title-wrap">
        <span class="gs-section-icon" style="color:${section.color}">${section.iconSvg}</span>
        <span class="gs-section-title" style="color:${section.color}">${section.title}</span>
      </div>
      <span class="gs-chevron">${openState[section.id] ? ICONS.chevronUp : ICONS.chevronDown}</span>
    `;

    var linksEl = document.createElement('div');
    linksEl.className = 'gs-links';
    linksEl.style.setProperty('display', openState[section.id] ? 'flex' : 'none', 'important');
    linksEl.style.flexDirection = 'column';
    linksEl.style.gap = '4px';

    section.links.forEach(function (link) {
      var a = document.createElement('a');
      a.className = 'gs-link';
      a.href = link.href;
      a.innerHTML = `
        <span class="gs-link-icon">${link.icon}</span>
        <span class="gs-link-label">${link.label}</span>
        <span class="gs-link-arrow">${link.isApp ? ICONS.logIn : ICONS.extLink}</span>
      `;
      a.addEventListener('click', function () { closeDrawer(); });
      linksEl.appendChild(a);
    });

    btn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      openState[section.id] = !openState[section.id];
      var isNowOpen = openState[section.id];
      
      var chevron = btn.querySelector('.gs-chevron');
      if (chevron) {
        chevron.innerHTML = isNowOpen ? ICONS.chevronUp : ICONS.chevronDown;
      }
      
      linksEl.style.setProperty('display', isNowOpen ? 'flex' : 'none', 'important');
      linksEl.style.flexDirection = 'column';
      linksEl.style.gap = '4px';
    };

    sectionEl.appendChild(btn);
    sectionEl.appendChild(linksEl);
    body.appendChild(sectionEl);
  });

  // ── Build Footer ──
  var footer = document.createElement('div');
  footer.className = 'gs-footer';
  footer.innerHTML = '<p class="gs-footer-text">© 2026 منصة المحامي الرقمية — mohamidigital.online</p>';

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

    // ── Global Custom Event Listeners ──
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

    // ── Top Navbar Trigger Injection (Desktop/Tablet only) ──
    var uhActions = document.querySelector('.uh-actions');
    if (window.innerWidth > 768 && uhActions && !uhActions.querySelector('.gs-nav-trigger') && !uhActions.querySelector('[title*="فهرس"]')) {
      var navBtn = document.createElement('button');
      navBtn.type = 'button';
      navBtn.className = 'uh-cta uh-cta--ghost gs-nav-trigger';
      navBtn.style.cssText = 'padding: 7px 12px !important; font-size: 0.82rem !important; border-color: rgba(99, 102, 241, 0.4) !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; gap: 6px !important; font-family: "Cairo", sans-serif !important; font-weight: 700 !important; color: #e2e8f0 !important;';
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
  }

  function closeDrawer() {
    isOpen = false;
    drawer.classList.remove('gs-active');
    backdrop.classList.remove('gs-active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();


// ── Fallback Mobile Dock Auto-Mount ──
(function() {
  function mountDock() {
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
    document.addEventListener('DOMContentLoaded', mountDock);
  } else {
    mountDock();
  }
})();
