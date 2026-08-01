/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * وحدة إدارة الخصوم (OpponentsList).
 *
 * منصة كاملة لإدارة الخصوم (المدعى عليهم / الخصوم في القضايا).
 * منصة CRUD متكاملة مع حفظ البيانات وإدارتها وتصنيفها.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, Search, Plus, Phone, MapPin, Mail, Briefcase, Trash2, Edit, X,
  AlertTriangle, ShieldAlert, ChevronLeft, ChevronRight, Eye, Building2,
  User as UserIcon, Landmark, Filter, Archive, RotateCcw, Download,
  FileText, Globe, AtSign, Hash, Calendar, Printer, MessageSquare,
  Database, AlertCircle, CheckCircle, Flag, Scale, CreditCard,
} from 'lucide-react';
import { Opponent, OpponentType, OpponentRiskLevel, OpponentContact, Case } from '../types';

import {
  loadOpponentsFromLocal,
  saveOpponentsToLocal,
  hydrateOpponentsFromDisk,
  getOpponentsStorageDiagnostics,
  generateOpponentId,
  clearCustomOpponents,
  loadDeletedOpponentIds,
  saveDeletedOpponentId,
} from '../utils/opponentsStorage';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import { logger } from '../utils/logger';

interface OpponentsListProps {
  cases: Case[];
  onSelectCase?: (caseId: string) => void;
  onNavigateToCases?: () => void;
}

const TYPE_LABELS: Record<OpponentType, string> = {
  'فرد': 'فرد',
  'شركة': 'شركة',
  'جهة حكومية': 'جهة حكومية',
  'منظمة غير هادفة': 'منظمة غير هادفة',
  'شراكة': 'شراكة',
  'صندوق': 'صندوق',
};

const RISK_STYLE: Record<OpponentRiskLevel, { bg: string; text: string; border: string; label: string }> = {
  'منخفض': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'منخفض' },
  'متوسط': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'متوسط' },
  'مرتفع': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'مرتفع' },
  'حرج': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'حرج' },
};

const TYPE_ICON: Record<OpponentType, React.ComponentType<{ className?: string }>> = {
  'فرد': UserIcon,
  'شركة': Building2,
  'جهة حكومية': Landmark,
  'منظمة غير هادفة': Users,
  'شراكة': Briefcase,
  'صندوق': Scale,
};

// تعريف نوع الخصوم / الأطراف
type FormMode = 'add' | 'edit' | null;

const EMPTY_FORM = {
  fullName: '',
  type: 'فرد' as OpponentType,
  nationalId: '',
  commercialRecord: '',
  taxId: '',
  address: '',
  city: '',
  phone: '',
  altPhone: '',
  email: '',
  fax: '',
  website: '',
  opponentLawyer: '',
  opponentLawyerPhone: '',
  opponentLawyerOffice: '',
  dataSource: '',
  riskLevel: 'منخفض' as OpponentRiskLevel,
  notes: '',
  contacts: [] as OpponentContact[],
};

const OpponentsList = React.memo(function OpponentsList({ cases, onSelectCase, onNavigateToCases }: OpponentsListProps) {
  const confirm = useConfirm();
  // ===== الحالة =====
  const [opponents, setOpponents] = useState<Opponent[]>(() => {
    const saved = loadOpponentsFromLocal();
    const deletedIds = loadDeletedOpponentIds();
    if (saved.length === 0) return [];
    const byId = new Map<string, Opponent>();
    saved.forEach(o => byId.set(o.id, o));
    return Array.from(byId.values());
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<OpponentType | 'all'>('all');
  const [filterRisk, setFilterRisk] = useState<OpponentRiskLevel | 'all'>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // حفظ البيانات/التخزين
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [formData, setFormData] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // التحميل
  const [diagMsg, setDiagMsg] = useState<string | null>(null);

  // ===== بدء التحميل =====
  useEffect(() => {
    saveOpponentsToLocal(opponents);
  }, [opponents]);

  // ===== محاولة التحميل من القرص في Electron =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const diskResult = await hydrateOpponentsFromDisk();
        if (cancelled) return;
        if (diskResult && diskResult.count > 0) {
          const deletedIds = loadDeletedOpponentIds();
          const data = loadOpponentsFromLocal();
          const merged = (() => {
                      const byId = new Map<string, Opponent>();
            data.forEach(o => byId.set(o.id, o));
            return Array.from(byId.values());
          })();
          setOpponents(merged);
          logger.debug('[OpponentsList] ✓ تم تحميل الخصوم من الملف');
        }
        setLoadError(null);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'حدث خطأ أثناء تحميل الخصوم');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ===== الإحصائيات =====
  const stats = useMemo(() => {
    const visible = opponents.filter(o => showArchived || !o.isArchived);
    return {
      total: visible.length,
      individuals: visible.filter(o => o.type === 'فرد').length,
      companies: visible.filter(o => o.type === 'شركة').length,
      government: visible.filter(o => o.type === 'جهة حكومية').length,
      critical: visible.filter(o => o.riskLevel === 'حرج').length,
      high: visible.filter(o => o.riskLevel === 'مرتفع').length,
      archived: opponents.filter(o => o.isArchived).length,
    };
  }, [opponents, showArchived]);

  // ===== نافذة التصفية =====
  const cities = useMemo(() => {
    const set = new Set(opponents.map(o => o.city).filter(Boolean));
    return Array.from(set).sort();
  }, [opponents]);

  // ===== نافذة البحث =====
  const filtered = useMemo(() => {
    let result = opponents;
    if (!showArchived) result = result.filter(o => !o.isArchived);

    if (filterType !== 'all') result = result.filter(o => o.type === filterType);
    if (filterRisk !== 'all') result = result.filter(o => o.riskLevel === filterRisk);
    if (filterCity !== 'all') result = result.filter(o => o.city === filterCity);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => {
        return (
          o.fullName.toLowerCase().includes(q) ||
          o.address.toLowerCase().includes(q) ||
          o.city.toLowerCase().includes(q) ||
          o.phone.includes(q) ||
          (o.email || '').toLowerCase().includes(q) ||
          (o.nationalId || '').includes(q) ||
          (o.commercialRecord || '').includes(q) ||
          (o.opponentLawyer || '').toLowerCase().includes(q) ||
          (o.notes || '').toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [opponents, searchQuery, filterType, filterRisk, filterCity, showArchived]);

  // ===== تحديد الخصم الحالي للعرض =====
  const casesByOpponent = useMemo(() => {
    const map = new Map<string, Case[]>();
    cases.forEach(c => {
      // محاولة إيجاد الخصم حسب opponentName من عنوان URL
      const oppName = c.opponentName?.trim();
      if (!oppName) return;
      opponents.forEach(op => {
        if (op.fullName.includes(oppName) || oppName.includes(op.fullName)) {
          const list = map.get(op.id) || [];
          list.push(c);
          map.set(op.id, list);
        }
      });
    });
    return map;
  }, [cases, opponents]);

  const selectedOpponent = selectedOpponentId ? opponents.find(o => o.id === selectedOpponentId) : null;

  // ===== العمليات CRUD =====
  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormMode('add');
  };

  const openEdit = (op: Opponent) => {
    setFormData({
      fullName: op.fullName,
      type: op.type,
      nationalId: op.nationalId || '',
      commercialRecord: op.commercialRecord || '',
      taxId: op.taxId || '',
      address: op.address,
      city: op.city,
      phone: op.phone,
      altPhone: op.altPhone || '',
      email: op.email || '',
      fax: op.fax || '',
      website: op.website || '',
      opponentLawyer: op.opponentLawyer || '',
      opponentLawyerPhone: op.opponentLawyerPhone || '',
      opponentLawyerOffice: op.opponentLawyerOffice || '',
      dataSource: (op as any).dataSource || '',
      riskLevel: op.riskLevel,
      notes: op.notes || '',
      contacts: op.contacts || [],
    });
    setEditingId(op.id);
    setFormMode('edit');
  };

  const saveForm = async () => {
    if (!formData.fullName.trim()) {
      await showAlert('يرجى إدخال اسم الخصم');
      return;
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      await showAlert('تم حفظ الخصم بنجاح في قاعدة البيانات');
      return;
    }

    const now = new Date().toISOString().split('T')[0];
    if (formMode === 'add') {
      const newOp: Opponent = {
        ...formData,
        id: generateOpponentId(),
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      };
      setOpponents(prev => [...prev, newOp]);
      setSelectedOpponentId(newOp.id);
    } else if (formMode === 'edit' && editingId) {
      setOpponents(prev => prev.map(o =>
        o.id === editingId
          ? { ...o, ...formData, updatedAt: now }
          : o
      ));
    }
    setFormMode(null);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const op = opponents.find(o => o.id === id);
    if (!op) return;
    const linked = casesByOpponent.get(id) || [];
    const msg = linked.length > 0
      ? `الخصم "${op.fullName}" مرتبط بـ ${linked.length} قضايا. هل أنت متأكد من حذف هذا الخصم من جميع القضايǿ`
      : `هل أنت متأكد من حذف الخصم "${op.fullName}" بشكل دائم`;
    if (!await confirm(msg)) return;
    saveDeletedOpponentId(id);
    setOpponents(prev => prev.filter(o => o.id !== id));
    if (selectedOpponentId === id) setSelectedOpponentId(null);
  };

  const handleArchive = async (id: string) => {
    const op = opponents.find(o => o.id === id);
    if (!op) return;
    const action = op.isArchived ? 'إلغاء الأرشفة' : 'الأرشفة';
    if (!await confirm(`هل تريد ${action} الخصم "${op.fullName}"?`)) return;
    setOpponents(prev => prev.map(o =>
      o.id === id
        ? { ...o, isArchived: !o.isArchived, archivedAt: o.isArchived ? undefined : new Date().toISOString().split('T')[0] }
        : o
    ));
  };

  // ===== تخزين الخصم الحالي للتعديل =====
  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { id: 'c_' + Date.now(), name: '', role: '', phone: '', email: '' }],
    }));
  };

  const updateContact = (id: string, field: keyof OpponentContact, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  };

  const removeContact = (id: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter(c => c.id !== id),
    }));
  };

  // ===== التشخيص =====
  const handleDiagnostics = async () => {
    const d = await getOpponentsStorageDiagnostics();
    const msg =
      `=== تشخيص وحدة الخصوم ===\n` +
      `✓ localStorage: ${d.localStorageAvailable ? '✅ متاح' : '❌ غير متاح'}\n` +
      `✓ مسار القرص: ${d.electronDiskPath || 'غير متوفر (سطح)'}\n` +
      `✓ وضع كتابة: ${d.electronDiskWritable ? '✅ متاح الكتابة' : '❌ غير متاح'}\n` +
      `✓ عدد الخصوم: ${d.inMemoryCount} خصم\n` +
      `✓ في localStorage: ${d.inLocalStorageCount} خصم`;
    setDiagMsg(msg);
    await showAlert(msg);
  };

  // ===== تصدير CSV =====
  const handleExportCSV = () => {
    const headers = ['اسم الخصم', 'النوع', 'رقم الهوية', 'رقم السجل', 'الهاتف', 'البريد', 'المدينة', 'العنوان', 'مصدر البيانات', 'تاريخ الإنشاء'];
    const rows = filtered.map(o => [
      o.fullName,
      TYPE_LABELS[o.type],
      o.nationalId || '',
      o.commercialRecord || '',
      o.address,
      o.city,
      o.phone,
      o.email || '',
      o.opponentLawyer || '',
      o.riskLevel,
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opponents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== التصفية =====
  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* العنوان */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12" />
        <div className="relative z-10 flex items-center justify-between gap-4 w-full">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                نظام إدارة متقدم
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> حماية الخصوم
              </span>
              {isLoading && (
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                  خصوم نشطين
                </span>
              )}
              {!isLoading && !loadError && (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> نشطون
                </span>
              )}
              {loadError && (
                <span className="bg-red-500/20 text-red-300 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> بحالة جيدة
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              إدارة الخصوم والمتقاضين
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              منصة متكاملة لإدارة الخصوم (المدعى عليهم / المعترضين في الدعوى) في نظام إدارة المحامي الرقمية.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-center min-w-[60px]">
              <div className="text-base font-black text-white">{stats.total}</div>
              <div className="text-slate-400 text-[10px]">إجمالي</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-center min-w-[60px]">
              <div className="text-base font-black text-white">{stats.high + stats.critical}</div>
              <div className="text-slate-400 text-[10px]">أفراد</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-center min-w-[60px]">
              <div className="text-base font-black text-blue-300">{stats.companies}</div>
              <div className="text-slate-400 text-[10px]">شركات</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-center min-w-[60px]">
              <div className="text-base font-black text-emerald-300">{stats.government}</div>
              <div className="text-slate-400 text-[10px]">جهة حكومية</div>
            </div>
          </div>
        </div>
      </div>

      {/* مربع البحث */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن خصم (يمكن البحث بالاسم أو رقم الهوية أو رقم السجل التجاري أو الهاتف...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pe-9 ps-3 py-2 text-xs outline-none focus:border-indigo-400"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer"
            title={viewMode === 'grid' ? 'عرض جدولي' : 'عرض شبكي'}
          >
            {viewMode === 'grid' ? <Filter className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-2 rounded-xl text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center gap-1 cursor-pointer"
            title="تصدير بيانات الخصوم إلى ملف CSV"
          >
            <Download className="w-3 h-3" /> تصدير
          </button>
          <button
            onClick={handleDiagnostics}
            className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer"
            title="تحديث البيانات"
          >
            <Database className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={openAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-sm"
          >
            <Plus className="w-3 h-3" /> إضافة خصم
          </button>
        </div>

        {/* تصفية */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-500">تصفية:</span>
          <select value={filterType} onChange={e => setFilterType(e.target.value as OpponentType | 'all')}
            className="text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="all">كل الأنواع</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value as OpponentRiskLevel | 'all')}
            className="text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="all">جميع المستويات</option>
            {Object.entries(RISK_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
            className="text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="all">كل الحالات</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
              showArchived
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-3 h-3" /> {showArchived ? 'إخفاء المؤرشفة' : `إظهار المؤرشفة (${stats.archived})`}
          </button>
          <button
            onClick={async () => {
              if (!await confirm('هل أنت متأكد من مسح جميع البيانات المؤرشفɿ')) return;
              const r = clearCustomOpponents();
              setOpponents(prev => prev.filter(o => o.source === 'mock'));
              await showAlert(`تم حذف ${r.removed} خصم مؤرشف.`);
            }}
            className="px-2 py-1.5 rounded-lg text-[10px] font-bold border border-rose-200 bg-rose-50 text-rose-700 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> مسح كل المؤرشفة
          </button>
        </div>
      </div>

      {/* فارغ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* جدول/شبكة الخصوم */}
        <div className={`${selectedOpponent ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-2`}>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
              <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-500">لا يوجد خصوم مسجلين</p>
              <p className="text-[10px] text-slate-400 mt-1">قم بإضافة خصم جديد من زر الإضافة أعلاه.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(op => {
                const Icon = TYPE_ICON[op.type];
                const risk = RISK_STYLE[op.riskLevel];
                const linkedCount = casesByOpponent.get(op.id)?.length || 0;
                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOpponentId(op.id)}
                    className={`bg-white rounded-2xl border p-4 hover:shadow-lg transition relative overflow-hidden text-end space-y-2 cursor-pointer ${
                      selectedOpponentId === op.id
                        ? 'border-slate-500 ring-2 ring-slate-500/20 bg-slate-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${op.isArchived ? 'opacity-60' : ''}`}
                  >
                    <div className={`absolute top-0 right-0 left-0 h-1 ${
                      op.riskLevel === 'حرج' ? 'bg-rose-500' :
                      op.riskLevel === 'مرتفع' ? 'bg-slate-400' :
                      op.riskLevel === 'متوسط' ? 'bg-indigo-400' :
                      'bg-emerald-500'
                    }`} />
                    <div className="flex justify-between items-start pt-1">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          op.type === 'فرد' ? 'bg-blue-50 text-blue-600' :
                          op.type === 'شركة' ? 'bg-purple-50 text-purple-600' :
                          op.type === 'جهة حكومية' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-slate-900 text-xs truncate" title={op.fullName}>{op.fullName}</h3>
                          <p className="text-[10px] text-slate-500">{TYPE_LABELS[op.type]}، {op.city}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${risk.bg} ${risk.text} ${risk.border} border`}>
                        {risk.label}
                      </span>
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-600">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-mono truncate">{op.phone}</span>
                      </div>
                      {op.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{op.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{op.address}</span>
                      </div>
                    </div>

                    {linkedCount > 0 && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        مرتبط بـ {linkedCount} قضية
                      </div>
                    )}

                    <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchive(op.id); }}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg py-1.5 text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        title={op.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}
                      >
                        {op.isArchived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                        {op.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(op); }}
                        className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg py-1.5 text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3 h-3" />
                        تعديل
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(op.id); }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg p-1.5 transition cursor-pointer"
                        title="حذف الخصم"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {filtered.map(op => {
                const Icon = TYPE_ICON[op.type];
                const risk = RISK_STYLE[op.riskLevel];
                const linkedCount = casesByOpponent.get(op.id)?.length || 0;
                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOpponentId(op.id)}
                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition ${
                      selectedOpponentId === op.id ? 'bg-slate-50/30' : ''
                    } ${op.isArchived ? 'opacity-60' : ''}`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      op.type === 'فرد' ? 'bg-blue-50 text-blue-600' :
                      op.type === 'شركة' ? 'bg-purple-50 text-purple-600' :
                      op.type === 'جهة حكومية' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-xs truncate">{op.fullName}</h3>
                        {linkedCount > 0 && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                            {linkedCount} قضية
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{TYPE_LABELS[op.type]}، {op.city} - {op.phone}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${risk.bg} ${risk.text}`}>
                      {risk.label}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(op); }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* تفاصيل الخصم */}
        {selectedOpponent && (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-2 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <OpponentDetails
              opponent={selectedOpponent}
              linkedCases={casesByOpponent.get(selectedOpponent.id) || []}
              onSelectCase={(id) => {
                if (onSelectCase) onSelectCase(id);
                else if (onNavigateToCases) onNavigateToCases();
              }}
              onClose={() => setSelectedOpponentId(null)}
              onEdit={() => openEdit(selectedOpponent)}
              onArchive={() => handleArchive(selectedOpponent.id)}
              onDelete={() => handleDelete(selectedOpponent.id)}
            />
          </div>
        )}
      </div>

      {/* نموذج بيانات/تعديل */}
      {formMode && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setFormMode(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900">
                {formMode === 'add' ? 'إضافة خصم جديد' : 'تعديل بيانات الخصم'}
              </h3>
              <button onClick={() => setFormMode(null)} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* بيانات أساسية */}
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">اسم الخصم <span className="text-rose-500">*</span></label>
                <input
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="مثل: محمد أحمد عبد الله / شركة الأمل للتجارة"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">النوع</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as OpponentType })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">مستوى الخطورة</label>
                <select
                  value={formData.riskLevel}
                  onChange={e => setFormData({ ...formData, riskLevel: e.target.value as OpponentRiskLevel })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white"
                >
                  {Object.entries(RISK_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              {formData.type === 'فرد' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">رقم الهوية</label>
                  <input
                    value={formData.nationalId}
                    onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder="14 رقم"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono"
                  />
                </div>
              )}

              {(formData.type === 'شركة' || formData.type === 'صندوق') && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">رقم السجل</label>
                    <input
                      value={formData.commercialRecord}
                      onChange={e => setFormData({ ...formData, commercialRecord: e.target.value })}
                      placeholder="رقم السجل التجاري"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">رقم ضريبي</label>
                    <input
                      value={formData.taxId}
                      onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                      placeholder="XXX-XXX-XXX"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono"
                    />
                  </div>
                </>
              )}

              {/* معلومات الاتصال */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">الهاتف <span className="text-rose-500">*</span></label>
                <input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="مثال: 01005123456"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">الهاتف / الجوال <span className="text-rose-500">*</span></label>
                <input
                  value={formData.altPhone}
                  onChange={e => setFormData({ ...formData, altPhone: e.target.value })}
                  placeholder="مثال: 01005123456..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">البريد الإلكتروني <span className="text-rose-500">*</span></label>
                <input
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="01000000000"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">عنوان المقر</label>
                <input
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="01111111111"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">المدينة / المحافظة</label>
                <input
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="info@example.com"
                  type="email"
                  dir="ltr"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">المحافظة</label>
                <input
                  value={formData.fax}
                  onChange={e => setFormData({ ...formData, fax: e.target.value })}
                  placeholder="02XXXXXXXX"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">الموقع الإلكتروني</label>
                <input
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.example.com"
                  dir="ltr"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">محامي الخصم</label>
                <input
                  value={formData.opponentLawyer}
                  onChange={e => setFormData({ ...formData, opponentLawyer: e.target.value })}
                  placeholder="اسم محامي الخصم"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">هاتف محامي الخصم</label>
                <input
                  value={formData.opponentLawyerPhone}
                  onChange={e => setFormData({ ...formData, opponentLawyerPhone: e.target.value })}
                  placeholder="مثال: 01005123456"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">مكتب محامي الخصم</label>
                <input
                  value={formData.opponentLawyerOffice}
                  onChange={e => setFormData({ ...formData, opponentLawyerOffice: e.target.value })}
                  placeholder="اسم المكتب"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">مصدر البيانات</label>
                <input
                  value={formData.dataSource}
                  onChange={e => setFormData({ ...formData, dataSource: e.target.value })}
                  placeholder="اختر مصدر البيانات"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              </div>

              {/* ملاحظات */}
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات عن الخصم مثل معلومات إضافية أو تحذيرات..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 min-h-[80px]"
                />
              </div>

              {/* جهات الاتصال */}
              <div className="md:col-span-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700">جهات الاتصال الإضافية</h4>
                  <button
                    onClick={addContact}
                    className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> إضافة جهة
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.contacts.map(c => (
                    <div key={c.id} className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          value={c.name}
                          onChange={e => updateContact(c.id, 'name', e.target.value)}
                          placeholder="اسم جهة الاتصال"
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none bg-white"
                        />
                        <input
                          value={c.role}
                          onChange={e => updateContact(c.id, 'role', e.target.value)}
                          placeholder="الدور (مثل مدير)"
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none bg-white"
                        />
                        <input
                          value={c.phone || ''}
                          onChange={e => updateContact(c.id, 'phone', e.target.value)}
                          placeholder="الهاتف"
                          dir="ltr"
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none bg-white font-mono"
                        />
                        <input
                          value={c.email || ''}
                          onChange={e => updateContact(c.id, 'email', e.target.value)}
                          placeholder="البريد الإلكتروني"
                          dir="ltr"
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none bg-white"
                        />
                      </div>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="mt-1 text-[10px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> حذف
                      </button>
                    </div>
                  ))}
                  {formData.contacts.length === 0 && (
                    <p className="text-[10px] text-slate-400 text-center py-2">لا توجد جهات اتصال مضافة</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={() => setFormMode(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition"
              >
                حفظ
              </button>
              <button
                onClick={saveForm}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition shadow-sm"
              >
                {formMode === 'add' ? 'حفظ الخصم' : 'تحديث البيانات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ===== نهاية قائمة الخصوم =====
interface OpponentDetailsProps {
  opponent: Opponent;
  linkedCases: Case[];
  onSelectCase: (id: string) => void;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function OpponentDetails({ opponent, linkedCases, onSelectCase, onClose, onEdit, onArchive, onDelete }: OpponentDetailsProps) {
  const Icon = TYPE_ICON[opponent.type];
  const risk = RISK_STYLE[opponent.riskLevel];
  return (
    <div className="space-y-4">
      {/* تفاصيل */}
      <div className={`rounded-2xl p-4 ${
        opponent.riskLevel === 'حرج' ? 'bg-rose-50 border border-rose-200' :
        opponent.riskLevel === 'مرتفع' ? 'bg-slate-100 border border-slate-200' :
        opponent.riskLevel === 'متوسط' ? 'bg-indigo-50 border border-indigo-200' :
        'bg-emerald-50 border border-emerald-200'
      }`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-xl shrink-0 ${
              opponent.type === 'فرد' ? 'bg-blue-100 text-blue-700' :
              opponent.type === 'شركة' ? 'bg-purple-100 text-purple-700' :
              opponent.type === 'جهة حكومية' ? 'bg-emerald-100 text-emerald-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-slate-900 text-sm truncate" title={opponent.fullName}>
                {opponent.fullName}
              </h2>
              <p className="text-[11px] text-slate-600">
                {TYPE_LABELS[opponent.type]}، {opponent.city}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/50 rounded-lg cursor-pointer shrink-0">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${risk.bg} ${risk.text} ${risk.border} border`}>
            مستوى: {risk.label}
          </span>
          {opponent.isArchived && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700 border border-slate-300">
              تعديل
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/60 text-slate-700 border border-slate-300">
            {opponent.source === 'mock' ? 'بيانات تجريبية' : opponent.source === 'manual' ? 'إضافة يدوية' : 'مستورد'}
          </span>
        </div>
      </div>

      {/* معلومات التلامس */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
          <Phone className="w-3.5 h-3.5" /> بيانات التلامس
        </h3>
        <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 text-[11px]">
          <ContactRow icon={Phone} label="رقم الهاتف" value={opponent.phone} mono />
          {opponent.altPhone && <ContactRow icon={Phone} label="هاتف بديل" value={opponent.altPhone} mono />}
          {opponent.email && <ContactRow icon={Mail} label="البريد الإلكتروني" value={opponent.email} />}
          {opponent.fax && <ContactRow icon={Printer} label="فاكس" value={opponent.fax} mono />}
          {opponent.website && <ContactRow icon={Globe} label="الموقع الإلكتروني" value={opponent.website} />}
          <ContactRow icon={MapPin} label="العنوان" value={`${opponent.address}، ${opponent.city}`} />
        </div>
      </div>

      {/* وثائق الهوية */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
          <Hash className="w-3.5 h-3.5" /> وثائق الهوية
        </h3>
        <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 text-[11px]">
          {opponent.nationalId && <ContactRow icon={CreditCard} label="رقم الهوية" value={opponent.nationalId} mono />}
          {opponent.commercialRecord && <ContactRow icon={Briefcase} label="رقم السجل" value={opponent.commercialRecord} mono />}
          {opponent.taxId && <ContactRow icon={FileText} label="رقم ضريبي" value={opponent.taxId} mono />}
          {opponent.opponentLawyer && <ContactRow icon={Briefcase} label="محامي الخصم" value={opponent.opponentLawyer} />}
          {opponent.opponentLawyerPhone && <ContactRow icon={Phone} label="هاتف محامي الخصم" value={opponent.opponentLawyerPhone} mono />}
          {opponent.opponentLawyerOffice && <ContactRow icon={Building2} label="مكتب محامي الخصم" value={opponent.opponentLawyerOffice} />}
        </div>
      </div>

      {/* جهات الاتصال */}
      {opponent.contacts && opponent.contacts.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> جهات الاتصال ({opponent.contacts.length})
          </h3>
          <div className="space-y-2">
            {opponent.contacts.map(c => (
              <div key={c.id} className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 text-xs">{c.name || 'غير معروف'}</span>
                  <span className="text-[10px] text-slate-500"> - {c.role}</span>
                </div>
                <div className="space-y-0.5 text-[10px] text-slate-600">
                  {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /><span className="font-mono">{c.phone}</span></div>}
                  {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /><span>{c.email}</span></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ملاحظات */}
      {opponent.notes && (
        <div>
          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> ملاحظات عامة
          </h3>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-[11px] text-indigo-900 leading-relaxed">
            {opponent.notes}
          </div>
        </div>
      )}

      {/* القضايا المرتبطة */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
          <Briefcase className="w-3.5 h-3.5" /> القضايا المرتبطة ({linkedCases.length})
        </h3>
        {linkedCases.length === 0 ? (
          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400">
            لا توجد قضايا مرتبطة بهذا الخصم
          </div>
        ) : (
          <div className="space-y-1">
            {linkedCases.map(c => (
              <button
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className="w-full text-end bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg p-2 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{c.caseNumber} - {c.claimSubject}</p>
                    <p className="text-[10px] text-slate-500">{c.court} - {c.status}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={onEdit}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition"
        >
          <Edit className="w-3.5 h-3.5" />
          حذف
        </button>
        <button
          onClick={onArchive}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition"
        >
          {opponent.isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          {opponent.isArchived ? 'إلغاء الأرشفة' : 'أرشفة'}
        </button>
        <button
          onClick={onDelete}
          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          حذف
        </button>
      </div>

      <div className="text-[9px] text-slate-400 text-center pt-2">
        تم الإنشاء في {opponent.createdAt} وآخر تحديث {opponent.updatedAt}
      </div>
    </div>
  );
}

// ===== نهاية ملف الخصوم =====
function ContactRow({ icon: Icon, label, value, mono }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2.5">
      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="text-[10px] text-slate-500 w-24 shrink-0">{label}</span>
      <span className={`flex-1 text-slate-800 ${mono ? 'font-mono' : ''} truncate`} dir="auto">{value}</span>
    </div>
  );
}

export default OpponentsList;
