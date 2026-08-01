/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AddDeadlineModal — نافذة تسجيل ميعاد إجرائي حاسم.
 *
 * يحسب تلقائياً المواعيد القانونية وفق قانون المرافعات المصري:
 *  - استئناف مدني 40 يوماً
 *  - معارضة جنائية 10 أيام
 *  - استئناف جنائي 10 أيام
 *  - طعن بالنقض 60 يوماً
 */

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Case, LegalDeadline } from '../../../types';
import RichTextEditor from '../../RichTextEditor';

export interface DeadlineFormData {
  caseId: string;
  title: string;
  startDate: string;
  daysLimit: number;
  lawReference: string;
  notes: string;
}

export interface AddDeadlineModalProps {
  open: boolean;
  onClose: () => void;
  cases: Case[];
  formData: DeadlineFormData;
  setFormData: (v: DeadlineFormData) => void;
  onApplyPreset: (presetTitle: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddDeadlineModal(props: AddDeadlineModalProps) {
  const { open, onClose, cases, formData, setFormData, onApplyPreset, onSubmit } = props;
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        <div className="bg-rose-600 p-5 text-white rounded-t-3xl">
          <div className="flex justify-between items-center">
            <h2 className="font-black text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              تسجيل ميعاد إجرائي حاسم
            </h2>
            <button onClick={onClose} className="bg-white/20 p-1.5 rounded-full hover:bg-white/30">
              <X className="w-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-rose-200 mt-1">احسب تلقائياً المواعيد القانونية وفق قانون المرافعات المصري</p>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs" dir="rtl">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">ملف القضية *</label>
            <select
              required
              value={formData.caseId}
              onChange={e => setFormData({ ...formData, caseId: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-rose-500 focus:bg-white transition"
            >
              <option value="">— اختر القضية —</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.clientName} — قضية {c.caseNumber}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">قوالب المواعيد القانونية</label>
            <select
              onChange={e => onApplyPreset(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-100 focus:outline-none cursor-pointer font-bold"
            >
              <option>ميعاد استئناف مدني وتجاري (٤٠ يوماً)</option>
              <option>ميعاد معارضة غيابية جنحة (١٠ أيام)</option>
              <option>ميعاد استئناف أحكام جنائية (١٠ أيام)</option>
              <option>ميعاد طعن بالنقض الجنائي والمدني (٦٠ يوماً)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">عنوان الميعاد *</label>
            <input
              type="text" required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-rose-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">تاريخ البدء *</label>
              <input
                type="date" required
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-rose-500 transition"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">مدة الميعاد (يوم) *</label>
              <input
                type="number" required min="1"
                value={formData.daysLimit}
                onChange={e => setFormData({ ...formData, daysLimit: Number(e.target.value) })}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-rose-500 transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">السند القانوني</label>
            <RichTextEditor
              value={formData.lawReference}
              onChange={(html) => setFormData({ ...formData, lawReference: html })}
              placeholder="مثال: المادة ٢٢٧ من قانون المرافعات — ميعاد الاستئناف ٤٠ يوماً"
              minHeight={100}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition">
              إلغاء
            </button>
            <button type="submit" className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold hover:bg-rose-700 transition shadow-sm">
              رسم الميعاد القانوني
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
