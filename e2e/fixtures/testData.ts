/**
 * Test Data Factories — منصة المحامي الرقمية
 *
 * Generates realistic mock entities for E2E tests. All entities use
 * crypto.randomUUID() for stable uniqueness across runs and include
 * fresh ISO timestamps so sorting/filtering behaves naturally.
 */

import type { Client, Case, Session, Transaction } from '../../src/types';
import { CaseType, LitigationLevel, ClientRole, CaseStatus } from '../../src/types';

const newId = (prefix: string) =>
  (globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    .replace(/-/g, '')
    .slice(0, 12)
    .replace(/^(.)/, `${prefix}_$1`);

const nowIso = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().split('T')[0];

/**
 * Generates a unique 14-digit national id for a client.
 * Pads a 13-digit random with a deterministic trailing digit so the
 * /^\\d{14}$/ validator in AddEditClientModal passes.
 */
const fakeNationalId = (): string => {
  const base = Math.floor(1e13 + Math.random() * 9e12).toString(); // 14 digits starting with 1
  return base.slice(0, 14);
};

/**
 * Generates a future date (default 14 days ahead) in YYYY-MM-DD format.
 */
export const futureDate = (daysAhead = 14): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

/**
 * Generates a date in YYYY-MM-DD format.
 */
export const isoDate = (d: Date) => d.toISOString().split('T')[0];

// ─── Client ──────────────────────────────────────────────────────────────

export interface MockClientOverrides {
  name?: string;
  phone?: string;
  nationalId?: string;
  address?: string;
  email?: string;
  fileNumber?: string;
}

export const createMockClient = (overrides: MockClientOverrides = {}): Client => ({
  id: newId('cl'),
  name: overrides.name ?? `موكل اختبار ${Date.now().toString(36)}`,
  phone: overrides.phone ?? '0100' + Math.floor(1000000 + Math.random() * 8999999).toString(),
  nationalId: overrides.nationalId ?? fakeNationalId(),
  address: overrides.address ?? 'مدينة نصر، القاهرة، ج.م.ع',
  email: overrides.email,
  poas: [],
  notes: 'تم إنشاؤه تلقائياً بواسطة E2E test',
  fileNumber: overrides.fileNumber,
  createdAt: nowIso(),
});

// ─── Case ────────────────────────────────────────────────────────────────

export interface MockCaseOverrides {
  caseNumber?: string;
  year?: string;
  court?: string;
  circuit?: string;
  status?: CaseStatus;
  totalFees?: number;
  paidFees?: number;
  claimSubject?: string;
  opponentName?: string;
}

export const createMockCase = (clientId: string, overrides: MockCaseOverrides = {}): Case => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return {
    id: newId('case'),
    caseNumber: overrides.caseNumber ?? `${num} لسنة 2026`,
    year: overrides.year ?? '2026 قضائية',
    court: overrides.court ?? 'محكمة شمال القاهرة الكلية',
    circuit: overrides.circuit ?? '12 مدني كلي',
    type: CaseType.CIVIL,
    litigationLevel: LitigationLevel.FIRST_INSTANCE,
    clientId,
    clientName: 'موكل اختبار',
    clientRole: ClientRole.PLAINTIFF,
    opponentId: undefined,
    opponentName: overrides.opponentName ?? `الخصم ${num}`,
    opponentLawyer: undefined,
    status: overrides.status ? (overrides.status as CaseStatus) : CaseStatus.ACTIVE,
    claimSubject: overrides.claimSubject ?? 'دعوى تعويض عن إخلال بالعقد',
    notes: 'قضية تجريبية E2E',
    totalFees: overrides.totalFees ?? 5000,
    paidFees: overrides.paidFees ?? 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
};

// ─── Session ─────────────────────────────────────────────────────────────

export interface MockSessionOverrides {
  date?: string;
  time?: string;
  status?: 'قادمة' | 'منتهية';
  objective?: string;
  judgeName?: string;
  court?: string;
  circuit?: string;
}

export const createMockSession = (
  caseId: string,
  caseNumber: string,
  clientName: string,
  overrides: MockSessionOverrides = {},
): Session => ({
  id: newId('sess'),
  caseId,
  caseNumber,
  clientName,
  date: overrides.date ?? futureDate(14),
  time: overrides.time ?? '10:00',
  court: overrides.court ?? 'محكمة شمال القاهرة الكلية',
  circuit: overrides.circuit ?? '12 مدني كلي',
  objective: overrides.objective ?? 'المرافعة وإبداء الدفاع',
  decision: overrides.status === 'منتهية' ? 'حجز للحكم' : undefined,
  status: overrides.status ?? 'قادمة',
  judgeName: overrides.judgeName ?? 'المستشار/ رئيس الدائرة',
  notes: 'جلسة تجريبية E2E',
});

// ─── Transaction ─────────────────────────────────────────────────────────

export interface MockTransactionOverrides {
  amount?: number;
  type?: 'أتعاب' | 'مصروفات دعوى' | 'مصاريف مكتب تشغيلية' | 'متفرقات';
  ioType?: 'وارد (income)' | 'صادر (expense)';
  description?: string;
  date?: string;
  paymentMethod?: 'نقدي' | 'فودافون كاش / محفظة' | 'تحويل بنكي' | 'شيك';
}

export const createMockTransaction = (
  caseId: string,
  caseNumber: string,
  clientName: string,
  overrides: MockTransactionOverrides = {},
): Transaction => ({
  id: newId('tx'),
  caseId,
  caseNumber,
  clientName,
  type: overrides.type ?? 'أتعاب',
  ioType: overrides.ioType ?? 'وارد (income)',
  amount: overrides.amount ?? 1500,
  date: overrides.date ?? todayDate(),
  description: overrides.description ?? 'دفعة أتعاب تجريبية E2E',
  paymentMethod: overrides.paymentMethod ?? 'نقدي',
});
