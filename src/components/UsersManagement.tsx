/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * وحدة إدارة المستخدمين — Enterprise Grade
 *
 * - CRUD كامل للمستخدمين
 * - تفعيل/تعطيل/قفل/إلغاء قفل الحساب
 * - إعادة تعيين كلمة المرور
 * - تفعيل/تعطيل 2FA (QR Code)
 * - عرض/نسخ/تصدير المستخدمين
 * - بحث وفلترة متقدمة
 * - Audit Trail لكل عملية
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Users, Search, Plus, Edit, Trash2, Lock, Unlock, Shield, ShieldOff,
  KeyRound, Copy, Download, Upload, MoreVertical, Eye, X, Check,
  ChevronDown, AlertTriangle, Mail, Phone, IdCard, Building2,
  Briefcase, UserCheck, UserX, Archive, RotateCcw, Filter,
  Calendar, Activity, Hash, BadgeCheck, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserStatus, UserGrade } from '../types_auth';
import { hashPassword, generateId, generateTotpSecret } from '../utils/security';

const GRADE_LABELS: Record<UserGrade, string> = {
  partner: 'شريك', senior: 'محامي أول', junior: 'محامي', trainee: 'متدرب',
  paralegal: 'مساعد قانوني', researcher: 'باحث', secretary: 'سكرتير', accountant: 'محاسب',
  hr: 'موارد بشرية', admin: 'مدير', readonly: 'قارئ فقط',
};

const STATUS_LABELS: Record<UserStatus, { label: string; color: string }> = {
  active: { label: 'نشط', color: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'معطل', color: 'bg-slate-200 text-slate-700' },
  locked: { label: 'مقفل', color: 'bg-rose-100 text-rose-700' },
  suspended: { label: 'موقوف', color: 'bg-indigo-100 text-indigo-700' },
  pending: { label: 'في انتظار التفعيل', color: 'bg-blue-100 text-blue-700' },
  archived: { label: 'مؤرشف', color: 'bg-slate-300 text-slate-600' },
};

const UsersManagement = React.memo(function UsersManagement() {
  const auth = useAuth();
  const { users, roles, groups, addUser, updateUser, deleteUser, can, currentUser } = auth;

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [show2FADialog, setShow2FADialog] = useState<{ user: User; secret: string; backupCodes: string[] } | null>(null);
  const [resetPwdDialog, setResetPwdDialog] = useState<{ user: User; newPassword: string; mustChange: boolean } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void; danger?: boolean } | null>(null);

  // ===== الإحصائيات =====
  const stats = useMemo(() => ({
    total: users.filter(u => showArchived || !u.isArchived).length,
    active: users.filter(u => !u.isArchived && u.status === 'active').length,
    locked: users.filter(u => u.status === 'locked').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    with2FA: users.filter(u => !u.isArchived && u.twoFactorEnabled).length,
  }), [users, showArchived]);

  // ===== الفلترة والبحث =====
  const filtered = useMemo(() => {
    let result = users;
    if (!showArchived) result = result.filter(u => !u.isArchived);
    if (filterStatus !== 'all') result = result.filter(u => u.status === filterStatus);
    if (filterRole !== 'all') result = result.filter(u => u.roleIds?.includes(filterRole));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.nationalId || '').includes(q) ||
        u.jobTitle.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [users, search, filterStatus, filterRole, showArchived]);

  // ===== الإجراءات =====
  // helpers لعرض الرسائل (بسبب أن alert/confirm/prompt الأصلية لا تعمل في Electron)
  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };
  const ask = (title: string, message: string, onConfirm: () => void, danger = false) => {
    setConfirmDialog({ title, message, onConfirm, danger });
  };

  const handleLock = (u: User) => {
    if (!can('users.lock')) {
      notify('error', 'ليس لديك صلاحية لقفل/إلغاء قفل المستخدمين');
      return;
    }
    const newStatus: UserStatus = u.status === 'locked' ? 'active' : 'locked';
    updateUser({ ...u, status: newStatus });
    notify('success', `تم ${newStatus === 'locked' ? 'قفل' : 'إلغاء قفل'} المستخدم "${u.fullName}"`);
  };

  const handleSuspend = (u: User) => {
    if (!can('users.edit')) {
      notify('error', 'ليس لديك صلاحية لتعليق المستخدمين');
      return;
    }
    const newStatus: UserStatus = u.status === 'suspended' ? 'active' : 'suspended';
    updateUser({ ...u, status: newStatus });
    notify('success', `تم ${newStatus === 'suspended' ? 'تعليق' : 'إلغاء تعليق'} المستخدم`);
  };

  const handleArchive = (u: User) => {
    if (!can('users.delete')) {
      notify('error', 'ليس لديك صلاحية لأرشفة المستخدمين');
      return;
    }
    const willArchive = !u.isArchived;
    ask(
      willArchive ? 'أرشفة المستخدم' : 'استعادة المستخدم',
      `هل تريد ${willArchive ? 'أرشفة' : 'استعادة'} المستخدم "${u.fullName}"؟`,
      () => {
        updateUser({ ...u, isArchived: willArchive, archivedAt: willArchive ? new Date().toISOString() : undefined });
        notify('success', `تم ${willArchive ? 'أرشفة' : 'استعادة'} المستخدم بنجاح`);
      },
    );
  };

  const handleDelete = (u: User) => {
    if (!can('users.delete')) {
      notify('error', 'ليس لديك صلاحية لحذف المستخدمين');
      return;
    }
    if (u.id === currentUser?.id) {
      notify('error', 'لا يمكنك حذف حسابك الخاص');
      return;
    }
    ask(
      '⚠️ حذف نهائي',
      `هل تريد حذف المستخدم "${u.fullName}" نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه.`,
      () => {
        deleteUser(u.id);
        notify('success', `تم حذف المستخدم "${u.fullName}"`);
      },
      true,
    );
  };

  const handleResetPassword = (u: User) => {
    if (!can('users.edit')) {
      setToast({ type: 'error', message: 'ليس لديك صلاحية لإعادة تعيين كلمات المرور' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setResetPwdDialog({ user: u, newPassword: 'Temp123!', mustChange: true });
  };

  const performResetPassword = async () => {
    if (!resetPwdDialog) return;
    const { user, newPassword, mustChange } = resetPwdDialog;
    if (!newPassword || newPassword.length < 6) {
      setToast({ type: 'error', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    try {
      const hashed = await hashPassword(newPassword);
      updateUser({
        ...user,
        passwordHash: hashed,
        passwordHistory: [hashed, ...(user.passwordHistory || []).slice(0, 4)],
        passwordLastChangedAt: new Date().toISOString(),
        mustChangePassword: mustChange,
      });
      setResetPwdDialog(null);
      setToast({ type: 'success', message: `تم تغيير كلمة مرور "${user.fullName}". ${mustChange ? 'سيُطلب منه تغييرها عند أول دخول.' : ''}` });
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      console.error('reset password error', e);
      setToast({ type: 'error', message: 'فشل تغيير كلمة المرور' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleToggle2FA = async (u: User) => {
    if (!can('users.edit')) {
      notify('error', 'ليس لديك صلاحية لإدارة 2FA');
      return;
    }
    if (u.twoFactorEnabled) {
      ask(
        'تعطيل 2FA',
        `هل تريد تعطيل المصادقة الثنائية للمستخدم "${u.fullName}"؟`,
        () => {
          updateUser({ ...u, twoFactorEnabled: false, twoFactorSecret: undefined, twoFactorBackupCodes: undefined });
          notify('success', 'تم تعطيل 2FA');
        },
        true,
      );
    } else {
      const secret = generateTotpSecret();
      const backupCodes = Array.from({ length: 8 }, () =>
        Math.floor(100000 + Math.random() * 900000).toString()
      );
      setShow2FADialog({ user: u, secret, backupCodes });
    }
  };

  const confirmEnable2FA = async () => {
    if (!show2FADialog) return;
    await hashPassword(JSON.stringify({ secret: show2FADialog.secret }));
    updateUser({
      ...show2FADialog.user,
      twoFactorEnabled: true,
      twoFactorSecret: show2FADialog.secret,
      twoFactorBackupCodes: show2FADialog.backupCodes,
    });
    setShow2FADialog(null);
    notify('success', 'تم تفعيل 2FA بنجاح');
  };

  const handleCopyUser = (u: User) => {
    const copy: User = {
      ...u,
      id: generateId('user'),
      username: u.username + '_copy_' + Date.now().toString(36).slice(-4),
      fullName: u.fullName + ' (نسخة)',
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: undefined,
      twoFactorEnabled: false,
    };
    addUser(copy);
  };

  const handleExport = () => {
    const csv = [
      ['اسم المستخدم', 'الاسم الكامل', 'البريد', 'الهاتف', 'الوظيفة', 'الدرجة', 'القسم', 'الحالة', '2FA'],
      ...filtered.map(u => [
        u.username, u.fullName, u.email || '', u.phone || '',
        u.jobTitle, GRADE_LABELS[u.grade], u.department || '',
        STATUS_LABELS[u.status].label, u.twoFactorEnabled ? 'نعم' : 'لا'
      ])
    ].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* الرأس */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white rounded-3xl p-5 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 bg-white/10 w-72 h-72 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] px-2 py-1 rounded-full font-bold">إدارة مؤسسية</span>
              <span className="bg-emerald-500/30 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1">
                <Shield className="w-3 h-3" /> RBAC + Audit
              </span>
            </div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-white" />
              إدارة المستخدمين والصلاحيات
            </h1>
            <p className="text-[11px] text-white/80 max-w-2xl">
              نظام متكامل لإدارة المستخدمين والأدوار والمجموعات والصلاحيات مع تتبع كامل للعمليات.
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-[10px]">
            <div className="bg-white/15 backdrop-blur rounded-xl p-2">
              <div className="text-base font-black text-white">{stats.total}</div>
              <div className="text-white/80">إجمالي</div>
            </div>
            <div className="bg-emerald-500/30 backdrop-blur rounded-xl p-2">
              <div className="text-base font-black text-white">{stats.active}</div>
              <div className="text-white/80">نشط</div>
            </div>
            <div className="bg-rose-500/30 backdrop-blur rounded-xl p-2">
              <div className="text-base font-black text-white">{stats.locked}</div>
              <div className="text-white/80">مقفل</div>
            </div>
            <div className="bg-indigo-500/30 backdrop-blur rounded-xl p-2">
              <div className="text-base font-black text-white">{stats.suspended}</div>
              <div className="text-white/80">موقوف</div>
            </div>
            <div className="bg-blue-500/30 backdrop-blur rounded-xl p-2">
              <div className="text-base font-black text-white">{stats.with2FA}</div>
              <div className="text-white/80">2FA</div>
            </div>
          </div>
        </div>
      </div>

      {/* شريط الأدوات */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في المستخدمين (الاسم، البريϡ الهاتݡ القسم...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pe-9 ps-3 py-2 text-xs outline-none focus:border-indigo-400"
            />
          </div>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="all">كل الأدوار</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
              showArchived ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            <Archive className="w-3 h-3 inline ms-1" />
            {showArchived ? 'إخفاء المؤرشف' : 'إظهار المؤرشف'}
          </button>

          <button onClick={handleExport} className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg" title="تصدير CSV">
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsCreating(true)}
            disabled={!can('users.add')}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> إضافة مستخدم
          </button>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-600">
                <th className="px-4 py-3 text-end font-bold">المستخدم</th>
                <th className="px-4 py-3 text-end font-bold">الاتصال</th>
                <th className="px-4 py-3 text-end font-bold">الوظيفة</th>
                <th className="px-4 py-3 text-end font-bold">الأدوار</th>
                <th className="px-4 py-3 text-end font-bold">الحالة</th>
                <th className="px-4 py-3 text-end font-bold">2FA</th>
                <th className="px-4 py-3 text-end font-bold">آخر دخول</th>
                <th className="px-4 py-3 text-center font-bold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u => {
                const userRoles = roles.filter(r => u.roleIds?.includes(r.id));
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                          {u.fullName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 text-[11px]">
                        {u.email && <div className="flex items-center gap-1 text-slate-700"><Mail className="w-3 h-3 text-slate-400" /> {u.email}</div>}
                        {u.phone && <div className="flex items-center gap-1 text-slate-700 font-mono"><Phone className="w-3 h-3 text-slate-400" /> {u.phone}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{u.jobTitle}</p>
                      <p className="text-[10px] text-slate-500">{GRADE_LABELS[u.grade] || u.grade} • {u.department || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {userRoles.slice(0, 2).map(r => (
                          <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                            {r.name}
                          </span>
                        ))}
                        {userRoles.length > 2 && <span className="text-[10px] text-slate-500">+{userRoles.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${(STATUS_LABELS[u.status] || STATUS_LABELS.inactive).color}`}>
                        {(STATUS_LABELS[u.status] || STATUS_LABELS.inactive).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.twoFactorEnabled ? <Shield className="w-4 h-4 text-emerald-500 inline" /> : <ShieldOff className="w-4 h-4 text-slate-300 inline" />}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-600">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ar-EG') : 'لم يسجل دخول'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => setViewingUser(u)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="عرض">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingUser(u)} disabled={!can('users.edit')} className="p-1.5 hover:bg-indigo-50 rounded text-indigo-600 disabled:opacity-30" title="تعديل">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggle2FA(u)} disabled={!can('users.edit')} className="p-1.5 hover:bg-purple-50 rounded text-purple-600 disabled:opacity-30" title="2FA">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleResetPassword(u)} disabled={!can('users.edit')} className="p-1.5 hover:bg-indigo-50 rounded text-indigo-600 disabled:opacity-30" title="إعادة تعيين كلمة المرور">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleLock(u)} disabled={!can('users.lock')} className="p-1.5 hover:bg-rose-50 rounded text-rose-600 disabled:opacity-30" title={u.status === 'locked' ? 'إلغاء القفل' : 'قفل'}>
                          {u.status === 'locked' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleCopyUser(u)} disabled={!can('users.add')} className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600 disabled:opacity-30" title="نسخ">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleArchive(u)} disabled={!can('users.delete')} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30" title={u.isArchived ? 'استعادة' : 'أرشفة'}>
                          {u.isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleDelete(u)} disabled={!can('users.delete')} className="p-1.5 hover:bg-rose-100 rounded text-rose-700 disabled:opacity-30" title="حذف">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-500">لا يوجد مستخدمون يطابقون البحث</p>
          </div>
        )}
      </div>

      {/* مودال التعديل / الإنشاء */}
      {(editingUser || isCreating) && (
        <UserFormModal
          user={editingUser}
          roles={roles}
          groups={groups}
          currentUserId={currentUser?.id || ''}
          onClose={() => { setEditingUser(null); setIsCreating(false); }}
          onSave={(user) => {
            if (editingUser) updateUser(user);
            else addUser(user);
            setEditingUser(null); setIsCreating(false);
          }}
        />
      )}

      {/* مودال عرض التفاصيل */}
      {viewingUser && (
        <UserDetailsModal user={viewingUser} roles={roles} groups={groups} onClose={() => setViewingUser(null)} />
      )}

      {/* مودال إعادة تعيين كلمة المرور */}
      {resetPwdDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setResetPwdDialog(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-500" />
                إعادة تعيين كلمة المرور
              </h3>
              <button onClick={() => setResetPwdDialog(null)} className="p-1.5 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 mb-3 text-[11px] text-indigo-900">
              المستخدم: <span className="font-bold">@{resetPwdDialog.user.username}</span> — {resetPwdDialog.user.fullName}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">كلمة المرور الجديدة</label>
                <input
                  type="text"
                  value={resetPwdDialog.newPassword}
                  onChange={e => setResetPwdDialog({ ...resetPwdDialog, newPassword: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono"
                  dir="ltr"
                  autoFocus
                />
                <p className="text-[10px] text-slate-500 mt-1">6 أحرف على الأقل</p>
              </div>
              <label className="flex items-center gap-2 text-[11px] cursor-pointer p-2 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={resetPwdDialog.mustChange}
                  onChange={e => setResetPwdDialog({ ...resetPwdDialog, mustChange: e.target.checked })}
                />
                <span>إلزام المستخدم بتغييرها عند أول دخول</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setResetPwdDialog(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  onClick={performResetPassword}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl"
                >
                  تغيير كلمة المرور
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-[slideIn_0.3s_ease-out] ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' :
          toast.type === 'error' ? 'bg-rose-500 text-white' :
          'bg-slate-700 text-white'
        }`}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          {toast.message}
        </div>
      )}

      {/* مودال التأكيد العام */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[55] bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDialog(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className={`text-base font-black mb-2 ${confirmDialog.danger ? 'text-rose-700' : 'text-slate-900'}`}>
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-slate-600 mb-5 whitespace-pre-line leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className={`flex-1 text-white text-xs font-bold py-2.5 rounded-xl ${
                  confirmDialog.danger
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال تفعيل 2FA */}
      {show2FADialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShow2FADialog(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                تفعيل المصادقة الثنائية (2FA)
              </h3>
              <button onClick={() => setShow2FADialog(null)} className="p-1.5 hover:bg-slate-100 rounded">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-600 mb-2">1. افتح تطبيق <strong>Google Authenticator</strong> أو <strong>Microsoft Authenticator</strong></p>
                <p className="text-xs text-slate-600 mb-2">2. امسح QR أو أضف المفتاح التالي يدوياً:</p>
                <div className="bg-slate-100 rounded-lg p-3 font-mono text-xs break-all select-all">
                  {show2FADialog.secret}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-600 mb-2 font-bold">رموز الاسترداد (احتفظ بها في مكان آمن):</p>
                <div className="grid grid-cols-2 gap-2">
                  {show2FADialog.backupCodes.map((c, i) => (
                    <div key={i} className="bg-indigo-50 border border-indigo-200 rounded px-2 py-1 text-center font-mono text-xs">
                      {c}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-[11px] text-indigo-800">
                ⚠️ احفظ الرموز في مكان آمن. لن تستطيع استرداد الحساب بدونها.
              </div>

              <button
                onClick={confirmEnable2FA}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl"
              >
                <Check className="w-4 h-4 inline ms-1" /> تأكيد التفعيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ===== User Form Modal =====
interface UserFormModalProps {
  user: User | null;
  roles: any[];
  groups: any[];
  currentUserId: string;
  onClose: () => void;
  onSave: (user: User) => void;
}

function UserFormModal({ user, roles, groups, currentUserId, onClose, onSave }: UserFormModalProps) {
  const [form, setForm] = useState<Partial<User>>(user || {
    username: '', fullName: '', email: '', phone: '',
    jobTitle: '', grade: 'junior', department: '',
    status: 'active', roleIds: [], groupIds: [],
    extraPermissions: [], deniedPermissions: [],
    mustChangePassword: true,
    twoFactorEnabled: false,
  });
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = async () => {
    setFormError(null);
    if (!form.username?.trim() || !form.fullName?.trim()) {
      setFormError('الرجاء إدخال اسم المستخدم والاسم الكامل');
      return;
    }
    const isNew = !user;
    if (isNew) {
      if (!password || password.length < 8) {
        setFormError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        return;
      }
      if (password !== confirmPwd) {
        setFormError('كلمتا المرور غير متطابقتين');
        return;
      }
    }

    let finalUser: User;
    if (isNew) {
      const passwordHash = await hashPassword(password);
      finalUser = {
        id: generateId('user'),
        username: form.username!,
        passwordHash,
        mustChangePassword: true,
        twoFactorEnabled: false,
        fullName: form.fullName!,
        email: form.email,
        phone: form.phone,
        altPhone: form.altPhone,
        nationalId: form.nationalId,
        jobTitle: form.jobTitle || '',
        grade: (form.grade || 'junior') as UserGrade,
        department: form.department,
        branch: form.branch,
        status: (form.status || 'active') as UserStatus,
        failedLoginAttempts: 0,
        roleIds: form.roleIds || [],
        groupIds: form.groupIds || [],
        extraPermissions: form.extraPermissions || [],
        deniedPermissions: form.deniedPermissions || [],
        passwordHistory: [passwordHash],
        passwordLastChangedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'manual',
      };
    } else {
      finalUser = { ...user!, ...form, updatedAt: new Date().toISOString() } as User;
    }
    onSave(finalUser);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-900">{user ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
        </div>

        {formError && (
          <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold rounded-lg p-2.5 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">اسم المستخدم *</label>
            <input value={form.username || ''} onChange={e => setForm({...form, username: e.target.value.toLowerCase().replace(/\s/g, '_')})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white" dir="ltr" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الاسم الكامل *</label>
            <input value={form.fullName || ''} onChange={e => setForm({...form, fullName: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" />
          </div>

          {!user && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">كلمة المرور *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" dir="ltr" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">تأكيد كلمة المرور *</label>
                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" dir="ltr" />
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">البريد الإلكتروني</label>
            <input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" dir="ltr" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الهاتف</label>
            <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono" dir="ltr" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الوظيفة</label>
            <input value={form.jobTitle || ''} onChange={e => setForm({...form, jobTitle: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الدرجة الوظيفية</label>
            <select value={form.grade || 'junior'} onChange={e => setForm({...form, grade: e.target.value as UserGrade})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white">
              {Object.entries(GRADE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">القسم</label>
            <input value={form.department || ''} onChange={e => setForm({...form, department: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الحالة</label>
            <select value={form.status || 'active'} onChange={e => setForm({...form, status: e.target.value as UserStatus})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white">
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الأدوار</label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-lg max-h-32 overflow-y-auto bg-slate-50">
              {roles.map(r => (
                <label key={r.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] cursor-pointer transition ${
                  form.roleIds?.includes(r.id) ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' : 'bg-white border border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={form.roleIds?.includes(r.id) || false}
                    onChange={e => {
                      const newIds = e.target.checked
                        ? [...(form.roleIds || []), r.id]
                        : (form.roleIds || []).filter(x => x !== r.id);
                      setForm({...form, roleIds: newIds});
                    }}
                    className="rounded"
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">المجموعات الأمنية</label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-lg max-h-32 overflow-y-auto bg-slate-50">
              {groups.map(g => (
                <label key={g.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] cursor-pointer transition ${
                  form.groupIds?.includes(g.id) ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-white border border-slate-200 text-slate-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={form.groupIds?.includes(g.id) || false}
                    onChange={e => {
                      const newIds = e.target.checked
                        ? [...(form.groupIds || []), g.id]
                        : (form.groupIds || []).filter(x => x !== g.id);
                      setForm({...form, groupIds: newIds});
                    }}
                    className="rounded"
                  />
                  {g.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl">
            إلغاء
          </button>
          <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl">
            {user ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== User Details Modal =====
function UserDetailsModal({ user, roles, groups, onClose }: { user: User; roles: any[]; groups: any[]; onClose: () => void }) {
  const userRoles = roles.filter(r => user.roleIds?.includes(r.id));
  const userGroups = groups.filter(g => user.groupIds.includes(g.id));
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {user.fullName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{user.fullName}</h3>
              <p className="text-xs text-slate-500">@{user.username} • {GRADE_LABELS[user.grade] || user.grade}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <DetailRow label="الحالة" value={
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(STATUS_LABELS[user.status] || STATUS_LABELS.inactive).color}`}>
                {(STATUS_LABELS[user.status] || STATUS_LABELS.inactive).label}
              </span>
            } />
            <DetailRow label="البريد" value={user.email || '-'} />
            <DetailRow label="الهاتف" value={user.phone || '-'} />
            <DetailRow label="الرقم القومي" value={user.nationalId || '-'} />
            <DetailRow label="الوظيفة" value={user.jobTitle} />
            <DetailRow label="القسم" value={user.department || '-'} />
            <DetailRow label="الفرع" value={user.branch || '-'} />
            <DetailRow label="2FA" value={user.twoFactorEnabled ? 'مفعل ✅' : 'غير مفعل ❌'} />
          </div>

          <div>
            <p className="font-bold text-slate-700 mb-1.5">الأدوار ({userRoles.length})</p>
            <div className="flex flex-wrap gap-1">
              {userRoles.length > 0 ? userRoles.map(r => (
                <span key={r.id} className="text-[10px] px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-bold">{r.name}</span>
              )) : <span className="text-slate-400">لا توجد أدوار</span>}
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-700 mb-1.5">المجموعات ({userGroups.length})</p>
            <div className="flex flex-wrap gap-1">
              {userGroups.length > 0 ? userGroups.map(g => (
                <span key={g.id} className="text-[10px] px-2 py-1 rounded bg-purple-50 text-purple-700 font-bold">{g.name}</span>
              )) : <span className="text-slate-400">لا توجد مجموعات</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <DetailRow label="تاريخ الإنشاء" value={new Date(user.createdAt).toLocaleString('ar-EG')} />
            <DetailRow label="آخر دخول" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ar-EG') : 'لم يسجل'} />
            <DetailRow label="محاولات فاشلة" value={user.failedLoginAttempts.toString()} />
            <DetailRow label="آخر جهاز" value={user.lastLoginDevice || '-'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <div className="text-slate-800 font-bold">{value}</div>
    </div>
  );
}

export default UsersManagement;
