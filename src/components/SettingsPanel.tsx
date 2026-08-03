/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SettingsPanel — لوحة الإعدادات الرئيسية للمنظومة
 * تتضمن: الملف الشخصي، الماليɡ التنبيهاʡ القوائم، النظام، الطباعɡ الصلاحياʡ الترخيص
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings,
  Building,
  Wallet,
  Bell,
  Menu,
  Settings2,
  Type,
  Users,
  Key,
  Shield,
  Archive,
  Check,
  X,
  Plus,
  Trash2,
  Edit,
  Upload,
  Download,
  RefreshCw,
  AlertTriangle,
  Palette,
  Sun,
  Moon,
  Monitor,
  Save,
  FileText,
  Image,
  Eye,
  EyeOff,
  Music,
  Volume2,
  Clock,
  Calendar,
  DollarSign,
  Percent,
  CreditCard,
  RotateCcw,
  HardDrive,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Info,
  LogOut,
  Globe,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  IdCard,
  Camera,
  Award,
  Star,
  Sliders,
} from 'lucide-react';
import type { Case, Client, Session, Transaction, LegalDeadline, LawTask, LawDocument, OfficeProfile, TypographySettings } from '../types';
import { useConfirm } from '../contexts/ConfirmContext';
import { checkForUpdate, type UpdateStatus } from '../utils/updateChecker';
import BackupRestorePanel from './BackupRestorePanel';
import CustomFieldsManager from './CustomFieldsManager';
import { showAlert } from '../utils/dialogs';
import packageJson from '../../package.json';

/* ═══════════════════════════════════════════════════════════════════════════════
   Types & Interfaces
   ═══════════════════════════════════════════════════════════════════════════════ */

interface SettingsPanelProps {
  cases: Case[];
  setCases: React.Dispatch<React.SetStateAction<Case[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  deadlines: LegalDeadline[];
  setDeadlines: React.Dispatch<React.SetStateAction<LegalDeadline[]>>;
  tasks: LawTask[];
  setTasks: React.Dispatch<React.SetStateAction<LawTask[]>>;
  documents: LawDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<LawDocument[]>>;
  appTheme: string;
  setAppTheme: (theme: string) => void;
  enabledMenus: Record<string, boolean>;
  setEnabledMenus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  officeProfile: OfficeProfile;
  onUpdateOfficeProfile: (profile: OfficeProfile) => void;
  typographySettings: TypographySettings;
  onUpdateTypographySettings: (settings: TypographySettings) => void;
  onLicenseDeactivated?: () => void;
}

interface AppUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'مدير النظام' | 'محامٍ أول' | 'محامٍ مساعد' | 'كاتب عدل' | 'مدير مكتب' | 'مراجع' | 'مشاهد';
  isActive: boolean;
  createdAt: string;
}

interface AlarmSettings {
  enabled: boolean;
  alarmSound: string;
  sessionAdvanceHours: number;
  deadlineAdvanceHours: number;
  sessionAutoReminder: boolean;
  deadlineAutoReminder: boolean;
  dailyDigest: boolean;
}

interface FeeSettings {
  hourlyRate: number;
  flatFee: number;
  consultationFee: number;
  courtFeePercentage: number;
  currency: string;
  paymentTerms: string;
  taxRate: number;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════════ */

const MENU_LABELS: Record<string, { label: string; description: string }> = {
  dashboard: { label: 'رئيسية المكتب', description: 'لوحة المؤشرات والإحصائيات العامة' },
  cases: { label: 'إدارة القضايا', description: 'ملفات القضايا والجلسات' },
  'bailiff-papers': { label: 'أوراق المحضرين', description: 'إعلانات وتكليفات المحضرين' },
  executions: { label: 'التنفيذات والأحكام', description: 'تتبع مراحل التقاضي بعد صدور الحكم' },
  clients: { label: 'الموكلين', description: 'دليل العملاء والشركات' },
  opponents: { label: 'الخصوم', description: 'قائمة الخصوم في القضايا' },
  notes: { label: 'الملاحظات', description: 'ملاحظات سريعة وملاحظات القضايا' },
  calendar: { label: 'جدول الجلسات', description: 'التقويم والمواعيد القضائية' },
  tasks: { label: 'المهام', description: 'التكليفات والإنذار المبكر' },
  documents: { label: 'المستندات', description: 'إدارة وحفظ الملفات والمستندات' },
  templates: { label: 'القوالب القانونية', description: 'صحف الدعاوى والعقود الجاهزة' },
  'contract-generator': { label: 'صانع العقود', description: 'إنشاء وصياغة العقود بالذكاء' },
  'inheritance-calculator': { label: 'حاسبة المواريث', description: 'حساب التركات والمواريث الشرعية' },
  'court-fees-calculator': { label: 'حاسبة الرسوم', description: 'حساب الرسوم والمصاريف القضائية' },
  'legal-library': { label: 'المكتبة القانونية', description: 'البحث في القوانين والسوابق القضائية' },
  financials: { label: 'المالية', description: 'الحسابات والخزينة والمصروفات' },
  database: { label: 'قاعدة البيانات', description: 'مخطط العلاقات والبيانات الفنية' },
  reports: { label: 'التقارير', description: 'نظام التقارير الذكي' },
  archive: { label: 'الأرشيف', description: 'الأرشيف القانوني العام' },
  settings: { label: 'الإعدادات', description: 'ضبط المنظومة والإعدادات العامة' },
  users: { label: 'المستخدمون', description: 'إدارة حسابات المستخدمين' },
  roles: { label: 'الأدوار والصلاحيات', description: 'تحديد صلاحيات كل دور' },
  security: { label: 'الأمان والمراقبة', description: 'سجل الأمان والمراقبة' },
};

const THEME_OPTIONS = [
  { id: 'slate', name: 'رمادي افتراضي', preview: 'bg-slate-300' },
  { id: 'golden', name: 'ذهبي دافئ', preview: 'bg-indigo-300' },
  { id: 'dark', name: 'داكن مريح', preview: 'bg-slate-800' },
  { id: 'palace', name: 'أزرق ملكي', preview: 'bg-blue-300' },
  { id: 'modern', name: 'عصري أنيق', preview: 'bg-zinc-300' },
  { id: 'natural', name: 'هادئ طبيعي', preview: 'bg-green-200' },
  { id: 'night', name: 'ليلي فاخر', preview: 'bg-indigo-900' },
  { id: 'cobalt', name: 'كوبالت فاخر', preview: 'bg-blue-400' },
  { id: 'wine', name: 'نبيذي أنيق', preview: 'bg-rose-300' },
  { id: 'carbon', name: 'كربوني رياضي', preview: 'bg-neutral-800' },
  { id: 'ivory', name: 'عاجي كلاسيك', preview: 'bg-indigo-50' },
  { id: 'sapphire', name: 'ياقوتي ملكي', preview: 'bg-blue-600' },
  { id: 'rose', name: 'وردي هادئ', preview: 'bg-pink-200' },
];

const ALARM_SOUNDS = [
  { id: 'classic', name: 'تنبيه كلاسيكي' },
  { id: 'modern', name: 'تنبيه عصري' },
  { id: 'court', name: 'صوت الجلسة القضائية' },
  { id: 'gavel', name: 'صوت المطرقة' },
  { id: 'chime', name: 'رنين أجراس' },
  { id: 'digital', name: 'تنبيه رقمي' },
  { id: 'soft', name: 'تنبيه هادئ' },
  { id: 'urgent', name: 'تنبيه عاجل' },
];

const FONT_FAMILIES = [
  { id: 'Cairo', label: 'Cairo — القاهرة الرسمية' },
  { id: 'Noto Kufi Arabic', label: 'Noto Kufi Arabic — كوفي عربية' },
  { id: 'Tajawal', label: 'Tajawal — تجول' },
  { id: 'Almarai', label: 'Almarai — المرعي' },
  { id: 'Readex Pro', label: 'Readex Pro — ريدكس برو' },
  { id: 'Amiri', label: 'Amiri — أميري' },
  { id: 'Scheherazade New', label: 'Scheherazade New — شهرزاد' },
  { id: 'Lateef', label: 'Lateef — لطيف' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'مدير النظام': ['all'],
  'محامٍ أول': ['cases', 'clients', 'sessions', 'documents', 'templates', 'calendar', 'tasks', 'reports', 'financials'],
  'محامٍ مساعد': ['cases', 'clients', 'sessions', 'documents', 'templates', 'calendar', 'tasks'],
  'كاتب عدل': ['cases', 'clients', 'documents', 'templates'],
  'مدير مكتب': ['cases', 'clients', 'sessions', 'documents', 'templates', 'calendar', 'tasks', 'reports', 'financials', 'settings'],
  'مراجع': ['cases', 'clients', 'sessions', 'documents', 'reports'],
  'مشاهد': ['cases', 'clients', 'calendar'],
};

const PERMISSION_LABELS: Record<string, string> = {
  all: 'صلاحيات كاملة',
  cases: 'إدارة القضايا',
  clients: 'إدارة الموكلين',
  sessions: 'إدارة الجلسات',
  documents: 'المستندات والملفات',
  templates: 'القوالب القانونية',
  calendar: 'التقويم والجلسات',
  tasks: 'المهام والتكليفات',
  reports: 'التقارير',
  financials: 'المالية والحسابات',
  settings: 'الإعدادات',
  archive: 'الأرشيف',
};

const CURRENCY_OPTIONS = [
  { id: 'EGP', label: 'جنيه مصري (ج.م)' },
  { id: 'USD', label: 'دولار أمريكي ($)' },
  { id: 'EUR', label: 'يورو (€)' },
  { id: 'SAR', label: 'ريال سعودي (ر.س)' },
  { id: 'AED', label: 'درهم إماراتي (د.إ)' },
  { id: 'KWD', label: 'دينار كويتي (د.ك)' },
];

const PAYMENT_TERMS = [
  'عند الاستلام',
  'خلال 7 أيام',
  'خلال 15 يوم',
  'خلال 30 يوم',
  'أقساط شهرية',
  'أقساط ربع سنوية',
  'حسب المرحلة القضائية',
];

const ARCHIVE_SEASONS_KEY = 'lawfirm_archive_seasons';
const FEE_SETTINGS_KEY = 'lawfirm_fee_settings';
const ALARM_SETTINGS_KEY = 'lawfirm_alarm_settings';

/* ═══════════════════════════════════════════════════════════════════════════════
   Utility Helpers
   ═══════════════════════════════════════════════════════════════════════════════ */

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Failed to load ${key}`, e);
  }
  return fallback;
}

function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key}`, e);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Shared Sub-Components (defined outside to prevent remount on every render)
   ═══════════════════════════════════════════════════════════════════════════════ */

const SectionCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${className}`}>
    {children}
  </div>
);

const FieldLabel = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="text-xs font-bold text-slate-700 mb-1.5 block">{children}</label>
);

const FieldInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition placeholder:text-slate-400 ${props.className || ''}`}
  />
);

const FieldSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition appearance-none ${props.className || ''}`}
  />
);

const SaveButton = ({ onClick, disabled = false, label = 'حفظ التعديلات' }: { onClick: () => void; disabled?: boolean; label?: string }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
  >
    <Save className="w-3.5 h-3.5" />
    {label}
  </button>
);

const ToggleSwitch = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? 'bg-indigo-600' : 'bg-slate-300'
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-[-5px]' : 'translate-x-[5px]'
      }`}
    />
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   SettingsPanel Component
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function SettingsPanel({
  cases,
  setCases,
  clients,
  setClients,
  sessions,
  setSessions,
  transactions,
  setTransactions,
  deadlines,
  setDeadlines,
  tasks,
  setTasks,
  documents,
  setDocuments,
  appTheme,
  setAppTheme,
  enabledMenus,
  setEnabledMenus,
  officeProfile,
  onUpdateOfficeProfile,
  typographySettings,
  onUpdateTypographySettings,
  onLicenseDeactivated,
}: SettingsPanelProps) {
  const confirm = useConfirm();

  /* ─── Sub-tab navigation ─── */
  type SubTab = 'profile' | 'financial' | 'alarms' | 'menus' | 'system' | 'typography' | 'access' | 'license' | 'backup' | 'customFields';
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('profile');

  /* ─── Profile state ─── */
  const [profileDraft, setProfileDraft] = useState<OfficeProfile>({ ...officeProfile });
  const [profileDirty, setProfileDirty] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  /* ─── Financial state ─── */
  const [feeSettings, setFeeSettings] = useState<FeeSettings>(() =>
    loadJSON(FEE_SETTINGS_KEY, {
      hourlyRate: 500,
      flatFee: 10000,
      consultationFee: 1000,
      courtFeePercentage: 15,
      currency: 'EGP',
      paymentTerms: 'خلال 30 يوم',
      taxRate: 14,
    })
  );

  /* ─── Alarm state ─── */
  const [alarmSettings, setAlarmSettings] = useState<AlarmSettings>(() =>
    loadJSON(ALARM_SETTINGS_KEY, {
      enabled: true,
      alarmSound: 'classic',
      sessionAdvanceHours: 24,
      deadlineAdvanceHours: 72,
      sessionAutoReminder: true,
      deadlineAutoReminder: true,
      dailyDigest: false,
    })
  );

  /* ─── Users state (simplified) ─── */
  const [users, setUsers] = useState<AppUser[]>(() => loadJSON('lawfirm_users', []));
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState<{ username: string; password: string; fullName: string; role: AppUser['role'] }>({
    username: '',
    password: '',
    fullName: '',
    role: 'محامٍ مساعد',
  });
  const [showPassword, setShowPassword] = useState(false);

  /* ─── System state ─── */
  const [archiveSeasons, setArchiveSeasons] = useState<string[]>(() =>
    loadJSON(ARCHIVE_SEASONS_KEY, [])
  );
  const [newSeasonYear, setNewSeasonYear] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── License state ─── */
  const [licenseData, setLicenseData] = useState<any>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);

  /* ─── Sub-tab labels for mobile ─── */
  const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'الملف', icon: <Building className="w-3.5 h-3.5" /> },
    { id: 'financial', label: 'المالية', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'alarms', label: 'التنبيهات', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'menus', label: 'القوائم', icon: <Menu className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'النظام', icon: <Settings2 className="w-3.5 h-3.5" /> },
    { id: 'typography', label: 'الخطوط', icon: <Type className="w-3.5 h-3.5" /> },
    { id: 'access', label: 'الصلاحيات', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'license', label: 'الترخيص', icon: <Key className="w-3.5 h-3.5" /> },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: <HardDrive className="w-3.5 h-3.5" /> },
    { id: 'customFields', label: 'الحقول المخصصة', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  /* ═══════════════════════════════════════════════════════════════════════════════
     Effects
     ═══════════════════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    setProfileDraft({ ...officeProfile });
    setProfileDirty(false);
  }, [officeProfile]);

  useEffect(() => {
    saveJSON(FEE_SETTINGS_KEY, feeSettings);
  }, [feeSettings]);

  useEffect(() => {
    saveJSON(ALARM_SETTINGS_KEY, alarmSettings);
  }, [alarmSettings]);

  useEffect(() => {
    saveJSON('lawfirm_users', users);
  }, [users]);

  useEffect(() => {
    saveJSON(ARCHIVE_SEASONS_KEY, archiveSeasons);
  }, [archiveSeasons]);

  useEffect(() => {
    async function loadLicense() {
      setLicenseLoading(true);
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.license?.check) {
          const result = await electronAPI.license.check();
          if (result.valid && result.payload) {
            setLicenseData(result.payload);
            if (result.payload.features && !Array.isArray(result.payload.features)) {
              result.payload.features = typeof result.payload.features === 'string'
                ? (result.payload.features as string).split(',').map(s => s.trim()).filter(Boolean)
                : [];
            }
          } else {
            setLicenseData(null);
          }
        } else {
          const stored = (window as any).__licenseData;
          if (stored) {
            setLicenseData(stored);
          } else {
            setLicenseData({
              plan: 'trial',
              customer: 'نسخة تجريبية — مكتب المحامي الرقمي',
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
              maxCases: 50,
              maxFiles: 100,
              features: ['قضايا', 'موكلين', 'جلسات', 'مستندات', 'قوالب'],
            });
          }
        }
      } catch (e) {
        console.warn('License check failed', e);
        setLicenseData(null);
      } finally {
        setLicenseLoading(false);
      }
    }
    loadLicense();
  }, []);

  /* ═══════════════════════════════════════════════════════════════════════════════
     Handlers
     ═══════════════════════════════════════════════════════════════════════════════ */

  /* ─── Profile handlers ─── */
  const handleProfileFieldChange = useCallback((field: keyof OfficeProfile, value: string) => {
    setProfileDraft(prev => ({ ...prev, [field]: value }));
    setProfileDirty(true);
  }, []);

  const handleSaveProfile = useCallback(() => {
    onUpdateOfficeProfile(profileDraft);
    setProfileDirty(false);
  }, [profileDraft, onUpdateOfficeProfile]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      await showAlert('يرجى اختيار ملف صورة صالح (PNG / JPG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      await showAlert('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleProfileFieldChange('logoDataUrl', dataUrl);
    };
    reader.readAsDataURL(file);
  }, [handleProfileFieldChange]);

  const handleStampUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      await showAlert('يرجى اختيار ملف صورة صالح (PNG / JPG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      await showAlert('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleProfileFieldChange('officeStampImage', dataUrl);
    };
    reader.readAsDataURL(file);
  }, [handleProfileFieldChange]);

  const handleRemoveLogo = useCallback(async () => {
    if (await confirm('هل أنت متأكد من حذف شعار المكتȿ', { title: 'حذف الشعار', danger: true })) {
      handleProfileFieldChange('logoDataUrl', '');
      setProfileDraft(prev => ({ ...prev, logoDataUrl: '' }));
    }
  }, [confirm, handleProfileFieldChange]);

  const handleRemoveStamp = useCallback(async () => {
    if (await confirm('هل أنت متأكد من حذف صورة الخاتم الرسمي؟', { title: 'حذف الخاتم', danger: true })) {
      handleProfileFieldChange('officeStampImage', '');
      setProfileDraft(prev => ({ ...prev, officeStampImage: '' }));
    }
  }, [confirm, handleProfileFieldChange]);

  /* ─── Menu toggle handler ─── */
  const handleToggleMenu = useCallback((menuId: string) => {
    setEnabledMenus(prev => {
      const next = { ...prev, [menuId]: !prev[menuId] };
      saveJSON('lawfirm_enabled_menus', next);
      return next;
    });
  }, [setEnabledMenus]);

  /* ─── System handlers ─── */
  const handleAddArchiveSeason = useCallback(async () => {
    const year = newSeasonYear.trim();
    if (!year) return;
    if (!/^\d{4}$/.test(year)) {
      await showAlert('يرجى إدخال سنة ميلادية صالحة (مثل 2024)');
      return;
    }
    if (archiveSeasons.includes(year)) {
      await showAlert('هذه الموسم موجود بالفعل');
      return;
    }
    if (await confirm(`هل تريد إضافة موسم أرشيفي للسنة ${year}؟`, { title: 'إضافة موسم أرشيفي' })) {
      const updated = [...archiveSeasons, year].sort((a, b) => b.localeCompare(a));
      setArchiveSeasons(updated);
      setNewSeasonYear('');
    }
  }, [newSeasonYear, archiveSeasons, confirm]);

  const handleDeleteArchiveSeason = useCallback(async (year: string) => {
    if (await confirm(`هل أنت متأكد من حذف الموسم الأرشيفي ${year}؟ لن تُحذف أي بيانات فعلية من الأرشيف.`, { title: 'حذف موسم أرشيفي', danger: true })) {
      setArchiveSeasons(prev => prev.filter(s => s !== year));
    }
  }, [confirm]);

  const handleExportData = useCallback(async () => {
    if (await confirm('هل تريد تصدير نسخة احتياطية كاملة من جميع بيانات التطبي޿', { title: 'تصدير نسخة احتياطية' })) {
      setExportStatus('exporting');
      try {
        const exportPayload = {
          exportDate: new Date().toISOString(),
          version: packageJson.version,
          data: {
            cases,
            clients,
            sessions,
            transactions,
            deadlines,
            tasks,
            documents,
            officeProfile,
            typographySettings,
            enabledMenus,
            feeSettings,
            alarmSettings,
            users,
            archiveSeasons,
          },
        };
        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lawfirm-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setExportStatus('done');
        setTimeout(() => setExportStatus('idle'), 3000);
      } catch (e) {
        console.error('Export failed', e);
        setExportStatus('error');
        setTimeout(() => setExportStatus('idle'), 3000);
      }
    }
  }, [confirm, cases, clients, sessions, transactions, deadlines, tasks, documents, officeProfile, typographySettings, enabledMenus, feeSettings, alarmSettings, users, archiveSeasons]);

  const handleImportData = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      await showAlert('يرجى اختيار ملف JSON صالح');
      return;
    }
    if (await confirm('هل أنت متأكد من استيراد البياناʿ سيتم استبدال جميع البيانات الحالية.', { title: 'استيراد نسخة احتياطية', danger: true })) {
      setImportStatus('importing');
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!imported.data) {
          await showAlert('الملف غير صالح — لا يحتوي على بيانات مُنسقة بشكل صحيح');
          setImportStatus('error');
          return;
        }
        const d = imported.data;
        if (d.cases) setCases(d.cases);
        if (d.clients) setClients(d.clients);
        if (d.sessions) setSessions(d.sessions);
        if (d.transactions) setTransactions(d.transactions);
        if (d.deadlines) setDeadlines(d.deadlines);
        if (d.tasks) setTasks(d.tasks);
        if (d.documents) setDocuments(d.documents);
        if (d.officeProfile) onUpdateOfficeProfile(d.officeProfile);
        if (d.typographySettings) onUpdateTypographySettings(d.typographySettings);
        if (d.enabledMenus) setEnabledMenus(d.enabledMenus);
        if (d.feeSettings) {
          setFeeSettings(d.feeSettings);
          saveJSON(FEE_SETTINGS_KEY, d.feeSettings);
        }
        if (d.alarmSettings) {
          setAlarmSettings(d.alarmSettings);
          saveJSON(ALARM_SETTINGS_KEY, d.alarmSettings);
        }
        if (d.users) setUsers(d.users);
        if (d.archiveSeasons) setArchiveSeasons(d.archiveSeasons);
        setImportStatus('done');
        setTimeout(() => setImportStatus('idle'), 3000);
      } catch (err) {
        console.error('Import failed', err);
        await showAlert('حدث خطأ أثناء استيراد البيانات. تأكد من أن الملف صحيح.');
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [confirm, setCases, setClients, setSessions, setTransactions, setDeadlines, setTasks, setDocuments, onUpdateOfficeProfile, onUpdateTypographySettings, setEnabledMenus]);

  const handleFactoryReset = useCallback(async () => {
    if (await confirm(
      '⚠️ تحذير خطير: سيؤدي هذا إلى حذف جميع بيانات التطبيق نهائياً (القضايǡ الموكلين، المستنداʡ الإعدادات).\n\nهل أنت متأكد تماماً من المتابعɿ',
      { title: 'إعادة ضبط المصنع', danger: true }
    )) {
      if (await confirm('تأكيد أخير: لن يمكن التراجع عن هذا الإجراء. اضغط "تأكيد" للمتابعة.', { title: 'تأكيد إعادة الضبط', danger: true })) {
        try {
          const keysToRemove = [
            'lawfirm_cases', 'lawfirm_clients', 'lawfirm_sessions', 'lawfirm_transactions',
            'lawfirm_deadlines', 'lawfirm_tasks', 'lawfirm_documents', 'lawfirm_hour_logs',
            'lawfirm_invoices', 'lawfirm_bailiff_papers', 'lawfirm_opponents',
            'lawfirm_office_profile', 'lawfirm_typography_settings', 'lawfirm_enabled_menus',
            'lawfirm_fee_settings', 'lawfirm_alarm_settings', 'lawfirm_users',
            'lawfirm_archive_seasons', 'lawfirm_notes',
            'lawfirm_custom_fields',
          ];
          keysToRemove.forEach(k => localStorage.removeItem(k));
          setCases([]);
          setClients([]);
          setSessions([]);
          setTransactions([]);
          setDeadlines([]);
          setTasks([]);
          setDocuments([]);
          window.location.reload();
        } catch (e) {
          console.error('Factory reset failed', e);
          await showAlert('حدث خطأ أثناء إعادة الضبط. يرجى المحاولة مرة أخرى.');
        }
      }
    }
  }, [confirm, setCases, setClients, setSessions, setTransactions, setDeadlines, setTasks, setDocuments]);

  /* ─── User management handlers ─── */
  const handleOpenAddUser = useCallback(() => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', fullName: '', role: 'محامٍ مساعد' });
    setShowPassword(false);
    setShowUserModal(true);
  }, []);

  const handleOpenEditUser = useCallback((user: AppUser) => {
    setEditingUser(user);
    setUserForm({ username: user.username, password: user.password, fullName: user.fullName, role: user.role });
    setShowPassword(false);
    setShowUserModal(true);
  }, []);

  const handleSaveUser = useCallback(async () => {
    if (!userForm.username.trim() || !userForm.fullName.trim()) {
      await showAlert('يرجى إدخال اسم المستخدم والاسم الكامل');
      return;
    }
    if (!editingUser && !userForm.password.trim()) {
      await showAlert('يرجى إدخال كلمة المرور');
      return;
    }
    const existingUser = users.find(u => u.username === userForm.username.trim() && u.id !== editingUser?.id);
    if (existingUser) {
      await showAlert('اسم المستخدم موجود بالفعل. يرجى اختيار اسم آخر.');
      return;
    }
    if (editingUser) {
      setUsers(prev => prev.map(u =>
        u.id === editingUser.id
          ? {
              ...u,
              username: userForm.username.trim(),
              password: userForm.password.trim() || u.password,
              fullName: userForm.fullName.trim(),
              role: userForm.role,
            }
          : u
      ));
    } else {
      const newUser: AppUser = {
        id: generateId(),
        username: userForm.username.trim(),
        password: userForm.password.trim(),
        fullName: userForm.fullName.trim(),
        role: userForm.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setUsers(prev => [...prev, newUser]);
    }
    setShowUserModal(false);
    setEditingUser(null);
  }, [userForm, editingUser, users]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (await confirm(`هل أنت متأكد من حذف المستخدم "${user.fullName}"؟`, { title: 'حذف مستخدم', danger: true })) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  }, [confirm, users]);

  const handleToggleUserActive = useCallback((userId: string) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    ));
  }, []);

  /* ─── License deactivation ─── */
  const handleDeactivateLicense = useCallback(async () => {
    if (await confirm('هل أنت متأكد من إلغاء تفعيل الترخيص؟ سيتوقف التطبيق عن العمل بعد إعادة التشغيل.', { title: 'إلغاء التفعيل', danger: true })) {
      const api = (window as any).electronAPI;
      try {
        if (api?.license?.deactivate) {
          await api.license.deactivate();
        }
        if (api?.dialogs?.alert) {
          await api.dialogs.alert('تم إلغاء التفعيل بنجاح. سيُعرض شاشة التفعيل الآن.');
        }
        (window as any).__licenseData = null;
        setLicenseData(null);
        if (onLicenseDeactivated) {
          onLicenseDeactivated();
        }
      } catch (e) {
        console.error('License deactivation failed', e);
        if (api?.dialogs?.alert) {
          await api.dialogs.alert('حدث خطأ أثناء إلغاء التفعيل.');
        }
      }
    }
  }, [confirm, onLicenseDeactivated]);

  /* ═══════════════════════════════════════════════════════════════════════════════
     Shared sub-components
     ═══════════════════════════════════════════════════════════════════════════════ */

  /* Sub-components are defined outside SettingsPanel to prevent remount on every render */

  /* ═══════════════════════════════════════════════════════════════════════════════
     Render: Main Panel
     ═══════════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6" dir="rtl">
      {/* ─── Header ─── */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي المحترف
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                لوحة الإعدادات والتهيئة
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center justify-start gap-2.5">
              <Settings className="w-6 h-6 text-indigo-400" />
              إعدادات المنظومة والتحكم العام
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              إدارة ملف المكتȡ الإعدادات الماليɡ التنبيهاʡ تخصيص القوائم، الخطوء حسابات المستخدمين، وبيانات الترخيص.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-start text-[10px] text-slate-400 space-y-0.5">
              <p>{cases.length} قضية — {clients.length} موكل — {documents.length} مستند</p>
              <p className="font-mono">v2.8.0 • نقابة المحامين</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sub-tab Navigation ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition border-b-2 ${
                activeSubTab === tab.id
                  ? 'text-indigo-700 border-indigo-600 bg-indigo-50/50'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════
         SUB-TAB: Profile (ملف المكتب)
         ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6">
          {/* Logo & Stamp */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Image className="w-4 h-4 text-indigo-500" />
              الشعار والخاتم الرسمي
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo */}
              <div className="space-y-3">
                <FieldLabel>شعار المكتب (Logo)</FieldLabel>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition relative group">
                  {profileDraft.logoDataUrl ? (
                    <div className="relative">
                      <img
                        src={profileDraft.logoDataUrl}
                        alt="شعار المكتب"
                        className="max-h-24 mx-auto object-contain rounded"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute top-0 start-0 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 transition opacity-0 group-hover:opacity-100"
                        title="حذف الشعار"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer py-6"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">اضغط لرفع شعار المكتب</p>
                      <p className="text-[10px] text-slate-300 mt-1">PNG — حد أقصى 2 ميجابايت</p>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                {profileDraft.logoDataUrl && (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 transition"
                  >
                    <Upload className="w-3 h-3" />
                    تغيير الشعار
                  </button>
                )}
              </div>

              {/* Stamp */}
              <div className="space-y-3">
                <FieldLabel>الخاتم الرسمي (Stamp)</FieldLabel>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition relative group">
                  {profileDraft.officeStampImage ? (
                    <div className="relative">
                      <img
                        src={profileDraft.officeStampImage}
                        alt="الخاتم الرسمي"
                        className="max-h-24 mx-auto object-contain rounded"
                      />
                      <button
                        onClick={handleRemoveStamp}
                        className="absolute top-0 start-0 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 transition opacity-0 group-hover:opacity-100"
                        title="حذف الخاتم"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer py-6"
                      onClick={() => stampInputRef.current?.click()}
                    >
                      <Stamp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">اضغط لرفع صورة الخاتم الرسمي</p>
                      <p className="text-[10px] text-slate-300 mt-1">PNG شفاف — حد أقصى 2 ميجابايت</p>
                    </div>
                  )}
                  <input
                    ref={stampInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleStampUpload}
                    className="hidden"
                  />
                </div>
                {profileDraft.officeStampImage && (
                  <button
                    onClick={() => stampInputRef.current?.click()}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 transition"
                  >
                    <Upload className="w-3 h-3" />
                    تغيير الخاتم
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Basic Info */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-500" />
              البيانات الأساسية للمكتب
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="officeName">اسم المكتب</FieldLabel>
                <FieldInput
                  id="officeName"
                  value={profileDraft.officeName}
                  onChange={e => handleProfileFieldChange('officeName', e.target.value)}
                  placeholder="مثال: مكتب المستشار أحمد منصور"
                />
              </div>
              <div>
                <FieldLabel htmlFor="managingPartner">الشريك المدير</FieldLabel>
                <FieldInput
                  id="managingPartner"
                  value={profileDraft.managingPartner}
                  onChange={e => handleProfileFieldChange('managingPartner', e.target.value)}
                  placeholder="مثال: المستشار أحمد منصور"
                />
              </div>
              <div>
                <FieldLabel htmlFor="barId">رقم نقابة المحامين</FieldLabel>
                <FieldInput
                  id="barId"
                  value={profileDraft.barId}
                  onChange={e => handleProfileFieldChange('barId', e.target.value)}
                  placeholder="مثال: 12345 / نقابة القاهرة"
                />
              </div>
              <div>
                <FieldLabel htmlFor="taxId">الرقم الضريبي</FieldLabel>
                <FieldInput
                  id="taxId"
                  value={profileDraft.taxId}
                  onChange={e => handleProfileFieldChange('taxId', e.target.value)}
                  placeholder="مثال: 123-456-789"
                />
              </div>
              <div>
                <FieldLabel htmlFor="phone">رقم الهاتف</FieldLabel>
                <FieldInput
                  id="phone"
                  value={profileDraft.phone}
                  onChange={e => handleProfileFieldChange('phone', e.target.value)}
                  placeholder="مثال: 01234567890"
                />
              </div>
              <div>
                <FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel>
                <FieldInput
                  id="email"
                  type="email"
                  value={profileDraft.email}
                  onChange={e => handleProfileFieldChange('email', e.target.value)}
                  placeholder="مثال: office@lawfirm.com"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel htmlFor="address">العنوان</FieldLabel>
                <FieldInput
                  id="address"
                  value={profileDraft.address}
                  onChange={e => handleProfileFieldChange('address', e.target.value)}
                  placeholder="مثال: 15 شارع الجمهوريɡ وسط البلϡ القاهرة"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel htmlFor="courtJurisdiction">الاختصاص القضائي</FieldLabel>
                <FieldInput
                  id="courtJurisdiction"
                  value={profileDraft.courtJurisdiction}
                  onChange={e => handleProfileFieldChange('courtJurisdiction', e.target.value)}
                  placeholder="مثال: المحاكم شمال القاهرة الكلية — الجزئية"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              {profileDirty && (
                <button
                  onClick={() => { setProfileDraft({ ...officeProfile }); setProfileDirty(false); }}
                  className="text-xs text-slate-500 hover:text-slate-700 font-bold transition"
                >
                  تراجع عن التغييرات
                </button>
              )}
              <SaveButton
                onClick={handleSaveProfile}
                disabled={!profileDirty}
                label="حفظ ملف المكتب"
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
         SUB-TAB: Financial (الإعدادات المالية)
         ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'financial' && (
        <div className="space-y-6">
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-500" />
              إعدادات الأتعاب والرسوم
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>سعر الساعة القانونية (ج.م)</FieldLabel>
                <FieldInput
                  type="number"
                  min={0}
                  value={feeSettings.hourlyRate}
                  onChange={e => setFeeSettings(prev => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                />
                <p className="text-[10px] text-slate-400 mt-1">يُستخدم في حساب ساعات العمل الفعلية</p>
              </div>
              <div>
                <FieldLabel>الأتعاب الثابتة (ج.م)</FieldLabel>
                <FieldInput
                  type="number"
                  min={0}
                  value={feeSettings.flatFee}
                  onChange={e => setFeeSettings(prev => ({ ...prev, flatFee: Number(e.target.value) }))}
                />
                <p className="text-[10px] text-slate-400 mt-1">الأتعاب المتفق عليها للقضية كاملاً</p>
              </div>
              <div>
                <FieldLabel>رسوم الاستشارة (ج.م)</FieldLabel>
                <FieldInput
                  type="number"
                  min={0}
                  value={feeSettings.consultationFee}
                  onChange={e => setFeeSettings(prev => ({ ...prev, consultationFee: Number(e.target.value) }))}
                />
                <p className="text-[10px] text-slate-400 mt-1">مبلغ الاستشارة القانونية الواحدة</p>
              </div>
              <div>
                <FieldLabel>نسبة الرسوم القضائية (%)</FieldLabel>
                <FieldInput
                  type="number"
                  min={0}
                  max={100}
                  value={feeSettings.courtFeePercentage}
                  onChange={e => setFeeSettings(prev => ({ ...prev, courtFeePercentage: Number(e.target.value) }))}
                />
                <p className="text-[10px] text-slate-400 mt-1">النسبة المئوية من مبلغ الدعوى</p>
              </div>
              <div>
                <FieldLabel>نسبة الضريبة المضافة (%)</FieldLabel>
                <FieldInput
                  type="number"
                  min={0}
                  max={100}
                  value={feeSettings.taxRate}
                  onChange={e => setFeeSettings(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                />
                <p className="text-[10px] text-slate-400 mt-1">ضريبة القيمة المضافة على الفواتير</p>
              </div>
              <div>
                <FieldLabel>العملة</FieldLabel>
                <FieldSelect
                  value={feeSettings.currency}
                  onChange={e => setFeeSettings(prev => ({ ...prev, currency: e.target.value }))}
                >
                  {CURRENCY_OPTIONS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </FieldSelect>
              </div>
              <div className="md:col-span-2">
                <FieldLabel>شروط الدفع الافتراضية</FieldLabel>
                <FieldSelect
                  value={feeSettings.paymentTerms}
                  onChange={e => setFeeSettings(prev => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  {PAYMENT_TERMS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </FieldSelect>
              </div>
            </div>
          </SectionCard>

          {/* Summary Preview */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              معاينة الإعدادات المالية
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-1">سعر الساعة</p>
                <p className="font-black text-indigo-600">{feeSettings.hourlyRate.toLocaleString('ar-EG')} ج.م</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-1">الأتعاب الثابتة</p>
                <p className="font-black text-indigo-600">{feeSettings.flatFee.toLocaleString('ar-EG')} ج.م</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-1">الرسوم القضائية</p>
                <p className="font-black text-indigo-600">{feeSettings.courtFeePercentage}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-1">الضريبة المضافة</p>
                <p className="font-black text-indigo-600">{feeSettings.taxRate}%</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
         SUB-TAB: Alarms (التنبيهات والتذكيرات)
         ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'alarms' && (
        <div className="space-y-6">
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-500" />
                إعدادات التنبيهات والتذكيرات
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {alarmSettings.enabled ? 'مفعّل' : 'معطّل'}
                </span>
                <ToggleSwitch
                  checked={alarmSettings.enabled}
                  onChange={() => setAlarmSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                />
              </div>
            </div>

            <div className={`space-y-5 transition-opacity ${alarmSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              {/* Alarm Sound */}
              <div>
                <FieldLabel>صوت التنبيه</FieldLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ALARM_SOUNDS.map(sound => (
                    <button
                      key={sound.id}
                      onClick={() => setAlarmSettings(prev => ({ ...prev, alarmSound: sound.id }))}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition ${
                        alarmSettings.alarmSound === sound.id
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      {sound.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advance Notice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>تنبيه الجلسات قبل (ساعات)</FieldLabel>
                  <FieldInput
                    type="number"
                    min={1}
                    max={168}
                    value={alarmSettings.sessionAdvanceHours}
                    onChange={e => setAlarmSettings(prev => ({ ...prev, sessionAdvanceHours: Number(e.target.value) }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">يُنصح بـ 24 ساعة على الأقل</p>
                </div>
                <div>
                  <FieldLabel>تنبيه المواعيد النهائية قبل (ساعات)</FieldLabel>
                  <FieldInput
                    type="number"
                    min={1}
                    max={720}
                    value={alarmSettings.deadlineAdvanceHours}
                    onChange={e => setAlarmSettings(prev => ({ ...prev, deadlineAdvanceHours: Number(e.target.value) }))}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">مواعيد الاستئناف والنقض تحتاج 72+ ساعة</p>
                </div>
              </div>

              {/* Auto Reminders */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700">التذكيرات التلقائية</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-700">تذكير الجلسات القادمة</p>
                      <p className="text-[10px] text-slate-400">إرسال إشعار تلقائي قبل كل جلسة قادمة</p>
                    </div>
                    <ToggleSwitch
                      checked={alarmSettings.sessionAutoReminder}
                      onChange={() => setAlarmSettings(prev => ({ ...prev, sessionAutoReminder: !prev.sessionAutoReminder }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-700">تذكير المواعيد النهائية</p>
                      <p className="text-[10px] text-slate-400">تنبيه عند اقتراب ميعاد استئناف أو طعن</p>
                    </div>
                    <ToggleSwitch
                      checked={alarmSettings.deadlineAutoReminder}
                      onChange={() => setAlarmSettings(prev => ({ ...prev, deadlineAutoReminder: !prev.deadlineAutoReminder }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-700">ملخص يومي للجلسات والمهام</p>
                      <p className="text-[10px] text-slate-400">ملخص شامل صباحي لكل ما هو مقرر اليوم</p>
                    </div>
                    <ToggleSwitch
                      checked={alarmSettings.dailyDigest}
                      onChange={() => setAlarmSettings(prev => ({ ...prev, dailyDigest: !prev.dailyDigest }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
         SUB-TAB: Menus (تخصيص القوائم)
         ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'menus' && (
        <div className="space-y-6">
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
              <Menu className="w-4 h-4 text-indigo-500" />
              تخصيص عناصر القائمة الجانبية
            </h3>
            <p className="text-xs text-slate-400 mb-4">يمكنك إخفاء أو إظهار أي قسم من أقسام التطبيق حسب احتياجك. عناصر "رئيسية المكتب" و "الإعدادات" ثابتة ولا يمكن إخفاؤها.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(MENU_LABELS).map(([id, info]) => {
                const isEnabled = enabledMenus[id] !== false;
                const isLocked = id === 'dashboard' || id === 'settings';
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      isEnabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'
                    } ${isLocked ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div>
                        <p className="text-xs font-bold text-slate-700">{info.label}</p>
                        <p className="text-[10px] text-slate-400">{info.description}</p>
                      </div>
                    </div>
                    {isLocked ? (
                      <span className="text-[10px] text-slate-400 font-bold px-2">ثابت</span>
                    ) : (
                      <ToggleSwitch
                        checked={isEnabled}
                        onChange={() => handleToggleMenu(id)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Theme selection in menus tab */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-500" />
              مظهر الواجهة
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {THEME_OPTIONS.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setAppTheme(theme.id)}
                  className={`p-3 rounded-xl text-center border-2 transition ${
                    appTheme === theme.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-full h-6 rounded-lg mb-2 ${theme.preview}`} />
                  <p className="text-[10px] font-bold text-slate-700">{theme.name}</p>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
         SUB-TAB: System (إعدادات النظام)
         ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'system' && (
        <div className="space-y-6">
          {/* v2.8.1: Redirect banner to backup sub-tab */}
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-slate-700 leading-relaxed">
              <strong className="text-indigo-900">النسخ الاحتياطي والاستيراد متاح في تبويب "النسخ الاحتياطي"</strong> في الشريط الجانبي للإعدادات.
              <br />
              يحتوي على: تحميل/رفع نسخة احتياطية، استعادة البيانات المفقودة، إعادة ضبط المصنع الكاملة (تمسح IndexedDB + localStorage).
            </div>
          </div>

          {/* Archive Seasons */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Archive className="w-4 h-4 text-indigo-500" />
              فترات الأرشيف القضائي
            </h3>
            <p className="text-xs text-slate-400 mb-4">إدارة المواسم الأرشيفية لتنظيم القضايا والمستندات حسب السنة القضائية.</p>
            
            <div className="flex items-center gap-2 mb-4">
              <FieldInput
                value={newSeasonYear}
                onChange={e => setNewSeasonYear(e.target.value)}
                placeholder="أدخل السنة (مثل 2024)"
                className="flex-1"
              />
              <button
                onClick={handleAddArchiveSeason}
                disabled={!newSeasonYear.trim()}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة
              </button>
            </div>

            {archiveSeasons.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">لا توجد مواسم أرشيفية بعد</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {archiveSeasons.map(year => (
                  <div
                    key={year}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-700">موسم {year}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteArchiveSeason(year)}
                      className="text-slate-400 hover:text-rose-500 transition p-1"
                      title="حذف الموسم"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Data Stats */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              إحصائيات البيانات المحفوظة
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'القضايا', count: cases.length, icon: <Briefcase className="w-4 h-4" /> },
                { label: 'الموكلين', count: clients.length, icon: <Users className="w-4 h-4" /> },
                { label: 'الجلسات', count: sessions.length, icon: <Calendar className="w-4 h-4" /> },
                { label: 'المعاملات', count: transactions.length, icon: <Wallet className="w-4 h-4" /> },
                { label: 'المهام', count: tasks.length, icon: <Clock className="w-4 h-4" /> },
                { label: 'المستندات', count: documents.length, icon: <FileText className="w-4 h-4" /> },
                { label: 'المواعيد', count: deadlines.length, icon: <AlertTriangle className="w-4 h-4" /> },
                { label: 'المستخدمين', count: users.length, icon: <Shield className="w-4 h-4" /> },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div className="text-indigo-400 flex justify-center mb-1">{stat.icon}</div>
                  <p className="text-lg font-black text-slate-800">{stat.count}</p>
                  <p className="text-[10px] text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
         SUB-TAB: Typography (إعدادات الطباعة والخطوط)
         ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'typography' && (
        <div className="space-y-6">
          {/* Font Family */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-500" />
              نوع الخط
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {FONT_FAMILIES.map(font => (
                <button
                  key={font.id}
                  onClick={() => onUpdateTypographySettings({ ...typographySettings, fontFamily: font.id })}
                  className={`p-3 rounded-xl text-center border-2 transition ${
                    typographySettings.fontFamily === font.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  style={{ fontFamily: font.id }}
                >
                  <p className="text-sm font-bold text-slate-800">أحمد منصور</p>
                  <p className="text-[10px] text-slate-400 mt-1">{font.id}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Font Size */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              حجم الخط
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="text-[10px]">صغير (0.8x)</span>
                <span className="font-bold text-indigo-600">{typographySettings.fontSizeMultiplier.toFixed(2)}x</span>
                <span className="text-[10px]">كبير (1.5x)</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.5}
                step={0.05}
                value={typographySettings.fontSizeMultiplier}
                onChange={e => onUpdateTypographySettings({
                  ...typographySettings,
                  fontSizeMultiplier: Number(e.target.value),
                })}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex gap-2 justify-center">
                {[0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.5].map(size => (
                  <button
                    key={size}
                    onClick={() => onUpdateTypographySettings({ ...typographySettings, fontSizeMultiplier: size })}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                      Math.abs(typographySettings.fontSizeMultiplier - size) < 0.01
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {size}x
                  </button>
                ))}
              </div>
              {/* Live Preview */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[10px] text-slate-400 mb-2 font-bold">معاينة مباشرة:</p>
                <p style={{ fontSize: `${typographySettings.fontSizeMultiplier}rem` }} className="text-slate-800 font-bold leading-relaxed">
                  نص تجريبي — المحكمة تنظر الدعوى رقم ١٢٣٤ لسنة ٢٠٢٤
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Text Color */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-500" />
              لون النص الأساسي
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={typographySettings.textColor}
                  onChange={e => onUpdateTypographySettings({ ...typographySettings, textColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                />
                <FieldInput
                  value={typographySettings.textColor}
                  onChange={e => onUpdateTypographySettings({ ...typographySettings, textColor: e.target.value })}
                  className="w-32"
                  placeholder="#0f172a"
                />
                <button
                  onClick={() => onUpdateTypographySettings({ ...typographySettings, textColor: '#0f172a' })}
                  className="text-xs text-slate-500 hover:text-slate-700 font-bold transition"
                >
                  إعادة الافتراضي
                </button>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {[
                  { color: '#0f172a', label: 'أسود داكن' },
                  { color: '#1e293b', label: 'أزرق داكن' },
                  { color: '#374151', label: 'رمادي داكن' },
                  { color: '#1c1917', label: 'بني داكن' },
                  { color: '#312e81', label: 'نيلي' },
                  { color: '#134e4a', label: 'أخضر داكن' },
                  { color: '#4c1d95', label: 'بنفسجي' },
                  { color: '#7f1d1d', label: 'أحمر داكن' },
                ].map(c => (
                  <button
                    key={c.color}
                    onClick={() => onUpdateTypographySettings({ ...typographySettings, textColor: c.color })}
                    className={`h-8 rounded-lg border-2 transition ${
                      typographySettings.textColor === c.color ? 'border-indigo-500 scale-110' : 'border-slate-200'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
         SUB-TAB: Access (إدارة المستخدمين والصلاحيات)
         ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'access' && (
        <div className="space-y-6">
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                إدارة المستخدمين ({users.length})
              </h3>
              <button
                onClick={handleOpenAddUser}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة مستخدم
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 mb-3">لم يتم إضافة أي مستخدمين بعد</p>
                <button
                  onClick={handleOpenAddUser}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                >
                  + إضافة أول مستخدم
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      user.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black ${
                        user.role === 'مدير النظام' ? 'bg-indigo-100 text-indigo-600' :
                        user.role === 'محامٍ أول' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {user.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{user.fullName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-mono">@{user.username}</span>
                          <span>•</span>
                          <span>{user.role}</span>
                          {!user.isActive && (
                            <>
                              <span>•</span>
                              <span className="text-rose-500 font-bold">معطّل</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleUserActive(user.id)}
                        className={`p-1.5 rounded-lg transition text-[10px] font-bold ${
                          user.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={user.isActive ? 'تعطيل' : 'تفعيل'}
                      >
                        {user.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleOpenEditUser(user)}
                        className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition"
                        title="تعديل"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Role Permissions Reference */}
          <SectionCard>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              صلاحيات الأدوار
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-end py-2 px-3 font-bold text-slate-600">الدور</th>
                    {Object.entries(PERMISSION_LABELS).filter(([k]) => k !== 'all').map(([key, label]) => (
                      <th key={key} className="text-center py-2 px-2 font-bold text-slate-500 text-[10px]">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
                    <tr key={role} className="border-b border-slate-100">
                      <td className="py-2 px-3 font-bold text-slate-700 text-[10px]">{role}</td>
                      {Object.keys(PERMISSION_LABELS).filter(k => k !== 'all').map(key => (
                        <td key={key} className="text-center py-2 px-2">
                          {perms.includes('all') || perms.includes(key) ? (
                            <Check className="w-3 h-3 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="w-3 h-3 text-slate-300 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
         SUB-TAB: License (معلومات الترخيص)
         ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'license' && (
        <div className="space-y-6">
          {licenseLoading ? (
            <SectionCard>
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-indigo-400 mx-auto mb-3 animate-spin" />
                <p className="text-xs text-slate-400">جاري التحقق من بيانات الترخيص...</p>
              </div>
            </SectionCard>
          ) : licenseData ? (
            <>
              {/* License Status */}
              <SectionCard className="border-emerald-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Key className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">الترخيص فعّال</h3>
                    <p className="text-[10px] text-emerald-600 font-bold">جميع الميزات متاحة</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">الخطة</p>
                    <p className="text-xs font-black text-indigo-600">{licenseData.plan === 'trial' ? 'تجريبية' : licenseData.plan === 'pro' ? 'محترف' : licenseData.plan === 'firm' ? 'مكتب' : 'مؤسسات'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">المالك</p>
                    <p className="text-xs font-black text-slate-700 truncate">{licenseData.customer || 'غير محدد'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">الحد الأقصى للقضايا</p>
                    <p className="text-xs font-black text-slate-700">{licenseData.maxCases || '∞'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">الحد الأقصى للملفات</p>
                    <p className="text-xs font-black text-slate-700">{licenseData.maxFiles || '∞'}</p>
                  </div>
                </div>
                {licenseData.expiresAt && (
                  <div className="mt-4 bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-emerald-600 font-bold">
                      صالح حتى: {new Date(licenseData.expiresAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {' — '}
                      {Math.max(0, Math.ceil((licenseData.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))} يوم متبقي
                    </p>
                  </div>
                )}
              </SectionCard>

              {/* Features */}
              {Array.isArray(licenseData.features) && licenseData.features.length > 0 && (
                <SectionCard>
                  <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-indigo-500" />
                    الميزات المتاحة في خطتك
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {licenseData.features.map((feature: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Deactivate */}
              <SectionCard className="border-rose-200">
                <h3 className="text-sm font-black text-rose-700 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  إجراءات الترخيص
                </h3>
                <div className="bg-rose-50 rounded-xl p-4">
                  <p className="text-xs text-rose-700 mb-3">
                    عند إلغاء التفعيل، سيتوقف التطبيق عن العمل ويُطلب منك إدخال رمز تفعيل جديد.
                  </p>
                  <button
                    onClick={handleDeactivateLicense}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    إلغاء تفعيل الترخيص
                  </button>
                </div>
              </SectionCard>
            </>
          ) : (
            /* No License */
            <SectionCard className="border-indigo-200">
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-black text-slate-700 mb-2">لم يتم العثور على ترخيص فعّال</h3>
                <p className="text-xs text-slate-400 mb-4">
                  يُرجى تفعيل الترخيص للحصول على جميع الميزات. في وضع التطويѡ يعمل التطبيق بدون ترخيص.
                </p>
                <div className="inline-flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-500">
                  <Info className="w-3.5 h-3.5" />
                  وضع التطوير — جميع الميزات متاحة مؤقتاً
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════
         User Form Modal
         ═══════════════════════════════════════════════════════════════════════════════ */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-[90] p-4" onClick={() => setShowUserModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <FieldLabel>الاسم الكامل</FieldLabel>
                <FieldInput
                  value={userForm.fullName}
                  onChange={e => setUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="مثال: المستشار أحمد منصور"
                />
              </div>
              <div>
                <FieldLabel>اسم المستخدم (للدخول)</FieldLabel>
                <FieldInput
                  value={userForm.username}
                  onChange={e => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="مثال: ahmed_admin"
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div>
                <FieldLabel>كلمة المرور</FieldLabel>
                <div className="relative">
                  <FieldInput
                    type={showPassword ? 'text' : 'password'}
                    value={userForm.password}
                    onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={editingUser ? 'اترك فارغاً للاحتفاظ بكلمة المرور الحالية' : 'أدخل كلمة المرور'}
                    className="ps-10"
                    dir="ltr"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel>الدور الوظيفي</FieldLabel>
                <FieldSelect
                  value={userForm.role}
                  onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value as AppUser['role'] }))}
                >
                  {Object.keys(ROLE_PERMISSIONS).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </FieldSelect>
                <div className="mt-2 bg-slate-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-400 mb-1.5 font-bold">الصلاحيات الممنوحة:</p>
                  <div className="flex flex-wrap gap-1">
                    {(ROLE_PERMISSIONS[userForm.role] || []).map(perm => (
                      <span key={perm} className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {PERMISSION_LABELS[perm] || perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowUserModal(false)}
                className="text-xs font-bold bg-slate-100 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-200 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveUser}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                <Check className="w-3.5 h-3.5" />
                {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Custom Fields ─── */}
      {activeSubTab === 'customFields' && (
        <div className="space-y-6">
          <CustomFieldsManager />
        </div>
      )}

      {/* ─── Backup & Restore (v2.8.0) ─── */}
      {activeSubTab === 'backup' && (
        <BackupRestorePanel />
      )}

      {/* ─── Footer ─── */}
      <div className="text-center text-[10px] text-slate-400 py-4 space-y-1">
        <p>منظومة المحامي الرقمي — مطابقة لقوانين المرافعات المصرية</p>
        <p className="font-mono opacity-60">v2.8.0 • الإعدادات والتهيئة العامة</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Stamp sub-component (missing icon - use Award as replacement)
   ═══════════════════════════════════════════════════════════════════════════════ */

function Stamp(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 22h14" />
      <path d="M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 13.73a2.5 2.5 0 0 0-.13.77v.52a2 2 0 0 0 .17.88l2.06 4.12a1 1 0 0 0 .87.53h8a1 1 0 0 0 .87-.53l2.06-4.12a2 2 0 0 0 .17-.88v-.52a2.5 2.5 0 0 0-.13-.77z" />
      <path d="M6 7.92A2.5 2.5 0 0 1 8.5 5.5h7a2.5 2.5 0 0 1 2.5 2.42V13h-2V7.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1z" />
    </svg>
  );
}
