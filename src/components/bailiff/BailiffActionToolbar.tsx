/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BailiffActionToolbar.tsx — شريط الأزرار الموحد أسفل كل ورقة محضرين.
 *
 * مستخرج من BailiffPapersPanel.tsx v2.9.6 (السطور 1307-1361 من النسخة القديمة).
 * 6 أزرار: معاينة، تعديل، طباعة، ظرف، تقرير Word، حذف.
 */

import React from 'react';
import { Eye, Edit, Printer, Mail, FileText, Trash2 } from 'lucide-react';

export interface BailiffToolbarCallbacks {
  onPreview: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onEnvelope: () => void;
  onExportWord: () => void;
  onDelete: () => void;
}

interface BailiffActionToolbarProps {
  callbacks: BailiffToolbarCallbacks;
}

export const BailiffActionToolbar = React.memo(function BailiffActionToolbar({
  callbacks,
}: BailiffActionToolbarProps) {
  return (
    <div
      className="bg-slate-50 border border-slate-100 p-2 rounded-2xl grid grid-cols-6 gap-1 text-center shadow-xs mt-2"
      data-testid="bailiff-action-toolbar"
    >
      <ToolbarBtn icon={Eye} label="معاينة" title="معاينة كافة تفاصيل الإعلان" onClick={callbacks.onPreview} testId="bailiff-btn-preview" />
      <ToolbarBtn icon={Edit} label="تعديل" title="تعديل بيانات ورقة الإعلان" onClick={callbacks.onEdit} testId="bailiff-btn-edit" />
      <ToolbarBtn icon={Printer} label="طباعة" title="طباعة تقرير الإعلان القضائي" onClick={callbacks.onPrint} testId="bailiff-btn-print" color="emerald" />
      <ToolbarBtn icon={Mail} label="ظرف" title="طباعة ظرف الإعلان الرسمي" onClick={callbacks.onEnvelope} testId="bailiff-btn-envelope" color="sky" />
      <ToolbarBtn icon={FileText} label="تقرير" title="تنزيل وتصدير تقرير Word" onClick={callbacks.onExportWord} testId="bailiff-btn-word" color="blue" />
      <ToolbarBtn icon={Trash2} label="حذف" title="حذف الإعلان نهائياً" onClick={callbacks.onDelete} testId="bailiff-btn-delete" color="rose" />
    </div>
  );
});

interface ToolbarBtnProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  onClick: () => void;
  testId: string;
  color?: 'emerald' | 'sky' | 'blue' | 'rose';
}

const COLOR_MAP: Record<NonNullable<ToolbarBtnProps['color']>, string> = {
  emerald: 'text-emerald-600',
  sky: 'text-sky-600',
  blue: 'text-blue-600',
  rose: 'text-rose-600',
};

const ToolbarBtn = React.memo(function ToolbarBtn({ icon: Icon, label, title, onClick, testId, color }: ToolbarBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`p-1 hover:bg-white ${color ? COLOR_MAP[color] : 'text-indigo-600'} rounded-xl border border-transparent hover:border-slate-200/60 transition flex flex-col items-center justify-center gap-0.5 text-[9px] font-black cursor-pointer`}
      title={title}
      data-testid={testId}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
});
