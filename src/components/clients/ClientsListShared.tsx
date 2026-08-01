/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClientsListShared.tsx — Components و types مشتركة في ClientsList.
 *
 * v2.9.1: استخراج من ClientsList.tsx (2171 سطر) لتسهيل الصيانة.
 *
 * يحتوي على:
 *  - ActionBtn, ActionBtnSmall: small button components مع 5 ألوان
 *  - types مشتركة (PoaFormData, ClientFormData)
 */

import React from 'react';

// ─── Shared types ───────────────────────────────────────────────────────────

export type ActionBtnColor = 'slate' | 'indigo' | 'red' | 'blue' | 'emerald';

export interface ClientFormData {
  name: string;
  phone: string;
  nationalId: string;
  address: string;
  email: string;
  notes: string;
  fileNumber: string;
  initialPoaNumber: string;
  initialPoaOffice: string;
  initialPoaType: 'عام قضايا' | 'خاص قضايا' | 'توكيل شامل';
}

export interface PoaFormData {
  poaNumber: string;
  office: string;
  type: 'عام قضايا' | 'خاص قضايا' | 'توكيل شامل';
  date: string;
}

// ─── Action buttons (used in cards and drawer) ────────────────────────────

export const ActionBtn = ({
  icon: Icon,
  onClick,
  title,
  color,
}: {
  icon: any;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  color: ActionBtnColor;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2 border rounded-lg transition cursor-pointer flex items-center justify-center shrink-0 ${
      color === 'slate'
        ? 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-slate-50/50'
        : color === 'indigo'
        ? 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-indigo-50/15'
        : color === 'red'
        ? 'border-red-200 text-red-600 hover:bg-red-50'
        : color === 'emerald'
        ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/15'
        : 'border-blue-200 text-blue-600 hover:bg-blue-50 bg-blue-50/15'
    }`}
    title={title}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);

export const ActionBtnSmall = ({
  icon: Icon,
  onClick,
  title,
  color,
}: {
  icon: any;
  onClick: () => void;
  title: string;
  color: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-1.5 rounded-lg transition cursor-pointer ${
      color === 'slate'
        ? 'text-slate-500 hover:bg-slate-100'
        : color === 'indigo'
        ? 'text-indigo-600 hover:bg-indigo-50'
        : color === 'emerald'
        ? 'text-emerald-600 hover:bg-emerald-50'
        : 'text-slate-500 hover:bg-slate-100'
    }`}
    title={title}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);
