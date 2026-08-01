/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MonthView — الـ view الرئيسي للتقويم (عرض شهري).
 *
 * يعرض شبكة 7×6 من الأيام، مع:
 *  - اسم اليوم في الأعلى
 *  - رقم اليوم (مع تمييز اليوم الحالي)
 *  - pills للأحداث: جلسات (كهرماني) + مواعيد (وردي) + مهام (أزرق)
 *  - badge بعدد الأحداث الكلي
 *  - hover لزر "عرض اليوم بالجدول الزمني"
 *
 * النقر على اليوم يفتح DayDetailModal
 * النقر على pill يفتح EventDetailModal
 */

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  formatDateStr,
  dayNamesShort,
  type DayEvents
} from './shared';

export interface MonthViewProps {
  focusDate: Date;
  today: Date;
  todayStr: string;
  getMonthDays: (date: Date) => (Date | null)[];
  getDayEvents: (dateStr: string) => DayEvents;
  getDayEventsUnfiltered: (dateStr: string) => DayEvents;
  getTotalCount: (ev: DayEvents) => number;
  setSelectedDay: (ev: DayEvents) => void;
  setSelectedEvent: (ev: { type: 'session' | 'deadline' | 'task'; data: any }) => void;
  setFocusDate: (d: Date) => void;
  setCurrentView: (v: 'day') => void;
}

export default function MonthView(props: MonthViewProps) {
  const {
    focusDate, today, todayStr,
    getMonthDays, getDayEvents, getDayEventsUnfiltered, getTotalCount,
    setSelectedDay, setSelectedEvent, setFocusDate, setCurrentView
  } = props;

  return (
    <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-sm">
      {/* Day Names Header */}
      <div className="grid grid-cols-7 border-b border-slate-350 bg-slate-100">
        {dayNamesShort.map((name, i) => (
          <div key={i} className={`text-center text-xs font-extrabold py-3 border-l last:border-s-0 border-slate-300 ${i === 0 || i === 6 ? 'text-rose-700 bg-rose-50/30' : 'text-slate-700'}`}>
            {name}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {getMonthDays(focusDate).map((day, i) => {
          if (!day) return (
            <div key={`e${i}`} className="min-h-[120px] border-r border-b border-slate-200 last:border-e-0 bg-slate-100/20" />
          );
          const dateStr = formatDateStr(day);
          const ev = getDayEvents(dateStr);
          const isToday = dateStr === todayStr;
          const isPast = day < today;
          const isCurrentMonth = day.getMonth() === focusDate.getMonth();
          const total = getTotalCount(ev);
          const isWeekend = i % 7 === 0 || i % 7 === 6;

          return (
            <div
              key={dateStr}
              onClick={() => setSelectedDay(getDayEventsUnfiltered(dateStr))}
              className={`min-h-[120px] border-r border-b border-slate-200 last:border-e-0 p-2 cursor-pointer transition-all flex flex-col gap-1 group ${
                isToday ? 'bg-indigo-50/50 hover:bg-indigo-100/40 ring-1 ring-indigo-300' :
                isWeekend ? 'bg-slate-50/80 hover:bg-indigo-50/20' : 'bg-white hover:bg-indigo-50/25'
              } ${!isCurrentMonth ? 'opacity-35 bg-slate-50/20' : ''}`}
            >
              {/* Day number */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-black w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isToday
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : !isCurrentMonth
                        ? 'text-slate-400/80'
                        : isPast
                          ? 'text-slate-500 font-extrabold'
                          : 'text-slate-900 font-extrabold group-hover:bg-slate-200/60'
                  }`}>
                    {day.getDate()}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setFocusDate(day); setCurrentView('day'); }}
                    className="opacity-0 group-hover:opacity-100 transition text-[8px] text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1 py-0.5 rounded font-bold"
                    title="عرض اليوم بالجدول الزمني"
                  >
                    <ChevronLeft className="w-2 h-2 inline" />
                  </button>
                </div>
                {total > 0 && (
                  <span className="text-[10px] text-indigo-800 bg-indigo-50/80 border border-indigo-200 font-extrabold px-1.5 py-0.5 rounded">{total}</span>
                )}
              </div>

              {/* Event pills */}
              <div className="space-y-1 overflow-hidden mt-1">
                {ev.sessions.slice(0, 2).map(s => (
                  <div
                    key={s.id}
                    onClick={e => { e.stopPropagation(); setSelectedEvent({ type: 'session', data: s }); }}
                    className="text-[9px] font-extrabold bg-indigo-100/90 text-indigo-950 border-e-4 border-indigo-600 px-1.5 py-0.5 rounded truncate hover:bg-indigo-200 transition cursor-pointer"
                    title={`${s.court} - ${s.objective}`}
                  >
                    ⚖️ {s.court}
                  </div>
                ))}
                {ev.deadlines.filter(dl => !dl.isCompleted).slice(0, 2).map(dl => (
                  <div
                    key={dl.id}
                    onClick={e => { e.stopPropagation(); setSelectedEvent({ type: 'deadline', data: dl }); }}
                    className="text-[9px] font-extrabold bg-rose-100/90 text-rose-950 border-e-4 border-rose-600 px-1.5 py-0.5 rounded truncate hover:bg-rose-200 transition cursor-pointer"
                    title={dl.title}
                  >
                    🚨 {dl.title.substring(0, 16)}
                  </div>
                ))}
                {ev.tasks.filter(t => t.status !== 'completed').slice(0, 1).map(t => (
                  <div
                    key={t.id}
                    onClick={e => { e.stopPropagation(); setSelectedEvent({ type: 'task', data: t }); }}
                    className="text-[9px] font-extrabold bg-blue-100/90 text-blue-950 border-e-4 border-blue-600 px-1.5 py-0.5 rounded truncate hover:bg-blue-200 transition cursor-pointer"
                    title={t.title}
                  >
                    📋 {t.title.substring(0, 16)}
                  </div>
                ))}
                {total > 5 && (
                  <div className="text-[9px] text-slate-500 font-extrabold text-center py-0.5">
                    +{total - 5} المزيد
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
