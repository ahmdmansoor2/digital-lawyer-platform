/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * conflictDetection.ts — كشف تعارض المواعيد.
 *
 * المشكلة: المحامي عنده قضايا كتير. ممكن يحجز جلستين في نفس الوقت
 * (مثلاً: جلسة مدني الساعة 10:00 وجلسة عمالي الساعة 10:00 في يوم مختلف
 * لكن نفس اليوم بسبب انتقال ميعاد). الـ feature دي بتحذره قبل ما يروح.
 *
 * v2.8.5: إضافة الميزة مع unit tests.
 */

import { Session } from '../types';

export interface SessionConflict {
  /** أول جلسة (الأقدم في الـ array) */
  sessionA: Session;
  /** تاني جلسة (الأحدث) */
  sessionB: Session;
  /** سبب التعارض ("نفس التاريخ والوقت") */
  reason: 'same-date-time' | 'same-date' | 'overlap';
  /** شدة التعارض: high = نفس التاريخ والوقت بالظبط، medium = نفس التاريخ بس أوقات مختلفة */
  severity: 'high' | 'medium';
}

/**
 * Normalize time string to HH:MM format. Returns '00:00' if invalid/missing.
 * Handles inputs like "10:00", "10:00:00", "١٠:٠٠" (Arabic-Indic digits).
 */
export function normalizeTime(time: string | undefined | null): string {
  if (!time) return '00:00';
  // Convert Arabic-Indic digits to Western
  const western = time.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  // Extract HH:MM
  const match = western.match(/(\d{1,2}):(\d{2})/);
  if (!match) return '00:00';
  const h = match[1].padStart(2, '0');
  const m = match[2];
  return `${h}:${m}`;
}

/**
 * كشف التعارضات في قائمة جلسات.
 *
 * القواعد:
 * - نفس التاريخ + نفس الوقت = تعارض HIGH (لا يمكن حضور جلستين)
 * - نفس التاريخ + أوقات مختلفة بس قريبة (< 30 دقيقة) = تعارض MEDIUM
 * - نفس التاريخ بدون وقت = تعارض MEDIUM (غير مؤكد لكن محتمل)
 *
 * يتجاهل الجلسات المنتهية (status !== 'قادمة').
 *
 * @returns مصفوفة من الـ conflicts (فارغة لو مفيش تعارضات)
 */
export function detectSessionConflicts(sessions: Session[]): SessionConflict[] {
  const conflicts: SessionConflict[] = [];
  const upcoming = sessions.filter(s => s.status === 'قادمة' && s.date);

  for (let i = 0; i < upcoming.length; i++) {
    for (let j = i + 1; j < upcoming.length; j++) {
      const a = upcoming[i];
      const b = upcoming[j];
      if (a.date !== b.date) continue;

      const timeA = normalizeTime(a.time);
      const timeB = normalizeTime(b.time);

      // Same date, same time = HIGH conflict
      if (timeA === timeB && timeA !== '00:00') {
        conflicts.push({ sessionA: a, sessionB: b, reason: 'same-date-time', severity: 'high' });
      } else if (timeA === timeB && timeA === '00:00') {
        // Same date, no time specified = MEDIUM
        conflicts.push({ sessionA: a, sessionB: b, reason: 'same-date', severity: 'medium' });
      } else {
        // Different times — check if within 30 min of each other
        const minA = parseInt(timeA.split(':')[0]) * 60 + parseInt(timeA.split(':')[1]);
        const minB = parseInt(timeB.split(':')[0]) * 60 + parseInt(timeB.split(':')[1]);
        const diff = Math.abs(minA - minB);
        if (diff > 0 && diff < 30) {
          conflicts.push({ sessionA: a, sessionB: b, reason: 'overlap', severity: 'medium' });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Get session IDs that are involved in any conflict.
 * Useful for showing badges in the UI.
 */
export function getConflictingSessionIds(conflicts: SessionConflict[]): Set<string> {
  const ids = new Set<string>();
  for (const c of conflicts) {
    ids.add(c.sessionA.id);
    ids.add(c.sessionB.id);
  }
  return ids;
}

/**
 * Format a conflict for display.
 */
export function formatConflictReason(conflict: SessionConflict): string {
  switch (conflict.reason) {
    case 'same-date-time':
      return `نفس الموعد بالظبط (${conflict.sessionA.time || 'بدون وقت'})`;
    case 'same-date':
      return `نفس اليوم بدون وقت محدد`;
    case 'overlap':
      return `أوقات متقاربة (${conflict.sessionA.time || '؟'} و ${conflict.sessionB.time || '؟'})`;
  }
}
