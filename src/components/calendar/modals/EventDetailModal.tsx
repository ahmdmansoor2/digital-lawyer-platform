/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EventDetailModal — نافذة تفاصيل الحدث الواحد.
 *
 * تُفتح عند النقر على pill (شريط ملوّن) في الـ calendar.
 * تعرض تفاصيل الجلسة أو الميعاد أو المهمة، مع أزرار:
 *  - تعديل، حذف، طباعة، تذكير WhatsApp، مزامنة Google، إتمام
 */

import React from 'react';
import { X, Gavel, Printer, Trash2, Edit } from 'lucide-react';
import { Session, LegalDeadline, LawTask, Case, OfficeProfile } from '../../../types';

export interface SelectedEvent {
  type: 'session' | 'deadline' | 'task';
  data: any;
}

export interface EventDetailModalProps {
  selectedEvent: SelectedEvent | null;
  onClose: () => void;
  onOpenEditSession: (s: Session) => void;
  onDeleteSession: (id: string) => void;
  onToggleDeadlineComplete: (id: string) => void;
  onToggleTaskStatus: (id: string) => void;
  cases: Case[];
  officeProfile: OfficeProfile;
  printSingleSession: (s: Session, c: Case | undefined, op: OfficeProfile) => void;
  getPhoneForSession: (s: Session) => string;
  getPhoneForDeadline: (dl: LegalDeadline) => string;
  sendWhatsAppMessage: (phone: string, text: string) => void;
  getSessionReminderText: (clientName: string, caseNumber: string, date: string, court: string, circuit: string, objective: string) => string;
  getDeadlineReminderText: (clientName: string, title: string, deadlineDate: string, caseNumber: string, lawReference: string) => string;
  confirm: (msg: string) => Promise<boolean>;
}

export default function EventDetailModal(props: EventDetailModalProps) {
  const {
    selectedEvent, onClose, onOpenEditSession, onDeleteSession,
    onToggleDeadlineComplete, onToggleTaskStatus, cases, officeProfile,
    printSingleSession, getPhoneForSession, getPhoneForDeadline,
    sendWhatsAppMessage, getSessionReminderText, getDeadlineReminderText, confirm
  } = props;

  if (!selectedEvent) return null;

  const borderClass =
    selectedEvent.type === 'session' ? 'border-indigo-300' :
    selectedEvent.type === 'deadline' ? 'border-rose-300' : 'border-blue-300';

  const headerBg =
    selectedEvent.type === 'session' ? 'bg-indigo-600' :
    selectedEvent.type === 'deadline' ? 'bg-rose-600' : 'bg-blue-600';

  const typeLabel =
    selectedEvent.type === 'session' ? '⚖️ جلسة قضائية' :
    selectedEvent.type === 'deadline' ? '🚨 ميعاد إجرائي' : '📋 مهمة مكتبية';

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 ${borderClass}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-5 ${headerBg} text-white`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{typeLabel}</span>
              <h3 className="font-black text-base mt-2">
                {selectedEvent.type === 'session' ? (selectedEvent.data as Session).court :
                 selectedEvent.type === 'deadline' ? (selectedEvent.data as LegalDeadline).title :
                 (selectedEvent.data as LawTask).title}
              </h3>
            </div>
            <button onClick={onClose} className="bg-white/20 p-1.5 rounded-full hover:bg-white/30">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3" dir="rtl">
          {selectedEvent.type === 'session' && (() => {
            const s = selectedEvent.data as Session;
            return (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">تاريخ الجلسة</div>
                    <div className="font-black text-slate-800">{s.date}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">الوقت</div>
                    <div className="font-black text-slate-800 font-mono">{s.time || '—'}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">الدائرة</div>
                    <div className="font-black text-slate-800">{s.circuit || '—'}</div>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-xl">
                    <div className="text-indigo-400 font-bold mb-1">اسم القاضي</div>
                    <div className="font-black text-indigo-800">{s.judgeName || '—'}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">الموكل</div>
                    <div className="font-black text-slate-800">{s.clientName}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">رقم القضية</div>
                    <div className="font-black text-slate-800 font-mono">{s.caseNumber}</div>
                  </div>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs">
                  <div className="text-indigo-700 font-black mb-1">المطلوب بالجلسة:</div>
                  <div className="text-slate-700 leading-relaxed">{s.objective}</div>
                </div>
                {s.notes && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                    <div className="text-slate-500 font-black mb-1">ملاحظات:</div>
                    <div className="text-slate-700 leading-relaxed">{s.notes}</div>
                  </div>
                )}
                {s.decision && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs">
                    <div className="text-emerald-700 font-black mb-1">قرار المحكمة:</div>
                    <div className="text-slate-700 leading-relaxed">{s.decision}</div>
                  </div>
                )}
                <div className="flex gap-2 pt-2 flex-wrap">
                  <button onClick={() => { onClose(); onOpenEditSession(s); }} className="flex-1 text-xs font-bold bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700">
                    تعديل الجلسة
                  </button>
                  {getPhoneForSession(s) && (
                    <button
                      onClick={() => sendWhatsAppMessage(getPhoneForSession(s), getSessionReminderText(s.clientName, s.caseNumber, s.date, s.court, s.circuit, s.objective))}
                      className="flex-1 text-xs font-bold bg-emerald-600 text-white py-2 rounded-xl hover:bg-emerald-700"
                    >
                      تذكير الموكل
                    </button>
                  )}
                  <button
                    onClick={() => printSingleSession(s, cases.find(c => c.id === s.caseId), officeProfile)}
                    className="flex-1 text-xs font-bold bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" /> طباعة المحضر
                  </button>
                  <button
                    onClick={async () => { if (await confirm('حذف هذه الجلسة')) { onClose(); onDeleteSession(s.id); } }}
                    className="flex-1 text-xs font-bold bg-rose-600 text-white py-2 rounded-xl hover:bg-rose-700 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف الجلسة
                  </button>
                </div>
              </>
            );
          })()}

          {selectedEvent.type === 'deadline' && (() => {
            const dl = selectedEvent.data as LegalDeadline;
            return (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">الموكل</div>
                    <div className="font-black text-slate-800">{dl.clientName}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">رقم القضية</div>
                    <div className="font-black text-slate-800 font-mono">{dl.caseNumber}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">بدء الميعاد</div>
                    <div className="font-black text-slate-800">{dl.startDate}</div>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-xl">
                    <div className="text-rose-600 font-bold mb-1">انتهاء الميعاد</div>
                    <div className="font-black text-rose-800">{dl.deadlineDate}</div>
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs">
                  <div className="text-rose-700 font-black mb-1">السند القانوني:</div>
                  <div className="text-slate-700 leading-relaxed">{dl.lawReference}</div>
                </div>
                <button
                  onClick={() => { onToggleDeadlineComplete(dl.id); onClose(); }}
                  className={`w-full text-xs font-bold py-2.5 rounded-xl transition ${dl.isCompleted ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                >
                  {dl.isCompleted ? 'إلغاء التأشير' : '✓ تأشير بالإتمام'}
                </button>
              </>
            );
          })()}

          {selectedEvent.type === 'task' && (() => {
            const t = selectedEvent.data as LawTask;
            return (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">تاريخ الاستحقاق</div>
                    <div className="font-black text-slate-800">{t.dueDate}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-slate-400 font-bold mb-1">المسؤول</div>
                    <div className="font-black text-slate-800">{t.assignedTo}</div>
                  </div>
                </div>
                {t.description && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs">
                    <div className="text-blue-700 font-black mb-1">التفاصيل:</div>
                    <div className="text-slate-700 leading-relaxed">{t.description}</div>
                  </div>
                )}
                <button
                  onClick={() => { onToggleTaskStatus(t.id); onClose(); }}
                  className={`w-full text-xs font-bold py-2.5 rounded-xl transition ${t.status === 'completed' ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {t.status === 'completed' ? 'إلغاء الإتمام' : '✓ إتمام المهمة'}
                </button>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
