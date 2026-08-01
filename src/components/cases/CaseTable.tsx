/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CaseTable.tsx — عرض القضايا في جدول (list/table view).
 *
 * مستخرج من CasesList.tsx v2.9.6 (السطور 1512-1584 من النسخة القديمة).
 */

import React from 'react';
import { Eye, QrCode, Edit } from 'lucide-react';
import { Case } from '../../types';
import { findMatchSnippet } from '../../utils/searchHelper';
import { ActionBtnSmall } from './ActionBtn';
import type { CaseCardCallbacks } from './CaseCardGrid';

interface CaseTableProps {
  cases: Case[];
  searchQuery: string;
  callbacks: CaseCardCallbacks;
}

const STATUS_BADGE_MAP: Record<string, string> = {
  'متداولة': 'bg-emerald-50 text-emerald-700',
  'محجوزة للحكم': 'bg-indigo-100 text-indigo-800',
  'مشطوبة': 'bg-slate-100 text-slate-600',
  'منتهية ومحفوظة': 'bg-slate-100 text-slate-600',
};

export const CaseTable = React.memo(function CaseTable({ cases, searchQuery, callbacks }: CaseTableProps) {
  if (cases.length === 0) {
    return (
      <div
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        data-testid="case-table-empty"
      >
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-end p-3 font-bold text-slate-600">رقم الملف</th>
              <th className="text-end p-3 font-bold text-slate-600">رقم القضية</th>
              <th className="text-end p-3 font-bold text-slate-600">الموكل</th>
              <th className="text-end p-3 font-bold text-slate-600 hidden md:table-cell">المحكمة</th>
              <th className="text-end p-3 font-bold text-slate-600 hidden lg:table-cell">الخصم</th>
              <th className="text-center p-3 font-bold text-slate-600">الحالة</th>
              <th className="text-center p-3 font-bold text-slate-600">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="p-8 text-center text-slate-400">لا توجد قضايا</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
      data-testid="case-table"
    >
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-end p-3 font-bold text-slate-600">رقم الملف</th>
            <th className="text-end p-3 font-bold text-slate-600">رقم القضية</th>
            <th className="text-end p-3 font-bold text-slate-600">الموكل</th>
            <th className="text-end p-3 font-bold text-slate-600 hidden md:table-cell">المحكمة</th>
            <th className="text-end p-3 font-bold text-slate-600 hidden lg:table-cell">الخصم</th>
            <th className="text-center p-3 font-bold text-slate-600">الحالة</th>
            <th className="text-center p-3 font-bold text-slate-600">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(c => (
            <CaseTableRow
              key={c.id}
              c={c}
              searchQuery={searchQuery}
              callbacks={callbacks}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

interface CaseTableRowProps {
  c: Case;
  searchQuery: string;
  callbacks: CaseCardCallbacks;
}

const CaseTableRow = React.memo(function CaseTableRow({ c, searchQuery, callbacks }: CaseTableRowProps) {
  const match = searchQuery
    ? findMatchSnippet(
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
      )
    : null;

  const statusClass = STATUS_BADGE_MAP[c.status] || 'bg-slate-100 text-slate-600';

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition">
        <td className="p-3 font-mono font-bold text-indigo-700">{c.fileNumber || '—'}</td>
        <td className="p-3 font-mono font-bold text-slate-800">{c.caseNumber}</td>
        <td className="p-3 font-bold text-slate-900">{c.clientName}</td>
        <td className="p-3 text-slate-600 hidden md:table-cell">{c.court}</td>
        <td className="p-3 text-slate-500 truncate max-w-[150px] hidden lg:table-cell">{c.opponentName}</td>
        <td className="p-3 text-center">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusClass}`}>{c.status}</span>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-1 justify-center">
            <ActionBtnSmall
              icon={Eye}
              title="عرض"
              onClick={() => callbacks.onPrint(c, {} as React.MouseEvent)}
              color="slate"
            />
            <ActionBtnSmall
              icon={QrCode}
              title="QR"
              onClick={() => callbacks.onPrintQR(c, {} as React.MouseEvent)}
              color="indigo"
            />
            <ActionBtnSmall
              icon={Edit}
              title="تعديل"
              onClick={() => callbacks.onEdit(c, {} as React.MouseEvent)}
              color="slate"
            />
          </div>
        </td>
      </tr>
      {match && (
        <tr className="bg-indigo-50/20 border-b border-slate-100">
          <td colSpan={7} className="p-2 text-[10px] text-slate-500 font-sans text-end">
            <span className="text-indigo-800 font-extrabold pe-4">مطابقة في {match.fieldName}:</span>
            <span>{match.before}</span>
            <mark className="bg-indigo-100 text-indigo-900 font-bold px-0.5 rounded">{match.match}</mark>
            <span>{match.after}</span>
          </td>
        </tr>
      )}
    </>
  );
});
