/**
 * sidebar.js — Global Glassmorphism Sidebar for static HTML pages & blog
 * Vanilla JS, <5KB, zero dependencies. Loads after DOM ready.
 * @license SPDX-License-Identifier: Apache-2.0
 */
(function () {
  'use strict';

  const SECTIONS = [
    {
      id: 'gulf',
      title: 'بوابات الدول والخدمات الإقليمية',
      color: '#34d399',
      borderColor: 'rgba(52,211,153,0.25)',
      bg: 'rgba(52,211,153,0.04)',
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
      borderColor: 'rgba(34,211,238,0.25)',
      bg: 'rgba(34,211,238,0.04)',
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
      borderColor: 'rgba(129,140,248,0.25)',
      bg: 'rgba(129,140,248,0.04)',
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
      borderColor: 'rgba(167,139,250,0.25)',
      bg: 'rgba(167,139,250,0.04)',
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
      borderColor: 'rgba(244,114,182,0.25)',
      bg: 'rgba(244,114,182,0.04)',
      links: [
        { label: 'المدونة القانونية (+140 مقال)', href: '/blog/', icon: '📰' },
        { label: 'الميزات والتعريف بالمنصة', href: '/features.html', icon: '🎬' },
        { label: 'سياسة الخصوصية والتواصل', href: '/privacy-policy.html', icon: '🛡️' },
      ],
      open: false,
    },
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  let isOpen = false;
  const openState = {};
  SECTIONS.forEach(s => { openState[s.id] = s.open; });

  // ── Inject CSS ─────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #gs-trigger {
      position: fixed; bottom: 24px; left: 24px; z-index: 9000;
      display: flex; align-items: center; gap: 8px;
      padding: 12px 18px; border-radius: 16px;
      background: rgba(15,23,42,0.82); border: 1px solid rgba(255,255,255,0.1);
      color: #e2e8f0; font-size: 13px; font-weight: 700;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      cursor: pointer; transition: transform .25s, background .25s, border-color .25s;
      font-family: 'Cairo', 'Tajawal', sans-serif; direction: rtl;
      user-select: none;
    }
    #gs-trigger:hover {
      background: rgba(30,41,59,0.92); border-color: rgba(99,102,241,0.5);
      transform: scale(1.05); color: #fff;
    }
    #gs-trigger .gs-icon {
      font-size: 16px; transition: transform .3s;
    }
    #gs-trigger:hover .gs-icon { transform: rotate(15deg); }

    #gs-backdrop {
      position: fixed; inset: 0; z-index: 9001;
      background: rgba(0,0,0,0.52);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      display: none;
    }
    #gs-backdrop.gs-active { display: block; }

    #gs-drawer {
      position: fixed; top: 0; right: 0; height: 100%; width: 320px;
      z-index: 9002;
      background: rgba(2,6,23,0.88);
      backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
      border-left: 1px solid rgba(255,255,255,0.07);
      box-shadow: -16px 0 64px rgba(0,0,0,0.6);
      display: flex; flex-direction: column;
      transform: translateX(100%);
      transition: transform .3s cubic-bezier(0.16,1,0.3,1);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(148,163,184,0.2) transparent;
      direction: rtl;
      font-family: 'Cairo', 'Tajawal', sans-serif;
    }
    #gs-drawer.gs-active { transform: translateX(0); }

    .gs-header {
      position: sticky; top: 0; z-index: 2;
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      background: linear-gradient(to bottom, rgba(2,6,23,1) 60%, transparent);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .gs-header-logo {
      display: flex; align-items: center; gap: 10px;
    }
    .gs-logo-box {
      width: 34px; height: 34px; border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #9333ea);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; box-shadow: 0 4px 12px rgba(99,102,241,0.4);
      flex-shrink: 0;
    }
    .gs-logo-title { color: #fff; font-weight: 900; font-size: 13px; line-height: 1.3; }
    .gs-logo-sub { color: #64748b; font-size: 10px; }
    .gs-close {
      width: 32px; height: 32px; border-radius: 10px;
      border: none; background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #64748b; font-size: 18px; transition: background .2s, color .2s;
    }
    .gs-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

    .gs-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; }

    .gs-section {
      border-radius: 14px; overflow: hidden;
      border: 1px solid transparent;
      transition: all .2s;
    }
    .gs-section-btn {
      width: 100%; display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; background: transparent; border: none; cursor: pointer;
      text-align: right; transition: background .15s;
    }
    .gs-section-btn:hover { background: rgba(255,255,255,0.05); }
    .gs-section-title-wrap { display: flex; align-items: center; gap: 10px; }
    .gs-section-icon { font-size: 14px; flex-shrink: 0; }
    .gs-section-title { font-size: 11.5px; font-weight: 700; }
    .gs-chevron { font-size: 12px; color: #475569; transition: transform .2s; }
    .gs-chevron.open { transform: rotate(180deg); }

    .gs-links { padding: 0 8px 8px; display: flex; flex-direction: column; gap: 2px; }
    .gs-link {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 10px;
      color: #94a3b8; font-size: 11.5px; font-weight: 500;
      text-decoration: none; transition: background .15s, color .15s;
    }
    .gs-link:hover { background: rgba(255,255,255,0.07); color: #fff; }
    .gs-link-icon { font-size: 14px; flex-shrink: 0; }
    .gs-link-label { flex: 1; line-height: 1.4; }
    .gs-link-arrow { font-size: 10px; color: #334155; opacity: 0; transition: opacity .15s; }
    .gs-link:hover .gs-link-arrow { opacity: 0.6; }

    .gs-footer {
      padding: 14px 20px;
      border-top: 1px solid rgba(255,255,255,0.06);
      text-align: center; color: #334155; font-size: 10px;
    }

    @media (max-width: 480px) {
      #gs-drawer { width: 290px; }
      #gs-trigger span { display: none; }
      #gs-trigger { padding: 12px; border-radius: 50%; }
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM ──────────────────────────────────────────────────────────────
  // Trigger
  const trigger = document.createElement('button');
  trigger.id = 'gs-trigger';
  trigger.setAttribute('aria-label', 'فتح فهرس المنصة السريع');
  trigger.innerHTML = `<span class="gs-icon">🧭</span><span>فهرس المنصة</span>`;

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'gs-backdrop';

  // Drawer
  const drawer = document.createElement('nav');
  drawer.id = 'gs-drawer';
  drawer.setAttribute('aria-label', 'الشريط الجانبي للمنصة');

  // Header
  const header = document.createElement('div');
  header.className = 'gs-header';
  header.innerHTML = `
    <div class="gs-header-logo">
      <div class="gs-logo-box">🧭</div>
      <div>
        <div class="gs-logo-title">فهرس المنصة السريع</div>
        <div class="gs-logo-sub">منصة المحامي الرقمية 2026</div>
      </div>
    </div>
    <button class="gs-close" id="gs-close-btn" aria-label="إغلاق">✕</button>
  `;

  // Body
  const body = document.createElement('div');
  body.className = 'gs-body';

  SECTIONS.forEach(section => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'gs-section';
    sectionEl.style.border = `1px solid ${section.borderColor}`;
    sectionEl.style.background = section.bg;

    // Section button
    const btn = document.createElement('button');
    btn.className = 'gs-section-btn';
    btn.innerHTML = `
      <div class="gs-section-title-wrap">
        <span class="gs-section-icon">●</span>
        <span class="gs-section-title" style="color:${section.color}">${section.title}</span>
      </div>
      <span class="gs-chevron ${openState[section.id] ? 'open' : ''}">▼</span>
    `;

    // Links container
    const linksEl = document.createElement('div');
    linksEl.className = 'gs-links';
    linksEl.style.display = openState[section.id] ? 'flex' : 'none';

    section.links.forEach(link => {
      const a = document.createElement('a');
      a.className = 'gs-link';
      a.href = link.href;
      a.innerHTML = `
        <span class="gs-link-icon">${link.icon}</span>
        <span class="gs-link-label">${link.label}</span>
        <span class="gs-link-arrow">↗</span>
      `;
      a.addEventListener('click', () => closeDrawer());
      linksEl.appendChild(a);
    });

    btn.addEventListener('click', () => {
      openState[section.id] = !openState[section.id];
      const chevron = btn.querySelector('.gs-chevron');
      if (chevron) chevron.classList.toggle('open', openState[section.id]);
      linksEl.style.display = openState[section.id] ? 'flex' : 'none';
    });

    sectionEl.appendChild(btn);
    sectionEl.appendChild(linksEl);
    body.appendChild(sectionEl);
  });

  // Footer
  const footer = document.createElement('div');
  footer.className = 'gs-footer';
  footer.textContent = '© 2026 منصة المحامي الرقمية — mohamidigital.online';

  drawer.appendChild(header);
  drawer.appendChild(body);
  drawer.appendChild(footer);

  // ── Mount ──────────────────────────────────────────────────────────────────
  function mount() {
    document.body.appendChild(trigger);
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    trigger.addEventListener('click', openDrawer);
    backdrop.addEventListener('click', closeDrawer);
    document.getElementById('gs-close-btn').addEventListener('click', closeDrawer);
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
