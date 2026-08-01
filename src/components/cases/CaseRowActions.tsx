/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CaseRowActions.tsx — شريط الأزرار الموحد في بطاقات وصفوف القضايا.
 *
 * مستخرج من CasesList.tsx v2.9.6 (السطور 1478-1505 من النسخة القديمة).
 *
 * يجمع: فتح الدعوى، عرض احترافي (Modal)، عرض، QR، طباعة،
 * تعديل، تصدير Word، حذف، أرشفة.
 *
 * controlled — يستقبل callbacks منفصلة لكل إجراء.
 * لا يستورد أي logic من الـ parent.
 */

import React from 'react';
import { ChevronLeft, Maximize2, Eye, QrCode, Printer, Edit, FileText, Trash2, Archive } from 'lucide-react';
import { ActionBtn } from './ActionBtn';

interface CaseRowActionsProps {
  /** فتح ملف الدعوى (drawer) */
  onOpen: () => void;
  /** فتح المعاينة الاحترافية (CaseDetailModal) */
  onViewFull: () => void;
  /** طباعة / عرض تقرير PDF */
  onPrint: (e: React.MouseEvent) => void;
  /** طباعة QR code */
  onPrintQR: (e: React.MouseEvent) => void;
  /** تعديل بيانات القضية */
  onEdit: (e: React.MouseEvent) => void;
  /** تصدير إلى ملف وورد */
  onExportWord: (e: React.MouseEvent) => void;
  /** حذف نهائي */
  onDelete: (e: React.MouseEvent) => void;
  /** أرشفة (اختياري — يظهر الزر فقط عند توفره) */
  onArchive?: (e: React.MouseEvent) => void;
}

/**
 * شريط الأزرار الكامل المعروض أسفل كل بطاقة قضية (grid view).
 */
export const CaseRowActions = React.memo(function CaseRowActions({
  onOpen,
  onViewFull,
  onPrint,
  onPrintQR,
  onEdit,
  onExportWord,
  onDelete,
  onArchive,
}: CaseRowActionsProps) {
  return (
    <div
      className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap"
      data-testid="case-row-actions"
    >
      <button
        onClick={onOpen}
        className="flex-grow bg-slate-900 text-indigo-400 hover:bg-slate-800 rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
        data-testid="case-open-btn"
      >
        فتح الدعوى <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onViewFull}
        title="استعراض احترافي (Modal ملء الشاشة)"
        className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg p-2 transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
        data-testid="case-view-full-btn"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      <ActionBtn icon={Eye} title="عرض" onClick={onPrint} color="slate" />
      <ActionBtn icon={QrCode} title="QR" onClick={onPrintQR} color="indigo" />
      <ActionBtn icon={Printer} title="طباعة" onClick={onPrint} color="indigo" />
      <ActionBtn icon={Edit} title="تعديل" onClick={onEdit} color="slate" />
      <ActionBtn icon={FileText} title="وورد" onClick={onExportWord} color="blue" />
      <ActionBtn icon={Trash2} title="حذف" onClick={onDelete} color="red" />
      {onArchive && (
        <ActionBtn icon={Archive} title="أرشفة" onClick={onArchive} color="slate" />
      )}
    </div>
  );
});
