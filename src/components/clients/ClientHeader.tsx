/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClientHeader.tsx — Header bar مع title + description + add client button.
 *
 * v2.9.7: استخراج من ClientsList.tsx (1875 سطر) لتسهيل الصيانة.
 */

import React from 'react';
import { Users, Plus } from 'lucide-react';

export interface ClientHeaderProps {
  onAddClient: () => void;
}

const ClientHeader = React.memo(function ClientHeader({ onAddClient }: ClientHeaderProps) {
  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
      <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12" />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
              مكتب المحامي الرقمي المحترف
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
              دليل الموكلين النشطين
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" />
            دليل الموكلين والشركات
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            فهرس هويات الموكلين المسجلين بالمكتب وحفظ التوكيلات المودعة وسندات الحضور الرسمية ومتابعة حسابات الموكلين.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto z-10">
          <button
            type="button"
            onClick={onAddClient}
            className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md rounded-2xl px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
            id="btn-add-client-panel"
          >
            <Plus className="h-4 w-4" />
            إضافة موكل وتوثيق جديد
          </button>
        </div>
      </div>
    </div>
  );
});

export default ClientHeader;
