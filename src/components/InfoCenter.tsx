/**
 * InfoCenter — مركز المعلومات
 * الصفحة الأولى بعد تسجيل الدخول
 * تعرض صفحات المنصة الرسمية + اختصارات للتطبيق
 */

import React from 'react';
import { LogOut, ArrowLeft, Scale, Sparkles, Briefcase, Calendar, FileText, Calculator, BookOpen, MessageCircle, Shield, Radio, ShieldCheck } from 'lucide-react';

interface InfoCenterProps {
  userName?: string;
  onEnterApp: () => void;
  onLogout: () => void;
}

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
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden" dir="rtl">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-32 right-1/3 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          opacity: 0.4,
        }} />
      </div>

      {/* Top bar — Unified Premium Navbar */}
      <header className="relative z-10 sticky top-0" style={{
        background: 'rgba(15,23,42,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(148,163,184,0.15)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '74px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}>⚖️</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>منصة المحامي الرقمية</span>
              <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 800, marginTop: '2px' }}>نظام إدارة مكاتب المحاماة</span>
            </div>
          </a>

          {/* Nav links */}
          <nav className="hidden lg:flex" style={{ alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
            {[
              { href: '/', label: 'الرئيسية' },
              { href: '/features.html', label: 'المميزات' },
              { href: '/legal-library.html', label: 'المكتبة القانونية' },
              { href: '/pillars/', label: 'المراجع القانونية' },
              { href: '/blog/', label: 'المدونة' },
              { href: '/about.html', label: 'عن المنصة' },
              { href: '/pricing.html', label: 'مجانية بالكامل' },
              { href: '/contact.html', label: 'تواصل معنا' },
            ].map(link => (
              <a key={link.href} href={link.href} style={{
                fontSize: '13px', fontWeight: 700, color: '#94a3b8',
                textDecoration: 'none', padding: '6px 10px', borderRadius: '8px',
                transition: 'color 0.2s, background 0.2s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color='#a5b4fc'; (e.currentTarget as HTMLAnchorElement).style.background='rgba(99,102,241,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color='#94a3b8'; (e.currentTarget as HTMLAnchorElement).style.background='transparent'; }}
              >{link.label}</a>
            ))}
          </nav>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {userName && (
              <span className="hidden md:block" style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>مرحباً، {userName}</span>
            )}
            <button
              onClick={onEnterApp}
              style={{
                padding: '8px 18px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                color: '#fff', fontSize: '12px', fontWeight: 900,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform='translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform='translateY(0)'; }}
            >دخول التطبيق 🚀</button>
            <button
              onClick={onLogout}
              style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.2)',
                color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
              }}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color='#f87171'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(239,68,68,0.4)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color='#94a3b8'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(148,163,184,0.2)'; }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
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
            <button
              onClick={onEnterApp}
              className="group bg-white text-indigo-700 hover:bg-slate-50 font-black text-base md:text-lg px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-all hover:scale-105 cursor-pointer"
            >
              <span>دخول التطبيق</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
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
