/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CaseStats.tsx — شريط إحصائيات سريع لمحة عامة عن القضايا.
 *
 * مستخرج من CasesList.tsx v2.9.6.
 * يعرض 4 بطاقات: إجمالي / متداولة / محجوزة / منتهية.
 */

import React, { useMemo } from 'react';
import { Briefcase, Gavel, Clock, Archive } from 'lucide-react';
import { Case, CaseStatus } from '../../types';

interface CaseStatsProps {
  cases: Case[];
}

/**
 * شريط إحصائيات — pure read-only يعرض breakdown القضايا حسب الحالة.
 * لا يقبل callbacks لأنه للعرض فقط.
 */
export const CaseStats = React.memo(function CaseStats({ cases }: CaseStatsProps) {
  const stats = useMemo(() => {
    const total = cases.length;
    const active = cases.filter(c => c.status === CaseStatus.ACTIVE).length;
    const pleading = cases.filter(c => c.status === CaseStatus.PLEADING).length;
    const closed = cases.filter(c => c.status === CaseStatus.CLOSED).length;
    return { total, active, pleading, closed };
  }, [cases]);

  if (cases.length === 0) return null;

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
      data-testid="case-stats-bar"
    >
      <StatCard
        icon={Briefcase}
        label="إجمالي القضايا"
        value={stats.total}
        bgClass="bg-slate-50 border-slate-200"
        textClass="text-slate-900"
        iconClass="text-slate-500"
      />
      <StatCard
        icon={Clock}
        label="متداولة ونشطة"
        value={stats.active}
        bgClass="bg-emerald-50 border-emerald-200"
        textClass="text-emerald-800"
        iconClass="text-emerald-600"
      />
      <StatCard
        icon={Gavel}
        label="محجوزة للحكم"
        value={stats.pleading}
        bgClass="bg-indigo-50 border-indigo-200"
        textClass="text-indigo-800"
        iconClass="text-indigo-600"
      />
      <StatCard
        icon={Archive}
        label="منتهية ومحفوظة"
        value={stats.closed}
        bgClass="bg-rose-50 border-rose-200"
        textClass="text-rose-800"
        iconClass="text-rose-600"
      />
    </div>
  );
});

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  bgClass: string;
  textClass: string;
  iconClass: string;
}

const StatCard = React.memo(function StatCard({
  icon: Icon,
  label,
  value,
  bgClass,
  textClass,
  iconClass,
}: StatCardProps) {
  return (
    <div className={`p-3 rounded-2xl border ${bgClass} flex items-center justify-between`}>
      <div>
        <p className="text-[10px] text-slate-500 font-bold">{label}</p>
        <p className={`text-lg font-black font-mono ${textClass}`}>{value}</p>
      </div>
      <Icon className={`h-5 w-5 ${iconClass}`} />
    </div>
  );
});
