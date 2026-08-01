/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CaseFilters.tsx — شريط البحث والفلاتر وأوضاع العرض للقضايا.
 *
 * مستخرج من CasesList.tsx v2.9.6 (السطور 1269-1383 من النسخة القديمة).
 * يحتوي على: search box، فلتر التخصص، فلتر الحالة،
 * badges درجات التقاضي، أزرار تبديل الـ view mode، وعدّاد النتائج.
 *
 * controlled component — يستقبل كل القيم من الأب و callbacks للتغيير.
 */

import React from 'react';
import { Search, LayoutGrid, List, Image } from 'lucide-react';
import { CaseType, CaseStatus } from '../../types';

export type CaseViewMode = 'grid' | 'list' | 'large-icon' | 'medium-icon' | 'small-icon';

interface CaseFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;

  selectedType: string;
  onTypeChange: (t: string) => void;

  selectedStatus: string;
  onStatusChange: (s: string) => void;

  selectedLitigation: string;
  onLitigationChange: (l: string) => void;

  litigationLevels: string[];

  viewMode: CaseViewMode;
  onViewModeChange: (m: CaseViewMode) => void;

  filteredCount: number;
}

export const CaseFilters = React.memo(function CaseFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  selectedLitigation,
  onLitigationChange,
  litigationLevels,
  viewMode,
  onViewModeChange,
  filteredCount,
}: CaseFiltersProps) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
      data-testid="case-filters"
    >
      {/* Row 1: Search and Simple selects */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Query Search */}
        <div className="relative md:col-span-2">
          <input
            type="text"
            placeholder="ابحث برقم القضية، رقم الملف، اسم الموكل، اسم الخصم..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full text-xs pe-10 ps-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500/50 bg-slate-50/50 transition font-medium"
            id="cases-search-box"
            data-testid="cases-search-input"
          />
          <Search className="absolute end-3.5 top-3 h-4 w-4 text-slate-400" />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute start-3 top-3 text-[10px] bg-slate-200 hover:bg-slate-300 p-0.5 px-1.5 rounded text-slate-600 font-bold"
              data-testid="cases-search-clear"
            >
              مسح
            </button>
          )}
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={selectedType}
            onChange={e => onTypeChange(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            data-testid="cases-type-select"
          >
            <option value="all">كافة التخصصات والمحاكم</option>
            <option value={CaseType.CIVIL}>محاكم المدني الكلي/الجزئي</option>
            <option value={CaseType.CRIMINAL}>محاكم الجنايات والجنح</option>
            <option value={CaseType.PERSONAL_STATUS}>محاكم الأسرة والأحوال الشخصية</option>
            <option value={CaseType.ADMINISTRATIVE}>مجلس الدولة (إداري واستثمار)</option>
            <option value={CaseType.COMMERCIAL}>المحاكم الاقتصادية والضرائب</option>
            <option value={CaseType.LABOR}>محاكم عمالية</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={e => onStatusChange(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            data-testid="cases-status-select"
          >
            <option value="all">كافة الحالات القضائية</option>
            <option value={CaseStatus.ACTIVE}>متداولة (قيد الجلسات)</option>
            <option value={CaseStatus.PLEADING}>محجوزة للحكم والتقرير</option>
            <option value={CaseStatus.DISMISSED}>مشطوبة (تتطلب تجديداً)</option>
            <option value={CaseStatus.CLOSED}>منتهية ومحفوظة بالإرشيف</option>
          </select>
        </div>
      </div>

      {/* Row 2: Litigation levels badges + View Mode + Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">درجات التقاضي:</span>
          {[
            { key: 'all', label: 'الجميع' },
            ...litigationLevels.map(level => ({ key: level, label: level })),
          ].map(lit => (
            <button
              key={lit.key}
              onClick={() => onLitigationChange(lit.key)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                selectedLitigation === lit.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              id={`filter-litigation-${lit.key}`}
              data-testid={`filter-litigation-${lit.key}`}
            >
              {lit.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" dir="ltr">
            <span className="text-[10px] text-slate-400 font-bold ml-1 hidden sm:inline">عرض:</span>
            {([
              { key: 'grid', icon: LayoutGrid, label: 'شبكة' },
              { key: 'list', icon: List, label: 'تفاصيل' },
              { key: 'large-icon', icon: Image, label: 'أيقونات كبيرة' },
              { key: 'medium-icon', icon: Image, label: 'متوسط' },
              { key: 'small-icon', icon: Image, label: 'صغير' },
            ] as const).map(v => (
              <button
                key={v.key}
                onClick={() => onViewModeChange(v.key)}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 ${
                  viewMode === v.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                title={v.label}
                data-testid={`view-mode-${v.key}`}
              >
                <v.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[10px]">{v.label}</span>
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 font-bold whitespace-nowrap" data-testid="cases-filtered-count">
            إجمالي: {filteredCount} قضية
          </span>
        </div>
      </div>
    </div>
  );
});
