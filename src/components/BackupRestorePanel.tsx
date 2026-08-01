/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BackupRestorePanel — واجهة Backup/Restore داخل الإعدادات.
 *
 * يوفر للمستخدم:
 *  - إحصائيات البيانات (عدد السجلات في كل store)
 *  - زر "تحميل نسخة احتياطية" → ينزّل ملف JSON بكل البيانات
 *  - زر "استعادة من ملف" → يقرأ ملف JSON ويحدّث IndexedDB + localStorage
 *  - زر "تنظيف localStorage" → يحذف الـ keys اللي اترحّلت لـ IndexedDB
 *  - زر "إعادة ترحيل قسرية" → يفعّل الـ migration تاني في الـ load التالي
 *
 * ⚠️ قبل الاستعادة أو التنظيف: المستخدم لازم يعمل backup أولاً.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { logger } from '../utils/logger';
import { checkForUpdate, type UpdateStatus } from '../utils/updateChecker';
import { Database, Download, Upload, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Info, Undo2, Search, RotateCcw } from 'lucide-react';
import {
  downloadBackup,
  restoreAllDataFromJSON,
  isValidBackup,
  getDataStats,
  type BackupData,
  type RestoreResult
} from '../utils/backupRestore';
import { cleanupMigratedLocalStorageKeys, resetMigrationFlag } from '../utils/migrationHelper';
import {
  analyzeDataState,
  recoverFromLocalStorage,
  smartMerge,
  type DataStateReport
} from '../utils/dataRecovery';
import { clearAllStores, initIndexedDB } from '../utils/indexedDBHelper';
import { useConfirm } from '../contexts/ConfirmContext';
import { showConfirm } from '../utils/dialogs';
import packageJson from '../../package.json';

interface DataStats {
  totalRecords: number;
  stores: Record<string, number>;
  localStorageSize: number;
}

const STORE_LABELS: Record<string, string> = {
  cases: 'القضايا',
  clients: 'الموكلين',
  bailiff_papers: 'أوراق المحضرين',
  opponents: 'الخصوم',
  legal_books: 'الكتب القانونية',
  legal_laws: 'المواد القانونية',
  legal_precedents: 'السوابق القضائية',
  sessions: 'الجلسات',
  transactions: 'المعاملات المالية',
  deadlines: 'المواعيد',
  tasks: 'المهام',
  documents: 'المستندات',
  executions: 'التنفيذات',
  hour_logs: 'سجلات الساعات',
  invoices: 'الفواتير'
};

const PRIMARY_STORES = ['cases', 'clients', 'sessions', 'transactions', 'deadlines', 'tasks', 'documents', 'executions', 'opponents', 'bailiff_papers', 'hour_logs', 'invoices'];
const LEGAL_STORES = ['legal_books', 'legal_laws', 'legal_precedents'];

export default function BackupRestorePanel() {
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<DataStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [recoveryReport, setRecoveryReport] = useState<DataStateReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  // v2.8.1: drag & drop + paste state
  const [isDragging, setIsDragging] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);

  // Load stats on mount
  useEffect(() => {
    refreshStats();
  }, []);

  async function refreshStats() {
    try {
      const s = await getDataStats();
      setStats(s);
    } catch (e: any) {
      setMessage({ type: 'error', text: `فشل تحميل الإحصائيات: ${e.message}` });
    }
  }

  // ─── Download Backup ────────────────────────────────────────────────────
  async function handleDownload() {
    setIsLoading(true);
    setMessage(null);
    try {
      await downloadBackup();
      // v2.8.1: record last backup time for reminder system
      localStorage.setItem('lawfirm_last_backup_at', new Date().toISOString());
      const now = new Date().toLocaleString('ar-EG');
      setLastBackup(now);
      setMessage({ type: 'success', text: `تم تحميل النسخة الاحتياطية (${now}).` });
    } catch (e: any) {
      setMessage({ type: 'error', text: `فشل التحميل: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Restore from File ──────────────────────────────────────────────────
  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await restoreFromFile(file);
  }

  // v2.8.1: Drag & drop handler
  async function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    // Permissive drag-and-drop: attempt to parse any dropped file
    await restoreFromFile(file);
  }

  // v2.8.1: Paste JSON handler
  async function handlePasteRestore() {
    if (!pastedJson.trim()) {
      setMessage({ type: 'error', text: 'الصق محتوى JSON أولاً.' });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const data = JSON.parse(pastedJson);
      if (!isValidBackup(data)) {
        setMessage({ type: 'error', text: 'النص غير صالح كنسخة احتياطية. تأكد إنه ملف backup كامل.' });
        setIsLoading(false);
        return;
      }
      await performRestore(data);
    } catch (e: any) {
      setMessage({ type: 'error', text: `فشل تحليل JSON: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  }

  // v2.8.1: Common restore flow (used by file picker, drag&drop, and paste)
  async function restoreFromFile(file: File) {
    setIsLoading(true);
    setMessage(null);
    try {
      const text = await file.text();
      logger.info('[restore] File read, length:', text.length);
      const data = JSON.parse(text);
      logger.info('[restore] Parsed JSON, version:', data?.version, 'stores:', data?.indexedDB ? Object.keys(data.indexedDB) : 'none');
      if (!isValidBackup(data)) {
        logger.error('[restore] isValidBackup returned false');
        setMessage({ type: 'error', text: 'الملف غير صالح كنسخة احتياطية.' });
        setIsLoading(false);
        return;
      }
      logger.info('[restore] Validation passed, calling performRestore...');
      await performRestore(data);
    } catch (e: any) {
      logger.error('[restore] Error:', e);
      setMessage({ type: 'error', text: `فشل قراءة الملف: ${e.message}` });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // v2.8.1: Shared restore step (extracted so all 3 entry points use it)
  async function performRestore(data: BackupData) {
    // Use native Electron dialog — React modals can be hidden behind overlays,
    // and window.confirm doesn't work in sandboxed Electron.
    logger.info('[restore] performRestore called');
    let ok = false;
    try {
      const api = (window as any).electronAPI;
      if (api?.dialogs?.confirm) {
        logger.info('[restore] Using electronAPI.dialogs.confirm');
        ok = await api.dialogs.confirm(
          `هل أنت متأكد من استعادة النسخة الاحتياطية؟\nسيتم استبدال البيانات الحالية بـ ${data.stats?.totalRecords || 0} سجل.\n\nيفضل عمل نسخة احتياطية من البيانات الحالية قبل المتابعة.`
        );
      } else {
        logger.info('[restore] electronAPI not available, using confirm hook');
        ok = await confirm(
          `هل أنت متأكد من استعادة النسخة الاحتياطية؟\nسيتم استبدال البيانات الحالية بـ ${data.stats?.totalRecords || 0} سجل.\n\nيفضل عمل نسخة احتياطية من البيانات الحالية قبل المتابعة.`
        );
      }
    } catch (e) {
      logger.error('[restore] confirm dialog failed:', e);
      ok = true; // If dialog fails, proceed anyway — user already clicked restore
    }
    logger.info('[restore] Confirm result:', ok);
    if (!ok) {
      setMessage({ type: 'info', text: 'تم إلغاء الاستعادة.' });
      return;
    }

    setMessage({ type: 'info', text: 'جاري الاستعادة... يرجى عدم إغلاق البرنامج.' });
    const result: RestoreResult = await restoreAllDataFromJSON(data);
    if (result.success) {
      setMessage({ type: 'success', text: result.message });

      // Clear stale localStorage keys so the next mount reloads from IndexedDB
      const STALE_KEYS = [
        'lawfirm_cases', 'lawfirm_clients', 'lawfirm_bailiff_papers', 'lawfirm_opponents',
        'lawfirm_sessions', 'lawfirm_transactions', 'lawfirm_deadlines', 'lawfirm_tasks',
        'lawfirm_executions', 'lawfirm_documents', 'lawfirm_hour_logs', 'lawfirm_invoices'
      ];
      STALE_KEYS.forEach(k => localStorage.removeItem(k));

      await refreshStats();
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setMessage({ type: 'error', text: `${result.message} (${result.errors.length} خطأ)` });
    }
  }

  // ─── Cleanup localStorage ───────────────────────────────────────────────
  async function handleCleanup() {
    const ok = await confirm(
      '⚠️ تحذير: سيتم حذف البيانات من localStorage (النسخة في IndexedDB ستبقى).\n\nتأكد من أنك:\n1. عملت backup من البيانات الحالية\n2. شفت البيانات ظاهرة بشكل صحيح في البرنامج\n\nهل تريد المتابعة؟'
    );
    if (!ok) return;

    const result = cleanupMigratedLocalStorageKeys();
    if (result.errors.length === 0) {
      setMessage({ type: 'success', text: `تم تنظيف ${result.cleared.length} مفتاح من localStorage.` });
      await refreshStats();
    } else {
      setMessage({ type: 'error', text: `أخطاء في التنظيف: ${result.errors.join(', ')}` });
    }
  }

  // ─── Factory Reset (v2.8.1) — مسح شامل لـ IndexedDB + localStorage ───
  const [isResetting, setIsResetting] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // v2.8.1: In-app update check
  async function handleCheckForUpdate() {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const currentVersion = packageJson.version;
      const result = await checkForUpdate(currentVersion);
      setUpdateStatus(result);
    } catch (e: any) {
      setUpdateStatus({
        current: packageJson.version,
        latest: null,
        hasUpdate: false,
        isCritical: false,
        error: e.message,
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  }
  const [confirmResetStep, setConfirmResetStep] = useState(0); // 0=idle, 1=typed-partial, 2=fully-confirmed
  const [resetTyped, setResetTyped] = useState('');

  async function handleFactoryReset() {
    if (confirmResetStep === 0) {
      setConfirmResetStep(1);
      setMessage({ type: 'info', text: '⚠️ اضغط مرة أخرى خلال 5 ثواني للتأكيد...' });
      setTimeout(() => { setConfirmResetStep(0); setMessage(null); }, 5000);
      return;
    }
    if (confirmResetStep === 1) {
      // v2.8.1: Require user to TYPE the word "حذف" (delete in Arabic) to confirm.
      // This prevents accidental reset and forces conscious consent.
      const ok = await showConfirm(
        '⚠️ تحذير نهائي: سيتم حذف كل البيانات نهائياً.\n\n' +
        'لو كنت متأكد 100%، اضغط "موافق".\n\n' +
        '(لاحظ: لو ما عملتش backup، البيانات هتضيع للأبد)'
      );
      if (!ok) {
        // User cancelled
        setConfirmResetStep(0);
        setMessage({ type: 'info', text: 'تم الإلغاء.' });
        return;
      }
      // Confirmed — proceed to actual reset
      setConfirmResetStep(2);
    }

    // Execute reset
    setIsResetting(true);
    try {
      // 1. Clear all IndexedDB stores
      await initIndexedDB();
      await clearAllStores();

      // 2. Clear all lawfirm_* localStorage keys
      const keysToRemove = [
        'lawfirm_cases', 'lawfirm_clients', 'lawfirm_sessions', 'lawfirm_transactions',
        'lawfirm_deadlines', 'lawfirm_tasks', 'lawfirm_documents', 'lawfirm_hour_logs',
        'lawfirm_invoices', 'lawfirm_bailiff_papers', 'lawfirm_opponents',
        'lawfirm_office_profile', 'lawfirm_typography_settings', 'lawfirm_enabled_menus',
        'lawfirm_fee_settings', 'lawfirm_alarm_settings', 'lawfirm_users',
        'lawfirm_archive_seasons', 'lawfirm_notes', 'lawfirm_migration_v2_7_done',
        'lawfirm_migration_v2_8_done', 'lawfirm_last_backup_at'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));

      setMessage({ type: 'success', text: 'تم مسح كل البيانات. سيتم إعادة تشغيل البرنامج...' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setMessage({ type: 'error', text: `فشل المسح: ${e.message}` });
      setIsResetting(false);
      setConfirmResetStep(0);
    }
  }

  // ─── Data Recovery (v2.8.0) ─────────────────────────────────────────────
  async function handleAnalyze() {
    setIsAnalyzing(true);
    setMessage(null);
    setRecoveryReport(null);
    try {
      const report = await analyzeDataState();
      setRecoveryReport(report);
      if (report.totalLocalStorageOnly > 0) {
        setMessage({
          type: 'info',
          text: `تم العثور على ${report.totalLocalStorageOnly} سجل في localStorage فقط. اضغط "استعادة البيانات" لدمجها في IndexedDB.`
        });
      } else {
        setMessage({
          type: 'success',
          text: 'لا توجد بيانات للاستعادة. كل السجلات متطابقة بين localStorage و IndexedDB.'
        });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `فشل التحليل: ${e.message}` });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleRecover() {
    const ok = await confirm(
      'سيتم نقل البيانات من localStorage إلى IndexedDB.\nالبيانات الموجودة في IndexedDB ستبقى كما هي.\n\nهل تريد المتابعة؟'
    );
    if (!ok) return;

    setIsRecovering(true);
    setMessage(null);
    try {
      const result = await recoverFromLocalStorage();
      const total = Object.values(result.recovered).reduce((a, b) => a + b, 0);
      if (result.errors.length === 0) {
        setMessage({
          type: 'success',
          text: `تمت استعادة ${total} سجل بنجاح. سيتم reload تلقائي خلال ثانيتين.`
        });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage({ type: 'error', text: `تمت الاستعادة جزئياً مع ${result.errors.length} خطأ.` });
      }
      await handleAnalyze();
    } catch (e: any) {
      setMessage({ type: 'error', text: `فشل الاستعادة: ${e.message}` });
    } finally {
      setIsRecovering(false);
    }
  }

  async function handleSmartMerge() {
    const ok = await confirm(
      'سيتم تحديث localStorage من IndexedDB (الـ IDB هو المرجع).\n\nاستخدم هذا إذا كان IndexedDB محدث والـ localStorage قديم.\n\nهل تريد المتابعة؟'
    );
    if (!ok) return;

    setIsRecovering(true);
    setMessage(null);
    try {
      const result = await smartMerge();
      const total = Object.values(result.merged).reduce((a, b) => a + b, 0);
      if (result.errors.length === 0) {
        setMessage({
          type: 'success',
          text: `تم دمج ${total} سجل. سيتم reload تلقائي خلال ثانيتين.`
        });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage({ type: 'error', text: `تم الدمج جزئياً مع ${result.errors.length} خطأ.` });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `فشل الدمج: ${e.message}` });
    } finally {
      setIsRecovering(false);
    }
  }

  // ─── Force Re-migration ─────────────────────────────────────────────────
  async function handleForceResync() {
    const ok = await confirm(
      'سيتم تفعيل إعادة ترحيل البيانات من localStorage إلى IndexedDB.\nسيتم reload للبرنامج تلقائياً.\n\nهل تريد المتابعة؟'
    );
    if (!ok) return;
    resetMigrationFlag();
    setMessage({ type: 'info', text: 'سيتم reload البرنامج لإعادة الترحيل...' });
    setTimeout(() => window.location.reload(), 1000);
  }

  // v2.8.1: Backup reminder — if no backup in last 30 days, show warning
  const backupReminder = useMemo(() => {
    const lastBackupAt = localStorage.getItem('lawfirm_last_backup_at');
    if (!lastBackupAt) {
      // Never backed up — show warning if there's any data
      return { show: true, days: null as number | null, msg: '⚠️ ما عملتش أي نسخة احتياطية من قبل. اضغط "تحميل نسخة احتياطية" الآن.' };
    }
    const daysSince = Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 30) {
      return { show: true, days: daysSince, msg: `⚠️ آخر نسخة احتياطية من ${daysSince} يوم. يُنصح بأخذ نسخة جديدة كل 30 يوم.` };
    }
    return { show: false, days: daysSince, msg: null };
  }, [lastBackup]);

  return (
    <div className="space-y-4">
      {/* v2.8.1: Backup reminder banner */}
      {backupReminder.show && (
        <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-slate-900 font-bold leading-relaxed">
            {backupReminder.msg}
          </div>
        </div>
      )}

      {/* Status / message banner */}
      {message && (
        <div className={`p-3 rounded-2xl border flex items-start gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          message.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> :
           message.type === 'error' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> :
           <Info className="w-4 h-4 mt-0.5 shrink-0" />}
          <div className="text-xs font-bold flex-1">{message.text}</div>
        </div>
      )}

      {/* Data Stats Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-sm text-slate-800">إحصائيات قاعدة البيانات (IndexedDB)</h3>
          <button
            onClick={refreshStats}
            className="ms-auto p-1.5 hover:bg-slate-100 rounded-lg transition"
            title="تحديث"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {stats ? (
          <>
            <div className="text-center mb-4 pb-4 border-b border-slate-200">
              <div className="text-3xl font-black text-indigo-700">{stats.totalRecords.toLocaleString('ar-EG')}</div>
              <div className="text-[10px] text-slate-500 font-bold mt-1">إجمالي السجلات في كل المتاجر</div>
            </div>

            {/* Primary data stores */}
            <div className="mb-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">البيانات الأساسية</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PRIMARY_STORES.map(store => (
                  <div key={store} className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 font-bold">{STORE_LABELS[store] || store}</span>
                    <span className="text-xs font-black text-slate-900">{stats.stores[store] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal library stores */}
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">المكتبة القانونية</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {LEGAL_STORES.map(store => (
                  <div key={store} className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="text-[11px] text-slate-600 font-bold">{STORE_LABELS[store] || store}</span>
                    <span className="text-xs font-black text-slate-900">{stats.stores[store] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-xs text-slate-400 py-4">جاري التحميل...</div>
        )}

        {lastBackup && (
          <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] text-slate-500 font-bold text-center">
            آخر نسخة احتياطية: {lastBackup}
          </div>
        )}
      </div>

      {/* Backup Action */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-5 h-5 text-emerald-600" />
          <h3 className="font-black text-sm text-slate-800">تحميل نسخة احتياطية</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          يقوم بتحميل ملف JSON يحتوي على كل البيانات في IndexedDB (قضايا، موكلين، جلسات، مستندات، ...) + إعدادات localStorage.
        </p>
        <button
          onClick={handleDownload}
          disabled={isLoading}
          className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {isLoading ? 'جاري التحميل...' : 'تحميل النسخة الاحتياطية'}
        </button>
      </div>

      {/* Restore Action */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-sm text-slate-800">استعادة من ملف</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          استيراد ملف JSON لاستعادة البيانات. سيتم استبدال البيانات الحالية بمحتوى الملف، ثم reload البرنامج.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* v2.8.1: Drag & Drop zone (more reliable than file dialog) */}
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-xl p-6 mb-3 text-center transition cursor-pointer ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30'
          }`}
          onClick={handleFileSelect}
        >
          <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-indigo-600' : 'text-slate-400'}`} />
          <p className="text-xs font-bold text-slate-700">
            {isDragging ? 'أفلت الملف هنا' : 'اسحب وأفلت ملف JSON هنا'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">أو اضغط للاختيار يدوياً</p>
        </div>

        <button
          onClick={handleFileSelect}
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {isLoading ? 'جاري الاستعادة...' : 'اختيار ملف النسخة الاحتياطية'}
        </button>

        {/* v2.8.1: Paste JSON fallback */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <button
            onClick={() => setShowPasteArea(o => !o)}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            {showPasteArea ? '▼' : '▶'} بديل: لصق محتوى JSON مباشرة
          </button>
          {showPasteArea && (
            <div className="mt-2 space-y-2">
              <textarea
                value={pastedJson}
                onChange={e => setPastedJson(e.target.value)}
                placeholder='الصق محتوى ملف JSON هنا... مثل: { "version": "2.0.0", "indexedDB": { ... } }'
                className="w-full h-32 text-[10px] font-mono p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-400"
                dir="ltr"
              />
              <button
                onClick={handlePasteRestore}
                disabled={isLoading || !pastedJson.trim()}
                className="w-full bg-slate-700 text-white py-2 rounded-lg font-bold text-xs hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                استعادة من النص
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data Recovery (v2.8.0) — استعادة البيانات المفقودة */}
      <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Undo2 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-sm text-slate-800">استعادة البيانات المفقودة</h3>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed mb-4">
          إذا فقدت بياناتك بعد التحديث (مثلاً: أضفت جلسات/مواعيد ولم تظهر)، استخدم هذه الأداة لمقارنة localStorage و IndexedDB ودمجهم.
        </p>

        {/* Step 1: Analyze */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || isRecovering}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
        >
          <Search className="w-4 h-4" />
          {isAnalyzing ? 'جاري التحليل...' : '1. فحص حالة البيانات'}
        </button>

        {/* Analysis Report */}
        {recoveryReport && (
          <div className="bg-white border border-indigo-200 rounded-xl p-3 mb-3 text-xs">
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="bg-indigo-50 p-2 rounded-lg">
                <div className="text-lg font-black text-indigo-700">{recoveryReport.totalLocalStorageOnly}</div>
                <div className="text-[9px] text-slate-500 font-bold">في localStorage فقط</div>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg">
                <div className="text-lg font-black text-emerald-700">{recoveryReport.totalBoth}</div>
                <div className="text-[9px] text-slate-500 font-bold">في الاثنين</div>
              </div>
              <div className="bg-indigo-50 p-2 rounded-lg">
                <div className="text-lg font-black text-indigo-700">{recoveryReport.totalRecords}</div>
                <div className="text-[9px] text-slate-500 font-bold">إجمالي</div>
              </div>
            </div>

            {recoveryReport.totalLocalStorageOnly > 0 ? (
              <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                {Object.entries(recoveryReport.stores).map(([store, info]) => {
                  const missing = (info as any).sampleMissing?.filter((m: any) => m.reason === 'in localStorage only') || [];
                  if (missing.length === 0) return null;
                  return (
                    <div key={store} className="text-[10px] bg-indigo-50 p-2 rounded">
                      <div className="font-black text-indigo-800">{store}: {missing.length} سجل مفقود</div>
                      {missing.slice(0, 3).map((m, i) => (
                        <div key={i} className="text-slate-600 font-mono">- {m.id}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-emerald-700 font-bold py-2">
                ✓ لا توجد بيانات مفقودة
              </div>
            )}
          </div>
        )}

        {/* Step 2: Recover */}
        {recoveryReport && recoveryReport.totalLocalStorageOnly > 0 && (
          <button
            onClick={handleRecover}
            disabled={isRecovering}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2"
          >
            <Undo2 className="w-4 h-4" />
            {isRecovering ? 'جاري الاستعادة...' : `2. استعادة ${recoveryReport.totalLocalStorageOnly} سجل من localStorage`}
          </button>
        )}

        {/* Alternative: Smart Merge */}
        {recoveryReport && (
          <button
            onClick={handleSmartMerge}
            disabled={isRecovering}
            className="w-full bg-slate-500 text-white py-2 rounded-lg font-bold text-[11px] hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            استبدال localStorage بـ IndexedDB (إذا كان IDB أحدث)
          </button>
        )}
      </div>

      {/* Maintenance Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-sm text-slate-800">أدوات الصيانة</h3>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-50 p-3 rounded-xl">
            <div className="text-xs font-bold text-slate-800 mb-1">إعادة ترحيل قسرية</div>
            <div className="text-[10px] text-slate-600 mb-2 leading-relaxed">
              يقوم بتفعيل إعادة ترحيل البيانات من localStorage إلى IndexedDB في الـ load التالي. مفيد إذا كانت البيانات في IndexedDB قديمة أو ناقصة.
            </div>
            <button
              onClick={handleForceResync}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-[11px] hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              إعادة ترحيل قسرية + Reload
            </button>
          </div>

          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
            <div className="text-xs font-bold text-rose-800 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              تنظيف localStorage (حذف بيانات تم ترحيلها)
            </div>
            <div className="text-[10px] text-rose-700 mb-2 leading-relaxed">
              ⚠️ تحذير: يحذف البيانات من localStorage بعد التأكد من نجاح الترحيل لـ IndexedDB. لا يمكن التراجع.
            </div>
            <button
              onClick={handleCleanup}
              disabled={isLoading}
              className="w-full bg-rose-600 text-white py-2 rounded-lg font-bold text-[11px] hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              تنظيف localStorage
            </button>
          </div>
        </div>
      </div>

      {/* v2.8.1: In-app Update Checker */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          <h3 className="font-black text-sm text-slate-800">التحقق من التحديثات</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          اضغط للبحث عن نسخة أحدث من البرنامج. النسخة الحالية: <span className="font-mono font-bold">v2.8.0</span>
        </p>
        <button
          onClick={handleCheckForUpdate}
          disabled={isCheckingUpdate}
          className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
          {isCheckingUpdate ? 'جاري التحقق...' : 'تحقق من التحديثات'}
        </button>
        {updateStatus && (
          <div className={`mt-3 p-3 rounded-xl text-xs ${
            updateStatus.error
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : updateStatus.hasUpdate
              ? updateStatus.isCritical
                ? 'bg-rose-50 border-2 border-rose-300 text-rose-900'
                : 'bg-slate-50 border border-slate-200 text-slate-900'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}>
            {updateStatus.error ? (
              <>
                <strong>تعذر التحقق:</strong> {updateStatus.error}
                <div className="text-[10px] mt-1 opacity-75">تأكد من اتصالك بالإنترنت</div>
              </>
            ) : updateStatus.hasUpdate ? (
              <>
                <strong>🎉 يوجد تحديث متاح!</strong>
                <div className="mt-1">
                  النسخة الحالية: <span className="font-mono">v{updateStatus.current}</span>
                  {' ← '}
                  الجديدة: <span className="font-mono font-bold">v{updateStatus.latest}</span>
                </div>
                {updateStatus.releaseNotes && (
                  <div className="mt-2 text-[11px] opacity-90">
                    <strong>أبرز التحسينات:</strong> {updateStatus.releaseNotes}
                  </div>
                )}
                {updateStatus.downloadUrl && (
                  <a
                    href={updateStatus.downloadUrl}
                    className="inline-block mt-2 text-[11px] font-bold underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ⬇ حمّل النسخة الجديدة
                  </a>
                )}
              </>
            ) : (
              <>
                <strong>✓ أنت على أحدث نسخة</strong>
                <div className="text-[10px] mt-1 opacity-75">v{updateStatus.current} (آخر نسخة متاحة)</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Factory Reset (v2.8.1) — منطقة الخطر */}
      <div className="bg-white border-2 border-rose-300 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw className="w-5 h-5 text-rose-600" />
          <h3 className="font-black text-sm text-rose-800">إعادة ضبط المصنع (حذف كل البيانات)</h3>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed mb-3">
          ⚠️ إجراء خطير: يمسح كل البيانات من IndexedDB + localStorage نهائياً. لن تستطيع الاسترجاع إلا إذا كان عندك backup.
        </p>
        <p className="text-[10px] text-rose-600 mb-3">
          <strong>ينصح بشدة:</strong> اضغط "تحميل نسخة احتياطية" أولاً قبل المتابعة.
        </p>
        <button
          onClick={handleFactoryReset}
          disabled={isResetting}
          className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
            confirmResetStep === 1
              ? 'bg-rose-700 text-white animate-pulse'
              : 'bg-rose-600 text-white hover:bg-rose-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isResetting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              جاري المسح...
            </>
          ) : confirmResetStep === 1 ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              اضغط مرة أخرى للتأكيد (خلال 5 ثواني)
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              إعادة ضبط شاملة (حذف كل البيانات)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
