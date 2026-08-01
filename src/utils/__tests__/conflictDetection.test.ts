/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import {
  detectSessionConflicts,
  normalizeTime,
  getConflictingSessionIds,
  formatConflictReason,
  SessionConflict,
} from '../conflictDetection';
import { Session } from '../../types';

const mkSession = (overrides: Partial<Session> = {}): Session => ({
  id: 's1',
  caseId: 'c1',
  caseNumber: '100/2024',
  clientName: 'Test',
  date: '2026-08-01',
  court: 'Cairo',
  circuit: '12',
  objective: 'test',
  status: 'قادمة',
  ...overrides,
});

describe('normalizeTime', () => {
  it('formats HH:MM correctly', () => {
    expect(normalizeTime('10:00')).toBe('10:00');
    expect(normalizeTime('9:00')).toBe('09:00');
    expect(normalizeTime('09:30')).toBe('09:30');
  });

  it('handles HH:MM:SS', () => {
    expect(normalizeTime('10:00:00')).toBe('10:00');
  });

  it('handles Arabic-Indic digits', () => {
    expect(normalizeTime('١٠:٠٠')).toBe('10:00');
    expect(normalizeTime('٠٩:٣٠')).toBe('09:30');
  });

  it('returns 00:00 for empty/null/invalid', () => {
    expect(normalizeTime('')).toBe('00:00');
    expect(normalizeTime(null)).toBe('00:00');
    expect(normalizeTime(undefined)).toBe('00:00');
    expect(normalizeTime('not a time')).toBe('00:00');
  });
});

describe('detectSessionConflicts', () => {
  it('returns empty array for no sessions', () => {
    expect(detectSessionConflicts([])).toEqual([]);
  });

  it('returns empty when no conflicts', () => {
    const sessions = [
      mkSession({ id: 's1', date: '2026-08-01', time: '09:00' }),
      mkSession({ id: 's2', date: '2026-08-01', time: '11:00' }), // 2h apart, ok
      mkSession({ id: 's3', date: '2026-08-02', time: '09:00' }), // different date
    ];
    expect(detectSessionConflicts(sessions)).toEqual([]);
  });

  it('detects HIGH conflict: same date + same time', () => {
    const sessions = [
      mkSession({ id: 's1', date: '2026-08-01', time: '10:00', caseId: 'c1' }),
      mkSession({ id: 's2', date: '2026-08-01', time: '10:00', caseId: 'c2' }),
    ];
    const conflicts = detectSessionConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].severity).toBe('high');
    expect(conflicts[0].reason).toBe('same-date-time');
    expect(conflicts[0].sessionA.id).toBe('s1');
    expect(conflicts[0].sessionB.id).toBe('s2');
  });

  it('detects MEDIUM conflict: same date, no time specified', () => {
    const sessions = [
      mkSession({ id: 's1', date: '2026-08-01' }),
      mkSession({ id: 's2', date: '2026-08-01' }),
    ];
    const conflicts = detectSessionConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].severity).toBe('medium');
    expect(conflicts[0].reason).toBe('same-date');
  });

  it('detects MEDIUM conflict: times within 30 min', () => {
    const sessions = [
      mkSession({ id: 's1', date: '2026-08-01', time: '10:00' }),
      mkSession({ id: 's2', date: '2026-08-01', time: '10:15' }), // 15 min later
    ];
    const conflicts = detectSessionConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].severity).toBe('medium');
    expect(conflicts[0].reason).toBe('overlap');
  });

  it('does NOT detect conflict: times 30+ min apart', () => {
    const sessions = [
      mkSession({ id: 's1', date: '2026-08-01', time: '10:00' }),
      mkSession({ id: 's2', date: '2026-08-01', time: '10:30' }), // exactly 30 min
    ];
    expect(detectSessionConflicts(sessions)).toEqual([]);
  });

  it('ignores past sessions (status = منتهية)', () => {
    const sessions = [
      mkSession({ id: 's1', date: '2026-08-01', time: '10:00', status: 'منتهية' }),
      mkSession({ id: 's2', date: '2026-08-01', time: '10:00' }),
    ];
    expect(detectSessionConflicts(sessions)).toEqual([]);
  });

  it('detects multiple conflicts at once', () => {
    const sessions = [
      mkSession({ id: 's1', date: '2026-08-01', time: '10:00' }),
      mkSession({ id: 's2', date: '2026-08-01', time: '10:00' }), // conflict with s1
      mkSession({ id: 's3', date: '2026-08-01', time: '14:00' }),
      mkSession({ id: 's4', date: '2026-08-01', time: '14:00' }), // conflict with s3
    ];
    const conflicts = detectSessionConflicts(sessions);
    expect(conflicts).toHaveLength(2);
  });

  it('handles Arabic-Indic time digits', () => {
    const sessions = [
      mkSession({ id: 's1', date: '2026-08-01', time: '١٠:٠٠' }),
      mkSession({ id: 's2', date: '2026-08-01', time: '10:00' }),
    ];
    expect(detectSessionConflicts(sessions)).toHaveLength(1);
  });
});

describe('getConflictingSessionIds', () => {
  it('returns unique IDs of all sessions in conflicts', () => {
    const conflicts: SessionConflict[] = [
      { sessionA: mkSession({ id: 'a' }), sessionB: mkSession({ id: 'b' }), reason: 'same-date-time', severity: 'high' },
      { sessionA: mkSession({ id: 'b' }), sessionB: mkSession({ id: 'c' }), reason: 'same-date-time', severity: 'high' },
    ];
    const ids = getConflictingSessionIds(conflicts);
    expect(ids).toEqual(new Set(['a', 'b', 'c']));
  });

  it('returns empty set for no conflicts', () => {
    expect(getConflictingSessionIds([])).toEqual(new Set());
  });
});

describe('formatConflictReason', () => {
  it('formats same-date-time', () => {
    const c: SessionConflict = {
      sessionA: mkSession({ id: 'a', time: '10:00' }),
      sessionB: mkSession({ id: 'b', time: '10:00' }),
      reason: 'same-date-time',
      severity: 'high',
    };
    expect(formatConflictReason(c)).toContain('10:00');
  });

  it('formats same-date', () => {
    const c: SessionConflict = {
      sessionA: mkSession({ id: 'a' }),
      sessionB: mkSession({ id: 'b' }),
      reason: 'same-date',
      severity: 'medium',
    };
    expect(formatConflictReason(c)).toContain('بدون وقت');
  });

  it('formats overlap', () => {
    const c: SessionConflict = {
      sessionA: mkSession({ id: 'a', time: '10:00' }),
      sessionB: mkSession({ id: 'b', time: '10:15' }),
      reason: 'overlap',
      severity: 'medium',
    };
    const out = formatConflictReason(c);
    expect(out).toContain('10:00');
    expect(out).toContain('10:15');
  });
});
