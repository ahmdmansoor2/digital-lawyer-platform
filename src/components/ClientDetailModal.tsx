/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ClientDetailModal — شاشة عرض احترافية لملف الموكل.
 *
 * تصميم Modal ملء الشاشة مع تبويبات داخلية:
 *  - نظرة عامة: بيانات الموكل + إحصائيات
 *  - القضايا: كل القضايا الحالية + المؤرشفة
 *  - الجلسات القادمة: الجلسات المرتبطة بقضايا الموكل
 *  - المالية: كل المعاملات المالية + إحصائيات
 *  - التوكيلات: التوكيلات الرسمية
 *  - المستندات: المستندات المرتبطة بالموكل
 *
 * Header فيه:
 *  - اسم الموكل
 *  - الرقم القومي
 *  - رقم الهاتف
 *  - QR Code
 *
 * Footer فيه:
 *  - زر "تعديل بيانات الموكل"
 *  - زر "طباعة ملف الموكل"
 *  - زر "إغلاق"
 */

import React, { useState, useMemo } from 'react';
import {
  X, Edit, Printer, Users, Briefcase, Calendar, Wallet, FileText,
  StickyNote, Phone, MapPin, Mail, Hash, Building2,
  CheckCircle2, Clock, AlertTriangle, Scale, Gavel
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Client, Case, Session, Transaction, LawDocument, OfficeProfile,
  PowerOfAttorney, CaseStatus, CaseType
} from '../types';

export type ClientDetailTab = 'overview' | 'cases' | 'sessions' | 'financials' | 'poas' | 'documents';

export interface ClientDetailModalProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  cases: Case[];
  sessions: Session[];
  transactions: Transaction[];
  documents: LawDocument[];
  officeProfile: OfficeProfile;
  onEdit: () => void;
  onPrint: () => void;
}

const TABS: Array<{ id: ClientDetailTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'نظرة عامة', icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'cases', label: 'القضايا', icon: <Briefcase className="w-3.5 h-3.5" /> },
  { id: 'sessions', label: 'الجلسات القادمة', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'financials', label: 'المالية', icon: <Wallet className="w-3.5 h-3.5" /> },
  { id: 'poas', label: 'التوكيلات', icon: <Scale className="w-3.5 h-3.5" /> },
  { id: 'documents', label: 'المستندات', icon: <FileText className="w-3.5 h-3.5" /> }
];

const CASE_TYPE_LABELS: Record<CaseType, string> = {
  [CaseType.CIVIL]: 'مدني',
  [CaseType.CRIMINAL]: 'جنائي',
  [CaseType.PERSONAL_STATUS]: 'أسرة',
  [CaseType.ADMINISTRATIVE]: 'إداري',
  [CaseType.COMMERCIAL]: 'تجاري',
  [CaseType.LABOR]: 'عمالي'
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  [CaseStatus.ACTIVE]: 'bg-indigo-100 text-indigo-800',
  [CaseStatus.PLEADING]: 'bg-indigo-100 text-indigo-800',
  [CaseStatus.DISMISSED]: 'bg-rose-100 text-rose-800',
  [CaseStatus.CLOSED]: 'bg-slate-100 text-slate-600'
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  [CaseStatus.ACTIVE]: 'متداولة',
  [CaseStatus.PLEADING]: 'محجوزة',
  [CaseStatus.DISMISSED]: 'مشطوبة',
  [CaseStatus.CLOSED]: 'منتهية'
};

function formatDate(d: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return d; }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function ClientDetailModal(props: ClientDetailModalProps) {
  const {
    open, onClose, client, cases, sessions, transactions, documents, officeProfile,
    onEdit, onPrint
  } = props;

  const [activeTab, setActiveTab] = useState<ClientDetailTab>('overview');

  // ─── Computed data ──────────────────────────────────────────────────────
  const clientCases = useMemo(
    () => (cases || []).filter(c => c.clientId === client?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [cases, client?.id]
  );
  const activeCases = clientCases.filter(c => !c.isArchived && c.status !== CaseStatus.CLOSED);
  const archivedCases = clientCases.filter(c => c.isArchived);
  const closedCases = clientCases.filter(c => c.status === CaseStatus.CLOSED);

  const caseIds = useMemo(() => new Set(clientCases.map(c => c.id)), [clientCases]);

  const upcomingSessions = useMemo(
    () => (sessions || [])
      .filter(s => caseIds.has(s.caseId) && s.status === 'قادمة')
      .sort((a, b) => a.date.localeCompare(b.date)),
    [sessions, caseIds]
  );

  const clientTransactions = useMemo(
    () => (transactions || [])
      .filter(t => t.clientName === client?.name || caseIds.has(t.caseId || ''))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, client?.name, caseIds]
  );

  const incomeTotal = clientTransactions
    .filter(t => t.ioType.includes('وارد'))
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = clientTransactions
    .filter(t => t.ioType.includes('منصرف') || t.ioType.includes('صادر'))
    .reduce((sum, t) => sum + t.amount, 0);
  const netTotal = incomeTotal - expenseTotal;
  const totalAgreedFees = clientCases.reduce((sum, c) => sum + (c.totalFees || 0), 0);
  const totalPaidFees = clientCases.reduce((sum, c) => sum + (c.paidFees || 0), 0);
  const totalOutstanding = Math.max(0, totalAgreedFees - totalPaidFees);

  const clientPOAs = client?.poas || [];

  const clientDocuments = useMemo(
    () => (documents || []).filter(d => d.clientId === client?.id || caseIds.has(d.caseId || '')),
    [documents, client?.id, caseIds]
  );

  if (!open || !client) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-[95vw] h-[92vh] max-w-7xl flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* ─── HEADER ─── */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 text-white p-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* QR Code */}
              <div className="bg-white p-2 rounded-xl shrink-0">
                <QRCodeSVG
                  value={client.qrData || JSON.stringify({ id: client.id, name: client.name, nationalId: client.nationalId })}
                  size={70}
                  level="M"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <div className="bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider">ملف موكل</span>
                  </div>
                  <h1 className="text-xl font-black">{client.name}</h1>
                  {client.isArchived && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600/80">
                      مؤرشف
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-indigo-100 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    <strong>الرقم القومي:</strong> {client.nationalId || '—'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {client.phone || '—'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition shrink-0"
              title="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── TABS ─── */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const count =
                tab.id === 'cases' ? clientCases.length :
                tab.id === 'sessions' ? upcomingSessions.length :
                tab.id === 'financials' ? clientTransactions.length :
                tab.id === 'poas' ? clientPOAs.length :
                tab.id === 'documents' ? clientDocuments.length :
                null;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {count !== null && count > 0 && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── CONTENT ─── */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {activeTab === 'overview' && (
            <ClientOverviewTab
              client={client}
              activeCases={activeCases}
              archivedCases={archivedCases}
              closedCases={closedCases}
              upcomingSessions={upcomingSessions}
              incomeTotal={incomeTotal}
              expenseTotal={expenseTotal}
              netTotal={netTotal}
              totalAgreedFees={totalAgreedFees}
              totalPaidFees={totalPaidFees}
              totalOutstanding={totalOutstanding}
            />
          )}

          {activeTab === 'cases' && (
            <ClientCasesTab
              activeCases={activeCases}
              closedCases={closedCases}
              archivedCases={archivedCases}
            />
          )}

          {activeTab === 'sessions' && (
            <ClientSessionsTab sessions={upcomingSessions} />
          )}

          {activeTab === 'financials' && (
            <ClientFinancialsTab
              client={client}
              transactions={clientTransactions}
              incomeTotal={incomeTotal}
              expenseTotal={expenseTotal}
              netTotal={netTotal}
              totalAgreedFees={totalAgreedFees}
              totalPaidFees={totalPaidFees}
              totalOutstanding={totalOutstanding}
            />
          )}

          {activeTab === 'poas' && (
            <ClientPOAsTab poas={clientPOAs} client={client} />
          )}

          {activeTab === 'documents' && (
            <ClientDocumentsTab documents={clientDocuments} client={client} />
          )}
        </div>

        {/* ─── FOOTER ─── */}
        <div className="border-t border-slate-200 bg-white px-5 py-3 shrink-0 flex items-center justify-between">
          <div className="text-[10px] text-slate-400 font-mono">
            ID: {client.id} • مسجل: {formatDate(client.createdAt)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              تعديل بيانات الموكل
            </button>
            <button
              onClick={onPrint}
              className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة ملف الموكل
            </button>
            <button
              onClick={onClose}
              className="text-xs font-bold bg-slate-100 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-200 transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Tab Components
// ════════════════════════════════════════════════════════════════════════════

function ClientOverviewTab({ client, activeCases, archivedCases, closedCases, upcomingSessions, incomeTotal, expenseTotal, netTotal, totalAgreedFees, totalPaidFees, totalOutstanding }: {
  client: Client;
  activeCases: Case[];
  archivedCases: Case[];
  closedCases: Case[];
  upcomingSessions: Session[];
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  totalAgreedFees: number;
  totalPaidFees: number;
  totalOutstanding: number;
}) {
  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={<Briefcase />} label="قضايا نشطة" value={activeCases.length} color="indigo" />
        <KPICard icon={<Calendar />} label="جلسات قادمة" value={upcomingSessions.length} color="indigo" />
        <KPICard icon={<CheckCircle2 />} label="قضايا منتهية" value={closedCases.length} color="emerald" />
        <KPICard icon={<Wallet />} label="متبقي الأتعاب" value={formatCurrency(totalOutstanding)} color="rose" suffix="ج.م" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Info */}
        <InfoCard title="البيانات الشخصية" icon={<Users className="w-4 h-4" />}>
          <InfoRow label="الاسم الكامل" value={client.name} fullWidth />
          <InfoRow label="الرقم القومي" value={client.nationalId || '—'} />
          <InfoRow label="رقم الهاتف" value={client.phone || '—'} />
          <InfoRow label="البريد الإلكتروني" value={client.email || '—'} />
          <InfoRow label="العنوان" value={client.address || '—'} fullWidth />
        </InfoCard>

        {/* Case Stats */}
        <InfoCard title="إحصائيات القضايا" icon={<Briefcase className="w-4 h-4" />}>
          <InfoRow label="قضايا نشطة" value={`${activeCases.length} قضية`} />
          <InfoRow label="قضايا منتهية" value={`${closedCases.length} قضية`} />
          <InfoRow label="قضايا مؤرشفة" value={`${archivedCases.length} قضية`} />
          <InfoRow label="إجمالي التوكيلات" value={`${(client.poas || []).length} توكيل`} />
        </InfoCard>

        {/* Financial summary */}
        <InfoCard title="الملخص المالي" icon={<Wallet className="w-4 h-4" />}>
          <InfoRow label="إجمالي الأتعاب المتفق عليها" value={`${formatCurrency(totalAgreedFees)} ج.م`} />
          <InfoRow label="المسدد" value={`${formatCurrency(totalPaidFees)} ج.م`} />
          <InfoRow label="المتبقي" value={`${formatCurrency(totalOutstanding)} ج.م`} />
          <InfoRow label="صافي المعاملات" value={`${netTotal >= 0 ? '+' : ''}${formatCurrency(netTotal)} ج.م`} />
        </InfoCard>

        {/* Upcoming sessions preview */}
        <InfoCard title="الجلسات القادمة" icon={<Clock className="w-4 h-4" />}>
          {upcomingSessions.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">لا توجد جلسات قادمة</p>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.slice(0, 3).map(s => (
                <div key={s.id} className="bg-indigo-50 border border-indigo-200 p-2 rounded-lg">
                  <div className="text-[10px] font-bold text-indigo-800">{s.caseNumber}</div>
                  <div className="text-[10px] text-slate-700">{s.court} - {s.date}</div>
                </div>
              ))}
              {upcomingSessions.length > 3 && (
                <div className="text-center text-[10px] text-slate-500 font-bold">
                  +{upcomingSessions.length - 3} جلسة أخرى
                </div>
              )}
            </div>
          )}
        </InfoCard>
      </div>

      {/* Notes */}
      {client.notes && (
        <InfoCard title="ملاحظات" icon={<StickyNote className="w-4 h-4" />}>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
        </InfoCard>
      )}
    </div>
  );
}

function ClientCasesTab({ activeCases, closedCases, archivedCases }: { activeCases: Case[]; closedCases: Case[]; archivedCases: Case[]; }) {
  return (
    <div className="space-y-4">
      {activeCases.length > 0 && (
        <Section title={`القضايا النشطة (${activeCases.length})`} icon={<Briefcase className="w-4 h-4 text-indigo-600" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeCases.map(c => <CaseCard key={c.id} caseData={c} />)}
          </div>
        </Section>
      )}

      {closedCases.length > 0 && (
        <Section title={`القضايا المنتهية (${closedCases.length})`} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {closedCases.slice(0, 20).map(c => <CaseCard key={c.id} caseData={c} />)}
          </div>
        </Section>
      )}

      {archivedCases.length > 0 && (
        <Section title={`القضايا المؤرشفة (${archivedCases.length})`} icon={<AlertTriangle className="w-4 h-4 text-slate-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {archivedCases.slice(0, 20).map(c => <CaseCard key={c.id} caseData={c} />)}
          </div>
        </Section>
      )}

      {activeCases.length === 0 && closedCases.length === 0 && archivedCases.length === 0 && (
        <EmptyState message="لا توجد قضايا لهذا الموكل" />
      )}
    </div>
  );
}

function ClientSessionsTab({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return <EmptyState message="لا توجد جلسات قادمة لهذا الموكل" />;
  }
  return (
    <div className="space-y-2">
      {sessions.map(s => (
        <div key={s.id} className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-mono font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                  {s.caseNumber}
                </span>
                {s.time && (
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                    {s.time}
                  </span>
                )}
                <span className="text-[10px] font-bold text-indigo-800">قادمة</span>
              </div>
              <h4 className="font-black text-sm text-slate-900">{s.court} - دائرة {s.circuit || '—'}</h4>
              {s.judgeName && <div className="text-[10px] text-indigo-600 font-bold mt-0.5">القاضي: {s.judgeName}</div>}
              {s.objective && <p className="text-xs text-slate-600 mt-1">{s.objective}</p>}
            </div>
            <div className="text-start shrink-0">
              <div className="text-[10px] text-slate-500 font-bold">التاريخ</div>
              <div className="text-sm font-black text-indigo-700">{formatDate(s.date)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientFinancialsTab({ client, transactions, incomeTotal, expenseTotal, netTotal, totalAgreedFees, totalPaidFees, totalOutstanding }: {
  client: Client;
  transactions: Transaction[];
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  totalAgreedFees: number;
  totalPaidFees: number;
  totalOutstanding: number;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-emerald-700 font-bold mb-1">وارد</div>
          <div className="text-xl font-black text-emerald-700">{formatCurrency(incomeTotal)}</div>
          <div className="text-[9px] text-emerald-600 font-mono">ج.م</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-rose-700 font-bold mb-1">منصرف</div>
          <div className="text-xl font-black text-rose-700">{formatCurrency(expenseTotal)}</div>
          <div className="text-[9px] text-rose-600 font-mono">ج.م</div>
        </div>
        <div className={`border-2 rounded-2xl p-4 text-center ${netTotal >= 0 ? 'bg-indigo-50 border-indigo-300' : 'bg-rose-50 border-rose-300'}`}>
          <div className={`text-[10px] font-bold mb-1 ${netTotal >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>الصافي</div>
          <div className={`text-xl font-black ${netTotal >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
            {formatCurrency(Math.abs(netTotal))}
          </div>
          <div className={`text-[9px] font-mono ${netTotal >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>ج.م</div>
        </div>
        <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-slate-700 font-bold mb-1">متبقي الأتعاب</div>
          <div className="text-xl font-black text-slate-700">{formatCurrency(totalOutstanding)}</div>
          <div className="text-[9px] text-slate-600 font-mono">من {formatCurrency(totalAgreedFees)} ج.م</div>
        </div>
      </div>

      <InfoCard title="ملخص الأتعاب" icon={<Wallet className="w-4 h-4" />}>
        <InfoRow label="إجمالي الأتعاب المتفق عليها" value={`${formatCurrency(totalAgreedFees)} ج.م`} />
        <InfoRow label="المسدد" value={`${formatCurrency(totalPaidFees)} ج.م`} />
        <InfoRow label="المتبقي على الموكل" value={`${formatCurrency(totalOutstanding)} ج.م`} />
      </InfoCard>

      <Section title={`المعاملات المالية (${transactions.length})`} icon={<Wallet className="w-4 h-4 text-emerald-600" />}>
        {transactions.length === 0 ? (
          <EmptyState message="لا توجد معاملات مالية لهذا الموكل" />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold">
                <tr>
                  <th className="text-end p-2.5">التاريخ</th>
                  <th className="text-end p-2.5">القضية</th>
                  <th className="text-end p-2.5">النوع</th>
                  <th className="text-end p-2.5">الوصف</th>
                  <th className="text-start p-2.5">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 50).map(t => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="p-2.5 text-slate-600 font-mono text-[10px]">{t.date}</td>
                    <td className="p-2.5 text-slate-600 font-mono text-[10px]">{t.caseNumber || '—'}</td>
                    <td className="p-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.ioType.includes('وارد') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {t.ioType}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-700">{t.description}</td>
                    <td className={`p-2.5 text-start font-black ${
                      t.ioType.includes('وارد') ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {t.ioType.includes('وارد') ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function ClientPOAsTab({ poas, client }: { poas: PowerOfAttorney[]; client: Client }) {
  if (poas.length === 0) {
    return <EmptyState message={`لا توجد توكيلات مسجلة للموكل "${client.name}"`} />;
  }
  return (
    <div className="space-y-2">
      {poas.map(poa => (
        <div key={poa.id} className="bg-white border border-slate-200 p-4 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {poa.type}
                </span>
              </div>
              <h4 className="font-black text-sm text-slate-900">توكيل رقم: {poa.poaNumber}</h4>
              <div className="text-[10px] text-slate-500 mt-0.5">
                <strong>مكتب التوثيق:</strong> {poa.office}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                <strong>تاريخ الصدور:</strong> {formatDate(poa.date)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientDocumentsTab({ documents, client }: { documents: LawDocument[]; client: Client }) {
  if (documents.length === 0) {
    return <EmptyState message={`لا توجد مستندات مرتبطة بالموكل "${client.name}"`} />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {documents.map(d => (
        <div key={d.id} className="bg-white border border-slate-200 rounded-2xl p-3 hover:border-indigo-300 hover:shadow-sm transition">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-xs text-slate-900 truncate">{d.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{d.type}</div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">{d.fileName}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {d.fileSize} • {formatDate(d.uploadedAt)}
              </div>
              {d.caseNumber && (
                <div className="text-[9px] text-indigo-600 font-mono mt-0.5">
                  قضية: {d.caseNumber}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Shared sub-components
// ════════════════════════════════════════════════════════════════════════════

function KPICard({ icon, label, value, color, suffix }: {
  icon: React.ReactNode; label: string; value: number | string; color: 'indigo' | 'rose' | 'emerald'; suffix?: string;
}) {
  const colorMap = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700'
  };
  return (
    <div className={`border rounded-2xl p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="opacity-80">{icon}</div>
        <div className="text-[10px] font-bold opacity-80">{label}</div>
      </div>
      <div className="text-2xl font-black">
        {value}{suffix && <span className="text-xs font-mono ms-1 opacity-70">{suffix}</span>}
      </div>
    </div>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
        <div className="text-indigo-600">{icon}</div>
        <h3 className="font-black text-xs text-slate-800">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean; }) {
  return (
    <div className={`flex items-start gap-2 ${fullWidth ? '' : 'grid grid-cols-[120px_1fr]'}`}>
      <span className="text-[10px] text-slate-500 font-bold">{label}:</span>
      <span className="text-xs text-slate-800 font-medium flex-1">{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-black text-xs text-slate-700">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
      <p className="text-xs text-slate-500 font-bold">{message}</p>
    </div>
  );
}

function CaseCard({ key, caseData }: { key?: string; caseData: Case }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 hover:border-indigo-300 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
          {caseData.caseNumber}
        </span>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[caseData.status]}`}>
          {STATUS_LABELS[caseData.status]}
        </span>
      </div>
      <h4 className="font-black text-xs text-slate-900 mb-1 line-clamp-2">
        {caseData.claimSubject || 'بدون موضوع'}
      </h4>
      <div className="space-y-0.5 text-[10px] text-slate-600">
        <div><strong>المحكمة:</strong> {caseData.court}</div>
        <div><strong>النوع:</strong> {CASE_TYPE_LABELS[caseData.type]}</div>
        <div className="flex items-center gap-2">
          <strong>الأتعاب:</strong> {formatCurrency(caseData.totalFees || 0)} ج.م
          <span className="text-emerald-600 font-mono">
            ({formatCurrency(caseData.paidFees || 0)} مدفوع)
          </span>
        </div>
      </div>
    </div>
  );
}
