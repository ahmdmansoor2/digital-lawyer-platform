/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * legalLibraryShared.ts — Shared types & helpers for LegalLibrary.
 *
 * Extracted from LegalLibrary.tsx to reduce its size.
 * Components like LegalLibrary import these from here.
 */

import { LegalReference, Case } from '../types';

export interface LegalLibraryProps {
  cases?: Case[];
  onLinkLegalReference?: (caseId: string, ref: LegalReference) => void;
}

export type SegmentType = 'laws' | 'precedents' | 'books' | 'encyclopedias';
export type ViewMode = 'grid' | 'list';

/**
 * دمج مصفوفتين حسب المعرّف (id) بدون تكرار — البيانات اللاحقة تُستبدل السابقة
 */
export function mergeById<T extends { id: string }>(base: T[], overlay: T[]): T[] {
  const byId = new Map<string, T>();
  base.forEach(it => byId.set(it.id, it));
  overlay.forEach(it => byId.set(it.id, it));
  return Array.from(byId.values());
}

/**
 * Normalize Arabic text for fuzzy search:
 * - Removes diacritics (تشكيل)
 * - Trims whitespace
 * - Lowercases
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Highlight search term in HTML string.
 * Returns the original text with `<mark>` wrappers around matches.
 */
export function highlightSearchTerm(text: string, term: string): string {
  if (!term.trim() || !text) return text;
  const normalizedTerm = normalizeArabic(term);
  const normalizedText = normalizeArabic(text);

  // Find positions in original text by walking through both
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const positions: Array<[number, number]> = [];

  let searchFrom = 0;
  while (searchFrom < lowerText.length) {
    const idx = lowerText.indexOf(lowerTerm, searchFrom);
    if (idx === -1) break;
    positions.push([idx, idx + lowerTerm.length]);
    searchFrom = idx + lowerTerm.length;
  }

  if (positions.length === 0) return text;

  // Build highlighted HTML
  let result = '';
  let lastEnd = 0;
  for (const [start, end] of positions) {
    result += text.substring(lastEnd, start);
    result += '<mark class="bg-amber-200 text-amber-900 px-0.5 rounded font-bold">';
    result += text.substring(start, end);
    result += '</mark>';
    lastEnd = end;
  }
  result += text.substring(lastEnd);
  return result;
}
