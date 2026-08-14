import React, { useState } from 'react';
import PublicThemeToggle from './PublicThemeToggle';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  Menu,
  Scale,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

interface PublicLandingPageProps {
  onEnterApp?: () => void;
}

const features = [
  { icon: FileText, title: 'إدارة القضايا', description: 'تنظيم ملفات القضايا والمذكرات والمهام في مساحة عمل واحدة.' },
  { icon: Users, title: 'الموكلون والزيارات', description: 'حفظ بيانات الموكلين وسجل الزيارات والاستشارات بطريقة مرتبة.' },
  { icon: CalendarDays, title: 'الجلسات والتنبيهات', description: 'متابعة الجلسات والمواعيد والإجراءات القادمة بوضوح.' },
  { icon: BookOpen, title: 'المكتبة القانونية', description: 'الوصول إلى مراجع وصيغ وأدوات قانونية مصممة للمحامي المصري.' },
];

const benefits = [
  'واجهة عربية مخصصة لاحتياجات مكاتب المحاماة في مصر',
  'حفظ محلي للبيانات مع أدوات التصدير والاستعادة',
  'تعمل من المتصفح مع توفر إصدار سطح مكتب لنظام Windows',
];

export default function PublicLandingPage({ onEnterApp }: PublicLandingPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const enterApp = onEnterApp || (() => { window.location.href = '/app'; });

  return (
    <div dir="rtl" className="public-site public-landing-page min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <header className="public-header sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 shadow-lg shadow-slate-950/10 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/" className="flex min-w-0 items-center gap-3" aria-label="الصفحة الرئيسية لمنصة المحامي الرقمية">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-950/50 sm:h-11 sm:w-11">
              <Scale className="h-5 w-5 text-white sm:h-6 sm:w-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-white sm:text-base">منصة المحامي الرقمية</span>
              <span className="block truncate text-[10px] text-slate-400 sm:text-xs">إدارة مكتب المحاماة بوضوح</span>
            </span>
          </a>

          <nav className="public-header-nav hidden items-center gap-5 text-xs font-bold text-slate-300 md:flex" aria-label="التنقل الرئيسي">
            <a href="/features.html" className="transition hover:text-white">المميزات</a>
            <a href="/about.html" className="transition hover:text-white">عن المنصة</a>
            <a href="/blog/" className="transition hover:text-white">المدونة</a>
            <a href="/contact.html" className="transition hover:text-white">تواصل معنا</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <PublicThemeToggle />
            <button type="button" onClick={enterApp} className="hidden items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500 sm:inline-flex">
              دخول المنصة
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:bg-white/10 md:hidden"
              aria-label={mobileNavOpen ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileNavOpen && (
            <div className="public-mobile-nav absolute inset-x-4 top-full rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur-xl md:hidden">
              <nav className="flex flex-col gap-1 text-sm font-bold text-slate-200" aria-label="التنقل للجوال">
                <a href="/features.html" className="rounded-xl px-3 py-3 transition hover:bg-white/10 hover:text-white">المميزات</a>
                <a href="/about.html" className="rounded-xl px-3 py-3 transition hover:bg-white/10 hover:text-white">عن المنصة</a>
                <a href="/blog/" className="rounded-xl px-3 py-3 transition hover:bg-white/10 hover:text-white">المدونة</a>
                <a href="/contact.html" className="rounded-xl px-3 py-3 transition hover:bg-white/10 hover:text-white">تواصل معنا</a>
                <button type="button" onClick={enterApp} className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black text-white transition hover:bg-indigo-500">
                  دخول المنصة
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="relative isolate border-b border-white/10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.2),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.16),transparent_32%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold text-indigo-200">
                <ShieldCheck className="h-4 w-4" />
                مساحة عمل عربية للمحامي المصري
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.2] tracking-tight text-white sm:text-5xl lg:text-6xl">
                نظم مكتبك القانوني
                <span className="block bg-gradient-to-l from-indigo-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">من مكان واحد</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                منصة المحامي الرقمية تساعدك على إدارة القضايا والموكلين والجلسات والمكتبة القانونية بواجهة عربية واضحة، مع أدوات تساعدك على حفظ بيانات عملك وتنظيمه.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={enterApp} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:bg-indigo-500">
                  ابدأ من داخل المنصة
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <a href="/features.html" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-sm font-bold text-slate-200 transition hover:bg-white/10">
                  استعرض المميزات
                </a>
              </div>
              <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl sm:p-7">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" aria-hidden="true" />
              <div className="relative rounded-3xl border border-white/10 bg-slate-900/90 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400">لوحة مكتب المحاماة</p>
                    <p className="mt-1 text-lg font-black text-white">نظرة سريعة على عملك</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><Scale className="h-5 w-5" /></span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ['القضايا النشطة', '24', 'text-indigo-300'],
                    ['جلسات قادمة', '08', 'text-amber-300'],
                    ['الموكلون', '61', 'text-emerald-300'],
                    ['المهام المفتوحة', '13', 'text-purple-300'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                      <p className="text-[11px] text-slate-500">{label}</p>
                      <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                  <p className="text-xs font-bold text-emerald-300">ابدأ بمساحة عملك</p>
                  <p className="mt-1 text-xs leading-6 text-slate-400">سجّل الدخول من مسار المنصة للوصول إلى أدواتك وبياناتك.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">أدوات عملية</p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">كل ما تحتاجه لإدارة يومك القانوني</h2>
            <p className="mt-4 leading-8 text-slate-400">تصفح المميزات أولاً، ثم انتقل إلى المنصة عندما تكون مستعداً لتسجيل الدخول والعمل.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-white/[0.06]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-base font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-slate-900/60">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div>
              <h2 className="text-2xl font-black text-white">هل تريد الدخول إلى مساحة عملك؟</h2>
              <p className="mt-2 text-sm text-slate-400">تسجيل الدخول متاح داخل المنصة من خلال المسار المخصص لها.</p>
            </div>
            <button type="button" onClick={enterApp} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-indigo-500">دخول المنصة <ArrowLeft className="h-4 w-4" /></button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 منصة المحامي الرقمية</p>
          <div className="flex flex-wrap gap-4">
            <a href="/privacy.html" className="transition hover:text-slate-300">الخصوصية</a>
            <a href="/terms.html" className="transition hover:text-slate-300">الشروط والأحكام</a>
            <a href="/contact.html" className="transition hover:text-slate-300">تواصل معنا</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
