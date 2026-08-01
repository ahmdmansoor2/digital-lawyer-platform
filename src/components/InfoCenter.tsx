/**
 * InfoCenter — مركز المعلومات
 * الصفحة الأولى بعد تسجيل الدخول
 * تعرض صفحات المنصة الرسمية + اختصارات للتطبيق
 */

import React from 'react';
import { LogOut, ArrowLeft, Scale, Sparkles, Briefcase, Calendar, FileText, Calculator, BookOpen, MessageCircle, Shield } from 'lucide-react';

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
    href: '/contact.html?from=app',
    label: 'تواصل معنا',
    desc: 'لأي استفسار أو دعم فني، فريقنا متاح للمساعدة عبر البريد الإلكتروني',
    icon: MessageCircle,
    tone: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    bgGlow: 'rgba(245,158,11,0.25)',
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

      {/* Top bar */}
      <header className="relative z-10 border-b border-slate-800/60 backdrop-blur-xl bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black text-base leading-tight">منصة المحامي الرقمية</p>
              <p className="text-[11px] text-emerald-400 font-bold">مركز المعلومات</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userName && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-slate-400">مرحباً</span>
                <span className="text-sm font-bold text-slate-100">{userName}</span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-xl bg-slate-800/60 hover:bg-red-950/40 border border-slate-700/60 hover:border-red-800/60 text-slate-400 hover:text-red-400 flex items-center justify-center transition cursor-pointer"
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
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
