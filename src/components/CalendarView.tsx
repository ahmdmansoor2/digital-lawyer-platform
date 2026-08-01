/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  Plus, 
  CheckCircle, 
  ChevronLeft, 
  X, 
  RefreshCw, 
  MessageSquare, 
  ListTodo,
  CalendarRange,
  ChevronRight,
  CalendarDays,
  Trash2,
  Edit,
  Gavel,
  AlertCircle,
  Star,
  Zap,
  Filter,
  Search,
  ChevronDown,
  Circle,
  CheckCircle2,
  Briefcase,
  Flag,
  Bell,
  Info,
  MoreVertical,
  Printer
} from 'lucide-react';
import { Session, LegalDeadline, Case, OfficeProfile, LawTask, Client } from '../types';
import { printSingleSession } from '../utils/printHelper';
import {
  getGoogleClientId,
  initiateGoogleAuth
} from '../utils/googleCalendarHelper';
import { sendWhatsAppMessage, getSessionReminderText, getDeadlineReminderText } from '../utils/whatsappHelper';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import DayDetailModal, { DayEvents } from './calendar/modals/DayDetailModal';
import EventDetailModal, { SelectedEvent } from './calendar/modals/EventDetailModal';
import AddDeadlineModal, { DeadlineFormData } from './calendar/modals/AddDeadlineModal';
import SessionModal, { SessionFormData } from './calendar/modals/SessionModal';
import { useCustomFields } from '../hooks/useCustomFields';
import MonthView from './calendar/MonthView';
import WeekView from './calendar/WeekView';
import DayView from './calendar/DayView';
import AgendaView, { AgendaEvent } from './calendar/AgendaView';

interface CalendarViewProps {
  sessions: Session[];
  deadlines: LegalDeadline[];
  cases: Case[];
  tasks: LawTask[];
  clients?: Client[];
  onAddDeadline: (newDeadline: LegalDeadline) => void;
  onToggleDeadlineComplete: (id: string) => void;
  onToggleTaskStatus: (id: string) => void;
  onUpdateSessionDecision: (sessionId: string, decision: string) => void;
  onUpdateSessionGoogleEventId: (id: string, googleEventId: string) => void;
  onUpdateDeadlineGoogleEventId: (id: string, googleEventId: string) => void;
  onAddSession: (newSession: Session) => void;
  onUpdateSession: (updatedSession: Session) => void;
  onDeleteSession: (id: string) => void;
  officeProfile: OfficeProfile;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

const monthNames = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const dayNamesShort = ['سبت','أحد','إثن','ثلا','أرب','خمس','جمع'];
const dayNamesFull = ['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];

const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

const getHourSlot = (timeStr?: string, defaultHour: string = '09:00'): string => {
  if (!timeStr) return defaultHour;
  const parts = timeStr.split(':');
  if (parts.length > 0) {
    const hr = parts[0].padStart(2, '0');
    return `${hr}:00`;
  }
  return defaultHour;
};

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayOfWeekIndex(date: Date): number {
  // Saturday = 0, Sunday = 1, ..., Friday = 6
  return (date.getDay() + 1) % 7;
}

const CalendarView = React.memo(function CalendarView({
  sessions,
  deadlines,
  cases,
  tasks,
  clients = [],
  onAddDeadline,
  onToggleDeadlineComplete,
  onToggleTaskStatus,
  onUpdateSessionDecision,
  onUpdateSessionGoogleEventId,
  onUpdateDeadlineGoogleEventId,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  officeProfile
}: CalendarViewProps) {
  const confirm = useConfirm();
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  // ─── View & Date State ───────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<CalendarViewMode>('month');
  const [focusDate, setFocusDate] = useState<Date>(() => new Date(todayStr));

  // ─── Selected Event Details ──────────────────────────────────────────────
  const [selectedDay, setSelectedDay] = useState<DayEvents | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{ type: 'session' | 'deadline' | 'task'; data: any } | null>(null);

  // ─── Form Modals ─────────────────────────────────────────────────────────
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionDecisionInput, setSessionDecisionInput] = useState('');
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const sessionCustomFields = useCustomFields('session');

  // ─── Filter State ────────────────────────────────────────────────────────
  const [showSessions, setShowSessions] = useState(true);
  const [showDeadlines, setShowDeadlines] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [agendaSearchQuery, setAgendaSearchQuery] = useState('');

  // ─── Deadline Form ───────────────────────────────────────────────────────
  const [deadlineFormData, setDeadlineFormData] = useState({
    caseId: '',
    title: 'ميعاد الطعن بالاستئناف العالي',
    startDate: todayStr,
    daysLimit: 40,
    lawReference: 'المادة ٢٢٧ من قانون المرافعات المصري: ميعاد الاستئناف أربعون يوماً ما لم ينص القانون على خلاف ذلك.',
    notes: ''
  });

  // ─── Session Form ────────────────────────────────────────────────────────
  const [sessionForm, setSessionForm] = useState<{
    caseId: string;
    date: string;
    court: string;
    circuit: string;
    objective: string;
    decision: string;
    status: 'قادمة' | 'منتهية';
    judgeName: string;
    notes: string;
    time: string;
    customFieldValues?: Record<string, any>;
  }>({
    caseId: '',
    date: todayStr,
    court: '',
    circuit: '',
    objective: '',
    decision: '',
    status: 'قادمة',
    judgeName: '',
    notes: '',
    time: '09:00'
  });

  // ─── Google Calendar Integration (extracted to useGoogleCalendar hook) ────
  const [customGoogleClientId] = useState<string>(() => localStorage.getItem('custom_google_client_id') || '');
  const {
    isConnected: googleIsConnected,
    userInfo: googleUserInfo,
    isSyncing,
    syncStatusMsg,
    syncItem: handleSyncItem,
    bulkSync: handleBulkSync
  } = useGoogleCalendar({
    sessions,
    deadlines,
    onUpdateSessionGoogleEventId,
    onUpdateDeadlineGoogleEventId
  });

  // ─── Helper Functions ────────────────────────────────────────────────────
  const getPhoneForSession = (s: Session) => {
    const matched = cases.find(c => c.id === s.caseId || c.caseNumber === s.caseNumber);
    if (matched) { const client = clients.find(cl => cl.id === matched.clientId); if (client) return client.phone; }
    return '';
  };

  const getPhoneForDeadline = (dl: LegalDeadline) => {
    const matched = cases.find(c => c.id === dl.caseId || c.caseNumber === dl.caseNumber);
    if (matched) { const client = clients.find(cl => cl.id === matched.clientId); if (client) return client.phone; }
    return '';
  };

  // Memoized maps for O(1) day lookups to eliminate lag
  const sessionsMap = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  const deadlinesMap = useMemo(() => {
    const map: Record<string, LegalDeadline[]> = {};
    deadlines.forEach(dl => {
      if (!map[dl.deadlineDate]) map[dl.deadlineDate] = [];
      map[dl.deadlineDate].push(dl);
    });
    return map;
  }, [deadlines]);

  const tasksMap = useMemo(() => {
    const map: Record<string, LawTask[]> = {};
    tasks.forEach(t => {
      if (!map[t.dueDate]) map[t.dueDate] = [];
      map[t.dueDate].push(t);
    });
    return map;
  }, [tasks]);

  const getDayEvents = useCallback((dateStr: string): DayEvents => ({
    date: dateStr,
    sessions: showSessions ? (sessionsMap[dateStr] || []) : [],
    deadlines: showDeadlines ? (deadlinesMap[dateStr] || []) : [],
    tasks: showTasks ? (tasksMap[dateStr] || []) : []
  }), [sessionsMap, deadlinesMap, tasksMap, showSessions, showDeadlines, showTasks]);

  const getDayEventsUnfiltered = useCallback((dateStr: string): DayEvents => ({
    date: dateStr,
    sessions: sessionsMap[dateStr] || [],
    deadlines: deadlinesMap[dateStr] || [],
    tasks: tasksMap[dateStr] || []
  }), [sessionsMap, deadlinesMap, tasksMap]);

  const getTotalCount = (ev: DayEvents) => ev.sessions.length + ev.deadlines.length + ev.tasks.length;

  const getMonthDays = (date: Date): (Date | null)[] => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const offset = getDayOfWeekIndex(start);
    const days: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= end.getDate(); d++) days.push(new Date(date.getFullYear(), date.getMonth(), d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  const getWeekDays = (date: Date): Date[] => {
    const dow = getDayOfWeekIndex(date);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  // ─── Navigation ──────────────────────────────────────────────────────────
  const handlePrev = () => {
    const d = new Date(focusDate);
    if (currentView === 'month') setFocusDate(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else if (currentView === 'week') { d.setDate(d.getDate() - 7); setFocusDate(d); }
    else if (currentView === 'day') { d.setDate(d.getDate() - 1); setFocusDate(d); }
  };

  const handleNext = () => {
    const d = new Date(focusDate);
    if (currentView === 'month') setFocusDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else if (currentView === 'week') { d.setDate(d.getDate() + 7); setFocusDate(d); }
    else if (currentView === 'day') { d.setDate(d.getDate() + 1); setFocusDate(d); }
  };

  // ─── Form Handlers ───────────────────────────────────────────────────────
  const handleAddDeadlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineFormData.caseId || !deadlineFormData.title) { await showAlert('يرجى اختيار القضية ونوع الميعاد'); return; }
    const selectedCase = cases.find(c => c.id === deadlineFormData.caseId);
    if (!selectedCase) return;
    const start = new Date(deadlineFormData.startDate);
    start.setDate(start.getDate() + Number(deadlineFormData.daysLimit));
    const newDl: LegalDeadline = {
      id: 'dl_' + Date.now(),
      caseId: selectedCase.id,
      caseNumber: selectedCase.caseNumber,
      clientName: selectedCase.clientName,
      title: deadlineFormData.title,
      startDate: deadlineFormData.startDate,
      deadlineDate: start.toISOString().split('T')[0],
      lawReference: deadlineFormData.lawReference,
      isCompleted: false,
      notes: deadlineFormData.notes
    };
    onAddDeadline(newDl);
    setIsAddingDeadline(false);
  };

  const handleAddSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.caseId || !sessionForm.date || !sessionForm.court) { await showAlert('يرجى ملء الحقول الإجبارية'); return; }
    const selectedCase = cases.find(c => c.id === sessionForm.caseId);
    if (!selectedCase) return;
    const newSession: Session = {
      id: 'session_' + Date.now(),
      caseId: sessionForm.caseId,
      caseNumber: selectedCase.caseNumber,
      clientName: selectedCase.clientName,
      date: sessionForm.date,
      court: sessionForm.court,
      circuit: sessionForm.circuit,
      objective: sessionForm.objective || 'حضور الجلسة والمرافعة',
      decision: sessionForm.decision || undefined,
      status: sessionForm.status,
      judgeName: sessionForm.judgeName || undefined,
      notes: sessionForm.notes || undefined,
      time: sessionForm.time || '09:00',
      customFieldValues: sessionForm.customFieldValues
    };
    onAddSession(newSession);
    setIsAddingSession(false);
    setSessionForm({ caseId: '', date: todayStr, court: '', circuit: '', objective: '', decision: '', status: 'قادمة', judgeName: '', notes: '', time: '09:00' });
  };

  const handleEditSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    const selectedCase = cases.find(c => c.id === sessionForm.caseId);
    const updated: Session = {
      ...editingSession,
      caseNumber: selectedCase ? selectedCase.caseNumber : editingSession.caseNumber,
      clientName: selectedCase ? selectedCase.clientName : editingSession.clientName,
      date: sessionForm.date,
      court: sessionForm.court,
      circuit: sessionForm.circuit,
      objective: sessionForm.objective,
      decision: sessionForm.decision || undefined,
      status: sessionForm.status,
      judgeName: sessionForm.judgeName || undefined,
      notes: sessionForm.notes || undefined,
      time: sessionForm.time || '09:00',
      customFieldValues: sessionForm.customFieldValues
    };
    onUpdateSession(updated);
    setEditingSession(null);
  };

  const openEditSession = (session: Session) => {
    setEditingSession(session);
    setSessionForm({
      caseId: session.caseId,
      date: session.date,
      court: session.court,
      circuit: session.circuit || '',
      objective: session.objective,
      decision: session.decision || '',
      status: session.status,
      judgeName: session.judgeName || '',
      notes: session.notes || '',
      time: session.time || '09:00',
      customFieldValues: session.customFieldValues || {}
    });
  };

  const handleDeadlinePreset = (title: string) => {
    const presets: Record<string, { limit: number; ref: string }> = {
      'استئناف مدني': { limit: 40, ref: 'المادة ٢٢٧ مرافعات: ميعاد استئناف المدني ٤٠ يوماً.' },
      'معارضة جنائية': { limit: 10, ref: 'المادة ٣٩٨ إجراءات جنائية: ميعاد المعارضة ١٠ أيام.' },
      'استئناف جنائي': { limit: 10, ref: 'المادة ٤٠٦ إجراءات جنائية: ميعاد الاستئناف الجنائي ١٠ أيام.' },
      'طعن بالنقض': { limit: 60, ref: 'قانون حالات الطعن: ميعاد النقض ٦٠ يوماً.' },
    };
    for (const [key, val] of Object.entries(presets)) {
      if (title.includes(key)) {
        setDeadlineFormData(prev => ({ ...prev, title, daysLimit: val.limit, lawReference: val.ref }));
        return;
      }
    }
    setDeadlineFormData(prev => ({ ...prev, title }));
  };

  // ─── Stats for header ────────────────────────────────────────────────────
  const upcomingSessions = sessions.filter(s => s.date >= todayStr && s.status === 'قادمة').length;
  const overdueDeadlines = deadlines.filter(dl => !dl.isCompleted && dl.deadlineDate < todayStr).length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const todayEvents = getDayEventsUnfiltered(todayStr);
  const todayTotal = getTotalCount(todayEvents);

  // ─── Color Classes ───────────────────────────────────────────────────────
  const sessionColor = {
    bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900',
    badge: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500', accent: 'border-e-indigo-500'
  };
  const deadlineColor = {
    bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-900',
    badge: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500', accent: 'border-e-rose-500'
  };
  const taskColor = {
    bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500', accent: 'border-e-blue-500'
  };

  // ─── Agenda filtered data ─────────────────────────────────────────────────
  const allAgendaEvents = [
    ...(showSessions ? sessions.map(s => ({ date: s.date, type: 'session' as const, data: s })) : []),
    ...(showDeadlines ? deadlines.filter(dl => !dl.isCompleted).map(dl => ({ date: dl.deadlineDate, type: 'deadline' as const, data: dl })) : []),
    ...(showTasks ? tasks.filter(t => t.status === 'pending').map(t => ({ date: t.dueDate, type: 'task' as const, data: t })) : []),
  ]
    .filter(ev => ev.date >= todayStr)
    .filter(ev => {
      if (!agendaSearchQuery) return true;
      const q = agendaSearchQuery.toLowerCase();
      if (ev.type === 'session') {
        const s = ev.data as Session;
        return s.court.toLowerCase().includes(q) || s.clientName.toLowerCase().includes(q) || s.caseNumber.includes(q);
      }
      if (ev.type === 'deadline') {
        const dl = ev.data as LegalDeadline;
        return dl.title.toLowerCase().includes(q) || dl.clientName.toLowerCase().includes(q);
      }
      if (ev.type === 'task') {
        const t = ev.data as LawTask;
        return t.title.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group by date for agenda view
  const agendaGrouped = allAgendaEvents.reduce((groups, event) => {
    if (!groups[event.date]) groups[event.date] = [];
    groups[event.date].push(event);
    return groups;
  }, {} as Record<string, typeof allAgendaEvents>);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 text-end" dir="rtl">

      {/* ── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                أجندة المكتب الرقمي
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                تقويم تفاعلي
              </span>
              {googleIsConnected && (
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5" />
                  متزامن مع Google Calendar
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-white" />
              جدول الجلسات والمواعيد القانونية
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              إدارة كاملة لجلساتك القضائيɡ مواعيدك الإجرائيɡ ومهام المكتب — بطرق عرض شهرية وأسبوعية ويومية وقائمة جدول الأعمال.
            </p>
          </div>

          {/* KPI stats */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {[
              { label: 'جلسات قادمة', value: upcomingSessions, color: 'text-indigo-300', bg: 'bg-indigo-500/10 border-indigo-500/20' },
              { label: 'مواعيد منتهية', value: overdueDeadlines, color: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/20' },
              { label: 'مهام معلقة', value: pendingTasks, color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'أحداث اليوم', value: todayTotal, color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            ].map((stat, i) => (
              <div key={i} className={`${stat.bg} border rounded-2xl p-3 text-center min-w-[80px]`}>
                <div className={`text-lg font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-slate-400 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

          {/* View Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {([
              { id: 'month', label: 'شهر', icon: CalendarIcon },
              { id: 'week', label: 'أسبوع', icon: CalendarDays },
              { id: 'day', label: 'يوم', icon: CalendarRange },
              { id: 'agenda', label: 'جدول الأعمال', icon: ListTodo },
            ] as const).map(view => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentView === view.id
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{view.label}</span>
                </button>
              );
            })}
          </div>

          {/* Date Navigation */}
          {currentView !== 'agenda' && (
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-xl transition border border-slate-200">
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
              <div className="min-w-[160px] text-center">
                <span className="text-sm font-black text-slate-800">
                  {currentView === 'month' && `${monthNames[focusDate.getMonth()]} ${focusDate.getFullYear()}`}
                  {currentView === 'week' && (() => {
                    const wDays = getWeekDays(focusDate);
                    const first = wDays[0], last = wDays[6];
                    if (first.getMonth() === last.getMonth())
                      return `${first.getDate()} – ${last.getDate()} ${monthNames[first.getMonth()]} ${first.getFullYear()}`;
                    return `${first.getDate()} ${monthNames[first.getMonth()]} – ${last.getDate()} ${monthNames[last.getMonth()]}`;
                  })()}
                  {currentView === 'day' && `${dayNamesFull[getDayOfWeekIndex(focusDate)]}، ${focusDate.getDate()} ${monthNames[focusDate.getMonth()]} ${focusDate.getFullYear()}`}
                </span>
              </div>
              <button onClick={handleNext} className="p-2 hover:bg-slate-100 rounded-xl transition border border-slate-200">
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <button
                onClick={() => setFocusDate(new Date(todayStr))}
                className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition border border-indigo-100"
              >
                اليوم
              </button>
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Event filters */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => setShowSessions(p => !p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${showSessions ? 'bg-indigo-100 text-indigo-800' : 'text-slate-400'}`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500" />جلسات
              </button>
              <button
                onClick={() => setShowDeadlines(p => !p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${showDeadlines ? 'bg-rose-100 text-rose-800' : 'text-slate-400'}`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />مواعيد
              </button>
              <button
                onClick={() => setShowTasks(p => !p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${showTasks ? 'bg-blue-100 text-blue-800' : 'text-slate-400'}`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />مهام
              </button>
            </div>

            {/* Google Sync */}
            {googleIsConnected ? (
              <button
                onClick={handleBulkSync}
                disabled={!!isSyncing}
                className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                مزامنة Google
              </button>
            ) : (
              <button
                onClick={() => initiateGoogleAuth(customGoogleClientId || getGoogleClientId())}
                className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1"
              >
                ربط Google Calendar 🔗
              </button>
            )}

            {/* Add buttons */}
            <button
              onClick={() => { setSessionForm({ caseId: '', date: todayStr, court: '', circuit: '', objective: '', status: 'قادمة', judgeName: '', notes: '' }); setIsAddingSession(true); }}
              className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              جلسة
            </button>
            <button
              onClick={() => setIsAddingDeadline(true)}
              className="text-xs font-bold bg-rose-600 text-white px-3 py-1.5 rounded-xl hover:bg-rose-700 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              ميعاد
            </button>
          </div>
        </div>

        {/* Sync status bar */}
          {syncStatusMsg && (
            <div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 bg-indigo-50 text-indigo-800 text-xs font-bold px-3 py-2 rounded-xl border border-indigo-100 flex items-center gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              {syncStatusMsg}
            </div>
          )}
      </div>

      {/* ── MAIN CALENDAR AREA ────────────────────────────────────────────────── */}
        <div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >

          {/* ─── MONTH VIEW (extracted) ──────────────────────────────────── */}
          {currentView === 'month' && (
            <MonthView
              focusDate={focusDate}
              today={today}
              todayStr={todayStr}
              getMonthDays={getMonthDays}
              getDayEvents={getDayEvents}
              getDayEventsUnfiltered={getDayEventsUnfiltered}
              getTotalCount={getTotalCount}
              setSelectedDay={setSelectedDay}
              setSelectedEvent={setSelectedEvent}
              setFocusDate={setFocusDate}
              setCurrentView={setCurrentView}
            />
          )}

          {/* ─── WEEK VIEW (extracted) ──────────────────────────────────────── */}
          {currentView === 'week' && (
            <WeekView
              focusDate={focusDate}
              todayStr={todayStr}
              getWeekDays={getWeekDays}
              getDayEvents={getDayEvents}
              getTotalCount={getTotalCount}
              setFocusDate={setFocusDate}
              setCurrentView={setCurrentView}
              setSelectedEvent={setSelectedEvent}
              setSessionForm={setSessionForm}
              setIsAddingSession={setIsAddingSession}
            />
          )}

          {/* ─── DAY VIEW (extracted) ─────────────────────────────────────── */}
          {currentView === 'day' && (
            <DayView
              focusDate={focusDate}
              today={today}
              todayStr={todayStr}
              getDayEvents={getDayEvents}
              getDayEventsUnfiltered={getDayEventsUnfiltered}
              getTotalCount={getTotalCount}
              getMonthDays={getMonthDays}
              cases={cases}
              officeProfile={officeProfile}
              allAgendaEvents={allAgendaEvents}
              confirm={confirm}
              printSingleSession={printSingleSession}
              setFocusDate={setFocusDate}
              setSessionForm={setSessionForm}
              setIsAddingSession={setIsAddingSession}
              openEditSession={openEditSession}
              onDeleteSession={onDeleteSession}
              onToggleDeadlineComplete={onToggleDeadlineComplete}
              onToggleTaskStatus={onToggleTaskStatus}
            />
          )}

          {/* ─── AGENDA VIEW (extracted) ────────────────────────────────────── */}
          {currentView === 'agenda' && (
            <AgendaView
              todayStr={todayStr}
              agendaSearchQuery={agendaSearchQuery}
              setAgendaSearchQuery={setAgendaSearchQuery}
              allAgendaEvents={allAgendaEvents}
              agendaGrouped={agendaGrouped}
              cases={cases}
              officeProfile={officeProfile}
              confirm={confirm}
              printSingleSession={printSingleSession}
              getPhoneForSession={getPhoneForSession}
              getPhoneForDeadline={getPhoneForDeadline}
              sendWhatsAppMessage={sendWhatsAppMessage}
              getSessionReminderText={getSessionReminderText}
              getDeadlineReminderText={getDeadlineReminderText}
              openEditSession={openEditSession}
              onDeleteSession={onDeleteSession}
              onToggleDeadlineComplete={onToggleDeadlineComplete}
              onToggleTaskStatus={onToggleTaskStatus}
            />
          )}

        </div>
      {/* ── DAY DETAIL MODAL (extracted to components/calendar/modals/DayDetailModal.tsx) ─ */}
      <DayDetailModal
        selectedDay={selectedDay}
        onClose={() => setSelectedDay(null)}
        getTotalCount={getTotalCount}
        onToggleDeadlineComplete={onToggleDeadlineComplete}
        onToggleTaskStatus={onToggleTaskStatus}
        onDeleteSession={onDeleteSession}
        onOpenEditSession={openEditSession}
        confirm={confirm}
        setFocusDate={setFocusDate}
        setCurrentView={setCurrentView}
        setSessionForm={setSessionForm}
        setIsAddingSession={setIsAddingSession}
      />
      {/* ── EVENT DETAIL MODAL (extracted to components/calendar/modals/EventDetailModal.tsx) ─ */}
      <EventDetailModal
        selectedEvent={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onOpenEditSession={openEditSession}
        onDeleteSession={onDeleteSession}
        onToggleDeadlineComplete={onToggleDeadlineComplete}
        onToggleTaskStatus={onToggleTaskStatus}
        cases={cases}
        officeProfile={officeProfile}
        printSingleSession={printSingleSession}
        getPhoneForSession={getPhoneForSession}
        getPhoneForDeadline={getPhoneForDeadline}
        sendWhatsAppMessage={sendWhatsAppMessage}
        getSessionReminderText={getSessionReminderText}
        getDeadlineReminderText={getDeadlineReminderText}
        confirm={confirm}
      />
      {/* ── ADD DEADLINE MODAL (extracted) ─ */}
      <AddDeadlineModal
        open={isAddingDeadline}
        onClose={() => setIsAddingDeadline(false)}
        cases={cases}
        formData={deadlineFormData}
        setFormData={setDeadlineFormData}
        onApplyPreset={handleDeadlinePreset}
        onSubmit={handleAddDeadlineSubmit}
      />

      {/* ── SESSION MODAL (extracted) ─ */}
      <SessionModal
        open={isAddingSession || !!editingSession}
        editingSession={editingSession}
        onClose={() => { setIsAddingSession(false); setEditingSession(null); }}
        cases={cases}
        sessions={sessions}
        formData={sessionForm}
        setFormData={setSessionForm}
        onAddSubmit={handleAddSessionSubmit}
        onEditSubmit={handleEditSessionSubmit}
        customFields={sessionCustomFields}
      />
    </div>
  );
});

export default CalendarView;
