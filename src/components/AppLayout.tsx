/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AppLayout — المكون الرئيسي للقشرة البصرية للتطبيق.
 *
 * يستقبل كل الـ state والـ handlers من App.tsx كـ props، ويقوم بـ:
 *  1. الشريط العلوي للجوال
 *  2. القائمة الجانبية (sidebar) مع التنقل الرئيسي
 *  3. اختيار الثيم (theme picker)
 *  4. منطقة المحتوى الرئيسية مع كل التبويبات (Dashboard, Cases, ...)
 *  5. نافذة معاينة الطباعة
 *
 * هذا المكون لا يحتوي على state أو business logic — هو مسؤول فقط عن
 * العرض (presentation). كل المنطق موجود في App.tsx.
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Hammer,
  Briefcase,
  Users,
  Calendar,
  FileText,
  Wallet,
  Menu,
  X,
  Clock,
  Database,
  Palette,
  BookOpen,
  Settings,
  Archive,
  LogOut,
  Shield,
  Lock,
  Lightbulb,
  Printer,
  FileSignature,
  Calculator,
  Coins,
  Clipboard,
  ChevronLeft,
  UserMinus,
  Gavel,
  Search as SearchIcon,
  ListChecks,
  Loader2,
  UserCircle
} from 'lucide-react';

import AdSenseBanner from './AdSenseBanner';
import QuickActionHeader from './QuickActionHeader';
import WhatsNewModal, { useWhatsNew } from './WhatsNewModal';
import Dashboard from './Dashboard';
import CasesList from './CasesList';
import ClientsList from './ClientsList';
import OpponentsList from './OpponentsList';
import Notes from './Notes';
import { LocalErrorBoundary } from './LocalErrorBoundary';
import PrintPreviewModal from './PrintPreviewModal';
import SearchModal from './SearchModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import ProfilePage from './ProfilePage';

// v2.9.11: Extended lazy loading to more heavy components for better initial load performance
const ReportsPanel = lazy(() => import('./ReportsPanel'));
const CalendarView = lazy(() => import('./CalendarView'));
const LegalLibrary = lazy(() => import('./LegalLibrary'));
const LegalArticles = lazy(() => import('./LegalArticles'));
const DocumentManager = lazy(() => import('./DocumentManager'));
const SettingsPanel = lazy(() => import('./SettingsPanel'));
const Financials = lazy(() => import('./Financials'));
const TemplatesLibrary = lazy(() => import('./TemplatesLibrary'));
const ContractGenerator = lazy(() => import('./ContractGenerator'));
const InheritanceCalculator = lazy(() => import('./InheritanceCalculator'));
const CourtFeesCalculator = lazy(() => import('./CourtFeesCalculator'));
const TasksManager = lazy(() => import('./TasksManager'));
const ExecutionsManager = lazy(() => import('./ExecutionsManager'));
const BailiffPapersPanel = lazy(() => import('./BailiffPapersPanel'));
const ArchivePanel = lazy(() => import('./ArchivePanel'));
const DocketMaster = lazy(() => import('./docket/DocketMaster'));
const SecurityCenter = lazy(() => import('./SecurityCenter'));
const UsersManagement = lazy(() => import('./UsersManagement'));
const RolesManagement = lazy(() => import('./RolesManagement'));
const DatabaseSchemaVisualizer = lazy(() => import('./DatabaseSchemaVisualizer'));

import {
  Case,
  Client,
  Session,
  Transaction,
  LegalDeadline,
  LawTask,
  LawDocument,
  HourLog,
  Invoice,
  OfficeProfile,
  TypographySettings,
  BailiffPaper,
  PowerOfAttorney,
  Opponent,
  Execution,
  LegalReference
} from '../types';

function LazyFallback({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-600 shadow-sm">
      جارٍ تحميل <strong>{label}</strong>...
    </div>
  );
}

// ─── Theme registry ──────────────────────────────────────────────────────
const THEME_LABELS: Array<{ id: string; name: string }> = [
  { id: 'slate', name: 'رمادي افتراضي' },
  { id: 'golden', name: 'ذهبي دافئ' },
  { id: 'dark', name: 'داكن مريح' },
  { id: 'palace', name: 'أزرق ملكي' },
  { id: 'modern', name: 'عصري أنيق' },
  { id: 'natural', name: 'هادئ طبيعي' },
  { id: 'night', name: 'ليلي فاخر' },
  { id: 'cobalt', name: 'كوبالت فاخر' },
  { id: 'wine', name: 'نبيذي أنيق' },
  { id: 'carbon', name: 'كربوني رياضي' },
  { id: 'ivory', name: 'عاجي كلاسيك' },
  { id: 'sapphire', name: 'ياقوتي ملكي' },
  { id: 'rose', name: 'وردي هادئ' },
];

// ─── Sidebar menu registry ───────────────────────────────────────────────
const NAV_ITEMS: Array<{ id: string; label: string; icon: any; isDivider?: boolean; badge?: string }> = [
  { id: 'dashboard', label: 'رئيسية المكتب', icon: Hammer },
  { id: 'cases', label: 'إدارة القضايا', icon: Briefcase },
  { id: 'bailiff-papers', label: 'أوراق المحضرين والإعلانات', icon: Clipboard },
  { id: 'executions', label: 'التنفيذات والأحكام', icon: Gavel },
  { id: 'clients', label: 'موكلين المكتب', icon: Users },
  { id: 'opponents', label: 'الخصوم', icon: UserMinus },
  { id: 'notes', label: 'الملاحظات', icon: Lightbulb },
  { id: 'calendar', label: 'جدول الجلسات', icon: Calendar },
  { id: 'docket', label: 'دفتر المواعيد التفاعلي', icon: ListChecks, badge: 'جديد' },
  { id: 'tasks', label: 'المهام والإنذار المبكر', icon: Clock },
  { id: 'documents', label: 'المستندات والملفات', icon: FileText },
  { id: 'templates', label: 'إنشاء العقود والدعاوى', icon: FileSignature },
  { id: 'contract-generator', label: 'صانع العقود وصياغاتها', icon: FileSignature },
  { id: 'inheritance-calculator', label: 'حاسبة المواريث والتركات', icon: Calculator },
  { id: 'court-fees-calculator', label: 'حاسبة الرسوم والمصاريف', icon: Coins },
  { id: 'legal-library', label: 'المكتبة القانونية والبحث', icon: BookOpen },
  { id: 'legal-articles', label: 'المقالات القانونية', icon: FileText },
  { id: 'financials', label: 'الحسابات والمالية', icon: Wallet },
  { id: 'database', label: 'قاعدة البيانات والـ ERD', icon: Database },
  { id: 'reports', label: 'نظام التقارير الذكي', icon: Printer },
  { id: 'archive', label: 'الأرشيف القانوني والأوراق', icon: Archive },
  { id: 'profile', label: 'البيانات الشخصية للمحامي', icon: UserCircle, badge: 'جديد' },
  { id: 'settings', label: 'الإعدادات والضبط العام', icon: Settings },
  { id: '__divider__', label: 'إدارة المستخدمين والصلاحيات', icon: ChevronLeft, isDivider: true },
  { id: 'users', label: 'المستخدمون', icon: Users, badge: 'RBAC' },
  { id: 'roles', label: 'الأدوار والصلاحيات', icon: Shield },
  { id: 'security', label: 'الأمان والمراقبة', icon: Lock }
];

// ─── AppLayout Props ─────────────────────────────────────────────────────
export interface AppLayoutProps {
  // ─── Data ──────────────────────────────────────────────────────────────
  cases: Case[];
  clients: Client[];
  opponents: Opponent[];
  bailiffPapers: BailiffPaper[];
  sessions: Session[];
  transactions: Transaction[];
  deadlines: LegalDeadline[];
  tasks: LawTask[];
  documents: LawDocument[];
  executions: Execution[];
  hourLogs: HourLog[];
  invoices: Invoice[];

  // ─── Configuration / session ───────────────────────────────────────────
  officeProfile: OfficeProfile;
  sessionUser: { role: string; name: string };
  enabledMenus: Record<string, boolean>;
  appTheme: string;
  typographySettings: TypographySettings;

  // ─── Navigation state ──────────────────────────────────────────────────
  activeTab: string;
  drillCaseId: string | undefined;
  mobileMenuOpen: boolean;
  currentPrintJob: { title: string; htmlContent: string } | null;

  // ─── Setter callbacks (for nested components that need to update state) ──
  setMobileMenuOpen: (v: boolean) => void;
  setAppTheme: (v: any) => void;
  setEnabledMenus: (v: any) => void;
  setTypographySettings: (v: any) => void;
  setDrillCaseId: (v: string | undefined) => void;
  setCurrentPrintJob: (v: { title: string; htmlContent: string } | null) => void;
  setCases: React.Dispatch<React.SetStateAction<Case[]>>;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setDeadlines: React.Dispatch<React.SetStateAction<LegalDeadline[]>>;
  setTasks: React.Dispatch<React.SetStateAction<LawTask[]>>;
  setDocuments: React.Dispatch<React.SetStateAction<LawDocument[]>>;

  // ─── Domain handlers ───────────────────────────────────────────────────
  onAddCase: (c: Case) => void;
  onUpdateCase: (c: Case) => void;
  onDeleteCase: (id: string) => void;
  onArchiveCase: (id: string) => void;
  onRestoreCase: (id: string) => void;
  onSyncCasePaidFees: () => void;

  onAddClient: (c: Client) => void;
  onUpdateClient: (c: Client) => void;
  onDeleteClient: (id: string) => void;
  onArchiveClient: (id: string) => void;
  onRestoreClient: (id: string) => void;
  onAddPoaFromClient: (clientId: string, poa: PowerOfAttorney) => void;

  onAddOpponent: (o: Opponent) => void;
  onUpdateOpponent: (o: Opponent) => void;
  onLinkLegalReference?: (caseId: string, ref: LegalReference) => void;
  onDeleteOpponent: (id: string) => void;

  onAddBailiffPaper: (p: BailiffPaper) => void;
  onUpdateBailiffPaper: (p: BailiffPaper) => void;
  onDeleteBailiffPaper: (id: string) => void;

  onAddSession: (s: Session) => void;
  onUpdateSession: (s: Session) => void;
  onDeleteSession: (id: string) => void;
  onUpdateSessionDecision: (sessionId: string, decision: string) => void;
  onUpdateSessionGoogleEventId: (id: string, googleEventId: string) => void;
  onUpdateDeadlineGoogleEventId: (id: string, googleEventId: string) => void;

  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;

  onAddDeadline: (d: LegalDeadline) => void;
  onToggleDeadlineComplete: (id: string) => void;

  onAddTask: (t: LawTask) => void;
  onToggleTaskStatus: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (t: LawTask) => void;

  onAddExecution: (e: Execution) => void;
  onUpdateExecution: (e: Execution) => void;
  onDeleteExecution: (id: string) => void;

  onAddDocument: (d: LawDocument) => void;
  onDeleteDocument: (id: string) => void;
  onUpdateDocument: (d: LawDocument) => void;
  onArchiveDocument: (id: string) => void;
  onRestoreDocument: (id: string) => void;

  onAddHourLog: (l: HourLog) => void;
  onDeleteHourLog: (id: string) => void;
  onAddInvoice: (i: Invoice) => void;
  onUpdateInvoiceStatus: (id: string, status: 'غير مدفوعة' | 'مدفوعة بالكامل' | 'ملغاة') => void;

  // ─── Navigation handlers ───────────────────────────────────────────────
  onNavigate: (tab: any) => void;
  onShowInfoCenter?: () => void;
  onLogout?: () => void;
  onDrillCase: (caseId: string) => void;
  onUpdateOfficeProfile: (p: OfficeProfile) => void;
  onLicenseDeactivated: () => void;
}

const getThemeBgClass = (appTheme: string): string => {
  switch (appTheme) {
    case 'golden': return 'bg-[#FFFDF9] text-[#422006]';
    case 'dark': return 'bg-[#030712] text-[#f8fafc]';
    case 'palace': return 'bg-[#f8fafc] text-slate-900';
    case 'modern': return 'bg-[#F7F6F3] text-[#1c1917]';
    case 'natural': return 'bg-[#F8F6F1] text-[#292524]';
    case 'night': return 'bg-[#07051a] text-[#e8e4f0]';
    case 'cobalt': return 'bg-[#f0f4ff] text-[#1e1b4b]';
    case 'wine': return 'bg-[#fdf2f5] text-[#2e0a1a]';
    case 'carbon': return 'bg-[#0c0c0e] text-[#f4f4f5]';
    case 'ivory': return 'bg-[#fdfcf7] text-[#292524]';
    case 'sapphire': return 'bg-[#0a1628] text-[#e0eeff]';
    case 'rose': return 'bg-[#fff5f7] text-[#2d0a14]';
    default: return 'bg-[#f0f2f5] text-slate-800';
  }
};

export default function AppLayout(props: AppLayoutProps) {
  const {
    cases, clients, opponents, bailiffPapers,
    sessions, transactions, deadlines, tasks, documents, executions,
    hourLogs, invoices,
    officeProfile, sessionUser, enabledMenus,
    appTheme, typographySettings,
    activeTab, drillCaseId, mobileMenuOpen, currentPrintJob,
    setMobileMenuOpen, setAppTheme, setEnabledMenus, setTypographySettings, setDrillCaseId, onLogout,
    setCurrentPrintJob, setCases, setClients, setSessions, setTransactions,
    setDeadlines, setTasks, setDocuments,
    onAddCase, onUpdateCase, onDeleteCase, onArchiveCase, onRestoreCase, onSyncCasePaidFees,
    onAddClient, onUpdateClient, onDeleteClient, onArchiveClient, onRestoreClient, onAddPoaFromClient,
    onAddOpponent, onUpdateOpponent, onDeleteOpponent,
    onAddBailiffPaper, onUpdateBailiffPaper, onDeleteBailiffPaper,
    onAddSession, onUpdateSession, onDeleteSession,
    onUpdateSessionDecision, onUpdateSessionGoogleEventId, onUpdateDeadlineGoogleEventId,
    onAddTransaction, onUpdateTransaction, onDeleteTransaction,
    onAddDeadline, onToggleDeadlineComplete,
    onAddTask, onToggleTaskStatus, onDeleteTask, onUpdateTask,
    onAddExecution, onUpdateExecution, onDeleteExecution,
    onAddDocument, onDeleteDocument, onUpdateDocument, onArchiveDocument, onRestoreDocument,
    onAddHourLog, onDeleteHourLog, onAddInvoice, onUpdateInvoiceStatus,
    onLinkLegalReference,
    onNavigate, onDrillCase, onUpdateOfficeProfile, onLicenseDeactivated,
    onShowInfoCenter
  } = props;

  // ─── Global search modal (Ctrl+K) ─────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={`theme-${appTheme} min-h-screen flex flex-col md:flex-row text-end font-sans transition-colors duration-200 ${getThemeBgClass(appTheme)}`} dir="rtl" id="lawfirm-app-root">

      {/* Dynamic typography scale overrides */}
      <style>{`
        :root {
          --custom-app-font: "${typographySettings.fontFamily}";
          --custom-font-scale: ${typographySettings.fontSizeMultiplier};
          --custom-text-color: ${typographySettings.textColor};
        }

        body, button, input, select, textarea, [class*="font-"] {
          font-family: var(--custom-app-font), "Cairo", "Tajawal", "Inter", system-ui, -apple-system, sans-serif !important;
        }

        html {
          font-size: calc(16px * var(--custom-font-scale)) !important;
        }

        .text-slate-950, .text-slate-900, .text-gray-950, .text-gray-900 {
          color: var(--custom-text-color) !important;
        }
      `}</style>

      {/* MOBILE HEADER BAR */}
      <div className="md:hidden bg-slate-800 text-slate-100 p-3 flex items-center justify-between border-b border-slate-700 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center">
            <span className="text-white text-xs">⚖️</span>
          </div>
          <span className="font-bold text-sm tracking-tight">مكتب المُحَامِي الرَّقْمِي</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-1.5 rounded bg-slate-700 text-slate-200 hover:bg-slate-600"
            title="بحث شامل (Ctrl+K)"
          >
            <SearchIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded bg-slate-705 text-slate-250"
            id="mobile-hamburger-btn"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR (قائمة التنقل الكبرى) */}
      <aside className={`
        fixed md:sticky top-0 bottom-0 start-0 z-40
        w-[220px] bg-[#1a2333] text-slate-100 flex flex-col border-s border-slate-800/60
        transition-transform duration-300 transform md:transform-none shadow-lg shrink-0
        ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `} id="major-app-sidebar">
        {/* Brand Banner */}
        <div className="p-4 border-b border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-xs">⚖️</span>
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide leading-tight">مكتب المُحَامِي الرَّقْمِي</h1>
              <span className="text-[10px] text-slate-400 block">منظومة العدالة بمصر</span>
            </div>
          </div>
          {onShowInfoCenter && (
            <button
              onClick={onShowInfoCenter}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-l from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/30 hover:to-purple-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-200 hover:text-white rounded-lg px-3 py-2 text-[11px] font-black transition cursor-pointer"
              title="العودة إلى مركز المعلومات"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>مركز المعلومات</span>
            </button>
          )}
        </div>

        {/* GLOBAL SEARCH BUTTON (Ctrl+K) — مرئي من أي مكان */}
        <div className="p-3 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-2.5 transition group"
            id="global-search-btn"
            title="بحث شامل في كل البيانات (Ctrl+K)"
          >
            <SearchIcon className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-xs font-bold flex-1 text-end">بحث شامل</span>
            <kbd className="hidden lg:inline-block text-[9px] font-mono font-bold bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 group-hover:border-slate-600">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* User Badge context */}
        <div className="p-2 px-3 mx-3 my-2 bg-slate-800/40 border border-slate-800/60 rounded flex items-center justify-between gap-1 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="space-y-0.5 text-end">
              <p className="font-semibold text-slate-300">{sessionUser.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">{sessionUser.role}</p>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('lawfirm_logged_in');
              localStorage.removeItem('lawfirm_user_name');
              localStorage.removeItem('lawfirm_user_role');
              if (typeof onLogout === 'function') {
                onLogout();
              }
            }}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-850 rounded transition cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Nav list options */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 text-xs overflow-y-auto">
          {NAV_ITEMS.filter(item => enabledMenus[item.id] !== false).map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;

            if ((item as any).isDivider) {
              return (
                <div
                  key={item.id}
                  className="px-3 pt-4 pb-1.5 text-[10px] font-black text-indigo-500/80 uppercase tracking-wider flex items-center gap-2 select-none cursor-default"
                  aria-hidden="true"
                >
                  <span className="h-px flex-1 bg-slate-700/60" />
                  <span>{item.label}</span>
                  <span className="h-px flex-1 bg-slate-700/60" />
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id as any);
                  setMobileMenuOpen(false);
                  if (item.id !== 'cases') setDrillCaseId(undefined);
                }}
                className={`
                  w-full text-end px-3 py-1.5 rounded font-semibold flex items-center gap-3 transition text-xs cursor-pointer
                  ${isActive
                    ? 'bg-indigo-600 text-white border border-indigo-500/25'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  }
                `}
                id={`sidebar-link-${item.id}`}
              >
                <IconComponent className="h-3.5 w-3.5 opacity-80" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Theme select option */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/40 text-xs text-end space-y-1.5 shrink-0">
          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 justify-end">
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            تغيير مظهر الواجهة القضائية
          </p>
          <div className="grid grid-cols-2 gap-1">
            {THEME_LABELS.map(thm => (
              <button
                key={thm.id}
                onClick={() => setAppTheme(thm.id as any)}
                className={`py-1 px-1 rounded text-[9px] font-bold transition border cursor-pointer ${
                  appTheme === thm.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-800/30 text-slate-400 border-slate-800/70 hover:bg-slate-800 hover:text-white'
                }`}
                id={`theme-btn-${thm.id}`}
              >
                {thm.name}
              </button>
            ))}
          </div>
        </div>

        {/* Footer info lockup */}
        <div className="p-2.5 border-t border-slate-800 text-[10px] text-slate-500 text-center leading-relaxed shrink-0 space-y-1.5">
          <p>مطابق لقوانين المرافعات المصرية</p>
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            className="text-indigo-400 hover:text-indigo-300 underline font-semibold transition cursor-pointer"
          >
            سياسة الخصوصية والإعلانات
          </button>
          <p className="font-mono opacity-60">v2.9.10 • نقابة المحامين</p>
        </div>
      </aside>

      {/* OVERLAY for mobile view */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        ></div>
      )}

      {/* MAIN VIEW CONTROLLER (منطقة العمل الرئيسية) */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-full flex flex-col gap-6 theme-main-bg">

        <QuickActionHeader
          clients={clients}
          cases={cases}
          sessions={sessions}
          tasks={tasks}
          transactions={transactions}
          bailiffPapers={bailiffPapers}
          activeTab={activeTab}
          onAddCase={onAddCase}
          onUpdateCase={onUpdateCase}
          onAddClient={onAddClient}
          onUpdateClient={onUpdateClient}
          onAddSession={onAddSession}
          onUpdateSession={onUpdateSession}
          onAddTask={onAddTask}
          onToggleTaskStatus={onToggleTaskStatus}
          onAddTransaction={onAddTransaction}
          onAddBailiffPaper={onAddBailiffPaper}
          onUpdateBailiffPaper={onUpdateBailiffPaper}
          officeProfile={officeProfile}
          onUpdateOfficeProfile={onUpdateOfficeProfile}
          onNavigate={onNavigate}
        />

                <AdSenseBanner slot="2168039898" format="horizontal" className="max-w-5xl mx-auto" />
        {/* TAB CONTENT RENDERING */}
        {activeTab === 'dashboard' && (
          <LocalErrorBoundary label="لوحة التحكم">
            <Dashboard
              cases={cases}
              clients={clients}
              sessions={sessions}
              transactions={transactions}
              deadlines={deadlines}
              bailiffPapers={bailiffPapers}
              onNavigate={onNavigate}
              onSelectCase={onDrillCase}
              onDeleteSession={onDeleteSession}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'cases' && (
          <LocalErrorBoundary label="إدارة القضايا">
            <CasesList
              cases={cases}
              clients={clients}
              opponents={opponents}
              sessions={sessions}
              transactions={transactions}
              onAddCase={onAddCase}
              onUpdateCase={onUpdateCase}
              onDeleteCase={onDeleteCase}
              onAddSessionFromCase={onAddSession}
              onUpdateSessionFromCase={onUpdateSession}
              onDeleteSessionFromCase={onDeleteSession}
              onAddTransactionFromCase={onAddTransaction}
              selectedCaseIdFromDashboard={drillCaseId || null}
              clearDashboardCaseSelection={() => setDrillCaseId(undefined)}
              onArchiveCase={onArchiveCase}
              officeProfile={officeProfile}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'clients' && (
          <LocalErrorBoundary label="قائمة الموكلين">
            <ClientsList
              clients={clients}
              cases={cases}
              documents={documents}
              onAddDocument={onAddDocument}
              onDeleteDocument={onDeleteDocument}
              onUpdateDocument={onUpdateDocument}
              transactions={transactions}
              onAddTransaction={onAddTransaction}
              onUpdateTransaction={onUpdateTransaction}
              onDeleteTransaction={onDeleteTransaction}
              sessions={sessions}
              onAddSession={onAddSession}
              onUpdateSession={onUpdateSession}
              onDeleteSession={onDeleteSession}
              onAddClient={onAddClient}
              onUpdateClient={onUpdateClient}
              onDeleteClient={onDeleteClient}
              onAddPoaFromClient={onAddPoaFromClient}
              onSelectCase={onDrillCase}
              onNavigateToCases={() => {
                setDrillCaseId(undefined);
                onNavigate('cases');
              }}
              onArchiveClient={onArchiveClient}
              officeProfile={officeProfile}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'opponents' && (
          <LocalErrorBoundary label="الخصوم">
            <OpponentsList
              cases={cases}
              onSelectCase={(caseId: string) => {
                setDrillCaseId(caseId);
                onNavigate('cases');
              }}
              onNavigateToCases={() => {
                setDrillCaseId(undefined);
                onNavigate('cases');
              }}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'notes' && (
          <LocalErrorBoundary label="الملاحظات">
            <Notes cases={cases} />
          </LocalErrorBoundary>
        )}

        {activeTab === 'users' && (
          <LocalErrorBoundary label="إدارة المستخدمين">
            <UsersManagement />
          </LocalErrorBoundary>
        )}

        {activeTab === 'roles' && (
          <LocalErrorBoundary label="الأدوار والصلاحيات">
            <RolesManagement />
          </LocalErrorBoundary>
        )}

        {activeTab === 'security' && (
          <LocalErrorBoundary label="الأمان والمراقبة">
            <SecurityCenter />
          </LocalErrorBoundary>
        )}

        {activeTab === 'calendar' && (
          <LocalErrorBoundary label="جدول الجلسات">
            <Suspense fallback={<LazyFallback label="جدول الجلسات" />}>
              <CalendarView
                sessions={sessions}
                deadlines={deadlines}
                cases={cases}
                tasks={tasks}
                clients={clients}
                onAddDeadline={onAddDeadline}
                onToggleDeadlineComplete={onToggleDeadlineComplete}
                onToggleTaskStatus={onToggleTaskStatus}
                onUpdateSessionDecision={onUpdateSessionDecision}
                onUpdateSessionGoogleEventId={onUpdateSessionGoogleEventId}
                onUpdateDeadlineGoogleEventId={onUpdateDeadlineGoogleEventId}
                onAddSession={onAddSession}
                onUpdateSession={onUpdateSession}
                onDeleteSession={onDeleteSession}
                officeProfile={officeProfile}
              />
            </Suspense>
          </LocalErrorBoundary>
        )}

        {activeTab === 'docket' && (
          <LocalErrorBoundary label="دفتر المواعيد التفاعلي">
            <DocketMaster
              sessions={sessions}
              deadlines={deadlines}
              tasks={tasks}
              cases={cases}
              clients={clients}
              officeProfile={officeProfile}
              onNavigateToCase={onDrillCase}
              onUpdateSession={onUpdateSession}
              onDeleteSession={onDeleteSession}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onToggleTaskStatus={onToggleTaskStatus}
              onToggleDeadlineComplete={onToggleDeadlineComplete}
              onPrintJob={(title, html) => setCurrentPrintJob({ title, htmlContent: html })}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'tasks' && (
          <LocalErrorBoundary label="المهام والإنذار المبكر">
            <TasksManager
              tasks={tasks}
              cases={cases}
              sessions={sessions}
              deadlines={deadlines}
              onAddTask={onAddTask}
              onToggleTaskStatus={onToggleTaskStatus}
              onDeleteTask={onDeleteTask}
              onUpdateTask={onUpdateTask}
              officeProfile={officeProfile}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'executions' && (
          <LocalErrorBoundary label="التنفيذات والأحكام">
            <ExecutionsManager
              executions={executions}
              cases={cases}
              clients={clients}
              onAddExecution={onAddExecution}
              onUpdateExecution={onUpdateExecution}
              onDeleteExecution={onDeleteExecution}
              officeProfile={officeProfile}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'documents' && (
          <LocalErrorBoundary label="المستندات والملفات">
            <Suspense fallback={<LazyFallback label="إدارة المستندات" />}>
              <DocumentManager
                documents={documents}
                cases={cases}
                clients={clients}
                bailiffPapers={bailiffPapers}
                onAddDocument={onAddDocument}
                onDeleteDocument={onDeleteDocument}
                onArchiveDocument={onArchiveDocument}
                onUpdateDocument={onUpdateDocument}
                officeProfile={officeProfile}
              />
            </Suspense>
          </LocalErrorBoundary>
        )}

        {activeTab === 'bailiff-papers' && (
          <LocalErrorBoundary label="أوراق المحضرين والإعلانات">
            <BailiffPapersPanel
              bailiffPapers={bailiffPapers}
              cases={cases}
              documents={documents}
              onAddDocument={onAddDocument}
              onDeleteDocument={onDeleteDocument}
              onAddPaper={onAddBailiffPaper}
              onUpdatePaper={onUpdateBailiffPaper}
              onDeletePaper={onDeleteBailiffPaper}
              officeProfile={officeProfile}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'financials' && (
          <LocalErrorBoundary label="الحسابات والمالية">
            <Financials
              transactions={transactions}
              cases={cases}
              clients={clients}
              hourLogs={hourLogs}
              invoices={invoices}
              onAddTransaction={onAddTransaction}
              onDeleteTransaction={onDeleteTransaction}
              onAddHourLog={onAddHourLog}
              onDeleteHourLog={onDeleteHourLog}
              onAddInvoice={onAddInvoice}
              onUpdateInvoiceStatus={onUpdateInvoiceStatus}
              onUpdateCase={onUpdateCase}
              onSyncCasePaidFees={onSyncCasePaidFees}
              officeProfile={officeProfile}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'templates' && (
          <LocalErrorBoundary label="إنشاء العقود والدعاوى">
            <TemplatesLibrary />
          </LocalErrorBoundary>
        )}

        {activeTab === 'contract-generator' && (
          <LocalErrorBoundary label="صانع العقود وصياغاتها">
            <ContractGenerator />
          </LocalErrorBoundary>
        )}

        {activeTab === 'inheritance-calculator' && (
          <LocalErrorBoundary label="حاسبة المواريث والتركات">
            <InheritanceCalculator />
            <AdSenseBanner slot="5434337426" className="max-w-4xl mx-auto w-full my-3" />
          </LocalErrorBoundary>
        )}

        {activeTab === 'court-fees-calculator' && (
          <LocalErrorBoundary label="حاسبة الرسوم والمصاريف">
            <CourtFeesCalculator />
            <AdSenseBanner slot="8607295670" className="max-w-4xl mx-auto w-full my-3" />
          </LocalErrorBoundary>
        )}

        {activeTab === 'legal-library' && (
          <LocalErrorBoundary label="المكتبة القانونية والبحث">
            <Suspense fallback={<LazyFallback label="المكتبة القانونية" />}>
              <LegalLibrary
                cases={cases}
                onLinkLegalReference={onLinkLegalReference}
              />
            </Suspense>
            <AdSenseBanner slot="9002240868" className="max-w-4xl mx-auto w-full my-3" />
          </LocalErrorBoundary>
        )}

        {activeTab === 'legal-articles' && (
          <LocalErrorBoundary label="المقالات القانونية">
            <Suspense fallback={<LazyFallback label="المقالات القانونية" />}>
              <LegalArticles />
            </Suspense>
          </LocalErrorBoundary>
        )}

        {activeTab === 'reports' && (
          <LocalErrorBoundary label="نظام التقارير الذكي">
            <Suspense fallback={<LazyFallback label="التقارير" />}>
              <ReportsPanel
                cases={cases}
                clients={clients}
                sessions={sessions}
                transactions={transactions}
                tasks={tasks}
                officeProfile={officeProfile}
                onDeleteSession={onDeleteSession}
              />
            </Suspense>
            <AdSenseBanner slot="6851909615" className="max-w-4xl mx-auto w-full my-3" />
          </LocalErrorBoundary>
        )}

        {activeTab === 'database' && (
          <LocalErrorBoundary label="قاعدة البيانات والـ ERD">
            <DatabaseSchemaVisualizer
              clients={clients}
              cases={cases}
              sessions={sessions}
              documents={documents}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'settings' && (
          <LocalErrorBoundary label="الإعدادات والترخيص">
            <Suspense fallback={<LazyFallback label="الإعدادات" />}>
              <SettingsPanel
              cases={cases}
              setCases={setCases}
              clients={clients}
              setClients={setClients}
              sessions={sessions}
              setSessions={setSessions}
              transactions={transactions}
              setTransactions={setTransactions}
              deadlines={deadlines}
              setDeadlines={setDeadlines}
              tasks={tasks}
              setTasks={setTasks}
              documents={documents}
              setDocuments={setDocuments}
              appTheme={appTheme}
              setAppTheme={setAppTheme}
              enabledMenus={enabledMenus}
              setEnabledMenus={setEnabledMenus}
              officeProfile={officeProfile}
              onUpdateOfficeProfile={onUpdateOfficeProfile}
              typographySettings={typographySettings}
              onUpdateTypographySettings={setTypographySettings}
              onLicenseDeactivated={onLicenseDeactivated}
            />
            </Suspense>
          </LocalErrorBoundary>
        )}

        {activeTab === 'archive' && (
          <LocalErrorBoundary label="الأرشيف القانوني والأوراق">
            <ArchivePanel
              clients={clients}
              cases={cases}
              documents={documents}
              onRestoreClient={onRestoreClient}
              onRestoreCase={onRestoreCase}
              onRestoreDocument={onRestoreDocument}
              onDeleteClient={onDeleteClient}
              onDeleteCase={onDeleteCase}
              onDeleteDocument={onDeleteDocument}
            />
          </LocalErrorBoundary>
        )}

        {activeTab === 'profile' && (
          <LocalErrorBoundary label="البيانات الشخصية للمحامي">
            <ProfilePage />
          </LocalErrorBoundary>
        )}

        {currentPrintJob && (
          <PrintPreviewModal
            title={currentPrintJob.title}
            htmlContent={currentPrintJob.htmlContent}
            onClose={() => setCurrentPrintJob(null)}
          />
        )}

        {/* Global full-text search modal (Ctrl+K) */}
        <SearchModal
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          cases={cases}
          clients={clients}
          sessions={sessions}
          deadlines={deadlines}
          tasks={tasks}
          transactions={transactions}
          documents={documents}
          onNavigateToCase={(id) => {
            setDrillCaseId(id);
            onNavigate('cases');
          }}
          onNavigateToClient={() => onNavigate('clients')}
          onNavigateToSession={() => onNavigate('calendar')}
        />

      </main>

      {/* Privacy Policy & Terms Modal required by Google AdSense */}
      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />

      {/* ─── v2.8.7: What's New modal (shown once per version) ─── */}
      <WhatsNewWrapper />

    </div>
  );
}


// ─── v2.8.7: What's New wrapper (one-time per version) ─────────────────────
function WhatsNewWrapper() {
  const [open, close] = useWhatsNew();
  if (!open) return null;
  return <WhatsNewModal onClose={close} />;
}
