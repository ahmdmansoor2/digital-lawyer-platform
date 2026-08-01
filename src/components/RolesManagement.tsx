/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * وحدة إدارة الأدوار + مصفوفة الصلاحيات (Roles + Permissions Matrix)
 *
 * - CRUD كامل للأدوار
 * - مصفوفة Role × Permission (Material-Design-like matrix)
 * - ربط الصلاحيات بالأدوار ديناميكياً
 * - تصفية بحسب الفئة (cases, financials, etc.)
 */

import React, { useState, useMemo } from 'react';
import {
  Shield, Plus, Edit, Trash2, Save, X, Check, Square, CheckSquare,
  Search, Lock, Layers, Copy, Download, ChevronDown, ChevronRight,
  AlertCircle, Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Role, Permission, DataScope } from '../types_auth';
import { generateId } from '../utils/security';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';

const SCOPE_LABELS: Record<DataScope, string> = {
  all: 'كل البيانات',
  branch: 'بيانات الفرع',
  department: 'بيانات القسم',
  own: 'البيانات الشخصية فقط',
  assigned: 'المسندة إليه',
  subordinates: 'التابعون له',
};

const CATEGORY_LABELS: Record<string, string> = {
  cases: 'القضايا', clients: 'العملاء', opponents: 'الخصوم',
  notes: 'الملاحظات', library: 'المكتبة', documents: 'المستندات',
  financials: 'المالية', templates: 'القوالب', contracts: 'العقود',
  calendar: 'التقويم', tasks: 'المهام', bailiff: 'المحضرين',
  reports: 'التقارير', users: 'المستخدمون', roles: 'الأدوار',
  permissions: 'الصلاحيات', groups: 'المجموعات', audit: 'سجل العمليات',
  login_history: 'سجل الدخول', settings: 'الإعدادات', database: 'قاعدة البيانات',
  archive: 'الأرشيف',
};

const RolesManagement = React.memo(function RolesManagement() {
  const confirm = useConfirm();
  const auth = useAuth();
  const { roles, permissions, addRole, updateRole, deleteRole, can, users, updateUser } = auth;

  const [view, setView] = useState<'list' | 'matrix'>('list');
  const [search, setSearch] = useState('');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [matrixRoleId, setMatrixRoleId] = useState<string | null>(null);

  // ===== الأدوار المفلترة =====
  const filtered = useMemo(() => {
    let result = roles;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => a.priority - b.priority);
  }, [roles, search]);

  const handleSave = (role: Role) => {
    if (roles.find(r => r.id === role.id)) updateRole(role);
    else addRole(role);
    setEditingRole(null);
    setIsCreating(false);
  };

  const handleDelete = async (role: Role) => {
    const usedBy = users.filter(u => u.roleIds?.includes(role.id)).length;
    if (usedBy > 0) {
      const proceed = await confirm(
        `⚠️ الدور "${role.name}" مرتبط بـ ${usedBy} مستخدم.\n\n` +
        `حذفه سيُلغي هذا الدور من جميع المستخدمين المرتبطين به.\n\n` +
        `هل تريد المتابعة؟`
      );
      if (!proceed) return;
      // إزالة الدور من المستخدمين المرتبطين
      users.forEach(u => {
        if (u.roleIds?.includes(role.id)) {
          auth.updateUser({ ...u, roleIds: (u.roleIds || []).filter(rid => rid !== role.id) });
        }
      });
    } else {
      if (!await confirm(`هل تريد حذف الدور "${role.name}"؟`)) return;
    }
    deleteRole(role.id);
  };

  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* الرأس */}
      <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white rounded-3xl p-5 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 bg-white/10 w-72 h-72 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              إدارة الأدوار والصلاحيات
            </h1>
            <p className="text-[11px] text-white/80">
              {roles.length} دور • {permissions.length} صلاحية • نظام RBAC ديناميكي
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView(view === 'list' ? 'matrix' : 'list')}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur text-white text-xs font-bold rounded-lg">
              {view === 'list' ? '🎯 مصفوفة الصلاحيات' : '📋 قائمة الأدوار'}
            </button>
            <button onClick={() => setIsCreating(true)} disabled={!can('roles.add')}
              className="bg-white text-indigo-600 hover:bg-white/90 disabled:bg-slate-300 disabled:text-slate-500 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Plus className="w-3 h-3" /> إضافة دور
            </button>
          </div>
        </div>
      </div>

      {/* شريط البحث */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث في الأدوار..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pe-9 ps-3 py-2 text-xs outline-none focus:border-indigo-400" />
          </div>
        </div>
      )}

      {/* العرض */}
      {view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(role => {
            const usersCount = users.filter(u => u.roleIds?.includes(role.id)).length;
            return (
              <div key={role.id} className={`bg-white rounded-2xl border ${role.isSystem ? 'border-indigo-200' : 'border-slate-200'} shadow-sm p-4 hover:shadow-md transition relative overflow-hidden`}>
                {role.isSystem && (
                  <span className="absolute top-2 left-2 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> نظامي
                  </span>
                )}
                <div className="flex items-start gap-2 mb-3">
                  <div className={`p-2 rounded-xl ${role.isSystem ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm">{role.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono">{role.code}</p>
                  </div>
                </div>
                {role.description && <p className="text-[11px] text-slate-600 mb-3">{role.description}</p>}
                <div className="space-y-1 text-[10px] mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الصلاحيات</span>
                    <span className="font-bold text-slate-800">{role.permissionIds.filter(p => p !== '*').length}{role.permissionIds.includes('*') ? ' (الكل)' : ''}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">نطاق البيانات</span>
                    <span className="font-bold text-slate-800">{SCOPE_LABELS[role.dataScope]}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المستخدمون</span>
                    <span className="font-bold text-slate-800">{usersCount}</span>
                  </div>
                </div>
                <div className="flex gap-1 pt-2 border-t border-slate-100">
                  <button onClick={() => setEditingRole(role)} disabled={!can('roles.edit')}
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold py-1.5 rounded-lg disabled:opacity-30">
                    <Edit className="w-3 h-3 inline ms-1" /> تعديل
                  </button>
                  <button onClick={() => setMatrixRoleId(role.id)}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold py-1.5 rounded-lg">
                    <Layers className="w-3 h-3 inline ms-1" /> مصفوفة
                  </button>
                  <button onClick={() => handleDelete(role)} disabled={!can('roles.delete')}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-lg disabled:opacity-30">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <PermissionsMatrix
          permissions={permissions}
          roles={roles}
          onSave={(role) => updateRole(role)}
        />
      )}

      {/* مودال تعديل/إنشاء دور */}
      {(editingRole || isCreating) && (
        <RoleFormModal
          role={editingRole}
          permissions={permissions}
          onClose={() => { setEditingRole(null); setIsCreating(false); }}
          onSave={handleSave}
        />
      )}

      {/* مصفوفة الصلاحيات لتعديل سريع */}
      {matrixRoleId && (
        <PermissionsMatrixModal
          role={roles.find(r => r.id === matrixRoleId)!}
          permissions={permissions}
          onClose={() => setMatrixRoleId(null)}
          onSave={(role) => { updateRole(role); setMatrixRoleId(null); }}
        />
      )}
    </div>
  );
});

// ===== مصفوفة الصلاحيات (Role × Permission) - عرض كامل =====
function PermissionsMatrix({ permissions, roles, onSave }: { permissions: Permission[]; roles: Role[]; onSave: (role: Role) => void }) {
  const categories = useMemo(() => {
    const cats: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p);
    });
    return cats;
  }, [permissions]);

  const [matrixState, setMatrixState] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    roles.forEach(r => m[r.id] = new Set(r.permissionIds.filter(p => p !== '*')));
    return m;
  });

  const togglePermission = (roleId: string, permCode: string) => {
    setMatrixState(prev => {
      const newSet = new Set(prev[roleId] || []);
      if (newSet.has(permCode)) newSet.delete(permCode);
      else newSet.add(permCode);
      return { ...prev, [roleId]: newSet };
    });
  };

  const toggleAllForRole = (roleId: string) => {
    const allPerms = permissions.map(p => p.code);
    setMatrixState(prev => {
      const hasAll = allPerms.every(p => prev[roleId]?.has(p));
      return {
        ...prev,
        [roleId]: new Set(hasAll ? [] : allPerms),
      };
    });
  };

  const saveAll = async () => {
    roles.forEach(role => {
      const newPerms = Array.from(matrixState[role.id] || new Set<string>()) as string[];
      if (role.permissionIds.includes('*') && newPerms.length < permissions.length) {
        // Stay wildcard
        onSave({ ...role, permissionIds: ['*'] });
      } else {
        onSave({ ...role, permissionIds: newPerms });
      }
    });
    await showAlert('تم حفظ كل التغييرات');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <div className="text-xs font-bold text-slate-700">
          🎯 مصفوفة الصلاحيات ({permissions.length} صلاحية × {roles.length} دور)
        </div>
        <button onClick={saveAll} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
          <Save className="w-3 h-3" /> حفظ الكل
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-end font-bold text-slate-700 sticky end-0 bg-slate-100 min-w-[200px]">الصلاحية</th>
              {roles.map(r => (
                <th key={r.id} className="px-2 py-2 text-center font-bold text-slate-700 min-w-[80px]">
                  <div className="flex flex-col items-center">
                    <span>{r.code}</span>
                    <button onClick={() => toggleAllForRole(r.id)} className="text-[9px] text-indigo-600 hover:underline mt-0.5">
                      (تحديد الكل)
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(categories).map(([cat, perms]) => (
              <>
                <tr key={`cat-${cat}`} className="bg-slate-50">
                  <td colSpan={roles.length + 1} className="px-3 py-2 font-black text-slate-700 text-[11px]">
                    📂 {CATEGORY_LABELS[cat] || cat} ({(perms as Permission[]).length})
                  </td>
                </tr>
                {(perms as Permission[]).map(p => (
                  <tr key={p.code} className="hover:bg-indigo-50/30 border-t border-slate-50">
                    <td className="px-3 py-2 sticky end-0 bg-white">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono">{p.code}</p>
                    </td>
                    {roles.map(r => {
                      const has = matrixState[r.id]?.has(p.code);
                      return (
                        <td key={r.id} className="px-2 py-2 text-center">
                          <button onClick={() => togglePermission(r.id, p.code)}
                            className={`w-5 h-5 rounded flex items-center justify-center mx-auto ${
                              has ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}>
                            {has && <Check className="w-3 h-3" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== مودال مصفوفة الصلاحيات لتعديل سريع لدور واحد =====
function PermissionsMatrixModal({ role, permissions, onClose, onSave }: {
  role: Role; permissions: Permission[]; onClose: () => void; onSave: (r: Role) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissionIds.filter(p => p !== '*')));

  const categories = useMemo(() => {
    const cats: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p);
    });
    return cats;
  }, [permissions]);

  const toggle = (code: string) => {
    const s = new Set(selected);
    if (s.has(code)) s.delete(code);
    else s.add(code);
    setSelected(s);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-900">مصفوفة صلاحيات: {role.name}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {Object.entries(categories).map(([cat, perms]) => (
            <div key={cat} className="border border-slate-200 rounded-lg p-3">
              <p className="text-[11px] font-bold text-slate-700 mb-2">📂 {CATEGORY_LABELS[cat] || cat}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {(perms as Permission[]).map(p => (
                  <label key={p.code} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-slate-50 p-1 rounded">
                    <input type="checkbox" checked={selected.has(p.code)} onChange={() => toggle(p.code)} />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-xl">
            إلغاء
          </button>
          <button onClick={() => onSave({ ...role, permissionIds: Array.from(selected) })}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-xl">
            <Save className="w-3 h-3 inline ms-1" /> حفظ الصلاحيات
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== مودال تعديل دور =====
function RoleFormModal({ role, permissions, onClose, onSave }: {
  role: Role | null; permissions: Permission[]; onClose: () => void; onSave: (r: Role) => void;
}) {
  const [form, setForm] = useState<Role>(role || {
    id: generateId('role'),
    code: '',
    name: '',
    description: '',
    permissionIds: [],
    dataScope: 'own',
    priority: 50,
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const categories = useMemo(() => {
    const cats: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p);
    });
    return cats;
  }, [permissions]);

  const toggle = (code: string) => {
    const set = new Set(form.permissionIds);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    setForm({ ...form, permissionIds: Array.from(set) });
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      await showAlert('الرمز والاسم مطلوبان');
      return;
    }
    // تجنّب تكرار الـ code عند إنشاء دور جديد
    if (!role && permissions /* sentinel: دالة تُمرر من الخارج لكن form كامل */) {
      // no-op
    }
    onSave({ ...form, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-slate-900">{role ? 'تعديل دور' : 'إضافة دور جديد'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الرمز (Code) *</label>
            <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase().replace(/\s/g, '_')})}
              placeholder="CUSTOM_ROLE"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white font-mono" dir="ltr" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الاسم *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الوصف</label>
            <input value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">نطاق البيانات</label>
            <select value={form.dataScope} onChange={e => setForm({...form, dataScope: e.target.value as DataScope})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white">
              {Object.entries(SCOPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">الأولوية (رقم أقل = أقوى)</label>
            <input type="number" value={form.priority} onChange={e => setForm({...form, priority: Number(e.target.value)})}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" dir="ltr" />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="text-[11px] font-bold text-slate-700 mb-2">الصلاحيات ({form.permissionIds.length})</p>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {Object.entries(categories).map(([cat, perms]) => (
              <div key={cat} className="bg-slate-50 rounded-lg p-2">
                <p className="text-[10px] font-bold text-slate-700 mb-1">{CATEGORY_LABELS[cat] || cat}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {(perms as Permission[]).map(p => (
                    <label key={p.code} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-white p-1 rounded">
                      <input type="checkbox" checked={form.permissionIds.includes(p.code)}
                        onChange={() => toggle(p.code)} />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl">
            إلغاء
          </button>
          <button onClick={handleSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl">
            {role ? 'حفظ' : 'إنشاء الدور'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RolesManagement;
