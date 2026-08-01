/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ProfilePage.tsx — صفحة البيانات الشخصية للمحامي (multi-tenant).
 *
 * v2.9.10: صفحة كاملة لعرض وتعديل LawyerProfile.
 * - View mode: عرض البيانات بشكل cards
 * - Edit mode: تعديل كل الحقول + حفظ في Firestore
 * - Empty state: إذا ما كانش عنده profile → نموذج إنشاء
 */

import React, { useState, useEffect } from 'react';
import {
  User, Edit3, Save, X, Mail, Phone, CreditCard, Briefcase, Award,
  MapPin, Calendar, FileText, Loader2, CheckCircle2, AlertCircle, Shield
} from 'lucide-react';
import { useProfile, EMPTY_PROFILE } from '../hooks/useProfile';
import { getFirebase } from '../firebaseClient';
import type { User as FirebaseUser } from 'firebase/auth';
import { LawyerProfile } from '../types';
import { logger } from '../utils/logger';

interface ProfilePageProps {
  uid?: string | null;
  email?: string | null;
  displayName?: string | null;
}

const SPECIALTY_OPTIONS = [
  'مدني', 'تجاري', 'عمالي', 'جنائي', 'إداري', 'أحوال شخصية',
  'ضرائب', 'تأمينات', 'ملكية فكرية', 'تحكيم', 'دستوري', 'بحري', 'جوي'
];

const SYNDICATE_OPTIONS = [
  'نقابة محامي شمال القاهرة',
  'نقابة محامي جنوب القاهرة',
  'نقابة محامي الإسكندرية',
  'نقابة محامي الجيزة',
  'نقابة محامي الشرقية',
  'نقابة محامي الدقهلية',
  'نقابة محامي أسيوط',
  'نقابة محامي المنصورة',
  'نقابة محامي السويس',
  'نقابة محامي الإسماعيلية',
  'نقابة محامي بورسعيد',
  'نقابة محامي دمياط',
  'نقابة محامي قنا',
  'نقابة محامي سوهاج',
  'نقابة محامي أسوان',
  'نقابة محامي الفيوم',
  'نقابة محامي بني سويف',
  'نقابة محامي المنيا',
  'نقابة محامي الغربية',
  'نقابة محامي كفر الشيخ',
  'نقابة محامي البحيرة',
  'نقابة محامي مطروح',
  'نقابة محامي الوادي الجديد',
  'نقابة محامي شمال سيناء',
  'نقابة محامي جنوب سيناء',
  'نقابة محامي البحر الأحمر',
];

export default function ProfilePage(props: ProfilePageProps) {
  // v2.9.10: fallback to Firebase Auth if uid prop is missing
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  useEffect(() => {
    let unsub: any = null;
    (async () => {
      try {
        const f = await getFirebase();
        if (f.disabled) return;
        const { onAuthStateChanged } = await import('firebase/auth');
        unsub = onAuthStateChanged(f.auth, (user: any) => setAuthUser(user));
      } catch (e) {
        console.warn('[ProfilePage] auth listener skipped:', e);
      }
    })();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const uid = props.uid ?? authUser?.uid ?? null;
  const email = props.email ?? authUser?.email ?? '';
  const displayName = props.displayName ?? authUser?.displayName ?? null;

  const { profile, loading, saving, error, saveProfile } = useProfile(uid);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<LawyerProfile>>({});
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── تهيئة النموذج لما يتغير profile ─────────────────────────────
  useEffect(() => {
    if (profile) {
      setFormData(profile);
    } else {
      // أول مرة — استخدم القيم الافتراضية + email/displayName من Auth
      setFormData({
        ...EMPTY_PROFILE,
        email,
        displayName: displayName || '',
      });
    }
  }, [profile, email, displayName]);

  // ── تفعيل وضع التعديل تلقائياً لو مفيش profile ─────────────────
  useEffect(() => {
    if (!loading && !profile) {
      setIsEditing(true);
    }
  }, [loading, profile]);

  // ── حفظ التعديلات ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.displayName?.trim()) {
      setSaveStatus({ type: 'error', text: 'الاسم الظاهر مطلوب' });
      return;
    }
    if (!formData.fullName?.trim()) {
      setSaveStatus({ type: 'error', text: 'الاسم الكامل مطلوب' });
      return;
    }

    const result = await saveProfile(formData);
    if (result.success) {
      setSaveStatus({ type: 'success', text: 'تم حفظ البيانات بنجاح ✓' });
      setIsEditing(false);
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus({ type: 'error', text: result.error || 'فشل الحفظ' });
    }
  };

  const handleCancel = () => {
    setFormData(profile || { ...EMPTY_PROFILE, email, displayName: displayName || '' });
    setIsEditing(false);
    setSaveStatus(null);
  };

  // ── تحديث التخصص (multi-select) ─────────────────────────────────
  const toggleSpecialty = (specialty: string) => {
    const current = formData.specialty || [];
    const updated = current.includes(specialty)
      ? current.filter(s => s !== specialty)
      : [...current, specialty];
    setFormData({ ...formData, specialty: updated });
  };

  // ── حالة التحميل ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" dir="rtl">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-sm font-bold text-slate-700">جاري تحميل البيانات الشخصية...</p>
      </div>
    );
  }

  // ── العرض ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6" dir="rtl">
      {/* ── Header ── */}
      <div className="bg-gradient-to-l from-indigo-700 to-indigo-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 bg-white/5 w-64 h-64 rounded-full blur-3xl transform -translate-x-12 -translate-y-12" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center border-2 border-white/20">
              {formData.photoURL ? (
                <img src={formData.photoURL} alt={formData.displayName} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">
                {formData.displayName || displayName || 'البيانات الشخصية'}
              </h1>
              <p className="text-xs text-indigo-200 mt-1 flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                {email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md"
              >
                <Edit3 className="h-4 w-4" />
                تعديل البيانات
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      حفظ التعديلات
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Message ── */}
      {saveStatus && (
        <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold ${
          saveStatus.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {saveStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {saveStatus.text}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center gap-2 text-xs font-bold">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* ── Empty State (أول مرة) ── */}
      {!profile && !isEditing && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <User className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-sm font-black text-amber-900 mb-1">لم تقم بإدخال بياناتك بعد</h3>
          <p className="text-xs text-amber-700 mb-4">أضف بياناتك الشخصية للبدء في استخدام المنصة</p>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition"
          >
            إضافة البيانات الآن
          </button>
        </div>
      )}

      {/* ── البيانات الأساسية ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-indigo-600" />
          البيانات الأساسية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="الاسم الظاهر"
            value={formData.displayName}
            onChange={(v) => setFormData({ ...formData, displayName: v })}
            isEditing={isEditing}
            icon={<User className="h-3.5 w-3.5" />}
            required
          />
          <FormField
            label="الاسم الكامل (رباعي)"
            value={formData.fullName}
            onChange={(v) => setFormData({ ...formData, fullName: v })}
            isEditing={isEditing}
            icon={<FileText className="h-3.5 w-3.5" />}
            required
          />
          <ReadOnlyField
            label="البريد الإلكتروني"
            value={email}
            icon={<Mail className="h-3.5 w-3.5" />}
          />
          <FormField
            label="رقم التليفون"
            value={formData.phone}
            onChange={(v) => setFormData({ ...formData, phone: v })}
            isEditing={isEditing}
            icon={<Phone className="h-3.5 w-3.5" />}
            type="tel"
            placeholder="01xxxxxxxxx"
          />
          <FormField
            label="الرقم القومي"
            value={formData.nationalId}
            onChange={(v) => setFormData({ ...formData, nationalId: v })}
            isEditing={isEditing}
            icon={<CreditCard className="h-3.5 w-3.5" />}
            placeholder="14 رقم"
            maxLength={14}
          />
          <FormField
            label="رقم القيد بنقابة المحامين"
            value={formData.barRegistrationNumber}
            onChange={(v) => setFormData({ ...formData, barRegistrationNumber: v })}
            isEditing={isEditing}
            icon={<Shield className="h-3.5 w-3.5" />}
            placeholder="رقم القيد"
          />
        </div>
      </div>

      {/* ── البيانات المهنية ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-indigo-600" />
          البيانات المهنية
        </h2>
        <div className="space-y-4">
          {/* النقابة الفرعية */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              النقابة الفرعية
            </label>
            {isEditing ? (
              <select
                value={formData.syndicate || ''}
                onChange={(e) => setFormData({ ...formData, syndicate: e.target.value })}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition"
              >
                <option value="">— اختر النقابة الفرعية —</option>
                {SYNDICATE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <DisplayField value={formData.syndicate || '—'} icon={<Award className="h-3.5 w-3.5" />} />
            )}
          </div>

          {/* سنوات الخبرة */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              سنوات الخبرة
            </label>
            {isEditing ? (
              <input
                type="number"
                min="0"
                max="70"
                value={formData.yearsOfExperience || 0}
                onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition"
              />
            ) : (
              <DisplayField
                value={formData.yearsOfExperience ? `${formData.yearsOfExperience} سنة` : '—'}
                icon={<Calendar className="h-3.5 w-3.5" />}
              />
            )}
          </div>

          {/* التخصصات (multi-select) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              التخصصات
            </label>
            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map(specialty => {
                  const isSelected = (formData.specialty || []).includes(specialty);
                  return (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() => toggleSpecialty(specialty)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white border border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {specialty}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {formData.specialty && formData.specialty.length > 0 ? (
                  formData.specialty.map(s => (
                    <span key={s} className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs">— لم يتم تحديد تخصصات —</span>
                )}
              </div>
            )}
          </div>

          {/* نبذة شخصية */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              نبذة شخصية
            </label>
            {isEditing ? (
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                maxLength={500}
                placeholder="نبذة مختصرة عن مسيرتك المهنية وخبراتك..."
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition resize-none"
              />
            ) : (
              <DisplayField
                value={formData.bio || '— لم تتم إضافة نبذة —'}
                multiline
                icon={<FileText className="h-3.5 w-3.5" />}
              />
            )}
          </div>

          {/* عنوان المكتب */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              عنوان المكتب
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.officeAddress || ''}
                onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                placeholder="العنوان التفصيلي لمكتب المحاماة"
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition"
              />
            ) : (
              <DisplayField value={formData.officeAddress || '—'} icon={<MapPin className="h-3.5 w-3.5" />} />
            )}
          </div>
        </div>
      </div>

      {/* ── Footer info ── */}
      {profile && (
        <div className="text-center text-[10px] text-slate-400">
          آخر تحديث: {new Date(profile.updatedAt).toLocaleString('ar-EG')}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function FormField({
  label, value, onChange, isEditing, icon, type = 'text', placeholder, required, maxLength,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  isEditing: boolean;
  icon?: React.ReactNode;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {isEditing ? (
        <div className="relative">
          {icon && (
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
          )}
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className={`w-full py-2.5 ${icon ? 'pe-10' : 'pe-3'} ps-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition`}
          />
        </div>
      ) : (
        <DisplayField value={value || '—'} icon={icon} />
      )}
    </div>
  );
}

function ReadOnlyField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-600 text-sm border border-slate-200">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span dir="ltr" className="font-mono">{value}</span>
        <span className="text-[9px] text-slate-400 ms-auto">(للقراءة فقط)</span>
      </div>
    </div>
  );
}

function DisplayField({ value, icon, multiline }: { value: string; icon?: React.ReactNode; multiline?: boolean }) {
  if (multiline) {
    return (
      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
        {value}
      </p>
    );
  }
  return (
    <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 text-slate-700 text-sm border border-slate-100">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span>{value}</span>
    </div>
  );
}
