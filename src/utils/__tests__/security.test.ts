/**
 * Tests for security.ts — input validation + ID generation
 */
import { describe, it, expect } from 'vitest';
import { validatePassword, hasSqlInjection, generateId, generateOtp } from '../security';

describe('validatePassword', () => {
  const basicReqs = { minLength: 8, requireUppercase: true, requireLowercase: true, requireDigits: true, requireSpecialChars: false };

  it('accepts strong password', () => {
    const result = validatePassword('Abcdef12', basicReqs);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects short password', () => {
    const result = validatePassword('Ab1', basicReqs);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('8'))).toBe(true);
  });

  it('rejects missing uppercase', () => {
    const result = validatePassword('abcdefg1', basicReqs);
    expect(result.valid).toBe(false);
  });

  it('rejects missing number', () => {
    const result = validatePassword('Abcdefgh', basicReqs);
    expect(result.valid).toBe(false);
  });
});

describe('hasSqlInjection', () => {
  it('detects SELECT injection', () => {
    expect(hasSqlInjection("' OR SELECT * FROM users--")).toBe(true);
  });

  it('detects DROP TABLE', () => {
    expect(hasSqlInjection('; DROP TABLE cases;')).toBe(true);
  });

  it('accepts normal text', () => {
    expect(hasSqlInjection('هذا نص عادي بدون حقن')).toBe(false);
  });

  it('accepts text with single quotes (Arabic name)', () => {
    expect(hasSqlInjection("O'Brien")).toBe(false);
  });
});

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('returns unique IDs across calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('respects prefix', () => {
    const id = generateId('case_');
    expect(id.startsWith('case_')).toBe(true);
  });
});

describe('generateOtp', () => {
  it('returns string of requested length', () => {
    expect(generateOtp(6).length).toBe(6);
    expect(generateOtp(4).length).toBe(4);
  });

  it('contains only digits', () => {
    const otp = generateOtp(8);
    expect(/^\d+$/.test(otp)).toBe(true);
  });
});
