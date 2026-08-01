/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ActionBtn.tsx — أزرار الإجراءات الموحدة لبطاقات وصفوف جدول القضايا.
 *
 * مستخرجة من CasesList.tsx v2.9.6 (2211 سطر) لتجنب التكرار.
 * متطابقة 100% بصرياً ووظيفياً مع النسخ الداخلية القديمة.
 */

import React from 'react';

export type ActionBtnColor = 'slate' | 'indigo' | 'red' | 'blue';

interface ActionBtnProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  color: ActionBtnColor;
}

/**
 * زر إجراء بحجم كامل (يحوي أيقونة فقط).
 * يُستخدم في بطاقات القضايا (grid view) والشريط السفلي للـ drawer.
 */
export const ActionBtn = React.memo(function ActionBtn({
  icon: Icon,
  onClick,
  title,
  color,
}: ActionBtnProps) {
  return (
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
          : 'border-blue-200 text-blue-600 hover:bg-blue-50 bg-blue-50/15'
      }`}
      title={title}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
});

interface ActionBtnSmallProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  title: string;
  color: string;
}

/**
 * زر إجراء مصغّر (يستخدم في list/table view لتوفير المساحة).
 */
export const ActionBtnSmall = React.memo(function ActionBtnSmall({
  icon: Icon,
  onClick,
  title,
  color,
}: ActionBtnSmallProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-lg transition cursor-pointer ${
        color === 'slate'
          ? 'text-slate-500 hover:bg-slate-100'
          : color === 'indigo'
          ? 'text-indigo-600 hover:bg-indigo-50'
          : 'text-slate-500 hover:bg-slate-100'
      }`}
      title={title}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
});
