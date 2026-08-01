/**
 * Tests for fees.ts — financial calculations
 *
 * CRITICAL: These tests protect the user from data loss / incorrect fees.
 * Any change to fees.ts must be reviewed.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateRemaining,
  isFullyPaid,
  calculatePaymentPercent,
  sumCasePayments,
  sumAllFeePayments,
  sumIncome,
  sumExpenses,
  validateFeeInputs,
  formatCurrency,
  sumClientAgreedFees,
  sumClientPaidFees,
  sumClientOutstanding,
} from '../fees';
import { Transaction } from '../../types';

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 't1',
  caseId: 'c1',
  caseNumber: '1/2026',
  clientName: 'موكل تجريبي',
  date: '2026-01-01',
  type: 'أتعاب',
  ioType: 'وارد',
  amount: 1000,
  description: '',
  ...overrides,
});

describe('calculateRemaining', () => {
  it('computes total - paid', () => {
    expect(calculateRemaining(10000, 3000)).toBe(7000);
  });

  it('returns 0 when paid equals total', () => {
    expect(calculateRemaining(10000, 10000)).toBe(0);
  });

  it('returns 0 when paid > total (overpayment)', () => {
    expect(calculateRemaining(10000, 12000)).toBe(0);
  });

  it('handles null/undefined safely', () => {
    expect(calculateRemaining(undefined as any, 100)).toBe(0);
    expect(calculateRemaining(100, undefined as any)).toBe(100);
    expect(calculateRemaining(null as any, null as any)).toBe(0);
  });
});

describe('isFullyPaid', () => {
  it('returns true when paid === total', () => {
    expect(isFullyPaid(1000, 1000)).toBe(true);
  });

  it('returns true when paid > total', () => {
    expect(isFullyPaid(1000, 1500)).toBe(true);
  });

  it('returns false when paid < total', () => {
    expect(isFullyPaid(1000, 999)).toBe(false);
  });

  it('returns false when total is 0', () => {
    expect(isFullyPaid(0, 1000)).toBe(false);
  });
});

describe('calculatePaymentPercent', () => {
  it('rounds to nearest integer', () => {
    expect(calculatePaymentPercent(1000, 333)).toBe(33);
    expect(calculatePaymentPercent(1000, 500)).toBe(50);
  });

  it('caps at 100% (overpayment)', () => {
    expect(calculatePaymentPercent(1000, 1500)).toBe(100);
  });

  it('returns 0 when total is 0', () => {
    expect(calculatePaymentPercent(0, 100)).toBe(0);
  });

  it('handles 0/0 → 0%', () => {
    expect(calculatePaymentPercent(0, 0)).toBe(0);
  });
});

describe('sumCasePayments', () => {
  it('sums incoming "أتعاب" only', () => {
    const txs = [
      tx({ id: '1', amount: 1000 }),
      tx({ id: '2', amount: 2000 }),
      tx({ id: '3', type: 'مصاريف', amount: 9999 }), // wrong type
      tx({ id: '4', ioType: 'صادر', amount: 8888 }), // outgoing
    ];
    expect(sumCasePayments(txs, 'c1')).toBe(3000);
  });

  it('only sums for specified caseId', () => {
    const txs = [
      tx({ id: '1', caseId: 'c1', amount: 1000 }),
      tx({ id: '2', caseId: 'c2', amount: 2000 }),
    ];
    expect(sumCasePayments(txs, 'c1')).toBe(1000);
    expect(sumCasePayments(txs, 'c2')).toBe(2000);
  });

  it('handles empty array', () => {
    expect(sumCasePayments([], 'c1')).toBe(0);
  });
});

describe('sumAllFeePayments / sumIncome / sumExpenses', () => {
  it('sums all incoming fees', () => {
    const txs = [
      tx({ id: '1', amount: 1000 }),
      tx({ id: '2', amount: 2000, ioType: 'صادر' }), // outgoing
    ];
    expect(sumAllFeePayments(txs)).toBe(1000);
  });

  it('sums all income', () => {
    const txs = [
      tx({ id: '1', amount: 1000, type: 'أتعاب' }),
      tx({ id: '2', amount: 500, type: 'متفرقات' }),
      tx({ id: '3', amount: 9999, ioType: 'صادر' }),
    ];
    expect(sumIncome(txs)).toBe(1500);
  });

  it('sums all expenses', () => {
    const txs = [
      tx({ id: '1', amount: 1000, ioType: 'صادر' }),
      tx({ id: '2', amount: 500, ioType: 'صادر' }),
      tx({ id: '3', amount: 9999, ioType: 'وارد' }),
    ];
    expect(sumExpenses(txs)).toBe(1500);
  });
});

describe('validateFeeInputs', () => {
  it('accepts valid inputs', () => {
    expect(validateFeeInputs(1000, 500).valid).toBe(true);
  });

  it('rejects negative total', () => {
    const r = validateFeeInputs(-100, 0);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('سالباً');
  });

  it('rejects negative paid', () => {
    const r = validateFeeInputs(1000, -100);
    expect(r.valid).toBe(false);
  });

  it('rejects NaN', () => {
    expect(validateFeeInputs(NaN, 100).valid).toBe(false);
    expect(validateFeeInputs(100, NaN).valid).toBe(false);
  });

  it('allows zero for both', () => {
    expect(validateFeeInputs(0, 0).valid).toBe(true);
  });

  it('allows overpayment (bonus)', () => {
    expect(validateFeeInputs(1000, 1500).valid).toBe(true);
  });
});

describe('formatCurrency', () => {
  it('formats with locale', () => {
    const result = formatCurrency(12345);
    expect(result).toContain('١٢'); // Arabic digits for ar-EG
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('٠');
  });

  it('handles decimals', () => {
    const result = formatCurrency(1234.56);
    expect(result).toMatch(/[٠-٩]/);
  });

  it('handles NaN gracefully', () => {
    expect(formatCurrency(NaN)).toBe('٠');
  });
});

describe('Client aggregates', () => {
  const clientCases = [
    { totalFees: 10000, paidFees: 5000 },
    { totalFees: 20000, paidFees: 15000 },
    { totalFees: 0, paidFees: 0 },
  ];

  it('sums agreed fees', () => {
    expect(sumClientAgreedFees(clientCases)).toBe(30000);
  });

  it('sums paid fees', () => {
    expect(sumClientPaidFees(clientCases)).toBe(20000);
  });

  it('computes outstanding', () => {
    expect(sumClientOutstanding(clientCases)).toBe(10000);
  });

  it('handles empty cases', () => {
    expect(sumClientOutstanding([])).toBe(0);
  });
});
