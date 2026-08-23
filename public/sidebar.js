/**
 * sidebar.js — Global Glassmorphism Sidebar for static HTML pages & blog
 * Vanilla JS, <4KB, zero dependencies. 
 * @license SPDX-License-Identifier: Apache-2.0
 */
(function () {
  'use strict';

  // Do not initialize if React's root is on the page to prevent duplicate triggers
  if (document.getElementById('lawfirm-app-root') || document.getElementById('root')) {
    // If root container exists, check if React handles it
    if (window.__REACT_SIDEBAR_ACTIVE__) return;
  }

  // Prevent duplicate mounts
  if (document.getElementById('gs-trigger') || document.getElementById('gs-drawer')) return;

  const SECTIONS = [
    {
      id: 'gulf',
      title: 'بوابات الدول والخدمات الإقليمية',
      color: '#34d399',
      borderColor: 'rgba(52,211,153,0.3)',
      bg: 'rgba(52,211,153,0.05)',
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
      borderColor: 'rgba(34,211,238,0.3)',
      bg: 'rgba(34,211,238,0.05)',
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
      borderColor: 'rgba(129,140,248,0.3)',
      bg: 'rgba(129,140,248,0.05)',
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
      borderColor: 'rgba(167,139,250,0.3)',
      bg: 'rgba(167,139,250,0.05)',
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
      borderColor: 'rgba(244,114,182,0.3)',
      bg: 'rgba(244,114,182,0.05)',
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
    #gs-trigger {
      position: fixed; bottom: 24px; left: 24px; z-index: 9990;
      display: flex; align-items: center; gap: 10px;
      padding: 12px 18px; border-radius: 16px;
      background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff; font-size: 13px; font-weight: 700;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      cursor: pointer; transition: all 0.25s ease;
      font-family: 'Cairo', system-ui, sans-serif; direction: rtl;
      user-select: none;
    }
    #gs-trigger:hover {
      background: rgba(30, 41, 59, 0.98); border-color: rgba(99, 102, 241, 0.6);
      transform: scale(1.05);
    }
    #gs-trigger .gs-icon {
      font-size: 17px; transition: transform 0.3s ease;
    }
    #gs-trigger:hover .gs-icon { transform: rotate(15deg); }

    #gs-backdrop {
      position: fixed; inset: 0; z-index: 9991;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    #gs-backdrop.gs-active { opacity: 1; pointer-events: auto; }

    #gs-drawer {
      position: fixed; top: 0; right: 0; height: 100%; width: 320px; max-width: 85vw;
      z-index: 9992;
      background: rgba(2, 6, 23, 0.96);
      backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: -10px 0 35px rgba(0, 0, 0, 0.8);
      display: flex; flex-direction: column;
      transform: translateX(100%);
      visibility: hidden; pointer-events: none;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s;
      overflow: hidden;
      direction: rtl;
      font-family: 'Cairo', system-ui, sans-serif;
    }
    #gs-drawer.gs-active {
      transform: translateX(0);
      visibility: visible;
      pointer-events: auto;
    }

    .gs-header {
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.6);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .gs-header-logo { display: flex; align-items: center; gap: 12px; }
    .gs-logo-box {
      width: 36px; height: 36px; border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #9333ea);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      flex-shrink: 0;
    }
    .gs-logo-title { color: #ffffff; font-weight: 900; font-size: 13.5px; line-height: 1.3; }
    .gs-logo-sub { color: #94a3b8; font-size: 10.5px; }
    .gs-close {
      width: 32px; height: 32px; border-radius: 10px;
      border: none; background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #94a3b8; font-size: 18px; transition: all 0.2s;
    }
    .gs-close:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }

    .gs-body {
      flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 10px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
    }

    .gs-section {
      border-radius: 12px; overflow: hidden;
      transition: all 0.2s ease;
    }
    .gs-section-btn {
      width: 100%; display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; background: transparent; border: none; cursor: pointer;
      text-align: right; transition: background 0.15s;
    }
    .gs-section-btn:hover { background: rgba(255, 255, 255, 0.05); }
    .gs-section-title-wrap { display: flex; align-items: center; gap: 10px; }
    .gs-section-icon { font-size: 14px; flex-shrink: 0; }
    .gs-section-title { font-size: 12px; font-weight: 700; }
    .gs-chevron { font-size: 12px; color: #94a3b8; transition: transform 0.2s ease; }
    .gs-chevron.open { transform: rotate(180deg); }

    .gs-links { padding: 4px 8px 10px; display: flex; flex-direction: column; gap: 4px; }
    .gs-link {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; border-radius: 8px;
      color: #cbd5e1; font-size: 12px; font-weight: 500;
      text-decoration: none; transition: all 0.15s ease;
    }
    .gs-link:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
    .gs-link-icon { font-size: 14px; flex-shrink: 0; }
    .gs-link-label { flex: 1; line-height: 1.4; }
    .gs-link-arrow { font-size: 11px; color: #64748b; opacity: 0; transition: opacity 0.15s; }
    .gs-link:hover .gs-link-arrow { opacity: 1; color: #ffffff; }

    .gs-footer {
      flex-shrink: 0; padding: 12px 20px;
      background: rgba(15, 23, 42, 0.4);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      text-align: center; color: #64748b; font-size: 10px;
    }

    @media (max-width: 480px) {
      #gs-drawer { width: 290px; }
      #gs-trigger span { display: none; }
      #gs-trigger { padding: 12px; border-radius: 50%; }
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM ──
  var trigger = document.createElement('button');
  trigger.id = 'gs-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'فتح فهرس المنصة السريع');
  trigger.innerHTML = '<span class="gs-icon">🧭</span><span>فهرس المنصة</span>';

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
