/**
 * SiteHeader — الشريط العلوي الزجاجي الفاخر 2026 (نسخة React)
 * شريط متناسق وأنيق خالي من الأزرار الزائدة مع أسماء الأقسام الجديدة
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
  { href: '/download.html', label: '💻 تحميل البرنامج', key: 'download' },
  { href: '/legal-consultations.html', label: '🤖 المستشار الذكي', key: 'consultations' },
  { href: '/real-estate.html', label: '🏢 التسويق العقاري', key: 'real-estate' },
  { href: '/legal-library.html', label: '📚 المكتبة الكبرى', key: 'library' },
  { href: '/contract-generator.html', label: '⚡ صانع العقود', key: 'generator' },
  { href: '/legal-calculators.html', label: '🧮 الحاسبات', key: 'calculators' },
  { href: '/blog/', label: '📰 المدونة', key: 'blog' },
];

const MORE = [
  { href: '/court-precedents.html', label: '⚖️ موسوعة النقض', key: 'precedents' },
  { href: '/pillars/', label: '🏛️ المراجع والأكواد التشريعية', key: 'pillars' },
  { href: '/legal-forms.html', label: '📝 صيغ العقود والدعاوي', key: 'forms' },
  { href: '/saudi-legal-hub.html', label: '🇸🇦 بوابة السعودية والعمل', key: 'saudi' },
  { href: '/uae-legal-hub.html', label: '🇦🇪 بوابة الإمارات والتحكيم', key: 'uae' },
  { href: '/kuwait-legal-hub.html', label: '🇰🇼 بوابة الكويت والتركات', key: 'kuwait' },
  { href: '/qatar-legal-hub.html', label: '🇶🇦 بوابة قطر للعدالة', key: 'qatar' },
  { href: '/oman-legal-hub.html', label: '🇴🇲 بوابة سلطنة عُمان', key: 'oman' },
  { href: '/bahrain-legal-hub.html', label: '🇧🇭 بوابة مملكة البحرين', key: 'bahrain' },
  { href: '/citizen-complaints.html', label: '📢 شكاوى وبلاغات المواطنين', key: 'complaints' },
  { href: '/lawyers-directory.html', label: '👨‍⚖️ دليل المحامين المعتمدين', key: 'lawyers' },
  { href: '/company-incorporation.html', label: '🏢 تأسيس الشركات والتراخيص', key: 'companies' },
  { href: '/courts-directory.html', label: '🏛️ دليل المحاكم والشهر العقاري', key: 'courts' },
  { href: '/legal-radar.html', label: '🔍 رصد المحامي والجريدة الرسمية', key: 'radar' },
  { href: '/privacy.html', label: '🔐 سياسة الخصوصية والأمان', key: 'privacy' },
  { href: '/contact.html', label: '📬 تواصل معنا', key: 'contact' },
];

export default function SiteHeader({ activeKey = 'home', onEnterApp, userName, onLogout }: SiteHeaderProps) {
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

  const isAuth = Boolean(userName && onLogout);

  const handleCtaClick = (e: React.MouseEvent) => {
    if (onEnterApp) {
      e.preventDefault();
      onEnterApp();
    }
  };

  return (
    <header className={`uh-bar${scrolled ? ' scrolled' : ''}`} id="siteHeader">
      <div className="uh-inner">
        <a href="/" className="uh-logo" aria-label="المحامي الرقمي">
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

          {/* أزرار حساب المستخدم للجوال داخل القائمة */}
          <div className="uh-mobile-auth" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', paddingTop: '10px', flexDirection: 'column', gap: '8px' }}>
            {userName && onLogout ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>المستخدم المسجل:</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>👤 {userName}</span>
                </div>
                {onEnterApp && (
                  <button
                    type="button"
                    className="uh-cta"
                    onClick={(e) => {
                      setMobileOpen(false);
                      handleCtaClick(e);
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    💼 الانتقال إلى لوحة التحكم
                  </button>
                )}
                <button
                  type="button"
                  className="uh-cta uh-cta--ghost"
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                  style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.12)' }}
                >
                  🚪 تسجيل الخروج (تبديل الحساب)
                </button>
              </>
            ) : onEnterApp ? (
              <button
                type="button"
                className="uh-cta"
                onClick={(e) => {
                  setMobileOpen(false);
                  handleCtaClick(e);
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                🔑 دخول المنصة / حساب جديد
              </button>
            ) : null}
          </div>
        </nav>

        <div className="uh-actions">
          {/* نسخة سطح المكتب */}
          {userName && onLogout ? (
            <div className="uh-auth-desktop">
              <span
                style={{
                  color: '#e2e8f0',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  maxWidth: '130px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={userName}
              >
                👤 {userName}
              </span>
              {onEnterApp && (
                <button
                  type="button"
                  className="uh-cta"
                  onClick={handleCtaClick}
                  style={{ padding: '7px 14px', fontSize: '12.5px' }}
                  title="الانتقال إلى لوحة التحكم والتطبيقات"
                >
                  💼 لوحة التحكم
                </button>
              )}
              <button
                type="button"
                className="uh-cta uh-cta--ghost"
                onClick={onLogout}
                style={{
                  padding: '7px 14px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  background: 'rgba(239, 68, 68, 0.12)'
                }}
                title="تسجيل الخروج واختيار حساب آخر"
              >
                🚪 خروج
              </button>
            </div>
          ) : onEnterApp ? (
            <button
              type="button"
              className="uh-cta uh-auth-desktop"
              onClick={handleCtaClick}
              style={{ padding: '7px 16px', fontSize: '13px' }}
              title="دخول المنصة أو إنشاء حساب"
            >
              🔑 دخول المنصة
            </button>
          ) : null}

          {/* زر خروج سريع للجوال في الشريط العلوي */}
          {userName && onLogout ? (
            <button
              type="button"
              className="uh-burger uh-auth-mobile-quick"
              onClick={onLogout}
              title="تسجيل الخروج"
              style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)' }}
            >
              🚪
            </button>
          ) : onEnterApp ? (
            <button
              type="button"
              className="uh-burger uh-auth-mobile-quick"
              onClick={handleCtaClick}
              title="تسجيل الدخول"
              style={{ borderColor: 'rgba(99, 102, 241, 0.4)', color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)' }}
            >
              🔑
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
