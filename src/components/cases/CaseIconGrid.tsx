/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CaseIconGrid.tsx — عرض القضايا كأيقونات (3 أحجام: large/medium/small).
 *
 * مستخرج من CasesList.tsx v2.9.6 (السطور 1586-1619 من النسخة القديمة).
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Case, CaseType } from '../../types';
import type { CaseViewMode } from './CaseFilters';

interface CaseIconGridProps {
  cases: Case[];
  viewMode: 'large-icon' | 'medium-icon' | 'small-icon';
  selectedCaseId: string | null;
  onSelect: (c: Case) => void;
}

const TYPE_COLOR_MAP: Record<CaseType, string> = {
  [CaseType.CIVIL]: 'bg-cyan-600',
  [CaseType.CRIMINAL]: 'bg-slate-800',
  [CaseType.PERSONAL_STATUS]: 'bg-rose-500',
  [CaseType.ADMINISTRATIVE]: 'bg-indigo-600',
  [CaseType.COMMERCIAL]: 'bg-indigo-600',
  [CaseType.LABOR]: 'bg-indigo-600',
};

type IconViewMode = 'large-icon' | 'medium-icon' | 'small-icon';

const GRID_CLASS: Record<IconViewMode, string> = {
  'large-icon': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  'medium-icon': 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  'small-icon': 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8',
};

const AVATAR_CLASS: Record<IconViewMode, string> = {
  'large-icon': 'w-16 h-16 text-xl',
  'medium-icon': 'w-12 h-12 text-lg',
  'small-icon': 'w-10 h-10 text-base',
};

export const CaseIconGrid = React.memo(function CaseIconGrid({
  cases,
  viewMode,
  selectedCaseId,
  onSelect,
}: CaseIconGridProps) {
  if (cases.length === 0) {
    return (
      <div
        className="col-span-full bg-white border border-slate-200 py-12 px-6 rounded-2xl text-center text-slate-400"
        data-testid="case-icon-grid-empty"
      >
        <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">لا توجد قضايا.</p>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-4 ${GRID_CLASS[viewMode]}`}
      data-testid="case-icon-grid"
    >
      {cases.map(c => {
        const typeColor = TYPE_COLOR_MAP[c.type] || 'bg-indigo-600';
        const avatarClass = AVATAR_CLASS[viewMode];
        return (
          <div
            key={c.id}
            className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col items-center text-center p-3 ${
              selectedCaseId === c.id ? 'border-2 border-indigo-600' : 'border-slate-200'
            }`}
            onClick={() => onSelect(c)}
            id={`icon-case-${c.id}`}
            data-testid={`icon-case-${c.id}`}
          >
            <div className={`${avatarClass} rounded-full flex items-center justify-center text-white font-black mb-1.5 ${typeColor}`}>
              {c.caseNumber.charAt(0)}
            </div>
            {viewMode !== 'small-icon' && (
              <div className="min-w-0 w-full">
                <div className="text-xs font-bold text-slate-900 truncate w-full">{c.clientName}</div>
                {c.fileNumber && <div className="text-[9px] text-indigo-700 font-mono">#{c.fileNumber}</div>}
                {viewMode === 'large-icon' && <div className="text-[9px] text-slate-400 truncate mt-0.5">{c.caseNumber}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
