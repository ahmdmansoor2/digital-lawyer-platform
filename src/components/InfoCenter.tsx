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
import PromoVideoPlayer from './PromoVideoPlayer';
import GlobalSidebar from './GlobalSidebar';
import HeroSearchBar from './HeroSearchBar';
import SiteSearchModal from './SiteSearchModal';
import AIAdvisor from './AIAdvisor';
import NotificationCenter from './NotificationCenter';
import NewsletterBox from './NewsletterBox';
import MobileDock from './MobileDock';

interface InfoCenterProps {
  userName?: string;
  onEnterApp?: () => void;
  onLogout?: () => void;
}

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

  const navigateToHub = (hubId: string) => {
    setActiveTab('all');
    setTimeout(() => {
      const el = document.getElementById(hubId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-['Cairo',sans-serif] selection:bg-indigo-600 selection:text-white relative overflow-x-hidden" dir="rtl">
      
      {/* Site Header */}
      <SiteHeader 
        userName={userName} 
        onEnterApp={onEnterApp} 
        onLogout={onLogout}
      />

      {/* Global Right-Side Floating Navigation */}
      <GlobalSidebar 
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
        open={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
      />

      {/* ─── 1. HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative pt-6 pb-8 sm:pt-14 sm:pb-16 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto z-30 text-center">
        
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
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.3] sm:leading-[1.2] mb-4 sm:mb-6">
            منظومة العدالة القانونية <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">
              لمصر والوطن العربي
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xs sm:text-base lg:text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed mb-6 font-medium">
            المنصة المتكاملة <strong className="text-white font-bold">لإدارة مكاتب المحاماة</strong>، و<strong className="text-white font-bold">المكتبة القانونية المصورة</strong>، و<strong className="text-white font-bold">صيغ العقود والدعاوى</strong>، و<strong className="text-white font-bold">أحكام محكمة النقض</strong>، وحاسبات الرسوم ومستحقات العمل وبوابات التقاضي لمصر ودول الخليج.
          </p>

          {/* Hero Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-6 w-full max-w-2xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full sm:w-auto">
              <a
                href="/contract-generator.html"
                className="px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl sm:rounded-2xl bg-purple-950/80 text-purple-200 hover:text-white font-bold text-[11px] sm:text-xs lg:text-sm border border-purple-500/40 hover:border-purple-400 hover:bg-purple-900/60 transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 shadow-lg text-center"
              >
                <FileSignature className="w-4 h-4 text-purple-400 shrink-0" />
                <span>صانع العقود ⚡</span>
              </a>
              <a
                href="/law-students-hub.html"
                className="px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-900/90 text-slate-100 hover:text-white font-bold text-[11px] sm:text-xs lg:text-sm border border-blue-500/40 hover:border-blue-400 hover:bg-slate-800/90 transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 shadow-lg text-center"
              >
                <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />
                <span>طلاب الحقوق</span>
              </a>

              <a
                href="/legal-library.html"
                className="px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-900/90 text-slate-100 hover:text-white font-bold text-[11px] sm:text-xs lg:text-sm border border-indigo-500/40 hover:border-indigo-400 hover:bg-slate-800/90 transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 shadow-lg text-center"
              >
                <Library className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>المكتبة الكبرى</span>
              </a>

              <button
                type="button"
                onClick={() => navigateToHub('gulf-hub')}
                className="px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl sm:rounded-2xl bg-emerald-950/80 text-emerald-200 hover:text-white font-bold text-[11px] sm:text-xs lg:text-sm border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-900/60 transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 shadow-lg text-center cursor-pointer"
                title="الانتقال إلى بوابات دول الخليج العربي الستة"
              >
                <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>دول الخليج 🌍</span>
              </button>

              <button
                onClick={() => setIsAIAdvisorOpen(true)}
                className="px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-900/90 text-amber-300 hover:text-amber-100 font-bold text-[11px] sm:text-xs lg:text-sm border border-amber-500/40 hover:border-amber-400 hover:bg-slate-800/90 transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 shadow-lg cursor-pointer text-center col-span-2 sm:col-span-1"
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>مستشار AI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Live Search Bar */}
        <div className="max-w-3xl mx-auto mb-3 sm:mb-4 relative z-50">
          <HeroSearchBar onOpenFullSearch={() => setIsSearchModalOpen(true)} />
        </div>

        {/* ── Audience Persona Pills (تخصيص العرض الفوري للزائر) ── */}
        <div className="max-w-4xl mx-auto mb-5 sm:mb-7 flex items-center justify-center gap-2 sm:gap-3 flex-wrap px-2">
          <span className="text-[11px] font-bold text-slate-400 hidden sm:inline-flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>تخصيص التصفح:</span>
          </span>
          <button
            type="button"
            onClick={() => navigateToHub('lawyer-admin-hub')}
            className="px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-500/15 text-indigo-200 border border-indigo-500/35 hover:bg-indigo-500/30 hover:border-indigo-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <span>👨‍⚖️ أنا محامٍ</span>
            <span className="text-[10px] text-indigo-300 font-normal hidden sm:inline">(دليل وقيد 27 محافظة)</span>
          </button>
          <button
            type="button"
            onClick={() => navigateToHub('calc-hub')}
            className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-200 border border-emerald-500/35 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <span>👨‍👩‍👧 أنا مواطن</span>
            <span className="text-[10px] text-emerald-300 font-normal hidden sm:inline">(مواريث ونفقات وشهر)</span>
          </button>
          <button
            type="button"
            onClick={() => navigateToHub('gulf-hub')}
            className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-200 border border-amber-500/35 hover:bg-amber-500/30 hover:border-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <span>🏢 أنا مستثمر</span>
            <span className="text-[10px] text-amber-300 font-normal hidden sm:inline">(شركات والخليج)</span>
          </button>
          <button
            type="button"
            onClick={() => navigateToHub('library-hub')}
            className="px-3.5 py-1.5 rounded-full text-xs font-black bg-purple-500/15 text-purple-200 border border-purple-500/35 hover:bg-purple-500/30 hover:border-purple-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <span>🎓 باحث قانوني</span>
            <span className="text-[10px] text-purple-300 font-normal hidden sm:inline">(نقض ومراجع)</span>
          </button>
        </div>

        {/* ── Featured Fast Tools: Top 5 High-Demand Calculators 2026 ── */}
        <div className="max-w-4xl mx-auto mb-4 px-2 relative z-10">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900/80 to-indigo-950/50 border border-emerald-500/25 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black text-emerald-300">أشهر الحاسبات القضائية 2026:</span>
            </div>
            
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none justify-start sm:justify-end">
              <a
                href="/calculate-end-of-service.html"
                className="px-2.5 py-1.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/70 border border-emerald-500/30 text-emerald-200 hover:text-white text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
              >
                <span>💼 نهاية الخدمة</span>
              </a>
              <a
                href="/calculate-inheritance.html"
                className="px-2.5 py-1.5 rounded-xl bg-sky-900/40 hover:bg-sky-800/70 border border-sky-500/30 text-sky-200 hover:text-white text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
              >
                <span>⚖️ حاسبة المواريث</span>
              </a>
              <a
                href="/calculate-alimony.html"
                className="px-2.5 py-1.5 rounded-xl bg-pink-900/40 hover:bg-pink-800/70 border border-pink-500/30 text-pink-200 hover:text-white text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
              >
                <span>👨‍👩‍👧 نفقة الزوجة والصغار</span>
              </a>
              <a
                href="/real-estate-registration-fees.html"
                className="px-2.5 py-1.5 rounded-xl bg-amber-900/40 hover:bg-amber-800/70 border border-amber-500/30 text-amber-200 hover:text-white text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
              >
                <span>🏠 الشهر العقاري</span>
              </a>
              <a
                href="/appeal-deadlines.html"
                className="px-2.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/70 border border-purple-500/30 text-purple-200 hover:text-white text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0"
              >
                <span>⏱️ مواعيد الطعون</span>
              </a>
            </div>
          </div>
        </div>

        {/* Quick Filter Navigation Tabs (Mobile swipe track / Desktop 2-tier balanced dock) */}
        <div className="max-w-5xl mx-auto mt-2 relative z-10">
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
              👨‍⚖️ دليل المحامين المشتغلين
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
      <div className="space-y-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-0">

        {/* ── MASTER HUB 2: LEGAL LIBRARY, PRECEDENTS & FORMS (كارت المكتبة والموسوعات والصيغ والنقض) ── */}
        {(activeTab === 'all' || activeTab === 'library') && (
          <section id="library-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-purple-950/60 via-slate-900/90 to-slate-950 border border-purple-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-purple-400/50">
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

                            {/* Featured: Smart Contract & Document Generator */}
              <a href="/contract-generator.html" className="group p-5 rounded-2xl bg-gradient-to-br from-indigo-950/70 to-purple-950/80 hover:from-indigo-900/80 hover:to-purple-900/90 border-2 border-indigo-500/40 hover:border-indigo-400 transition-all flex flex-col justify-between shadow-xl shadow-indigo-950/40">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">⚡</span>
                    <span className="text-[10px] font-extrabold text-indigo-200 bg-indigo-500/30 px-2 py-0.5 rounded-full border border-indigo-400/40">ملء آلي وطباعة A4</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                    المولّد الذكي للعقود والتوكيلات بالملء الآلي
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    أنشئ وثيقتك القانونية خلال ثوانٍ: توكيلات قضايا وسيارات، عقود بيع وإيجار، وإنذارات محضرين جاهزة للطباعة A4 والتصدير Word فوراً.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-indigo-800/40 text-xs font-bold text-indigo-300 flex items-center justify-between">
                  <span>فتح صانع العقود الذكي</span>
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

        {/* ── MASTER HUB 3: LAWYERS DIRECTORY & REGISTRATION (دليل وقيد المحامين المشتغلين) ── */}
        {(activeTab === 'all' || activeTab === 'lawyers' || activeTab === 'admin') && (
          <section id="lawyer-admin-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-indigo-950/60 via-slate-900/90 to-slate-950 border border-indigo-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-indigo-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-indigo-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-indigo-400" />
                    <span>👨‍⚖️ الدليل الرسمي للمحامين المشتغلين</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    قيد وتواصل 27 محافظة
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  دليل وبوابة قيد المحامين المشتغلين المعتمدين بجمهورية مصر العربية
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  قاعدة البيانات المتكاملة للبحث عن السادة المحامين وتخصصاتهم ودرجات القيد بجميع المحافظات، وبوابة المحامين المعتمدين لقيد وتسجيل المكاتب والتواصل المباشر مع الموكلين مجاناً 100%.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 self-stretch lg:self-auto justify-center">
                <a
                  href="/download.html"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap justify-center cursor-pointer"
                >
                  <span>💻 تحميل البرنامج (3 إصدارات)</span>
                </a>
                <a
                  href="/lawyers-directory.html"
                  className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap justify-center cursor-pointer"
                >
                  <span>تصفح دليل المحامين (27 محافظة)</span>
                  <ArrowLeft className="w-4 h-4" />
                </a>
                <a
                  href="/lawyers-directory.html#register"
                  className="px-5 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-indigo-300 hover:text-white font-extrabold text-sm border border-indigo-500/40 hover:border-indigo-400 transition-all flex items-center gap-2 whitespace-nowrap justify-center cursor-pointer"
                >
                  <span>سجّل مكتبك في الدليل مجاناً</span>
                </a>
              </div>
            </div>

            {/* Sub-features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="/download.html" className="group p-5 rounded-2xl bg-gradient-to-br from-emerald-950/70 to-indigo-950/80 hover:from-emerald-900/80 hover:to-indigo-900/90 border-2 border-emerald-500/40 hover:border-emerald-400 transition-all flex flex-col justify-between shadow-xl shadow-emerald-950/30">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">💻</span>
                    <span className="text-[10px] font-extrabold text-emerald-200 bg-emerald-500/30 px-2 py-0.5 rounded-full border border-emerald-400/40">تجربة 30 يوماً مجاناً</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-1.5">
                    تحميل برنامج إدارة مكاتب المحاماة (3 إصدارات)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    إصدارات مخصصة للكمبيوتر (Windows)، الأندرويد (APK)، والآيفون (iOS). تنظيم القضايا، الجلسات، والمحضرين بدون إنترنت.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-emerald-800/40 text-xs font-bold text-emerald-300 flex items-center justify-between">
                  <span>تحميل البرنامج الآن</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/lawyers-directory.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-indigo-500/20 hover:border-indigo-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">👨‍⚖️</div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                    تصفح وفلترة دليل المحامين حسب المحافظة والتخصص
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    دليل شامل يغطي 27 محافظة مصرية مصنفة حسب التخصص القضائي ودرجة القيد (نقض، استئناف، ابتدائي) مع إمكانية البحث الفوري.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-indigo-400 flex items-center justify-between">
                  <span>تصفح الدليل الآن</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/lawyers-directory.html#register" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-indigo-500/20 hover:border-indigo-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">📝</div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                    بوابة قيد وتسجيل المحامين المشتغلين مجاناً
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    سجّل بيانات مكتبك، وعنوانك، وتخصصك القضائي، ورقم هاتفك والواتساب للظهور الفوري المباشر أمام آلاف الموكلين والشركات.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-indigo-400 flex items-center justify-between">
                  <span>سجّل مكتبك في الدليل</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              <a href="/lawyers-directory.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-indigo-500/20 hover:border-indigo-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-2xl mb-3">💬</div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-1.5">
                    تواصل مباشر واستشارات قانونية فورية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    تواصل فوري ومباشر مع المحامي المختص عبر المكالمات الهاتفية أو تطبيق واتساب مباشرة بدون أي وسيط وبشكل مجاني 100%.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-800 text-xs font-bold text-indigo-400 flex items-center justify-between">
                  <span>استكشف المحامين والتواصل</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>
            </div>
          </section>
        )}

        {/* ── MASTER HUB: FEATURED LEGAL BLOG & EDITORIAL (المدونة القانونية وموسوعة المقالات المتصدرة) ── */}
        {(activeTab === 'all' || activeTab === 'library' || activeTab === 'citizen') && (
          <section id="legal-blog-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-purple-950/50 via-slate-900/90 to-slate-950 border border-purple-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-purple-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-purple-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span>📰 المدونة القانونية والتحليلات القضائية</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    +140 مقالاً وبحثاً موثقاً
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    مُحدَّث يومياً 2026
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  أحدث المقالات والدراسات القانونية وشروح التشريعات المصرية
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  موسوعة المقالات المتخصصة للمحامين والمواطنين: شروح تفصيلية لقوانين العمل، الأحوال الشخصية، الجرائم الإلكترونية، الشيكات، والشركات مع أحدث أحكام محكمة النقض.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/blog/"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>تصفح أرشيف المدونة الكامل (+140 مقال)</span>
                </a>
              </div>
            </div>

            {/* Quick Categories Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-purple-500/20">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">التصنيفات الرائجة:</span>
              <a href="/blog/administrative-appeals-egypt.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-purple-600/20 text-slate-200 border border-slate-700/50 hover:border-purple-500/50 whitespace-nowrap transition-all">⚖️ القضاء الإداري والطعون</a>
              <a href="/blog/alimony-calculation-egypt.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-purple-600/20 text-slate-200 border border-slate-700/50 hover:border-purple-500/50 whitespace-nowrap transition-all">👨‍👩‍👦 محاكم الأسرة والنفقات</a>
              <a href="/blog/bounced-check-laws-egypt.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-purple-600/20 text-slate-200 border border-slate-700/50 hover:border-purple-500/50 whitespace-nowrap transition-all">💳 الشيكات والجرائم المالية</a>
              <a href="/blog/cybercrime-extortion-banking-fraud-egypt.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-purple-600/20 text-slate-200 border border-slate-700/50 hover:border-purple-500/50 whitespace-nowrap transition-all">💻 الجرائم الإلكترونية والابتزاز</a>
              <a href="/blog/company-incorporation-egypt.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-purple-600/20 text-slate-200 border border-slate-700/50 hover:border-purple-500/50 whitespace-nowrap transition-all">🏢 الشركات والاستثمار</a>
              <a href="/blog/civil-compensation-lawsuits.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-purple-600/20 text-slate-200 border border-slate-700/50 hover:border-purple-500/50 whitespace-nowrap transition-all">📜 التعويضات المدنية</a>
            </div>

            {/* Featured Articles Grid (6 High-Traffic Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Card 1 */}
              <a href="/blog/administrative-appeals-egypt.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-purple-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-purple-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20">مجلس الدولة</span>
                    <span className="text-slate-400">⏱️ 5 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-purple-300 transition-colors mb-2 line-clamp-2">
                    دليل الطعن أمام محاكم القضاء الإداري وإجراءات التظلم والمدد القانونية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    الشروط الجوهرية لقبول دعاوى إلغاء القرارات الإدارية، مواعيد الـ 60 يوماً، وحالات وقف التنفيذ العاجل بمجلس الدولة.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-purple-400 flex items-center justify-between group-hover:text-purple-300">
                  <span>قراءة المقال كاملاً</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 2 */}
              <a href="/blog/alimony-calculation-egypt.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-purple-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">محاكم الأسرة</span>
                    <span className="text-slate-400">⏱️ 6 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-2 line-clamp-2">
                    كيفية حساب النفقة الزوجية ونفقة الصغار وضوابط التحري عن دخل الزوج
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    طرق إثبات الدخل الحقيقي، نفقات المأكل والملبس والمسكن ومصاريف التعليم، مع أحكام محكمة النقض المنظمة.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-emerald-400 flex items-center justify-between group-hover:text-emerald-300">
                  <span>قراءة المقال كاملاً</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 3 */}
              <a href="/blog/bounced-check-laws-egypt.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-purple-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">قضايا الشيكات</span>
                    <span className="text-slate-400">⏱️ 4 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-2 line-clamp-2">
                    أحكام جريمة إصدار شيك بدون رصيد وعقوباته وطرق الصلح القانوني 2026
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    الفرق بين الشيك البنكي والكمبيالة وإيصال الأمانة، مدد التقادم وسقوط الدعوى الجنائية وإجراءات رد المبالغ.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-amber-400 flex items-center justify-between group-hover:text-amber-300">
                  <span>قراءة المقال كاملاً</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 4 */}
              <a href="/blog/cybercrime-extortion-banking-fraud-egypt.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-purple-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-indigo-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">الجرائم الرقمية</span>
                    <span className="text-slate-400">⏱️ 5 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-2 line-clamp-2">
                    قانون مكافحة جرائم تقنية المعلومات والابتزاز والاحتيال المصرفي الإلكتروني
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    كيفية تحرير محضر بمباحث الإنترنت، إثبات الأدلة الرقمية والرسائل، والعقوبات المشددة لسرقة الحسابات والبيانات.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-indigo-400 flex items-center justify-between group-hover:text-indigo-300">
                  <span>قراءة المقال كاملاً</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 5 */}
              <a href="/blog/company-incorporation-egypt.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-purple-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-cyan-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">تأسيس الشركات</span>
                    <span className="text-slate-400">⏱️ 7 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors mb-2 line-clamp-2">
                    دليل تأسيس الشركات الفردية والمساهمة وذات المسئولية المحدودة في مصر
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    إجراءات هيئة الاستثمار (GAFI)، رأس المال المطلوب، استخراج السجل التجاري والبطاقة الضريبية وتراخيص النشاط.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-cyan-400 flex items-center justify-between group-hover:text-cyan-300">
                  <span>قراءة المقال كاملاً</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 6 */}
              <a href="/blog/civil-compensation-lawsuits.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-purple-500/20 hover:border-purple-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-purple-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-rose-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20">القانون المدني</span>
                    <span className="text-slate-400">⏱️ 6 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-rose-300 transition-colors mb-2 line-clamp-2">
                    أركان دعوى التعويض عن الضرر المادي والأدبي والمسؤولية التقصيرية والعقدية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    عناصر إثبات الخطأ والضرر وعلاقة السببية، معايير تقدير مبالغ التعويض بالمحاكم المدنية، ومواعيد سقوط الحق.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-rose-400 flex items-center justify-between group-hover:text-rose-300">
                  <span>قراءة المقال كاملاً</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

            </div>
          </section>
        )}

        {/* ── MASTER HUB: LEGAL RADAR & TRENDS (رصد المحامي والتحليلات التشريعية للترندات والجريدة الرسمية) ── */}
        {(activeTab === 'all' || activeTab === 'library' || activeTab === 'citizen') && (
          <section id="legal-radar-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-cyan-950/50 via-slate-900/90 to-slate-950 border border-cyan-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-cyan-400/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-cyan-900/50">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>📡 رصد المحامي وترندات الشارع المصري</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    تحليلات يومية حية 2026
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    الجريدة الرسمية والوقائع
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  رصد المحامي: التحليلات القانونية للترندات والقرارات الرسمية
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  نشرة يومية استقصائية تواكب أحدث القضايا الرائجة والقرارات الحكومية وتطبيقات النقل الذكي والتشريعات العاجلة برؤية قانونية دقيقة للمواطن والمحامي.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/legal-radar.html"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-cyan-600/30 hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <Radio className="w-4 h-4" />
                  <span>دخول مرصد المحامي والترندات الحية (+90 موضوعاً)</span>
                  <ArrowLeft className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Quick Categories Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-cyan-500/20">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">الرصد الرائج:</span>
              <a href="/radar-topics/2026-09-03-uber-egypt-safety.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-cyan-600/20 text-slate-200 border border-slate-700/50 hover:border-cyan-500/50 whitespace-nowrap transition-all">🚗 تطبيقات النقل الذكي والأمان</a>
              <a href="/radar-topics/2026-08-24-madbouly-cabinet-decisions.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-cyan-600/20 text-slate-200 border border-slate-700/50 hover:border-cyan-500/50 whitespace-nowrap transition-all">⚖️ قرارات مجلس الوزراء</a>
              <a href="/radar-topics/2026-09-02-tax-authority-updates.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-cyan-600/20 text-slate-200 border border-slate-700/50 hover:border-cyan-500/50 whitespace-nowrap transition-all">🏛️ الضرائب والتأمينات</a>
              <a href="/radar-topics/2026-09-02-national-bank-egypt.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-cyan-600/20 text-slate-200 border border-slate-700/50 hover:border-cyan-500/50 whitespace-nowrap transition-all">💳 البنوك والشهادات</a>
              <a href="/radar-topics/2026-08-14-ntra-egypt-regulations.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-cyan-600/20 text-slate-200 border border-slate-700/50 hover:border-cyan-500/50 whitespace-nowrap transition-all">📱 الاتصالات ومباحث الإنترنت</a>
              <a href="/radar-topics/2026-09-01-social-housing-egypt.html" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-cyan-600/20 text-slate-200 border border-slate-700/50 hover:border-cyan-500/50 whitespace-nowrap transition-all">🏠 الإسكان الاجتماعي والتصالح</a>
            </div>

            {/* Featured Radar Grid (6 High-Engagement Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Card 1 */}
              <a href="/radar-topics/2026-09-03-uber-egypt-safety.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-cyan-500/20 hover:border-cyan-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-cyan-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-cyan-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">النقل الذكي</span>
                    <span className="text-slate-400">⏱️ 4 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors mb-2 line-clamp-2">
                    أزمة تطبيقات النقل الذكي في مصر: مطالبات برلمانية وتشريعية لتشديد الرقابة وتفعيل زر الاستغاثة
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    تحليل الأبعاد القانونية لمسؤولية الشركات التضامنية عن سلامة الركاب، وضوابط الفحص الدوري للسائقين وفق القانون 82 لسنة 2018.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-cyan-400 flex items-center justify-between group-hover:text-cyan-300">
                  <span>قراءة التقرير والتحليل</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 2 */}
              <a href="/radar-topics/2026-08-24-madbouly-cabinet-decisions.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-cyan-500/20 hover:border-cyan-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-cyan-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">مجلس الوزراء</span>
                    <span className="text-slate-400">⏱️ 5 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors mb-2 line-clamp-2">
                    قرارات مجلس الوزراء التشريعية: حوافز الاستثمار الصناعي وتيسيرات تقنين أوضاع المشروعات
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    أحدث حزمة قرارات رسمية لتشجيع توطين الصناعة، الإعفاءات الضريبية المشروطة، والتسهيلات الممنوحة للمطورين والمستثمرين.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-emerald-400 flex items-center justify-between group-hover:text-emerald-300">
                  <span>قراءة التقرير والتحليل</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 3 */}
              <a href="/radar-topics/2026-09-02-tax-authority-updates.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-cyan-500/20 hover:border-cyan-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-cyan-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">الضرائب المصرية</span>
                    <span className="text-slate-400">⏱️ 4 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors mb-2 line-clamp-2">
                    حزمة التسهيلات الضريبية الجديدة: إنهاء النزاعات القديمة ومنظومة الفاتورة الإلكترونية المبسطة
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    تفاصيل مبادرات وزارة المالية لإنهاء الملفات الضريبية المتراكمة للشركات الصغيرة والمهنيين دون غرامات تأخير.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-amber-400 flex items-center justify-between group-hover:text-amber-300">
                  <span>قراءة التقرير والتحليل</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 4 */}
              <a href="/radar-topics/2026-08-14-ntra-egypt-regulations.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-cyan-500/20 hover:border-cyan-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-cyan-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-indigo-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">تنظيم الاتصالات</span>
                    <span className="text-slate-400">⏱️ 6 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors mb-2 line-clamp-2">
                    ضوابط حماية خصوصية المستخدمين ومكافحة المكالمات والرسائل الإعلانية المزعجة قانوناً
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    الأطر التنظيمية الصادرة عن الجهاز القومي لتنظيم الاتصالات والعقوبات المقررة على الشركات المخالفة لسرية بيانات العملاء.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-indigo-400 flex items-center justify-between group-hover:text-indigo-300">
                  <span>قراءة التقرير والتحليل</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 5 */}
              <a href="/radar-topics/2026-09-02-national-bank-egypt.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-cyan-500/20 hover:border-cyan-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-cyan-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-rose-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20">البنوك والاستثمار</span>
                    <span className="text-slate-400">⏱️ 4 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-rose-300 transition-colors mb-2 line-clamp-2">
                    الشهادات الادخارية وأسعار الفائدة البنكية: الحماية القانونية للودائع والتحويلات اللحظية
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    دراسة قانونية حول ضمانات أموال المودعين بالبنوك الوطنية وقواعد الأمان المالي المفروضة على تطبيقات المدفوعات اللحظية.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-rose-400 flex items-center justify-between group-hover:text-rose-300">
                  <span>قراءة التقرير والتحليل</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 6 */}
              <a href="/radar-topics/2026-09-01-social-housing-egypt.html" className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-cyan-500/20 hover:border-cyan-400 transition-all flex flex-col justify-between shadow-lg hover:shadow-cyan-900/20">
                <div>
                  <div className="flex items-center justify-between text-xs text-teal-400 font-bold mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">الإسكان والتصالح</span>
                    <span className="text-slate-400">⏱️ 5 دقائق قراءة</span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-teal-300 transition-colors mb-2 line-clamp-2">
                    حجز شقق الإسكان الاجتماعي والتمويل العقاري وضوابط التصالح في مخالفات البناء
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                    الشروط القانونية لعدم سحب الوحدات السكنية، حظر التصرف فيها قبل انقضاء المدة القانونية، وإجراءات استخراج نموذج 8 النهائي.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 text-xs font-bold text-teal-400 flex items-center justify-between group-hover:text-teal-300">
                  <span>قراءة التقرير والتحليل</span>
                  <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

            </div>
          </section>
        )}

        {/* ── MASTER HUB 4: LEGAL CALCULATORS (كارت الحاسبات القانونية والشرعية) ── */}
        {(activeTab === 'all' || activeTab === 'calculators') && (
          <section id="calc-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-emerald-950/60 via-slate-900/90 to-slate-950 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-emerald-400/50">
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
              <a href="/real-estate-registration-fees.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
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
              <a href="/appeal-deadlines.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
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
              <a href="/calculate-end-of-service.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
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
              <a href="/calculate-inheritance.html" className="group p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between">
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
              </a>

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
          <section id="citizens-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-teal-950/60 via-slate-900/90 to-slate-950 border border-teal-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-teal-400/50">
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
          <section id="gulf-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-green-950/60 via-slate-900/90 to-slate-950 border border-green-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-green-400/50">
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
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 mt-3">
                  <a href="/saudi-legal-hub.html" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center justify-between">
                    <span>دخول بوابة السعودية</span>
                    <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                  </a>
                  <a href="/saudi-investors-egypt.html" className="text-[11px] font-bold text-amber-300 hover:text-white flex items-center justify-between bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    <span>🏢 دليل المستثمر السعودي في مصر</span>
                    <span>↗</span>
                  </a>
                </div>
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
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 mt-3">
                  <a href="/uae-legal-hub.html" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center justify-between">
                    <span>دخول بوابة الإمارات</span>
                    <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                  </a>
                  <a href="/uae-investors-egypt.html" className="text-[11px] font-bold text-amber-300 hover:text-white flex items-center justify-between bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    <span>🏢 دليل المستثمر الإماراتي في مصر</span>
                    <span>↗</span>
                  </a>
                </div>
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
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 mt-3">
                  <a href="/kuwait-legal-hub.html" className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center justify-between">
                    <span>دخول بوابة الكويت</span>
                    <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
                  </a>
                  <a href="/kuwait-investors-egypt.html" className="text-[11px] font-bold text-amber-300 hover:text-white flex items-center justify-between bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    <span>🏢 دليل المستثمر والمواطن الكويتي بمصر</span>
                    <span>↗</span>
                  </a>
                </div>
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
          <section id="students-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-blue-950/60 via-slate-900/90 to-slate-950 border border-blue-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-blue-400/50">
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
          <section id="corporate-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-amber-950/60 via-slate-900/90 to-slate-950 border border-amber-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-amber-400/50">
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
          <section id="economic-hub" className="spotlight-card scroll-mt-24 p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-amber-950/60 via-slate-900/90 to-slate-950 border border-amber-500/30 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-amber-400/50">
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

      {/* ─── 3. EXPLAINER VIDEOS SECTION (في آخر الصفحة بعد الكروت) ── */}
      <section id="explainerVideosSection" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="text-xs font-black px-4 py-1.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-2 mb-3">
            <Film className="w-4 h-4 text-indigo-400" />
            <span>🎬 الفيديو التعريفي الشامل</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            استكشف منصة المحامي الرقمية بالفيديو
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-2">
            شاهد الفيديو التعريفي الشامل لاكتشاف كافة مزايا وأقسام المنظومة قبل البدء في استخدامها.
          </p>
        </div>

        <div>
          {/* 1. Promo Video Player */}
          <PromoVideoPlayer onEnterApp={onEnterApp} />
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

      {/* ── Mobile Field Action Dock (شريط الأدوات الميداني العائم للمحامي) ── */}
      <MobileDock 
        onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)} 
        onEnterApp={onEnterApp} 
      />

    </div>
  );
}
