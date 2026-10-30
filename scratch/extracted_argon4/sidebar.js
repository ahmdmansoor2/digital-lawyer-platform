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
        { label: 'المعجم القانوني والقضائي التفاعلي', href: '/legal-glossary.html', icon: '📖' },
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
      navBtn.style.cssText = 'padding: 7px 12px !important; font-size: 0.82rem !important; border-color: rgba(99, 102, 241, 0.4) !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; gap: 6px !important; font-family: "Cairo", sans-serif !important; font-weight: 700 !important; color: inherit;';
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


// ── Google AdSense & GDPR Cookie Consent Banner (v6) ──
(function() {
  var CONSENT_KEY = 'mohami_cookie_consent_2026';

  function showCookieBanner(forceShow) {
    try {
      if (!forceShow && localStorage.getItem(CONSENT_KEY)) return;
    } catch (e) {}

    var existing = document.getElementById('mohami-cookie-banner');
    if (existing) existing.remove();

    var banner = document.createElement('div');
    banner.id = 'mohami-cookie-banner';
    banner.className = 'no-print';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'إشعار ملفات تعريف الارتباط والخصوصية');
    banner.style.cssText = 'position:fixed; bottom:16px; left:16px; right:16px; max-width:920px; margin:0 auto; z-index:9999995; background:rgba(15,23,42,0.97); border:1px solid rgba(99,102,241,0.45); border-radius:16px; padding:14px 18px; box-shadow:0 16px 40px rgba(0,0,0,0.85); backdrop-filter:blur(16px); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; font-family:"Cairo",sans-serif; direction:rtl; color:#e2e8f0; font-size:12.5px; line-height:1.6;';

    banner.innerHTML =
      '<div style="flex:1; min-width:240px;">' +
        '<strong style="color:#fff;">🍪 إشعار الخصوصية وملفات تعريف الارتباط (Cookies):</strong> ' +
        'نستخدم ملفات تعريف الارتباط وتقنيات Google AdSense لتحسين تجربتك وتقديم الحاسبات والخدمات القانونية مجاناً. باستمرارك أو ضغطك على «موافقة»، فإنك توافق على <a href="/privacy.html" style="color:#6ee7b7; text-decoration:underline; font-weight:700;">سياسة الخصوصية وملفات تعريف الارتباط</a>.' +
      '</div>' +
      '<div style="display:flex; gap:8px; flex-shrink:0;">' +
        '<button type="button" id="mohamiCookieAcceptAll" style="padding:8px 16px; border-radius:10px; background:linear-gradient(135deg,#10b981,#059669); border:none; color:#fff; font-family:\'Cairo\',sans-serif; font-weight:800; font-size:12px; cursor:pointer;">✓ موافقة وقبول الكل</button>' +
        '<button type="button" id="mohamiCookieEssential" style="padding:8px 12px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; font-family:\'Cairo\',sans-serif; font-weight:700; font-size:12px; cursor:pointer;">الضرورية فقط</button>' +
      '</div>';

    document.body.appendChild(banner);

    document.getElementById('mohamiCookieAcceptAll').onclick = function() {
      try { localStorage.setItem(CONSENT_KEY, 'all'); } catch (e) {}
      banner.remove();
    };
    document.getElementById('mohamiCookieEssential').onclick = function() {
      try { localStorage.setItem(CONSENT_KEY, 'essential'); } catch (e) {}
      banner.remove();
    };
  }

  window.openMohamiCookieSettings = function() {
    showCookieBanner(true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { showCookieBanner(false); });
  } else {
    showCookieBanner(false);
  }
})();

// ── Mohami v9 UI/UX Suite: Universal Light/Dark Theme Engine, Runtime Contrast Normalizer, Font Resizer, Spotlight Search (Ctrl+K), Progress Bar & Auto-TOC ──
(function() {
  'use strict';
  if (document.documentElement.hasAttribute("data-mohami-v9-mounted")) return;
  document.documentElement.setAttribute("data-mohami-v9-mounted", "1");

  var THEME_KEY = 'mohami_theme_mode';
  var FONT_KEY = 'mohami_font_scale';
  var searchIndexCache = null;

  function isLightMode() {
    return document.documentElement.classList.contains('public-theme-light');
  }

  function parseRgba(str) {
    if (!str) return [0, 0, 0, 0];
    var m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return [0, 0, 0, 0];
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), m[4] !== undefined ? parseFloat(m[4]) : 1];
  }

  function lum(rgb) {
    var a = [rgb[0], rgb[1], rgb[2]].map(function(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function isDarkGradient(bgImg) {
    if (!bgImg || bgImg === 'none') return false;
    return (
      bgImg.indexOf('15, 23, 42') !== -1 ||
      bgImg.indexOf('30, 41, 59') !== -1 ||
      bgImg.indexOf('2, 6, 23') !== -1 ||
      bgImg.indexOf('6, 9, 19') !== -1 ||
      bgImg.indexOf('10, 15, 29') !== -1 ||
      bgImg.indexOf('30, 27, 75') !== -1 ||
      bgImg.indexOf('17, 24, 39') !== -1
    );
  }

  function isVibrantSolidBg(rgb, bgImg) {
    if (bgImg && bgImg !== 'none' && !isDarkGradient(bgImg) && bgImg.indexOf('248, 250, 252') === -1 && bgImg.indexOf('241, 245, 249') === -1 && bgImg.indexOf('255, 255, 255') === -1 && bgImg.indexOf('238, 242, 255') === -1) {
      if (bgImg.indexOf('0.0') !== -1 || bgImg.indexOf('0.1') !== -1 || bgImg.indexOf('0.2') !== -1) return false;
      return true;
    }
    if (rgb[3] > 0.7) {
      var r = rgb[0], g = rgb[1], b = rgb[2];
      var maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
      if (maxC - minC > 55 && lum(rgb) < 0.45) return true;
    }
    return false;
  }

  function getEffectiveBg(el) {
    var cur = el;
    while (cur && cur !== document.documentElement) {
      var cs = window.getComputedStyle(cur);
      var bg = parseRgba(cs.backgroundColor);
      var bgImg = cs.backgroundImage || 'none';
      if (isVibrantSolidBg(bg, bgImg)) {
        return { rgb: [30, 64, 175, 1], vibrant: true };
      }
      if (bg[3] > 0.18) {
        if (bg[3] < 0.85) {
          var a = bg[3];
          return {
            rgb: [
              Math.round(bg[0] * a + 248 * (1 - a)),
              Math.round(bg[1] * a + 250 * (1 - a)),
              Math.round(bg[2] * a + 252 * (1 - a)),
              1
            ],
            vibrant: false
          };
        }
        return { rgb: bg, vibrant: false };
      }
      cur = cur.parentElement;
    }
    return { rgb: [248, 250, 252, 1], vibrant: false };
  }

  function mapToDarkAccent(rgb) {
    var r = rgb[0], g = rgb[1], b = rgb[2];
    if (g > r + 25 && g >= b) return '#065f46';
    if (b > r + 30 && g > r + 15) return '#075985';
    if (b > r + 20 && b >= g) return '#3730a3';
    if (r > b + 40 && g > b + 20) return '#92400e';
    if (r > g + 35 && r > b + 20) return '#991b1b';
    if (r > g + 20 && b > g + 20) return '#6b21a8';
    return '#0f172a';
  }

  function syncLightModeDOM() {
    if (!document.body) return;
    var light = isLightMode();

    if (!light) {
      var fixedEls = document.querySelectorAll('[data-mohami-lm-fixed="1"]');
      for (var i = 0; i < fixedEls.length; i++) {
        var fel = fixedEls[i];
        var orig = fel.getAttribute('data-mohami-orig-style');
        if (orig === null || orig === '__EMPTY__') {
          fel.removeAttribute('style');
        } else {
          fel.setAttribute('style', orig);
        }
        fel.removeAttribute('data-mohami-lm-fixed');
      }
      return;
    }

    document.documentElement.classList.add('mohami-no-transitions');
    void document.body.offsetHeight;

    try {
      var allEls = document.querySelectorAll('body *');
      for (var idx = 0; idx < allEls.length; idx++) {
        var el = allEls[idx];
        var tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG' || tag === 'PATH' || tag === 'NOSCRIPT') continue;
        if (el.closest('#app-workspace-wrapper') || el.closest('.paper-sheet') || el.id === 'global-sidebar-trigger' || el.id === 'mohamiHeaderThemeBtn') continue;

        var cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;

        var cls = (typeof el.className === 'string' ? el.className : '') || '';
        var bg = parseRgba(cs.backgroundColor);
        var bgImg = cs.backgroundImage || 'none';
        var vibrant = isVibrantSolidBg(bg, bgImg);

        if (!vibrant) {
          var hasDarkBg = (bg[3] > 0.20 && lum(bg) < 0.28) || isDarkGradient(bgImg);
          if (hasDarkBg) {
            if (!el.hasAttribute('data-mohami-lm-fixed')) {
              el.setAttribute('data-mohami-orig-style', el.getAttribute('style') || '__EMPTY__');
              el.setAttribute('data-mohami-lm-fixed', '1');
            }
            var isSecondary = (bg[0] >= 25 && bg[1] >= 35) || tag === 'LI' || tag === 'TR' || tag === 'TH' || cls.indexOf('pill') !== -1 || cls.indexOf('tag') !== -1 || cls.indexOf('chip') !== -1 || cls.indexOf('row') !== -1 || cls.indexOf('item') !== -1 || cls.indexOf('secondary') !== -1;
            el.style.setProperty('background', isSecondary ? '#f1f5f9' : '#ffffff', 'important');
            el.style.setProperty('border-color', '#cbd5e1', 'important');
            if (cs.boxShadow && cs.boxShadow !== 'none') {
              el.style.setProperty('box-shadow', '0 4px 16px rgba(15, 23, 42, 0.06)', 'important');
            }
          }
        }
      }

      for (var j = 0; j < allEls.length; j++) {
        var tel = allEls[j];
        var ttag = tel.tagName;
        if (ttag === 'SCRIPT' || ttag === 'STYLE' || ttag === 'SVG' || ttag === 'PATH' || ttag === 'NOSCRIPT') continue;
        if (tel.closest('#app-workspace-wrapper') || tel.closest('.paper-sheet') || tel.id === 'global-sidebar-trigger' || tel.id === 'mohamiHeaderThemeBtn') continue;

        var tcs = window.getComputedStyle(tel);
        if (tcs.display === 'none' || tcs.visibility === 'hidden') continue;

        var hasText = false;
        for (var c = 0; c < tel.childNodes.length; c++) {
          if (tel.childNodes[c].nodeType === 3 && tel.childNodes[c].nodeValue.trim().length > 0) {
            hasText = true;
            break;
          }
        }
        if (hasText || ttag === 'INPUT' || ttag === 'SELECT' || ttag === 'TEXTAREA') {
          var fillStr = tcs.webkitTextFillColor;
          var hasZeroFill = fillStr === 'rgba(0, 0, 0, 0)' || fillStr === 'transparent';
          var fg = parseRgba((!hasZeroFill && fillStr) ? fillStr : tcs.color);
          var effBg = getEffectiveBg(tel);
          var lFg = lum(fg);
          var lBg = lum(effBg.rgb);
          var ratio = (Math.max(lFg, lBg) + 0.05) / (Math.min(lFg, lBg) + 0.05);

          if (hasZeroFill || ratio < 3.8) {
            if (!tel.hasAttribute('data-mohami-lm-fixed')) {
              tel.setAttribute('data-mohami-orig-style', tel.getAttribute('style') || '__EMPTY__');
              tel.setAttribute('data-mohami-lm-fixed', '1');
            }
            if (effBg.vibrant) {
              tel.style.setProperty('color', '#ffffff', 'important');
              tel.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
            } else {
              var newCol = mapToDarkAccent(fg);
              tel.style.setProperty('color', newCol, 'important');
              tel.style.setProperty('-webkit-text-fill-color', newCol, 'important');
              if (hasZeroFill) {
                tel.style.setProperty('background', 'none', 'important');
              }
            }
            tel.style.setProperty('text-shadow', 'none', 'important');
          }
        }
      }
    } finally {
      document.documentElement.classList.remove('mohami-no-transitions');
    }
  }

  function applyTheme(mode) {
    if (mode === 'light') {
      document.documentElement.classList.add('public-theme-light');
    } else {
      document.documentElement.classList.remove('public-theme-light');
    }
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
    syncLightModeDOM();
    updateThemeButtonsUI();
  }

  function toggleTheme() {
    applyTheme(isLightMode() ? 'dark' : 'light');
  }

  function updateThemeButtonsUI() {
    var light = isLightMode();
    document.querySelectorAll('.mohami-theme-toggle-btn').forEach(function(btn) {
      btn.innerHTML = light ? '🌙 <span>ليلي</span>' : '☀️ <span>نهاري</span>';
      btn.title = light ? 'التبديل إلى الوضع الليلي الفخم' : 'التبديل إلى الوضع النهاري الورقي المريح للقراءة';
      btn.style.background = light ? '#0f172a' : 'rgba(245, 158, 11, 0.18)';
      btn.style.color = light ? '#ffffff' : '#fde68a';
      btn.style.borderColor = light ? '#334155' : 'rgba(245, 158, 11, 0.45)';
    });
    var qBtn = document.getElementById('mohamiQuickSearchBtn');
    if (qBtn) {
      qBtn.style.background = light ? '#f1f5f9' : 'rgba(99, 102, 241, 0.16)';
      qBtn.style.color = light ? '#1e293b' : '#e0e7ff';
      qBtn.style.borderColor = light ? '#cbd5e1' : 'rgba(99, 102, 241, 0.4)';
    }
  }

  function changeFontScale(delta) {
    var current = 100;
    try {
      current = parseInt(localStorage.getItem(FONT_KEY) || '100', 10);
    } catch (e) {}
    var next = delta === 0 ? 100 : Math.min(125, Math.max(85, current + delta));
    if (next === 100) {
      document.documentElement.style.removeProperty('font-size');
    } else {
      document.documentElement.style.fontSize = next + '%';
    }
    try { localStorage.setItem(FONT_KEY, String(next)); } catch (e) {}
  }

  function mountProgressAndBackToTop() {
    if (!document.getElementById('mohamiReadingProgressBar')) {
      var bar = document.createElement('div');
      bar.id = 'mohamiReadingProgressBar';
      bar.className = 'no-print';
      document.body.appendChild(bar);
    }

    if (!document.getElementById('mohamiBackToTopBtn')) {
      var upBtn = document.createElement('button');
      upBtn.id = 'mohamiBackToTopBtn';
      upBtn.type = 'button';
      upBtn.className = 'no-print';
      upBtn.title = 'العودة إلى أعلى الصفحة';
      upBtn.setAttribute('aria-label', 'العودة إلى أعلى الصفحة');
      upBtn.style.cssText = 'position:fixed; bottom:24px; left:24px; z-index:999989; width:42px; height:42px; border-radius:12px; background:#4f46e5; border:1px solid rgba(255,255,255,0.25); color:#fff; font-size:18px; font-weight:900; cursor:pointer; display:none; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(0,0,0,0.35); transition:all 0.25s ease;';
      upBtn.innerHTML = '↑';
      upBtn.onclick = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
      document.body.appendChild(upBtn);
    }

    window.addEventListener('scroll', function() {
      var docEl = document.documentElement;
      var scrollTop = window.scrollY || docEl.scrollTop;
      var scrollHeight = (docEl.scrollHeight - docEl.clientHeight) || 1;
      var pct = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
      var bar = document.getElementById('mohamiReadingProgressBar');
      if (bar) bar.style.width = pct + '%';

      var upBtn = document.getElementById('mohamiBackToTopBtn');
      if (upBtn) {
        upBtn.style.display = scrollTop > 380 ? 'flex' : 'none';
        if (window.innerWidth <= 768) {
          upBtn.style.bottom = '84px';
          upBtn.style.left = '14px';
        } else {
          upBtn.style.bottom = '24px';
          upBtn.style.left = '24px';
        }
      }
    }, { passive: true });
  }

  function mountHeaderControls() {
    if (document.getElementById('mohamiHeaderThemeBtn')) return;

    var targetContainer =
      document.querySelector('.uh-actions') ||
      document.querySelector('.uh-bar .uh-inner') ||
      document.querySelector('.unified-header nav') ||
      document.querySelector('.unified-header .uh-inner') ||
      document.querySelector('.header-nav .nav-container') ||
      document.querySelector('.site-header .header-inner');

    var toolsWrap = document.createElement('div');
    toolsWrap.className = 'no-print';
    toolsWrap.style.cssText = 'display:inline-flex; align-items:center; gap:6px; flex-shrink:0;';

    var searchBtn = document.createElement('button');
    searchBtn.type = 'button';
    searchBtn.id = 'mohamiQuickSearchBtn';
    searchBtn.title = 'بحث فوري في المنصة (Ctrl+K)';
    searchBtn.style.cssText = 'padding:6px 11px; border-radius:10px; border:1px solid rgba(99,102,241,0.35); font-family:Cairo,sans-serif; font-size:12px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:5px;';
    searchBtn.innerHTML = '🔍 <span>بحث</span>';
    searchBtn.onclick = openSpotlightSearch;

    var themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.id = 'mohamiHeaderThemeBtn';
    themeBtn.className = 'mohami-theme-toggle-btn';
    themeBtn.style.cssText = 'padding:6px 11px; border-radius:10px; border:1px solid rgba(245,158,11,0.45); font-family:Cairo,sans-serif; font-size:12px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:5px;';
    themeBtn.onclick = toggleTheme;

    toolsWrap.appendChild(searchBtn);
    toolsWrap.appendChild(themeBtn);

    if (targetContainer) {
      if (targetContainer.classList.contains('uh-actions')) {
        targetContainer.insertBefore(toolsWrap, targetContainer.firstChild);
      } else {
        targetContainer.appendChild(toolsWrap);
      }
    } else {
      toolsWrap.style.cssText = 'position:fixed; top:16px; left:16px; z-index:999995; display:inline-flex; align-items:center; gap:8px;';
      document.body.appendChild(toolsWrap);
    }

    var gsBody = document.querySelector('#gs-drawer .gs-body');
    if (gsBody && !document.getElementById('gsReadingToolsCard')) {
      var rtCard = document.createElement('div');
      rtCard.id = 'gsReadingToolsCard';
      rtCard.style.cssText = 'padding:10px 12px; border-radius:12px; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); display:flex; align-items:center; justify-content:space-between; gap:8px; flex-shrink:0;';
      rtCard.innerHTML =
        '<button type="button" class="mohami-theme-toggle-btn" style="padding:6px 12px; border-radius:8px; border:1px solid rgba(245,158,11,0.45); font-family:Cairo,sans-serif; font-weight:800; font-size:12px; cursor:pointer;"></button>' +
        '<div style="display:flex; gap:4px; align-items:center;">' +
          '<span style="font-size:11px; opacity:0.85; margin-left:4px;">حجم الخط:</span>' +
          '<button type="button" id="gsFontPlus" style="padding:4px 8px; border-radius:6px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.35); color:inherit; font-weight:800; font-size:11px; cursor:pointer;">A+</button>' +
          '<button type="button" id="gsFontReset" style="padding:4px 8px; border-radius:6px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.35); color:inherit; font-weight:700; font-size:11px; cursor:pointer;">100%</button>' +
          '<button type="button" id="gsFontMinus" style="padding:4px 8px; border-radius:6px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.35); color:inherit; font-weight:800; font-size:11px; cursor:pointer;">A-</button>' +
        '</div>';
      gsBody.insertBefore(rtCard, gsBody.firstChild);
      rtCard.querySelector('.mohami-theme-toggle-btn').onclick = toggleTheme;
      document.getElementById('gsFontPlus').onclick = function() { changeFontScale(8); };
      document.getElementById('gsFontReset').onclick = function() { changeFontScale(0); };
      document.getElementById('gsFontMinus').onclick = function() { changeFontScale(-8); };
    }

    updateThemeButtonsUI();
  }

  function openSpotlightSearch() {
    var existing = document.getElementById('mohamiSpotlightModal');
    if (existing) {
      existing.style.display = 'flex';
      var inp = document.getElementById('mohamiSpotlightInput');
      if (inp) inp.focus();
      return;
    }

    var modal = document.createElement('div');
    modal.id = 'mohamiSpotlightModal';
    modal.className = 'no-print';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.72); backdrop-filter:blur(8px); z-index:1000002; display:flex; align-items:flex-start; justify-content:center; padding:60px 16px 20px; direction:rtl; font-family:Cairo,sans-serif;';
    modal.innerHTML =
      '<div style="background:var(--card, #0f172a); border:1px solid rgba(99,102,241,0.45); border-radius:20px; max-width:680px; width:100%; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.45);">' +
        '<div style="padding:14px 18px; border-bottom:1px solid var(--border, rgba(148,163,184,0.2)); display:flex; align-items:center; gap:10px;">' +
          '<span style="font-size:18px;">🔍</span>' +
          '<input type="text" id="mohamiSpotlightInput" placeholder="ابحث فوراً في الـ 16 حاسبة، صيغ العقود، المحاكم، المعجم، والمقالات..." style="flex:1; border:none !important; outline:none; background:transparent !important; color:var(--text, #fff) !important; font-family:Cairo,sans-serif; font-size:15px; font-weight:700;" />' +
          '<button type="button" id="mohamiSpotlightClose" style="padding:4px 10px; border-radius:8px; background:rgba(148,163,184,0.2); border:none; color:var(--text, #94a3b8); font-family:Cairo,sans-serif; font-size:12px; font-weight:700; cursor:pointer;">ESC ✕</button>' +
        '</div>' +
        '<div id="mohamiSpotlightResults" style="max-height:62vh; overflow-y:auto; padding:12px;">' +
          '<div style="padding:8px 10px; font-size:12px; font-weight:800; color:var(--indigo, #6366f1);">⚡ أدوات الوصول الفوري السريع:</div>' +
          '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px; padding:4px;">' +
            '<a href="/legal-consultations.html" style="padding:10px 12px; border-radius:10px; background:rgba(16,185,129,0.12); color:var(--text, #fff); text-decoration:none; font-size:13px; font-weight:700;">💬 استشارة قانونية فورية</a>' +
            '<a href="/contract-generator.html" style="padding:10px 12px; border-radius:10px; background:rgba(99,102,241,0.12); color:var(--text, #fff); text-decoration:none; font-size:13px; font-weight:700;">📝 مولد العقود وحوافظ المستندات</a>' +
            '<a href="/legal-calculators.html" style="padding:10px 12px; border-radius:10px; background:rgba(245,158,11,0.12); color:var(--text, #fff); text-decoration:none; font-size:13px; font-weight:700;">🧮 الحاسبات القانونية الـ 16</a>' +
            '<a href="/lawyers-directory.html" style="padding:10px 12px; border-radius:10px; background:rgba(56,189,248,0.12); color:var(--text, #fff); text-decoration:none; font-size:13px; font-weight:700;">👨‍⚖️ دليل المحامين والإنابات</a>' +
            '<a href="/courts-directory.html" style="padding:10px 12px; border-radius:10px; background:rgba(167,139,250,0.12); color:var(--text, #fff); text-decoration:none; font-size:13px; font-weight:700;">🏛️ دليل المحاكم والشهر العقاري</a>' +
            '<a href="/legal-glossary.html" style="padding:10px 12px; border-radius:10px; background:rgba(244,114,182,0.12); color:var(--text, #fff); text-decoration:none; font-size:13px; font-weight:700;">📖 المعجم القانوني التفاعلي</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    var closeModal = function() { modal.style.display = 'none'; };
    document.getElementById('mohamiSpotlightClose').onclick = closeModal;
    modal.onclick = function(e) { if (e.target === modal) closeModal(); };

    var inputEl = document.getElementById('mohamiSpotlightInput');
    inputEl.focus();

    if (!searchIndexCache) {
      fetch('/search-index.json?v=20261017v9')
        .then(function(r) { return r.json(); })
        .then(function(data) { searchIndexCache = (data && data.items) || []; })
        .catch(function() { searchIndexCache = []; });
    }

    inputEl.oninput = function() {
      var q = (inputEl.value || '').trim().toLowerCase();
      var resBox = document.getElementById('mohamiSpotlightResults');
      if (!q || !searchIndexCache) return;
      var matches = searchIndexCache.filter(function(it) {
        return (it.title && it.title.toLowerCase().includes(q)) ||
               (it.description && it.description.toLowerCase().includes(q)) ||
               (it.keywords && it.keywords.toLowerCase().includes(q));
      }).slice(0, 8);

      if (matches.length === 0) {
        resBox.innerHTML = '<div style="padding:24px; text-align:center; color:var(--muted, #64748b); font-size:13.5px;">لم يتم العثور على نتائج مطابقة. <a href="/search.html?q=' + encodeURIComponent(q) + '" style="color:#4f46e5; font-weight:800;">ابحث في الفهرس الكامل ←</a></div>';
        return;
      }

      resBox.innerHTML = matches.map(function(m) {
        return '<a href="' + m.id + '" style="display:block; padding:10px 14px; border-radius:12px; margin-bottom:6px; background:rgba(99,102,241,0.08); border:1px solid rgba(148,163,184,0.2); text-decoration:none; color:var(--text, #0f172a);">' +
          '<div style="font-size:13.5px; font-weight:800; color:#4f46e5;">' + m.title + '</div>' +
          '<div style="font-size:11.5px; color:var(--muted, #475569); margin-top:2px;">' + (m.description || '').slice(0, 110) + '...</div>' +
        '</a>';
      }).join('');
    };
  }

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSpotlightSearch();
    } else if (e.key === 'Escape') {
      var m = document.getElementById('mohamiSpotlightModal');
      if (m) m.style.display = 'none';
    }
  });

  function mountAutoTOC() {
    var articleContainer = document.querySelector('.article-card') || document.querySelector('.topic-page-body') || document.querySelector('article.content');
    if (!articleContainer || document.getElementById('mohamiAutoTOC')) return;
    var headings = articleContainer.querySelectorAll('h2');
    if (headings.length < 3) return;

    var toc = document.createElement('nav');
    toc.id = 'mohamiAutoTOC';
    toc.className = 'no-print';
    toc.setAttribute('aria-label', 'فهرس محتويات المقال');
    toc.style.cssText = 'margin:20px 0 28px; padding:18px 22px; border-radius:16px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.3); font-family:Cairo,sans-serif;';

    var listHtml = '';
    headings.forEach(function(h, idx) {
      if (!h.id) h.id = 'sec-heading-' + (idx + 1);
      listHtml += '<li style="margin-bottom:6px;"><a href="#' + h.id + '" style="color:inherit; text-decoration:none; font-size:13.5px; font-weight:700;">' + (idx + 1) + '. ' + h.innerText + '</a></li>';
    });

    toc.innerHTML =
      '<div style="font-size:14.5px; font-weight:900; color:#4f46e5; margin-bottom:10px;">📑 فهرس محتويات الدليل القانوني السريع:</div>' +
      '<ul style="list-style:none; padding:0; margin:0; columns:2; column-gap:24px;">' + listHtml + '</ul>';

    var firstH2 = headings[0];
    firstH2.parentNode.insertBefore(toc, firstH2);
  }

  function initV9UI() {
    mountProgressAndBackToTop();
    mountHeaderControls();
    mountAutoTOC();
    syncLightModeDOM();

    var debounceTimer = null;
    if (window.MutationObserver && document.body) {
      var obs = new MutationObserver(function(mutations) {
        if (!isLightMode()) return;
        var hasNewNodes = false;
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
            hasNewNodes = true;
            break;
          }
        }
        if (hasNewNodes) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(syncLightModeDOM, 30);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  window.toggleMohamiTheme = toggleTheme;
  window.syncMohamiLightMode = syncLightModeDOM;
  window.openMohamiSpotlightSearch = openSpotlightSearch;

  if (document.body) {
    initV9UI();
  }
  document.addEventListener('DOMContentLoaded', initV9UI);
})();
