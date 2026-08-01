/**
 * Tests for backupRestore.ts — JSON validation + isValidBackup
 */
import { describe, it, expect } from 'vitest';
import { isValidBackup } from '../backupRestore';

describe('isValidBackup', () => {
  it('accepts valid backup object', () => {
    const valid = {
      version: '2.0.0',
      createdAt: '2026-07-19T10:00:00.000Z',
      appVersion: '2.8.0',
      indexedDB: { cases: [], clients: [] },
      localStorage: {},
      stats: { totalRecords: 0, stores: {} },
    };
    expect(isValidBackup(valid)).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidBackup(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidBackup(undefined)).toBe(false);
  });

  it('rejects non-object (string)', () => {
    expect(isValidBackup('not a backup')).toBe(false);
  });

  it('rejects missing version (and no legacy fallback)', () => {
    // Note: isValidBackup falls back to legacy/flattened formats,
    // so a complete lack of indexedDB AND legacy keys is required to reject.
    const invalid = {
      createdAt: '2026-07-19',
      appVersion: '2.8.0',
    };
    expect(isValidBackup(invalid)).toBe(false);
  });

  it('rejects missing indexedDB', () => {
    const invalid = {
      version: '2.0.0',
      createdAt: '2026-07-19',
      appVersion: '2.8.0',
      localStorage: {},
      stats: {},
    };
    expect(isValidBackup(invalid)).toBe(false);
  });

  it('rejects missing indexedDB and no legacy format', () => {
    const invalid = {
      version: '2.0.0',
      createdAt: '2026-07-19',
      appVersion: '2.8.0',
    };
    expect(isValidBackup(invalid)).toBe(false);
  });

  it('accepts flattened format (legacy)', () => {
    const legacy = {
      cases: [],
      clients: [],
      sessions: [],
    };
    expect(isValidBackup(legacy)).toBe(true);
  });

  it('rejects empty object', () => {
    expect(isValidBackup({})).toBe(false);
  });

  it('accepts backup with empty stores', () => {
    const valid = {
      version: '2.0.0',
      indexedDB: { cases: [], clients: [], sessions: [] },
      localStorage: {},
      stats: { totalRecords: 0, stores: {} },
    };
    expect(isValidBackup(valid)).toBe(true);
  });
});
