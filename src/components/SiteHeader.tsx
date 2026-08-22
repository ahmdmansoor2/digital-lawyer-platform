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
  { href: '/legal-consultations.html', label: '💬 طلب استشارة', key: 'consultations' },
  { href: '/lawyers-directory.html', label: '👨‍⚖️ دليل المحامين', key: 'lawyers' },
  { href: '/blog/', label: '📰 المدونة القانونية', key: 'blog' },
  { href: '/pillars/', label: '🏛️ المراجع الشاملة', key: 'pillars' },
  { href: '/legal-forms.html', label: '📝 صيغ العقود والدعاوي', key: 'forms' },
  { href: '/legal-radar.html', label: '🔍 رصد المحامي', key: 'radar' },
  { href: '/legal-calculators.html', label: '🧮 الحاسبات القانونية', key: 'calculators' },
];

const MORE = [
  { href: '/legal-consultations.html', label: '💬 الاستشارات القانونية الفورية', key: 'consultations_more' },
  { href: '/lawyers-directory.html', label: '👨‍⚖️ دليل وتسجيل المحامين المشتغلين', key: 'lawyers_more' },
  { href: '/courts-directory.html', label: '🏛️ دليل المحاكم والشهر العقاري', key: 'courts' },
  { href: '/court-precedents.html', label: '⚖️ بنك مبادئ محكمة النقض', key: 'precedents' },
  { href: '/company-incorporation.html', label: '💼 تأسيس الشركات والتراخيص', key: 'companies' },
  { href: '/legal-diagnostics.html', label: '🔍 تشخيص النزاع القضائي', key: 'diagnostics' },
  { href: '/about.html', label: '⚖️ عن المنصة', key: 'about' },
  { href: '/features.html', label: '⚡ المميزات الكاملة', key: 'features' },
  { href: '/pricing.html', label: '🎁 الأسعار — مجاني 100%', key: 'pricing' },
  { href: '/why-trust-us.html', label: '🛡️ لماذا تثق بنا', key: 'trust' },
  { href: '/privacy.html', label: '🔐 سياسة الخصوصية', key: 'privacy' },
  { href: '/terms.html', label: '📜 الشروط والأحكام', key: 'terms' },
  { href: '/disclaimer.html', label: '⚠️ إخلاء المسؤولية', key: 'disclaimer' },
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
