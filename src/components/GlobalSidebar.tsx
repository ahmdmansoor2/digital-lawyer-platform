/**
 * GlobalSidebar.tsx - شريط جانبي زجاجي فاخر ذكي فائق السلاسة
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  X,
  Globe,
  Users,
  Gavel,
  BookOpen,
  Newspaper,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LogIn,
} from 'lucide-react';

interface SidebarLink {
  label: string;
  href: string;
  icon: string;
  isApp?: boolean;
}

interface SidebarSection {
  id: string;
  title: string;
  color: string;
  borderColor: string;
  bgColor: string;
  Icon: React.ComponentType<{ className?: string }>;
  links: SidebarLink[];
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'gulf',
    title: 'بوابات الدول والخدمات الإقليمية',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/5',
    Icon: Globe,
    links: [
      { label: 'مصر — المنصة الرئيسية', href: '/', icon: '🇪🇬' },
      { label: 'المملكة العربية السعودية', href: '/saudi-legal-hub.html', icon: '🇸🇦' },
      { label: 'دولة الإمارات العربية المتحدة', href: '/uae-legal-hub.html', icon: '🇦🇪' },
      { label: 'دولة قطر', href: '/qatar-legal-hub.html', icon: '🇶🇦' },
      { label: 'سلطنة عمان', href: '/oman-legal-hub.html', icon: '🇴🇲' },
    ],
  },
  {
    id: 'citizens',
    title: 'خدمات واستشارات المواطنين',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/5',
    Icon: Users,
    links: [
      { label: 'الاستشارات القانونية الفورية', href: '/legal-consultations.html', icon: '💬' },
      { label: 'شكاوى وبلاغات المواطنين', href: '/citizen-complaints.html', icon: '📢' },
      { label: 'التقاضي الإلكتروني والخدمات القضائية', href: '/e-justice-services.html', icon: '🏛️' },
      { label: 'تشخيص النزاع القضائي الذكي', href: '/legal-diagnostics.html', icon: '🔍' },
      { label: 'دليل المحاكم والشهر العقاري', href: '/courts-directory.html', icon: '🗺️' },
    ],
  },
  {
    id: 'lawyers',
    title: 'أدوات ومنظومة المحامين',
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    bgColor: 'bg-indigo-500/5',
    Icon: Gavel,
    links: [
      { label: 'دخول نظام إدارة القضايا والمكاتب', href: '#enter-app', icon: '🚀', isApp: true },
      { label: 'دليل وتسجيل المحامين', href: '/lawyers-directory.html', icon: '👨‍⚖️' },
      { label: 'موسوعة صيغ العقود والدعاوى', href: '/legal-forms.html', icon: '📝' },
      { label: 'بوابة الحاسبات القانونية', href: '/legal-calculators.html', icon: '🧮' },
      { label: 'دليل تأسيس الشركات (GAFI)', href: '/company-incorporation.html', icon: '💼' },
      { label: 'مميزات المنظومة الكاملة', href: '/features.html', icon: '⚡' },
    ],
  },
  {
    id: 'library',
    title: 'الموسوعات والأكواد ومبادئ النقض',
    color: 'text-violet-400',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-violet-500/5',
    Icon: BookOpen,
    links: [
      { label: 'بنك مبادئ محكمة النقض الكبرى', href: '/court-precedents.html', icon: '⚖️' },
      { label: 'المراجع والأكواد التشريعية الشاملة', href: '/pillars/', icon: '📚' },
      { label: 'رصد المحامي والجريدة الرسمية', href: '/legal-radar.html', icon: '📡' },
    ],
  },
  {
    id: 'blog',
    title: 'المدونة والتعريف بالمنصة',
    color: 'text-pink-400',
    borderColor: 'border-pink-500/30',
    bgColor: 'bg-pink-500/5',
    Icon: Newspaper,
    links: [
      { label: 'المدونة القانونية (+140 مقال)', href: '/blog/', icon: '📰' },
      { label: 'الميزات والتعريف بالمنصة', href: '/features.html', icon: '🎬' },
      { label: 'سياسة الخصوصية والتواصل', href: '/privacy.html', icon: '🛡️' },
    ],
  },
];

interface GlobalSidebarProps {
  onEnterApp?: () => void;
}

export default function GlobalSidebar({ onEnterApp }: GlobalSidebarProps) {
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    gulf: true,
    citizens: true,
    lawyers: false,
    library: false,
    blog: false,
  });

  useEffect(() => {
    (window as any).__REACT_SIDEBAR_ACTIVE__ = true;

    const handleToggleEvent = () => setOpen(prev => !prev);
    const handleOpenEvent = () => setOpen(true);
    const handleCloseEvent = () => setOpen(false);

    window.addEventListener('toggle-mohami-sidebar', handleToggleEvent);
    window.addEventListener('open-mohami-sidebar', handleOpenEvent);
    window.addEventListener('close-mohami-sidebar', handleCloseEvent);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('toggle-mohami-sidebar', handleToggleEvent);
      window.removeEventListener('open-mohami-sidebar', handleOpenEvent);
      window.removeEventListener('close-mohami-sidebar', handleCloseEvent);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleLinkClick = useCallback((link: SidebarLink) => {
    if (link.isApp && onEnterApp) {
      onEnterApp();
    }
    setOpen(false);
  }, [onEnterApp]);

  return (
    <>
      {/* Floating Trigger Button (Explicit Right side) */}
      <button
        type="button"
        id="global-sidebar-trigger"
        onClick={() => setOpen(prev => !prev)}
        aria-label="فتح فهرس المنصة السريع"
        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900/95 hover:bg-slate-800 border border-white/20 hover:border-indigo-400 text-white text-sm font-bold shadow-2xl shadow-black/80 backdrop-blur-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          left: 'auto',
          zIndex: 999990,
          direction: 'rtl'
        }}
      >
        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Compass className="w-4 h-4" />
        </div>
        <span className="font-bold text-xs sm:text-sm">فهرس المنصة</span>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[999998] bg-black/65 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Glass Drawer Container */}
      <aside
        role="navigation"
        aria-label="الشريط الجانبي للمنصة"
        dir="rtl"
        className="fixed top-0 h-full w-[330px] max-w-[85vw] z-[999999] flex flex-col bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl transition-all duration-300 ease-out select-none"
        style={{
          right: open ? '0px' : '-360px',
          boxShadow: open ? '-12px 0 40px rgba(0, 0, 0, 0.85)' : 'none',
          visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 bg-slate-900/70 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm leading-tight">فهرس المنصة الشامل</h3>
              <p className="text-slate-400 text-[10.5px]">منصة المحامي الرقمية 2026</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="إغلاق الفهرس"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Sections */}
        <div 
          className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(148,163,184,0.3) transparent',
          }}
        >
          {SIDEBAR_SECTIONS.map((section) => {
            const isExpanded = expandedSections[section.id];
            const SectionIcon = section.Icon;
            return (
              <div 
                key={section.id} 
                className={`rounded-xl border ${section.borderColor} ${section.bgColor} overflow-hidden transition-all duration-200`}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3.5 py-3 text-right hover:bg-white/5 transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <SectionIcon className={`w-4 h-4 ${section.color} flex-shrink-0`} />
                    <span className={`text-xs font-bold ${section.color}`}>{section.title}</span>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  }
                </button>

                {isExpanded && (
                  <div className="pb-2.5 px-2 space-y-1">
                    {section.links.map((link) => (
                      <a
                        key={link.href + link.label}
                        href={link.isApp ? '#' : link.href}
                        onClick={(e) => {
                          if (link.isApp) e.preventDefault();
                          handleLinkClick(link);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-all duration-150 group cursor-pointer"
                      >
                        <span className="text-sm flex-shrink-0">{link.icon}</span>
                        <span className="flex-1 leading-snug">{link.label}</span>
                        {link.isApp
                          ? <LogIn className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          : <ExternalLink className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 bg-slate-900/40 border-t border-white/10 text-center">
          <p className="text-slate-500 text-[10px] leading-relaxed">
            © 2026 منصة المحامي الرقمية — mohamidigital.online
          </p>
        </div>
      </aside>
    </>
  );
}
