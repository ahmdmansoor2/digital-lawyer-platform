/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * وحدة مركز المراقبة: Audit Log + Login History + Password Policy + Groups
 *
 * كل الوحدات في شاشة واحدة بتبويبات.
 */

import React, { useState, useMemo } from 'react';
import { showAlert } from '../utils/dialogs';
import {
  Users, Shield, Activity, KeyRound, Search, Filter, Download,
  Calendar, Globe, Monitor, Hash, Eye, AlertTriangle, CheckCircle, XCircle,
  Lock, Save, X, Plus, Trash2, Edit, Clock, Building2, Eraser,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { SecurityGroup, PasswordPolicy, AuditLog, LoginHistory } from '../types_auth';
import { generateId } from '../utils/security';
import { loadAuditLogs, loadLoginHistory, saveAuditLogs, saveLoginHistory } from '../utils/authStorage';

const OPERATION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  create: { label: 'إنشاء', color: 'bg-emerald-100 text-emerald-700', icon: '➕' },
  update: { label: 'تعديل', color: 'bg-blue-100 text-blue-700', icon: '✏️' },
  delete: { label: 'حذف', color: 'bg-rose-100 text-rose-700', icon: '🗑️' },
  view: { label: 'عرض', color: 'bg-slate-100 text-slate-700', icon: '👁️' },
  login: { label: 'تسجيل دخول', color: 'bg-emerald-100 text-emerald-700', icon: '🔓' },
  logout: { label: 'تسجيل خروج', color: 'bg-slate-100 text-slate-700', icon: '🔒' },
  login_failed: { label: 'فشل دخول', color: 'bg-rose-100 text-rose-700', icon: '❌' },
  permission_change: { label: 'تغيير صلاحية', color: 'bg-indigo-100 text-indigo-700', icon: '⚙️' },
  password_change: { label: 'تغيير كلمة المرور', color: 'bg-purple-100 text-purple-700', icon: '🔑' },
  export: { label: 'تصدير', color: 'bg-cyan-100 text-cyan-700', icon: '📤' },
  import: { label: 'استيراد', color: 'bg-indigo-100 text-indigo-700', icon: '📥' },
  approve: { label: 'اعتماد', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  unapprove: { label: 'إلغاء اعتماد', color: 'bg-indigo-100 text-indigo-700', icon: '↩️' },
  archive: { label: 'أرشفة', color: 'bg-slate-100 text-slate-700', icon: '📦' },
  restore: { label: 'استعادة', color: 'bg-blue-100 text-blue-700', icon: '↪️' },
  sign: { label: 'توقيع إلكتروني', color: 'bg-emerald-100 text-emerald-700', icon: '✍️' },
};

const STATUS_LABELS = {
  success: { label: 'ناجح', color: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'فشل', color: 'bg-rose-100 text-rose-700' },
  locked: { label: 'مقفل', color: 'bg-rose-100 text-rose-700' },
  expired: { label: 'منتهي', color: 'bg-indigo-100 text-indigo-700' },
  '2fa_required': { label: 'يحتاج 2FA', color: 'bg-blue-100 text-blue-700' },
};

type TabType = 'audit' | 'login' | 'groups' | 'password';

const SecurityCenter = React.memo(function SecurityCenter() {
  const auth = useAuth();
  const [tab, setTab] = useState<TabType>('audit');

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
    { id: 'audit', label: 'سجل العمليات', icon: Activity, color: 'from-indigo-500 to-purple-500' },
    { id: 'login', label: 'سجل تسجيل الدخول', icon: KeyRound, color: 'from-blue-500 to-cyan-500' },
    { id: 'groups', label: 'المجموعات الأمنية', icon: Users, color: 'from-purple-500 to-pink-500' },
    { id: 'password', label: 'سياسة كلمات المرور', icon: Lock, color: 'from-rose-500 to-rose-400' },
  ];

  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* الرأس */}
      <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white rounded-3xl p-5 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 bg-indigo-500/20 w-72 h-72 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            مركز الأمان والمراقبة
          </h1>
          <p className="text-[11px] text-slate-300">
            تتبع كامل لجميع العمليات + سجل تسجيل الدخول + إدارة المجموعات + سياسات الأمان
          </p>
        </div>
      </div>

      {/* التبويبات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`p-3 rounded-2xl text-white bg-gradient-to-br ${t.color} ${tab === t.id ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' : 'opacity-80'} transition`}>
              <Icon className="w-5 h-5 mb-1 mx-auto" />
              <p className="text-[11px] font-bold">{t.label}</p>
            </button>
          );
        })}
      </div>

      {tab === 'audit' && <AuditLogView />}
      {tab === 'login' && <LoginHistoryView />}
      {tab === 'groups' && <GroupsView />}
      {tab === 'password' && <PasswordPolicyView />}
    </div>
  );
});

// ===== Audit Log =====
function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>(loadAuditLogs());
  const [search, setSearch] = useState('');
  const [filterOp, setFilterOp] = useState<string>('all');
  const [filterSuccess, setFilterSuccess] = useState<'all' | 'success' | 'failed'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<null | { type: 'single'; log: AuditLog } | { type: 'selected' } | { type: 'all' }>(null);

  const filtered = useMemo(() => {
    let result = logs;
    if (filterOp !== 'all') result = result.filter(l => l.operation === filterOp);
    if (filterSuccess !== 'all') result = result.filter(l => l.success === (filterSuccess === 'success'));
    if (dateFrom) result = result.filter(l => l.timestamp >= dateFrom);
    if (dateTo) result = result.filter(l => l.timestamp <= dateTo + 'T23:59:59');
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.username.toLowerCase().includes(q) ||
        l.userFullName.toLowerCase().includes(q) ||
        (l.tableName || '').toLowerCase().includes(q) ||
        (l.screenName || '').toLowerCase().includes(q) ||
        (l.errorMessage || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, search, filterOp, filterSuccess, dateFrom, dateTo]);

  const handleExport = () => {
    const csv = [
      ['التاريخ', 'المستخدم', 'العملية', 'الشاشة', 'الجدول', 'الحالة', 'IP', 'الجهاز', 'الخطأ'],
      ...filtered.map(l => [
        new Date(l.timestamp).toLocaleString('ar-EG'),
        l.userFullName || l.username,
        OPERATION_LABELS[l.operation]?.label || l.operation,
        l.screenName || '',
        l.tableName || '',
        l.success ? 'ناجح' : 'فشل',
        l.ipAddress || '',
        l.deviceName || '',
        l.errorMessage || '',
      ])
    ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const performDelete = () => {
    if (!confirmAction) return;
    let newLogs: AuditLog[];
    if (confirmAction.type === 'single') {
      newLogs = logs.filter(l => l.id !== confirmAction.log.id);
    } else if (confirmAction.type === 'selected') {
      newLogs = logs.filter(l => !selectedIds.has(l.id));
      setSelectedIds(new Set());
    } else {
      newLogs = [];
    }
    setLogs(newLogs);
    saveAuditLogs(newLogs);
    setConfirmAction(null);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllSelected = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id)));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          سجل العمليات (Audit Trail)
        </h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedIds.size > 0 && (
            <button onClick={() => setConfirmAction({ type: 'selected' })}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> حذف المحدد ({selectedIds.size})
            </button>
          )}
          {logs.length > 0 && (
            <button onClick={() => setConfirmAction({ type: 'all' })}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Eraser className="w-3 h-3" /> حذف الكل ({logs.length})
            </button>
          )}
          <button onClick={handleExport} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Download className="w-3 h-3" /> تصدير CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div className="md:col-span-2 relative">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالمستخدم، الشاشɡ الجدول..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pe-9 ps-3 py-2 text-xs outline-none focus:border-indigo-400" />
        </div>
        <select value={filterOp} onChange={e => setFilterOp(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
          <option value="all">كل العمليات</option>
          {Object.entries(OPERATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterSuccess} onChange={e => setFilterSuccess(e.target.value as any)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
          <option value="all">كل الحالات</option>
          <option value="success">ناجح</option>
          <option value="failed">فشل</option>
        </select>
        <div className="flex gap-1">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="flex-1 text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="flex-1 text-[10px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white" />
        </div>
      </div>

      <div className="text-[10px] text-slate-500">عدد النتائج: {filtered.length} من {logs.length}</div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-[10px]">
          <thead className="bg-slate-100 sticky top-0">
            <tr className="text-slate-600">
              <th className="px-2 py-2 text-center font-bold w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleAllSelected}
                  className="cursor-pointer"
                  title="تحديد الكل"
                />
              </th>
              <th className="px-2 py-2 text-end font-bold">التاريخ</th>
              <th className="px-2 py-2 text-end font-bold">المستخدم</th>
              <th className="px-2 py-2 text-end font-bold">العملية</th>
              <th className="px-2 py-2 text-end font-bold">الشاشة</th>
              <th className="px-2 py-2 text-end font-bold">الجدول</th>
              <th className="px-2 py-2 text-center font-bold">الحالة</th>
              <th className="px-2 py-2 text-end font-bold">IP</th>
              <th className="px-2 py-2 text-end font-bold">الجهاز</th>
              <th className="px-2 py-2 text-center font-bold w-10">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-slate-400">
                <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>لا توجد عمليات مسجلة</p>
              </td></tr>
            ) : filtered.map(log => {
              const op = OPERATION_LABELS[log.operation] || { label: log.operation, color: 'bg-slate-100 text-slate-700', icon: '?' };
              const isSelected = selectedIds.has(log.id);
              return (
                <tr key={log.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(log.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-2 text-slate-700 font-mono">{new Date(log.timestamp).toLocaleString('ar-EG')}</td>
                  <td className="px-2 py-2">
                    <p className="font-bold text-slate-900">{log.userFullName}</p>
                    <p className="text-[9px] text-slate-500 font-mono">@{log.username}</p>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${op.color}`}>
                      {op.icon} {op.label}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-600">{log.screenName || '-'}</td>
                  <td className="px-2 py-2 text-slate-600 font-mono">{log.tableName || '-'}</td>
                  <td className="px-2 py-2 text-center">
                    {log.success ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" /> : <XCircle className="w-3.5 h-3.5 text-rose-500 inline" />}
                  </td>
                  <td className="px-2 py-2 text-slate-600 font-mono">{log.ipAddress || '-'}</td>
                  <td className="px-2 py-2 text-slate-600 text-[9px]">{log.deviceName || '-'}</td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => setConfirmAction({ type: 'single', log })}
                      className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700"
                      title="حذف هذه العملية"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* مودال تأكيد الحذف */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-rose-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {confirmAction.type === 'single'
                ? 'حذف العملية'
                : confirmAction.type === 'selected'
                ? `حذف ${selectedIds.size} عملية محددة`
                : '⚠️ حذف كل سجل العمليات'}
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed whitespace-pre-line">
              {confirmAction.type === 'single'
                ? `هل تريد حذف هذه العملية نهائياً؟\n\n(${confirmAction.log.userFullName} • ${new Date(confirmAction.log.timestamp).toLocaleString('ar-EG')})`
                : confirmAction.type === 'selected'
                ? `هل تريد حذف ${selectedIds.size} عملية محددة نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه.`
                : `هل تريد حذف كل سجل العمليات (${logs.length} عملية)؟\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه وسيتم حذف كل السجلات.`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl">
                إلغاء
              </button>
              <button onClick={performDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-xl">
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Login History =====
function LoginHistoryView() {
  const [history, setHistory] = useState<LoginHistory[]>(loadLoginHistory());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lhSelected, setLhSelected] = useState<Set<string>>(new Set());
  const [lhConfirm, setLhConfirm] = useState<null | { type: 'single'; item: LoginHistory } | { type: 'selected' } | { type: 'all' }>(null);

  const toggleLhSelected = (id: string) => {
    setLhSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleLhAllSelected = () => {
    if (lhSelected.size === filtered.length) setLhSelected(new Set());
    else setLhSelected(new Set(filtered.map(h => h.id)));
  };
  const performLhDelete = () => {
    if (!lhConfirm) return;
    let newHistory: LoginHistory[];
    if (lhConfirm.type === 'single') {
      newHistory = history.filter(h => h.id !== lhConfirm.item.id);
    } else if (lhConfirm.type === 'selected') {
      newHistory = history.filter(h => !lhSelected.has(h.id));
      setLhSelected(new Set());
    } else {
      newHistory = [];
    }
    setHistory(newHistory);
    saveLoginHistory(newHistory);
    setLhConfirm(null);
  };

  const filtered = useMemo(() => {
    let result = history;
    if (filterStatus !== 'all') result = result.filter(h => h.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(h =>
        h.username.toLowerCase().includes(q) ||
        (h.ipAddress || '').includes(q) ||
        (h.deviceName || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [history, search, filterStatus]);

  const stats = useMemo(() => ({
    total: history.length,
    success: history.filter(h => h.status === 'success').length,
    failed: history.filter(h => h.status === 'failed').length,
    locked: history.filter(h => h.status === 'locked').length,
  }), [history]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600" />
          سجل تسجيل الدخول
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 text-[10px]">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">✅ {stats.success}</span>
            <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold">❌ {stats.failed}</span>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">🔒 {stats.locked}</span>
          </div>
          {lhSelected.size > 0 && (
            <button onClick={() => setLhConfirm({ type: 'selected' })}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> حذف المحدد ({lhSelected.size})
            </button>
          )}
          {history.length > 0 && (
            <button onClick={() => setLhConfirm({ type: 'all' })}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Eraser className="w-3 h-3" /> حذف الكل
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="relative md:col-span-2">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالمستخدم، IP، الجهاز..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pe-9 ps-3 py-2 text-xs outline-none focus:border-indigo-400" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
          <option value="all">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-[10px]">
          <thead className="bg-slate-100 sticky top-0">
            <tr className="text-slate-600">
              <th className="px-2 py-2 text-center font-bold w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && lhSelected.size === filtered.length}
                  onChange={toggleLhAllSelected}
                  className="cursor-pointer"
                  title="تحديد الكل"
                />
              </th>
              <th className="px-2 py-2 text-end font-bold">التاريخ</th>
              <th className="px-2 py-2 text-end font-bold">المستخدم</th>
              <th className="px-2 py-2 text-center font-bold">الحالة</th>
              <th className="px-2 py-2 text-end font-bold">IP</th>
              <th className="px-2 py-2 text-end font-bold">الجهاز</th>
              <th className="px-2 py-2 text-end font-bold">المتصفح</th>
              <th className="px-2 py-2 text-end font-bold">نظام التشغيل</th>
              <th className="px-2 py-2 text-end font-bold">2FA</th>
              <th className="px-2 py-2 text-end font-bold">السبب</th>
              <th className="px-2 py-2 text-center font-bold w-10">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-8 text-slate-400">لا توجد محاولات</td></tr>
            ) : filtered.map(h => {
              const st = STATUS_LABELS[h.status as keyof typeof STATUS_LABELS] || { label: h.status, color: 'bg-slate-100 text-slate-700' };
              const isSel = lhSelected.has(h.id);
              return (
                <tr key={h.id} className={`hover:bg-slate-50 ${isSel ? 'bg-indigo-50/40' : ''}`}>
                  <td className="px-2 py-2 text-center">
                    <input type="checkbox" checked={isSel} onChange={() => toggleLhSelected(h.id)} className="cursor-pointer" />
                  </td>
                  <td className="px-2 py-2 text-slate-700 font-mono">{new Date(h.timestamp).toLocaleString('ar-EG')}</td>
                  <td className="px-2 py-2 font-bold text-slate-900">{h.username}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-2 py-2 text-slate-700 font-mono">{h.ipAddress || '-'}</td>
                  <td className="px-2 py-2 text-slate-600">{h.deviceName || '-'}</td>
                  <td className="px-2 py-2 text-slate-600">{h.browser || '-'}</td>
                  <td className="px-2 py-2 text-slate-600">{h.os || '-'}</td>
                  <td className="px-2 py-2 text-center">
                    {h.twoFactorUsed ? <span className="text-emerald-500">✓</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-2 py-2 text-rose-600">{h.failureReason || '-'}</td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => setLhConfirm({ type: 'single', item: h })}
                      className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700"
                      title="حذف هذه المحاولة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* مودال تأكيد الحذف */}
      {lhConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setLhConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-rose-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {lhConfirm.type === 'single'
                ? 'حذف محاولة الدخول'
                : lhConfirm.type === 'selected'
                ? `حذف ${lhSelected.size} محاولة محددة`
                : '⚠️ حذف كل سجل تسجيل الدخول'}
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed whitespace-pre-line">
              {lhConfirm.type === 'single'
                ? `هل تريد حذف هذه المحاولة نهائياً؟\n\n(@${lhConfirm.item.username} • ${new Date(lhConfirm.item.timestamp).toLocaleString('ar-EG')})`
                : lhConfirm.type === 'selected'
                ? `هل تريد حذف ${lhSelected.size} محاولة محددɿ\n\nهذا الإجراء لا يمكن التراجع عنه.`
                : `هل تريد حذف كل سجل تسجيل الدخول (${history.length} محاولة)؟\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه.`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setLhConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl">
                إلغاء
              </button>
              <button onClick={performLhDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-xl">
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Groups =====
function GroupsView() {
  const confirm = useConfirm();
  const auth = useAuth();
  const { groups, addGroup, updateGroup, deleteGroup, users, can } = auth;
  const [editing, setEditing] = useState<SecurityGroup | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleDelete = async (g: SecurityGroup) => {
    if (!await confirm(`هل تريد حذف المجموعة "${g.name}"؟`)) return;
    deleteGroup(g.id);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          المجموعات الأمنية ({groups.length})
        </h2>
        <button onClick={() => setIsCreating(true)} disabled={!can('groups.add')}
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:bg-slate-300">
          <Plus className="w-3 h-3" /> إضافة مجموعة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.map(g => {
          const memberCount = users.filter(u => u.groupIds.includes(g.id)).length;
          return (
            <div key={g.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{g.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{g.code}</p>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => setEditing(g)} disabled={!can('groups.edit')} className="p-1 hover:bg-white rounded text-indigo-600 disabled:opacity-30">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(g)} disabled={!can('groups.delete')} className="p-1 hover:bg-white rounded text-rose-600 disabled:opacity-30">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {g.description && <p className="text-[11px] text-slate-600 mb-2">{g.description}</p>}
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">الأعضاء</span>
                  <span className="font-bold text-slate-800">{memberCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">الصلاحيات</span>
                  <span className="font-bold text-slate-800">{g.permissionIds.length}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(editing || isCreating) && (
        <GroupFormModal
          group={editing}
          onClose={() => { setEditing(null); setIsCreating(false); }}
          onSave={(g) => { if (editing) updateGroup(g); else addGroup(g); setEditing(null); setIsCreating(false); }}
        />
      )}
    </div>
  );
}

function GroupFormModal({ group, onClose, onSave }: { group: SecurityGroup | null; onClose: () => void; onSave: (g: SecurityGroup) => void }) {
  const { users, permissions } = useAuth();
  const [form, setForm] = useState<SecurityGroup>(group || {
    id: generateId('group'),
    code: '',
    name: '',
    description: '',
    permissionIds: [],
    memberIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-900">{group ? 'تعديل مجموعة' : 'مجموعة جديدة'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الرمز *</label>
            <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الاسم *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الوصف</label>
            <input value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" />
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[11px] font-bold text-slate-700 mb-2">الأعضاء ({form.memberIds.length})</p>
          <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1">
            {users.filter(u => !u.isArchived).map(u => (
              <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1 rounded">
                <input type="checkbox" checked={form.memberIds.includes(u.id)}
                  onChange={e => {
                    const ids = e.target.checked
                      ? [...form.memberIds, u.id]
                      : form.memberIds.filter(x => x !== u.id);
                    setForm({...form, memberIds: ids});
                  }} />
                <span className="flex-1">{u.fullName}</span>
                <span className="text-[10px] text-slate-500">@{u.username}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl">
            إلغاء
          </button>
          <button onClick={() => onSave({...form, updatedAt: new Date().toISOString()})}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2.5 rounded-xl">
            {group ? 'حفظ' : 'إنشاء'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Password Policy =====
function PasswordPolicyView() {
  const auth = useAuth();
  const { passwordPolicy, updatePasswordPolicy, can } = auth;
  const [form, setForm] = useState<PasswordPolicy>(passwordPolicy || {
    id: 'default', minLength: 8, requireUppercase: true, requireLowercase: true,
    requireDigits: true, requireSpecialChars: true, preventLastN: 5,
    expiryDays: 90, maxFailedAttempts: 5, lockoutDurationMinutes: 15,
    sessionTimeoutMinutes: 60, forceStrongPassword: true,
    updatedAt: new Date().toISOString(),
  });

  const handleSave = async () => {
    if (!can('settings.edit')) {
      await showAlert('ليس لديك صلاحية لتعديل الإعدادات');
      return;
    }
    updatePasswordPolicy({ ...form, updatedAt: new Date().toISOString() });
    await showAlert('تم حفظ السياسة بنجاح');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-rose-600" />
          سياسة كلمات المرور
        </h2>
        <button onClick={handleSave} disabled={!can('settings.edit')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:bg-slate-300">
          <Save className="w-3 h-3" /> حفظ السياسة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="الحد الأدنى لطول كلمة المرور" value={form.minLength} type="number" suffix="حرف"
          onChange={v => setForm({...form, minLength: Number(v)})} />
        <Field label="منع استخدام آخر" value={form.preventLastN} type="number" suffix="كلمات مرور"
          onChange={v => setForm({...form, preventLastN: Number(v)})} />
        <Field label="مدة انتهاء كلمة المرور" value={form.expiryDays} type="number" suffix="يوم (0 = لا تنتهي)"
          onChange={v => setForm({...form, expiryDays: Number(v)})} />
        <Field label="عدد المحاولات الفاشلة قبل القفل" value={form.maxFailedAttempts} type="number" suffix="محاولة"
          onChange={v => setForm({...form, maxFailedAttempts: Number(v)})} />
        <Field label="مدة القفل" value={form.lockoutDurationMinutes} type="number" suffix="دقيقة"
          onChange={v => setForm({...form, lockoutDurationMinutes: Number(v)})} />
        <Field label="مدة الجلسة الخاملة" value={form.sessionTimeoutMinutes} type="number" suffix="دقيقة"
          onChange={v => setForm({...form, sessionTimeoutMinutes: Number(v)})} />
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-[11px] font-bold text-slate-700 mb-2">المتطلبات الإلزامية:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { k: 'requireUppercase', l: 'حرف كبير واحد على الأقل (A-Z)' },
            { k: 'requireLowercase', l: 'حرف صغير واحد على الأقل (a-z)' },
            { k: 'requireDigits', l: 'رقم واحد على الأقل (0-9)' },
            { k: 'requireSpecialChars', l: 'رمز خاص واحد على الأقل (!@#$%^&*)' },
            { k: 'forceStrongPassword', l: 'فرض كلمة مرور قوية دائماً' },
          ].map(({ k, l }) => (
            <label key={k} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={(form as any)[k]}
                onChange={e => setForm({...form, [k]: e.target.checked})} />
              <span className="text-xs">{l}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, type = 'text', suffix, onChange }: { label: string; value: any; type?: string; suffix?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-700 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" dir="ltr" />
        {suffix && <span className="text-[10px] text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}

export default SecurityCenter;
