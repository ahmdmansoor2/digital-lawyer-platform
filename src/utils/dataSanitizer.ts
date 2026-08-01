/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dataSanitizer.ts — تنظيف الـ domain data عند الـ load من IndexedDB.
 *
 * المشكلة: الـ data القديمة ممكن تكون مخزنة بـ HTML tags (من TipTap editor
 * أو إدخال يدوي). لما نعرض في plain text mode (headers, cards, lists)، الـ
 * HTML tags بيظهروا كنص خام ("<صع><p style=...>").
 *
 * الـ fix: strip HTML tags مرة واحدة عند load من DB، فالـ UI يعرض نص نظيف.
 */

import { Case, Client, Session, LegalDeadline, LawTask } from '../types';
import { stripHtml } from './sanitizer';

/**
 * تنظيف كل النصوص في القضية (HTML → plain text).
 */
export function cleanCaseData(rawCases: Case[]): Case[] {
  return rawCases.map(c => ({
    ...c,
    claimSubject: stripHtml(c.claimSubject || ''),
    notes: stripHtml(c.notes || ''),
  }));
}

/**
 * تنظيف كل النصوص في الموكل.
 */
export function cleanClientData(rawClients: Client[]): Client[] {
  return rawClients.map(cl => ({
    ...cl,
    notes: stripHtml(cl.notes || ''),
  }));
}

/**
 * تنظيف النصوص في الجلسة.
 */
export function cleanSessionData(rawSessions: Session[]): Session[] {
  return rawSessions.map(s => ({
    ...s,
    objective: stripHtml(s.objective || ''),
    decision: stripHtml(s.decision || ''),
  }));
}

/**
 * تنظيف النصوص في الموعد القانوني.
 */
export function cleanDeadlineData(rawDeadlines: LegalDeadline[]): LegalDeadline[] {
  return rawDeadlines.map(d => ({
    ...d,
    title: stripHtml(d.title || ''),
    lawReference: stripHtml(d.lawReference || ''),
  }));
}

/**
 * تنظيف النصوص في المهمة.
 */
export function cleanTaskData(rawTasks: LawTask[]): LawTask[] {
  return rawTasks.map(t => ({
    ...t,
    title: stripHtml(t.title || ''),
    description: stripHtml(t.description || ''),
  }));
}
