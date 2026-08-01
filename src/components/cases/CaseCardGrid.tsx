/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CaseCardGrid.tsx — عرض القضايا كبطاقات (grid layout).
 *
 * مستخرج من CasesList.tsx v2.9.6 (السطور 1386-1510 من النسخة القديمة).
 * متطابق بصرياً ووظيفياً مع الـ implementation الداخلي القديم.
 *
 * يستقبل قائمة القضايا المفلترة + callbacks للإجراءات، ويوزعها على
 * CaseRowActions داخل كل بطاقة.
 */

import React from 'react';
import { AlertCircle, Layers } from 'lucide-react';
import { Case, CaseType } from '../../types';
import { findMatchSnippet } from '../../utils/searchHelper';
import { CaseRowActions } from './CaseRowActions';

export interface CaseCardCallbacks {
  onOpen: (c: Case) => void;
  onViewFull: (c: Case) => void;
  onPrint: (c: Case, e: React.MouseEvent) => void;
  onPrintQR: (c: Case, e: React.MouseEvent) => void;
  onEdit: (c: Case, e: React.MouseEvent) => void;
  onExportWord: (c: Case, e: React.MouseEvent) => void;
  onDelete: (c: Case, e: React.MouseEvent) => void;
  onArchive?: (c: Case, e: React.MouseEvent) => void;
}

interface CaseCardGridProps {
  cases: Case[];
  selectedCaseId: string | null;
  searchQuery: string;
  callbacks: CaseCardCallbacks;
}

const TYPE_COLOR_MAP: Record<CaseType, string> = {
  [CaseType.CIVIL]: 'bg-cyan-600',
  [CaseType.CRIMINAL]: 'bg-slate-800',
  [CaseType.PERSONAL_STATUS]: 'bg-rose-500',
  [CaseType.ADMINISTRATIVE]: 'bg-indigo-600',
  [CaseType.COMMERCIAL]: 'bg-indigo-600',
  [CaseType.LABOR]: 'bg-indigo-600',
};

const STATUS_BADGE_MAP: Record<string, string> = {
  'متداولة': 'bg-emerald-50 text-emerald-700',
  'محجوزة للحكم': 'bg-indigo-100 text-indigo-800',
  'مشطوبة': 'bg-slate-100 text-slate-600',
  'منتهية ومحفوظة': 'bg-slate-100 text-slate-600',
};

export const CaseCardGrid = React.memo(function CaseCardGrid({
  cases,
  selectedCaseId,
  searchQuery,
  callbacks,
}: CaseCardGridProps) {
  if (cases.length === 0) {
    return (
      <div
        className="col-span-full bg-white border border-slate-200 py-12 px-6 rounded-2xl text-center text-slate-400"
        data-testid="case-grid-empty"
      >
        <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">لا توجد أي قضايا تطابق فلاتر البحث الحالية.</p>
        <p className="text-xs text-slate-400 mt-1">هل ترغب في تسجيل قضية جديدة بالملف؟</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      data-testid="case-card-grid"
    >
      {cases.map(c => (
        <CaseCard
          key={c.id}
          c={c}
          isSelected={selectedCaseId === c.id}
          searchQuery={searchQuery}
          callbacks={callbacks}
        />
      ))}
    </div>
  );
});

interface CaseCardProps {
  c: Case;
  isSelected: boolean;
  searchQuery: string;
  callbacks: CaseCardCallbacks;
}

const CaseCard = React.memo(function CaseCard({ c, isSelected, searchQuery, callbacks }: CaseCardProps) {
  const isCompletedFees = c.paidFees >= c.totalFees;
  const typeColor = TYPE_COLOR_MAP[c.type] || 'bg-indigo-600';
  const statusClass = STATUS_BADGE_MAP[c.status] || 'bg-slate-100 text-slate-600';

  return (
    <div
      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-5 relative overflow-hidden ${
        isSelected ? 'border-2 border-indigo-600 ring-2 ring-indigo-600/10' : 'border-slate-200 hover:border-indigo-500/30'
      }`}
      id={`case-card-item-${c.id}`}
      data-testid={`case-card-${c.id}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${typeColor}`}></div>

      <div className="space-y-1 mt-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">
            رقم القضية: {c.caseNumber}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusClass}`}>{c.status}</span>
        </div>
        {c.fileNumber && (
          <span className="text-[9px] text-indigo-700 font-bold bg-indigo-50 inline-block px-2 py-0.5 rounded">
            ملف رقم: {c.fileNumber}
          </span>
        )}
        <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1" title={c.clientName}>
          {c.clientName}
        </h3>
        <p className="text-xs text-slate-400 font-medium line-clamp-1">{c.court}</p>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed font-normal bg-slate-50 p-2.5 rounded-lg line-clamp-2 h-12" title={c.claimSubject}>
        {c.claimSubject || 'لم يحرر ملخص للمطالبة الرسمية.'}
      </p>

      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Layers className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="truncate">{c.litigationLevel}</span>
        </div>
        <div className="flex items-center gap-1 border-e border-slate-200 pe-1">
          <span className="truncate text-red-700 font-bold">الخصم: {c.opponentName}</span>
        </div>
        <div className="flex items-center gap-1 border-e border-slate-200 pe-1">
          <span className="truncate text-indigo-600 font-bold">{(c.attachments || []).length} مرفقات</span>
        </div>
      </div>

      {searchQuery && (
        <SearchMatchSnippet c={c} searchQuery={searchQuery} />
      )}

      <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-50">
        <div className="space-y-0.5">
          <span className="text-[9px] text-slate-400 block">أقساط الأتعاب</span>
          <span className={`font-mono font-bold text-xs ${isCompletedFees ? 'text-emerald-600' : 'text-slate-700'}`}>
            {c.paidFees.toLocaleString('ar-EG')} / {c.totalFees.toLocaleString('ar-EG')} ج.م
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isCompletedFees ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
        }`}>
          {isCompletedFees ? 'مسدد بالكامل' : `متبقي ${(c.totalFees - c.paidFees).toLocaleString('ar-EG')}`}
        </span>
      </div>

      <CaseRowActions
        onOpen={() => callbacks.onOpen(c)}
        onViewFull={() => callbacks.onViewFull(c)}
        onPrint={(e) => callbacks.onPrint(c, e)}
        onPrintQR={(e) => callbacks.onPrintQR(c, e)}
        onEdit={(e) => callbacks.onEdit(c, e)}
        onExportWord={(e) => callbacks.onExportWord(c, e)}
        onDelete={(e) => callbacks.onDelete(c, e)}
        onArchive={callbacks.onArchive ? (e) => callbacks.onArchive!(c, e) : undefined}
      />
    </div>
  );
});

/**
 * Highlight snippet عند تطابق البحث داخل حقول القضية.
 */
const SearchMatchSnippet = React.memo(function SearchMatchSnippet({ c, searchQuery }: { c: Case; searchQuery: string }) {
  const match = findMatchSnippet(
    {
      clientName: c.clientName,
      caseNumber: c.caseNumber,
      court: c.court,
      opponentName: c.opponentName,
      claimSubject: c.claimSubject,
      fileNumber: c.fileNumber,
    },
    searchQuery,
    {
      clientName: 'اسم الموكل',
      caseNumber: 'رقم القضية',
      court: 'المحكمة',
      opponentName: 'اسم الخصم',
      claimSubject: 'موضوع الدعوى',
      fileNumber: 'رقم الملف',
    },
  );
  if (!match) return null;
  return (
    <div className="text-[10px] text-slate-600 bg-indigo-50/50 border border-indigo-100 p-2 rounded-md font-sans">
      <span className="text-indigo-800 font-extrabold block mb-0.5">مطابقة في {match.fieldName}:</span>
      <span>{match.before}</span>
      <mark className="bg-indigo-200 text-indigo-950 font-bold px-0.5 rounded">{match.match}</mark>
      <span>{match.after}</span>
    </div>
  );
});
