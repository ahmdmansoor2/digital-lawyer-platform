/**
 * MobileDock — شريط الأدوات الميداني العائم للمحامي على الهواتف
 * يتيح الوصول بلمسة واحدة لأهم 4 أدوات عاجلة أثناء الجلسات والمرافعات
 */

import React from 'react';
import { Calculator, Landmark, FileText, Sparkles, LogIn } from 'lucide-react';

interface MobileDockProps {
  onOpenAIAdvisor?: () => void;
  onEnterApp?: () => void;
}

export default function MobileDock({ onOpenAIAdvisor, onEnterApp }: MobileDockProps) {
  return (
    <div className="fixed bottom-4 inset-x-3 z-[9999] lg:hidden no-print animate-in fade-in slide-in-from-bottom-5 duration-300">
      <nav 
        role="navigation"
        aria-label="شريط الوصول السريع الميداني"
        className="backdrop-blur-2xl bg-slate-950/92 border border-indigo-500/35 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl px-2 py-2 flex items-center justify-around gap-1 max-w-md mx-auto"
      >
        {/* 1. حاسبة المواعيد والطعون */}
        <a
          href="/legal-calculators.html"
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all text-center flex-1"
          title="حاسبة المواعيد والطعون والمواريث"
        >
          <Calculator className="w-5 h-5 text-emerald-400 mb-0.5" />
          <span className="text-[10px] font-bold">الحاسبات</span>
        </a>

        {/* 2. دليل المحاكم والشهر العقاري */}
        <a
          href="/courts-directory.html"
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-95 transition-all text-center flex-1"
          title="دليل مقار المحاكم والشهر العقاري والدوائر"
        >
          <Landmark className="w-5 h-5 text-cyan-400 mb-0.5" />
          <span className="text-[10px] font-bold">المحاكم</span>
        </a>

        {/* 3. زر التطبيق المركزي المضيء */}
        <button
          type="button"
          onClick={onEnterApp}
          className="flex flex-col items-center justify-center -mt-5 p-2 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 text-white shadow-lg shadow-indigo-600/40 border border-white/20 active:scale-90 transition-all cursor-pointer flex-1 shrink-0"
          title="دخول منظومة إدارة المحاماة"
        >
          <LogIn className="w-5 h-5 text-white mb-0.5" />
          <span className="text-[10px] font-black tracking-tight">التطبيق</span>
        </button>

        {/* 4. صيغة عاجلة وعقود */}
        <a
          href="/contract-generator.html"
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 active:scale-95 transition-all text-center flex-1"
          title="المولد الذكي للعقود والدعاوى"
        >
          <FileText className="w-5 h-5 text-amber-400 mb-0.5" />
          <span className="text-[10px] font-bold">صيغة دعوى</span>
        </a>

        {/* 5. المستشار الذكي AI */}
        <button
          type="button"
          onClick={onOpenAIAdvisor}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-300 hover:text-purple-400 hover:bg-purple-500/10 active:scale-95 transition-all text-center flex-1 cursor-pointer"
          title="سؤال قانوني فوري للمستشار الذكي"
        >
          <Sparkles className="w-5 h-5 text-purple-400 mb-0.5" />
          <span className="text-[10px] font-bold">المستشار AI</span>
        </button>
      </nav>
    </div>
  );
}
