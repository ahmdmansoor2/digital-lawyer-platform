/**
 * Tests for updateChecker.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compareVersions, checkForUpdate } from '../updateChecker';

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('2.8.0', '2.8.0')).toBe(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns -1 when a < b', () => {
    expect(compareVersions('2.7.0', '2.8.0')).toBe(-1);
    expect(compareVersions('2.8.0', '3.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
  });

  it('returns 1 when a > b', () => {
    expect(compareVersions('2.8.0', '2.7.0')).toBe(1);
    expect(compareVersions('3.0.0', '2.8.0')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  });

  it('handles different lengths', () => {
    expect(compareVersions('2.8', '2.8.0')).toBe(0);
    expect(compareVersions('2.8.0', '2.8')).toBe(0);
    expect(compareVersions('2.8', '2.8.1')).toBe(-1);
  });

  it('treats missing parts as 0', () => {
    expect(compareVersions('2', '2.0.0')).toBe(0);
    expect(compareVersions('2.0', '2.0.1')).toBe(-1);
  });
});

describe('checkForUpdate', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns hasUpdate: false when latest equals current', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '2.8.0', releaseDate: '2026-07-20' }),
    });

    const result = await checkForUpdate('2.8.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.latest).toBe('2.8.0');
  });

  it('returns hasUpdate: true when latest > current', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: '2.9.0',
        releaseDate: '2026-08-01',
        releaseNotes: 'New features!',
        downloadUrl: 'https://example.com/update.exe',
      }),
    });

    const result = await checkForUpdate('2.8.0');
    expect(result.hasUpdate).toBe(true);
    expect(result.latest).toBe('2.9.0');
    expect(result.releaseNotes).toBe('New features!');
    expect(result.downloadUrl).toBe('https://example.com/update.exe');
  });

  it('returns hasUpdate: false when current > latest (downgrade not offered)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '2.7.0', releaseDate: '2026-01-01' }),
    });

    const result = await checkForUpdate('2.8.0');
    expect(result.hasUpdate).toBe(false);
  });

  it('returns error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await checkForUpdate('2.8.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.error).toBe('تعذر الوصول إلى خادم التحديثات');
  });

  it('returns error when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    const result = await checkForUpdate('2.8.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('marks critical updates', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: '2.8.1',
        critical: true,
        releaseNotes: 'Security fix',
      }),
    });

    const result = await checkForUpdate('2.8.0');
    expect(result.hasUpdate).toBe(true);
    expect(result.isCritical).toBe(true);
  });
});
