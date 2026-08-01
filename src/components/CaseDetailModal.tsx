/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CaseDetailModal — شاشة عرض احترافية لملف القضية.
 *
 * تصميم Modal ملء الشاشة مع تبويبات داخلية:
 *  - نظرة عامة: كل بيانات القضية + الإحصائيات
 *  - الجلسات: جدول كل الجلسات (قادمة + منتهية)
 *  - المستندات: المستندات المرفقة + الإحصائيات
 *  - المالية: كل المعاملات (وارد + منصرف) + صافي
 *  - الإجراءات: timeline للإجراءات
 *  - ملاحظات: ملاحظات حرة + أيقونات
 *
 * Header فيه:
 *  - رقم القضية
 *  - اسم الموكل
 *  - اسم الخصم
 *  - المحكمة + الدائرة
 *  - نوع القضية + درجتها
 *  - الحالة
 *  - QR Code
 *
 * Footer فيه:
 *  - زر "تعديل القضية"
 *  - زر "طباعة ملف القضية"
 *  - زر "إغلاق"
 */

import React, { useState, useMemo } from 'react';
import {
  X, Edit, Printer, Briefcase, Building2, Scale, Gavel,
  Calendar, FileText, Wallet, Clock, AlertTriangle, Users,
  CheckCircle2, Hash, MapPin, CalendarDays, StickyNote, Tag
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Case, Client, Session, Transaction, LegalDeadline, LawTask, LawDocument,
  OfficeProfile, CaseType, CaseStatus, LitigationLevel
} from '../types';
import { sanitizeHtml, stripHtml } from '../utils/sanitizer';
import { exportCaseAsPdf } from '../utils/pdfExportHelper';

export type CaseDetailTab = 'overview' | 'sessions' | 'documents' | 'financials' | 'notes';

export interface CaseDetailModalProps {
  open: boolean;
  onClose: () => void;
  caseData: Case | null;
  client: Client | null;
  sessions: Session[];
  deadlines?: LegalDeadline[];
  tasks?: LawTask[];
  documents?: LawDocument[];
  transactions: Transaction[];
  officeProfile: OfficeProfile;
  onEdit: () => void;
  onPrint: () => void;
}

const CASE_TYPE_LABELS: Record<CaseType, string> = {
  [CaseType.CIVIL]: 'مدني',
  [CaseType.CRIMINAL]: 'جنائي',
  [CaseType.PERSONAL_STATUS]: 'أسرة وأحوال شخصية',
  [CaseType.ADMINISTRATIVE]: 'مجلس الدولة (إداري)',
  [CaseType.COMMERCIAL]: 'تجاري وضريبي',
  [CaseType.LABOR]: 'عمالي'
};

const STATUS_LABELS: Record<CaseStatus, { label: string; color: string }> = {
  [CaseStatus.ACTIVE]: { label: 'متداولة', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  [CaseStatus.PLEADING]: { label: 'محجوزة للحكم', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  [CaseStatus.DISMISSED]: { label: 'مشطوبة', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  [CaseStatus.CLOSED]: { label: 'منتهية ومحفوظة', color: 'bg-slate-100 text-slate-600 border-slate-200' }
};

const LITIGATION_LABELS: Record<LitigationLevel, string> = {
  [LitigationLevel.FIRST_INSTANCE]: 'ابتدائي',
  [LitigationLevel.APPEAL]: 'استئناف',
  [LitigationLevel.CASSATION]: 'نقض'
};

const TABS: Array<{ id: CaseDetailTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'نظرة عامة', icon: <Briefcase className="w-3.5 h-3.5" /> },
  { id: 'sessions', label: 'الجلسات', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'documents', label: 'المستندات', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'financials', label: 'المالية', icon: <Wallet className="w-3.5 h-3.5" /> },
  { id: 'notes', label: 'ملاحظات', icon: <StickyNote className="w-3.5 h-3.5" /> }
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatDate(d: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return d; }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function CaseDetailModal(props: CaseDetailModalProps) {
  const {
    open, onClose, caseData, client, sessions, deadlines, tasks, documents,
    transactions, officeProfile, onEdit, onPrint
  } = props;

  const [activeTab, setActiveTab] = useState<CaseDetailTab>('overview');

  // ─── Computed data for tabs ────────────────────────────────────────────
  const caseSessions = useMemo(
    () => (sessions || []).filter(s => s.caseId === caseData?.id).sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, caseData?.id]
  );
  const upcomingSessions = caseSessions.filter(s => s.status === 'قادمة');
  const pastSessions = caseSessions.filter(s => s.status === 'منتهية');

  const caseDeadlines = useMemo(
    () => (deadlines || []).filter(d => d.caseId === caseData?.id).sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate)),
    [deadlines, caseData?.id]
  );
  const pendingDeadlines = caseDeadlines.filter(d => !d.isCompleted);

  const caseTasks = useMemo(
    () => (tasks || []).filter(t => t.caseId === caseData?.id),
    [tasks, caseData?.id]
  );

  const caseDocuments = useMemo(
    () => (documents || []).filter(d => d.caseId === caseData?.id),
    [documents, caseData?.id]
  );

  const caseTransactions = useMemo(
    () => (transactions || []).filter(t => t.caseId === caseData?.id).sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, caseData?.id]
  );

  const incomeTotal = caseTransactions
    .filter(t => t.ioType.includes('وارد'))
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = caseTransactions
    .filter(t => t.ioType.includes('منصرف') || t.ioType.includes('صادر'))
    .reduce((sum, t) => sum + t.amount, 0);
  const netTotal = incomeTotal - expenseTotal;

  if (!open || !caseData) return null;

  const statusInfo = STATUS_LABELS[caseData.status];

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
                  value={caseData.qrData || JSON.stringify({ id: caseData.id, num: caseData.caseNumber, file: caseData.fileNumber })}
                  size={70}
                  level="M"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <div className="bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider">ملف قضية</span>
                  </div>
                  <span className="text-2xl font-black font-mono tracking-wider">{caseData.caseNumber}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color} bg-white/95`}>
                    {statusInfo.label}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                    {CASE_TYPE_LABELS[caseData.type]}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                    {LITIGATION_LABELS[caseData.litigationLevel]}
                  </span>
                </div>
                <h1 className="text-base font-bold text-white/95 leading-tight mb-1">
                  ملف الدعوى: <span className="text-white">{stripHtml(caseData.claimSubject || '') || 'بدون موضوع'}</span>
                </h1>
                <div className="flex items-center gap-3 text-xs text-indigo-100 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <strong>الموكل:</strong> {caseData.clientName}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <strong>الخصم:</strong> {caseData.opponentName}
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
                tab.id === 'sessions' ? caseSessions.length :
                tab.id === 'documents' ? caseDocuments.length :
                tab.id === 'financials' ? caseTransactions.length :
                tab.id === 'notes' ? (caseData.notes ? 1 : 0) :
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
            <OverviewTab
              caseData={caseData}
              client={client}
              sessions={caseSessions}
              upcomingSessions={upcomingSessions}
              deadlines={caseDeadlines}
              pendingDeadlines={pendingDeadlines}
              tasks={caseTasks}
              documents={caseDocuments}
              transactions={caseTransactions}
              incomeTotal={incomeTotal}
              expenseTotal={expenseTotal}
              netTotal={netTotal}
              officeProfile={officeProfile}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionsTab
              caseSessions={caseSessions}
              upcomingSessions={upcomingSessions}
              pastSessions={pastSessions}
              deadlines={caseDeadlines}
              officeProfile={officeProfile}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsTab documents={caseDocuments} officeProfile={officeProfile} />
          )}

          {activeTab === 'financials' && (
            <FinancialsTab
              transactions={caseTransactions}
              incomeTotal={incomeTotal}
              expenseTotal={expenseTotal}
              netTotal={netTotal}
              caseData={caseData}
            />
          )}

          {activeTab === 'notes' && (
            <NotesTab caseData={caseData} />
          )}
        </div>

        {/* ─── FOOTER ─── */}
        <div className="border-t border-slate-200 bg-white px-5 py-3 shrink-0 flex items-center justify-between">
          <div className="text-[10px] text-slate-400 font-mono">
            ID: {caseData.id} • آخر تحديث: {caseData.updatedAt ? formatDate(caseData.updatedAt) : '—'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              تعديل القضية
            </button>
            <button
              onClick={onPrint}
              className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة ملف القضية
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

function OverviewTab({ caseData, client, sessions, upcomingSessions, deadlines, pendingDeadlines, tasks, documents, transactions, incomeTotal, expenseTotal, netTotal, officeProfile }: {
  caseData: Case;
  client: Client | null;
  sessions: Session[];
  upcomingSessions: Session[];
  deadlines: LegalDeadline[];
  pendingDeadlines: LegalDeadline[];
  tasks: LawTask[];
  documents: LawDocument[];
  transactions: Transaction[];
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  officeProfile: OfficeProfile;
}) {
  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={<Calendar />} label="جميع الجلسات" value={sessions.length} color="indigo" />
        <KPICard icon={<Clock />} label="جلسات قادمة" value={upcomingSessions.length} color="indigo" />
        <KPICard icon={<AlertTriangle />} label="مواعيد معلقة" value={pendingDeadlines.length} color="rose" />
        <KPICard icon={<Wallet />} label="صافي المالية" value={formatCurrency(netTotal)} color="emerald" suffix="ج.م" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Basic Info */}
        <InfoCard title="بيانات القضية الأساسية" icon={<Briefcase className="w-4 h-4" />}>
          <InfoRow label="رقم القضية" value={caseData.caseNumber} />
          <InfoRow label="السنة القضائية" value={caseData.year || '—'} />
          <InfoRow label="رقم الملف" value={caseData.fileNumber || '—'} />
          <InfoRow label="موضوع الدعوى" value={stripHtml(caseData.claimSubject || '') || '—'} fullWidth />
          <InfoRow label="نوع القضية" value={CASE_TYPE_LABELS[caseData.type]} />
          <InfoRow label="درجة التقاضي" value={LITIGATION_LABELS[caseData.litigationLevel]} />
          <InfoRow label="الحالة" value={STATUS_LABELS[caseData.status].label} />
        </InfoCard>

        {/* Court Info */}
        <InfoCard title="المحكمة والدائرة" icon={<Scale className="w-4 h-4" />}>
          <InfoRow label="المحكمة" value={caseData.court || '—'} fullWidth />
          <InfoRow label="الدائرة" value={caseData.circuit || '—'} />
        </InfoCard>

        {/* Client Info */}
        <InfoCard title="الموكل" icon={<Users className="w-4 h-4" />}>
          {client ? (
            <>
              <InfoRow label="الاسم" value={client.name} fullWidth />
              <InfoRow label="الرقم القومي" value={client.nationalId || '—'} />
              <InfoRow label="رقم الهاتف" value={client.phone || '—'} />
              <InfoRow label="البريد الإلكتروني" value={client.email || '—'} />
              <InfoRow label="العنوان" value={client.address || '—'} fullWidth />
            </>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">لا توجد بيانات للموكل</p>
          )}
        </InfoCard>

        {/* Opponent Info */}
        <InfoCard title="الخصم" icon={<Gavel className="w-4 h-4" />}>
          <InfoRow label="اسم الخصم" value={caseData.opponentName} fullWidth />
          {caseData.opponentLawyer && <InfoRow label="محامي الخصم" value={caseData.opponentLawyer} fullWidth />}
        </InfoCard>
      </div>

      {/* Notes preview */}
      {caseData.notes && (
        <InfoCard title="ملاحظات" icon={<StickyNote className="w-4 h-4" />}>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{caseData.notes}</p>
        </InfoCard>
      )}
    </div>
  );
}

function SessionsTab({ caseSessions, upcomingSessions, pastSessions, deadlines = [], officeProfile }: {
  caseSessions: Session[];
  upcomingSessions: Session[];
  pastSessions: Session[];
  deadlines: LegalDeadline[];
  officeProfile: OfficeProfile;
}) {
  return (
    <div className="space-y-4">
      {/* Upcoming sessions */}
      <Section title={`الجلسات القادمة (${upcomingSessions.length})`} icon={<Calendar className="w-4 h-4 text-indigo-600" />}>
        {upcomingSessions.length === 0 ? (
          <EmptyState message="لا توجد جلسات قادمة" />
        ) : (
          <div className="space-y-2">
            {upcomingSessions.map(s => <SessionCard key={s.id} session={s} />)}
          </div>
        )}
      </Section>

      {/* Past sessions */}
      <Section title={`الجلسات السابقة (${pastSessions.length})`} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}>
        {pastSessions.length === 0 ? (
          <EmptyState message="لا توجد جلسات سابقة" />
        ) : (
          <div className="space-y-2">
            {pastSessions.slice(0, 20).map(s => <SessionCard key={s.id} session={s} />)}
            {pastSessions.length > 20 && (
              <div className="text-center text-[10px] text-slate-500 font-bold py-2">
                +{pastSessions.length - 20} جلسة سابقة
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Deadlines */}
      <Section title={`المواعيد القانونية (${(deadlines || []).length})`} icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}>
        {(deadlines || []).length === 0 ? (
          <EmptyState message="لا توجد مواعيد قانونية" />
        ) : (
          <div className="space-y-2">
            {(deadlines || []).map(d => (
              <div key={d.id} className={`p-3 rounded-xl border ${d.isCompleted ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-black text-xs text-slate-900">{d.title}</div>
                    <p className="text-[10px] text-slate-600 mt-1">{d.lawReference}</p>
                  </div>
                  <div className="text-start shrink-0">
                    <div className="text-[10px] text-slate-500 font-bold">انتهاء الميعاد</div>
                    <div className="text-xs font-black text-rose-700">{formatDate(d.deadlineDate)}</div>
                    {d.isCompleted && <span className="text-[9px] text-emerald-600 font-bold">✓ تم</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function DocumentsTab({ documents, officeProfile }: { documents: LawDocument[]; officeProfile: OfficeProfile; }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-600 font-bold">
          {(documents || []).length} مستند
        </div>
      </div>
      {(documents || []).length === 0 ? (
        <EmptyState message="لا توجد مستندات مرفقة بهذه القضية" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(documents || []).map(d => (
            <div key={d.id} className="bg-white border border-slate-200 rounded-2xl p-3 hover:border-indigo-300 hover:shadow-sm transition">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs text-slate-900 truncate">{d.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {d.type} • {d.fileSize}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">{d.fileName}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{formatDate(d.uploadedAt)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinancialsTab({ transactions, incomeTotal, expenseTotal, netTotal, caseData }: {
  transactions: Transaction[];
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  caseData: Case;
}) {
  return (
    <div className="space-y-4">
      {/* Financial summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-emerald-700 font-bold mb-1">إجمالي الوارد</div>
          <div className="text-xl font-black text-emerald-700">{formatCurrency(incomeTotal)}</div>
          <div className="text-[9px] text-emerald-600 font-mono">ج.م</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-rose-700 font-bold mb-1">إجمالي المنصرف</div>
          <div className="text-xl font-black text-rose-700">{formatCurrency(expenseTotal)}</div>
          <div className="text-[9px] text-rose-600 font-mono">ج.م</div>
        </div>
        <div className={`border-2 rounded-2xl p-4 text-center ${netTotal >= 0 ? 'bg-indigo-50 border-indigo-300' : 'bg-rose-50 border-rose-300'}`}>
          <div className={`text-[10px] font-bold mb-1 ${netTotal >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>الصافي</div>
          <div className={`text-xl font-black ${netTotal >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
            {formatCurrency(Math.abs(netTotal))}
          </div>
          <div className={`text-[9px] font-mono ${netTotal >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            {netTotal >= 0 ? '+ ربح' : '- خسارة'} ج.م
          </div>
        </div>
      </div>

      {/* Required fees */}
      <InfoCard title="الرسوم والأتعاب" icon={<Wallet className="w-4 h-4" />}>
        <InfoRow label="إجمالي الأتعاب المتفق عليها" value={`${formatCurrency(caseData.totalFees || 0)} ج.م`} />
        <InfoRow label="المسدد من الأتعاب" value={`${formatCurrency(caseData.paidFees || 0)} ج.م`} />
        <InfoRow label="المتبقي" value={`${formatCurrency(Math.max(0, (caseData.totalFees || 0) - (caseData.paidFees || 0)))} ج.م`} />
      </InfoCard>

      {/* Transactions list */}
      <Section title={`المعاملات المالية (${transactions.length})`} icon={<Wallet className="w-4 h-4 text-emerald-600" />}>
        {transactions.length === 0 ? (
          <EmptyState message="لا توجد معاملات مالية" />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold">
                <tr>
                  <th className="text-end p-2.5">التاريخ</th>
                  <th className="text-end p-2.5">النوع</th>
                  <th className="text-end p-2.5">الوصف</th>
                  <th className="text-start p-2.5">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 50).map(t => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="p-2.5 text-slate-600 font-mono text-[10px]">{t.date}</td>
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

function NotesTab({ caseData }: { caseData: Case }) {
  return (
    <div className="space-y-4">
      {caseData.notes ? (
        <InfoCard title="ملاحظات القضية" icon={<StickyNote className="w-4 h-4" />}>
          <SafeHtmlContent html={caseData.notes} className="text-sm text-slate-700 leading-relaxed" />
        </InfoCard>
      ) : (
        <EmptyState message="لا توجد ملاحظات على هذه القضية" />
      )}

      {/* Legal references */}
      {caseData.legalReferences && caseData.legalReferences.length > 0 && (
        <InfoCard title="المراجع القانونية المرتبطة" icon={<Scale className="w-4 h-4" />}>
          <ul className="space-y-2">
            {caseData.legalReferences.map((ref, i) => (
              <li key={i} className="text-xs text-slate-700 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                {ref}
              </li>
            ))}
          </ul>
        </InfoCard>
      )}
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
    <div className={`flex items-start gap-2 ${fullWidth ? '' : 'grid grid-cols-[100px_1fr]'}`}>
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

// Safe HTML renderer — handles both plain text and HTML
function SafeHtmlContent({ html, className = '' }: { html: string; className?: string }) {
  // If it's plain text (no < tags), preserve line breaks
  const isHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!isHtml) {
    return <p className={`whitespace-pre-wrap ${className}`}>{html}</p>;
  }
  return <div className={`tiptap-editor-content ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

function SessionCard({ key, session }: { key?: string; session: Session }) {
  const isUpcoming = session.status === 'قادمة';
  return (
    <div className={`p-3 rounded-xl border ${isUpcoming ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              isUpcoming ? 'bg-indigo-600 text-white' : 'bg-slate-400 text-white'
            }`}>
              {session.status}
            </span>
            {session.time && (
              <span className="text-[10px] font-mono font-black text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                {session.time}
              </span>
            )}
          </div>
          <h4 className="font-black text-xs text-slate-900">{session.court} - دائرة {session.circuit || '—'}</h4>
          {session.judgeName && (
            <div className="text-[10px] text-indigo-600 font-bold mt-0.5">القاضي: {session.judgeName}</div>
          )}
          {session.objective && <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{session.objective}</p>}
          {session.decision && (
            <div className="mt-1.5 bg-emerald-50 border border-emerald-200 rounded p-1.5 text-[10px]">
              <strong className="text-emerald-700">قرار:</strong> <span className="text-slate-700">{session.decision}</span>
            </div>
          )}
        </div>
        <div className="text-start shrink-0">
          <div className="text-[10px] text-slate-500 font-bold">التاريخ</div>
          <div className="text-xs font-black text-slate-700">{formatDate(session.date)}</div>
        </div>
      </div>
    </div>
  );
}

