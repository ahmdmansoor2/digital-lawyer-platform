/**
 * GlobalSidebar.tsx - شريط جانبي زجاجي فاخر يغطي كافة أقسام المنصة
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
      { label: 'سياسة الخصوصية والتواصل', href: '/privacy-policy.html', icon: '🛡️' },
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
    citizens: false,
    lawyers: false,
    library: false,
    blog: false,
  });
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

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
      {/* Floating Trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="فتح فهرس المنصة السريع"
        className="fixed bottom-6 start-6 z-[9000] flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-indigo-400/40 text-slate-200 hover:text-white text-sm font-bold shadow-xl shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:scale-105 group"
        style={{ direction: 'rtl' }}
      >
        <Compass className="w-5 h-5 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
        <span className="hidden sm:inline">فهرس المنصة</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[9001] bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Glass Drawer */}
      <div
        ref={drawerRef}
        role="navigation"
        aria-label="الشريط الجانبي للمنصة"
        dir="rtl"
        className="fixed top-0 end-0 h-full w-80 z-[9002] flex flex-col bg-slate-950/85 backdrop-blur-2xl border-s border-white/8 shadow-2xl shadow-black/60 transition-transform duration-300 ease-out"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          overflowY: 'auto',
          scrollbarWidth: 'thin' as const,
          scrollbarColor: 'rgba(148,163,184,0.2) transparent',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent border-b border-white/6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-tight">فهرس المنصة السريع</p>
              <p className="text-slate-400 text-[10px]">منصة المحامي الرقمية 2026</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="إغلاق القائمة"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 px-3 py-3 space-y-2">
          {SIDEBAR_SECTIONS.map((section) => {
            const isExpanded = expandedSections[section.id];
            const SectionIcon = section.Icon;
            return (
              <div key={section.id} className={`rounded-xl border ${section.borderColor} ${section.bgColor} overflow-hidden transition-all duration-200`}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3.5 py-3 text-right hover:bg-white/5 transition-colors duration-200"
                >
                  <div className="flex items-center gap-2.5">
                    <SectionIcon className={`w-4 h-4 ${section.color} flex-shrink-0`} />
                    <span className={`text-xs font-bold ${section.color}`}>{section.title}</span>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  }
                </button>

                {isExpanded && (
                  <div className="pb-2 px-2 space-y-0.5">
                    {section.links.map((link) => (
                      <a
                        key={link.href + link.label}
                        href={link.isApp ? '#' : link.href}
                        onClick={(e) => {
                          if (link.isApp) e.preventDefault();
                          handleLinkClick(link);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/8 text-xs font-medium transition-all duration-150 group"
                      >
                        <span className="text-sm flex-shrink-0">{link.icon}</span>
                        <span className="flex-1 leading-snug">{link.label}</span>
                        {link.isApp
                          ? <LogIn className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          : <ExternalLink className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-60 transition-opacity" />
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
        <div className="px-5 py-4 border-t border-white/6 mt-auto">
          <p className="text-slate-600 text-[10px] text-center leading-relaxed">
            © 2026 منصة المحامي الرقمية — mohamidigital.online
          </p>
        </div>
      </div>
    </>
  );
}
