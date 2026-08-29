/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * InfoCenter — البوابة الوطنية والإقليمية الشاملة لمنصة المحامي الرقمية 2026
 * تغطي مصر ودول الخليج الكبرى في شبكة كروت مجمعة احترافية (Master Hub Cards) تشمل كافة صفحات وبوابات الموقع 100%
 */

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp,
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
  Newspaper,
  GraduationCap,
  ChevronLeft,
  Play,
  Library,
  Layers,
  MapPin,
  Tag
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

// ── مميزات نظام إدارة مكاتب المحاماة للمحترفين ─────────────────────────
const LAW_FIRM_TOOLS = [
  {
    icon: Briefcase,
    title: 'إدارة القضايا والملفات',
    desc: 'تنظيم إلكتروني كامل لملفات القضايا والدعاوى، أرقام الحصر، أسماء الخصوم، ومحكمة النزاع مع تصنيف ذكي.',
    color: 'text-indigo-400',
    border: 'border-indigo-500/30'
  },
  {
    icon: Calendar,
    title: 'رول الجلسات والأجندة الذكية',
    desc: 'جدول تفاعلي دقيق بمواعيد الجلسات اليومية والأسبوعية، القرارات الصادرة، والتنبيهات التلقائية قبل الموعد.',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30'
  },
  {
    icon: FileText,
    title: 'متابعة أوراق المحضرين',
    desc: 'رصد دقيق لتسليم واستلام الإعلانات والإنذارات وأوراق التنفيذ بمحضرين المحاكم دون أي تأخير.',
    color: 'text-amber-400',
    border: 'border-amber-500/30'
  },
  {
    icon: Calculator,
    title: 'حاسبة الرسوم والمواريث والمدد',
    desc: 'أداة احترافية لحساب رسوم الشهر العقاري 2026، توزيع المواريث والتركات الشرعية، والمدد القانونية ومواعيد الطعن.',
    color: 'text-purple-400',
    border: 'border-purple-500/30'
  }
];

export default function InfoCenter({ userName, onEnterApp, onLogout }: InfoCenterProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'students' | 'library' | 'lawyers' | 'citizens' | 'calculators' | 'gulf' | 'corporate' | 'economic'>('all');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState(false);

  // SEO & Head tags
  useEffect(() => {
    document.title = 'منظومة العدالة القانونية لمصر والوطن العربي — منصة المحامي الرقمية 2026';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'المنصة المتكاملة لإدارة مكاتب المحاماة، المكتبة القانونية المصورة، صيغ العقود والدعاوى، أحكام محكمة النقض، وحاسبات الرسوم ومستحقات العمل وبوابات التقاضي لمصر ودول الخليج.'
      );
    }
  }, []);

  const scrollToVideos = () => {
    const el = document.getElementById('explainerVideosSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-['Cairo',sans-serif] selection:bg-indigo-600 selection:text-white relative overflow-x-hidden" dir="rtl">
      
      {/* Site Header */}
      <SiteHeader 
        userName={userName} 
        onEnterApp={onEnterApp} 
        onLogout={onLogout} 
        onOpenSearch={() => setIsSearchModalOpen(true)}
      />

      {/* Global Right-Side Floating Navigation */}
      <GlobalSidebar 
        onOpenTour={scrollToVideos}
        onOpenVideo={scrollToVideos}
        onOpenAI={() => setIsAIAdvisorOpen(true)}
        onEnterApp={onEnterApp}
      />

      {/* Global AI Advisor Modal */}
      <AIAdvisor 
        isOpen={isAIAdvisorOpen} 
        onOpen={() => setIsAIAdvisorOpen(true)}
        onClose={() => setIsAIAdvisorOpen(false)} 
      />

      {/* Global Site Search Modal */}
      <SiteSearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
      />

      {/* ─── 1. HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative pt-6 pb-8 sm:pt-14 sm:pb-16 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 text-center">
        
        <div className="bg-slate-950/55 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none p-4 sm:p-0 rounded-3xl border border-white/10 sm:border-none shadow-2xl sm:shadow-none mb-6">
          {/* Top Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4 sm:mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 backdrop-blur-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>المنظومة الوطنية والإقليمية الموحدة 2026</span>
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
              <span>✨ مجانية 100% للجميع</span>
            </span>
          </div>

          {/* Hero Title */}
          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.3] sm:leading-[1.2] mb-4 sm:mb-6">
            منظومة العدالة القانونية <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-200 to-emerald-300 drop-shadow-md">
              لمصر والوطن العربي
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xs sm:text-base lg:text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed mb-6 font-medium">
            المنصة المتكاملة <strong className="text-white font-bold">لإدارة مكاتب المحاماة</strong>، و<strong className="text-white font-bold">المكتبة القانونية المصورة</strong>، و<strong className="text-white font-bold">صيغ العقود والدعاوى</strong>، و<strong className="text-white font-bold">أحكام محكمة النقض</strong>، وحاسبات الرسوم ومستحقات العمل وبوابات التقاضي لمصر ودول الخليج.
          </p>

          {/* Hero Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-6 w-full max-w-2xl mx-auto">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Briefcase className="w-5 h-5 shrink-0" />
              <span>دخول برنامج المحامين مجاناً</span>
              <ArrowLeft className="w-4 h-4 shrink-0" />
            </button>

            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <a
                href="/law-students-hub.html"
                className="px-2.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-900/90 text-slate-100 hover:text-white font-bold text-[11px] sm:text-sm border border-blue-500/40 hover:border-blue-400 hover:bg-slate-800/90 transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 shadow-lg text-center"
              >
                <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />
                <span>طلاب الحقوق</span>
              </a>

              <a
                href="/legal-library.html"
                className="px-2.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-900/90 text-slate-100 hover:text-white font-bold text-[11px] sm:text-sm border border-indigo-500/40 hover:border-indigo-400 hover:bg-slate-800/90 transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 shadow-lg text-center"
              >
                <Library className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>المكتبة الكبرى</span>
              </a>

              <button
                onClick={() => setIsAIAdvisorOpen(true)}
                className="px-2.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-emerald-950/70 text-emerald-300 hover:text-emerald-100 font-bold text-[11px] sm:text-sm border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-900/50 transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 shadow-lg cursor-pointer text-center"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>مستشار AI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Live Search Bar */}
        <div className="max-w-3xl mx-auto mb-4 sm:mb-6">
          <HeroSearchBar onOpenFullSearch={() => setIsSearchModalOpen(true)} />
        </div>

        {/* Quick Filter Navigation Tabs (Mobile swipe track / Desktop 2-tier balanced dock) */}
        <div className="max-w-5xl mx-auto mt-2">
          {/* Mobile view: Swipeable track */}
          <div className="flex sm:hidden items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
              }`}
            >
              🌟 كافة المنظومة
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'library'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
              }`}
            >
              📚 المكتبة والموسوعات
            </button>
            <button
              onClick={() => setActiveTab('lawyers')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'lawyers'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
              }`}
            >
              👨‍⚖️ المحامين والمكاتب
            </button>
            <button
              onClick={() => setActiveTab('calculators')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'calculators'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
              }`}
            >
              🧮 الحاسبات القانونية
            </button>
            <button
              onClick={() => setActiveTab('citizens')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'citizens'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
              }`}
            >
              👥 المواطنين والعدالة
            </button>
            <button
              onClick={() => setActiveTab('gulf')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'gulf'
                  ? 'bg-green-700 text-white shadow-lg shadow-green-700/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
              }`}
            >
              🌍 دول الخليج
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'students'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
              }`}
            >
              🎓 طلاب الحقوق
            </button>
            <button
              onClick={() => setActiveTab('corporate')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'corporate'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
              }`}
            >
              🏢 الشركات
            </button>
            <button
              onClick={() => setActiveTab('economic')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'economic'
                  ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/30'
                  : 'bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
              }`}
            >
              📈 الاقتصاد والذهب
            </button>
          </div>

          {/* Desktop & Tablet View: Clean Balanced 2-Tier Glassmorphic Dock */}
          <div className="hidden sm:block p-2 rounded-2xl bg-slate-900/70 border border-white/10 shadow-2xl backdrop-blur-xl">
            {/* Top Tier (5 Core Sectors) */}
            <div className="grid grid-cols-5 gap-1.5 mb-1.5">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer text-center truncate ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 font-black scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                🌟 كافة المنظومة
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer text-center truncate ${
                  activeTab === 'library'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 font-black scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                📚 المكتبة والموسوعات
              </button>
              <button
                onClick={() => setActiveTab('lawyers')}
                className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer text-center truncate ${
                  activeTab === 'lawyers'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 font-black scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                👨‍⚖️ المحامين والمكاتب
              </button>
              <button
                onClick={() => setActiveTab('calculators')}
                className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer text-center truncate ${
                  activeTab === 'calculators'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 font-black scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                🧮 الحاسبات القانونية
              </button>
              <button
                onClick={() => setActiveTab('citizens')}
                className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer text-center truncate ${
                  activeTab === 'citizens'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/40 font-black scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                👥 المواطنين والعدالة
              </button>
            </div>

            {/* Bottom Tier (4 Specialized Sectors Centered) */}
            <div className="grid grid-cols-4 gap-1.5 max-w-3xl mx-auto">
              <button
                onClick={() => setActiveTab('gulf')}
                className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer text-center truncate ${
                  activeTab === 'gulf'
                    ? 'bg-green-700 text-white shadow-md shadow-green-700/40 font-black scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                🌍 دول الخليج
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer text-center truncate ${
                  activeTab === 'students'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 font-black scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                🎓 طلاب الحقوق
              </button>
              <button
                onClick={() => setActiveTab('corporate')}
                className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer text-center truncate ${
                  activeTab === 'corporate'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/40 font-black scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                🏢 الشركات والاستثمار
              </button>
              <button
                onClick={() => setActiveTab('economic')}
                className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all cursor-pointer text-center truncate ${
                  activeTab === 'economic'
                    ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/40 font-black scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                📈 الاقتصاد والذهب
              </button>
            </div>
          </div>
        </div>

      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ─── 2. MASTER HUB CARDS SHOWCASE (الكروت المجمعة الذكية) ───────── */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">

        {/* ── MASTER HUB 2: LEGAL LIBRARY, PRECEDENTS & FORMS (كارت المكتبة والموسوعات والصيغ والنقض) ── */}
        {(activeTab === 'all' || activeTab === 'library') && (
          <section className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-purple-950/60 via-slate-900/90 to-slate-950 border border-purple-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-purple-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-purple-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1.5">
                    <Library className="w-4 h-4 text-purple-400" />
                    <span>📚 المكتبة القانونية والموسوعات التشريعية وصيغ العقود</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    +2,740 صيغة و 19 قانوناً وكتب PDF
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  المكتبة القانونية الرقمية وموسوعات الأكواد وصيغ العقود والنقض
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  أضخم مستودع وموسوعة رقمية للمحامي والباحث: تشمل المكتبة القانونية السحابية للكتب والرسائل (PDF)، نصوص 19 قانوناً مصرياً كاملاً، بنك مبادئ وسوابق محكمة النقض، موسوعة صيغ العقود والدعاوى المعتمدة، والمدونة القانونية.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/legal-library.html"
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <Library className="w-4 h-4" />
                  <span>المكتبة القانونية</span>
                </a>
                <a
                  href="/legal-forms.html"
                  className="px-5 py-3 rounded-2xl bg-slate-850 text-slate-100 hover:text-white font-bold text-xs sm:text-sm border border-purple-500/40 hover:bg-slate-800 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <FileSignature className="w-4 h-4 text-purple-400" />
                  <span>صيغ العقود</span>
                </a>
              </div>
            </div>

            {/* Sub-features Grid (6 Distinctive Portals) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* 1. Legal Library */}
              <a href="/legal-library.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📚</div>
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors mb-1.5">
                    المكتبة القانونية الرقمية الكبرى (PDF)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    مئات أمهات الكتب والموسوعات الفقهية ورسائل الدكتوراه والماجستير بعارض PDF المدمج وقراءة وتحميل فوري عبر السحابة.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-purple-400 flex items-center justify-between">
                  <span>فتح المكتبة القانونية</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 2. Legal Forms & Contracts */}
              <a href="/legal-forms.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📝</div>
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors mb-1.5">
                    موسوعة صيغ العقود والدعاوى المعتمدة
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    أكثر من 2,740 نموذج عقد وصحيفة دعوى ومذكرة دفاع وإنذار رسمي مصاغة طبقاً لأحدث القوانين جاهزة للتنزيل والنسخ بصيغة Word.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-purple-400 flex items-center justify-between">
                  <span>تحميل الصيغ والنماذج</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 3. Legislative Pillars & Codes */}
              <a href="/pillars/" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🏛️</div>
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors mb-1.5">
                    المراجع والأكواد التشريعية الشاملة (19 قانوناً)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    نصوص كاملة لـ 19 قانوناً مصرياً (المدني، الجنائي، الإجراءات، قانون العمل الجديد، المرافعات، الإيجارات، وحماية المستهلك).
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-purple-400 flex items-center justify-between">
                  <span>تصفح الأكواد التشريعية</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 4. Court Precedents */}
              <a href="/court-precedents.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">⚖️</div>
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors mb-1.5">
                    بنك مبادئ وسوابق محكمة النقض الكبرى
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    أهم وأحدث المبادئ القضائية المستقرة لدوائر الجنايات والمدني والتجاري والعمال بمحكمة النقض المصرية جاهزة للنسخ في مذكراتك.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-purple-400 flex items-center justify-between">
                  <span>استعراض أحكام النقض</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 5. Legal Blog */}
              <a href="/blog/" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📰</div>
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors mb-1.5">
                    المدونة القانونية والرأي والتحليلات القضائية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    مئات المقالات القانونية التخصصية التي تشرح القوانين وحقوق المواطنين وإجراءات التقاضي والعمل بلغة موثقة ورصينة.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-purple-400 flex items-center justify-between">
                  <span>تصفح المدونة (+140 مقال)</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 6. Legal Radar */}
              <a href="/legal-radar.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📡</div>
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors mb-1.5">
                    رصد المحامي والجريدة الرسمية والوقائع
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    متابعة لحظية لأحدث القوانين، القرارات الجمهورية والوزارية، وتعديلات التشريعات الصادرة بالجريدة الرسمية.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-purple-400 flex items-center justify-between">
                  <span>استعراض الرصد الحي</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

            </div>
          </section>
        )}

        {/* ── MASTER HUB 3: LAWYERS PROFESSIONAL HUB (كارت المحامين وإدارة المكاتب) ── */}
        {(activeTab === 'all' || activeTab === 'lawyers') && (
          <section className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-indigo-950/60 via-slate-900/90 to-slate-950 border border-indigo-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-indigo-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-indigo-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-indigo-400" />
                    <span>👨‍⚖️ منظومة المحامين والمستشارين وإدارة المكاتب</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    نظام إدارة ودليل 27 محافظة
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  منظومة المحاماة وإدارة المكاتب القضائية المتكاملة
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  بيئة عمل رقمية مصممة للمحامي المصري: تشمل نظام إدارة القضايا والملفات، دليل المحامين المشتغلين المعتمدين بجميع المحافظات، مميزات المنظومة، وباقة الاشتراك المجانية مدى الحياة.
                </p>
              </div>
              <button
                onClick={onEnterApp}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap self-stretch lg:self-auto justify-center cursor-pointer"
              >
                <span>تشغيل برنامج إدارة المكاتب</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div onClick={onEnterApp} className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-indigo-500/20 hover:border-indigo-400 transition-all flex flex-col justify-between cursor-pointer">
                <div>
                  <div className="text-2xl mb-3">💼</div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                    برنامج إدارة المكاتب (Law Firm OS)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    إدارة ملفات القضايا، رول الجلسات، أوراق المحضرين، الموكلين، والتقارير المالية والأرشفة السحابية المشفرة.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-indigo-400 flex items-center justify-between">
                  <span>فتح البرنامج</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>

              <a href="/lawyers-directory.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-indigo-500/20 hover:border-indigo-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">👨‍⚖️</div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                    دليل المحامين المشتغلين بمصر
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    دليل شامل يغطي 27 محافظة مصنفة حسب التخصص ودرجة القيد (نقض، استئناف، ابتدائي) مع التواصل المباشر عبر واتساب.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-indigo-400 flex items-center justify-between">
                  <span>تصفح الدليل أو سجّل مكتبك</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/features.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-indigo-500/20 hover:border-indigo-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">⚡</div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                    المميزات الكاملة لمنظومة المحاماة
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    استكشف بالتفصيل إمكانيات المنصة: جدول الجلسات، أوراق التنفيذ، حفظ التوكيلات، وحاسبات الرسوم.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-indigo-400 flex items-center justify-between">
                  <span>استكشف المميزات</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/pricing.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-indigo-500/20 hover:border-indigo-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🎁</div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                    مجانية بالكامل 100% مدى الحياة
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    لا توجد أي خطط مدفوعة أو رسوم اشتراك، كافة خصائص المنصة متاحة مجاناً لكافة المحامين والطلاب والمواطنين.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-indigo-400 flex items-center justify-between">
                  <span>تفاصيل المجانية</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </section>
        )}

        {/* ── MASTER HUB 4: LEGAL CALCULATORS (كارت الحاسبات القانونية والشرعية) ── */}
        {(activeTab === 'all' || activeTab === 'calculators') && (
          <section className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-emerald-950/60 via-slate-900/90 to-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-emerald-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-emerald-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    <span>🧮 الموسوعة الشاملة للحاسبات القانونية والشرعية 2026</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    14 حاسبة تفاعلية متخصصة
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  بوابة الحاسبات القانونية والشرعية ومواعيد الطعون والعمل
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  أكبر منظومة حسابية قضائية متكاملة لمصر ودول الخليج العربي: تشمل حاسبات الشهر العقاري، المواريث والتركات، مستحقات نهاية الخدمة بمصر والسعودية والإمارات وقطر وعمان، مواعيد وسقوط الطعون، رسوم الدعاوى وتأسيس الشركات والتقدير التراكمي.
                </p>
              </div>
              <a
                href="/legal-calculators.html"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap self-stretch lg:self-auto justify-center"
              >
                <span>دخول بوابة كافة الحاسبات</span>
                <ArrowLeft className="w-4 h-4" />
              </a>
            </div>

            {/* Sub-features Grid (All 12 Calculators Displayed in Full) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              
              {/* 1. Real Estate Registration */}
              <a href="/legal-calculators.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🏠</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    1. رسوم الشهر العقاري 2026
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حساب تكاليف تسجيل الشقق والعقارات طبقاً للقانون 9 لسنة 2022، ضريبة التصرفات العقارية 2.5% ورسوم الرفع المساحي.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>احسب رسوم التسجيل</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 2. Legal Deadlines & Appeals */}
              <a href="/legal-calculators.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">⚖️</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    2. مواعيد وسقوط الطعون والمدد
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حاسبة دقيقة لمواعيد الاستئناف والنقض والمعارضة وقضاء مجلس الدولة مع استبعاد العطلات الرسمية وأيام الجمع والسبت.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>احسب موعد الطعن</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 3. Egypt Labor End of Service */}
              <a href="/legal-calculators.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">💼</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    3. مستحقات العمل وإنهاء الخدمة بمصر
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حساب مكافأة نهاية الخدمة، المقابل النقدي لرصيد الإجازات، وتعويض الفصل التعسفي بقانون العمل المصري رقم 12/2003.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>احسب المستحقات</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 4. Court Fees */}
              <a href="/legal-calculators.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🏛️</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    4. رسوم وتكاليف رفع الدعاوى القضائية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حساب الرسم النسبي، رسم الجدول، الدمغات القضائية، رسم الإعلانات بالمحضرين وأمانات الخبراء بالمحاكم المصرية.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>احسب رسوم الدعوى</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 5. Islamic Inheritance */}
              <div onClick={onEnterApp} className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between cursor-pointer">
                <div>
                  <div className="text-2xl mb-3">🧮</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    5. المواريث وتوزيع التركات الشرعية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    توزيع الأنصبة الشرعية الدقيقة لأصحاب الفروض والعصبات، مع معالجة العول والرد والوصية الواجبة وتفصيل حصة كل وارث.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>حساب التركة الشرعية</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>

              {/* 6. Company Incorporation Fees */}
              <a href="/company-incorporation.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🏢</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    6. رسوم تأسيس الشركات (GAFI)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حساب رسوم تأسيس شركات الأموال والأشخاص، السجل التجاري، الغرفة التجارية، ونشر صحيفة الاستثمار بحسب رأس المال.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>احسب تكلفة التأسيس</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 7. Saudi Labor Calculator */}
              <a href="/saudi-legal-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🇸🇦</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    7. حاسبة العمل السعودي 1447هـ
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حساب مكافأة نهاية الخدمة بنظام العمل السعودي طبقاً للمادتين 84 و 85 لحالات إنهاء العقد والاستقالة وفسخ العقد.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>حاسبة العمل السعودي</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 8. UAE Labor Calculator */}
              <a href="/uae-legal-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🇦🇪</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    8. حاسبة العمل الإماراتي الاتحادي
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حساب مستحقات نهاية الخدمة بقانون العمل الاتحادي (مرسوم بقانون 33/2021) للعقود محددة المدة والقطاع الخاص.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>حاسبة العمل الإماراتي</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 9. Qatar Labor Calculator */}
              <a href="/qatar-legal-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🇶🇦</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    9. حاسبة العمل القطري
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حساب مكافأة نهاية الخدمة بقانون العمل القطري رقم 14 لسنة 2004 وبدلات الإجازات ومستحقات اللجان العمالية.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>حاسبة العمل القطري</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 10. Oman Labor Calculator */}
              <a href="/oman-legal-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🇴🇲</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    10. حاسبة العمل العماني الجديد
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    فصل تلقائي دقيق للمستحقات بين قانوني العمل (35/2003 و 53/2023) طبقاً للمادة 61 وحساب شهر كامل عن كل سنة.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>حاسبة العمل العماني</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 11. GPA & Bar Eligibility */}
              <a href="/law-students-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🎓</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    13. حاسبة التقدير وتنسيق الهيئات
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حساب النسبة المئوية والمجموع التراكمي لطلاب الحقوق والشريعة وشروط القيد بنقابة المحامين وتنسيق القضاء والنيابة.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>احسب النسبة والتقدير</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* 12. Legal Diagnostics */}
              <a href="/legal-diagnostics.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🔍</div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    14. تشخيص الاختصاص القضائي والميعاد
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    تحليل آلي للنزاع لتحديد المحكمة المختصة نوعياً ومحلياً (جزئي، ابتدائي، اقتصادي، مجلس دولة) والمستندات المطلوبة.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 flex items-center justify-between">
                  <span>تشخيص الاختصاص</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

            </div>
          </section>
        )}

        {/* ── MASTER HUB 5: CITIZENS & E-JUSTICE HUB (كارت المواطنين والعدالة والشكاوى) ── */}
        {(activeTab === 'all' || activeTab === 'citizens') && (
          <section className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-teal-950/60 via-slate-900/90 to-slate-950 border border-teal-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-teal-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-teal-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span>👥 خدمات المواطنين والعدالة الرقمية والشكاوى الرسمية</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    استشارات وشكاوى رسمية
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  بوابة خدمات المتقاضين والمواطنين والشكاوى الحكومية
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  خدمات قانونية متكاملة لجمهور المواطنين: منصة الاستشارات والتكييف القضائي الفوري، منظومة الشكاوى والبلاغات الرسمية لمجلس الوزراء وحماية المستهلك، وبوابة التقاضي الإلكتروني ودليل المحاكم.
                </p>
              </div>
              <a
                href="/legal-consultations.html"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 text-white font-extrabold text-sm shadow-xl shadow-teal-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap self-stretch lg:self-auto justify-center"
              >
                <span>طلب استشارة قانونية فورية</span>
                <ArrowLeft className="w-4 h-4" />
              </a>
            </div>

            {/* Sub-features Grid (5 Distinctive Portals) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <a href="/legal-consultations.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-teal-500/20 hover:border-teal-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">💬</div>
                  <h3 className="text-sm font-black text-white group-hover:text-teal-300 transition-colors mb-1.5">
                    الاستشارات والتكييف الذكي
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    اطرح سؤالك القانوني واحصل على تكييف وتحليل قضائي فوري مع ترشيح أفضل المحامين المتخصصين بمحافظتك.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-teal-400 flex items-center justify-between">
                  <span>استشر الآن</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/citizen-complaints.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-teal-500/20 hover:border-teal-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📢</div>
                  <h3 className="text-sm font-black text-white group-hover:text-teal-300 transition-colors mb-1.5">
                    منظومة الشكاوى الرسمية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    مجلس الوزراء (shakwa.eg - 16528)، جهاز حماية المستهلك (19588)، تنظيم الاتصالات (155)، وصيغ الشكاوى.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-teal-400 flex items-center justify-between">
                  <span>تقديم شكوى</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/e-justice-services.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-teal-500/20 hover:border-teal-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🏛️</div>
                  <h3 className="text-sm font-black text-white group-hover:text-teal-300 transition-colors mb-1.5">
                    التقاضي ومصر الرقمية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    دليلك الإجرائي لرفع الدعاوى أونلاين، عرائض النيابة العامة، إعلام الوراثة الرقمي، والمحاكم الاقتصادية.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-teal-400 flex items-center justify-between">
                  <span>خدمات التقاضي</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/courts-directory.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-teal-500/20 hover:border-teal-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📍</div>
                  <h3 className="text-sm font-black text-white group-hover:text-teal-300 transition-colors mb-1.5">
                    دليل مقار المحاكم والشهر
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    عناوين ومقار ودوائر محاكم الاستئناف والابتدائية ومجلس الدولة ومأموريات الشهر العقاري المطور بالمحافظات.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-teal-400 flex items-center justify-between">
                  <span>ابحث عن المحكمة</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/legal-diagnostics.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-teal-500/20 hover:border-teal-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🔍</div>
                  <h3 className="text-sm font-black text-white group-hover:text-teal-300 transition-colors mb-1.5">
                    تشخيص النزاع والمحكمة
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    أداة تفاعلية لتشخيص مشكلتك وتحديد نوع الدعوى والمحكمة المختصة نوعياً ومحلياً والمستندات فوراً.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-teal-400 flex items-center justify-between">
                  <span>تشخيص النزاع</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </section>
        )}

        {/* ── MASTER HUB 6: GULF REGIONAL HUB (كارت دول الخليج العربي الستة) ── */}
        {(activeTab === 'all' || activeTab === 'gulf') && (
          <section className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-green-950/60 via-slate-900/90 to-slate-950 border border-green-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-green-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-green-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 inline-flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-green-400" />
                    <span>🌐 البوابات القانونية الإقليمية المعتمدة 2026</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    6 دول خليجية (عربي + إنجليزي)
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  البوابات القانونية لدول الخليج العربي الستة
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  بوابات مستقلة متخصصة تضم حاسبات مكافأة نهاية الخدمة الدقيقة، منصات التقاضي الإلكتروني، وتأسيس الشركات والأنظمة المعتمدة في السعودية والإمارات والكويت وقطر والبحرين وسلطنة عمان باللغتين العربية والإنجليزية.
                </p>
              </div>
            </div>

            {/* Gulf Cards Grid (6 Countries) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. Saudi Arabia */}
              <div className="group relative p-5 rounded-2xl bg-gradient-to-b from-emerald-950/70 to-slate-900/90 border border-emerald-500/30 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🇸🇦</span>
                    <a href="/saudi-legal-hub-en.html" className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 hover:border-emerald-300 transition-all">🌐 EN</a>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    المملكة العربية السعودية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    حاسبة نهاية الخدمة (م 84 و 85)، دليل منصة ناجز وقوى، ديوان المظالم (معين)، والاستثمار الأجنبي MISA.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-400 border-t border-emerald-900/60 pt-2.5">
                    <div>✓ حاسبة نظام العمل 1447هـ</div>
                    <div>✓ منصة ناجز وديوان المظالم</div>
                  </div>
                </div>
                <a href="/saudi-legal-hub.html" className="block pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center justify-between">
                  <span>دخول بوابة السعودية</span>
                  <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                </a>
              </div>

              {/* 2. UAE */}
              <div className="group relative p-5 rounded-2xl bg-gradient-to-b from-blue-950/70 to-slate-900/90 border border-blue-500/30 hover:border-blue-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🇦🇪</span>
                    <a href="/uae-legal-hub-en.html" className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/35 hover:border-blue-300 transition-all">🌐 EN</a>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors mb-1.5">
                    دولة الإمارات العربية المتحدة
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    حاسبة مستحقات نهاية الخدمة بقانون العمل الاتحادي (مرسوم 33/2021)، محاكم دبي وأبوظبي، وتأسيس الشركات والمناطق الحرة.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-400 border-t border-blue-900/60 pt-2.5">
                    <div>✓ حاسبة العمل الاتحادي</div>
                    <div>✓ محاكم دبي والقضاء الاتحادي</div>
                  </div>
                </div>
                <a href="/uae-legal-hub.html" className="block pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-blue-400 group-hover:text-blue-300 flex items-center justify-between">
                  <span>دخول بوابة الإمارات</span>
                  <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                </a>
              </div>

              {/* 3. Kuwait (New) */}
              <div className="group relative p-5 rounded-2xl bg-gradient-to-b from-sky-950/70 to-slate-900/90 border border-sky-500/30 hover:border-sky-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🇰🇼</span>
                    <a href="/kuwait-legal-hub-en.html" className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/35 hover:border-sky-300 transition-all">🌐 EN</a>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-sky-300 transition-colors mb-1.5">
                    دولة الكويت
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    حاسبة نهاية الخدمة بقانون العمل (قانون 6/2010)، بوابة وزارة العدل الكويتية، منصة «سهل»، وهيئة تشجيع الاستثمار KDIPA.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-400 border-t border-sky-900/60 pt-2.5">
                    <div>✓ حاسبة العمل الكويتي (م 51 و 53)</div>
                    <div>✓ وزارة العدل ومنصة سهل</div>
                  </div>
                </div>
                <a href="/kuwait-legal-hub.html" className="block pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-sky-400 group-hover:text-sky-300 flex items-center justify-between">
                  <span>دخول بوابة الكويت</span>
                  <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                </a>
              </div>

              {/* 4. Qatar */}
              <div className="group relative p-5 rounded-2xl bg-gradient-to-b from-rose-950/70 to-slate-900/90 border border-rose-500/30 hover:border-rose-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🇶🇦</span>
                    <a href="/qatar-legal-hub-en.html" className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/35 hover:border-rose-300 transition-all">🌐 EN</a>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-rose-300 transition-colors mb-1.5">
                    دولة قطر
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    حاسبة نهاية الخدمة بقانون العمل (قانون 14/2004)، بوابة المجلس الأعلى للقضاء، ولجان فض المنازعات ومركز قطر للمال QFC.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-400 border-t border-rose-900/60 pt-2.5">
                    <div>✓ حاسبة العمل القطري</div>
                    <div>✓ لجان فض المنازعات العمالية</div>
                  </div>
                </div>
                <a href="/qatar-legal-hub.html" className="block pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-rose-400 group-hover:text-rose-300 flex items-center justify-between">
                  <span>دخول بوابة قطر</span>
                  <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                </a>
              </div>

              {/* 5. Bahrain (New) */}
              <div className="group relative p-5 rounded-2xl bg-gradient-to-b from-red-950/70 to-slate-900/90 border border-red-500/30 hover:border-red-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🇧🇭</span>
                    <a href="/bahrain-legal-hub-en.html" className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/35 hover:border-red-300 transition-all">🌐 EN</a>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-red-300 transition-colors mb-1.5">
                    مملكة البحرين
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    حاسبة مكافأة نهاية الخدمة (قانون 36/2012)، خدمات المحاكم والاستعلام القضائي، نظام «سجلات» ومجلس التنمية EDB.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-400 border-t border-red-900/60 pt-2.5">
                    <div>✓ حاسبة العمل البحريني (م 116)</div>
                    <div>✓ نظام سجلات والبوابة الوطنية</div>
                  </div>
                </div>
                <a href="/bahrain-legal-hub.html" className="block pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-red-400 group-hover:text-red-300 flex items-center justify-between">
                  <span>دخول بوابة البحرين</span>
                  <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                </a>
              </div>

              {/* 6. Oman */}
              <div className="group relative p-5 rounded-2xl bg-gradient-to-b from-green-950/70 to-slate-900/90 border border-green-500/30 hover:border-green-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🇴🇲</span>
                    <a href="/oman-legal-hub-en.html" className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/35 hover:border-green-300 transition-all">🌐 EN</a>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-green-300 transition-colors mb-1.5">
                    سلطنة عمان
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    حاسبة ذكية تفصل تلقائياً بين نظامي العمل (35/2003 و 53/2023) وفق المادة 61، بوابات المحاكم وتأسيس الشركات عبر Invest Oman.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-400 border-t border-green-900/60 pt-2.5">
                    <div>✓ حاسبة قانون العمل 53/2023</div>
                    <div>✓ منصة استثمر في عمان والمحاكم</div>
                  </div>
                </div>
                <a href="/oman-legal-hub.html" className="block pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-green-400 group-hover:text-green-300 flex items-center justify-between">
                  <span>دخول بوابة عمان</span>
                  <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ── MASTER HUB 1: STUDENTS & ACADEMICS (كارت الأكاديمية والطلاب) ── */}
        {(activeTab === 'all' || activeTab === 'students') && (
          <section className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-blue-950/60 via-slate-900/90 to-slate-950 border border-blue-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-blue-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-blue-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-blue-400" />
                    <span>🎓 المنظومة الأكاديمية والتعليم الجامعي 2026</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    24 كلية بالجمهورية
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  بوابة طلاب كليات الحقوق والشريعة والقانون
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  منصة تعليمية متكاملة لطلاب كليات الحقوق والشريعة بمصر: كتب ومقررات الفرق الأربعة المصورة (PDF)، بنك امتحانات بابل شيت تفاعلية مع التأصيل القضائي، حاسبة التقدير التراكمي وتنسيق الهيئات، ودليل القيد بالنقابة.
                </p>
              </div>
              <a
                href="/law-students-hub.html"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap self-stretch lg:self-auto justify-center"
              >
                <span>دخول البوابة الأكاديمية كاملة</span>
                <ArrowLeft className="w-4 h-4" />
              </a>
            </div>

            {/* Sub-features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="/law-students-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-blue-500/20 hover:border-blue-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📚</div>
                  <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors mb-1.5">
                    الكتب الجامعية المصورة (PDF)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    مؤلفات وشروح أمهات القانون المصري (السنهوري، حسني، سرور، الطماوي) بعارض PDF تفاعلي مدمج وتحميل مباشر.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-blue-400 flex items-center justify-between">
                  <span>تصفح الكتب</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/law-students-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-blue-500/20 hover:border-blue-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🏛️</div>
                  <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors mb-1.5">
                    دليل 24 كلية حقوق وأزهر
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    تقسيم شامل لكليات القاهرة، عين شمس، الإسكندرية، المنصورة، أسيوط، وباقي المحافظات وكليات الشريعة بالأزهر.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-blue-400 flex items-center justify-between">
                  <span>اختر كليتك</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/law-students-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-blue-500/20 hover:border-blue-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📝</div>
                  <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors mb-1.5">
                    بنك امتحانات بابل شيت
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    أسئلة تدريبية مؤصلة مع التقييم الفوري وشرح السند القانوني وأحكام محكمة النقض لكل خيار.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-blue-400 flex items-center justify-between">
                  <span>بدء الاختبار</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/law-students-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-blue-500/20 hover:border-blue-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🧮</div>
                  <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors mb-1.5">
                    حاسبة التقدير ودليل القيد
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    حساب النسبة التراكمية وتنسيق الهيئات القضائية (النيابة، مجلس الدولة) والشروط الرسمية للقيد بنقابة المحامين 2026.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-blue-400 flex items-center justify-between">
                  <span>احسب تقديرك</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </section>
        )}

        {/* ── MASTER HUB 7: CORPORATE & BUSINESS (كارت تأسيس الشركات والاستثمار) ── */}
        {(activeTab === 'all' || activeTab === 'corporate') && (
          <section className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-amber-950/60 via-slate-900/90 to-slate-950 border border-amber-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-amber-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-amber-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-amber-400" />
                    <span>🏢 الشركات والاستثمار والتشخيص القضائي 2026</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    هيئة الاستثمار GAFI
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  بوابة تأسيس الشركات والاستثمار والتشخيص الذكي
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  أدلة إجرائية متخصصة لرجال الأعمال والمستثمرين والمحامين: خطوات تأسيس الشركات بالهيئة العامة للاستثمار (GAFI)، حاسبة الرسوم الحكومية، المساعد الذكي لتشخيص النزاع وتحديد المحكمة المختصة.
                </p>
              </div>
              <a
                href="/company-incorporation.html"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-amber-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap self-stretch lg:self-auto justify-center"
              >
                <span>دليل تأسيس الشركات</span>
                <ArrowLeft className="w-4 h-4" />
              </a>
            </div>

            {/* Sub-features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="/company-incorporation.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🏢</div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-1.5">
                    تأسيس الشركات بهيئة الاستثمار (GAFI)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    خطوات تأسيس الشركات (شخص واحد، ذ.م.م، مساهمة) بهيئة الاستثمار وحاسبة الرسوم الحكومية ونماذج عقود التأسيس.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>دليل التأسيس</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/legal-diagnostics.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🔍</div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-1.5">
                    المساعد الذكي لتشخيص النزاع القضائي
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    أداة تفاعلية لتشخيص مشكلتك وتحديد نوع الدعوى والمحكمة المختصة نوعياً ومحلياً والمستندات المطلوبة والمواعيد فوراً.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>تشخيص النزاع الآن</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/search.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🔎</div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-1.5">
                    محرك البحث القانوني الشامل
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    بحث فوري فائق السرعة في كافة مواد القوانين، أحكام محكمة النقض، المقالات، والصيغ والمذكرات بنقرة واحدة.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>فتح محرك البحث</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/sitemap.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🗺️</div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-1.5">
                    خريطة الموقع وفهرس المنصة
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    فهرس متكامل يضم كافة صفحات وبوابات المنصة، الأدلة التشريعية، والمقالات للوصول المباشر.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>استعراض خريطة الموقع</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </section>
        )}

        {/* ── MASTER HUB 8: ECONOMIC & MARKET INDICATORS (كارت الاقتصاد والأسواق والذهب) ── */}
        {(activeTab === 'all' || activeTab === 'economic') && (
          <section className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-amber-950/60 via-slate-900/90 to-slate-950 border border-amber-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-amber-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-amber-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>📈 مؤشرات الأسواق والذهب والعملات 2026</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    مُحدَّث يومياً تلقائياً
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  بوابة الاقتصاد والأسواق ومؤشرات الذهب والعملات والسلع
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  متابعة يومية دقيقة لأسعار الذهب بمصر (عيار 21 و 24 والجنيه الذهب)، حاسبة المصنعية والدمغة، أسعار العملات الرسمية، مؤشرات مواد البناء والحديد، وموجز القرارات التشريعية والضريبية.
                </p>
              </div>
              <a
                href="/economic-hub.html"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap self-stretch lg:self-auto justify-center"
              >
                <span>دخول البوابة الاقتصادية</span>
                <ArrowLeft className="w-4 h-4" />
              </a>
            </div>

            {/* Sub-features Grid (4 Distinctive Modules) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="/economic-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🪙</div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-1.5">
                    أسعار الذهب ومصنعية الجرام
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    مؤشرات لحظية لعيار 21 و 24 والجنيه الذهب، مع حاسبة ذكية لاحتساب قيمة المصنعية وضريبة القيمة المضافة.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>أسعار الذهب اليوم</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/economic-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">💱</div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-1.5">
                    أسعار العملات والتحويل البنكي
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    أسعار الصرف الرسمية بالبنك المركزي (الدولار، اليورو، الريال، الدرهم، والدينار الكويتي) وحاسبة التحويل.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>أسعار العملات الرسمية</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/economic-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">🏗️</div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-1.5">
                    مواد البناء والسلع الاستراتيجية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    أسعار طن حديد عز وبشاي والأسمنت المسلح، وتأثير تقلبات الأسعار على عقود المقاولات والتوريدات قانونياً.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>مؤشرات السلع والحديد</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/economic-hub.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-amber-500/20 hover:border-amber-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📑</div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-1.5">
                    القرارات الاقتصادية والضريبية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    موجز يومي بقرارات البنك المركزي، وزارة المالية، التعريفات الجمركية، والتشريعات المنظمة للاستثمار.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-amber-400 flex items-center justify-between">
                  <span>النشرة الاقتصادية</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </section>
        )}

      </div>

      {/* ─── 3. LAW FIRM MANAGEMENT SYSTEM SECTION ──────────────────────── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
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

          {/* Direct Launch Banner */}
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
            <div className="flex items-center gap-3">
              <button
                onClick={onEnterApp}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>دخول التطبيق الآن مجاناً</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. EXPLAINER VIDEOS & INTERACTIVE TOUR SECTION (في آخر الصفحة بعد الكروت) ── */}
      <section id="explainerVideosSection" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="text-xs font-black px-4 py-1.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-2 mb-3">
            <Film className="w-4 h-4 text-indigo-400" />
            <span>🎬 العرض التعريفي والجولة الحية</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            استكشف منصة المحامي الرقمية بالصوت والصورة
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-2">
            شاهد الفيديو التعريفي الشامل واستمتع بالجولة التفاعلية الحية لاكتشاف كافة مزايا وأقسام المنظومة قبل البدء في استخدامها.
          </p>
        </div>

        <div className="space-y-10">
          {/* 1. Promo Video Player */}
          <PromoVideoPlayer onEnterApp={onEnterApp} />

          {/* 2. Interactive Tour Showcase */}
          <InteractiveTourShowcase onEnterApp={onEnterApp} />
        </div>
      </section>

      {/* ─── 5. NEWSLETTER & NOTIFICATIONS SECTION ──────────────────────── */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NotificationCenter />
          <NewsletterBox />
        </div>
      </section>

      {/* ─── 6. FOOTER ─────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/90 py-12 px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 font-bold">
            <a href="/" className="hover:text-white transition-colors">الرئيسية</a>
            <span>·</span>
            <a href="/law-students-hub.html" className="hover:text-white transition-colors">بوابة طلاب الحقوق</a>
            <span>·</span>
            <a href="/legal-library.html" className="hover:text-white transition-colors">المكتبة القانونية</a>
            <span>·</span>
            <a href="/court-precedents.html" className="hover:text-white transition-colors">موسوعة النقض</a>
            <span>·</span>
            <a href="/pillars/" className="hover:text-white transition-colors">المراجع والأكواد</a>
            <span>·</span>
            <a href="/legal-forms.html" className="hover:text-white transition-colors">صيغ العقود والدعاوى</a>
            <span>·</span>
            <a href="/legal-calculators.html" className="hover:text-white transition-colors">الحاسبات القانونية</a>
            <span>·</span>
            <a href="/saudi-legal-hub.html" className="hover:text-white transition-colors">بوابة السعودية</a>
            <span>·</span>
            <a href="/uae-legal-hub.html" className="hover:text-white transition-colors">بوابة الإمارات</a>
            <span>·</span>
            <a href="/qatar-legal-hub.html" className="hover:text-white transition-colors">بوابة قطر</a>
            <span>·</span>
            <a href="/oman-legal-hub.html" className="hover:text-white transition-colors">بوابة عمان</a>
            <span>·</span>
            <a href="/about.html" className="hover:text-white transition-colors">عن المنصة</a>
            <span>·</span>
            <a href="/why-trust-us.html" className="hover:text-white transition-colors">معايير الثقة</a>
            <span>·</span>
            <a href="/editorial-policy.html" className="hover:text-white transition-colors">السياسة التحريرية</a>
            <span>·</span>
            <a href="/disclaimer.html" className="hover:text-white transition-colors">إخلاء المسؤولية</a>
            <span>·</span>
            <a href="/privacy.html" className="hover:text-white transition-colors">سياسة الخصوصية</a>
            <span>·</span>
            <a href="/terms.html" className="hover:text-white transition-colors">شروط الاستخدام</a>
            <span>·</span>
            <a href="/contact.html" className="hover:text-white transition-colors">تواصل معنا</a>
          </div>
          <p className="text-xs text-slate-500">
            © 2026 منصة المحامي الرقمية — المنظومة القانونية الأولى والشاملة لمصر ودول الخليج العربي. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>

    </div>
  );
}
