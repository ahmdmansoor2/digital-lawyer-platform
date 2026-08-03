/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DocketDetailModal — modal عرض تفاصيل موعد واحد من DocketMaster.
 *
 * المميزات:
 *  - عرض كل بيانات الموعد (جلسة/ميعاد/مهمة) بشكل منظّم
 *  - أزرار: تعديل، حذف (مع تأكيد)، طباعة، نسخ نص، تمييز كمكتمل
 *  - رابط سريع للقضية المعنية
 *  - يستخدم Portal لتفادي مشاكل stacking
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { exportHtmlToPdf } from '../../utils/pdfExportHelper';
import {
  X, Edit3, Trash2, Printer, Copy, Check, ExternalLink,
  Calendar, AlertTriangle, FileText, Briefcase, Users,
  Clock, MapPin, Gavel, Hash, BookOpen, Flag
} from 'lucide-react';
import {
  Session, LegalDeadline, LawTask, Case, Client, OfficeProfile
} from '../../types';
import type { DocketItem, DocketItemType } from './DocketMaster';
import { sanitizeHtml } from '../../utils/sanitizer';

interface DocketDetailModalProps {
  item: DocketItem | null;
  // data lookups (optional, for richer display)
  session?: Session;
  deadline?: LegalDeadline;
  task?: LawTask;
  caseObj?: Case;
  clientObj?: Client;
  officeProfile: OfficeProfile;

  // ─── Actions ───────────────────────────────────────────────────────────
  onClose: () => void;
  onEdit?: (item: DocketItem) => void;
  onDelete?: (item: DocketItem) => void;
  onToggleComplete?: (item: DocketItem) => void;
  onNavigateToCase?: (caseId: string) => void;
  onPrint?: (item: DocketItem) => void;
}

const TYPE_META: Record<DocketItemType, { label: string; color: string; bg: string; icon: any }> = {
  session:  { label: 'جلسة',   color: 'text-indigo-700',  bg: 'bg-indigo-50',  icon: Calendar },
  deadline: { label: 'ميعاد',  color: 'text-rose-700',   bg: 'bg-rose-50',   icon: AlertTriangle },
  task:     { label: 'مهمة',   color: 'text-blue-700',   bg: 'bg-blue-50',   icon: FileText }
};

export default function DocketDetailModal({
  item,
  session, deadline, task, caseObj, clientObj, officeProfile,
  onClose, onEdit, onDelete, onToggleComplete, onNavigateToCase, onPrint
}: DocketDetailModalProps) {

  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!item) return;
    const handler = (e: PointerEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener('pointerdown', handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', handler);
    };
  }, [item, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [item, onClose]);

  if (!item) return null;

  const meta = TYPE_META[item.type];
  const Icon = meta.icon;

  // ─── Build copy text ──────────────────────────────────────────────────
  function buildCopyText(): string {
    const lines: string[] = [];
    lines.push(`${meta.label}: ${item.title}`);
    lines.push(`التاريخ: ${item.date}`);
    if (item.caseNumber) lines.push(`القضية: ${item.caseNumber}`);
    if (item.clientName) lines.push(`الموكل: ${item.clientName}`);
    if (item.court) lines.push(`المحكمة: ${item.court}`);
    if (item.status) lines.push(`الحالة: ${item.status}`);
    if (item.description) lines.push(`الوصف: ${item.description}`);
    return lines.join('\n');
  }

  function handleCopy() {
    const text = buildCopyText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      // Fallback for older browsers / Electron
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1500); }
      catch (e) { /* ignore */ }
      ta.remove();
    });
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    onDelete?.(item);
    onClose();
  }

  function handlePrint() {
    onPrint?.(item);
  }

  function handleEdit() {
    onEdit?.(item);
  }

  function handleToggleComplete() {
    onToggleComplete?.(item);
    onClose();
  }

  function handleNavigateToCase() {
    if (item.caseId) onNavigateToCase?.(item.caseId);
    onClose();
  }

  // ─── Render session-specific fields ───────────────────────────────────
  function renderSessionFields() {
    if (item.type !== 'session' || !session) return null;
    return (
      <>
        <FieldRow icon={<Hash className="w-4 h-4" />} label="رقم القضية">
          {session.caseNumber}
        </FieldRow>
        <FieldRow icon={<Gavel className="w-4 h-4" />} label="المحكمة">
          {session.court}
        </FieldRow>
        {session.circuit && (
          <FieldRow icon={<Gavel className="w-4 h-4" />} label="الدائرة">
            دائرة {session.circuit}
          </FieldRow>
        )}
        {session.judgeName && (
          <FieldRow icon={<Users className="w-4 h-4" />} label="السيد القاضي">
            {session.judgeName}
          </FieldRow>
        )}
        {session.time && (
          <FieldRow icon={<Clock className="w-4 h-4" />} label="الموعد">
            {session.time}
          </FieldRow>
        )}
        {session.objective && (
          <FieldRow icon={<BookOpen className="w-4 h-4" />} label="الموضوع">
            <div className="whitespace-pre-wrap text-slate-800" dangerouslySetInnerHTML={{ __html: sanitizeHtml(session.objective) }} />
          </FieldRow>
        )}
        {session.decision && (
          <FieldRow icon={<Flag className="w-4 h-4" />} label="القرار">
            {session.decision}
          </FieldRow>
        )}
      </>
    );
  }

  // ─── Render deadline-specific fields ───────────────────────────────────
  function renderDeadlineFields() {
    if (item.type !== 'deadline' || !deadline) return null;
    return (
      <>
        <FieldRow icon={<Hash className="w-4 h-4" />} label="رقم القضية">
          {deadline.caseNumber}
        </FieldRow>
        {deadline.lawReference && (
          <FieldRow icon={<BookOpen className="w-4 h-4" />} label="السند القانوني">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(deadline.lawReference) }} />
          </FieldRow>
        )}
        <FieldRow icon={<Clock className="w-4 h-4" />} label="تاريخ الانتهاء">
          {deadline.deadlineDate}
        </FieldRow>
        <FieldRow icon={<Flag className="w-4 h-4" />} label="الحالة">
          {deadline.isCompleted ? '✓ مكتمل' : '⏳ معلق'}
        </FieldRow>
      </>
    );
  }

  // ─── Render task-specific fields ───────────────────────────────────────
  function renderTaskFields() {
    if (item.type !== 'task' || !task) return null;
    return (
      <>
        <FieldRow icon={<Hash className="w-4 h-4" />} label="رقم القضية">
          {task.caseNumber}
        </FieldRow>
        {task.assignedTo && (
          <FieldRow icon={<Users className="w-4 h-4" />} label="مسند إلى">
            {task.assignedTo}
          </FieldRow>
        )}
        <FieldRow icon={<Clock className="w-4 h-4" />} label="تاريخ الاستحقاق">
          {task.dueDate}
        </FieldRow>
        <FieldRow icon={<Flag className="w-4 h-4" />} label="الحالة">
          {task.status === 'pending' ? '⏳ معلق' :
           task.status === 'completed' ? '✓ مكتمل' : task.status}
        </FieldRow>
        {task.description && (
          <FieldRow icon={<BookOpen className="w-4 h-4" />} label="الوصف">
            <div className="whitespace-pre-wrap text-slate-800">{task.description}</div>
          </FieldRow>
        )}
      </>
    );
  }

  // ─── Build printable HTML ──────────────────────────────────────────────
  function buildPrintableHtml(): string {
    const rows: string[] = [];
    rows.push(`<tr><th>البند</th><th>القيمة</th></tr>`);
    rows.push(`<tr><td>النوع</td><td>${meta.label}</td></tr>`);
    rows.push(`<tr><td>العنوان</td><td>${item.title}</td></tr>`);
    rows.push(`<tr><td>التاريخ</td><td>${item.date}</td></tr>`);
    if (item.caseNumber) rows.push(`<tr><td>القضية</td><td>${item.caseNumber}</td></tr>`);
    if (item.clientName) rows.push(`<tr><td>الموكل</td><td>${item.clientName}</td></tr>`);
    if (item.court) rows.push(`<tr><td>المحكمة</td><td>${item.court}</td></tr>`);
    if (item.status) rows.push(`<tr><td>الحالة</td><td>${item.status}</td></tr>`);
    if (item.description) rows.push(`<tr><td>الوصف</td><td>${item.description}</td></tr>`);

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${item.title}</title>
<style>
  body { font-family: 'Cairo', 'Tajawal', sans-serif; padding: 30px; color: #1e293b; }
  h1 { color: #4338ca; border-bottom: 3px solid #4338ca; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; }
  th { background: #f1f5f9; font-weight: 800; }
  .footer { margin-top: 30px; font-size: 12px; color: #64748b; text-align: center; }
</style>
</head>
<body>
  <h1>${meta.label}: ${item.title}</h1>
  <table>${rows.join('')}</table>
  <div class="footer">
    ${officeProfile.officeName} • ${new Date().toLocaleString('ar-EG')}
  </div>
</body>
</html>`;
  }

  function handlePrintDirect() {
    const html = buildPrintableHtml();
    const w = window.open('', '_blank', 'width=800,height=900');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 300);
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className={`${meta.bg} px-5 py-4 border-b border-slate-200 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${meta.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[10px] font-black uppercase tracking-wider ${meta.color}`}>
              {meta.label}
            </div>
            <h2 className="text-base font-black text-slate-900 truncate">{item.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/60 rounded-lg text-slate-600"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Case link */}
          {item.caseId && (
            <button
              onClick={handleNavigateToCase}
              className="w-full text-end bg-indigo-50 border border-indigo-200 rounded-xl p-3 hover:bg-indigo-100 transition flex items-center gap-3"
            >
              <Briefcase className="w-4 h-4 text-indigo-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-indigo-600">القضية</div>
                <div className="text-sm font-black text-indigo-900 truncate">
                  {item.caseNumber || '—'} {clientObj ? `• ${clientObj.name}` : ''}
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-indigo-500 shrink-0" />
            </button>
          )}

          {/* Fields */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            {renderSessionFields()}
            {renderDeadlineFields()}
            {renderTaskFields()}
          </div>

          {/* Toggle complete for tasks/deadlines */}
          {(item.type === 'task' || item.type === 'deadline') && onToggleComplete && (
            <button
              onClick={handleToggleComplete}
              className="w-full text-end bg-emerald-50 border border-emerald-200 rounded-xl p-3 hover:bg-emerald-100 transition flex items-center gap-3"
            >
              <Check className="w-4 h-4 text-emerald-700" />
              <div className="flex-1 text-sm font-black text-emerald-900">
                تمييز كمكتمل
              </div>
            </button>
          )}
        </div>

        {/* Action bar */}
        <div className="border-t border-slate-200 p-3 bg-slate-50 flex flex-wrap items-center gap-2">
          {onEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 transition"
            >
              <Edit3 className="w-3.5 h-3.5" /> تعديل
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-200 text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-300 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'تم النسخ' : 'نسخ'}
          </button>
          <button
            onClick={onPrint ? handlePrint : handlePrintDirect}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-200 text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-300 transition"
          >
            <Printer className="w-3.5 h-3.5" /> طباعة
          </button>
            <button
              onClick={() => {
                const html = buildPrintableHtml();
                exportHtmlToPdf(
                  `${item.type === 'session' ? 'جلسة' : item.type === 'deadline' ? 'ميعاد' : 'مهمة'}: ${item.title}`,
                  html,
                  `${item.type === 'session' ? 'session' : item.type === 'deadline' ? 'deadline' : 'task'}_${item.id.slice(-8)}.pdf`
                );
              }}
              className="flex items-center gap-1.5 text-xs font-bold bg-rose-600 text-white px-3 py-2 rounded-xl hover:bg-rose-700 transition"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition mr-auto ${
                confirmDelete
                  ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete ? 'تأكيد الحذف؟' : 'حذف'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// ─── Sub-component ──────────────────────────────────────────────────────

function FieldRow({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <div className="text-slate-400 mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
          {label}
        </div>
        <div className="text-slate-800 font-bold break-words">
          {children}
        </div>
      </div>
    </div>
  );
}






