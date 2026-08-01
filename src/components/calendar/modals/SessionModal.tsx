/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SessionModal — نافذة تسجيل/تعديل جلسة قضائية.
 *
 * نفس النافذة تُستخدم للـ add والـ edit:
 *  - editingSession = null  → إضافة جلسة جديدة
 *  - editingSession != null  → تعديل جلسة موجودة
 */

import React, { useMemo } from 'react';
import { X, Gavel, AlertOctagon } from 'lucide-react';
import { Case, Session } from '../../../types';
import RichTextEditor from '../../RichTextEditor';
import { detectSessionConflicts, normalizeTime } from '../../../utils/conflictDetection';
import { useCustomFields, CustomFieldsRenderer } from '../../../hooks/useCustomFields';

export interface SessionFormData {
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
}

export interface SessionModalProps {
  open: boolean;
  editingSession: Session | null;
  onClose: () => void;
  cases: Case[];
  sessions: Session[];
  formData: SessionFormData;
  setFormData: (v: SessionFormData) => void;
  onAddSubmit: (e: React.FormEvent) => void;
  onEditSubmit: (e: React.FormEvent) => void;
  customFields?: ReturnType<typeof useCustomFields>;
}

export default function SessionModal(props: SessionModalProps) {
  const { open, editingSession, onClose, cases, sessions, formData, setFormData, onAddSubmit, onEditSubmit, customFields } = props;
  if (!open) return null;

  const isEdit = !!editingSession;

  // v2.8.8: detect potential conflicts when user picks a date+time
  const potentialConflicts = useMemo(() => {
    if (!formData.date || formData.status !== 'قادمة') return [];
    const candidate: Session = {
      id: editingSession?.id || '__new__',
      caseId: formData.caseId,
      caseNumber: '',
      clientName: '',
      date: formData.date,
      court: formData.court,
      circuit: formData.circuit,
      objective: formData.objective,
      status: 'قادمة',
      time: formData.time,
    };
    // Compare against other upcoming sessions (exclude self when editing)
    const others = sessions.filter(s => s.status === 'قادمة' && s.id !== candidate.id);
    const allConflicts = detectSessionConflicts([candidate, ...others]);
    // Filter to conflicts where the candidate is involved
    return allConflicts.filter(c => c.sessionA.id === candidate.id || c.sessionB.id === candidate.id);
  }, [formData, sessions, editingSession]);

  const conflictingSession = potentialConflicts[0]?.sessionA?.id === (editingSession?.id || '__new__')
    ? potentialConflicts[0]?.sessionB
    : potentialConflicts[0]?.sessionA;

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="bg-indigo-600 p-5 text-white rounded-t-3xl">
          <div className="flex justify-between items-center">
            <h2 className="font-black text-base flex items-center gap-2">
              <Gavel className="w-5 h-5" />
              {isEdit ? 'تعديل بيانات الجلسة' : 'تسجيل جلسة قضائية جديدة'}
            </h2>
            <button onClick={onClose} className="bg-white/20 p-1.5 rounded-full hover:bg-white/30">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            {isEdit ? 'قم بتحديث بيانات الجلسة وتعديل تفاصيلها' : 'أضف جلسة جديدة مرتبطة بالقضية المحددة'}
          </p>
        </div>

        <form onSubmit={isEdit ? onEditSubmit : onAddSubmit} className="p-5 space-y-4 text-xs" dir="rtl">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">ملف القضية *</label>
            <select
              required
              value={formData.caseId}
              onChange={e => setFormData({ ...formData, caseId: e.target.value })}
              disabled={isEdit}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:bg-white transition disabled:opacity-70"
            >
              <option value="">— اختر القضية —</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.clientName} — قضية {c.caseNumber}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">تاريخ الجلسة *</label>
              <input
                type="date" required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">وقت الجلسة *</label>
              <input
                type="time" required
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">حالة الجلسة *</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="قادمة">قادمة</option>
                <option value="منتهية">منتهية</option>
              </select>
            </div>
          </div>

          {/* v2.8.8: Live conflict warning while user fills the form */}
          {potentialConflicts.length > 0 && conflictingSession && (
            <div className="mt-3 p-3 bg-red-50 border-2 border-red-400 rounded-2xl flex items-start gap-2">
              <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-end">
                <p className="text-sm font-black text-red-800">
                  ⚠️ تعارض محتمل مع جلسة أخرى
                </p>
                <p className="text-[11px] text-red-700 mt-0.5">
                  يوجد جلسة في {conflictingSession.court || 'نفس المحكمة'} يوم {conflictingSession.date}
                  {conflictingSession.time ? ` الساعة ${conflictingSession.time}` : ' (بدون وقت محدد)'}.
                  {' '}القضية رقم {conflictingSession.caseNumber || '—'}.
                </p>
                <p className="text-[10px] text-red-600 mt-1 font-bold">
                  تقدر تكمل الحفظ لو الميعاد فعلاً متغير، بس لو شكوك اتأكد قبل الحفظ.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">المحكمة والفرع *</label>
            <input
              type="text" required
              value={formData.court}
              onChange={e => setFormData({ ...formData, court: e.target.value })}
              placeholder="مثال: محكمة جنوب القاهرة الكلية"
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">الدائرة / الرقم</label>
              <input
                type="text"
                value={formData.circuit}
                onChange={e => setFormData({ ...formData, circuit: e.target.value })}
                placeholder="مثال: الدائرة ٣ مدني"
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">اسم القاضي</label>
              <input
                type="text"
                value={formData.judgeName}
                onChange={e => setFormData({ ...formData, judgeName: e.target.value })}
                placeholder="اختياري"
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">المطلوب والهدف من الجلسة *</label>
            <RichTextEditor
              value={formData.objective}
              onChange={(html) => setFormData({ ...formData, objective: html })}
              placeholder="اشرح ما هو مطلوب من المحكمة في هذه الجلسة..."
              minHeight={80}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">حكم المحكمة / ما قررته الجلسة</label>
            <RichTextEditor
              value={formData.decision}
              onChange={(html) => setFormData({ ...formData, decision: html })}
              placeholder="ادون قرار المحكمة أو ما تم بالجلسة..."
              minHeight={60}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">ملاحظات إضافية</label>
            <RichTextEditor
              value={formData.notes}
              onChange={(html) => setFormData({ ...formData, notes: html })}
              placeholder="ملاحظات ومستجدات..."
              minHeight={60}
            />
          </div>

          {customFields && customFields.fields.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">حقول إضافية</legend>
              <CustomFieldsRenderer
                fields={customFields.fields}
                values={(formData as any).customFieldValues || {}}
                onChange={(fieldId, val) => setFormData({ ...formData, customFieldValues: customFields.setFieldValue(fieldId, val, (formData as any).customFieldValues || {}) } as SessionFormData)}
              />
            </fieldset>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition">
              إلغاء
            </button>
            <button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm">
              {isEdit ? 'حفظ التعديلات' : 'تسجيل الجلسة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
