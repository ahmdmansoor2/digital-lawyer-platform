/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WhatsNewModal — يعرض المميزات الجديدة لما المستخدم يفتح إصدار جديد.
 *
 * v2.8.7: ميزة جديدة — المستخدم يكتشف المميزات الجديدة تلقائياً.
 *
 * الـ logic:
 * 1. localStorage يحفظ `lawfirm_last_seen_version`
 * 2. لما الـ version الحالي > آخر إصدار شافه المستخدم → يعرض الـ modal
 * 3. المستخدم يقدر يـ "حسناً" (يحفظ) أو "تذكير لاحقاً" (ما يحفظش)
 */

import React, { useState } from 'react';
import { Sparkles, X, FileDown, AlertOctagon, Shield } from 'lucide-react';
import packageJson from '../../package.json';

const STORAGE_KEY = 'lawfirm_last_seen_version';
const CURRENT_VERSION = packageJson.version;

export interface WhatsNewItem {
  version: string;
  title: string;
  items: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
}

export const WHATS_NEW: WhatsNewItem[] = [
  {
    version: '2.8.5 + 2.8.6',
    title: 'كشف تعارض المواعيد ⚠️',
    items: [
      {
        icon: <AlertOctagon className="w-4 h-4 text-red-600" />,
        title: 'تحذير تلقائي للجلسات المتعارضة',
        description: 'النظام بيكتشف لو عندك جلستين في نفس الوقت أو في نفس اليوم بدون وقت محدد. بيظهر Banner أحمر + شارة "تعارض" في Docket وفي Calendar.',
      },
    ],
  },
  {
    version: '2.8.4',
    title: 'تصدير PDF من Docket 📄',
    items: [
      {
        icon: <FileDown className="w-4 h-4 text-rose-600" />,
        title: 'زر PDF في كل بند',
        description: 'في Docket، كل بند (جلسة/ميعاد/مهمة) دلوقتي فيه زر PDF سريع. كمان في الـ dropdown menu تحت "طباعة".',
      },
    ],
  },
  {
    version: '2.8.1 → 2.8.3',
    title: 'إصلاحات وتحسينات هيكلية 🛠️',
    items: [
      {
        icon: <Shield className="w-4 h-4 text-emerald-600" />,
        title: 'PDF Export تم إصلاحه',
        description: 'كان بيكسر في الإصدارات السابقة. دلوقتي شغّال 100% في CaseDetailModal و DocketDetailModal و DocketItemRow.',
      },
      {
        icon: <Shield className="w-4 h-4 text-emerald-600" />,
        title: 'App.tsx بقى أنظف (-23%)',
        description: 'استخرجنا 12 entity في useAppData hook مركزي. كود أنظف، أسرع، وأسهل في الصيانة.',
      },
    ],
  },
];

interface WhatsNewModalProps {
  onClose: () => void;
}

export default function WhatsNewModal({ onClose }: WhatsNewModalProps) {
  const [remindLater, setRemindLater] = useState(false);

  function handleDismiss(markSeen: boolean) {
    if (markSeen) {
      try { localStorage.setItem(STORAGE_KEY, CURRENT_VERSION); } catch { /* ignore */ }
    } else {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-[60] p-4" onClick={() => handleDismiss(true)}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-600 to-purple-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">ما الجديد في {CURRENT_VERSION}</h2>
              <p className="text-xs text-indigo-100 mt-0.5">آخر تحديث: 22 يوليو 2026</p>
            </div>
          </div>
          <button
            onClick={() => handleDismiss(true)}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[60vh] p-5 space-y-5">
          {WHATS_NEW.map((section) => (
            <div key={section.version}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  v{section.version}
                </span>
                <h3 className="text-sm font-black text-slate-800">{section.title}</h3>
              </div>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex items-center justify-between gap-2 bg-slate-50">
          <button
            onClick={() => setRemindLater(!remindLater)}
            className="text-xs text-slate-600 hover:text-slate-800 font-bold"
          >
            {remindLater ? '✓' : '○'} ذكرني لاحقاً (يظهر في الجلسة القادمة)
          </button>
          <button
            onClick={() => handleDismiss(!remindLater)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-5 py-2 rounded-xl transition"
          >
            حسناً، فهمت
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook لعرض الـ modal مرة واحدة لكل إصدار جديد.
 */
export function useWhatsNew(): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      return lastSeen !== CURRENT_VERSION;
    } catch {
      return false;
    }
  });

  const close = () => setOpen(false);
  return [open, close];
}
