/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DayView — عرض اليوم الواحد بتفاصيله الكاملة.
 *
 * مقسوم إلى عمودين:
 *  - Timeline (lg:col-span-2): جدول اليوم بالساعات (13 ساعة) + جلسات/مواعيد/مهام
 *  - Sidebar:
 *    - Mini Calendar للتنقل بين الأيام
 *    - Quick Upcoming (الأحداث في الـ 7 أيام القادمة)
 *
 * كل خلية في الـ Timeline تدعم:
 *  - عرض الـ event pills
 *  - النقر لفتح EventDetailModal
 *  - النقر على مساحة فارغة → فتح نموذج إضافة جلسة
 *  - أزرار: تعديل، حذف، طباعة لكل جلسة
 */

import React from 'react';
import {
  Clock, Plus, Gavel, AlertTriangle, Edit, Trash2, Printer,
  ChevronLeft, ChevronRight, Bell
} from 'lucide-react';
import {
  formatDateStr,
  getDayOfWeekIndex,
  getHourSlot,
  monthNames,
  dayNamesFull,
  dayNamesShort,
  hours,
  type DayEvents
} from './shared';
import { Session, LegalDeadline, LawTask, Case, OfficeProfile } from '../../types';

export interface DayViewProps {
  focusDate: Date;
  today: Date;
  todayStr: string;
  getDayEvents: (dateStr: string) => DayEvents;
  getDayEventsUnfiltered: (dateStr: string) => DayEvents;
  getTotalCount: (ev: DayEvents) => number;
  getMonthDays: (date: Date) => (Date | null)[];
  cases: Case[];
  officeProfile: OfficeProfile;
  allAgendaEvents: Array<{ date: string; type: 'session' | 'deadline' | 'task'; data: any }>;
  confirm: (msg: string) => Promise<boolean>;
  printSingleSession: (s: Session, c: Case | undefined, op: OfficeProfile) => void;
  setFocusDate: (d: Date) => void;
  setSessionForm: (v: any) => void;
  setIsAddingSession: (v: boolean) => void;
  openEditSession: (s: Session) => void;
  onDeleteSession: (id: string) => void;
  onToggleDeadlineComplete: (id: string) => void;
  onToggleTaskStatus: (id: string) => void;
}

export default function DayView(props: DayViewProps) {
  const {
    focusDate, today, todayStr,
    getDayEvents, getDayEventsUnfiltered, getTotalCount, getMonthDays,
    cases, officeProfile, allAgendaEvents, confirm, printSingleSession,
    setFocusDate, setSessionForm, setIsAddingSession, openEditSession,
    onDeleteSession, onToggleDeadlineComplete, onToggleTaskStatus
  } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Timeline Column */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              جدول يوم {dayNamesFull[getDayOfWeekIndex(focusDate)]} (بالساعات)
            </h3>
            <button
              onClick={() => { setSessionForm({ caseId: '', date: formatDateStr(focusDate), court: '', circuit: '', objective: '', status: 'قادمة', judgeName: '', notes: '', time: '09:00' }); setIsAddingSession(true); }}
              className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> إضافة جلسة
            </button>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {hours.map((hour) => {
            const dateStr = formatDateStr(focusDate);
            const dayEvs = getDayEvents(dateStr);
            const hourSessions = dayEvs.sessions.filter(s => getHourSlot(s.time, '09:00') === hour);
            const hourDeadlines = dayEvs.deadlines.filter(dl => (hour === '08:00'));
            const hourTasks = dayEvs.tasks.filter(t => getHourSlot(t.time, '14:00') === hour);
            const hasEvents = hourSessions.length > 0 || hourDeadlines.length > 0 || hourTasks.length > 0;

            return (
              <div key={hour} className="flex border-b border-slate-100 last:border-b-0 hover:bg-slate-50/20 min-h-[90px]">
                <div className="w-20 shrink-0 text-center border-l border-slate-200 text-xs font-black text-slate-655 bg-slate-50/50 flex items-center justify-center font-mono">
                  {hour}
                </div>

                <div
                  onClick={() => {
                    if (!hasEvents) {
                      setSessionForm({
                        caseId: '', date: dateStr, court: '', circuit: '',
                        objective: '', status: 'قادمة', judgeName: '', notes: '', time: hour
                      });
                      setIsAddingSession(true);
                    }
                  }}
                  className="flex-1 p-3 flex flex-col gap-2 relative group cursor-pointer"
                >
                  {hourSessions.map(s => (
                    <div
                      key={s.id}
                      onClick={e => e.stopPropagation()}
                      className="group/card relative border-e-4 border-indigo-500 bg-indigo-50 rounded-2xl p-4 hover:shadow-xs transition-all flex items-start justify-between gap-3 text-end"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-lg text-[9px] flex items-center gap-1">
                            <Gavel className="w-3 h-3" /> جلسة قضائية
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${s.status === 'قادمة' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            {s.status}
                          </span>
                          {s.googleEventId && <span className="text-[9px] text-blue-600 font-bold">✓ Google</span>}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                          {s.time && <span className="font-mono text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded-lg">{s.time}</span>}
                          <h4 className="font-black text-xs text-slate-900">{s.court} - دائرة {s.circuit || '—'}</h4>
                        </div>
                        {s.judgeName && (
                          <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
                            <Gavel className="w-2.5 h-2.5" /> القاضي: {s.judgeName}
                          </div>
                        )}
                        <p className="text-xs text-slate-700">{s.objective}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold">
                          <span>الموكل: {s.clientName}</span>
                          <span>رقم القضية: {s.caseNumber}</span>
                        </div>
                        {s.decision && (
                          <div className="bg-white border border-indigo-200 rounded-xl p-2 text-[10px] mt-1">
                            <span className="font-black text-indigo-800 block">قرار: {s.decision}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button onClick={() => openEditSession(s)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={async () => { if (await confirm('حذف هذه الجلسة')) onDeleteSession(s.id); }}
                          className="p-1.5 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => printSingleSession(s, cases.find(c => c.id === s.caseId), officeProfile)}
                          className="p-1.5 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition text-indigo-600"
                        >
                          <Printer className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {hourDeadlines.map(dl => (
                    <div
                      key={dl.id}
                      onClick={e => e.stopPropagation()}
                      className={`border-e-4 rounded-2xl p-4 transition-all flex items-start justify-between gap-3 text-end ${
                        dl.isCompleted ? 'border-slate-300 bg-slate-50 opacity-60' : 'border-rose-500 bg-rose-50'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-lg text-[9px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> ميعاد إجرائي حاسم
                        </span>
                        <h4 className="font-black text-xs text-slate-900">{dl.title}</h4>
                        <p className="text-xs text-slate-650">{dl.lawReference}</p>
                        <div className="text-[10px] text-slate-500 font-bold">الموكل: {dl.clientName} | {dl.caseNumber}</div>
                      </div>
                      <button
                        onClick={() => onToggleDeadlineComplete(dl.id)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition ${
                          dl.isCompleted ? 'bg-slate-200 text-slate-600' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {dl.isCompleted ? 'تراجع' : 'إتمام'}
                      </button>
                    </div>
                  ))}

                  {hourTasks.map(t => (
                    <div
                      key={t.id}
                      onClick={e => e.stopPropagation()}
                      className={`border-e-4 rounded-2xl p-4 transition-all flex items-start justify-between gap-3 text-end ${
                        t.status === 'completed' ? 'border-slate-350 bg-slate-50 opacity-60' : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-lg text-[9px]">📋 مهمة مكتبية</span>
                        <h4 className="font-black text-xs text-slate-900">{t.title}</h4>
                        <p className="text-xs text-slate-650">{t.description}</p>
                      </div>
                      <button
                        onClick={() => onToggleTaskStatus(t.id)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition ${
                          t.status === 'completed' ? 'bg-slate-200 text-slate-650' : 'bg-blue-600 text-white'
                        }`}
                      >
                        {t.status === 'completed' ? 'تراجع' : 'إتمام'}
                      </button>
                    </div>
                  ))}

                  {!hasEvents && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-indigo-50/10">
                      <span className="text-xs text-indigo-700 bg-white border border-indigo-200 px-3 py-1.5 rounded-full shadow-xs flex items-center gap-1 font-bold">
                        <Plus className="w-3.5 h-3.5" /> إضافة جلسة في الساعة {hour}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Mini Month */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setFocusDate(new Date(focusDate.getFullYear(), focusDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg">
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>
            <span className="text-xs font-black text-slate-700">{monthNames[focusDate.getMonth()]} {focusDate.getFullYear()}</span>
            <button onClick={() => setFocusDate(new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg">
              <ChevronLeft className="w-3 h-3 text-slate-500" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {dayNamesShort.map((n, i) => (
              <div key={i} className="text-[9px] font-black text-slate-400 py-1">{n[0]}</div>
            ))}
            {getMonthDays(focusDate).map((day, i) => {
              if (!day) return <div key={`me${i}`} />;
              const dateStr = formatDateStr(day);
              const isToday = dateStr === todayStr;
              const isFocus = dateStr === formatDateStr(focusDate);
              const ev = getDayEventsUnfiltered(dateStr);
              const hasEvents = getTotalCount(ev) > 0;
              return (
                <button
                  key={i}
                  onClick={() => setFocusDate(new Date(dateStr))}
                  className={`text-[11px] w-7 h-7 rounded-full font-bold flex items-center justify-center mx-auto transition relative ${
                    isFocus ? 'bg-indigo-600 text-white' :
                    isToday ? 'bg-indigo-100 text-indigo-800' :
                    'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {day.getDate()}
                  {hasEvents && !isFocus && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Upcoming */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
          <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-indigo-500" />
            قادم في ٧ أيام
          </h4>
          <div className="space-y-2">
            {allAgendaEvents.filter(ev => {
              const evDate = new Date(ev.date);
              const diff = (evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
              return diff >= 0 && diff <= 7;
            }).slice(0, 5).map((ev, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-xl text-[10px] ${
                ev.type === 'session' ? 'bg-indigo-50' : ev.type === 'deadline' ? 'bg-rose-50' : 'bg-blue-50'
              }`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  ev.type === 'session' ? 'bg-indigo-500' : ev.type === 'deadline' ? 'bg-rose-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-slate-800">
                    {ev.type === 'session' ? (ev.data as Session).court :
                     ev.type === 'deadline' ? (ev.data as LegalDeadline).title :
                     (ev.data as LawTask).title}
                  </div>
                  <div className="text-slate-400">{ev.date}</div>
                </div>
              </div>
            ))}
            {allAgendaEvents.filter(ev => {
              const evDate = new Date(ev.date);
              const diff = (evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
              return diff >= 0 && diff <= 7;
            }).length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-4">لا يوجد أحداث في الأيام السبعة القادمة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
