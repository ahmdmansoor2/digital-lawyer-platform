/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
;
import { 
  Scale, 
  Briefcase, 
  Users, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  ChevronLeft,
  FileText,
  BookOpen,
  Trash2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Case, Session, Transaction, LegalDeadline, Client, BailiffPaper } from '../types';
import { useConfirm } from '../contexts/ConfirmContext';

interface DashboardProps {
  cases: Case[];
  clients: Client[];
  sessions: Session[];
  transactions: Transaction[];
  deadlines: LegalDeadline[];
  bailiffPapers?: BailiffPaper[];
  onNavigate: (tab: string) => void;
  onSelectCase: (caseId: string) => void;
  onDeleteSession?: (id: string) => void;
}

const Dashboard = React.memo(function Dashboard({ 
  cases, 
  clients, 
  sessions, 
  transactions, 
  deadlines, 
  bailiffPapers = [],
  onNavigate,
  onSelectCase,
  onDeleteSession
}: DashboardProps) {
  const confirm = useConfirm();
  const [currentDateTime, setCurrentDateTime] = React.useState(new Date());
  const [dismissedAlerts, setDismissedAlerts] = React.useState<string[]>([]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = React.useMemo(() => {
    return new Intl.DateTimeFormat('ar-EG', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }).format(currentDateTime);
  }, [currentDateTime]);

  const formattedTime = React.useMemo(() => {
    return new Intl.DateTimeFormat('ar-EG', { 
      hour: 'numeric', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: true 
    }).format(currentDateTime);
  }, [currentDateTime]);
  
  // Generate early warning alerts
  const earlyWarningAlerts = React.useMemo(() => {
    const alerts: Array<{
      id: string;
      type: 'bailiff' | 'session' | 'deadline';
      title: string;
      description: string;
      lawReference?: string;
      timeLeft: string;
      severity: 'critical' | 'warning';
      actionLabel: string;
      actionTab: string;
      caseId?: string;
    }> = [];

    const currentDate = new Date();

    // 1. Bailiff Papers Alerts (أوراق المحضرين)
    bailiffPapers.forEach(paper => {
      if (paper.status === 'قيد الإعلان والتسليم' || paper.status === 'مؤجل للإعادة') {
        const subDate = new Date(paper.submissionDate);
        const elapsedDays = Math.ceil((currentDate.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Find if linked case has an upcoming session
        let daysToSession = 999;
        let linkedSession: Session | undefined = undefined;
        if (paper.caseId) {
          linkedSession = sessions.find(s => s.caseId === paper.caseId && s.status === 'قادمة');
          if (linkedSession) {
            const sDate = new Date(linkedSession.date);
            daysToSession = Math.ceil((sDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        if (daysToSession <= 8 && daysToSession >= 0) {
          alerts.push({
            id: `alert_bp_session_${paper.id}`,
            type: 'bailiff',
            title: `ورقة محضرين حرجة: إعلان صحيفة دعوى`,
            description: `الإعلان رقم ${paper.paperNumber} لمحضرين ${paper.courtName} للخصم ${paper.opponentName || 'غير محدد'}. متبقي أقل من ميعاد الحضور القانوني (٨ أيام) على الجلسة ولم يُثبت الإعلان بعد!`,
            lawReference: 'قانون المرافعات المصري - المادة 22 (بطلان صحيفة الدعوى لعدم إعلان الخصم في الميعاد)',
            timeLeft: `متبقي ${daysToSession} أيام على الجلسة`,
            severity: 'critical',
            actionLabel: 'متابعة المحضرين والتسليم',
            actionTab: 'bailiff-papers',
            caseId: paper.caseId
          });
        } else if (elapsedDays >= 5) {
          alerts.push({
            id: `alert_bp_pending_${paper.id}`,
            type: 'bailiff',
            title: `تنبيه إجرائي: ورقة محضرين قيد الإعلان طويلاً`,
            description: `الإعلان رقم ${paper.paperNumber} تابع لـ ${paper.courtName} قيد الإعلان والتسليم منذ ${elapsedDays} أيام. يرجى التواصل مع قلم المحضرين لتجنب تأجيل الجلسة للإعادة.`,
            lawReference: 'متابعة قلم المحضرين لتسليم الإعلانات قبل فوات مدد الحضور القانونية.',
            timeLeft: `معلق منذ ${elapsedDays} أيام`,
            severity: 'warning',
            actionLabel: 'تفاصيل ورقة الإعلان',
            actionTab: 'bailiff-papers',
            caseId: paper.caseId
          });
        }
      }
    });

    // 2. Urgent Sessions Alerts (جلسات عاجلة)
    sessions.forEach(session => {
      if (session.status === 'قادمة') {
        const sDate = new Date(session.date);
        const daysDiff = Math.ceil((sDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 0 && daysDiff <= 3) {
          alerts.push({
            id: `alert_session_${session.id}`,
            type: 'session',
            title: `جلسة محكمة عاجلة جداً`,
            description: `رقم الدعوى: ${session.caseNumber} أمام محكمة ${session.court} (${session.circuit}). المطلوب بالجلسة: ${session.objective}. يرجى صياغة مذكرات الدفاع وتقديم الحوافظ فوراً.`,
            lawReference: 'قانون الإثبات وقانون المرافعات - تهيئة الدفاع والمستندات قبل حجز الدعوى للحكم.',
            timeLeft: daysDiff === 0 ? 'اليوم!' : daysDiff === 1 ? 'غداً!' : `خلال ${daysDiff} أيام`,
            severity: 'critical',
            actionLabel: 'تجهيز مذكرة الدفاع وعرض القضية',
            actionTab: 'cases',
            caseId: session.caseId
          });
        }
      }
    });

    // 3. Critical Legal Deadlines Alerts (مواعيد سقوط الحق)
    deadlines.forEach(deadline => {
      if (!deadline.isCompleted) {
        const dDate = new Date(deadline.deadlineDate);
        const daysDiff = Math.ceil((dDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 0 && daysDiff <= 10) {
          alerts.push({
            id: `alert_deadline_${deadline.id}`,
            type: 'deadline',
            title: `ميعاد سقوط حق قانوني: ${deadline.title}`,
            description: `ميعاد نهائي وحرج في القضية ${deadline.caseNumber} للموكل ${deadline.clientName}. السند الإجرائي: ${deadline.lawReference}. سقوط الحق بمضي المدة بعد فوات هذا الميعاد.`,
            lawReference: deadline.lawReference,
            timeLeft: `متبقي ${daysDiff} يوم`,
            severity: daysDiff <= 3 ? 'critical' : 'warning',
            actionLabel: 'تجهيز وقيد عريضة الطعن',
            actionTab: 'calendar',
            caseId: deadline.caseId
          });
        }
      }
    });

    return alerts;
  }, [bailiffPapers, sessions, deadlines]);

  // Case type distribution for chart
  const casesByType = React.useMemo(() => {
    const typeMap: Record<string, number> = {};
    cases.filter(c => !c.isArchived).forEach(c => {
      typeMap[c.type] = (typeMap[c.type] || 0) + 1;
    });
    return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  }, [cases]);

  const CHART_COLORS = ['#f59e0b', '#6366f1', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Calculate stats
  const activeCasesCount = cases.filter(c => c.status === 'متداولة' || c.status === 'محجوزة للحكم').length;
  const totalClientsCount = clients.length;
  
  // Upcoming sessions this week (next 7 days starting from June 21, 2026)
  const upcomingSessions = sessions.filter(s => {
    const sDate = new Date(s.date);
    const currentDate = new Date();
    const diffTime = sDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7 && s.status === 'قادمة';
  });

  // Critical deadlines countdown
  const pendingDeadlines = deadlines.filter(d => !d.isCompleted);
  
  // Financial summarizing
  const totalIncome = transactions
    .filter(t => t.ioType.includes('وارد'))
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = transactions
    .filter(t => t.ioType.includes('صادر'))
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  // Stagger container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div 
      className="space-y-5 flex flex-col gap-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      dir="rtl"
    >
      {/* Welcome Banner / Header */}
      <div 
        variants={itemVariants}
        className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800"
      >
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي المحترف
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                لوحة المتابعة الحية v3.0
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              ⚖️ لوحة التحكم العامة ومؤشرات الأداء
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تتبع ملفات القضايا النشطة والموكلين وجلسات المحاكم اليومية والمواعيد الإجرائية طبقاً لقانون المرافعات المصري المعتمد.
            </p>
          </div>
          
           <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl text-white md:text-start min-w-[200px] shadow-sm shrink-0 z-10 flex flex-col justify-center">
            <p className="text-[10px] text-indigo-400 font-bold mb-1">التاريخ والوقت المحدث تلقائياً</p>
            <p className="text-sm font-black text-white">{formattedDate}</p>
            <p className="text-xs font-bold text-indigo-300 mt-1.5 flex items-center gap-1.5 md:justify-start justify-center">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>{formattedTime}</span>
            </p>
            <p className="text-[9px] font-mono text-slate-400 mt-1">توقيت القاهرة الموحد المباشر</p>
          </div>
        </div>
      </div>

      {/* Critical Alerts Sector (نظام الإنذار المبكر والتنبيهات الإجرائية الذكية) */}
      {earlyWarningAlerts.filter(a => !dismissedAlerts.includes(a.id)).length > 0 && (
        <div variants={itemVariants} className="space-y-2.5">
          <div className="flex items-center justify-between border-b border-rose-100 pb-1.5">
            <h2 className="text-sm font-black text-rose-950 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 absolute animate-pulse"></span>
              <span>🔔 نظام الإنذار المبكر والذكاء الإجرائي للمحاماة</span>
              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full border border-red-200">
                {earlyWarningAlerts.filter(a => !dismissedAlerts.includes(a.id)).length} تنبيه عاجل
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {dismissedAlerts.length > 0 && (
                <button onClick={() => setDismissedAlerts([])} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition">
                  إظهار الكل
                </button>
              )}
              <button 
                onClick={() => onNavigate('calendar')} 
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 transition"
                id="view-calendar-btn"
              >
                الأجندة والمواعيد الكاملة
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {earlyWarningAlerts.filter(a => !dismissedAlerts.includes(a.id)).map((alert) => {
              const isCritical = alert.severity === 'critical';
              return (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2 shadow-xs hover:shadow-md transition duration-250 ${
                    isCritical 
                      ? 'bg-rose-50/65 border-rose-250 text-rose-950' 
                      : 'bg-slate-50/50 border-slate-200 text-slate-700'
                  }`}
                  id={`early-alert-card-${alert.id}`}
                >
                  <div className="flex gap-2.5">
                    <div className={`p-2 rounded-lg flex-shrink-0 flex items-center justify-center h-9 w-9 ${
                      isCritical ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${isCritical ? 'animate-bounce' : 'animate-pulse'}`} />
                    </div>
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs leading-snug truncate block">{alert.title}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black font-sans flex-shrink-0 whitespace-nowrap ${
                          isCritical ? 'bg-rose-200 text-rose-900 border border-rose-300' : 'bg-slate-200 text-slate-900 border border-slate-300'
                        }`}>
                          {alert.timeLeft}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed font-bold">{alert.description}</p>
                      {alert.lawReference && (
                        <p className="text-[10px] opacity-75 font-medium italic border-t border-rose-100/30 pt-1 mt-1 leading-normal">
                          ⚖️ {alert.lawReference}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100/30 flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDismissedAlerts(prev => [...prev, alert.id])}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition px-1"
                        title="تم الاطلاڡ إخفاء التنبيه"
                      >
                        ✕
                      </button>
                      <span className="text-slate-500 font-bold font-mono">
                        {alert.type === 'bailiff' ? '📦 محضرين ومطالبات' : alert.type === 'session' ? '🏛️ جلسة قضائية' : '📅 سقوط ميعاد'}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        if (alert.caseId) {
                          onSelectCase(alert.caseId);
                        } else {
                          onNavigate(alert.actionTab);
                        }
                      }} 
                      className={`font-black hover:underline transition flex items-center gap-0.5 ${
                        isCritical ? 'text-rose-700 hover:text-rose-900' : 'text-slate-700 hover:text-slate-900'
                      }`}
                      id={`resolve-early-alert-${alert.id}`}
                    >
                      <span>{alert.actionLabel}</span>
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Statistics Grid */}
      <div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Cases Stats */}
        <div onClick={() => onNavigate('cases')} className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm flex items-center justify-between hover:border-indigo-500/30 hover:shadow-md transition cursor-pointer">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">إجمالي القضايا النشطة</p>
            <div className="flex justify-between items-baseline gap-2">
              <h3 className="text-xl font-bold text-slate-800">{activeCasesCount}</h3>
            </div>
            <p className="text-[10px] text-slate-400">تحت المراوغة والتقاضي حالياً</p>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-100 rounded text-slate-600">
            <Briefcase className="h-5 w-5" id="dashboard-briefcase-icon" />
          </div>
        </div>

        {/* Clients Stats */}
        <div onClick={() => onNavigate('clients')} className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm flex items-center justify-between hover:border-indigo-500/30 hover:shadow-md transition cursor-pointer">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">موكلين مكتب المحاماة</p>
            <div className="flex justify-between items-baseline gap-2">
              <h3 className="text-xl font-bold text-slate-800">{totalClientsCount}</h3>
              <span className="text-slate-450 text-[10px]">نشطين</span>
            </div>
            <p className="text-[10px] text-slate-400">شركات وهيئات وأفراد مسجلين</p>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-100 rounded text-slate-600">
            <Users className="h-5 w-5" id="dashboard-users-icon" />
          </div>
        </div>

        {/* Sessions Week */}
        <div onClick={() => onNavigate('calendar')} className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm flex items-center justify-between hover:border-indigo-500/30 hover:shadow-md transition cursor-pointer">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">جلسات هذا الإسبوع</p>
            <div className="flex justify-between items-baseline gap-2">
              <h3 className="text-xl font-bold text-slate-850">{upcomingSessions.length}</h3>
              <span className="text-indigo-650 text-[11px] font-bold">
                {sessions.filter(s => s.status === 'قادمة' && s.date === new Date().toISOString().split('T')[0]).length} اليوم
              </span>
            </div>
            <p className="text-[10px] text-slate-400">تستلزم تجهيز مذكرات الدفاع</p>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <Calendar className="h-5 w-5" id="dashboard-calendar-icon" />
          </div>
        </div>

        {/* Ledger Vault Box */}
        <div onClick={() => onNavigate('financials')} className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm flex items-center justify-between hover:border-indigo-500/30 hover:shadow-md transition cursor-pointer">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">الحسابات والمالية (ج.م)</p>
            <div className="flex justify-between items-baseline gap-2">
              <h3 className="text-xl font-bold text-blue-600">{netProfit.toLocaleString('ar-EG')}</h3>
              <span className="text-slate-400 text-[10px]">
                {new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(new Date())}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">إجمالي الأرباح والإيرادات الصافية</p>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
            <DollarSign className="h-5 w-5" id="dashboard-dollarsign-icon" />
          </div>
        </div>

      </div>

      {/* Grid: Primary details */}
      <div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Today & Tomorrow Sessions Table (الأجندة القريبة) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">أجندة الجلسات القادمة الفورية</h3>
              <p className="text-xs text-slate-500">أعمال المحاكم اليوم والغد</p>
            </div>
            <button 
              onClick={() => onNavigate('calendar')} 
              className="text-xs font-semibold text-slate-600 hover:text-indigo-700 flex items-center gap-1 transition"
              id="view-all-sessions-btn"
            >
              إدارة كافة الجلسات
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {sessions.filter(s => s.status === 'قادمة').length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                لا توجد جلسات مجدولة قريباً.
              </div>
            ) : (
              sessions
                .filter(s => s.status === 'قادمة')
                .slice(0, 3)
                .map((session) => {
                  const sDate = new Date(session.date);
                  const currentDate = new Date();
                  const daysDiff = Math.ceil((sDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                  let dayLabel = session.date;
                  if (daysDiff === 0) dayLabel = 'اليوم';
                  else if (daysDiff === 1) dayLabel = 'غداً';
                  
                  return (
                    <div 
                      key={session.id} 
                      className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      id={`session-row-${session.id}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1 px-2 text-[10px] font-bold rounded bg-indigo-50 text-indigo-700">رقم: {session.caseNumber}</span>
                          <span className="text-xs text-slate-500">{session.court}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{session.clientName}</h4>
                        <p className="text-xs text-slate-600 line-clamp-1"><strong className="text-indigo-700">مطلوب: </strong>{session.objective}</p>
                      </div>

                      <div className="flex md:flex-col items-end justify-between md:justify-center w-full md:w-auto border-t md:border-0 pt-2 md:pt-0 border-slate-100 text-end">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            daysDiff === 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-700'
                          }`}>
                            {dayLabel}
                          </span>
                          {onDeleteSession && (
                            <button
                              onClick={async e => { e.stopPropagation(); if (await confirm('حذف هذه الجلسɿ')) onDeleteSession(session.id); }}
                              className="text-slate-300 hover:text-red-500 transition p-0.5"
                              title="حذف الجلسة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono mt-1">{session.circuit}</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Column Right: Action Shortcut Board */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">إجراء سريع وإداري</h3>
            <p className="text-[11px] text-slate-500">الوصول السريع لنماذج الأدوات القانونية</p>
          </div>

          <div className="space-y-2">
            
            <button 
              onClick={() => onNavigate('cases')}
              className="w-full text-end p-3 rounded-lg border border-slate-100 hover:border-indigo-600/30 hover:bg-slate-50 flex items-center justify-between transition group"
              id="shortcut-add-case"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded group-hover:bg-indigo-100 transition">
                  <Scale className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-850 text-xs">تسجيل قضية جديدة</h4>
                  <p className="text-[10px] text-slate-400">رقم، محكمɡ أتعاب ودرجة تقاضي</p>
                </div>
              </div>
              <ChevronLeft className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
            </button>

            <button 
              onClick={() => onNavigate('clients')}
              className="w-full text-end p-3 rounded-lg border border-slate-100 hover:border-indigo-600/30 hover:bg-slate-50 flex items-center justify-between transition group"
              id="shortcut-add-client"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded group-hover:bg-sky-100 transition">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-850 text-xs">إضافة موكل وتوكيل رسمي</h4>
                  <p className="text-[10px] text-slate-400">إثبات هوية وتسجيل أرقام توثيقات</p>
                </div>
              </div>
              <ChevronLeft className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
            </button>

            <button 
              onClick={() => onNavigate('templates')}
              className="w-full text-end p-3 rounded-lg border border-slate-100 hover:border-indigo-600/30 hover:bg-slate-50 flex items-center justify-between transition group"
              id="shortcut-view-templates"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded group-hover:bg-indigo-100 transition">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-850 text-xs">إنشاء العقود وصحف الدعاوى</h4>
                  <p className="text-[10px] text-slate-400">صحف ونماذج العقود والإنذارات التفاعلية</p>
                </div>
              </div>
              <ChevronLeft className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
            </button>

            <button 
              onClick={() => onNavigate('legal-library')}
              className="w-full text-end p-3 rounded-lg border border-slate-100 hover:border-indigo-600/30 hover:bg-slate-50 flex items-center justify-between transition group"
              id="shortcut-view-library"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-650 rounded group-hover:bg-indigo-100 transition text-indigo-605">
                  <BookOpen className="h-4.5 w-4.5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-850 text-xs">البحث في المكتبة القانونية</h4>
                  <p className="text-[10px] text-slate-400">الأكواد الأساسية ومبادئ محكمة النقض المصرية</p>
                </div>
              </div>
              <ChevronLeft className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
            </button>

          </div>

          <div className="bg-slate-50 p-3 rounded border border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-750 mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              تذكير بالمواعيد المدنية والجنائية بمصر
            </h4>
            <ul className="text-[10px] text-slate-500 space-y-0.5 list-disc list-inside">
              <li>استئناف الأحكام المدنية والتجارية: ٤٠ يوماً</li>
              <li>الطعن بالمعارضة والاستئناف الجنائي: ١٠ أيام</li>
              <li>الطعن أمام محكمة النقض الجنائي/المدني: ٦٠ يوماً</li>
              <li>الطعن بالإلغاء أمام مجلس الدولة: ٦٠ يوماً</li>
            </ul>
          </div>
        </div>

      </div>

      {/* Case Type Distribution Chart */}
      {casesByType.length > 0 && (
        <div variants={itemVariants} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-800">توزيع القضايا حسب النوع</h3>
              <p className="text-[11px] text-slate-500">نسبة التخصصات القانونية بالمكتب</p>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={casesByType} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {casesByType.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {casesByType.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="font-bold text-slate-700">{item.name}</span>
                  <span className="text-slate-400">({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial Overview (الدائن والمدين مؤخراً) */}
      <div variants={itemVariants} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-800">آخر التحركات والواردات بالخزينة</h3>
            <p className="text-[11px] text-slate-500">إيصالات الدفع وأتعاب الموكلين</p>
          </div>
          <button 
            onClick={() => onNavigate('financials')} 
            className="text-xs font-semibold text-slate-600 hover:text-indigo-700 flex items-center gap-1 transition"
            id="view-financials-btn"
          >
            دفتر المالية بالكامل
            <ChevronLeft className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {transactions.slice(0, 3).map((transaction) => (
            <div 
              key={transaction.id} 
              className="p-2.5 border border-slate-100 rounded bg-slate-50/20 flex items-center justify-between gap-3"
              id={`transaction-mini-${transaction.id}`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded ${
                  transaction.ioType.includes('وارد') 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'bg-rose-50 text-rose-600'
                }`}>
                  {transaction.ioType.includes('وارد') ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 leading-tight truncate">{transaction.clientName}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{transaction.type} - {transaction.paymentMethod}</p>
                </div>
              </div>
              <div className="text-start font-mono text-nowrap shrink-0">
                <span className={`text-xs font-bold ${
                  transaction.ioType.includes('وارد') ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {transaction.ioType.includes('وارد') ? '+' : '-'}{transaction.amount.toLocaleString('ar-EG')} ج.م
                </span>
                <p className="text-[9px] text-slate-400 leading-none">{transaction.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
