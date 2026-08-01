/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * shared.ts — Constants and helper functions used by CalendarView's views.
 *
 * كل الـ views (Month/Week/Day/Agenda) تحتاج:
 *  - قوائم الأيام بالعربي
 *  - أوقات العمل (08:00 - 20:00)
 *  - دوال مساعدة لحساب الأيام والشهور
 */

import { Session, LegalDeadline, LawTask } from '../../types';

// ─── Calendar Constants ───────────────────────────────────────────────────
export const monthNames = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const dayNamesShort = ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب', 'خمس', 'جمع'];

export const dayNamesFull = [
  'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'
];

export const hours = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

// ─── Date Helpers ─────────────────────────────────────────────────────────
export function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * ترتيب اليوم في الأسبوع (السبت = 0، الأحد = 1، ... الجمعة = 6)
 * لأن التقويم المصري يبدأ بالسبت.
 */
export function getDayOfWeekIndex(date: Date): number {
  return (date.getDay() + 1) % 7;
}

export function getHourSlot(timeStr?: string, defaultHour: string = '09:00'): string {
  if (!timeStr) return defaultHour;
  const parts = timeStr.split(':');
  if (parts.length > 0) {
    const hr = parts[0].padStart(2, '0');
    return `${hr}:00`;
  }
  return defaultHour;
}

// ─── Day Events Map Type ──────────────────────────────────────────────────
export interface DayEvents {
  date: string;
  sessions: Session[];
  deadlines: LegalDeadline[];
  tasks: LawTask[];
}

export type SessionsMap = Record<string, Session[]>;
export type DeadlinesMap = Record<string, LegalDeadline[]>;
export type TasksMap = Record<string, LawTask[]>;
