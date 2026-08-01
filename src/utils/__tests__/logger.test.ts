/**
 * Tests for logger.ts — dev vs prod behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('error()', () => {
    it('always shows errors', () => {
      logger.error('something failed');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('includes the message in the output', () => {
      logger.error('failed to load');
      const calls = consoleErrorSpy.mock.calls[0];
      expect(calls[0]).toContain('failed to load');
    });

    it('passes extra args to console', () => {
      const err = new Error('boom');
      logger.error('error occurred', err);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const calls = consoleErrorSpy.mock.calls[0];
      expect(calls[1]).toBe(err);
    });
  });

  describe('warn()', () => {
    it('always shows warnings', () => {
      logger.warn('careful');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('getRecentLogs()', () => {
    it('returns logs buffer', () => {
      logger.error('test error');
      const logs = logger.getRecentLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].level).toBe('error');
    });

    it('caps buffer size', () => {
      for (let i = 0; i < 100; i++) {
        logger.error(`log ${i}`);
      }
      const logs = logger.getRecentLogs();
      expect(logs.length).toBeLessThanOrEqual(50);
    });
  });

  describe('isDev()', () => {
    it('returns a boolean', () => {
      expect(typeof logger.isDev()).toBe('boolean');
    });
  });
});
