/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
;
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Printer, 
  Briefcase, 
  Users, 
  Calendar, 
  Clock, 
  Wallet, 
  Search, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  ShieldCheck,
  Filter,
  Eye
} from 'lucide-react';
import { Case, Client, Session, Transaction, LawTask, OfficeProfile } from '../types';
import { 
  printSingleCase, 
  printSingleClient, 
  printSingleSession, 
  printSingleTask, 
  printSingleTransaction,
  printBulkCases,
  printBulkClients,
  printBulkSessions,
  printBulkTasks,
  printBulkFinancials
} from '../utils/printHelper';
import {
  exportCaseToWord,
  exportClientToWord,
  exportSessionToWord,
  exportTaskToWord,
  exportTransactionToWord,
  exportBulkCasesToWord,
  exportBulkClientsToWord,
  exportBulkSessionsToWord,
  exportBulkTasksToWord,
  exportBulkFinancialsToWord
} from '../utils/wordExportHelper';
import { useConfirm } from '../contexts/ConfirmContext';

interface ReportsPanelProps {
  cases: Case[];
  clients: Client[];
  sessions: Session[];
  transactions: Transaction[];
  tasks: LawTask[];
  officeProfile: OfficeProfile;
  onDeleteSession?: (id: string) => void;
}

type ReportType = 'cases' | 'clients' | 'sessions' | 'tasks' | 'financials';

const ReportsPanel = React.memo(function ReportsPanel({
  cases,
  clients,
  sessions,
  transactions,
  tasks,
  officeProfile,
  onDeleteSession
}: ReportsPanelProps) {
  const confirm = useConfirm();
  const [activeReportTab, setActiveReportTab] = useState<ReportType>('cases');
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [showCharts, setShowCharts] = useState(true);

  // Dynamic Recharts datasets
  const casesStatusData = React.useMemo(() => {
    const statusMap: Record<string, number> = {};
    cases.forEach(c => {
      if (!c.isArchived) {
        statusMap[c.status] = (statusMap[c.status] || 0) + 1;
      }
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [cases]);

  const casesTypeData = React.useMemo(() => {
    const typeMap: Record<string, number> = {};
    cases.forEach(c => {
      if (!c.isArchived) {
        typeMap[c.type] = (typeMap[c.type] || 0) + 1;
      }
    });
    return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  }, [cases]);

  const financialFlowData = React.useMemo(() => {
    const flowMap: Record<string, { date: string; income: number; expenses: number }> = {};
    transactions.forEach(t => {
      const dateKey = t.date.substring(0, 7); // YYYY-MM
      if (!flowMap[dateKey]) {
        flowMap[dateKey] = { date: dateKey, income: 0, expenses: 0 };
      }
      if (t.ioType.includes('وارد')) {
        flowMap[dateKey].income += t.amount;
      } else {
        flowMap[dateKey].expenses += t.amount;
      }
    });
    return Object.values(flowMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  const lawyerTaskData = React.useMemo(() => {
    const lawyerMap: Record<string, { name: string; completed: number; pending: number }> = {};
    tasks.forEach(t => {
      const lawyer = t.assignedTo || 'غير محدد';
      if (!lawyerMap[lawyer]) {
        lawyerMap[lawyer] = { name: lawyer, completed: 0, pending: 0 };
      }
      if (t.status === 'completed') {
        lawyerMap[lawyer].completed += 1;
      } else {
        lawyerMap[lawyer].pending += 1;
      }
    });
    return Object.values(lawyerMap);
  }, [tasks]);

  const courtSessionData = React.useMemo(() => {
    const courtMap: Record<string, number> = {};
    sessions.forEach(s => {
      const courtShort = s.court.split(' ')[0] || s.court;
      courtMap[courtShort] = (courtMap[courtShort] || 0) + 1;
    });
    return Object.entries(courtMap).map(([name, value]) => ({ name, value })).slice(0, 8);
  }, [sessions]);
  
  // Filtering states for different report tabs
  const [casesStatusFilter, setCasesStatusFilter] = useState('all');
  const [casesTypeFilter, setCasesTypeFilter] = useState('all');
  
  const [sessionsStatusFilter, setSessionsStatusFilter] = useState('all');
  const [sessionsDateFrom, setSessionsDateFrom] = useState('');
  
  const [tasksStatusFilter, setTasksStatusFilter] = useState('all');
  const [tasksLawyerFilter, setTasksLawyerFilter] = useState('all');
  
  const [financesIoTypeFilter, setFinancesIoTypeFilter] = useState('all');
  const [financesTypeFilter, setFinancesTypeFilter] = useState('all');

  // Filtered lists for preview & printing
  const getFilteredCases = () => {
    return cases.filter(c => {
      if (c.isArchived) return false;
      const matchesSearch = searchQuery(c.caseNumber + ' ' + c.clientName + ' ' + c.court);
      const matchesStatus = casesStatusFilter === 'all' || c.status === casesStatusFilter;
      const matchesType = casesTypeFilter === 'all' || c.type === casesTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  };

  const getFilteredClients = () => {
    return clients.filter(cl => {
      if (cl.isArchived) return false;
      return searchQuery(cl.name + ' ' + cl.phone + ' ' + cl.nationalId + ' ' + cl.address);
    });
  };

  const getFilteredSessions = () => {
    return sessions.filter(s => {
      const matchesSearch = searchQuery(s.caseNumber + ' ' + s.clientName + ' ' + s.court + ' ' + s.objective);
      const matchesStatus = sessionsStatusFilter === 'all' || s.status === sessionsStatusFilter;
      const matchesDate = !sessionsDateFrom || s.date >= sessionsDateFrom;
      return matchesSearch && matchesStatus && matchesDate;
    });
  };

  const getFilteredTasks = () => {
    return tasks.filter(t => {
      const matchesSearch = searchQuery(t.title + ' ' + t.description + ' ' + t.caseNumber + ' ' + t.assignedTo);
      const matchesStatus = tasksStatusFilter === 'all' || t.status === tasksStatusFilter;
      const matchesLawyer = tasksLawyerFilter === 'all' || t.assignedTo.includes(tasksLawyerFilter);
      return matchesSearch && matchesStatus && matchesLawyer;
    });
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const matchesSearch = searchQuery(t.clientName + ' ' + t.description + ' ' + (t.caseNumber || ''));
      const matchesIo = financesIoTypeFilter === 'all' || t.ioType.includes(financesIoTypeFilter);
      const matchesType = financesTypeFilter === 'all' || t.type === financesTypeFilter;
      return matchesSearch && matchesIo && matchesType;
    });
  };

  const searchQuery = (text: string) => {
    if (!searchHistoryQuery.trim()) return true;
    return text.toLowerCase().includes(searchHistoryQuery.trim().toLowerCase());
  };

  // Get list of unique lawyers from tasks to filter
  const getUniqueLawyers = () => {
    const lawyers = tasks.map(t => t.assignedTo).filter(Boolean);
    return Array.from(new Set(lawyers));
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي المحترف
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                محرك التقارير الذكي
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Printer className="h-6 w-6 text-indigo-500" />
              نظام التقارير الذكي والموازنات القضائية
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تصدير وتقييم كشوف القضايǡ الموكلين، الجلساʡ المهام والمركز المالي للمؤسسة قانونياً بطباعة رسمية مصدقة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 justify-end text-xs shrink-0 font-bold z-10">
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 animate-pulse" />
              محرك الطباعة: آمن ونقابي ومكتمل v2.5
            </span>
          </div>
        </div>
      </div>

      {/* METRIC ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div onClick={() => setActiveReportTab('cases')} className="bg-white p-4 rounded-xl border border-slate-200/80 hover:shadow-md hover:border-indigo-300 transition cursor-pointer">
          <p className="text-[10px] text-slate-400 font-bold">حجم ملف القضايا</p>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <span className="text-lg font-black text-slate-900">{cases.filter(c => !c.isArchived).length} قضايا</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div onClick={() => setActiveReportTab('clients')} className="bg-white p-4 rounded-xl border border-slate-200/80 hover:shadow-md hover:border-indigo-300 transition cursor-pointer">
          <p className="text-[10px] text-slate-400 font-bold">قيد الموكلين النشطين</p>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <span className="text-lg font-black text-slate-900">{clients.filter(cl => !cl.isArchived).length} موكلين</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        <div onClick={() => setActiveReportTab('calendar')} className="bg-white p-4 rounded-xl border border-slate-200/80 hover:shadow-md hover:border-indigo-300 transition cursor-pointer">
          <p className="text-[10px] text-slate-400 font-bold">جدول الجلسات للأعمال</p>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <span className="text-lg font-black text-slate-900">{getFilteredSessions().filter(s => s.status === 'قادمة').length} مرتقبة</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
        </div>

        <div onClick={() => setActiveReportTab('tasks')} className="bg-white p-4 rounded-xl border border-slate-200/80 hover:shadow-md hover:border-rose-300 transition cursor-pointer">
          <p className="text-[10px] text-slate-400 font-bold">مهام قيد الإنجاز</p>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <span className="text-lg font-black text-slate-900">{tasks.filter(t => t.status === 'pending').length} تكليف</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        <div onClick={() => setActiveReportTab('financials')} className="bg-white p-4 rounded-xl border border-slate-200/80 col-span-2 lg:col-span-1 hover:shadow-md hover:border-emerald-300 transition cursor-pointer">
          <p className="text-[10px] text-slate-400 font-bold">صافي الميزانية المودعة</p>
          <div className="flex items-baseline gap-1 mt-1 justify-between">
            <span className="text-sm font-black text-emerald-600">
              {(
                transactions.filter(t => t.ioType.includes('وارد')).reduce((a,c) => a + c.amount, 0) -
                transactions.filter(t => t.ioType.includes('صادر')).reduce((a,c) => a + c.amount, 0)
              ).toLocaleString('ar-EG')} ج.م
            </span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* SEARCH AND NAVIGATION SUB-TABS */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-50 p-3 border border-slate-200 rounded-2xl">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'cases', label: 'كشوف القضايا', icon: Briefcase },
            { id: 'clients', label: 'دليل الموكلين', icon: Users },
            { id: 'calendar', label: 'تتبع الجلسات والورود', icon: Calendar },
            { id: 'tasks', label: 'المهمات الإجرائية', icon: Clock },
            { id: 'financials', label: 'الحسابات والموازنة', icon: Wallet }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeReportTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveReportTab(tab.id as any);
                  setSearchHistoryQuery('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? 'bg-slate-900 text-indigo-500 shadow-md border border-slate-950' 
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
                id={`report-tab-btn-${tab.id}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="بحث مهني سريع لتصفية كود التقرير..."
            value={searchHistoryQuery}
            onChange={e => setSearchHistoryQuery(e.target.value)}
            className="w-full text-xs pe-9 ps-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 bg-white"
          />
        </div>
      </div>

      {/* FILTER PANEL BY TAB */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>تصفية مخصصة للورقة المطبوعة:</span>
        </div>

        {activeReportTab === 'cases' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">حالة الدعوى:</span>
              <select
                value={casesStatusFilter}
                onChange={e => setCasesStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-none focus:border-slate-400 font-bold"
              >
                <option value="all">كافة مستويات الحالات</option>
                <option value="متداولة">متداولة</option>
                <option value="محجوزة للحكم">محجوزة للحكم</option>
                <option value="منتهية ومحفوظة">منتهية ومحفوظة</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">نوع النزاع:</span>
              <select
                value={casesTypeFilter}
                onChange={e => setCasesTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-none focus:border-slate-400 font-bold"
              >
                <option value="all">كافة التخصصات القضائية</option>
                <option value="مدني">مدني</option>
                <option value="جنائي">جنائي</option>
                <option value="أسرة وأحوال شخصية">أسرة وأحوال شخصية</option>
                <option value="مجلس الدولة (إداري)">مجلس الدولة (إداري)</option>
              </select>
            </div>
          </div>
        )}

        {activeReportTab === 'calendar' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">الحالة الإجرائية للرول:</span>
              <select
                value={sessionsStatusFilter}
                onChange={e => setSessionsStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
              >
                <option value="all">الكل (قادمة أو منتهية)</option>
                <option value="قادمة">جلسات قادمة فقط</option>
                <option value="منتهية">جلسات منتهية ومحسومة</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">بدءاً من تاريخ:</span>
              <input
                type="date"
                value={sessionsDateFrom}
                onChange={e => setSessionsDateFrom(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
              />
            </div>
          </div>
        )}

        {activeReportTab === 'tasks' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">كفاءة الأداء والإنجاز:</span>
              <select
                value={tasksStatusFilter}
                onChange={e => setTasksStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
              >
                <option value="all">كافة المهام</option>
                <option value="pending">مهام معلقة قيد التحضير</option>
                <option value="completed">مهام مكتملة ومنجزة</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">المحامي المسؤول المتابع:</span>
              <select
                value={tasksLawyerFilter}
                onChange={e => setTasksLawyerFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
              >
                <option value="all">كافة مستشاري وقانونيي المكتب</option>
                {getUniqueLawyers().map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeReportTab === 'financials' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">طبيعة وقيد الحركة:</span>
              <select
                value={financesIoTypeFilter}
                onChange={e => setFinancesIoTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
              >
                <option value="all">كافة التدفقات (الوارد والصادر)</option>
                <option value="وارد">رسوم وأتعاب واردة فقط</option>
                <option value="صادر">مصروفات محاكم وتشغيل صادر</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">نوع الحساب:</span>
              <select
                value={financesTypeFilter}
                onChange={e => setFinancesTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold"
              >
                <option value="all">الكل</option>
                <option value="أتعاب">أتعاب محاماة</option>
                <option value="مصروفات دعوى">مصروفات دعائم ورسوم</option>
                <option value="مصاريف مكتب تشغيلية">مصاريف حثيثة وتشغيل</option>
              </select>
            </div>
          </div>
        )}

        <div className="mr-auto flex items-center gap-2">
          {activeReportTab === 'cases' && (
            <>
              <button
                onClick={() => printBulkCases(getFilteredCases(), officeProfile)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer"
                id="view-bulk-cases-btn"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                عرض ومعاينة الكشف ({getFilteredCases().length})
              </button>
              <button
                onClick={() => printBulkCases(getFilteredCases(), officeProfile)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="print-bulk-cases-btn"
              >
                <Printer className="w-4 h-4" />
                طباعة الكشف العام للقضايا ({getFilteredCases().length})
              </button>
              <button
                onClick={() => exportBulkCasesToWord(getFilteredCases(), officeProfile)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="export-bulk-cases-word-btn"
              >
                <FileText className="w-4 h-4" />
                تصدير الكشف للوورد ({getFilteredCases().length})
              </button>
            </>
          )}

          {activeReportTab === 'clients' && (
            <>
              <button
                onClick={() => printBulkClients(getFilteredClients(), cases, officeProfile)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer"
                id="view-bulk-clients-btn"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                عرض الدليل ({getFilteredClients().length})
              </button>
              <button
                onClick={() => printBulkClients(getFilteredClients(), cases, officeProfile)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="print-bulk-clients-btn"
              >
                <Printer className="w-4 h-4" />
                طباعة دليل الموكلين والتوكيلات ({getFilteredClients().length})
              </button>
              <button
                onClick={() => exportBulkClientsToWord(getFilteredClients(), cases, officeProfile)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="export-bulk-clients-word-btn"
              >
                <FileText className="w-4 h-4" />
                تصدير الدليل للوورد ({getFilteredClients().length})
              </button>
            </>
          )}

          {activeReportTab === 'calendar' && (
            <>
              <button
                onClick={() => printBulkSessions(getFilteredSessions(), officeProfile)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer"
                id="view-bulk-sessions-btn"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                عرض الأجندة ({getFilteredSessions().length})
              </button>
              <button
                onClick={() => printBulkSessions(getFilteredSessions(), officeProfile)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="print-bulk-sessions-btn"
              >
                <Printer className="w-4 h-4" />
                طباعة رول وأجندة الجلسات المطابقة ({getFilteredSessions().length})
              </button>
              <button
                onClick={() => exportBulkSessionsToWord(getFilteredSessions(), officeProfile)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="export-bulk-sessions-word-btn"
              >
                <FileText className="w-4 h-4" />
                تصدير الأجندة للوورد ({getFilteredSessions().length})
              </button>
            </>
          )}

          {activeReportTab === 'tasks' && (
            <>
              <button
                onClick={() => printBulkTasks(getFilteredTasks(), officeProfile)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer"
                id="view-bulk-tasks-btn"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                عرض كشف المهام ({getFilteredTasks().length})
              </button>
              <button
                onClick={() => printBulkTasks(getFilteredTasks(), officeProfile)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="print-bulk-tasks-btn"
              >
                <Printer className="w-4 h-4" />
                طباعة كشف المهام والتكليفات ({getFilteredTasks().length})
              </button>
              <button
                onClick={() => exportBulkTasksToWord(getFilteredTasks(), officeProfile)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="export-bulk-tasks-word-btn"
              >
                <FileText className="w-4 h-4" />
                تصدير كشف المهام للوورد ({getFilteredTasks().length})
              </button>
            </>
          )}

          {activeReportTab === 'financials' && (
            <>
              <button
                onClick={() => printBulkFinancials(getFilteredTransactions(), officeProfile)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer"
                id="view-bulk-financials-btn"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                عرض الدفتر المالي ({getFilteredTransactions().length})
              </button>
              <button
                onClick={() => printBulkFinancials(getFilteredTransactions(), officeProfile)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="print-bulk-financials-btn"
              >
                <Printer className="w-4 h-4" />
                طباعة دفتر ميزانية السحوبات الكبرى ({getFilteredTransactions().length})
              </button>
              <button
                onClick={() => exportBulkFinancialsToWord(getFilteredTransactions(), officeProfile)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                id="export-bulk-financials-word-btn"
              >
                <FileText className="w-4 h-4" />
                تصدير الدفتر للوورد ({getFilteredTransactions().length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* لوحة الرسوم البيانية والتحليلات البصرية المتقدمة */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
              <TrendingUp className="w-4.5 h-4.5 animate-pulse" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-100">لوحة التحليلات والمخططات الإحصائية الذكية</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">تحليلات رسومية فورية ومؤشرات الأداء لقسم {
                activeReportTab === 'cases' ? 'كشوف القضايا والنزاعات' :
                activeReportTab === 'clients' ? 'الموكلين والتوكيلات' :
                activeReportTab === 'calendar' ? 'الجلسات وضغوط المحاكم' :
                activeReportTab === 'tasks' ? 'المهمات والإنتاجية' : 'الحسابات والموازنة والتدفق المالي'
              }</p>
            </div>
          </div>
          <button 
            onClick={() => setShowCharts(!showCharts)}
            className="text-[10px] bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-slate-705 transition cursor-pointer"
          >
            {showCharts ? 'إخفاء الرسوم الإحصائية ✕' : 'إظهار الرسوم الإحصائية 📊'}
          </button>
        </div>

        {showCharts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="recharts-visuals-grid">
            {activeReportTab === 'cases' && (
              <>
                {/* Chart 1: Cases Status Breakdown */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300">📊 توزيع القضايا حسب الحالة القانونية</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={casesStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={75}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {casesStatusData.map((entry, index) => {
                            const colors = ['#f59e0b', '#dc2626', '#10b981', '#6366f1'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Cases Type Breakdown */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300">📈 تصنيف القضايا حسب نوع النزاع والتخصص</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={casesTypeData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                        <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]}>
                          {casesTypeData.map((entry, index) => {
                            const colors = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {activeReportTab === 'clients' && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3 col-span-1 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-300">👥 مؤشر القضايا والتوكيلات لكل موكل نشط (أعلى 10)</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={clients.slice(0, 10).map(c => ({
                        name: c.name.split(' ')[0] + ' ' + (c.name.split(' ')[1] || ''),
                        'عدد القضايا': cases.filter(ca => ca.clientId === c.id && !ca.isArchived).length
                      }))} 
                      margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                      <Bar dataKey="عدد القضايا" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeReportTab === 'calendar' && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3 col-span-1 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-300">🏛️ حجم ضغط العمل والجلسات حسب المحكمة والمأمورية</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courtSessionData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 9 }} width={110} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} name="عدد الجلسات المدرجة" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeReportTab === 'tasks' && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3 col-span-1 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-300">⚖️ مؤشر الكفاءة ومتابعة التكاليف والمهام لكل محامي بالمؤسسة</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lawyerTaskData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="completed" name="مهام منجزة" stackId="a" fill="#10b981" />
                      <Bar dataKey="pending" name="مهام معلقة" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeReportTab === 'financials' && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3 col-span-1 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-300">💰 منحنى التدفق المالي الشهري للمؤسسة (الإيرادات مقابل المصروفات)</h4>
                <div className="h-64 w-full">
                  {financialFlowData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 font-bold">لا توجد حركات مالية مسجلة بعد لعرض المخطط البياني</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financialFlowData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area type="monotone" dataKey="income" name="إيرادات (ج.م)" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                        <Area type="monotone" dataKey="expenses" name="مصروفات (ج.م)" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpenses)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RENDER DYNAMIC PREVIEW DATA LISTS WITH PRINT ICON PER ROW */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">
            معاينة السجلات النشطة المتصلة بقسم التقرير الحالي ({
              activeReportTab === 'cases' ? getFilteredCases().length :
              activeReportTab === 'clients' ? getFilteredClients().length :
              activeReportTab === 'calendar' ? getFilteredSessions().length :
              activeReportTab === 'tasks' ? getFilteredTasks().length :
              getFilteredTransactions().length
            } قيد متطابق)
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">طريعة فرز ورقاعية مسجلة</span>
        </div>

        {/* 1. Cases Tab list */}
        {activeReportTab === 'cases' && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-end border-collapse" style={{ margin: 0 }}>
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">رقم القضية والعام</th>
                  <th className="p-3">الموكل وموقعه</th>
                  <th className="p-3">المحكمة والدائرة</th>
                  <th className="p-3">موضوع النزاع والدعوى</th>
                  <th className="p-3 text-end">الأتعاب (المسدد/الإجمالي)</th>
                  <th className="p-3 text-center">الحالة الإجرائية</th>
                  <th className="p-3 text-center">إجراء الطباعة</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredCases().length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">لا توجد قضايا مطابقة لمعايير البحث الحالية</td>
                  </tr>
                ) : (
                  getFilteredCases().map(c => {
                    const remaining = Math.max(0, c.totalFees - c.paidFees);
                    return (
                      <tr key={c.id} className="border-b border-slate-150 hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-indigo-750 font-mono">{c.caseNumber} لسنة {c.year}</td>
                        <td className="p-3">
                          <p className="font-semibold">{c.clientName}</p>
                          <span className="text-[10px] text-slate-400">{c.clientRole}</span>
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{c.court}</p>
                          <span className="text-[10px] text-slate-400">{c.circuit}</span>
                        </td>
                        <td className="p-3 text-slate-600 truncate max-w-xs">{c.claimSubject || 'لم يدون موضوع فني'}</td>
                        <td className="p-3 text-end font-mono">
                          <span className="font-bold text-emerald-600">{(c.paidFees || 0).toLocaleString('ar-EG')}</span>
                          <span className="text-slate-450 text-[10px] mx-1">/</span>
                          <span className="font-bold text-slate-700">{(c.totalFees || 0).toLocaleString('ar-EG')} ج.م</span>
                          {remaining > 0 && (
                            <p className="text-[9px] text-red-500 mt-0.5" style={{ direction: 'rtl' }}>باقي: {remaining.toLocaleString('ar-EG')} ج.م</p>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.status === 'متداولة' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            c.status === 'محجوزة للحكم' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => printSingleCase(c, sessions, transactions, officeProfile)}
                              className="bg-slate-50 text-slate-705 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="عرض ومعاينة تقرير ملف القضية"
                              id={`report-view-case-${c.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              عرض
                            </button>
                            <button
                              onClick={() => printSingleCase(c, sessions, transactions, officeProfile)}
                              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                              title="طباعة تقرير ملف القضية"
                              id={`report-print-case-${c.id}`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              طباعة التقرير
                            </button>
                            <button
                              onClick={() => exportCaseToWord(c, sessions, transactions, officeProfile)}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                              title="تصدير تقرير ملف القضية إلى ملف وورد"
                              id={`report-export-case-word-${c.id}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              تصدير
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Clients Tab list */}
        {activeReportTab === 'clients' && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-end border-collapse" style={{ margin: 0 }}>
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">اسم الموكل بالكامل</th>
                  <th className="p-3">الهاتف الجوال</th>
                  <th className="p-3">الرقم القومي المصري</th>
                  <th className="p-3">التوكيلات المودعة</th>
                  <th className="p-3 text-center">القضايا النشطة</th>
                  <th className="p-3 text-center">أوراق رسمية ومستندات</th>
                  <th className="p-3 text-center">إجراء الطباعة</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredClients().length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">لا يوجد موكلين مطابقين لمعايير الفلترة الحالية</td>
                  </tr>
                ) : (
                  getFilteredClients().map(cl => {
                    const clientCases = cases.filter(c => c.clientId === cl.id && !c.isArchived);
                    return (
                      <tr key={cl.id} className="border-b border-slate-150 hover:bg-slate-50 transition">
                        <td className="p-3 font-semibold text-slate-900">{cl.name}</td>
                        <td className="p-3 font-mono">{cl.phone}</td>
                        <td className="p-3 font-mono text-slate-600">{cl.nationalId}</td>
                        <td className="p-3 font-medium text-indigo-700">
                          {cl.poas.length === 0 ? (
                            <span className="text-slate-400 font-normal">لم يودع أي توكيل</span>
                          ) : (
                            <span>{cl.poas.length} توكيلات مسجلة</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {clientCases.length} قضايا
                        </td>
                        <td className="p-3 text-center text-slate-400 max-w-xs truncate">
                          {cl.address}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => printSingleClient(cl, cases, officeProfile)}
                              className="bg-slate-50 text-slate-705 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="عرض ومعاينة السجل القضائي الكامل للموكل"
                              id={`report-view-client-${cl.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              عرض
                            </button>
                            <button
                              onClick={() => printSingleClient(cl, cases, officeProfile)}
                              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                              title="طباعة السجل القضائي الكامل للموكل"
                              id={`report-print-client-${cl.id}`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              طباعة الملف
                            </button>
                            <button
                              onClick={() => exportClientToWord(cl, cases, officeProfile)}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                              title="تصدير السجل الكامل للموكل إلى ملف وورد"
                              id={`report-export-client-word-${cl.id}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              تصدير
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Calendar Tab list */}
        {activeReportTab === 'calendar' && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-end border-collapse" style={{ margin: 0 }}>
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">تاريخ الجلسة</th>
                  <th className="p-3">رقم القضية</th>
                  <th className="p-3">اسم الموكل</th>
                  <th className="p-3">المحكمة والدائرة الممثلة</th>
                  <th className="p-3">القاضي</th>
                  <th className="p-3">الهدف والهدف من حضور الجلسة</th>
                  <th className="p-3">ملاحظات</th>
                  <th className="p-3">قرار وعدالة المحكمة</th>
                  <th className="p-3 text-center">بطاقة الرول</th>
                  <th className="p-3 text-center">إجراء الطباعة</th>
                  <th className="p-3 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {getFilteredSessions().length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">لا توجد جلسات مسجلة تطابق هذه الفلاتر</td>
                  </tr>
                ) : (
                  getFilteredSessions()
                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(s => (
                      <tr key={s.id} className="border-b border-slate-150 hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-900 font-mono underline decoration-indigo-400 decoration-2">{s.date}</td>
                        <td className="p-3 font-mono text-indigo-700">{s.caseNumber}</td>
                        <td className="p-3 font-semibold">{s.clientName}</td>
                        <td className="p-3">
                          <p>{s.court}</p>
                          <span className="text-[10px] text-slate-400">دائرة {s.circuit}</span>
                        </td>
                        <td className="p-3 font-medium text-slate-700">{s.judgeName || '—'}</td>
                        <td className="p-3 font-medium text-slate-700">{s.objective}</td>
                        <td className="p-3 text-slate-600 bg-slate-50/50 italic">{s.notes || '—'}</td>
                        <td className="p-3 text-slate-600 bg-slate-50/50">
                          {s.decision ? (
                            <span className="italic font-semibold text-slate-800">{s.decision}</span>
                          ) : (
                            <span className="text-slate-400 italic">سارية/لم يستخرج قرار</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            s.status === 'قادمة' ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                const relatedCase = cases.find(c => c.id === s.caseId);
                                printSingleSession(s, relatedCase, officeProfile);
                              }}
                              className="bg-slate-50 text-slate-705 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="عرض ومعاينة محضر جلسة تفصيلي"
                              id={`report-view-session-${s.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              عرض
                            </button>
                            <button
                              onClick={() => {
                                const relatedCase = cases.find(c => c.id === s.caseId);
                                printSingleSession(s, relatedCase, officeProfile);
                              }}
                              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                              title="طباعة محضر جلسة تفصيلي"
                              id={`report-print-session-${s.id}`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              طباعة
                            </button>
                            <button
                              onClick={() => {
                                const relatedCase = cases.find(c => c.id === s.caseId);
                                exportSessionToWord(s, relatedCase, officeProfile);
                              }}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                              title="تصدير محضر الجلسة إلى ملف وورد"
                              id={`report-export-session-word-${s.id}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              تصدير
                            </button>
                            {onDeleteSession && (
                              <button
                                onClick={async () => { if (await confirm('حذف هذه الجلسɿ')) onDeleteSession(s.id); }}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                                title="حذف الجلسة"
                              >
                                حذف
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Tasks Tab list */}
        {activeReportTab === 'tasks' && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-end border-collapse" style={{ margin: 0 }}>
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">عنوان التكليف والمهمة</th>
                  <th className="p-3">الشرح وخطوات التحضير الكلية</th>
                  <th className="p-3">صالح قضية رقم</th>
                  <th className="p-3">المحامي المسؤول</th>
                  <th className="p-3">موعد الاستحقاق</th>
                  <th className="p-3 text-center">الحالة الكلية</th>
                  <th className="p-3 text-center">إجراء الطباعة</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredTasks().length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">لا توجد تكليفات مطابقة لمعايير البحث</td>
                  </tr>
                ) : (
                  getFilteredTasks().map(t => (
                    <tr key={t.id} className="border-b border-slate-150 hover:bg-slate-50 transition">
                      <td className="p-3 font-semibold text-slate-900">{t.title}</td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{t.description || 'لا يوجد تفصيل إجرائي'}</td>
                      <td className="p-3 font-mono text-indigo-750">{t.caseNumber || 'تكليف مكتب عام'}</td>
                      <td className="p-3 font-medium text-sky-800">{t.assignedTo}</td>
                      <td className="p-3 font-mono text-indigo-700 font-bold">{t.dueDate}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          t.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {t.status === 'completed' ? 'مكتمل' : 'معلق'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              const relCase = cases.find(c => c.id === t.caseId);
                              printSingleTask(t, relCase, officeProfile);
                            }}
                            className="bg-slate-50 text-slate-705 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                            title="عرض ومعاينة مستند التكليف الرسمي بالمهمة"
                            id={`report-view-task-${t.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            عرض
                          </button>
                          <button
                            onClick={() => {
                              const relCase = cases.find(c => c.id === t.caseId);
                              printSingleTask(t, relCase, officeProfile);
                            }}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                            title="طباعة مستند التكليف الرسمي بالمهمة"
                            id={`report-print-task-${t.id}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            طباعة
                          </button>
                          <button
                            onClick={() => {
                              const relCase = cases.find(c => c.id === t.caseId);
                              exportTaskToWord(t, relCase, officeProfile);
                            }}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1 text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                            title="تصدير التكليف بالمهمة إلى ملف وورد"
                            id={`report-export-task-word-${t.id}`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            تصدير
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Financials Tab list */}
        {activeReportTab === 'financials' && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-end border-collapse" style={{ margin: 0 }}>
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3">تاريخ القيد</th>
                  <th className="p-3">التصنيف المحاسبي</th>
                  <th className="p-3">الموكل المدفوع باسمه</th>
                  <th className="p-3">البيان والشرح التفصيلي</th>
                  <th className="p-3">وسيلة وطريقة السداد</th>
                  <th className="p-3 text-center">طبيعة العملية</th>
                  <th className="p-3 text-end">المبلغ ج.م</th>
                  <th className="p-3 text-center">سند استلام</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredTransactions().length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">لا توجد حركات مقيدة بالدفتر تطابق هذا البحث</td>
                  </tr>
                ) : (
                  getFilteredTransactions()
                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(t => (
                      <tr key={t.id} className="border-b border-slate-150 hover:bg-slate-50 transition">
                        <td className="p-3 font-mono text-slate-600">{t.date}</td>
                        <td className="p-3 font-medium text-indigo-750">{t.type}</td>
                        <td className="p-3 font-semibold text-slate-800">{t.clientName}</td>
                        <td className="p-3 text-slate-500 truncate max-w-xs">{t.description}</td>
                        <td className="p-3 font-medium">{t.paymentMethod}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            t.ioType.includes('وارد') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {t.ioType}
                          </span>
                        </td>
                        <td className="p-3 text-end font-mono font-bold leading-none">
                          <span className={t.ioType.includes('وارد') ? 'text-emerald-600 animate-pulse' : 'text-rose-600'}>
                            {t.ioType.includes('وارد') ? '+' : '-'}{t.amount.toLocaleString('ar-EG')} ج.م
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                const rc = cases.find(c => c.id === t.caseId);
                                printSingleTransaction(t, rc, officeProfile);
                              }}
                              className="bg-slate-50 text-slate-705 border border-slate-200 rounded-lg px-2 py-0.5 text-[9px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              title="عرض ومعاينة إيصال مالي رسمي للاستلام"
                              id={`report-view-tx-${t.id}`}
                            >
                              <Eye className="w-3 h-3" />
                              عرض
                            </button>
                            <button
                              onClick={() => {
                                const rc = cases.find(c => c.id === t.caseId);
                                printSingleTransaction(t, rc, officeProfile);
                              }}
                              className="bg-indigo-55 bg-indigo-50 text-indigo-700 hover:bg-indigo-105 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-2 py-0.5 text-[9px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                              title="طباعة إيصال مالي رسمي للاستلام"
                              id={`report-print-tx-${t.id}`}
                            >
                              <Printer className="w-3 h-3" />
                              طباعة سند
                            </button>
                            <button
                              onClick={() => {
                                const rc = cases.find(c => c.id === t.caseId);
                                exportTransactionToWord(t, rc, officeProfile);
                              }}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg px-2 py-0.5 text-[9px] font-black inline-flex items-center gap-1 transition cursor-pointer"
                              title="تصدير إيصال السند المالي إلى ملف وورد"
                              id={`report-export-tx-word-${t.id}`}
                            >
                              <FileText className="w-3 h-3" />
                              تصدير
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
});

export default ReportsPanel;
