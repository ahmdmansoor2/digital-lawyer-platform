/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * InteractiveTourShowcase — العرض التفاعلي الحي لمميزات وأقسام المنصة
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Briefcase, 
  Calendar, 
  Bell, 
  Calculator, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ShowcaseScene {
  id: string;
  title: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  highlights: string[];
  gradient: string;
  glowColor: string;
  statsLabel: string;
  statsValue: string;
}

const SCENES: ShowcaseScene[] = [
  {
    id: 'cases',
    title: 'إدارة ملفات القضايا والموكلين الذكية',
    badge: 'القلب النابض للمكتب',
    icon: Briefcase,
    description: 'أرشفة شاملة لملفات القضايا وأرقامها ودرجات التقاضي (جزئي، ابتدائي، استئناف، نقض) مع سجل تفصيلي للخصوم وبيانات الموكلين والتوكيلات.',
    highlights: [
      'فهرسة رقمية دقيقة وتصنيف بحسب الدوائر والمحاكم',
      'حفظ أرقام التوكيلات ومسح المستندات ضوئياً',
      'سجل زمني متكامل لكل إجراء تم بالقضية'
    ],
    gradient: 'from-indigo-600 via-purple-600 to-indigo-800',
    glowColor: 'rgba(99, 102, 241, 0.35)',
    statsLabel: 'سرعة استرجاع الملف',
    statsValue: 'أقل من ثانية'
  },
  {
    id: 'bailiff',
    title: 'ذكاء إنذار أوراق المحضرين ومواعيد الحضور',
    badge: 'حماية المواعيد الإجرائية',
    icon: Bell,
    description: 'نظام رصد مبكر لمتابعة تسليم أوراق المحضرين وإعلانات صحف الدعاوى، يمنع سقوط المواعيد القانونية وبطلان الإجراءات طبقاً للمادة 22 مرافعات.',
    highlights: [
      'تنبيهات فورية قبل ميعاد الجلسة بـ ٨ أيام كحد أمان',
      'متابعة أرقام أقلام المحضرين ومحاضر التسليم',
      'منع تأجيل الجلسات للإعادة بفضل الإنذار المسبق'
    ],
    gradient: 'from-rose-600 via-pink-600 to-purple-700',
    glowColor: 'rgba(244, 63, 94, 0.35)',
    statsLabel: 'تفادي السهو الإجرائي',
    statsValue: '100% مضمون'
  },
  {
    id: 'sessions',
    title: 'أجندة الجلسات والترحيل التلقائي للقرارات',
    badge: 'الأجندة القضائية',
    icon: Calendar,
    description: 'جدول تفاعلي للجلسات اليومية والأسبوعية مع إمكانية تسجيل القرارات وترحيل مواعيد الجلسات القادمة آلياً دون الحاجة لإعادة كتابة البيانات.',
    highlights: [
      'تحديث تلقائي لرول الجلسة اليومي للمحامي',
      'سجل القرارات وطلبات الدفاع لكل جلسة',
      'مزامنة مع تقويم جوجل للمتابعة من الهاتف'
    ],
    gradient: 'from-purple-600 via-indigo-600 to-blue-700',
    glowColor: 'rgba(168, 85, 247, 0.35)',
    statsLabel: 'توفير وقت التنظيم',
    statsValue: '70% أسرع'
  },
  {
    id: 'calculator',
    title: 'حاسبة الرسوم القضائية وتقسيم المواريث الشرعية',
    badge: 'حسابات دقيقة فورية',
    icon: Calculator,
    description: 'أدوات حسابية ذكية وفقاً لقانون الرسوم القضائية المصري، وحاسبة مواريث دقيقة ومبرهنة شرعاً توضح الأنصبة والمسائل الشرعية خطوة بخطوة.',
    highlights: [
      'حساب الرسوم النسبية ورسوم الخدمات بدقة متناهية',
      'تقسيم التركات وتحديد أصحاب الفروض والعصبات',
      'طباعة تقرير مالي وميراثي جاهز للمحكمة والورثة'
    ],
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    statsLabel: 'دقة العمليات الحسابية',
    statsValue: 'مطابقة للقانون'
  },
  {
    id: 'contracts',
    title: 'المولد الذكي لصيغ العقود والدعاوى المعتمدة',
    badge: 'صياغة قانونية محكمة',
    icon: FileText,
    description: 'مكتبة متكاملة من نماذج وصيغ العقود (بيع، إيجار، شركات، عمل) وصحف الدعاوى الجاهزة للتعبئة والتخصيص الفوري والطباعة مباشرة.',
    highlights: [
      'أكثر من 100 صيغة ونموذج عقد معتمد ومحدث',
      'تعبئة آلية لبيانات الأطراف والبنود الجوهرية',
      'تصدير فوري بصيغ Word و PDF وطباعة مباشرة'
    ],
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    glowColor: 'rgba(59, 130, 246, 0.35)',
    statsLabel: 'نماذج العقود الجاهزة',
    statsValue: '+100 صيغة'
  },
  {
    id: 'security',
    title: 'الأمان والخصوصية والمزامنة السحابية المشفرة',
    badge: 'حماية وأمان كامل',
    icon: ShieldCheck,
    description: 'بيانات مكتبك وموكليك مشفرة ومحمية بالكامل مع خيارات النسخ الاحتياطي التلقائي والمزامنة السحابية المؤمنة عبر Firebase.',
    highlights: [
      'تشفير كامل لكافة بيانات الموكلين والقضايا',
      'إمكانية العمل المحلي والنسخ الاحتياطي بنقرة واحدة',
      'حساب محمي وتوافق كامل على جميع الأجهزة'
    ],
    gradient: 'from-cyan-600 via-emerald-600 to-teal-700',
    glowColor: 'rgba(6, 182, 212, 0.35)',
    statsLabel: 'درجة حماية البيانات',
    statsValue: 'أمان فائق'
  }
];

export default function InteractiveTourShowcase({ onEnterApp }: { onEnterApp?: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const currentScene = SCENES[activeIdx];
  const Icon = currentScene.icon;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = 80;
    const totalDuration = 7000;
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setActiveIdx(cur => (cur + 1) % SCENES.length);
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, activeIdx]);

  const selectScene = (idx: number) => {
    setActiveIdx(idx);
    setProgress(0);
  };

  return (
    <div className="w-full max-w-6xl mx-auto my-8 relative">
      <div 
        className="absolute inset-0 -top-10 -bottom-10 rounded-3xl blur-3xl opacity-30 transition-all duration-700 pointer-events-none"
        style={{ background: currentScene.glowColor }}
      />

      <div className="relative rounded-3xl border border-white/20 bg-slate-900/90 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-400/40" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/40" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
            <span className="text-[11px] font-mono text-slate-300 ms-3 hidden sm:inline-block">
              العرض التعريفي التفاعلي لمميزات المنصة والتطبيق
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/60 transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />}
              <span className="text-[10px]">{isPlaying ? 'إيقاف مؤقت' : 'متابعة الجولة'}</span>
            </button>

            {onEnterApp && (
              <button
                onClick={onEnterApp}
                className="btn-shimmer-cta text-xs px-3.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <span>دخول المنصة</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="relative p-6 sm:p-8 md:p-12 min-h-[360px] md:min-h-[420px] flex flex-col justify-between overflow-hidden">
          
          <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentScene.badge}</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-2">
              <div className="text-end">
                <span className="text-[10px] text-slate-400 block">{currentScene.statsLabel}</span>
                <span className="text-sm font-black text-emerald-400">{currentScene.statsValue}</span>
              </div>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${currentScene.gradient} flex items-center justify-center text-white shadow-lg`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="my-6 relative z-10 space-y-4 max-w-3xl">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
              {currentScene.title}
            </h3>
            
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl font-medium">
              {currentScene.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
              {currentScene.highlights.map((h, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-white/10 text-xs font-semibold text-slate-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{h}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-4">
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-950/90 border-t border-slate-800/80 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {SCENES.map((scene, idx) => {
            const ScIcon = scene.icon;
            const isSelected = activeIdx === idx;
            return (
              <button
                key={scene.id}
                onClick={() => selectScene(idx)}
                className={`p-2.5 rounded-xl border text-start flex flex-col gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400/30'
                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <ScIcon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </div>
                <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                  {scene.badge}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
