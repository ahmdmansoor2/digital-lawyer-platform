/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * InfoCenter — البوابة الوطنية والإقليمية الشاملة لمنصة المحامي الرقمية 2026
 * تغطي مصر ودول الخليج الكبرى (السعودية · الإمارات · قطر · سلطنة عمان) في شبكة كروت تفاعلية
 */

import React, { useEffect, useState } from 'react';
import { 
  Scale, 
  Sparkles, 
  Briefcase, 
  Calendar, 
  FileText, 
  Calculator, 
  BookOpen, 
  MessageCircle, 
  ShieldCheck, 
  ArrowLeft,
  CheckCircle2,
  Zap,
  Globe,
  Award,
  Users,
  Search,
  FileSignature,
  Film,
  Building2,
  Gavel,
  Radio,
  Newspaper
} from 'lucide-react';
import SiteHeader from './SiteHeader';
import InteractiveTourShowcase from './InteractiveTourShowcase';
import PromoVideoPlayer from './PromoVideoPlayer';
import GlobalSidebar from './GlobalSidebar';
import HeroSearchBar from './HeroSearchBar';
import SiteSearchModal from './SiteSearchModal';
import AIAdvisor from './AIAdvisor';
import NotificationCenter from './NotificationCenter';
import NewsletterBox from './NewsletterBox';

interface InfoCenterProps {
  userName?: string;
  onEnterApp: () => void;
  onLogout: () => void;
}

// ── شبكة كافة صفحات وبوابات المنصة الرئيسية الـ 17 ─────────────────────
const ALL_PLATFORM_PORTALS = [
  // ── بوابات الخليج العربي (جديد 2026) ─────────────────────────────
  {
    href: '/saudi-legal-hub.html',
    badge: '🇸🇦 المملكة العربية السعودية',
    title: 'بوابة الأنظمة والخدمات القانونية السعودية 2026',
    desc: 'حاسبة مكافأة نهاية الخدمة وفق نظام العمل السعودي (المادتين 84 و85)، دليل منصة ناجز وديوان المظالم (معين)، وتأسيس الشركات MISA والأنظمة الحديثة.',
    icon: Scale,
    gradient: 'from-emerald-600 to-green-700',
    tag: 'ناجز ونظام العمل 1447هـ',
    category: 'gulf'
  },
  {
    href: '/uae-legal-hub.html',
    badge: '🇦🇪 دولة الإمارات العربية المتحدة',
    title: 'بوابة التشريعات والخدمات القانونية الإماراتية 2026',
    desc: 'حاسبة مستحقات نهاية الخدمة بقانون العمل الاتحادي (مرسوم 33/2021)، بوابات محاكم دبي وأبوظبي، تأسيس الشركات والمناطق الحرة وتعديلات الشيكات.',
    icon: Building2,
    gradient: 'from-blue-600 to-indigo-700',
    tag: 'محاكم دبي والعمل الاتحادي',
    category: 'gulf'
  },
  {
    href: '/qatar-legal-hub.html',
    badge: '🇶🇦 دولة قطر',
    title: 'بوابة التشريعات والخدمات القانونية القطرية 2026',
    desc: 'حاسبة مكافأة نهاية الخدمة بقانون العمل القطري (قانون 14/2004)، بوابة المجلس الأعلى للقضاء، لجان فض المنازعات، وتأسيس الشركات بمركز قطر للمال QFC.',
    icon: Gavel,
    gradient: 'from-rose-600 to-red-800',
    tag: 'المجلس الأعلى للقضاء وQFC',
    category: 'gulf'
  },
  {
    href: '/oman-legal-hub.html',
    badge: '🇴🇲 سلطنة عمان',
    title: 'بوابة الأنظمة والخدمات القانونية العمانية 2026',
    desc: 'حاسبة ذكية لمكافأة نهاية الخدمة تفصل تلقائياً بين النظامين (مرسوما 35/2003 و53/2023) وفق المادة 61 وتعميم وزارة العمل، بوابات المحاكم والنيابة العامة، وتأسيس الشركات عبر Invest Oman والمناطق الحرة.',
    icon: Globe,
    gradient: 'from-green-600 to-emerald-900',
    tag: 'قانون العمل الجديد 53/2023',
    category: 'gulf'
  },

  // ── البوابات والخدمات العامة ──────────────────────────────────────
  {
    href: '/legal-consultations.html',
    badge: '💬 استشارة فورية',
    title: 'بوابة الاستشارات القانونية والتكييف الذكي',
    desc: 'اطرح سؤالك القانوني واحصل على تكييف وتحليل قضائي فوري وفق القوانين المصرية 2026، مع ترشيح أفضل المحامين المتخصصين بمحافظتك.',
    icon: MessageCircle,
    gradient: 'from-emerald-500 to-teal-600',
    tag: 'مجاناً للمواطنين',
    category: 'citizens'
  },
  {
    href: '/lawyers-directory.html',
    badge: '👨‍⚖️ دليل المحامين',
    title: 'دليل المحامين المشتغلين بمصر',
    desc: 'ابحث عن أفضل محامٍ مشتغل بمحافظتك حسب التخصص ودرجة القيد (نقض، استئناف، ابتدائي) وتواصل مباشرة عبر الواتساب — أو سجّل مكتبك بالدليل.',
    icon: Users,
    gradient: 'from-indigo-500 to-purple-600',
    tag: '27 محافظة مصرية',
    category: 'lawyers'
  },
  {
    href: '/e-justice-services.html',
    badge: '🏛️ مصر الرقمية',
    title: 'التقاضي الإلكتروني والخدمات القضائية',
    desc: 'دليلك الإجرائي المباشر لرفع الدعاوى القضائية أونلاين، عرائض وبلاغات النيابة العامة، إعلام الوراثة الرقمي، والمحاكم الاقتصادية.',
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
    tag: 'وزارة العدل والنيابة',
    category: 'citizens'
  },
  {
    href: '/citizen-complaints.html',
    badge: '📢 منظومة الشكاوى',
    title: 'بوابة شكاوى وبلاغات المواطنين الموحدة',
    desc: 'منظومة الشكاوى الحكومية بمجلس الوزراء (shakwa.eg - 16528)، جهاز حماية المستهلك (19588)، تنظيم الاتصالات (155)، ومولد صيغ الشكاوى الرسمي.',
    icon: ShieldCheck,
    gradient: 'from-rose-500 to-pink-600',
    tag: 'مجلس الوزراء 16528',
    category: 'citizens'
  },
  {
    href: '/legal-forms.html',
    badge: '📝 بنك النماذج',
    title: 'موسوعة صيغ العقود والدعاوى المعتمدة',
    desc: 'أكثر من 2,740 صيغة قانونية ونموذج عقد وصحيفة دعوى ومذكرة دفاع مصاغة وفق أحدث القوانين جاهزة للنسخ والتحميل المباشر.',
    icon: FileSignature,
    gradient: 'from-amber-500 to-orange-600',
    tag: '+2,740 صيغة Word',
    category: 'library'
  },
  {
    href: '/legal-calculators.html',
    badge: '🧮 حاسبات تفاعلية',
    title: 'بوابة الحاسبات القانونية والشرعية',
    desc: '11 حاسبة ذكية لرسوم تسجيل العقارات بالشهر العقاري 2026، المواريث والتركات، النفقات الأسرية، تعويضات العمل، ومواعيد وسقوط الطعون.',
    icon: Calculator,
    gradient: 'from-purple-500 to-indigo-600',
    tag: '11 حاسبة ذكية',
    category: 'lawyers'
  },
  {
    href: '/court-precedents.html',
    badge: '⚖️ محكمة النقض',
    title: 'بنك مبادئ وسوابق محكمة النقض الكبرى',
    desc: 'أهم وأحدث المبادئ القضائية المستقرة لدوائر الجنايات والمدني والتجاري والعمال بمحكمة النقض المصرية جاهزة للنسخ في مذكراتك.',
    icon: Scale,
    gradient: 'from-blue-600 to-indigo-700',
    tag: 'أحكام النقض الحديثة',
    category: 'library'
  },
  {
    href: '/courts-directory.html',
    badge: '🏛️ دليل المقار',
    title: 'دليل المحاكم ومكاتب الشهر العقاري',
    desc: 'عناوين ومقار ودوائر محاكم الاستئناف والابتدائية ومجلس الدولة ومأموريات الشهر العقاري المطور في كافة أنحاء الجمهورية.',
    icon: Building2,
    gradient: 'from-slate-600 to-slate-800',
    tag: 'جميع المحافظات',
    category: 'citizens'
  },
  {
    href: '/company-incorporation.html',
    badge: '💼 تأسيس واستثمار',
    title: 'دليل تأسيس الشركات والتراخيص (GAFI)',
    desc: 'خطوات تأسيس الشركات (شخص واحد، ذ.م.م، مساهمة) بهيئة الاستثمار وحاسبة الرسوم الحكومية ونماذج عقود التأسيس المعتمدة.',
    icon: Briefcase,
    gradient: 'from-emerald-600 to-teal-700',
    tag: 'هيئة الاستثمار',
    category: 'lawyers'
  },
  {
    href: '/legal-diagnostics.html',
    badge: '🔍 تشخيص ذكي',
    title: 'المساعد الذكي لتشخيص النزاع القضائي',
    desc: 'أداة تفاعلية لتشخيص مشكلتك وتحديد نوع الدعوى والمحكمة المختصة نوعياً ومحلياً والمستندات المطلوبة والمواعيد الحاكمة فوراً.',
    icon: Search,
    gradient: 'from-cyan-600 to-teal-700',
    tag: 'تشخيص فوري',
    category: 'citizens'
  },
  {
    href: '/legal-radar.html',
    badge: '📡 رصد حي',
    title: 'رصد المحامي والتحليلات القضائية العاجلة',
    desc: 'متابعة لحظية لأحدث القوانين، القرارات الوزارية، وتعديلات التشريعات المصرية الصادرة بالجريدة الرسمية والوقائع المصرية.',
    icon: Radio,
    gradient: 'from-rose-600 to-orange-600',
    tag: 'تحديث يومي مستمر',
    category: 'library'
  },
  {
    href: '/pillars/',
    badge: '📚 الأكواد والمراجع',
    title: 'المراجع القانونية والأكواد التشريعية الشاملة',
    desc: 'نصوص القوانين المصرية كاملة 100% (القانون المدني، العقوبات، الإجراءات الجنائية، قانون العمل الجديد، الإيجارات، والمرافعات).',
    icon: BookOpen,
    gradient: 'from-indigo-600 to-violet-700',
    tag: 'نصوص القوانين كاملة',
    category: 'library'
  },
  {
    href: '/blog/',
    badge: '📰 مقالات متخصصة',
    title: 'المدونة القانونية والرأي والتحليلات',
    desc: 'مئات المقالات القانونية التخصصية التي تشرح القوانين وحقوق المواطنين وإجراءات التقاضي بلغة سهلة ورصينة وموثقة.',
    icon: Newspaper,
    gradient: 'from-purple-600 to-pink-600',
    tag: '+140 مقال معتمد',
    category: 'library'
  },
  {
    href: '/features.html',
    badge: '⚡ المنظومة الذكية',
    title: 'المميزات الكاملة لإدارة مكاتب المحاماة',
    desc: 'استكشف كافة إمكانيات منصة المحامي الرقمية: إدارة القضايا، رول الجلسات، المحضرين، المالية، والأرشفة السحابية الآمنة.',
    icon: Zap,
    gradient: 'from-amber-600 to-red-600',
    tag: 'نظام إدارة متكامل',
    category: 'lawyers'
  }
];

// ── مميزات نظام إدارة مكاتب المحاماة للمحترفين ─────────────────────────
const LAW_FIRM_TOOLS = [
  {
    title: 'إدارة ملفات القضايا والتوكيلات',
    desc: 'تنظيم قضايا المكتب، أرقام الدوائر، والموكلين وسندات الوكالة مع تنبيهات تلقائية بكل جديد.',
    icon: Briefcase,
    color: 'text-indigo-400',
    border: 'hover:border-indigo-500/50'
  },
  {
    title: 'رول الجلسات والإنذار بالمواعيد',
    desc: 'جدول تفاعلي للجلسات اليومية والأسبوعية مع حساب مواعيد الطعون والمدد القانونية تلقائياً.',
    icon: Calendar,
    color: 'text-emerald-400',
    border: 'hover:border-emerald-500/50'
  },
  {
    title: 'تتبع أوراق المحضرين والتنفيذ',
    desc: 'متابعة حركة تسليم واستلام أوراق المحضرين والإنذارات الرسمية وتنفيذ الأحكام القضائية.',
    icon: FileText,
    color: 'text-cyan-400',
    border: 'hover:border-cyan-500/50'
  },
  {
    title: 'المراجع التشريعية وأحكام النقض الكبرى',
    desc: 'وصول فوري لأكبر قاعدة تشريعية تضم نصوص القوانين المصرية كاملة وأحدث مبادئ محكمة النقض.',
    icon: Scale,
    color: 'text-amber-400',
    border: 'hover:border-amber-500/50'
  }
];

export default function InfoCenter({ userName, onEnterApp, onLogout }: InfoCenterProps) {
  const [activeTab, setActiveTab] = useState<'lawyers' | 'citizens'>('lawyers');
  const [portalCategory, setPortalCategory] = useState<'all' | 'gulf' | 'citizens' | 'lawyers' | 'library'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');

  const filteredPortals = ALL_PLATFORM_PORTALS.filter(p => {
    if (portalCategory === 'all') return true;
    return p.category === portalCategory;
  });

  // فتح البحث الكامل من شريط الهيرو أو زر 🔍 في الهيدر أو Ctrl+K
  const openFullSearch = (q?: string) => {
    setSearchInitialQuery(q || '');
    setSearchOpen(true);
  };

  useEffect(() => {
    const onOpenEvent = () => openFullSearch();
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(v => { if (!v) setSearchInitialQuery(''); return true; });
      }
    };
    window.addEventListener('open-mohami-search', onOpenEvent);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('open-mohami-search', onOpenEvent);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen text-slate-100 relative overflow-hidden font-sans select-none" dir="rtl">

      {/* Global Sidebar — شريط التنقل الزجاجي الفاخر */}
      <GlobalSidebar onEnterApp={onEnterApp} />

      {/* Background Poster — Soft Cinematic, Eye-Friendly */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-65 transform scale-100"
        style={{
          backgroundImage: "url('/images/legal-bg.jpg')",
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center top',
          filter: 'contrast(108%) saturate(110%) brightness(90%)'
        }}
      />

      {/* Soft Color-Grade Overlay — Deep Navy with warm glow */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-950/60 via-indigo-950/30 to-slate-950/80 pointer-events-none" />

      {/* Gentle Ambient Lights — Muted Tones */}
      <div className="fixed -top-32 -right-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-indigo-600/12 via-purple-600/8 to-transparent blur-3xl pointer-events-none z-0" />
      <div className="fixed top-1/2 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-600/10 via-blue-700/8 to-transparent blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-indigo-700/10 via-slate-800/5 to-transparent blur-3xl pointer-events-none z-0" />

      {/* Global Unified Header */}
      <div className="relative z-20">
        <SiteHeader activeKey="home" onEnterApp={onEnterApp} userName={userName} onLogout={onLogout} />
      </div>

      {/* ─── شريط البحث الذكي (أسفل الهيدر مباشرة) ───────────────────────── */}
      <div className="relative z-30 pt-5 px-4 sm:px-6 lg:px-8" data-search-section>
        <HeroSearchBar onOpenFullSearch={openFullSearch} />
      </div>

      {/* ─── 1. GRAND HERO SECTION WITH DUAL-TRACK SWITCHER ──────────────── */}
      <section className="relative z-10 pt-8 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-6 backdrop-blur-md shadow-lg shadow-indigo-950/40">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>المنظومة القانونية والقضائية الرقمية الأولى في مصر والعالم العربي 2026</span>
        </div>

        {/* Grand Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.25] max-w-4xl mx-auto text-white mb-6">
          العدالة الرقمية والخدمات القانونية{' '}
          <span className="bg-gradient-to-l from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            في متناول الجميع
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8 font-normal">
          منصة وطنية وإقليمية متكاملة تدمج <strong className="text-white">نظام إدارة مكاتب المحاماة</strong> للمحترفين، مع <strong className="text-white">بوابات الخدمات القضائية والاستشارات وحاسبات العمل</strong> لمصر والدول الخليجية.
        </p>

        {/* Dual Track Switcher Tabs */}
        <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-900/80 border border-white/15 backdrop-blur-xl shadow-2xl mb-8">
          <button
            onClick={() => setActiveTab('lawyers')}
            className={`px-6 py-2.5 rounded-xl font-extrabold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'lawyers'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/40 scale-102'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gavel className="w-4 h-4" />
            <span>👨‍⚖️ أنا محامٍ / مستشار قانوني</span>
          </button>
          <button
            onClick={() => setActiveTab('citizens')}
            className={`px-6 py-2.5 rounded-xl font-extrabold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'citizens'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/40 scale-102'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 أنا مواطن / صاحب شأن</span>
          </button>
        </div>

        {/* Dynamic Action Buttons depending on Active Tab */}
        {activeTab === 'lawyers' ? (
          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10 animation-fade-in">
            <button
              onClick={onEnterApp}
              className="btn-shimmer-cta px-7 py-3.5 text-sm sm:text-base flex items-center gap-2.5 shadow-xl shadow-indigo-600/30 cursor-pointer"
            >
              <span>🚀 دخول نظام إدارة القضايا مجاناً</span>
              <ArrowLeft className="w-5 h-5" />
            </button>

            <a
              href="/lawyers-directory.html"
              className="px-5 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/15 hover:border-indigo-500/50 text-slate-200 hover:text-white font-bold text-sm sm:text-base transition-all flex items-center gap-2 shadow-lg backdrop-blur-md cursor-pointer"
            >
              <Award className="w-5 h-5 text-indigo-400" />
              <span>تسجيل مكتبك في دليل المحامين</span>
            </a>

            <a
              href="/legal-forms.html"
              className="px-5 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/15 hover:border-indigo-500/50 text-slate-200 hover:text-white font-bold text-sm sm:text-base transition-all flex items-center gap-2 shadow-lg backdrop-blur-md cursor-pointer"
            >
              <FileSignature className="w-5 h-5 text-purple-400" />
              <span>بنك صيغ العقود والدعاوى</span>
            </a>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10 animation-fade-in">
            <a
              href="/legal-consultations.html"
              className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base flex items-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>💬 طلب استشارة قانونية فورية</span>
            </a>

            <a
              href="/lawyers-directory.html"
              className="px-5 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/15 hover:border-emerald-500/50 text-slate-200 hover:text-white font-bold text-sm sm:text-base transition-all flex items-center gap-2 shadow-lg backdrop-blur-md cursor-pointer"
            >
              <Search className="w-5 h-5 text-emerald-400" />
              <span>ابحث عن محامٍ بمحافظتك</span>
            </a>

            <a
              href="/citizen-complaints.html"
              className="px-5 py-3.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 hover:border-rose-400 text-rose-200 hover:text-white font-bold text-sm sm:text-base transition-all flex items-center gap-2 shadow-lg backdrop-blur-md cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 text-rose-400" />
              <span>📢 تقديم شكوى رسمية (مجلس الوزراء)</span>
            </a>
          </div>
        )}

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 font-medium pb-4 border-b border-slate-800/80 max-w-2xl mx-auto">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>مجاني 100% بدون أي رسوم</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>تغطية متكاملة لمصر والدول الخليجية</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>وفق أحدث القوانين والأنظمة 2026</span>
          </div>
        </div>

      </section>

      {/* ─── 2. DEDICATED GULF HUB SHOWCASE (كروت الخليج العربي الثلاثة المستقلة) ── */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-indigo-500/25 backdrop-blur-2xl shadow-2xl">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <span className="text-xs font-black px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-2 mb-3">
              <span>🌍 التغطية الإقليمية المعتمدة 2026</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              البوابات القانونية لدول الخليج العربي
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-2">
              بوابات مستقلة متخصصة تضم حاسبات مكافأة نهاية الخدمة الدقيقة، منصات التقاضي الإلكتروني، وتأسيس الشركات والأنظمة المعتمدة في السعودية والإمارات وقطر وسلطنة عمان.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Card 1: Saudi Arabia */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-b from-emerald-950/60 to-slate-900/90 hover:to-slate-900 border border-emerald-500/30 hover:border-emerald-400 transition-all duration-300 hover:-translate-y-1.5 shadow-xl flex flex-col justify-between">
              <a href="/saudi-legal-hub-en.html" className="absolute -top-1.5 end-3 z-20 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/25 text-emerald-300 hover:text-emerald-100 border border-emerald-500/40 hover:border-emerald-300 hover:bg-emerald-500/35 transition-all shadow-md whitespace-nowrap">🌐 English</a>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">🇸🇦</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    رؤية 2030 ونظام العمل
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors mb-2">
                  بوابة المملكة العربية السعودية
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  حاسبة مكافأة نهاية الخدمة (المادتين 84 و85)، دليل منصة ناجز وديوان المظالم (معين)، الاستثمار وتأسيس الشركات MISA، ونظام المعاملات المدنية.
                </p>
                <div className="space-y-1.5 text-xs text-slate-400 border-t border-emerald-900/60 pt-3">
                  <div className="flex items-center gap-1.5">✓ حاسبة نظام العمل السعودي المحدثة</div>
                  <div className="flex items-center gap-1.5">✓ منصة ناجز وقوى وديوان المظالم</div>
                  <div className="flex items-center gap-1.5">✓ تراخيص الاستثمار الأجنبي MISA</div>
                </div>
              </div>
              <a href="/saudi-legal-hub.html" className="block pt-4 mt-4 border-t border-slate-800 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center justify-between">
                <span>دخول بوابة السعودية</span>
                <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Card 2: UAE */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-b from-blue-950/60 to-slate-900/90 hover:to-slate-900 border border-blue-500/30 hover:border-blue-400 transition-all duration-300 hover:-translate-y-1.5 shadow-xl flex flex-col justify-between">
              <a href="/uae-legal-hub-en.html" className="absolute -top-1.5 end-3 z-20 text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-500/25 text-blue-300 hover:text-blue-100 border border-blue-500/40 hover:border-blue-300 hover:bg-blue-500/35 transition-all shadow-md whitespace-nowrap">🌐 English</a>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">🇦🇪</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    المرسوم بقانون 33/2021
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-blue-300 transition-colors mb-2">
                  بوابة دولة الإمارات العربية المتحدة
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  حاسبة مستحقات نهاية الخدمة بقانون العمل الاتحادي، محاكم دبي وأبوظبي الذكية، تسهيل، تأسيس الشركات بالبر الرئيسي والمناطق الحرة، وقانون الشيكات.
                </p>
                <div className="space-y-1.5 text-xs text-slate-400 border-t border-blue-900/60 pt-3">
                  <div className="flex items-center gap-1.5">✓ حاسبة العمل الإماراتي (21 و 30 يوماً)</div>
                  <div className="flex items-center gap-1.5">✓ محاكم دبي والقضاء الاتحادي وتسهيل</div>
                  <div className="flex items-center gap-1.5">✓ تملك أجنبي 100% والمناطق الحرة</div>
                </div>
              </div>
              <a href="/uae-legal-hub.html" className="block pt-4 mt-4 border-t border-slate-800 text-xs font-bold text-blue-400 group-hover:text-blue-300 flex items-center justify-between">
                <span>دخول بوابة الإمارات</span>
                <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Card 3: Qatar */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-b from-rose-950/60 to-slate-900/90 hover:to-slate-900 border border-rose-500/30 hover:border-rose-400 transition-all duration-300 hover:-translate-y-1.5 shadow-xl flex flex-col justify-between">
              <a href="/qatar-legal-hub-en.html" className="absolute -top-1.5 end-3 z-20 text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-500/25 text-rose-300 hover:text-rose-100 border border-rose-500/40 hover:border-rose-300 hover:bg-rose-500/35 transition-all shadow-md whitespace-nowrap">🌐 English</a>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">🇶🇦</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    قانون العمل رقم 14/2004
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-rose-300 transition-colors mb-2">
                  بوابة دولة قطر
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  حاسبة مكافأة نهاية الخدمة (أجر 3 أسابيع/سنة)، المجلس الأعلى للقضاء، لجان فض المنازعات العمالية، توثيق صك، وتأسيس الشركات بمركز قطر للمال QFC.
                </p>
                <div className="space-y-1.5 text-xs text-slate-400 border-t border-rose-900/60 pt-3">
                  <div className="flex items-center gap-1.5">✓ حاسبة العمل القطري وبدل الإجازات</div>
                  <div className="flex items-center gap-1.5">✓ المجلس الأعلى للقضاء ولجان المنازعات</div>
                  <div className="flex items-center gap-1.5">✓ مركز قطر للمال QFC والنافذة الواحدة</div>
                </div>
              </div>
              <a href="/qatar-legal-hub.html" className="block pt-4 mt-4 border-t border-slate-800 text-xs font-bold text-rose-400 group-hover:text-rose-300 flex items-center justify-between">
                <span>دخول بوابة قطر</span>
                <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Card 4: Oman */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-b from-green-950/60 to-slate-900/90 hover:to-slate-900 border border-green-500/30 hover:border-green-400 transition-all duration-300 hover:-translate-y-1.5 shadow-xl flex flex-col justify-between">
              <a href="/oman-legal-hub-en.html" className="absolute -top-1.5 end-3 z-20 text-[10px] font-black px-2.5 py-1 rounded-full bg-green-500/25 text-green-300 hover:text-green-100 border border-green-500/40 hover:border-green-300 hover:bg-green-500/35 transition-all shadow-md whitespace-nowrap">🌐 English</a>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">🇴🇲</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    قانون العمل الجديد 53/2023
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-green-300 transition-colors mb-2">
                  بوابة سلطنة عمان
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  حاسبة ذكية تفصل تلقائياً بين نظامي المرسومين 35/2003 و53/2023 وفق المادة 61 وتعميم وزارة العمل، بوابات المحاكم والنيابة العامة، وتأسيس الشركات عبر Invest Oman.
                </p>
                <div className="space-y-1.5 text-xs text-slate-400 border-t border-green-900/60 pt-3">
                  <div className="flex items-center gap-1.5">✓ حاسبة ذكية تفصل النظامين بالتاريخ</div>
                  <div className="flex items-center gap-1.5">✓ المحاكم والنيابة العامة ووزارة العمل</div>
                  <div className="flex items-center gap-1.5">✓ Invest Oman والمناطق الحرة الثلاث</div>
                </div>
              </div>
              <a href="/oman-legal-hub.html" className="block pt-4 mt-4 border-t border-slate-800 text-xs font-bold text-green-400 group-hover:text-green-300 flex items-center justify-between">
                <span>دخول بوابة عمان</span>
                <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 3. ALL 17 PLATFORM PORTALS & MAIN PAGES GRID (كافة الصفحات الرئيسية) ─ */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-bold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>دليل كافة أقسام وصفحات المنصة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            بوابات الخدمات القانونية والقضائية الشاملة (17 بوابة)
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mt-2">
            استكشف وتصفح جميع أقسام المنصة الرسمية المصممة لخدمة المواطن والمحامي والمستثمر.
          </p>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPortalCategory('all')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portalCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              🌟 كافة الأقسام (17)
            </button>
            <button
              onClick={() => setPortalCategory('gulf')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portalCategory === 'gulf'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              🌍 بوابات الخليج العربي (3)
            </button>
            <button
              onClick={() => setPortalCategory('citizens')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portalCategory === 'citizens'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              👥 خدمات المواطنين
            </button>
            <button
              onClick={() => setPortalCategory('lawyers')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portalCategory === 'lawyers'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              👨‍⚖️ أدوات المحامين
            </button>
            <button
              onClick={() => setPortalCategory('library')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                portalCategory === 'library'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              📚 المراجع والنقض
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortals.map((portal, idx) => {
            const PortalIcon = portal.icon;
            return (
              <a
                key={idx}
                href={portal.href}
                className="group relative p-7 rounded-3xl bg-slate-900/70 hover:bg-slate-900/95 border border-white/10 hover:border-indigo-500/50 backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Badge & Icon */}
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${portal.gradient} flex items-center justify-center text-white shadow-lg ring-1 ring-white/15 group-hover:scale-110 transition-transform`}>
                      <PortalIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-800/90 border border-white/10 text-slate-200">
                      {portal.tag}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <span className="text-xs font-bold text-indigo-400 block mb-1">{portal.badge}</span>
                    <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-indigo-200 transition-colors">
                      {portal.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed font-normal">
                      {portal.desc}
                    </p>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-5 mt-5 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                  <span>فتح البوابة الآن</span>
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* ─── 4. LAW FIRM MANAGEMENT SYSTEM SHOWCASE (قسم المحامين) ──────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-indigo-500/20 backdrop-blur-2xl shadow-2xl">
          <div className="max-w-3xl mb-8 text-start">
            <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block mb-3">
              💼 للمحامين والمستشارين القانونيين
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              برنامج إدارة مكاتب المحاماة المتكامل (Law Firm OS)
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              وداعاً لدفاتر الجلسات المفقودة وتأخر أوراق المحضرين. منظومة سحابية ومحلية متكاملة تمنحك السيطرة الكاملة على أعمال مكتبك القضائي.
            </p>
          </div>

          {/* 4 Core Lawyer Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {LAW_FIRM_TOOLS.map((tool, i) => {
              const ToolIcon = tool.icon;
              return (
                <div key={i} className={`p-5 rounded-2xl bg-slate-900/60 border border-white/10 ${tool.border} transition-all`}>
                  <ToolIcon className={`w-8 h-8 ${tool.color} mb-3`} />
                  <h4 className="text-sm sm:text-base font-black text-white mb-1.5">{tool.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">{tool.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Interactive Tour & Direct Launch Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">
                ⚖️
              </div>
              <div>
                <h4 className="text-sm font-black text-white">جاهز لتنظيم مكتبك وتجربة المنظومة؟</h4>
                <span className="text-xs text-slate-300">المنصة تعمل فوراً من المتصفح والكمبيوتر بدون أي تثبيت معقد.</span>
              </div>
            </div>

            <button
              onClick={onEnterApp}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <span>دخول المنظومة مجاناً الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Showcase Embedded */}
          <div className="mt-8 pt-8 border-t border-slate-800/80">
            <InteractiveTourShowcase onEnterApp={onEnterApp} />
          </div>
        </div>
      </section>

      {/* ─── 5. METRICS & NATIONAL SCALE BAR ─────────────────────────────── */}
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
              +2,740
            </span>
            <span className="text-xs text-slate-400 font-bold mt-1 block">صيغة ونموذج عقد معتمد</span>
          </div>

          <div className="text-center p-3 border-e border-slate-800/80 last:border-0">
            <span className="text-2xl sm:text-4xl font-black bg-gradient-to-l from-cyan-400 to-blue-400 bg-clip-text text-transparent block">
              4 دول
            </span>
            <span className="text-xs text-slate-400 font-bold mt-1 block">مصر · السعودية · الإمارات · قطر</span>
          </div>

          <div className="text-center p-3">
            <span className="text-2xl sm:text-4xl font-black bg-gradient-to-l from-pink-400 to-rose-400 bg-clip-text text-transparent block">
              0 جنيه
            </span>
            <span className="text-xs text-slate-400 font-bold mt-1 block">مجاني 100% مدى الحياة</span>
          </div>

        </div>
      </section>

      {/* ─── 6. PLATFORM VIDEO GUIDE ────────────────────────────────────── */}
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
            شرح تفصيلي يوضح رحلة إدارة وتنظيم مكتب المحاماة والانتقال من زحمة الأوراق إلى هدوء وسيطرة المنظومة الرقمية.
          </p>
        </div>

        <PromoVideoPlayer onEnterApp={onEnterApp} />
      </section>

      {/* ─── 7. FOOTER ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl py-12 px-4 sm:px-6 lg:px-8 mt-12 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-bold text-slate-400 mb-6">
            <a href="/" className="hover:text-indigo-400 transition-colors">الرئيسية</a>
            <a href="/saudi-legal-hub.html" className="hover:text-emerald-400 transition-colors">🇸🇦 السعودية</a>
            <a href="/uae-legal-hub.html" className="hover:text-blue-400 transition-colors">🇦🇪 الإمارات</a>
            <a href="/qatar-legal-hub.html" className="hover:text-rose-400 transition-colors">🇶🇦 قطر</a>
            <a href="/oman-legal-hub.html" className="hover:text-red-400 transition-colors">🇴🇲 عُمان</a>
            <a href="/legal-consultations.html" className="hover:text-emerald-400 transition-colors">💬 الاستشارات</a>
            <a href="/lawyers-directory.html" className="hover:text-indigo-400 transition-colors">👨‍⚖️ دليل المحامين</a>
            <a href="/e-justice-services.html" className="hover:text-cyan-400 transition-colors">🏛️ التقاضي الإلكتروني</a>
            <a href="/citizen-complaints.html" className="hover:text-rose-400 transition-colors">📢 شكاوى المواطنين</a>
            <a href="/legal-forms.html" className="hover:text-indigo-400 transition-colors">📝 صيغ العقود</a>
            <a href="/legal-calculators.html" className="hover:text-indigo-400 transition-colors">🧮 الحاسبات</a>
            <a href="/blog/" className="hover:text-indigo-400 transition-colors">📰 المدونة</a>
            <a href="/privacy.html" className="hover:text-indigo-400 transition-colors">الخصوصية</a>
            <a href="/contact.html" className="hover:text-indigo-400 transition-colors">تواصل معنا</a>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            © 2026 منصة المحامي الرقمية · المنظومة القانونية والقضائية الشاملة في مصر والعالم العربي · إشراف الأستاذ أحمد منصور (مستشار قانوني)
          </p>
        </div>
      </footer>

      {/* ─── نافذة البحث الكاملة (تُفتح من الشريط أو 🔍 الهيدر أو Ctrl+K) ── */}
      <SiteSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialQuery={searchInitialQuery}
      />

      {/* ─── المستشار الذكي (RAG من محتوى المنصة) ───────────────────────── */}
      <AIAdvisor />

      {/* ─── جرس الإشعارات (الجديد اليومي من المدونة والرادار) ───────────── */}
      <NotificationCenter />

      {/* ─── النشرة البريدية الأسبوعية ────────────────────────────────────── */}
      <NewsletterBox />

    </div>
  );
}
