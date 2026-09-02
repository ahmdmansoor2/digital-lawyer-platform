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
  { href: '/about.html', label: '⚖️ عن منصة المحامي الرقمية', key: 'about' },
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
    <>
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
            ) : (
              <a href="/" className="uh-cta" onClick={handleCtaClick}>
                <span>🚀 دخول التطبيق</span>
              </a>
            )}
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

      {/* ── الشريط الإخباري القضائي العاجل (Live Legal Ticker) ── */}
      <aside className="uh-ticker-wrap" aria-label="شريط الرصد القضائي والتشريعي العاجل">
        <div className="uh-ticker-badge">
          <span className="uh-ticker-dot" />
          <span>⚖️ رصد المحامي 2026</span>
        </div>
        <div className="uh-ticker-track">
          <div className="uh-ticker-content">
            <span className="uh-ticker-item">📜 <strong>الجريدة الرسمية:</strong> سريان القرارات المنظمة لتأسيس الشركات الرقمية وخدمات التقاضي الإلكتروني الموحد 2026</span>
            <span className="uh-ticker-sep">◆</span>
            <span className="uh-ticker-item">⚖️ <strong>أحدث مبادئ النقض:</strong> ضوابط صحة إعلان أوراق المحضرين وانقضاء الدعوى في جرائم الشيكات والضمان</span>
            <span className="uh-ticker-sep">◆</span>
            <span className="uh-ticker-item">🕌 <strong>محاكم الأسرة:</strong> استقرار دوائر الاستئناف على آليات التحري البنكي في تقدير نفقات الصغار والأقارب</span>
            <span className="uh-ticker-sep">◆</span>
            <span className="uh-ticker-item">🏠 <strong>الشهر العقاري:</strong> اعتماد الرفع المساحي الرقمي وخفض مدة التسجيل العقاري طبقاً للقانون 9 لسنة 2022</span>
            <span className="uh-ticker-sep">◆</span>
            <span className="uh-ticker-item">💼 <strong>قانون العمل الجديد:</strong> حظر الفصل التعسفي واحتساب مكافأة نهاية الخدمة بواقع أجر نصف شهر عن كل سنة</span>
            <span className="uh-ticker-sep">◆</span>
            <span className="uh-ticker-item">📜 <strong>الجريدة الرسمية:</strong> سريان القرارات المنظمة لتأسيس الشركات الرقمية وخدمات التقاضي الإلكتروني الموحد 2026</span>
            <span className="uh-ticker-sep">◆</span>
            <span className="uh-ticker-item">⚖️ <strong>أحدث مبادئ النقض:</strong> ضوابط صحة إعلان أوراق المحضرين وانقضاء الدعوى في جرائم الشيكات والضمان</span>
          </div>
        </div>
      </aside>
    </>
  );
}
