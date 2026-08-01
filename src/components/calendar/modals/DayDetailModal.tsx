/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DayDetailModal — نافذة تفاصيل اليوم.
 *
 * تُفتح عند النقر على خلية يوم في الـ Month/Week view.
 * تعرض كل أحداث اليوم: جلسات + مواعيد + مهام.
 * تسمح بإتمام المهام/المواعيد، تعديل الجلسات، أو الانتقال إلى الـ Day view.
 */

import React, { useMemo } from 'react';
import {
  X, CalendarIcon, CalendarRange, Gavel, AlertTriangle, ListTodo,
  CheckCircle2, Plus, AlertOctagon
} from 'lucide-react';
import { Session, LegalDeadline, LawTask } from '../../../types';
import { detectSessionConflicts, getConflictingSessionIds } from '../../../utils/conflictDetection';

export interface DayEvents {
  date: string;
  sessions: Session[];
  deadlines: LegalDeadline[];
  tasks: LawTask[];
}

export interface DayDetailModalProps {
  selectedDay: DayEvents | null;
  onClose: () => void;
  getTotalCount: (ev: DayEvents) => number;
  onToggleDeadlineComplete: (id: string) => void;
  onToggleTaskStatus: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenEditSession: (s: Session) => void;
  confirm: (msg: string) => Promise<boolean>;
  // Navigation helpers
  setFocusDate: (d: Date) => void;
  setCurrentView: (v: 'month' | 'week' | 'day' | 'agenda') => void;
  setSessionForm: (v: any) => void;
  setIsAddingSession: (v: boolean) => void;
}

export default function DayDetailModal(props: DayDetailModalProps) {
  const {
    selectedDay, onClose, getTotalCount, onToggleDeadlineComplete,
    onToggleTaskStatus, onDeleteSession, onOpenEditSession, confirm,
    setFocusDate, setCurrentView, setSessionForm, setIsAddingSession
  } = props;

  // v2.8.5: detect conflicts among the day's sessions
  const conflictingSessionIds = useMemo(
    () => getConflictingSessionIds(detectSessionConflicts(selectedDay?.sessions || [])),
    [selectedDay]
  );

  if (!selectedDay) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-200" />
                أحداث يوم {selectedDay.date}
              </h2>
              <p className="text-[11px] text-indigo-200 mt-1">
                {selectedDay.sessions.length} جلسة | {selectedDay.deadlines.length} ميعاد | {selectedDay.tasks.length} مهمة
              </p>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" dir="rtl">
          {getTotalCount(selectedDay) === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">يوم هادئ وخالٍ من الالتزامات</p>
            </div>
          ) : (
            <>
              {selectedDay.sessions.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-indigo-700 flex items-center gap-1.5 mb-2">
                    <Gavel className="w-3.5 h-3.5" /> الجلسات ({selectedDay.sessions.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.sessions.map(s => {
                      const hasConflict = conflictingSessionIds.has(s.id);
                      return (
                      <div key={s.id} className={`p-3 rounded-2xl space-y-1.5 ${
                        hasConflict
                          ? 'bg-red-50 border-2 border-red-400'
                          : 'bg-indigo-50 border border-indigo-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-sm text-slate-900">{s.court}</span>
                            {s.time && <span className="text-[9px] font-mono text-indigo-700 bg-indigo-100/60 me-1 px-1 py-0.5 rounded">{s.time}</span>}
                            {hasConflict && (
                              <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 me-1" title="تعارض مع جلسة أخرى في نفس الموعد">
                                <AlertOctagon className="w-2.5 h-2.5" /> تعارض
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{s.caseNumber}</span>
                        </div>
                        {s.judgeName && <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1"><Gavel className="w-2.5 h-2.5" />القاضي: {s.judgeName}</p>}
                        <p className="text-xs text-slate-600">{s.objective}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">{s.clientName}</span>
                          <div className="flex gap-1">
                            <button onClick={() => { onClose(); onOpenEditSession(s); }} className="text-[9px] font-bold bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg hover:bg-slate-50">تعديل</button>
                            <button onClick={async () => { if (await confirm('حذف الجلسة')) { onDeleteSession(s.id); onClose(); } }} className="text-[9px] font-bold bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded-lg">حذف</button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDay.deadlines.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-rose-700 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> المواعيد القانونية ({selectedDay.deadlines.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.deadlines.map(dl => (
                      <div key={dl.id} className={`p-3 rounded-2xl space-y-1.5 border ${dl.isCompleted ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-rose-50 border-rose-200'}`}>
                        <div className="flex justify-between">
                          <span className={`font-black text-sm ${dl.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>{dl.title}</span>
                          {dl.isCompleted && <span className="text-[9px] text-emerald-600 font-black">تم ✓</span>}
                        </div>
                        <p className="text-[10px] text-slate-500">{dl.clientName} | {dl.caseNumber}</p>
                        <button
                          onClick={() => onToggleDeadlineComplete(dl.id)}
                          className={`text-[10px] font-bold px-3 py-1 rounded-lg transition ${dl.isCompleted ? 'bg-slate-200 text-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        >
                          {dl.isCompleted ? 'تراجع عن الإتمام' : 'تأشير بالإتمام'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDay.tasks.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-blue-700 flex items-center gap-1.5 mb-2">
                    <ListTodo className="w-3.5 h-3.5" /> المهام ({selectedDay.tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.tasks.map(t => (
                      <div key={t.id} className={`p-3 rounded-2xl space-y-1.5 border ${t.status === 'completed' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-blue-50 border-blue-200'}`}>
                        <span className={`font-black text-sm block ${t.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>{t.title}</span>
                        <p className="text-[10px] text-slate-500">{t.description}</p>
                        <button
                          onClick={() => onToggleTaskStatus(t.id)}
                          className={`text-[10px] font-bold px-3 py-1 rounded-lg transition ${t.status === 'completed' ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          {t.status === 'completed' ? 'تراجع' : 'إتمام المهمة'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={() => { setFocusDate(new Date(selectedDay.date)); setCurrentView('day'); onClose(); }}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
          >
            <CalendarRange className="w-3.5 h-3.5" /> عرض اليوم التفصيلي
          </button>
          <button
            onClick={() => { setSessionForm({ caseId: '', date: selectedDay.date, court: '', circuit: '', objective: '', status: 'قادمة', judgeName: '', notes: '' }); onClose(); setIsAddingSession(true); }}
            className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> إضافة جلسة
          </button>
        </div>
      </div>
    </div>
  );
}
