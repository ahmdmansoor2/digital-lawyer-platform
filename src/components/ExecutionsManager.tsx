/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ExecutionsManager — إدارة التنفيذات (متابعة تنفيذ الأحكام)
 * مصممة بنفس أسلوب واستطباب وشكل وسجل القضايا والموكلين بالمكتب:
 *  - بنر إحصائيات تفاعلي علوي (إجمالي، جاري التنفيذ، منفّذ، مطعون فيه، متأخرة)
 *  - نمطا عرض: شبكة بطاقات (Grid) وجدول تفصيلي (Table)
 *  - طباعة تقرير مستندي رسمي للهيئات القضائية والموكلين
 *  - تصدير فوري إلى مستند Microsoft Word (.doc/.docx)
 *  - طباعة رمز QR للبطاقات والملفات
 *  - بطاقات غنية بالمعلومات وشريط تقدم خطوات التنفيذ
 *  - قوائم منسدلة مخصصة (CustomSelect) بخط Cairo 100%
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeSVG } from 'qrcode.react';
import { showConfirm } from '../utils/dialogs';
import {
  Gavel,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  LayoutGrid,
  List,
  User,
  Building,
  Clock,
  FileText,
  CheckSquare,
  Printer,
  Calendar,
  QrCode,
  Share2,
} from 'lucide-react';
import type { Execution, ExecutionStep, Case, Client, OfficeProfile } from '../types';
import { printSingleExecution, printExecutionFileQR } from '../utils/printHelper';
import { exportExecutionToWord } from '../utils/wordExportHelper';

interface ExecutionsManagerProps {
  executions: Execution[];
  cases: Case[];
  clients: Client[];
  onAddExecution: (e: Execution) => void;
  onUpdateExecution: (e: Execution) => void;
  onDeleteExecution: (id: string) => void;
  officeProfile?: OfficeProfile;
}

const DEFAULT_OFFICE: OfficeProfile = {
  officeName: 'مكتب المحاماة والاستشارات القانونية',
  managingPartner: 'الأستاذ أحمد منصور المحامي',
  address: 'القاهرة - مصر',
  phone: '01000000000',
  email: '',
  barId: '',
  taxId: '',
  courtJurisdiction: '',
};

const EXECUTION_TYPE_LABELS: Record<string, string> = {
  primary_judgment: 'حكم ابتدائي',
  appeal: 'استئناف',
  cassation: 'نقض',
  executive_order: 'أمر تنفيذية',
  enforcement: 'تنفيذ جبري',
  payment_order: 'أمر أداء',
};

const EXECUTION_TYPE_COLORS: Record<string, string> = {
  primary_judgment: 'bg-indigo-600',
  appeal: 'bg-blue-600',
  cassation: 'bg-purple-600',
  executive_order: 'bg-amber-600',
  enforcement: 'bg-emerald-600',
  payment_order: 'bg-rose-600',
};

const EXECUTION_STATUS_LABELS: Record<string, string> = {
  pending: 'جاري التنفيذ',
  suspended: 'متوقف',
  challenged: 'مطعون فيه',
  executed: 'منفّذ',
  completed: 'منتهي',
  cancelled: 'ملغي',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  suspended: 'bg-slate-100 text-slate-700 border-slate-200',
  challenged: 'bg-rose-50 text-rose-700 border-rose-200',
  executed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STEP_STATUS_LABELS: Record<string, string> = {
  pending: 'لم يبدأ',
  completed: 'مكتمل (تم)',
  cancelled: 'ملغي',
};

const STEP_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  completed: 'bg-emerald-100 text-emerald-700 font-bold',
  cancelled: 'bg-rose-100 text-rose-700 font-bold',
};

function formatDate(d?: string): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return d;
  }
}

function formatCurrency(n?: number): string {
  if (n == null || n === 0) return '—';
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n);
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  if (isNaN(target)) return null;
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function generateId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Custom Select Component ────────────────────────────────────────────────
interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  subtitle?: string;
}

interface CustomSelectProps<T extends string = string> {
  options: CustomSelectOption<T>[];
  value: T;
  onChange: (val: T) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  buttonClassName?: string;
}

function CustomSelect<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  searchable = false,
  className = '',
  buttonClassName = '',
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const s = search.toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(s) || (o.subtitle && o.subtitle.toLowerCase().includes(s))
    );
  }, [options, search, searchable]);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium text-sm hover:bg-white hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition shadow-sm text-start ${buttonClassName}`}
      >
        <span className="truncate flex-1">
          {selectedOption ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-slate-900 truncate">{selectedOption.label}</span>
              {selectedOption.subtitle && (
                <span className="text-xs text-slate-500 font-normal truncate">({selectedOption.subtitle})</span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden top-full start-0 min-w-[200px]">
          {searchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="بحث..."
                  autoFocus
                  className="w-full text-xs py-1.5 pe-2 ps-8 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-4 text-center text-xs text-slate-400">لا توجد نتائج</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl transition text-start ${
                      isSelected ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.subtitle && (
                        <span className="text-[11px] text-slate-400 font-normal truncate">({opt.subtitle})</span>
                      )}
                    </div>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper for printing QR ──────────────────────────────────────────────────
function handlePrintExecutionQR(e: Execution, office: OfficeProfile) {
  const container = document.createElement('div');
  const root = createRoot(container);
  const qrData = JSON.stringify({ type: 'execution', caseNumber: e.caseNumber, id: e.id, client: e.clientName });

  root.render(<QRCodeSVG value={qrData} size={180} level="M" />);

  setTimeout(() => {
    const qrSvg = container.innerHTML;
    root.unmount();
    printExecutionFileQR(e, office, qrSvg);
  }, 100);
}

// ─── Main ExecutionsManager Component ────────────────────────────────────────
export default function ExecutionsManager({
  executions,
  cases,
  clients,
  onAddExecution,
  onUpdateExecution,
  onDeleteExecution,
  officeProfile = DEFAULT_OFFICE,
}: ExecutionsManagerProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingExecution, setEditingExecution] = useState<Execution | null>(null);
  const [viewingExecution, setViewingExecution] = useState<Execution | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lawfirm_executions', JSON.stringify(executions));
    } catch (e) {
      console.warn('Failed to persist executions to localStorage', e);
    }
  }, [executions]);

  // Sort: nearest deadline first
  const sortedExecutions = useMemo(() => {
    return [...executions].sort((a, b) => {
      const da = a.executionDeadline || a.appealDeadline || a.judgmentDate || '';
      const db = b.executionDeadline || b.appealDeadline || b.judgmentDate || '';
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return new Date(da).getTime() - new Date(db).getTime();
    });
  }, [executions]);

  // Filtered executions
  const filteredExecutions = useMemo(() => {
    return sortedExecutions.filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const matchesCase = e.caseNumber?.toLowerCase().includes(s);
        const matchesClient = e.clientName?.toLowerCase().includes(s);
        const matchesCourt = e.court?.toLowerCase().includes(s);
        const matchesNotes = e.notes?.toLowerCase().includes(s);
        if (!matchesCase && !matchesClient && !matchesCourt && !matchesNotes) return false;
      }
      return true;
    });
  }, [sortedExecutions, search, statusFilter, typeFilter]);

  // Stats computation
  const stats = useMemo(() => {
    const total = executions.length;
    const pending = executions.filter(e => e.status === 'pending').length;
    const executed = executions.filter(e => e.status === 'executed' || e.status === 'completed').length;
    const challenged = executions.filter(e => e.status === 'challenged').length;
    const overdue = executions.filter(e => {
      const d = daysUntil(e.executionDeadline);
      return d !== null && d < 0 && e.status !== 'executed' && e.status !== 'completed' && e.status !== 'cancelled';
    }).length;
    return { total, pending, executed, challenged, overdue };
  }, [executions]);

  const handleOpenAdd = () => {
    setEditingExecution(null);
    setShowModal(true);
  };

  const handleOpenEdit = (e: Execution) => {
    setEditingExecution(e);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExecution(null);
  };

  const handleSave = (e: Execution) => {
    if (editingExecution) {
      onUpdateExecution(e);
    } else {
      onAddExecution(e);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm('هل أنت متأكد من حذف هذا التنفيذ؟ لا يمكن التراجع عن هذا الإجراء.')) {
      onDeleteExecution(id);
    }
  };

  const handleExportCSV = () => {
    const headers = ['رقم القضية', 'الموكل', 'المحكمة', 'النوع', 'الحالة', 'تاريخ الحكم', 'موعد التنفيذ', 'موقف النفاذ', 'المبلغ المحكوم به', 'ملاحظات'];
    const rows = filteredExecutions.map(e => [
      e.caseNumber || '',
      e.clientName || '',
      e.court || '',
      EXECUTION_TYPE_LABELS[e.type] || e.type,
      EXECUTION_STATUS_LABELS[e.status] || e.status,
      formatDate(e.judgmentDate),
      formatDate(e.executionDeadline),
      e.enforceabilityStatus || '',
      e.amount || 0,
      e.notes || '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Header & Banner ── */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">سجل تنفيذ الأحكام القضائية</h1>
              <p className="text-xs text-slate-500 mt-0.5">متابعة إجراءات التنفيذ الجبري والوديعة والطعون لمكتب المحاماة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-bold transition"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-md shadow-indigo-200 text-xs"
            >
              <Plus className="w-4 h-4" />
              إضافة تنفيذ جديد
            </button>
          </div>
        </div>

        {/* ── Stat Cards Banner ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <StatBannerCard label="إجمالي التنفيذات" value={stats.total} color="slate" icon={<FileText className="w-4 h-4" />} />
          <StatBannerCard label="جاري التنفيذ" value={stats.pending} color="indigo" icon={<Clock className="w-4 h-4" />} />
          <StatBannerCard label="منفّذ مكتمل" value={stats.executed} color="emerald" icon={<CheckCircle className="w-4 h-4" />} />
          <StatBannerCard label="مطعون فيه" value={stats.challenged} color="rose" icon={<AlertTriangle className="w-4 h-4" />} />
          <StatBannerCard label="متأخرة عن الموعد" value={stats.overdue} color="amber" icon={<AlertCircle className="w-4 h-4" />} />
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض كبطاقات"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>بطاقات</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض كجدول"
            >
              <List className="w-4 h-4" />
              <span>جدول</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث برقم القضية، اسم الموكل، المحكمة، الملاحظات..."
              className="w-full text-xs py-2.5 pe-3 ps-9 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Custom Select Status Filter */}
          <div className="min-w-[170px]">
            <CustomSelect
              options={[
                { value: 'all', label: 'جميع الحالات' },
                ...Object.entries(EXECUTION_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              buttonClassName="py-2 text-xs"
            />
          </div>

          {/* Custom Select Type Filter */}
          <div className="min-w-[170px]">
            <CustomSelect
              options={[
                { value: 'all', label: 'جميع الأنواع' },
                ...Object.entries(EXECUTION_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })),
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
              buttonClassName="py-2 text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── Main View (Grid or Table) ── */}
      {filteredExecutions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 px-6 text-center text-slate-500 shadow-sm">
          <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-700">لا توجد أي تنفيذات تطابق البحث</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            لم نجد نتائج تطابق خيارات الفلترة المحددة. يمكنك إضافة تنفيذ جديد أو تعديل كلمة البحث.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-xl font-bold transition shadow-md text-xs"
          >
            <Plus className="w-4 h-4" />
            إضافة أول تنفيذ الآن
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View Mode (Cards Layout) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(filteredExecutions as Execution[]).map((e: Execution) => (
            <ExecutionCard
              key={e.id}
              execution={e}
              onView={() => setViewingExecution(e)}
              onEdit={() => handleOpenEdit(e)}
              onPrint={() => printSingleExecution(e, officeProfile)}
              onExportWord={() => exportExecutionToWord(e, officeProfile)}
              onPrintQR={() => handlePrintExecutionQR(e, officeProfile)}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      ) : (
        /* ── Table View Mode ── */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-end">رقم القضية</th>
                  <th className="px-4 py-3 text-end">الموكل</th>
                  <th className="px-4 py-3 text-end">نوع التنفيذ</th>
                  <th className="px-4 py-3 text-end">الحالة</th>
                  <th className="px-4 py-3 text-end">تاريخ الحكم</th>
                  <th className="px-4 py-3 text-end">موعد التنفيذ</th>
                  <th className="px-4 py-3 text-end">المبلغ</th>
                  <th className="px-4 py-3 text-end">إجراءات المستند والتقرير</th>
                </tr>
              </thead>
              <tbody>
                {filteredExecutions.map(e => {
                  const days = daysUntil(e.executionDeadline);
                  const isOverdue =
                    days !== null &&
                    days < 0 &&
                    e.status !== 'executed' &&
                    e.status !== 'completed' &&
                    e.status !== 'cancelled';
                  const isUrgent = days !== null && days >= 0 && days <= 7 && e.status === 'pending';
                  return (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-bold font-mono text-indigo-900">{e.caseNumber || '—'}</td>
                      <td className="px-4 py-3 text-slate-800 font-semibold">{e.clientName || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {EXECUTION_TYPE_LABELS[e.type] || e.type}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                            STATUS_BADGE_STYLES[e.status] || ''
                          }`}
                        >
                          {EXECUTION_STATUS_LABELS[e.status] || e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{formatDate(e.judgmentDate)}</td>
                      <td
                        className={`px-4 py-3 text-xs ${
                          isOverdue
                            ? 'text-rose-600 font-bold'
                            : isUrgent
                            ? 'text-indigo-600 font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatDate(e.executionDeadline)}
                        {isOverdue && <AlertCircle className="w-3.5 h-3.5 inline ms-1" />}
                        {isUrgent && <AlertTriangle className="w-3.5 h-3.5 inline ms-1" />}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-xs text-emerald-700">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingExecution(e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="عرض تفصيلي"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => printSingleExecution(e, officeProfile)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="طباعة تقرير مستندي"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => exportExecutionToWord(e, officeProfile)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="تصدير Word"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintExecutionQR(e, officeProfile)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="طباعة رمز QR"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showModal && (
        <ExecutionFormModal
          execution={editingExecution}
          cases={cases}
          clients={clients}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}

      {/* ── View Detail Drawer Modal ── */}
      {viewingExecution && (
        <ExecutionViewModal
          execution={viewingExecution}
          officeProfile={officeProfile}
          onEdit={() => {
            setEditingExecution(viewingExecution);
            setViewingExecution(null);
            setShowModal(true);
          }}
          onClose={() => setViewingExecution(null)}
        />
      )}
    </div>
  );
}

// ─── Stat Banner Card ───────────────────────────────────────────────────────
function StatBannerCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: 'slate' | 'indigo' | 'emerald' | 'rose' | 'amber';
  icon: React.ReactNode;
}) {
  const stylesMap = {
    slate: 'bg-slate-50/80 border-slate-200 text-slate-800',
    indigo: 'bg-indigo-50/60 border-indigo-100 text-indigo-800',
    emerald: 'bg-emerald-50/60 border-emerald-100 text-emerald-800',
    rose: 'bg-rose-50/60 border-rose-100 text-rose-800',
    amber: 'bg-amber-50/60 border-amber-100 text-amber-800',
  };

  return (
    <div className={`rounded-2xl border p-3 flex items-center justify-between ${stylesMap[color]}`}>
      <div>
        <div className="text-xl font-bold font-mono">{value}</div>
        <div className="text-[11px] font-semibold opacity-80 mt-0.5">{label}</div>
      </div>
      <div className="p-2 rounded-xl bg-white/60 shadow-xs flex-shrink-0">{icon}</div>
    </div>
  );
}

// ─── Execution Card (Grid Layout) ──────────────────────────────────────────
const ExecutionCard: React.FC<{
  execution: Execution;
  onView: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onExportWord: () => void;
  onPrintQR: () => void;
  onDelete: () => void | Promise<void>;
}> = ({
  execution,
  onView,
  onEdit,
  onPrint,
  onExportWord,
  onPrintQR,
  onDelete,
}) => {
  const topColor = EXECUTION_TYPE_COLORS[execution.type] || 'bg-indigo-600';
  const steps = execution.steps || [];
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const days = daysUntil(execution.executionDeadline);
  const isOverdue =
    days !== null &&
    days < 0 &&
    execution.status !== 'executed' &&
    execution.status !== 'completed' &&
    execution.status !== 'cancelled';
  const isUrgent = days !== null && days >= 0 && days <= 7 && execution.status === 'pending';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group">
      {/* Top accent bar */}
      <div className={`h-1.5 ${topColor}`} />

      <div className="p-4 space-y-3">
        {/* Header: Case number & status badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              {EXECUTION_TYPE_LABELS[execution.type] || execution.type}
            </span>
            <h3 className="text-base font-bold font-mono text-slate-900 leading-tight">
              {execution.caseNumber || 'بدون رقم قضية'}
            </h3>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${
              STATUS_BADGE_STYLES[execution.status] || ''
            }`}
          >
            {EXECUTION_STATUS_LABELS[execution.status] || execution.status}
          </span>
        </div>

        {/* Client & Court info */}
        <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="font-semibold text-slate-800 truncate">{execution.clientName || 'غير محدد'}</span>
          </div>
          {execution.court && (
            <div className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{execution.court}</span>
            </div>
          )}
        </div>

        {/* Financial & Judgment Date */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">المبلغ المحكوم به</span>
            <span className="font-bold font-mono text-emerald-700">
              {formatCurrency(execution.amount)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">موعد التنفيذ</span>
            <span
              className={`font-semibold ${
                isOverdue ? 'text-rose-600 font-bold' : isUrgent ? 'text-indigo-600 font-bold' : 'text-slate-700'
              }`}
            >
              {formatDate(execution.executionDeadline)}
            </span>
          </div>
        </div>

        {/* Steps Progress Bar */}
        {totalSteps > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-semibold">إجراءات التنفيذ</span>
              <span className="text-indigo-600 font-bold">
                {completedSteps}/{totalSteps} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Footer Button Bar (Identical to CaseRowActions) */}
      <div className="p-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
        <button
          onClick={onView}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition shadow-2xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>التفاصيل</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onPrint}
            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
            title="طباعة تقرير مستندي"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExportWord}
            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
            title="تصدير Word"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onPrintQR}
            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
            title="طباعة رمز QR"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
            title="تعديل"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Execution Form Modal ───────────────────────────────────────────────────
function ExecutionFormModal({
  execution,
  cases,
  clients,
  onSave,
  onClose,
}: {
  execution: Execution | null;
  cases: Case[];
  clients: Client[];
  onSave: (e: Execution) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Execution>(() => {
    if (execution) return { ...execution };
    return {
      id: generateId(),
      caseId: '',
      caseNumber: '',
      clientName: '',
      type: 'primary_judgment',
      status: 'pending',
      judgmentDate: '',
      executionDeadline: '',
      appealDeadline: '',
      court: '',
      circuit: '',
      judgmentNumber: '',
      judgmentText: '',
      judgeName: '',
      fees: 0,
      totalAmount: 0,
      currency: '',
      enforceabilityStatus: 'واجب النفاذ',
      amount: 0,
      notes: '',
      steps: [],
      createdAt: new Date().toISOString(),
    };
  });

  const handleCaseChange = (caseId: string) => {
    const c = cases.find(x => x.id === caseId);
    if (c) {
      const cl = clients.find(cl => cl.id === c.clientId);
      setForm(f => ({
        ...f,
        caseId,
        caseNumber: c.caseNumber,
        clientName: cl?.name || (cl as any)?.fullName || '',
      }));
    } else {
      setForm(f => ({ ...f, caseId, caseNumber: '', clientName: '' }));
    }
  };

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [
        ...(f.steps || []),
        {
          id: generateId(),
          title: '',
          status: 'pending',
          dueDate: '',
          notes: '',
        },
      ],
    }));
  };

  const updateStep = (id: string, patch: Partial<ExecutionStep>) => {
    setForm(f => ({
      ...f,
      steps: (f.steps || []).map(s => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeStep = (id: string) => {
    setForm(f => ({
      ...f,
      steps: (f.steps || []).filter(s => s.id !== id),
    }));
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    // v2.9.8: Custom validation with clear Arabic error messages (replaces HTML5 required)
    const errors: Record<string, string> = {};
    if (!form.caseNumber?.trim()) {
      errors.caseNumber = 'رقم القضية مطلوب';
    }
    if (!form.clientName?.trim()) {
      errors.clientName = 'اسم الموكل مطلوب';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    onSave({ ...form, updatedAt: new Date().toISOString() });
  };

  // v2.9.8: error state for inline form validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const inputCls = [
    'w-full py-2.5 px-3 rounded-xl',
    'border border-slate-200 bg-slate-50 text-slate-800 text-sm',
    'focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200',
    'transition',
  ].join(' ');
  const labelCls = 'block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide';

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col font-sans"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-indigo-700 to-indigo-500 px-6 py-4 text-white rounded-t-2xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Gavel className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">
                  {execution ? 'تعديل بيانات التنفيذ' : 'إضافة تنفيذ أحكام جديد'}
                </h2>
                <p className="text-indigo-200 text-xs">سجل قضايا وتنفيذات المكتب</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* ── القضية المرتبطة ── */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                  ١
                </span>
                ربط ملف القضية والموكل
              </h3>
              <div>
                <label className={labelCls}>اختر من سجل قضايا المكتب</label>
                <CustomSelect
                  options={[
                    { value: '', label: '— ادخل البيانات يدوياً بدون ربط بقضية —' },
                    ...cases.map(c => ({
                      value: c.id,
                      label: c.caseNumber,
                      subtitle: c.claimSubject || undefined,
                    })),
                  ]}
                  value={form.caseId}
                  onChange={handleCaseChange}
                  searchable
                  placeholder="ابحث برقم القضية أو اسم الموضوع..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>رقم القضية *</label>
                  <input
                    type="text"
                    value={form.caseNumber || ''}
                    onChange={e => {
                      setForm(f => ({ ...f, caseNumber: e.target.value }));
                      if (formErrors.caseNumber) setFormErrors(p => ({ ...p, caseNumber: '' }));
                    }}
                    placeholder="مثال: ١٥٤٢٠ لسنة ٢٠٢٤"
                    className={`${inputCls} ${formErrors.caseNumber ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                  />
                  {formErrors.caseNumber && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.caseNumber}</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>اسم الموكل *</label>
                  <input
                    type="text"
                    value={form.clientName || ''}
                    onChange={e => {
                      setForm(f => ({ ...f, clientName: e.target.value }));
                      if (formErrors.clientName) setFormErrors(p => ({ ...p, clientName: '' }));
                    }}
                    placeholder="اسم الموكل"
                    className={`${inputCls} ${formErrors.clientName ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
                  />
                  {formErrors.clientName && (
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">{formErrors.clientName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── نوع التنفيذ والحالة ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-bold">
                  ٢
                </span>
                تصنيف التنفيذ وموقف النفاذ
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>نوع التنفيذ</label>
                  <CustomSelect
                    options={Object.entries(EXECUTION_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    value={form.type}
                    onChange={val => setForm(f => ({ ...f, type: val as Execution['type'] }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>حالة التنفيذ الحالية</label>
                  <CustomSelect
                    options={Object.entries(EXECUTION_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    value={form.status}
                    onChange={val => setForm(f => ({ ...f, status: val as Execution['status'] }))}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>موقف النفاذ القانوني</label>
                <CustomSelect
                  options={[
                    { value: 'واجب النفاذ', label: 'واجب النفاذ' },
                    { value: 'موقوف التنفيذ', label: 'موقوف التنفيذ' },
                    { value: 'نفاذ كلي', label: 'نفاذ كلي' },
                    { value: 'نفاذ جزئي', label: 'نفاذ جزئي' },
                    { value: 'مطعون فيه', label: 'مطعون فيه' },
                  ]}
                  value={form.enforceabilityStatus || 'واجب النفاذ'}
                  onChange={val => setForm(f => ({ ...f, enforceabilityStatus: val }))}
                />
              </div>
            </div>

            {/* ── التواريخ ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-bold">
                  ٣
                </span>
                التواريخ والمواعيد القانونية
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>تاريخ الحكم</label>
                  <input
                    type="date"
                    value={form.judgmentDate ? form.judgmentDate.slice(0, 10) : ''}
                    onChange={e => setForm(f => ({ ...f, judgmentDate: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>موعد التنفيذ</label>
                  <input
                    type="date"
                    value={form.executionDeadline ? form.executionDeadline.slice(0, 10) : ''}
                    onChange={e => setForm(f => ({ ...f, executionDeadline: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>موعد الطعن</label>
                  <input
                    type="date"
                    value={form.appealDeadline ? form.appealDeadline.slice(0, 10) : ''}
                    onChange={e => setForm(f => ({ ...f, appealDeadline: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* ── بيانات الحكم ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-bold">
                  ٤
                </span>
                بيانات المحكمة المنظورة
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>المحكمة مصدر الحكم</label>
                  <input
                    type="text"
                    value={form.court || ''}
                    onChange={e => setForm(f => ({ ...f, court: e.target.value }))}
                    placeholder="مثال: محكمة جنوب القاهرة الابتدائية"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>الدائرة</label>
                  <input
                    type="text"
                    value={form.circuit || ''}
                    onChange={e => setForm(f => ({ ...f, circuit: e.target.value }))}
                    placeholder="مثال: الدائرة المدنية الأولى"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>رقم الحكم</label>
                  <input
                    type="text"
                    value={form.judgmentNumber || ''}
                    onChange={e => setForm(f => ({ ...f, judgmentNumber: e.target.value }))}
                    placeholder="رقم الحكم"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>اسم القاضي</label>
                  <input
                    type="text"
                    value={form.judgeName || ''}
                    onChange={e => setForm(f => ({ ...f, judgeName: e.target.value }))}
                    placeholder="اسم القاضي"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>نص الحكم / ملخص القرار القضائي</label>
                <textarea
                  value={form.judgmentText || ''}
                  onChange={e => setForm(f => ({ ...f, judgmentText: e.target.value }))}
                  rows={2}
                  placeholder="ملخص منطوق الحكم"
                  className={inputCls + ' resize-none'}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>المبلغ المحكوم به (ج.م)</label>
                  <input
                    type="number"
                    value={form.amount || 0}
                    onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>مصاريف التنفيذ</label>
                  <input
                    type="number"
                    value={form.fees || 0}
                    onChange={e => setForm(f => ({ ...f, fees: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>الإجمالي المستحق</label>
                  <input
                    type="number"
                    value={form.totalAmount || 0}
                    onChange={e => setForm(f => ({ ...f, totalAmount: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* ── ملاحظات ── */}
            <div>
              <label className={labelCls}>ملاحظات وتوجيهات إضافية</label>
              <textarea
                value={form.notes || ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="أدخل أي ملاحظات هامة..."
                className={inputCls + ' resize-none'}
              />
            </div>

            {/* ── إجراءات التنفيذ ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">جدول خطوات وإجراءات التنفيذ</h3>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition"
                >
                  <Plus className="w-3 h-3" />
                  إضافة خطوة
                </button>
              </div>
              <div className="space-y-2">
                {(form.steps || []).map(s => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm"
                  >
                    <input
                      type="text"
                      value={s.title}
                      onChange={e => updateStep(s.id, { title: e.target.value })}
                      placeholder="عنوان الإجراء (مثال: تقديم الصورة التنفيذية المحضري)"
                      className="flex-1 p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    <CustomSelect
                      options={Object.entries(STEP_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                      value={s.status}
                      onChange={val => updateStep(s.id, { status: val as ExecutionStep['status'] })}
                      buttonClassName="py-1.5 px-2 text-xs rounded-lg min-w-[110px]"
                    />
                    <input
                      type="date"
                      value={s.dueDate ? s.dueDate.slice(0, 10) : ''}
                      onChange={e => updateStep(s.id, { dueDate: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(s.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(form.steps || []).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    لا توجد خطة إجراءات — اضغط "إضافة خطوة" لإدراج مراحل التنفيذ
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-7 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 flex items-center gap-2 text-xs"
            >
              <CheckCircle className="w-4 h-4" />
              {execution ? 'حفظ التعديلات' : 'إضافة التنفيذ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Execution Detailed Drawer View Modal ───────────────────────────────────
function ExecutionViewModal({
  execution,
  officeProfile,
  onEdit,
  onClose,
}: {
  execution: Execution;
  officeProfile: OfficeProfile;
  onEdit: () => void;
  onClose: () => void;
}) {
  const steps = execution.steps || [];
  const completedSteps = steps.filter(s => s.status === 'completed').length;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden font-sans"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-l from-indigo-700 to-indigo-500 p-6 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Gavel className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-indigo-200 text-xs font-bold">
                {EXECUTION_TYPE_LABELS[execution.type] || execution.type}
              </span>
              <h2 className="text-xl font-bold font-mono text-white leading-tight">
                قضية رقم {execution.caseNumber || 'بدون رقم'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DetailItem label="الموكل" value={execution.clientName} icon={<User className="w-4 h-4 text-indigo-500" />} />
            <DetailItem label="المحكمة" value={execution.court} icon={<Building className="w-4 h-4 text-indigo-500" />} />
            <DetailItem label="الدائرة" value={execution.circuit} icon={<Gavel className="w-4 h-4 text-indigo-500" />} />
            <DetailItem label="الحالة" value={EXECUTION_STATUS_LABELS[execution.status]} icon={<CheckSquare className="w-4 h-4 text-indigo-500" />} />
            <DetailItem label="موقف النفاذ" value={execution.enforceabilityStatus} icon={<FileText className="w-4 h-4 text-indigo-500" />} />
            <DetailItem label="تاريخ الحكم" value={formatDate(execution.judgmentDate)} icon={<Calendar className="w-4 h-4 text-indigo-500" />} />
            <DetailItem label="موعد التنفيذ" value={formatDate(execution.executionDeadline)} icon={<Clock className="w-4 h-4 text-indigo-500" />} />
            <DetailItem label="موعد الطعن" value={formatDate(execution.appealDeadline)} icon={<Clock className="w-4 h-4 text-indigo-500" />} />
            <DetailItem label="رقم الحكم" value={execution.judgmentNumber} icon={<FileText className="w-4 h-4 text-indigo-500" />} />
          </div>

          {/* Financials Card */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-800">المبلغ المحكوم به</div>
              <div className="text-2xl font-bold font-mono text-emerald-700">{formatCurrency(execution.amount)}</div>
            </div>
            {execution.fees ? (
              <div className="text-end">
                <div className="text-xs font-bold text-slate-500">مصاريف التنفيذ</div>
                <div className="text-base font-bold font-mono text-slate-700">{formatCurrency(execution.fees)}</div>
              </div>
            ) : null}
          </div>

          {/* Judgment Text */}
          {execution.judgmentText && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-600 mb-1">منطوق الحكم / الملخص القضائي</h4>
              <p className="text-sm text-slate-900 leading-relaxed font-semibold">{execution.judgmentText}</p>
            </div>
          )}

          {/* Notes */}
          {execution.notes && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-600 mb-1">ملاحظات والتوجيهات</h4>
              <p className="text-sm text-slate-800">{execution.notes}</p>
            </div>
          )}

          {/* Steps Timeline */}
          {steps.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <span>إجراءات وخطوات التنفيذ ({completedSteps}/{steps.length})</span>
              </h4>
              <div className="space-y-2">
                {steps.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STEP_STATUS_COLORS[s.status]}`}>
                        {STEP_STATUS_LABELS[s.status] || s.status}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{s.title || '—'}</span>
                    </div>
                    {s.dueDate && <span className="text-xs font-mono text-slate-500">{formatDate(s.dueDate)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => printSingleExecution(execution, officeProfile)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              طباعة تقرير مستندي
            </button>
            <button
              onClick={() => exportExecutionToWord(execution, officeProfile)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              تصدير Word
            </button>
            <button
              onClick={() => handlePrintExecutionQR(execution, officeProfile)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              QR
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              تعديل
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string; value?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-bold text-slate-900 truncate">{value || '—'}</div>
    </div>
  );
}
