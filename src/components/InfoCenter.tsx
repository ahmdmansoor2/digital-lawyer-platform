/**
 * InfoCenter — مركز المعلومات
 * الصفحة الأولى بعد تسجيل الدخول
 * تعرض صفحات المنصة الرسمية + اختصارات للتطبيق
 */

import React, { useState } from 'react';
import { LogOut, ArrowLeft, Scale, Sparkles, Briefcase, Calendar, FileText, Calculator, BookOpen, Library, MessageCircle, Shield, Radio, ShieldCheck, Menu, X, LogIn } from 'lucide-react';

interface InfoCenterProps {
  userName?: string;
  onEnterApp: () => void;
  onLogout: () => void;
}

const TOP_NAV: Array<{ href: string; label: string }> = [
  { href: '/about.html?from=app', label: 'عن المنصة' },
  { href: '/features.html?from=app', label: 'المميزات' },
  { href: '/blog/?from=app', label: 'المدونة' },
  { href: '/pillars/?from=app', label: 'المراجع' },
  { href: '/legal-library.html?from=app', label: 'المكتبة' },
  { href: '/contact.html?from=app', label: 'تواصل معنا' },
];

const PAGES = [
  {
    href: '/about.html?from=app',
    label: 'عن المنصة',
    desc: 'تعرّف على قصة ورؤية فريق منصة المحامي الرقمية وكيف بنساعد المحامين المصريين',
    icon: Scale,
    tone: 'indigo',
    gradient: 'from-indigo-500 to-blue-600',
    bgGlow: 'rgba(99,102,241,0.25)',
  },
  {
    href: '/why-trust-us.html?from=app',
    label: 'لماذا تثق بنا',
    desc: 'رؤيتنا ومبادئنا وضماناتنا في حماية بياناتك وتقديم محتوى قانوني موثوق',
    icon: ShieldCheck,
    tone: 'emerald',
    gradient: 'from-emerald-500 to-green-600',
    bgGlow: 'rgba(16,185,129,0.25)',
  },
  {
    href: '/features.html?from=app',
    label: 'المميزات الكاملة',
    desc: 'استعرض جميع مميزات النظام: إدارة القضايا، الجلسات، المحضرين، الحاسبات، والمكتبة',
    icon: Briefcase,
    tone: 'purple',
    gradient: 'from-purple-500 to-pink-600',
    bgGlow: 'rgba(168,85,247,0.25)',
  },
  {
    href: '/pricing.html?from=app',
    label: 'مجاني بالكامل 100%',
    desc: 'تعرّف على خطط الأسعار — خدمة مجانية بالكامل لكل المحامين المصريين بدون أي رسوم',
    icon: Sparkles,
    tone: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    bgGlow: 'rgba(16,185,129,0.25)',
  },
  {
    href: '/blog/?from=app',
    label: 'المدونة القانونية',
    desc: 'نصائح وأدلة قانونية متخصصة لإدارة مكتبك باحترافية — محتوى متجدد كل أسبوعين',
    icon: BookOpen,
    tone: 'cyan',
    gradient: 'from-cyan-500 to-blue-600',
    bgGlow: 'rgba(6,182,212,0.25)',
  },
  {
    href: '/pillars/?from=app',
    label: 'المراجع القانونية الشاملة',
    desc: 'أدلة قانونية متعمّقة في القانون المصري — مرجع شامل للمحامين والمستشارين القانونيين',
    icon: Scale,
    tone: 'indigo',
    gradient: 'from-indigo-500 to-purple-600',
    bgGlow: 'rgba(99,102,241,0.25)',
  },
  {
    href: '/legal-library.html?from=app',
    label: 'المكتبة القانونية والبحث',
    desc: 'مرجع شامل للقوانين المصرية مع بحث متقدم في المواد القانونية — مرجعك الأساسي في كل قضية',
    icon: Library,
    tone: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    bgGlow: 'rgba(59,130,246,0.25)',
  },
  {
    href: '/contact.html?from=app',
    label: 'تواصل معنا',
    desc: 'لأي استفسار أو دعم فني، فريقنا متاح للمساعدة عبر البريد الإلكتروني',
    icon: MessageCircle,
    tone: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    bgGlow: 'rgba(245,158,11,0.25)',
  },
  {
    href: '/legal-radar.html?from=app',
    label: 'رصد المحامي',
    desc: 'أهم الأخبار والترندات الأكثر بحثاً في مصر الآن — تحديث تلقائي حسب ترندات Google',
    icon: Radio,
    tone: 'rose',
    gradient: 'from-rose-500 to-red-600',
    bgGlow: 'rgba(244,63,94,0.25)',
  },
  {
    href: '/legal-forms.html?from=app',
    label: 'صيغ العقود والدعاوي',
    desc: 'نصوص قانونية كاملة: عقود البيع والإيجار وتأسيس الشركات وصحف الدعاوى ومذكرات الدفاع',
    icon: FileText,
    tone: 'cyan',
    gradient: 'from-cyan-500 to-sky-600',
    bgGlow: 'rgba(6,182,212,0.25)',
  },
  {
    href: '/privacy.html?from=app',
    label: 'سياسة الخصوصية',
    desc: 'اطلع على كيفية حماية بياناتك والشروط التي تحكم استخدامك للمنصة',
    icon: Shield,
    tone: 'rose',
    gradient: 'from-rose-500 to-pink-600',
    bgGlow: 'rgba(244,63,94,0.25)',
  },
];

export default function InfoCenter({ userName, onEnterApp, onLogout }: InfoCenterProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isLoggedIn = Boolean(userName);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
      {/* ════════════════════════════════════════════════════════════════════════
          TOP HEADER — شريط علوي ثابت، 3 مناطق: شعار يمين، تنقل وسط، دخول/خروج يسار
          ════════════════════════════════════════════════════════════════════════ */}
      <header className="ic-header sticky top-0 z-50">
        <div className="ic-header-inner">
          {/* المنطقة 1: الشعار في أقصى يمين (طبيعة RTL) */}
          <a href="/about.html?from=app" className="ic-logo" aria-label="الصفحة الرئيسية لمنصة المحامي الرقمية">
            <div className="ic-logo-badge" aria-hidden="true">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div className="ic-logo-text">
              <span className="ic-logo-title">المحامي الرقمي</span>
              <span className="ic-logo-subtitle">منصة المحامي المصرية</span>
            </div>
          </a>

          {/* المنطقة 2: التنقل — يظهر على tablet+ */}
          <nav className="ic-nav" aria-label="التنقل الرئيسي">
            {TOP_NAV.map((item) => (
              <a key={item.href} href={item.href} className="ic-nav-item">
                {item.label}
              </a>
            ))}
          </nav>

          {/* المنطقة 3: أزرار دخول/خروج في أقصى يسار */}
          <div className="ic-actions">
            {isLoggedIn ? (
              <>
                <span className="ic-user-badge" title={userName}>
                  <span className="ic-user-dot" />
                  <span className="ic-user-name">{userName}</span>
                </span>
                <button
                  onClick={onLogout}
                  className="ic-btn ic-btn-logout"
                  aria-label="تسجيل الخروج"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="ic-btn-label">خروج</span>
                </button>
              </>
            ) : (
              <a
                href="/app"
                className="ic-btn ic-btn-login"
                aria-label="تسجيل الدخول"
                title="تسجيل الدخول"
              >
                <LogIn className="w-4 h-4" />
                <span className="ic-btn-label">دخول</span>
              </a>
            )}
            {/* زر hamburger للجوال */}
            <button
              className="ic-mobile-toggle"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={mobileNavOpen ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* قائمة الجوال المنسدلة */}
        {mobileNavOpen && (
          <div className="ic-mobile-nav">
            <nav className="ic-mobile-nav-inner" aria-label="التنقل للجوال">
              {TOP_NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="ic-mobile-nav-item"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-xs font-bold text-indigo-200">أهلاً بك في منصة المحامي الرقمية</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            <span className="bg-gradient-to-l from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              مركز المعلومات
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            تعرّف على المنصة وميزاتها، اقرأ مقالاتنا القانونية، أو ادخل مباشرة إلى لوحة التحكم لإدارة قضاياك وموكليك.
          </p>
        </div>

        {/* Pages grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-10">
          {PAGES.map((page, idx) => {
            const Icon = page.icon;
            return (
              <a
                key={page.href}
                href={page.href}
                target="_self"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 hover:border-slate-700 p-6 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Glow on hover */}
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: page.bgGlow }}
                />

                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${page.gradient} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2 group-hover:text-indigo-200 transition-colors">
                    {page.label}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4 min-h-[3rem]">
                    {page.desc}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 group-hover:gap-3 transition-all">
                    <span>افتح الصفحة</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* CTA to enter app */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 md:p-10 shadow-2xl">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-right">
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2">جاهز لإدارة قضاياك؟</h2>
              <p className="text-white/80 text-sm md:text-base">ادخل إلى لوحة التحكم وابدأ في إدارة مكتبك القانوني</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onEnterApp}
                className="group bg-white text-indigo-700 hover:bg-slate-50 font-black text-base md:text-lg px-8 py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-105 cursor-pointer"
              >
                <span>دخول التطبيق</span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 mt-8">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© 2026 منصة المحامي الرقمية — جميع الحقوق محفوظة</p>
          <p>خدمة مجانية 100% للمحامين المصريين</p>
        </div>
      </footer>
    </div>
  );
}
