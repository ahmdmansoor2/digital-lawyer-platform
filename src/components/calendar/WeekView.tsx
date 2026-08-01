/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WeekView — عرض الأسبوع كشبكة ساعات (Hourly Grid).
 *
 * يعرض 7 أعمدة (أيام الأسبوع) × 13 صف (الساعات من 08:00 إلى 20:00).
 *  - النقر على رأس اليوم → ينتقل إلى DayView
 *  - النقر على خلية ساعة فارغة → يفتح نافذة إضافة جلسة
 *  - النقر على pill (جلسة/موعد/مهمة) → يفتح EventDetailModal
 */

import React from 'react';
import { Gavel, Plus } from 'lucide-react';
import {
  formatDateStr,
  getDayOfWeekIndex,
  getHourSlot,
  dayNamesFull,
  hours,
  type DayEvents
} from './shared';
import { Session } from '../../types';

export interface WeekViewProps {
  focusDate: Date;
  todayStr: string;
  getWeekDays: (date: Date) => Date[];
  getDayEvents: (dateStr: string) => DayEvents;
  getTotalCount: (ev: DayEvents) => number;
  setFocusDate: (d: Date) => void;
  setCurrentView: (v: 'day') => void;
  setSelectedEvent: (ev: { type: 'session' | 'deadline' | 'task'; data: any }) => void;
  setSessionForm: (v: any) => void;
  setIsAddingSession: (v: boolean) => void;
}

export default function WeekView(props: WeekViewProps) {
  const {
    focusDate, todayStr,
    getWeekDays, getDayEvents, getTotalCount,
    setFocusDate, setCurrentView, setSelectedEvent, setSessionForm, setIsAddingSession
  } = props;

  return (
    <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-sm">
      {/* Header: Time + 7 Day Columns */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-300 bg-slate-100">
        <div className="p-2 text-center text-[9px] font-black text-slate-400 border-l border-slate-200 flex items-center justify-center bg-slate-50">
          الوقت
        </div>
        {getWeekDays(focusDate).map((day, i) => {
          const dateStr = formatDateStr(day);
          const isToday = dateStr === todayStr;
          const ev = getDayEvents(dateStr);
          const total = getTotalCount(ev);
          return (
            <div key={i} className={`p-2 text-center border-s last:border-s-0 cursor-pointer hover:bg-slate-50/70 ${isToday ? 'bg-indigo-50/70' : ''}`}
              onClick={() => { setFocusDate(day); setCurrentView('day'); }}>
              <div className={`text-[10px] font-black ${isToday ? 'text-indigo-700' : 'text-slate-600'}`}>
                {dayNamesFull[getDayOfWeekIndex(day)]}
              </div>
              <div className={`text-sm font-black w-7 h-7 rounded-full flex items-center justify-center mx-auto mt-0.5 ${
                isToday ? 'bg-indigo-700 text-white' : 'text-slate-800'
              }`}>
                {day.getDate()}
              </div>
              {total > 0 && (
                <div className="mt-0.5 flex justify-center gap-0.5">
                  {ev.sessions.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                  {ev.deadlines.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                  {ev.tasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hourly Grid Body */}
      <div className="max-h-[520px] overflow-y-auto">
        {hours.map((hour) => {
          const weekDays = getWeekDays(focusDate);
          return (
            <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100 min-h-[72px]">
              {/* Time Label */}
              <div className="text-[10px] font-mono font-bold text-slate-500 flex items-start justify-center pt-2 border-l border-slate-200 bg-slate-50/50 sticky col-start-1">
                {hour}
              </div>
              {weekDays.map((day, di) => {
                const dateStr = formatDateStr(day);
                const ev = getDayEvents(dateStr);
                const hourSessions = ev.sessions.filter(s => getHourSlot(s.time, '09:00') === hour);
                const hourDeadlines = ev.deadlines.filter(dl => hour === '08:00');
                const hourTasks = ev.tasks.filter(t => getHourSlot(t.time, '14:00') === hour);
                const hasAny = hourSessions.length > 0 || hourDeadlines.length > 0 || hourTasks.length > 0;
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={di}
                    onClick={() => {
                      if (!hasAny) {
                        setSessionForm({ caseId: '', date: dateStr, court: '', circuit: '', objective: '', status: 'قادمة', judgeName: '', notes: '', time: hour });
                        setIsAddingSession(true);
                      }
                    }}
                    className={`border-s last:border-s-0 p-0.5 cursor-pointer hover:bg-slate-50/40 transition relative group ${isToday ? 'bg-indigo-50/8' : ''}`}
                  >
                    {hourSessions.map(s => (
                      <div key={s.id} onClick={e => { e.stopPropagation(); setSelectedEvent({ type: 'session', data: s }); }}
                        className="bg-indigo-50 border border-indigo-200 border-e-2 border-e-indigo-500 rounded-md p-0.5 mb-0.5 text-[7px] font-bold cursor-pointer hover:bg-indigo-100/50 transition"
                      >
                        <div className="flex items-center gap-0.5 text-indigo-800 truncate leading-tight" dir="rtl">
                          <Gavel className="w-2 h-2 shrink-0" />
                          <span className="truncate">{s.court}</span>
                        </div>
                        {s.clientName && <div className="text-[6px] text-indigo-700 truncate leading-tight">{s.clientName}</div>}
                      </div>
                    ))}
                    {hourDeadlines.map(dl => (
                      <div key={dl.id} onClick={e => { e.stopPropagation(); setSelectedEvent({ type: 'deadline', data: dl }); }}
                        className="bg-rose-50 border border-rose-200 border-e-2 border-e-rose-500 rounded-md p-0.5 mb-0.5 text-[7px] font-bold cursor-pointer hover:bg-rose-100/50 transition"
                      >
                        <div className="truncate text-rose-800 leading-tight">{dl.title.substring(0, 12)}</div>
                      </div>
                    ))}
                    {hourTasks.map(t => (
                      <div key={t.id} onClick={e => { e.stopPropagation(); setSelectedEvent({ type: 'task', data: t }); }}
                        className={`bg-blue-50 border border-blue-200 border-e-2 border-e-blue-500 rounded-md p-0.5 mb-0.5 text-[7px] font-bold cursor-pointer hover:bg-blue-100/50 transition ${t.status === 'completed' ? 'opacity-50 line-through' : ''}`}
                      >
                        <div className="truncate text-blue-800 leading-tight">{t.title.substring(0, 12)}</div>
                      </div>
                    ))}
                    {!hasAny && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Plus className="w-3 h-3 text-indigo-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
