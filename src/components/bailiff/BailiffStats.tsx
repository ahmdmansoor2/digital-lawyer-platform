/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BailiffStats.tsx — شريط إحصائيات أوراق المحضرين.
 *
 * يعرض 4 بطاقات: إجمالي، قيد الإعلان، تم التسليم، مرتد/مؤجل.
 */

import React, { useMemo } from 'react';
import { Clipboard, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { BailiffPaper } from '../../types';

interface BailiffStatsProps {
  papers: BailiffPaper[];
}

export const BailiffStats = React.memo(function BailiffStats({ papers }: BailiffStatsProps) {
  const stats = useMemo(() => {
    const total = papers.length;
    const inProgress = papers.filter(p => p.status === 'قيد الإعلان والتسليم').length;
    const delivered = papers.filter(p => p.status === 'تم الاستلام والتسليم').length;
    const returned = papers.filter(p => p.status === 'مرتد لعدم الاستدلال' || p.status === 'مؤجل للإعادة').length;
    return { total, inProgress, delivered, returned };
  }, [papers]);

  if (papers.length === 0) return null;

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
      data-testid="bailiff-stats-bar"
    >
      <StatCard
        icon={Clipboard}
        label="إجمالي الإعلانات"
        value={stats.total}
        bgClass="bg-slate-50 border-slate-200"
        textClass="text-slate-900"
        iconClass="text-slate-500"
      />
      <StatCard
        icon={Clock}
        label="قيد الإعلان والتسليم"
        value={stats.inProgress}
        bgClass="bg-indigo-50 border-indigo-200"
        textClass="text-indigo-800"
        iconClass="text-indigo-600"
      />
      <StatCard
        icon={CheckCircle}
        label="تم الاستلام والتسليم"
        value={stats.delivered}
        bgClass="bg-emerald-50 border-emerald-200"
        textClass="text-emerald-800"
        iconClass="text-emerald-600"
      />
      <StatCard
        icon={AlertTriangle}
        label="مرتد / مؤجل"
        value={stats.returned}
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
  icon: Icon, label, value, bgClass, textClass, iconClass,
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
