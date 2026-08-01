/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * fees.ts — حسابات الرسوم والأتعاب (Fees & Payments).
 *
 * Pure functions، بدون I/O. قابلة للاختبار.
 * Centralized to avoid duplication across 8+ components.
 *
 * الـ logic المتناثر في الكود الأصلي تم توحيده هنا:
 *  - calculateRemaining, isFullyPaid, calculatePaymentPercent
 *  - sumCasePayments, sumClientPayments
 *  - validateFeeInputs
 *  - formatCurrency
 */

import { Transaction } from '../types';

/**
 * حساب المبلغ المتبقي من الأتعاب.
 * لا يرجع قيمة سالبة أبداً (Math.max).
 */
export function calculateRemaining(totalFees: number, paidFees: number): number {
  return Math.max(0, (totalFees || 0) - (paidFees || 0));
}

/**
 * هل القضية مسددة بالكامل؟
 */
export function isFullyPaid(totalFees: number, paidFees: number): boolean {
  if (!totalFees || totalFees <= 0) return false; // بدون أتعاب محددة = مش مدفوع
  return (paidFees || 0) >= totalFees;
}

/**
 * نسبة السداد (0-100).
 * Returns 0 if totalFees is 0.
 */
export function calculatePaymentPercent(totalFees: number, paidFees: number): number {
  if (!totalFees || totalFees <= 0) return 0;
  return Math.min(100, Math.round(((paidFees || 0) / totalFees) * 100));
}

/**
 * مجموع الدفعات لقضية معينة من معاملاتها المالية.
 * - يفلتر: type === 'أتعاب' AND ioType contains 'وارد'
 */
export function sumCasePayments(transactions: Transaction[], caseId: string): number {
  return transactions
    .filter(t => t.caseId === caseId && t.type === 'أتعاب' && t.ioType.includes('وارد'))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
}

/**
 * مجموع كل الدفعات من نوع "أتعاب وارد" عبر كل القضايا.
 */
export function sumAllFeePayments(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.type === 'أتعاب' && t.ioType.includes('وارد'))
    .reduce((sum, t) => sum + (t.amount || 0), 0);
}

/**
 * مجموع الإيرادات (وارد).
 */
export function sumIncome(transactions: Transaction[]): number {
  return Math.round(transactions
    .filter(t => t.ioType.includes('وارد'))
    .reduce((sum, t) => sum + (t.amount || 0), 0) * 100) / 100;
}

/**
 * مجموع المصروفات (صادر).
 */
export function sumExpenses(transactions: Transaction[]): number {
  return Math.round(transactions
    .filter(t => t.ioType.includes('صادر'))
    .reduce((sum, t) => sum + (t.amount || 0), 0) * 100) / 100;
}

/**
 * Validation للدخلات الأتعاب.
 * Returns { valid: true } or { valid: false, errors: [...] }
 */
export interface FeeValidation {
  valid: boolean;
  errors: string[];
}

export function validateFeeInputs(totalFees: number, paidFees: number): FeeValidation {
  const errors: string[] = [];

  if (typeof totalFees !== 'number' || isNaN(totalFees)) {
    errors.push('إجمالي الأتعاب يجب أن يكون رقماً');
  } else if (totalFees < 0) {
    errors.push('إجمالي الأتعاب لا يمكن أن يكون سالباً');
  }

  if (typeof paidFees !== 'number' || isNaN(paidFees)) {
    errors.push('المسدد يجب أن يكون رقماً');
  } else if (paidFees < 0) {
    errors.push('المسدد لا يمكن أن يكون سالباً');
  } else if (totalFees > 0 && paidFees > totalFees) {
    // warning, not error — overpayment is allowed (e.g. bonus)
    // but we allow it
  }

  return { valid: errors.length === 0, errors };
}

/**
 * تنسيق المبلغ كعملة (جنيه مصري).
 */
export function formatCurrency(amount: number, locale: string = 'ar-EG'): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '٠';
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * إجمالي الأتعاب المتفق عليها لموكل (مجموع كل قضاياه).
 */
export function sumClientAgreedFees(cases: Array<{ totalFees?: number }>): number {
  return cases.reduce((sum, c) => sum + (c.totalFees || 0), 0);
}

/**
 * إجمالي المسدد لموكل (مجموع كل دفعات قضاياه).
 */
export function sumClientPaidFees(cases: Array<{ paidFees?: number }>): number {
  return cases.reduce((sum, c) => sum + (c.paidFees || 0), 0);
}

/**
 * إجمالي المتبقي لموكل.
 */
export function sumClientOutstanding(cases: Array<{ totalFees?: number; paidFees?: number }>): number {
  const agreed = sumClientAgreedFees(cases);
  const paid = sumClientPaidFees(cases);
  return Math.max(0, agreed - paid);
}
