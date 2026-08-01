/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdminPanel — لوحة تحكم المدير
 * متاحة فقط للمدير: ahmdmansoor2@gmail.com
 * UID: IlX9UsOjr3cJMH09crj2JTHhRmh1
 */

import React, { useEffect, useState } from 'react';
import { getFirebase } from '../firebaseClient';
import {
  Shield, Users, CheckCircle, XCircle, Clock,
  RefreshCw, ChevronDown, ChevronUp, Search,
  AlertTriangle, TrendingUp, CreditCard, Phone
} from 'lucide-react';

// ── المدير الوحيد المسموح له ──────────────────────────────────────────────
export const ADMIN_UID = 'IlX9UsOjr3cJMH09crj2JTHhRmh1';
export const ADMIN_EMAIL = 'ahmdmansoor2@gmail.com';

interface UserRecord {
  uid: string;
  email?: string;
  displayName?: string;
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'none';
  trialEnd?: Timestamp;
  subscriptionEnd?: Timestamp;
  createdAt?: Timestamp;
  activatedAt?: Timestamp;
  activatedBy?: string;
  notes?: string;
}

interface AdminPanelProps {
  adminUid: string;
}

export default function AdminPanel({ adminUid }: AdminPanelProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [filter, setFilter] = useState<'all' | 'trial' | 'active' | 'expired'>('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const f = await getFirebase();
      if (f.disabled) {
        // Firebase disabled in portable build — show empty list
        setUsers([]);
        setLoading(false);
        return;
      }
      const { collection, getDocs, doc: docFn } = await import('firebase/firestore');
      // قراءة كل وثائق subscriptions من Firestore
      const subSnap = await getDocs(collection(f.db, 'subscriptions'));
      const records: UserRecord[] = [];

      subSnap.forEach((docSnap: any) => {
        const data = docSnap.data();
        records.push({
          uid: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || data.name || '',
          subscriptionStatus: data.status || 'none',
          trialEnd: data.trialEnd,
          subscriptionEnd: data.subscriptionEnd,
          createdAt: data.createdAt,
          activatedAt: data.activatedAt,
          activatedBy: data.activatedBy,
          notes: data.notes || '',
        });
      });

      // ترتيب تنازلي حسب تاريخ الإنشاء
      records.sort((a, b) => {
        const aT = a.createdAt?.toMillis?.() ?? 0;
        const bT = b.createdAt?.toMillis?.() ?? 0;
        return bT - aT;
      });

      setUsers(records);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ── تفعيل اشتراك مستخدم ─────────────────────────────────────────────────
  const activateSubscription = async (uid: string, months = 1) => {
    setActionLoading(uid + '_activate');
    try {
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const { doc: docFn, setDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');

      const end = new Date();
      end.setMonth(end.getMonth() + months);

      await setDoc(docFn(f.db, 'subscriptions', uid), {
        status: 'active',
        subscriptionEnd: Timestamp.fromDate(end),
        activatedAt: serverTimestamp(),
        activatedBy: adminUid,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setStatusMsg(`✅ تم تفعيل اشتراك المستخدم لمدة ${months} شهر/أشهر`);
      await fetchUsers();
    } catch (err) {
      setStatusMsg('❌ خطأ في التفعيل: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  // ── إيقاف اشتراك مستخدم ─────────────────────────────────────────────────
  const deactivateSubscription = async (uid: string) => {
    setActionLoading(uid + '_deactivate');
    try {
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const { doc: docFn, updateDoc, serverTimestamp } = await import('firebase/firestore');

      await updateDoc(docFn(f.db, 'subscriptions', uid), {
        status: 'expired',
        updatedAt: serverTimestamp(),
        deactivatedBy: adminUid,
        deactivatedAt: serverTimestamp(),
      });

      setStatusMsg('⛔ تم إيقاف الاشتراك');
      await fetchUsers();
    } catch (err) {
      setStatusMsg('❌ خطأ: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  // ── تمديد التجربة المجانية ───────────────────────────────────────────────
  const extendTrial = async (uid: string, days = 7) => {
    setActionLoading(uid + '_trial');
    try {
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const { doc: docFn, updateDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');

      const end = new Date();
      end.setDate(end.getDate() + days);

      await updateDoc(docFn(f.db, 'subscriptions', uid), {
        status: 'trial',
        trialEnd: Timestamp.fromDate(end),
        updatedAt: serverTimestamp(),
        extendedBy: adminUid,
      });

      setStatusMsg(`⏳ تم تمديد التجربة ${days} أيام`);
      await fetchUsers();
    } catch (err) {
      setStatusMsg('❌ خطأ: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  // ── إضافة ملاحظة ─────────────────────────────────────────────────────────
  const saveNote = async (uid: string, note: string) => {
    try {
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const { doc: docFn, updateDoc, serverTimestamp } = await import('firebase/firestore');

      await updateDoc(docFn(f.db, 'subscriptions', uid), {
        notes: note,
        updatedAt: serverTimestamp(),
      });
      setStatusMsg('📝 تم حفظ الملاحظة');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // ── حسابات إحصائية ───────────────────────────────────────────────────────
  const stats = {
    total: users.length,
    active: users.filter(u => u.subscriptionStatus === 'active').length,
    trial: users.filter(u => u.subscriptionStatus === 'trial').length,
    expired: users.filter(u => u.subscriptionStatus === 'expired').length,
  };

  // ── فلترة وبحث ───────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const matchSearch =
      !searchTerm ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.uid.includes(searchTerm);
    const matchFilter = filter === 'all' || u.subscriptionStatus === filter;
    return matchSearch && matchFilter;
  });

  const statusColor = (s?: string) => {
    switch (s) {
      case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30';
      case 'trial': return 'text-sky-400 bg-sky-400/10 border-sky-500/30';
      case 'expired': return 'text-red-400 bg-red-400/10 border-red-500/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-500/30';
    }
  };

  const statusLabel = (s?: string) => {
    switch (s) {
      case 'active': return '✅ مفعّل';
      case 'trial': return '⏳ تجربة';
      case 'expired': return '⛔ منتهي';
      default: return '— غير محدد';
    }
  };

  const formatDate = (t?: Timestamp) => {
    if (!t) return '—';
    return t.toDate().toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8" dir="rtl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
          <Shield className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة تحكم المدير</h1>
          <p className="text-slate-400 text-sm">منصة المحامي الرقمية — الوصول الكامل</p>
        </div>
        <button
          onClick={fetchUsers}
          className="mr-auto flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* ── Status message ───────────────────────────────────────────────────── */}
      {statusMsg && (
        <div className="mb-4 px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-sm text-center font-medium animate-pulse">
          {statusMsg}
        </div>
      )}

      {/* ── Stats cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'إجمالي المستخدمين', value: stats.total, icon: Users, color: 'text-slate-300', bg: 'bg-slate-800' },
          { label: 'اشتراكات مفعّلة', value: stats.active, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-950/50' },
          { label: 'فترة تجربة', value: stats.trial, icon: Clock, color: 'text-sky-400', bg: 'bg-sky-950/50' },
          { label: 'اشتراكات منتهية', value: stats.expired, icon: XCircle, color: 'text-red-400', bg: 'bg-red-950/50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-slate-800`}>
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-slate-400 text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter + Search ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد أو الـ UID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all','active','trial','expired'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                filter === f
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {f === 'all' ? 'الكل' : statusLabel(f)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Users list ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
          جارٍ تحميل بيانات المستخدمين...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>لا يوجد مستخدمون {filter !== 'all' ? 'بهذا الفلتر' : 'حتى الآن'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map(user => (
            <div
              key={user.uid}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors"
            >
              {/* ── Row ── */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedUser(expandedUser === user.uid ? null : user.uid)}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {user.displayName || 'بدون اسم'}
                  </div>
                  <div className="text-slate-400 text-xs truncate">{user.email || 'بدون بريد'}</div>
                </div>

                {/* Status badge */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${statusColor(user.subscriptionStatus)}`}>
                  {statusLabel(user.subscriptionStatus)}
                </span>

                {/* Dates */}
                <div className="hidden md:block text-right text-xs text-slate-500 flex-shrink-0">
                  <div>انتهاء: {formatDate(user.subscriptionEnd || user.trialEnd)}</div>
                  <div>تسجيل: {formatDate(user.createdAt)}</div>
                </div>

                {/* Expand icon */}
                {expandedUser === user.uid
                  ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                }
              </div>

              {/* ── Expanded actions ── */}
              {expandedUser === user.uid && (
                <div className="border-t border-slate-800 p-4 bg-slate-950/50">
                  <div className="grid md:grid-cols-2 gap-4">

                    {/* Left: Actions */}
                    <div>
                      <p className="text-xs text-slate-500 mb-3 font-medium">إجراءات الاشتراك</p>
                      <div className="space-y-2">

                        {/* Activate 1 month */}
                        <button
                          onClick={() => activateSubscription(user.uid, 1)}
                          disabled={actionLoading !== null}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
                        >
                          {actionLoading === user.uid + '_activate'
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : <CheckCircle className="w-4 h-4" />
                          }
                          تفعيل اشتراك شهر (50 ج)
                        </button>

                        {/* Activate 3 months */}
                        <button
                          onClick={() => activateSubscription(user.uid, 3)}
                          disabled={actionLoading !== null}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          تفعيل 3 أشهر (130 ج)
                        </button>

                        {/* Extend trial */}
                        <button
                          onClick={() => extendTrial(user.uid, 7)}
                          disabled={actionLoading !== null}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-sky-800 hover:bg-sky-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
                        >
                          <Clock className="w-4 h-4" />
                          تمديد التجربة 7 أيام
                        </button>

                        {/* Deactivate */}
                        {user.subscriptionStatus === 'active' && (
                          <button
                            onClick={() => deactivateSubscription(user.uid)}
                            disabled={actionLoading !== null}
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-900/50 hover:bg-red-800/50 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors border border-red-800/50"
                          >
                            <XCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-300">إيقاف الاشتراك</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right: Details + Notes */}
                    <div>
                      <p className="text-xs text-slate-500 mb-3 font-medium">التفاصيل</p>
                      <div className="bg-slate-900 rounded-xl p-3 text-xs space-y-1.5 mb-3 font-mono border border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-500">UID:</span>
                          <span className="text-slate-300 truncate max-w-[140px]">{user.uid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">تاريخ التسجيل:</span>
                          <span className="text-slate-300">{formatDate(user.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">انتهاء التجربة:</span>
                          <span className="text-slate-300">{formatDate(user.trialEnd)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">انتهاء الاشتراك:</span>
                          <span className="text-slate-300">{formatDate(user.subscriptionEnd)}</span>
                        </div>
                        {user.activatedAt && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">آخر تفعيل:</span>
                            <span className="text-emerald-400">{formatDate(user.activatedAt)}</span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <p className="text-xs text-slate-500 mb-1 font-medium">ملاحظات</p>
                      <NoteEditor
                        initialNote={user.notes || ''}
                        onSave={(note) => saveNote(user.uid, note)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── مكوّن الملاحظات ────────────────────────────────────────────────────────
function NoteEditor({ initialNote, onSave }: { initialNote: string; onSave: (n: string) => void }) {
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(note);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="مثال: دفع بفودافون كاش، إيصال رقم 12345..."
        rows={2}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs resize-none focus:outline-none focus:border-emerald-500 transition-colors"
      />
      <button
        onClick={handleSave}
        className="mt-1 w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition-colors"
      >
        {saved ? '✅ تم الحفظ' : '💾 حفظ الملاحظة'}
      </button>
    </div>
  );
}
