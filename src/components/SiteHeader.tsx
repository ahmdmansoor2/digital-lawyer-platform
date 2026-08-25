/**
 * SiteHeader — الشريط العلوي الزجاجي 2026 (نسخة React)
 * يستخدم نفس كلاسات .uh-* في public/header.css (يُحمَّل عبر index.html).
 * لا يظهر في لوحة التحكم (AppLayout) — فقط صفحات الموقع.
 */

import React, { useEffect, useState } from 'react';

interface SiteHeaderProps {
  activeKey?: string;
  variant?: 'default' | 'login';
  onEnterApp?: () => void;
  userName?: string;
  onLogout?: () => void;
}

const PRIMARY = [
  { href: '/', label: '🏠 الرئيسية', key: 'home' },
  { href: '/legal-consultations.html', label: '💬 استشارة فورية', key: 'consultations' },
  { href: '/lawyers-directory.html', label: '👨‍⚖️ دليل المحامين', key: 'lawyers' },
  { href: '/legal-forms.html', label: '📝 صيغ العقود', key: 'forms' },
  { href: '/pillars/', label: '🏛️ المراجع والأكواد', key: 'pillars' },
  { href: '/blog/', label: '📰 المدونة', key: 'blog' },
];

const MORE = [
  { href: '/citizen-complaints.html', label: '📢 بوابة شكاوى وبلاغات المواطنين', key: 'complaints' },
  { href: '/e-justice-services.html', label: '🏛️ التقاضي والخدمات القضائية الرقمية', key: 'ejustice' },
  { href: '/legal-radar.html', label: '🔍 رصد المحامي الذكي', key: 'radar' },
  { href: '/legal-calculators.html', label: '🧮 الحاسبات القانونية', key: 'calculators' },
  { href: '/court-precedents.html', label: '⚖️ بنك مبادئ محكمة النقض', key: 'precedents' },
  { href: '/courts-directory.html', label: '🏛️ دليل المحاكم والشهر العقاري', key: 'courts' },
  { href: '/company-incorporation.html', label: '💼 تأسيس الشركات والتراخيص', key: 'companies' },
  { href: '/legal-diagnostics.html', label: '🔍 تشخيص النزاع القضائي', key: 'diagnostics' },
  { href: '/about.html', label: '⚖️ عن المنصة', key: 'about' },
  { href: '/editorial-policy.html', label: '📋 معايير النشر والتحرير', key: 'editorial' },
  { href: '/features.html', label: '⚡ المميزات الكاملة', key: 'features' },
  { href: '/pricing.html', label: '🎁 الأسعار — مجاني 100%', key: 'pricing' },
  { href: '/why-trust-us.html', label: '🛡️ لماذا تثق بنا', key: 'trust' },
  { href: '/privacy.html', label: '🔐 سياسة الخصوصية', key: 'privacy' },
  { href: '/terms.html', label: '📜 الشروط والأحكام', key: 'terms' },
  { href: '/contact.html', label: '📬 تواصل معنا', key: 'contact' },
];

export default function SiteHeader({ activeKey, variant = 'default', onEnterApp, userName, onLogout }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen && !moreOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      const nav = document.getElementById('headerNav');
      const burger = document.getElementById('uhBurger');
      const more = document.getElementById('uhMore');
      if (moreOpen && more && !more.contains(t)) setMoreOpen(false);
      if (mobileOpen && nav && burger && !nav.contains(t) && !burger.contains(t)) setMobileOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [mobileOpen, moreOpen]);

  const showCta = variant !== 'login';
  const isAuth = Boolean(userName && onLogout);

  return (
    <header className={`uh-bar${scrolled ? ' scrolled' : ''}`} id="siteHeader">
      <div className="uh-inner">
        <a href="/" className="uh-logo" aria-label="منصة المحامي الرقمية">
          <span className="uh-badge">⚖️</span>
          <span className="uh-brand">
            <span className="uh-title">المحامي الرقمي</span>
            <span className="uh-sub">مساعدك القانوني الذكي · مجاناً</span>
          </span>
        </a>

        <nav className={`uh-nav${mobileOpen ? ' active' : ''}`} id="headerNav" role="navigation" aria-label="القائمة الرئيسية">
          {PRIMARY.map((l) => (
            <a key={l.href} href={l.href} className={`uh-link${activeKey === l.key ? ' active' : ''}`}>
              {l.label}
            </a>
          ))}
          <div className={`uh-more${moreOpen ? ' open' : ''}`} id="uhMore">
            <button
              className="uh-more-btn"
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="true"
              onClick={(e) => {
                e.stopPropagation();
                setMoreOpen((v) => !v);
              }}
            >
              <span>المزيد</span>
              <span className="uh-caret">▾</span>
            </button>
            <div className="uh-menu">
              {MORE.map((l) => (
                <a key={l.href} href={l.href} className={`uh-menu-item${activeKey === l.key ? ' active' : ''}`}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        <div className="uh-actions">
          <button
            type="button"
            className="uh-cta uh-cta--ghost"
            style={{ padding: '7px 11px', fontSize: '0.85rem' }}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-mohami-search'));
            }}
            title="البحث في المنصة (Ctrl+K)"
            aria-label="بحث"
          >
            <span>🔍</span>
          </button>
          <button
            type="button"
            className="uh-cta uh-cta--ghost"
            style={{ padding: '7px 12px', fontSize: '0.82rem', borderColor: 'rgba(99, 102, 241, 0.4)' }}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('toggle-mohami-sidebar'));
            }}
            title="فتح فهرس المنصة الشامل"
          >
            <span>🧭 الفهرس</span>
          </button>
          {isAuth ? (
            <button type="button" className="uh-cta uh-cta--ghost" onClick={onLogout}>
              <span>خروج · {userName}</span>
            </button>
          ) : showCta ? (
            <button type="button" className="uh-cta" onClick={onEnterApp}>
              <span>🚀 دخول التطبيق</span>
            </button>
          ) : null}
          <button
            className="uh-burger"
            id="uhBurger"
            type="button"
            aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileOpen}
            aria-controls="headerNav"
            onClick={() => {
              setMobileOpen((v) => !v);
              if (mobileOpen) setMoreOpen(false);
            }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </header>
  );
}
