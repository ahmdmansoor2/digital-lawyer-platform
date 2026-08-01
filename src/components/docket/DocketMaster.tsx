/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DocketMaster — دفتر المواعيد التفاعلي (كل المواعيد في مكان واحد).
 *
 * يعرض:
 *  - كل الجلسات القادمة (من كل القضايا)
 *  - كل المواعيد القانونية (deadlines)
 *  - كل المهام المستحقة
 *
 * المميزات:
 *  - تصنيف حسب: أسبوع/شهر/ربع سنة/سنة
 *  - فلترة حسب: نوع القضية، الحالة، الأولوية
 *  - ترتيب حسب التاريخ أو الأولوية
 *  - بحث في المواعيد
 *  - تصدير PDF/Excel
 *  - إحصائيات: عدد المواعيد حسب الفترة
 *  - تنبيهات: مواعيد حرجة (أقل من 7 أيام)
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar, AlertTriangle, Clock, FileText, Briefcase,
  Filter, Download, Search, ChevronRight, Flag,
  TrendingUp, Bell, ChevronDown, ChevronLeft,
  Eye, Edit3, Trash2, Printer, Copy, MoreVertical, Check, FileDown
} from 'lucide-react';
import DocketDetailModal from './DocketDetailModal';
import { exportHtmlToPdf } from '../../utils/pdfExportHelper';
import { showAlert } from '../../utils/dialogs';
import { detectSessionConflicts, getConflictingSessionIds, SessionConflict } from '../../utils/conflictDetection';
import { AlertOctagon } from 'lucide-react';
import {
  Session, LegalDeadline, LawTask, Case, Client, OfficeProfile
} from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatDate(d: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}

function daysUntil(d: string): number {
  if (!d) return Infinity;
  const target = new Date(d).getTime();
  const today = new Date().getTime();
  today; // satisfy linter - keep today
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getUrgencyLevel(days: number): 'critical' | 'warning' | 'normal' | 'overdue' {
  if (days < 0) return 'overdue';
  if (days <= 3) return 'critical';
  if (days <= 7) return 'warning';
  return 'normal';
}

const URGENCY_STYLES = {
  overdue: 'bg-rose-50 border-rose-300 text-rose-800',
  critical: 'bg-rose-50 border-rose-200 text-rose-700',
  warning: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  normal: 'bg-slate-50 border-slate-200 text-slate-700'
};

const URGENCY_LABELS = {
  overdue: 'متأخر',
  critical: 'حرج',
  warning: 'قريب',
  normal: 'عادي'
};

// ─── Types ────────────────────────────────────────────────────────────────
export type DocketItemType = 'session' | 'deadline' | 'task';

export interface DocketItem {
  id: string;
  type: DocketItemType;
  date: string;
  title: string;
  description: string;
  caseId: string;
  caseNumber: string;
  clientName: string;
  court?: string;
  status?: string;
  extra?: Record<string, any>;
  /** v2.8.5: true if this item has a time conflict with another session */
  hasConflict?: boolean;
}

interface DocketMasterProps {
  sessions: Session[];
  deadlines: LegalDeadline[];
  tasks: LawTask[];
  cases: Case[];
  clients: Client[];
  officeProfile: OfficeProfile;
  onNavigateToCase?: (caseId: string) => void;
  // ─── Action handlers (optional) ───────────────────────────────────────
  onUpdateSession?: (s: Session) => void;
  onDeleteSession?: (id: string) => void;
  onUpdateTask?: (t: LawTask) => void;
  onDeleteTask?: (id: string) => void;
  onToggleTaskStatus?: (id: string) => void;
  onToggleDeadlineComplete?: (id: string) => void;
  onPrintJob?: (title: string, html: string) => void;
}

type PeriodFilter = 'all' | 'week' | 'month' | 'quarter' | 'year';
type SortBy = 'date-asc' | 'date-desc' | 'urgency';

export default function DocketMaster({
  sessions, deadlines, tasks, cases, clients, officeProfile,
  onNavigateToCase,
  onUpdateSession, onDeleteSession,
  onUpdateTask, onDeleteTask, onToggleTaskStatus,
  onToggleDeadlineComplete, onPrintJob
}: DocketMasterProps) {

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [typeFilter, setTypeFilter] = useState<DocketItemType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date-asc');
  const [onlyCritical, setOnlyCritical] = useState(false);

  // ─── Detail modal state ──────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState<DocketItem | null>(null);
  const [rowCopiedId, setRowCopiedId] = useState<string | null>(null);

  // Resolve full objects for the selected item
  const selectedSession = selectedItem?.type === 'session'
    ? sessions.find(s => s.id === selectedItem.id) : undefined;
  const selectedDeadline = selectedItem?.type === 'deadline'
    ? deadlines.find(d => d.id === selectedItem.id) : undefined;
  const selectedTask = selectedItem?.type === 'task'
    ? tasks.find(t => t.id === selectedItem.id) : undefined;
  const selectedCase = selectedItem
    ? cases.find(c => c.id === selectedItem.caseId) : undefined;
  const selectedClient = selectedCase
    ? clients.find(cl => cl.id === selectedCase.clientId) : undefined;

  // ─── Action handlers ─────────────────────────────────────────────────
  function handleEditItem(item: DocketItem) {
    // Edit by opening the detail modal (user can use the existing detail view to edit fields inline if needed)
    // For now, we just keep the modal open. A dedicated edit modal would need re-use of CalendarView's modals.
    setSelectedItem(item);
  }

  function handleDeleteItem(item: DocketItem) {
    if (item.type === 'session' && onDeleteSession) {
      onDeleteSession(item.id);
    } else if (item.type === 'task' && onDeleteTask) {
      onDeleteTask(item.id);
    } else if (item.type === 'deadline' && onDeleteTask) {
      // Deadlines don't have delete in AppLayout — fall back to toggle complete
      onToggleDeadlineComplete?.(item.id);
    }
  }

  function handleToggleComplete(item: DocketItem) {
    if (item.type === 'task' && onToggleTaskStatus) {
      onToggleTaskStatus(item.id);
    } else if (item.type === 'deadline' && onToggleDeadlineComplete) {
      onToggleDeadlineComplete(item.id);
    }
  }

  function handlePrintItem(item: DocketItem) {
    if (onPrintJob) {
      // Build minimal HTML and call the print job
      const html = buildItemHtml(item);
      onPrintJob(`${item.type === 'session' ? 'جلسة' : item.type === 'deadline' ? 'ميعاد' : 'مهمة'}: ${item.title}`, html);
    } else {
      // Fallback: open print window
      const html = buildItemHtml(item);
      const w = window.open('', '_blank', 'width=800,height=900');
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 300);
      }
    }
  }

  function buildItemHtml(item: DocketItem): string {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${item.title}</title>
<style>
  body { font-family: 'Cairo', 'Tajawal', sans-serif; padding: 30px; color: #1e293b; }
  h1 { color: #4338ca; border-bottom: 3px solid #4338ca; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; }
  th { background: #f1f5f9; font-weight: 800; }
  .footer { margin-top: 30px; font-size: 12px; color: #64748b; text-align: center; }
</style>
</head>
<body>
  <h1>${item.title}</h1>
  <table>
    <tr><th>البند</th><th>القيمة</th></tr>
    <tr><td>التاريخ</td><td>${item.date}</td></tr>
    ${item.caseNumber ? `<tr><td>القضية</td><td>${item.caseNumber}</td></tr>` : ''}
    ${item.clientName ? `<tr><td>الموكل</td><td>${item.clientName}</td></tr>` : ''}
    ${item.court ? `<tr><td>المحكمة</td><td>${item.court}</td></tr>` : ''}
    ${item.status ? `<tr><td>الحالة</td><td>${item.status}</td></tr>` : ''}
    ${item.description ? `<tr><td>الوصف</td><td>${item.description}</td></tr>` : ''}
  </table>
  <div class="footer">${officeProfile.officeName} • ${new Date().toLocaleString('ar-EG')}</div>
</body>
</html>`;
  }

  function handleCopyItem(item: DocketItem) {
    const text = [
      `${item.type === 'session' ? 'جلسة' : item.type === 'deadline' ? 'ميعاد' : 'مهمة'}: ${item.title}`,
      `التاريخ: ${item.date}`,
      item.caseNumber ? `القضية: ${item.caseNumber}` : '',
      item.clientName ? `الموكل: ${item.clientName}` : '',
      item.court ? `المحكمة: ${item.court}` : '',
      item.status ? `الحالة: ${item.status}` : '',
      item.description ? `الوصف: ${item.description}` : ''
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setRowCopiedId(`${item.type}-${item.id}`);
      setTimeout(() => setRowCopiedId(null), 1500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setRowCopiedId(`${item.type}-${item.id}`); setTimeout(() => setRowCopiedId(null), 1500); }
      catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    });
  }

  /**
   * v2.8.4: تصدير البند كـ PDF (reuses buildItemHtml from print handler)
   */
  async function handleExportPdfItem(item: DocketItem) {
    const html = buildItemHtml(item);
    const typeLabel = item.type === 'session' ? 'جلسة' : item.type === 'deadline' ? 'ميعاد' : 'مهمة';
    const safeTitle = (item.title || 'بند').replace(/[\\/:*?"<>|]/g, '-').slice(0, 50);
    const filename = `${typeLabel}_${safeTitle}_${item.date}.pdf`;
    try {
      await exportHtmlToPdf(`${typeLabel}: ${item.title}`, html, filename);
      setRowCopiedId(`${item.type}-${item.id}-pdf`);
      setTimeout(() => setRowCopiedId(null), 1500);
    } catch (e: any) {
      await showAlert(`فشل تصدير PDF: ${e?.message || 'خطأ غير معروف'}`);
    }
  }

  // ─── Detect session conflicts (v2.8.5) ──────────────────────────────────
  const sessionConflicts: SessionConflict[] = useMemo(
    () => detectSessionConflicts(sessions),
    [sessions]
  );
  const conflictingSessionIds = useMemo(
    () => getConflictingSessionIds(sessionConflicts),
    [sessionConflicts]
  );

  // ─── Build unified docket items ───────────────────────────────────────
  const allItems: DocketItem[] = useMemo(() => {
    const items: DocketItem[] = [];

    // Sessions (upcoming)
    sessions
      .filter(s => s.status === 'قادمة')
      .forEach(s => {
        const c = cases.find(c => c.id === s.caseId);
        items.push({
          id: s.id,
          type: 'session',
          date: s.date,
          title: `جلسة: ${s.court} - دائرة ${s.circuit || '—'}`,
          description: s.objective || 'حضور الجلسة والمرافعة',
          caseId: s.caseId,
          caseNumber: s.caseNumber,
          clientName: s.clientName,
          court: s.court,
          status: s.status,
          extra: { time: s.time, judgeName: s.judgeName },
          hasConflict: conflictingSessionIds.has(s.id),
        });
      });

    // Deadlines (pending)
    deadlines
      .filter(d => !d.isCompleted)
      .forEach(d => {
        const c = cases.find(c => c.id === d.caseId);
        items.push({
          id: d.id,
          type: 'deadline',
          date: d.deadlineDate,
          title: d.title,
          description: d.lawReference || '',
          caseId: d.caseId,
          caseNumber: c?.caseNumber || '',
          clientName: c?.clientName || '',
          status: 'معلق'
        });
      });

    // Tasks (pending)
    tasks
      .filter(t => t.status !== 'completed')
      .forEach(t => {
        const c = cases.find(c => c.id === t.caseId);
        items.push({
          id: t.id,
          type: 'task',
          date: t.dueDate,
          title: t.title,
          description: t.description || '',
          caseId: t.caseId,
          caseNumber: c?.caseNumber || '',
          clientName: c?.clientName || '',
          status: t.status === 'pending' ? 'معلق' : 'عادي'
        });
      });

    return items;
  }, [sessions, deadlines, tasks, cases]);

  // ─── Filter by period ────────────────────────────────────────────────
  const periodFiltered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (periodFilter === 'all') return allItems;

    let endDate = new Date(today);
    if (periodFilter === 'week') endDate.setDate(today.getDate() + 7);
    else if (periodFilter === 'month') endDate.setMonth(today.getMonth() + 1);
    else if (periodFilter === 'quarter') endDate.setMonth(today.getMonth() + 3);
    else if (periodFilter === 'year') endDate.setFullYear(today.getFullYear() + 1);

    return allItems.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= today && itemDate <= endDate;
    });
  }, [allItems, periodFilter]);

  // ─── Filter by type ─────────────────────────────────────────────────
  const typeFiltered = useMemo(() => {
    if (typeFilter === 'all') return periodFiltered;
    return periodFiltered.filter(item => item.type === typeFilter);
  }, [periodFiltered, typeFilter]);

  // ─── Filter by search ───────────────────────────────────────────────
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return typeFiltered;
    const q = searchQuery.toLowerCase();
    return typeFiltered.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.caseNumber.toLowerCase().includes(q) ||
      item.clientName.toLowerCase().includes(q)
    );
  }, [typeFiltered, searchQuery]);

  // ─── Filter by urgency ───────────────────────────────────────────────
  const finalItems = useMemo(() => {
    let items = searchFiltered;
    if (onlyCritical) {
      items = items.filter(item => {
        const days = daysUntil(item.date);
        return days <= 7;
      });
    }
    // Sort
    if (sortBy === 'date-asc') {
      items = [...items].sort((a, b) => a.date.localeCompare(b.date));
    } else if (sortBy === 'date-desc') {
      items = [...items].sort((a, b) => b.date.localeCompare(a.date));
    } else if (sortBy === 'urgency') {
      items = [...items].sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
    }
    return items;
  }, [searchFiltered, onlyCritical, sortBy]);

  // ─── Stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(today);
    week.setDate(today.getDate() + 7);
    const month = new Date(today);
    month.setMonth(today.getMonth() + 1);

    const total = allItems.length;
    const thisWeek = allItems.filter(i => {
      const d = new Date(i.date);
      return d >= today && d <= week;
    }).length;
    const thisMonth = allItems.filter(i => {
      const d = new Date(i.date);
      return d >= today && d <= month;
    }).length;
    const critical = allItems.filter(i => daysUntil(i.date) <= 7).length;
    const overdue = allItems.filter(i => daysUntil(i.date) < 0).length;

    return { total, thisWeek, thisMonth, critical, overdue };
  }, [allItems]);

  // ─── Export to CSV ──────────────────────────────────────────────────
  const exportToCSV = () => {
    const headers = ['النوع', 'التاريخ', 'العنوان', 'الوصف', 'القضية', 'الموكل', 'الحالة', 'الأيام المتبقية'];
    const rows = finalItems.map(item => [
      item.type === 'session' ? 'جلسة' : item.type === 'deadline' ? 'ميعاد' : 'مهمة',
      item.date,
      item.title,
      item.description,
      item.caseNumber,
      item.clientName,
      item.status || '',
      daysUntil(item.date)
    ]);

    const csv = [
      '\uFEFF' + headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docket-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-r from-indigo-600 to-slate-900 text-white p-5 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black">دفتر المواعيد التفاعلي</h2>
            <p className="text-xs text-indigo-200">كل المواعيد القادمة من كل القضايا في مكان واحد</p>
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard icon={<TrendingUp />} label="إجمالي" value={stats.total} color="indigo" />
        <KPICard icon={<Clock />} label="هذا الأسبوع" value={stats.thisWeek} color="indigo" />
        <KPICard icon={<Calendar />} label="هذا الشهر" value={stats.thisMonth} color="emerald" />
        <KPICard icon={<Bell />} label="حرج (≤7 أيام)" value={stats.critical} color="rose" />
        <KPICard icon={<AlertTriangle />} label="متأخر" value={stats.overdue} color="red" />
      </div>

      {/* ─── Filters ─── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-black text-slate-700">فلترة</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute end-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في المواعيد..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pe-9 ps-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Period filter */}
          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value as PeriodFilter)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-400"
          >
            <option value="all">كل الفترات</option>
            <option value="week">هذا الأسبوع (7 أيام)</option>
            <option value="month">هذا الشهر (30 يوم)</option>
            <option value="quarter">الربع سنة (90 يوم)</option>
            <option value="year">السنة (365 يوم)</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-400"
          >
            <option value="all">كل الأنواع</option>
            <option value="session">جلسات</option>
            <option value="deadline">مواعيد</option>
            <option value="task">مهام</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-400"
          >
            <option value="date-asc">التاريخ (أقرب أولاً)</option>
            <option value="date-desc">التاريخ (أبعد أولاً)</option>
            <option value="urgency">الأكثر استعجالاً</option>
          </select>
        </div>

        {/* Quick toggles + Export */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyCritical}
              onChange={e => setOnlyCritical(e.target.checked)}
              className="w-4 h-4 accent-rose-500"
            />
            عرض المواعيد الحرجة فقط (≤7 أيام)
          </label>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 transition"
          >
            <Download className="w-3.5 h-3.5" /> تصدير CSV
          </button>
        </div>
      </div>

      {/* ─── v2.8.5: Conflict warning banner ─── */}
      {sessionConflicts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-3 flex items-start gap-2">
          <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-end">
            <p className="text-sm font-bold text-red-800">
              ⚠️ يوجد {sessionConflicts.length} تعارض في المواعيد
            </p>
            <p className="text-[11px] text-red-700 mt-0.5">
              جلسات في نفس اليوم والوقت. راجع البنود المعلّمة بالشارة الحمراء قبل تأكيد حضورك.
            </p>
          </div>
        </div>
      )}

      {/* ─── Items List ─── */}
      <div className="space-y-2">
        {finalItems.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">لا توجد مواعيد تطابق الفلاتر</p>
            <p className="text-xs text-slate-400 mt-1">جرّب توسيع الفترة الزمنية أو تغيير نوع الموعد</p>
          </div>
        ) : (
          finalItems.map(item => (
            <DocketItemRow
              key={`${item.type}-${item.id}`}
              item={item}
              isCopied={rowCopiedId === `${item.type}-${item.id}`}
              isPdfExported={rowCopiedId === `${item.type}-${item.id}-pdf`}
              onView={() => setSelectedItem(item)}
              onCopy={() => handleCopyItem(item)}
              onPrint={() => handlePrintItem(item)}
              onExportPdf={() => handleExportPdfItem(item)}
              onToggleComplete={() => handleToggleComplete(item)}
              onNavigateToCase={() => onNavigateToCase?.(item.caseId)}
            />
          ))
        )}
      </div>

      {/* Summary footer */}
      {finalItems.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-slate-500 font-bold">
            عرض {finalItems.length} موعد من إجمالي {allItems.length} | آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
          </p>
        </div>
      )}

      {/* Detail modal */}
      <DocketDetailModal
        item={selectedItem}
        session={selectedSession}
        deadline={selectedDeadline}
        task={selectedTask}
        caseObj={selectedCase}
        clientObj={selectedClient}
        officeProfile={officeProfile}
        onClose={() => setSelectedItem(null)}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        onToggleComplete={handleToggleComplete}
        onNavigateToCase={onNavigateToCase}
        onPrint={handlePrintItem}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function KPICard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'indigo' | 'emerald' | 'rose' | 'red';
}) {
  const colorMap = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    red: 'bg-red-50 border-red-200 text-red-700'
  };
  return (
    <div className={`border rounded-2xl p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-80">
        <div className="w-3.5 h-3.5">{icon}</div>
        <div className="text-[10px] font-bold">{label}</div>
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function DocketItemRow({
  item, isCopied = false, isPdfExported = false,
  onView, onCopy, onPrint, onExportPdf, onToggleComplete, onNavigateToCase
}: {
  item: DocketItem;
  isCopied?: boolean;
  isPdfExported?: boolean;
  onView?: () => void;
  onCopy?: () => void;
  onPrint?: () => void;
  onExportPdf?: () => void;
  onToggleComplete?: () => void;
  onNavigateToCase?: () => void;
  // React auto-strips `key` from props, but TS still sees it
  key?: string;
}) {
  const isSession = item.type === 'session';
  const days = daysUntil(item.date);
  const urgency = getUrgencyLevel(days);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [menuOpen]);

  const TypeIcon = item.type === 'session' ? Calendar :
                   item.type === 'deadline' ? AlertTriangle : FileText;
  const TypeColor = item.type === 'session' ? 'indigo' :
                    item.type === 'deadline' ? 'rose' : 'blue';

  function handleAction(fn: (() => void) | undefined, e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    fn?.();
  }

  return (
    <div
      onClick={onView}
      className={`group bg-white border-2 rounded-2xl p-3 hover:shadow-md transition cursor-pointer relative ${URGENCY_STYLES[urgency]}`}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          onClick={(e) => { e.stopPropagation(); onView?.(); }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            TypeColor === 'indigo' ? 'bg-indigo-100' :
            TypeColor === 'rose' ? 'bg-rose-100' : 'bg-blue-100'
          }`}
        >
          <TypeIcon className={`w-4 h-4 ${
            TypeColor === 'indigo' ? 'text-indigo-600' :
            TypeColor === 'rose' ? 'text-rose-600' : 'text-blue-600'
          }`} />
        </div>

        {/* Content */}
        <div
          onClick={(e) => { e.stopPropagation(); onView?.(); }}
          className="flex-1 min-w-0"
        >
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-white uppercase">
              {item.type === 'session' ? 'جلسة' : item.type === 'deadline' ? 'ميعاد' : 'مهمة'}
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              urgency === 'overdue' ? 'bg-rose-600 text-white' :
              urgency === 'critical' ? 'bg-rose-100 text-rose-800' :
              urgency === 'warning' ? 'bg-indigo-100 text-indigo-800' :
              'bg-slate-100 text-slate-700'
            }`}>
              {URGENCY_LABELS[urgency]} {urgency !== 'normal' && `(${days >= 0 ? days + ' يوم' : Math.abs(days) + ' يوم متأخر'})`}
            </span>
            {isSession && item.hasConflict && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1"
                title="تعارض مع جلسة أخرى في نفس الموعد"
              >
                <AlertOctagon className="w-2.5 h-2.5" /> تعارض
              </span>
            )}
            {days === 0 && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1"
                title="هذا الموعد اليوم"
              >
                ⚡ اليوم
              </span>
            )}
            {item.extra?.time && (
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                ⏰ {item.extra.time}
              </span>
            )}
          </div>
          <h3 className="text-sm font-black text-slate-900 leading-tight">{item.title}</h3>
          {item.description && (
            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-bold flex-wrap">
            <span>📋 {item.caseNumber || '—'}</span>
            <span>👤 {item.clientName || '—'}</span>
            <span>📅 {formatDate(item.date)}</span>
          </div>
        </div>

        {/* Action buttons (visible on hover) */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {/* Quick action: open case */}
          {onNavigateToCase && (
            <button
              onClick={(e) => handleAction(onNavigateToCase, e)}
              title="فتح القضية"
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-700 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
            >
              <Briefcase className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Quick action: print */}
          {onPrint && (
            <button
              onClick={(e) => handleAction(onPrint, e)}
              title="طباعة"
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}
          {/* v2.8.4: Quick action: export PDF */}
          {onExportPdf && (
            <button
              onClick={(e) => handleAction(onExportPdf, e)}
              title="تصدير PDF"
              className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
            >
              {isPdfExported ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileDown className="w-3.5 h-3.5" />}
            </button>
          )}
          {/* Quick action: copy */}
          {onCopy && (
            <button
              onClick={(e) => handleAction(onCopy, e)}
              title="نسخ نص الموعد"
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
              title="المزيد"
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div
                className="absolute start-0 top-9 z-20 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[180px] py-1"
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
              >
                <button
                  onClick={(e) => handleAction(onView, e)}
                  className="w-full text-end px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" /> عرض التفاصيل
                </button>
                <button
                  onClick={(e) => handleAction(onCopy, e)}
                  className="w-full text-end px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" /> نسخ نص
                </button>
                <button
                  onClick={(e) => handleAction(onPrint, e)}
                  className="w-full text-end px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" /> طباعة
                </button>
                {onExportPdf && (
                  <button
                    onClick={(e) => handleAction(onExportPdf, e)}
                    className="w-full text-end px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <FileDown className="w-3.5 h-3.5" /> تصدير PDF
                  </button>
                )}
                {onToggleComplete && (item.type === 'task' || item.type === 'deadline') && (
                  <button
                    onClick={(e) => handleAction(onToggleComplete, e)}
                    className="w-full text-end px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5" /> تمييز كمكتمل
                  </button>
                )}
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={(e) => handleAction(onNavigateToCase, e)}
                  className="w-full text-end px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2"
                >
                  <Briefcase className="w-3.5 h-3.5" /> فتح القضية
                </button>
              </div>
            )}
          </div>
          {/* Arrow indicator */}
          <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0 mt-2 group-hover:hidden" />
        </div>
      </div>
    </div>
  );
}
