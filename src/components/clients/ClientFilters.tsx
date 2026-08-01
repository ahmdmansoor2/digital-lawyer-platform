/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClientFilters.tsx — Search input + view mode selector + count display.
 *
 * v2.9.7: استخراج من ClientsList.tsx (1875 سطر) لتسهيل الصيانة.
 *
 * يحتوي على:
 *  - Search input (يبحث في الاسم/الهاتف/الرقم القومي/العنوان/رقم الملف)
 *  - View mode toggle (5 أوضاع: شبكة، تفاصيل، أيقونات كبيرة/متوسطة/صغيرة)
 *  - Count display (إجمالي عدد الموكلين بعد الفلترة)
 */

import React from 'react';
import { Search, LayoutGrid, List, Image } from 'lucide-react';

export type ClientViewMode = 'grid' | 'list' | 'large-icon' | 'medium-icon' | 'small-icon';

export interface ClientFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ClientViewMode;
  onViewModeChange: (mode: ClientViewMode) => void;
  totalCount: number;
}

const VIEW_MODES: ReadonlyArray<{ key: ClientViewMode; icon: typeof LayoutGrid; label: string }> = [
  { key: 'grid', icon: LayoutGrid, label: 'شبكة' },
  { key: 'list', icon: List, label: 'تفاصيل' },
  { key: 'large-icon', icon: Image, label: 'أيقونات كبيرة' },
  { key: 'medium-icon', icon: Image, label: 'متوسط' },
  { key: 'small-icon', icon: Image, label: 'صغير' },
];

const ClientFilters = React.memo(function ClientFilters({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  totalCount,
}: ClientFiltersProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div className="relative flex-grow max-w-lg min-w-[200px]">
        <input
          type="text"
          placeholder="ابحث برقم بطاقة قومي، اسم الموكل، هاتف، أو العنوان..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full text-xs pe-10 ps-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/50 transition font-medium"
          id="clients-search-box"
          aria-label="البحث في الموكلين"
        />
        <Search className="absolute end-3.5 top-3 h-4 w-4 text-slate-400" />
      </div>

      <div className="flex items-center gap-1.5" dir="ltr">
        <span className="text-[10px] text-slate-400 font-bold ml-1 hidden sm:inline">عرض:</span>
        {VIEW_MODES.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => onViewModeChange(v.key)}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 ${
              viewMode === v.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            title={v.label}
            aria-label={`عرض ${v.label}`}
            aria-pressed={viewMode === v.key}
          >
            <v.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[10px]">{v.label}</span>
          </button>
        ))}
      </div>

      <span className="text-xs text-slate-400 font-bold whitespace-nowrap" aria-live="polite">
        إجمالي: {totalCount} موكل
      </span>
    </div>
  );
});

export default ClientFilters;
