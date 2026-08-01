/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AgendaView — عرض جدول الأعمال (قائمة مجمّعة بكل الأحداث القادمة).
 *
 * يعرض كل الجلسات + المواعيد + المهام مجمّعة حسب التاريخ،
 * مع شريط بحث + badges لـ "اليوم" و"غداً".
 *
 * كل event يدعم:
 *  - تعديل، حذف، طباعة، تذكير WhatsApp
 *  - إتمام (للمهام/المواعيد)
 *  - تمييز بـ colored bar على اليمين
 */

import React from 'react';
import {
  Search, X, CalendarIcon, Gavel, Edit, Trash2, Printer, MessageSquare, CheckCircle
} from 'lucide-react';
import {
  formatDateStr,
  getDayOfWeekIndex,
  monthNames,
  dayNamesFull
} from './shared';
import { Session, LegalDeadline, LawTask, Case, OfficeProfile } from '../../types';

export interface AgendaEvent {
  date: string;
  type: 'session' | 'deadline' | 'task';
  data: any;
}

export interface AgendaViewProps {
  todayStr: string;
  agendaSearchQuery: string;
  setAgendaSearchQuery: (v: string) => void;
  allAgendaEvents: AgendaEvent[];
  agendaGrouped: Record<string, AgendaEvent[]>;
  cases: Case[];
  officeProfile: OfficeProfile;
  confirm: (msg: string) => Promise<boolean>;
  printSingleSession: (s: Session, c: Case | undefined, op: OfficeProfile) => void;
  getPhoneForSession: (s: Session) => string;
  getPhoneForDeadline: (dl: LegalDeadline) => string;
  sendWhatsAppMessage: (phone: string, text: string) => void;
  getSessionReminderText: (clientName: string, caseNumber: string, date: string, court: string, circuit: string, objective: string) => string;
  getDeadlineReminderText: (clientName: string, title: string, deadlineDate: string, caseNumber: string, lawReference: string) => string;
  openEditSession: (s: Session) => void;
  onDeleteSession: (id: string) => void;
  onToggleDeadlineComplete: (id: string) => void;
  onToggleTaskStatus: (id: string) => void;
}

export default function AgendaView(props: AgendaViewProps) {
  const {
    todayStr, agendaSearchQuery, setAgendaSearchQuery,
    allAgendaEvents, agendaGrouped,
    cases, officeProfile, confirm, printSingleSession,
    getPhoneForSession, getPhoneForDeadline, sendWhatsAppMessage,
    getSessionReminderText, getDeadlineReminderText,
    openEditSession, onDeleteSession, onToggleDeadlineComplete, onToggleTaskStatus
  } = props;

  return (
    <div className="space-y-4">
      {/* Agenda Search & Stats */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute end-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث في الجلسات والمواعيد والمهام..."
              value={agendaSearchQuery}
              onChange={e => setAgendaSearchQuery(e.target.value)}
              className="w-full text-xs pe-9 ps-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-400 transition"
            />
            {agendaSearchQuery && (
              <button onClick={() => setAgendaSearchQuery('')} className="absolute start-3 top-2.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 font-bold shrink-0">
            إجمالي الأحداث: <span className="text-indigo-700">{allAgendaEvents.length}</span>
          </div>
        </div>
      </div>

      {/* Agenda Groups */}
      <div className="space-y-6">
        {Object.entries(agendaGrouped).length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-500">لا يوجد أحداث قادمة</p>
            <p className="text-xs text-slate-400 mt-1">يمكنك إضافة جلسات ومواعيد وأهداف مكتبية</p>
          </div>
        ) : (
          Object.entries(agendaGrouped).map(([date, events]) => {
            const d = new Date(date);
            const isToday = date === todayStr;
            const isTomorrow = date === (() => { const t = new Date(todayStr); t.setDate(t.getDate() + 1); return formatDateStr(t); })();

            return (
              <div key={date}>
                {/* Date Header */}
                <div className={`flex items-center gap-3 mb-3 sticky top-0 z-10 py-2 ${isToday ? 'bg-indigo-50/90' : 'bg-slate-50/90'} rounded-xl px-3`}>
                  <div className={`text-center shrink-0 w-12 ${isToday ? 'text-indigo-700' : 'text-slate-600'}`}>
                    <div className="text-[9px] font-black uppercase">{dayNamesFull[getDayOfWeekIndex(d)]}</div>
                    <div className={`text-2xl font-black leading-none ${isToday ? 'text-indigo-600' : ''}`}>{d.getDate()}</div>
                    <div className="text-[9px] text-slate-400">{monthNames[d.getMonth()]}</div>
                  </div>
                  <div className="flex-1 border-t border-slate-200" />
                  <div className="flex items-center gap-1.5">
                    {isToday && <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">اليوم</span>}
                    {isTomorrow && <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">غداً</span>}
                    <span className="text-[10px] text-slate-400 font-bold">{events.length} حدث</span>
                  </div>
                </div>

                {/* Events for this date */}
                <div className="space-y-2 me-4">
                  {events.map((event, idx) => {
                    if (event.type === 'session') {
                      const s = event.data as Session;
                      return (
                        <div
                          key={`s-${s.id}`}
                          className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-1 rounded-full bg-indigo-500 self-stretch shrink-0 min-h-[40px]" />
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">⚖️ جلسة قضائية</span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.status === 'قادمة' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.status}</span>
                                  {s.googleEventId && <span className="text-[9px] text-blue-500 font-bold">📅 Google</span>}
                                </div>
                                <h4 className="font-black text-sm text-slate-900">{s.court}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                                  {s.time && <span className="font-mono text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded-lg font-bold">{s.time}</span>}
                                  <span>دائرة: {s.circuit || '—'}</span>
                                  <span>الموكل: {s.clientName}</span>
                                  <span>القضية: {s.caseNumber}</span>
                                  {s.judgeName && <span className="text-indigo-600 font-bold"><Gavel className="w-2.5 h-2.5 inline" />{s.judgeName}</span>}
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg">{s.objective}</p>
                                {s.decision && (
                                  <p className="text-xs text-indigo-800 bg-indigo-50 p-2 rounded-lg font-bold">قرار: {s.decision}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => openEditSession(s)} className="text-[10px] font-bold bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-50 flex items-center gap-1">
                                <Edit className="w-3 h-3" /> تعديل
                              </button>
                              <button onClick={async () => { if (await confirm('حذف هذه الجلسة')) onDeleteSession(s.id); }} className="text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-100 flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> حذف
                              </button>
                              {getPhoneForSession(s) && (
                                <button
                                  onClick={() => sendWhatsAppMessage(getPhoneForSession(s), getSessionReminderText(s.clientName, s.caseNumber, s.date, s.court, s.circuit, s.objective))}
                                  className="text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3" /> تذكير
                                </button>
                              )}
                              <button
                                onClick={() => printSingleSession(s, cases.find(c => c.id === s.caseId), officeProfile)}
                                className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-lg hover:bg-indigo-100 flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" /> طباعة
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (event.type === 'deadline') {
                      const dl = event.data as LegalDeadline;
                      return (
                        <div
                          key={`dl-${dl.id}`}
                          className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-rose-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-1 rounded-full bg-rose-500 self-stretch shrink-0 min-h-[40px]" />
                              <div className="space-y-1.5 flex-1">
                                <span className="text-[9px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">🚨 ميعاد إجرائي حاسم</span>
                                <h4 className="font-black text-sm text-slate-900">{dl.title}</h4>
                                <div className="text-[10px] text-slate-500">الموكل: {dl.clientName} | القضية: {dl.caseNumber}</div>
                                <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/50 p-2 rounded-lg">{dl.lawReference}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button
                                onClick={() => onToggleDeadlineComplete(dl.id)}
                                className="text-[10px] font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" /> تأشير بالإتمام
                              </button>
                              {getPhoneForDeadline(dl) && (
                                <button
                                  onClick={() => sendWhatsAppMessage(getPhoneForDeadline(dl), getDeadlineReminderText(dl.clientName, dl.title, dl.deadlineDate, dl.caseNumber, dl.lawReference))}
                                  className="text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-xl hover:bg-emerald-100 flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3" /> تذكير
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (event.type === 'task') {
                      const t = event.data as LawTask;
                      return (
                        <div
                          key={`t-${t.id}`}
                          className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-1 rounded-full bg-blue-500 self-stretch shrink-0 min-h-[40px]" />
                              <div className="space-y-1.5 flex-1">
                                <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">📋 مهمة مكتبية</span>
                                <h4 className="font-black text-sm text-slate-900">{t.title}</h4>
                                <p className="text-xs text-slate-600">{t.description}</p>
                                <div className="text-[10px] text-slate-500">المسؤول: {t.assignedTo}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => onToggleTaskStatus(t.id)}
                              className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-xl hover:bg-blue-700 flex items-center gap-1 shrink-0"
                            >
                              <CheckCircle className="w-3 h-3" /> إتمام
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
