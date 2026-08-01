/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BailiffFilters.tsx — شريط البحث والفلاتر لأوراق المحضرين.
 *
 * مستخرج من BailiffPapersPanel.tsx v2.9.6 (السطور 1069-1123 من النسخة القديمة).
 */

import React from 'react';
import { Search, Printer } from 'lucide-react';

interface BailiffFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;

  statusFilter: string;
  onStatusFilterChange: (s: string) => void;

  courtFilter: string;
  onCourtFilterChange: (c: string) => void;

  uniqueCourts: string[];

  filteredCount: number;
  onPrintAll: () => void;
}

export const BailiffFilters = React.memo(function BailiffFilters({
  searchQuery, onSearchChange,
  statusFilter, onStatusFilterChange,
  courtFilter, onCourtFilterChange,
  uniqueCourts, filteredCount, onPrintAll,
}: BailiffFiltersProps) {
  return (
    <div
      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
      data-testid="bailiff-filters"
    >
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="البحث في موضوعات الإعلانات، أرقام المحضرين، الخصوم أو أرقام القضايا..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full text-xs pe-9 ps-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 font-bold"
            data-testid="bailiff-search-input"
          />
          <Search className="absolute end-3 top-3 w-4 h-4 text-slate-400" />
        </div>

        {/* Status */}
        <div>
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 font-bold"
            data-testid="bailiff-status-select"
          >
            <option value="all">كل حالات الإعلان</option>
            <option value="قيد الإعلان والتسليم">قيد الإعلان والتسليم</option>
            <option value="تم الاستلام والتسليم">تم الاستلام والتسليم</option>
            <option value="مرتد لعدم الاستدلال">مرتد لعدم الاستدلال</option>
            <option value="مؤجل للإعادة">مؤجل للإعادة</option>
          </select>
        </div>

        {/* Court filter */}
        <div>
          <select
            value={courtFilter}
            onChange={e => onCourtFilterChange(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 font-bold"
            data-testid="bailiff-court-select"
          >
            <option value="all">كل المحاكم المعنية</option>
            {uniqueCourts.map(crt => (
              <option key={crt} value={crt}>{crt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Print Report Button */}
      <button
        onClick={onPrintAll}
        className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm border border-slate-800"
        title="طباعة التقرير الشامل لجميع الأوراق المدرجة"
        data-testid="bailiff-print-all-btn"
      >
        <Printer className="w-4 h-4 text-indigo-400" />
        <span>طباعة كشف عام ({filteredCount})</span>
      </button>
    </div>
  );
});
