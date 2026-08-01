/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * migrationHelper.ts — ترحيل البيانات من localStorage إلى IndexedDB.
 *
 * v2.7.0: تم ترحيل كل البيانات التي كانت في localStorage إلى IndexedDB.
 * v2.9.12: كل الـ migration flags مُصنَّفة بـ UID — لا مزيد من تسرّب البيانات بين الحسابات.
 *
 * ⚠️ الـ migration آمن:
 *  - يقرأ من localStorage
 *  - يكتب في IndexedDB
 *  - لا يحذف من localStorage (يبقى كـ backup)
 *  - يميز نفسه بـ flag `lawfirm_[uid]_migration_v2_7_done` ليمنع التشغيل المتكرر
 */

import {
  getAllFromStore,
  putMultipleIntoStore,
  initIndexedDB
} from './indexedDBHelper';
import { logger } from './logger';

// ─── UID State (synced with indexedDBHelper's activeUid) ────────────────────
let _currentUid: string | null = null;

/** يُستدعى من indexedDBHelper عند تغيير الـ UID */
export function setMigrationUid(uid: string | null): void {
  _currentUid = uid;
}

/** يبني مفتاح الـ migration flag مُصنَّف بالـ UID */
function getMigrationFlag(): string {
  return _currentUid
    ? `lawfirm_${_currentUid}_migration_v2_7_done`
    : 'lawfirm_migration_v2_7_done';
}

/** يبني مفتاح LS مُصنَّف بالـ UID — للقراءة أثناء الـ migration */
function getLSKey(baseKey: string): string {
  return _currentUid ? `lawfirm_${_currentUid}_${baseKey}` : `lawfirm_${baseKey}`;
}

interface LocalStorageDataMap {
  [storeName: string]: string; // base key (بدون prefix)
}

// المفاتيح الأساسية للـ stores — تُستخدم مع getLSKey()
const MIGRATION_BASE_KEYS: LocalStorageDataMap = {
  sessions: 'sessions',
  transactions: 'transactions',
  deadlines: 'deadlines',
  tasks: 'tasks',
  documents: 'documents',
  executions: 'executions',
  hour_logs: 'hour_logs',
  invoices: 'invoices'
};

export interface MigrationResult {
  success: boolean;
  alreadyMigrated: boolean;
  migrated: Record<string, number>;
  errors: string[];
  startedAt: string;
  completedAt: string;
}

export function isMigrationDone(): boolean {
  try {
    return localStorage.getItem(getMigrationFlag()) === 'true';
  } catch {
    return false;
  }
}

export function markMigrationDone(): void {
  try {
    localStorage.setItem(getMigrationFlag(), 'true');
  } catch (e) {
    logger.error('[migration] Failed to set migration flag:', e);
  }
}

export function resetMigrationFlag(): void {
  try {
    localStorage.removeItem(getMigrationFlag());
  } catch (e) {
    logger.error('[migration] Failed to reset migration flag:', e);
  }
}

export function forceResync(): void {
  resetMigrationFlag();
  logger.info('[migration] Force-resync enabled. Reload the app to re-run migration.');
}

/**
 * قراءة آمنة من localStorage. ترجع [] إذا كان الـ key غير موجود أو الـ JSON غير صالح.
 */
function safeReadArray(localStorageKey: string): any[] {
  try {
    const raw = localStorage.getItem(localStorageKey);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (e) {
    logger.warn(`[migration] Failed to read "${localStorageKey}":`, e);
    return [];
  }
}

/**
 * التحقق إذا كان الـ IndexedDB store فارغ.
 */
async function isStoreEmpty(storeName: string): Promise<boolean> {
  try {
    const items = await getAllFromStore(storeName);
    return items.length === 0;
  } catch (e) {
    logger.warn(`[migration] Failed to check store "${storeName}":`, e);
    return true;
  }
}

/**
 * الـ migration الرئيسية. يتم استدعاؤها مرة واحدة لكل مستخدم.
 *
 * Logic:
 *  1. إذا كان الـ flag مُصنَّف بالـ UID موجوداً → skip
 *  2. لكل store: قراءة من localStorage المُصنَّفة بالـ UID
 *  3. إذا كان هناك بيانات → ترحيلها إلى IDB
 *  4. تعيين الـ flag بعد النجاح
 */
export async function runLocalStorageToIndexedDBMigration(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    alreadyMigrated: false,
    migrated: {},
    errors: [],
    startedAt: new Date().toISOString(),
    completedAt: ''
  };

  // Step 0: Check if already migrated (UID-scoped flag)
  if (isMigrationDone()) {
    result.alreadyMigrated = true;
    result.completedAt = new Date().toISOString();
    return result;
  }

  try {
    // Step 1: Ensure DB is initialized
    await initIndexedDB();

    // Step 2: Migrate each store — reads from UID-scoped LS keys
    for (const [storeName, baseKey] of Object.entries(MIGRATION_BASE_KEYS)) {
      try {
        const lsKey = getLSKey(baseKey);
        const lsData = safeReadArray(lsKey);
        if (lsData.length === 0) {
          result.migrated[storeName] = 0;
          continue;
        }

        const idbEmpty = await isStoreEmpty(storeName);
        if (!idbEmpty) {
          logger.info(`[migration] Store "${storeName}" already has data in IndexedDB, skipping.`);
          result.migrated[storeName] = 0;
          continue;
        }

        const validItems = lsData.filter(item => item && typeof item === 'object' && item.id);
        if (validItems.length < lsData.length) {
          logger.warn(`[migration] Skipped ${lsData.length - validItems.length} items in "${lsKey}" without id.`);
        }

        if (validItems.length > 0) {
          await putMultipleIntoStore(storeName, validItems);
          result.migrated[storeName] = validItems.length;
        } else {
          result.migrated[storeName] = 0;
        }
      } catch (e: any) {
        result.errors.push(`Failed to migrate "${storeName}": ${e.message}`);
        result.success = false;
      }
    }

    // Step 3: Mark migration as done (UID-scoped)
    if (result.success) {
      markMigrationDone();
    }
  } catch (e: any) {
    result.success = false;
    result.errors.push(`Migration failed: ${e.message}`);
  }

  result.completedAt = new Date().toISOString();
  return result;
}

/**
 * تفريغ localStorage من البيانات التي تم ترحيلها إلى IndexedDB.
 */
export function cleanupMigratedLocalStorageKeys(): { cleared: string[]; errors: string[] } {
  const cleared: string[] = [];
  const errors: string[] = [];

  for (const baseKey of Object.values(MIGRATION_BASE_KEYS)) {
    const lsKey = getLSKey(baseKey);
    try {
      localStorage.removeItem(lsKey);
      cleared.push(lsKey);
    } catch (e: any) {
      errors.push(`Failed to clear "${lsKey}": ${e.message}`);
    }
  }

  return { cleared, errors };
}
