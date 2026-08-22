/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * InfoCenter — البوابة والموقع الرئيسي لمنصة المحامي الرقمية
 * تصميم حديث وشامل 2026 يجمع الفيديو التعريفي والبطاقات الزجاجية الفاخرة
 */

import React, { useState } from 'react';
import { 
  Scale, 
  Sparkles, 
  Briefcase, 
  Calendar, 
  FileText, 
  Calculator, 
  BookOpen, 
  Library, 
  MessageCircle, 
  Shield, 
  Radio, 
  ShieldCheck, 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronLeft,
  Zap,
  Globe,
  Award,
  Users,
  Search,
  FileSignature,
  Film
} from 'lucide-react';
import SiteHeader from './SiteHeader';
import InteractiveTourShowcase from './InteractiveTourShowcase';
import PromoVideoPlayer from './PromoVideoPlayer';

interface InfoCenterProps {
  userName?: string;
  onEnterApp: () => void;
  onLogout: () => void;
}

// ── شبكة البطاقات الفاخرة للمميزات والخدمات ─────────────────────────────
const PLATFORM_FEATURES = [
  {
    href: '/e-justice-services.html',
    badge: '🚀 منظومة 2026',
    title: 'التقاضي الإلكتروني والخدمات القضائية الرقمية',
    desc: 'دليلك الإجرائي لرفع الدعاوى القضائية أونلاين، عرائض وبلاغات النيابة العامة، إعلام الوراثة الرقمي، والمحاكم الاقتصادية والشهر العقاري.',
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6, 182, 212, 0.25)',
    tag: 'خدمات مصر الرقمية'
  },
  {
    href: '/legal-consultations.html',
    badge: '🆓 مجاناً للجمهور',
    title: 'استشارات قانونية فورية ذكية',
    desc: 'اطرح سؤالك القانوني واحصل على تكييف وتحليل فوري وفق القانون المصري 2026، مع التوجيه للمحامي المتخصص في محافظتك.',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16, 185, 129, 0.25)',
    tag: 'تكييف فوري مجاني'
  },
  {
    href: '/lawyers-directory.html',
    badge: 'شبكة المحامين',
    title: 'دليل المحامين المشتغلين بمصر',
    desc: 'ابحث عن أفضل محامٍ مشتغل بمحافظتك حسب التخصص ودرجة القيد (نقض، استئناف، ابتدائي) وتواصل مباشرة عبر الواتساب — أو سجّل مكتبك للوصول لآلاف العملاء.',
    icon: Award,
    gradient: 'from-indigo-500 to-purple-600',
    glow: 'rgba(99, 102, 241, 0.25)',
    tag: '27 محافظة مصرية'
  },
  {
    href: '/legal-calculators.html',
    badge: 'بوابة الحاسبات',
    title: '11 حاسبة قانونية وشرعية تفاعلية',
    desc: 'حاسبة المواريث والتركات، النفقات والأسرة، رسوم الشهر العقاري 2026، التصالح، وزيادات الإيجار القديم ومواعيد الطعون.',
    icon: Calculator,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'rgba(245, 158, 11, 0.25)',
    tag: '11 حاسبة ذكية'
  },
  {
    href: '/courts-directory.html',
    badge: 'دليل شامل',
    title: 'دليل المحاكم ومكاتب الشهر العقاري',
    desc: 'عناوين ومقار ودوائر المحاكم الابتدائية والاستئناف ومجلس الدولة والشهر العقاري المطور في كافة المحافظات.',
    icon: Library,
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'rgba(59, 130, 246, 0.25)',
    tag: 'جميع المحافظات'
  },
  {
    href: '/court-precedents.html',
    badge: 'سوابق قضائية',
    title: 'بنك مبادئ محكمة النقض الكبرى',
    desc: 'أهم المبادئ القضائية المستقرة لمحكمة النقض المصرية في الجنائي والمدني والإيجارات والأسرة جاهزة للنسخ المباشر.',
    icon: Scale,
    gradient: 'from-purple-500 to-indigo-600',
    glow: 'rgba(168, 85, 247, 0.25)',
    tag: 'نسخ فوري للمذكرات'
  },
  {
    href: '/company-incorporation.html',
    badge: 'استثمار وأعمال',
    title: 'دليل تأسيس الشركات والتراخيص',
    desc: 'خطوات تأسيس الشركات (LLC، فرد واحد، مساهمة) عبر هيئة الاستثمار GAFI وحاسبة الرسوم الحكومية والأوراق المطلوبة.',
    icon: Briefcase,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16, 185, 129, 0.25)',
    tag: 'هيئة الاستثمار GAFI'
  },
  {
    href: '/legal-diagnostics.html',
    badge: 'تشخيص ذكي',
    title: 'المساعد الذكي لتشخيص النزاع القضائي',
    desc: 'أداة ذكية لتشخيص مشكلتك وتحديد نوع الدعوى والمحكمة المختصة نوعياً ومحلياً والمستندات والمواعيد الحاكمة فوراً.',
    icon: Search,
    gradient: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6, 182, 212, 0.25)',
    tag: 'تشخيص فوري مجاني'
  },
  {
    href: '/legal-forms.html',
    badge: 'موسوعة الصيغ',
    title: 'صيغ العقود والدعاوى الجاهزة',
    desc: 'أكثر من 2,690 صيغة قانونية ونموذج عقد وصحيفة دعوى ومذكرة دفاع جاهزة للنسخ والتحميل المباشر.',
    icon: FileSignature,
    gradient: 'from-indigo-500 to-purple-600',
    glow: 'rgba(99, 102, 241, 0.25)',
    tag: 'Word + PDF'
  },
  {
    href: '/pillars/',
    badge: 'المراجع التخصصية',
    title: 'المراجع القانونية وأدلة التقاضي',
    desc: 'شروح تفصيلية شاملة في القانون المدني، الجنائي، العمل 2026، الشهر العقاري، والمرافعات.',
    icon: BookOpen,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'rgba(244, 63, 94, 0.25)',
    tag: '15+ دليل شامل'
  },
  {
    href: '/features.html',
    badge: 'إدارة متكاملة',
    title: 'إدارة ملفات القضايا والموكلين',
    desc: 'تنظيم قضايا المكتب وأرقام الدوائر ومواعيد الجلسات وأوراق المحضرين في منظومة سحابية واحدة.',
    icon: Briefcase,
    gradient: 'from-purple-500 to-pink-600',
    glow: 'rgba(168, 85, 247, 0.25)',
    tag: 'توفير 70% من الوقت'
  },
  {
    href: '/pricing.html',
    badge: 'بدون أي رسوم',
    title: 'مجاني بالكامل 100% للمحامين',
    desc: 'لا توجد خطط مدفوعة أو رسوم اشتراك خفية — متاح مجاناً لكافة المحامين والمستشارين المصريين.',
    icon: Sparkles,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16, 185, 129, 0.25)',
    tag: 'مجاني مدى الحياة'
  },
  {
    href: '/blog/',
    badge: 'محتوى متجدد',
    title: 'المدونة القانونية الإجرائية',
    desc: 'مقالات ونشرات دورية ترصد أحدث التعديلات التشريعية وتطبيقات المحاكم العملية.',
    icon: BookOpen,
    gradient: 'from-pink-500 to-rose-600',
    glow: 'rgba(236, 72, 153, 0.25)',
    tag: '+130 مقال'
  },
  {
    href: '/legal-radar.html',
    badge: 'رصد فوري',
    title: 'رصد المحامي والترندات القانونية',
    desc: 'متابعة تلقائية ومباشرة لأبرز التساؤلات والقضايا الأكثر بحثاً وتداولاً في الشارع القانوني.',
    icon: Radio,
    gradient: 'from-rose-500 to-red-600',
    glow: 'rgba(244, 63, 94, 0.25)',
    tag: 'Google Trends'
  },
  {
    href: '/why-trust-us.html',
    badge: 'حماية كاملة',
    title: 'الخصوصية والأمان السحابي المشفر',
    desc: 'بيانات موكليك وقضاياك محمية بأعلى معايير التشفير الرقمي مع خيارات النسخ الاحتياطي الفوري.',
    icon: ShieldCheck,
    gradient: 'from-emerald-500 to-green-600',
    glow: 'rgba(16, 185, 129, 0.25)',
    tag: 'تشفير 256-bit'
  }
];

export default function InfoCenter({ userName, onEnterApp, onLogout }: InfoCenterProps) {
  const [quickCalcAmount, setQuickCalcAmount] = useState<number>(100000);
  const [activeTabTool, setActiveTabTool] = useState<'fees' | 'features'>('features');

  // حساب تقديري للرسوم القضائية في المعاينة السريعة
  const estimatedFees = Math.round(quickCalcAmount * 0.05 + 150);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden" dir="rtl">
      
      {/* High-Resolution Court Atmosphere Background Image with Parallax */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transform scale-100 transition-transform duration-1000"
        style={{ 
          backgroundImage: `url('/images/legal-bg.jpg')`,
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center top'
        }}
      />

      {/* Smart Dual-Layer Veil (حجاب زجاجي شفاف متناسق يُظهر تفاصيل الصورة بوضوح مع حماية التباين) */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-950/65 via-slate-950/50 to-slate-950/80 pointer-events-none backdrop-blur-[0.5px]" />

      {/* Dynamic Background Ambient Orbs */}
      <div className="ambient-glow-indigo -top-20 -right-20 opacity-40 z-0" />
      <div className="ambient-glow-purple top-1/3 -left-20 opacity-30 z-0" />
      <div className="ambient-glow-emerald bottom-20 right-10 opacity-25 z-0" />

      {/* Global Unified Header */}
      <div className="relative z-20">
        <SiteHeader activeKey="home" onEnterApp={onEnterApp} userName={userName} onLogout={onLogout} />
      </div>

      {/* ─── 1. HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative z-10 pt-10 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-6 backdrop-blur-md shadow-lg shadow-indigo-950/40 animate-pulse">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>المنظومة الرقمية الشاملة لمكاتب المحاماة في مصر 2026</span>
        </div>

        {/* Grand Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.25] max-w-4xl mx-auto text-white mb-6">
          إدارة مكاتب المحاماة والبحث القانوني{' '}
          <span className="bg-gradient-to-l from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            بذكاء واحترافية فائقة
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8 font-normal">
          منظومة سحابية ومحلية متكاملة تجمع <strong className="text-white">إدارة ملفات القضايا والجلسات</strong>، 
          إنذار <strong className="text-white">أوراق المحضرين</strong>، حاسبات المواريث والرسوم، 
          والمكتبة القانونية الشاملة في واجهة واحدة موحدة.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
          <button
            onClick={onEnterApp}
            className="btn-shimmer-cta px-7 py-3.5 text-sm sm:text-base flex items-center gap-2.5 shadow-xl shadow-indigo-600/30 cursor-pointer"
          >
            <span>دخول المنصة والتطبيق مجاناً</span>
            <ArrowLeft className="w-5 h-5" />
          </button>

          <a
            href="/legal-forms.html"
            className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/15 hover:border-indigo-500/50 text-slate-200 hover:text-white font-bold text-sm sm:text-base transition-all flex items-center gap-2 shadow-lg backdrop-blur-md cursor-pointer"
          >
            <FileSignature className="w-5 h-5 text-indigo-400" />
            <span>صيغ العقود والدعاوي</span>
          </a>
        </div>

        {/* Trust Points */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 font-medium pb-4 border-b border-slate-800/80 max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>مجاني 100% بدون اشتراك</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>تشفير وأمان محلي وسحابي</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>مطابق لقانون المرافعات المصري</span>
          </div>
        </div>

        {/* ─── HERO INTERACTIVE PRODUCT TOUR SHOWCASE (أولاً) ─────────── */}
        <div id="interactive-tour">
          <InteractiveTourShowcase onEnterApp={onEnterApp} />
        </div>

      </section>

      {/* ─── 2. LIVE METRICS COUNTER BAR ────────────────────────────────── */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-2xl">
          
          <div className="text-center p-3 border-e border-slate-800/80 last:border-0">
            <span className="text-2xl sm:text-4xl font-black bg-gradient-to-l from-indigo-400 to-purple-400 bg-clip-text text-transparent block">
              +50,000
            </span>
            <span className="text-xs text-slate-400 font-bold mt-1 block">مادة قانونية وحكم نقض مفهرس</span>
          </div>

          <div className="text-center p-3 md:border-e border-slate-800/80">
            <span className="text-2xl sm:text-4xl font-black bg-gradient-to-l from-emerald-400 to-teal-400 bg-clip-text text-transparent block">
              +100
            </span>
            <span className="text-xs text-slate-400 font-bold mt-1 block">صيغة ونموذج عقد معتمد</span>
          </div>

          <div className="text-center p-3 border-e border-slate-800/80 last:border-0">
            <span className="text-2xl sm:text-4xl font-black bg-gradient-to-l from-cyan-400 to-blue-400 bg-clip-text text-transparent block">
              0 جنيه
            </span>
            <span className="text-xs text-slate-400 font-bold mt-1 block">مجاني 100% لجميع المحامين</span>
          </div>

          <div className="text-center p-3">
            <span className="text-2xl sm:text-4xl font-black bg-gradient-to-l from-pink-400 to-rose-400 bg-clip-text text-transparent block">
              100%
            </span>
            <span className="text-xs text-slate-400 font-bold mt-1 block">أمان وخصوصية تامة للبيانات</span>
          </div>

        </div>
      </section>

      {/* ─── 3. PLATFORM VIDEO GUIDE (ثانياً) ────────────────────────────── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10" id="video-guide">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-3 backdrop-blur-md">
            <Film className="w-3.5 h-3.5 text-indigo-400" />
            <span>شرح تعريفي شامل بالمنصة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            فيديو تعريفي بالمنصة: من الفوضى... إلى السيطرة 🎬
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mt-2 font-normal leading-relaxed">
            شرح تفصيلي يقدمه مستشار قانوني يوضح رحلة إدارة وتنظيم مكتب المحاماة والانتقال من زحمة الأوراق إلى هدوء وسيطرة المنظومة الرقمية.
          </p>
        </div>

        <PromoVideoPlayer onEnterApp={onEnterApp} />
      </section>

      {/* ─── 3. ULTRA-GLASS FEATURE CARDS GRID ─────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>باقة الخدمات والأدوات الشاملة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            كل ما تحتاجه لإدارة مكتبك القانوني باحترافية
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mt-2">
            صُممت المنصة خصيصاً لتواكب منظومة العمل القضائي والمحاكم في مصر وتختصر ساعات العمل الروتينية.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLATFORM_FEATURES.map((feat, idx) => {
            const FeatIcon = feat.icon;
            return (
              <a
                key={idx}
                href={feat.href}
                className="group relative p-6 rounded-3xl bg-slate-900/60 hover:bg-slate-900/90 border border-white/10 hover:border-indigo-500/50 backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center text-white shadow-lg ring-1 ring-white/15 group-hover:scale-110 transition-transform`}>
                      <FeatIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800/80 border border-white/10 text-slate-300">
                      {feat.tag}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <span className="text-xs font-bold text-indigo-400 block mb-1">{feat.badge}</span>
                    <h3 className="text-lg font-black text-white group-hover:text-indigo-200 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed font-normal">
                      {feat.desc}
                    </p>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-5 mt-5 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                  <span>استكشف الخدمة</span>
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* ─── 4. LIVE INTERACTIVE CALCULATOR PREVIEW ──────────────────────── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/40 border border-indigo-500/30 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                <Calculator className="w-3.5 h-3.5" />
                <span>معاينة حية فورية</span>
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                حاسبة الرسوم القضائية والمواريث التلقائية
              </h3>
              
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                جرب الحساب التقديري الفوري للرسوم القضائية لرافعي الدعاوى وفقاً لقانون الرسوم القضائية المصري، أو استخدم حاسبة المواريث لتقسيم التركات وتحديد الأنصبة الشرعية بنقرة واحدة.
              </p>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>حساب الرسم النسبي ورسوم الخدمات وصندوق الرعاية</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>توليد تقرير حسابي مفصل جاهز للطباعة والتقديم للمحكمة</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-900/90 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    قيمة المطالبة في الدعوى (بالجنيه المصري):
                  </label>
                  <input
                    type="number"
                    value={quickCalcAmount}
                    onChange={(e) => setQuickCalcAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-indigo-300 block font-medium">الرسم القضائي التقديري:</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {estimatedFees.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                  <button
                    onClick={onEnterApp}
                    className="btn-shimmer-cta text-xs px-4 py-2 rounded-lg cursor-pointer"
                  >
                    فتح الحاسبة الكاملة
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── 5. FINAL CALL TO ACTION ────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center relative z-10">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-8 sm:p-12 shadow-2xl shadow-indigo-600/30 border border-white/20 text-white relative overflow-hidden">
          
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black">
              ابدأ رقمنة مكتبك القانوني اليوم مجاناً
            </h2>
            <p className="text-sm sm:text-base text-indigo-100 max-w-xl mx-auto font-medium leading-relaxed">
              انضم إلى مئات المحامين والمستشارين الذين يثقون في منصة المحامي الرقمية لإدارة قضاياهم ومواعيدهم بأعلى درجات الكفاءة والأمان.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <button
                onClick={onEnterApp}
                className="bg-white text-slate-950 hover:bg-slate-100 px-8 py-3.5 rounded-xl font-black text-sm sm:text-base shadow-xl transition-all hover:scale-105 cursor-pointer"
              >
                دخول التطبيق الآن 🚀
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 6. FOOTER ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 relative z-10">
        <p className="font-semibold text-slate-400">
          منصة المحامي الرقمية © 2026 — المنظومة الشاملة لإدارة مكاتب المحاماة في جمهورية مصر العربية
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-3 text-[11px] text-slate-400">
          <a href="/privacy.html" className="hover:text-indigo-400 transition">سياسة الخصوصية</a>
          <span>•</span>
          <a href="/terms.html" className="hover:text-indigo-400 transition">شروط الاستخدام</a>
          <span>•</span>
          <a href="/contact.html" className="hover:text-indigo-400 transition">تواصل معنا</a>
        </div>
      </footer>

    </div>
  );
}
