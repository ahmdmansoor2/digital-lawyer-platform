/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * backupRestore.ts — أدوات النسخ الاحتياطي والاستعادة لبيانات البرنامج.
 *
 * قبل أي migration أو refactor، لازم يكون عندك backup.
 * هذه الـ utilities تسمح بـ:
 *  - تصدير كل البيانات (IndexedDB + localStorage) كملف JSON واحد
 *  - استعادة البيانات من ملف JSON (مع confirmation)
 *  - تفريغ البيانات (DANGER: لا يستخدم إلا بعد backup ناجح)
 *
 * البيانات المصدّرة تشمل:
 *  - من IndexedDB: cases, clients, bailiffPapers, opponents, legal_*,
 *    sessions, transactions, deadlines, tasks, documents, executions,
 *    hourLogs, invoices
 *  - من localStorage: app settings, typography, last tab, alarm settings,
 *    enabled menus, auth state
 *
 * الملف المصدر بصيغة: lawfirm-backup-YYYY-MM-DD.json
 */

import {
  getAllFromStore,
  putMultipleIntoStore,
  initIndexedDB
} from './indexedDBHelper';
import { logger } from './logger';
import {
  Case, Client, BailiffPaper, Opponent, LawArticle, CourtPrecedent, LegalBook,
  Session, Transaction, LegalDeadline, LawTask, LawDocument, HourLog, Invoice, Execution
} from '../types';
import packageJson from '../../package.json';
const appVersion: string = packageJson.version;

const IDB_STORES = [
  'cases', 'clients', 'bailiff_papers', 'opponents',
  'legal_books', 'legal_laws', 'legal_precedents',
  'sessions', 'transactions', 'deadlines', 'tasks', 'documents',
  'executions', 'hour_logs', 'invoices'
] as const;

type StoreName = typeof IDB_STORES[number];

const LOCALSTORAGE_KEYS_TO_BACKUP = [
  'lawfirm_logged_in',
  'lawfirm_user_role',
  'lawfirm_user_name',
  'lawfirm_typography_settings',
  'lawfirm_enabled_menus',
  'lawfirm_alarm_settings',
  'custom_google_client_id'
];

// ─── Export All Data ──────────────────────────────────────────────────────
export interface BackupData {
  version: string;
  createdAt: string;
  appVersion: string;
  indexedDB: Partial<Record<StoreName, any[]>>;
  localStorage: Record<string, string | null>;
  stats: {
    totalRecords: number;
    stores: Record<string, number>;
  };
}

export async function exportAllDataToJSON(): Promise<BackupData> {
  const backup: BackupData = {
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    appVersion,
    indexedDB: {},
    localStorage: {},
    stats: { totalRecords: 0, stores: {} }
  };

  // ─── Step 1: Read all IndexedDB stores ──────────────────────────────────
  for (const store of IDB_STORES) {
    try {
      const items = await getAllFromStore(store);
      backup.indexedDB[store] = items;
      backup.stats.stores[store] = items.length;
      backup.stats.totalRecords += items.length;
    } catch (e) {
      logger.warn(`[backup] Failed to read store "${store}":`, e);
      backup.indexedDB[store] = [];
      backup.stats.stores[store] = 0;
    }
  }

  // ─── Step 2: Read localStorage keys ─────────────────────────────────────
  for (const key of LOCALSTORAGE_KEYS_TO_BACKUP) {
    backup.localStorage[key] = localStorage.getItem(key);
  }

  return backup;
}

// ─── Download Backup as File ──────────────────────────────────────────────
export async function downloadBackup(): Promise<void> {
  const backup = await exportAllDataToJSON();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().split('T')[0];
  a.download = `lawfirm-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Restore from Backup ──────────────────────────────────────────────────
// Helper to map stores (handles camelCase and snake_case equivalents)
function getStoreData(sourceObj: any, storeName: string): any[] | undefined {
  if (!sourceObj || typeof sourceObj !== 'object') return undefined;

  // Try direct match
  if (Array.isArray(sourceObj[storeName])) return sourceObj[storeName];

  // Try camelCase equivalents
  const camelCaseMap: Record<string, string> = {
    bailiff_papers: 'bailiffPapers',
    hour_logs: 'hourLogs',
    legal_books: 'legalBooks',
    legal_laws: 'legalLaws',
    legal_precedents: 'legalPrecedents'
  };

  const camelKey = camelCaseMap[storeName];
  if (camelKey && Array.isArray(sourceObj[camelKey])) {
    return sourceObj[camelKey];
  }

  // Try converting snake_case to camelCase dynamically
  const dynamicCamel = storeName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  if (Array.isArray(sourceObj[dynamicCamel])) {
    return sourceObj[dynamicCamel];
  }

  // Try converting camelCase to snake_case dynamically
  const dynamicSnake = storeName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  if (Array.isArray(sourceObj[dynamicSnake])) {
    return sourceObj[dynamicSnake];
  }

  return undefined;
}

// ─── Normalize Backup Data ────────────────────────────────────────────────
function normalizeBackupData(data: any): BackupData {
  const normalized: BackupData = {
    version: data.version || '2.0.0',
    createdAt: data.createdAt || new Date().toISOString(),
    appVersion: data.appVersion || '2.8.0',
    indexedDB: {},
    localStorage: data.localStorage || {},
    stats: { totalRecords: 0, stores: {} }
  };

  // 1. Map IndexedDB stores from backup.indexedDB or root level
  const sourceObj = (data.indexedDB && typeof data.indexedDB === 'object') ? data.indexedDB : data;

  for (const store of IDB_STORES) {
    const items = getStoreData(sourceObj, store);
    if (items) {
      normalized.indexedDB[store] = items;
    }
  }

  // 2. Map legacy localStorage keys from backup.localStorage if IndexedDB store is empty
  const localStorageToIdbMap: Record<string, string> = {
    lawfirm_cases: 'cases',
    lawfirm_clients: 'clients',
    lawfirm_bailiff_papers: 'bailiff_papers',
    lawfirm_opponents: 'opponents',
    lawfirm_sessions: 'sessions',
    lawfirm_transactions: 'transactions',
    lawfirm_deadlines: 'deadlines',
    lawfirm_tasks: 'tasks',
    lawfirm_documents: 'documents',
    lawfirm_executions: 'executions',
    lawfirm_hour_logs: 'hour_logs',
    lawfirm_invoices: 'invoices'
  };

  for (const [lsKey, storeName] of Object.entries(localStorageToIdbMap)) {
    const lsVal = normalized.localStorage[lsKey] || data[lsKey];
    const idbItems = normalized.indexedDB[storeName as StoreName];
    
    // If we don't have IndexedDB records for this store, but we do have a localStorage value
    if ((!idbItems || idbItems.length === 0) && typeof lsVal === 'string' && lsVal.trim()) {
      try {
        const parsed = JSON.parse(lsVal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          logger.info(`[backupRestore] Migrating legacy key ${lsKey} to IndexedDB store ${storeName} during restore (${parsed.length} records)`);
          normalized.indexedDB[storeName as StoreName] = parsed;
        }
      } catch (e) {
        logger.warn(`[backupRestore] Failed to parse legacy localStorage key ${lsKey} during restore:`, e);
      }
    }
  }

  // Calculate statistics
  let total = 0;
  for (const store of IDB_STORES) {
    const items = normalized.indexedDB[store];
    if (Array.isArray(items)) {
      normalized.stats.stores[store] = items.length;
      total += items.length;
    } else {
      normalized.stats.stores[store] = 0;
    }
  }
  normalized.stats.totalRecords = total;

  return normalized;
}

// ─── Restore from Backup ──────────────────────────────────────────────────
export interface RestoreResult {
  success: boolean;
  message: string;
  restoredCounts: Record<string, number>;
  errors: string[];
}

export async function restoreAllDataFromJSON(rawBackup: any): Promise<RestoreResult> {
  const result: RestoreResult = {
    success: false,
    message: '',
    restoredCounts: {},
    errors: []
  };

  try {
    // Normalize data (ensures standard layout even for legacy backups)
    const backup = normalizeBackupData(rawBackup);

    // Initialize DB to ensure it exists
    await initIndexedDB();

    // ─── Step 1: Restore IndexedDB stores ─────────────────────────────
    // Write-then-clear pattern: write backup data FIRST, so if a crash
    // happens during restore, old data is still intact. Stores NOT in the
    // backup are left untouched (no data loss).
    for (const store of IDB_STORES) {
      const items = backup.indexedDB[store];
      if (Array.isArray(items) && items.length > 0) {
        try {
          await putMultipleIntoStore(store, items);
          result.restoredCounts[store] = items.length;
        } catch (e: any) {
          result.errors.push(`Failed to restore store "${store}": ${e.message}`);
          result.restoredCounts[store] = 0;
        }
      }
    }

    // ─── Step 2: Restore localStorage keys ─────────────────────────────────
    for (const [key, value] of Object.entries(backup.localStorage || {})) {
      if (value !== null) {
        try {
          localStorage.setItem(key, value);
        } catch (e: any) {
          result.errors.push(`Failed to restore localStorage key "${key}": ${e.message}`);
        }
      }
    }

    result.success = result.errors.length === 0;
    result.message = result.success
      ? `تمت استعادة البيانات بنجاح (${Object.values(result.restoredCounts).reduce((a, b) => a + b, 0)} سجل).`
      : `تمت الاستعادة جزئياً مع ${result.errors.length} خطأ.`;

    return result;
  } catch (e: any) {
    return {
      ...result,
      success: false,
      message: `فشل الاستعادة: ${e.message}`,
      errors: [...result.errors, e.message]
    };
  }
}

// ─── Verify Backup File ───────────────────────────────────────────────────
export function isValidBackup(data: any): data is BackupData {
  if (!data || typeof data !== 'object') return false;

  // Standard format
  if (data.indexedDB && typeof data.indexedDB === 'object') {
    return true;
  }

  // Flattened/legacy formats
  const majorStores = ['cases', 'clients', 'sessions', 'documents'];
  const hasArrayStore = majorStores.some(store => Array.isArray(data[store]));
  if (hasArrayStore) {
    return true;
  }

  // Check if it has legacy localStorage keys containing JSON arrays
  const legacyKeys = ['lawfirm_cases', 'lawfirm_clients', 'lawfirm_sessions'];
  const hasLegacyStore = legacyKeys.some(key => {
    const val = data.localStorage ? data.localStorage[key] : data[key];
    if (typeof val === 'string' && val.trim().startsWith('[')) {
      return true;
    }
    return false;
  });
  if (hasLegacyStore) {
    return true;
  }

  return false;
}

// ─── Get Backup Stats (without full export) ───────────────────────────────
export async function getDataStats(): Promise<{
  totalRecords: number;
  stores: Record<string, number>;
  localStorageSize: number;
}> {
  const stores: Record<string, number> = {};
  let total = 0;

  for (const store of IDB_STORES) {
    try {
      const items = await getAllFromStore(store);
      stores[store] = items.length;
      total += items.length;
    } catch {
      stores[store] = 0;
    }
  }

  let lsSize = 0;
  for (const key of LOCALSTORAGE_KEYS_TO_BACKUP) {
    const v = localStorage.getItem(key);
    if (v) lsSize += v.length;
  }

  return { totalRecords: total, stores, localStorageSize: lsSize };
}

