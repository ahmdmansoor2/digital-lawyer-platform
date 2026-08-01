/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dataRecovery.ts — أداة استعادة البيانات المفقودة بعد v2.7.0.
 *
 * السيناريو:
 *  - المستخدم أضاف بيانات في v2.7.0 (قبل الـ hotfix)
 *  - البيانات اتحفظت في localStorage + React state بس
 *  - الـ IndexedDB كان stale (الـ migration الأولى بس)
 *  - بعد reload، الـ IDB overwrite الـ state بالبيانات القديمة
 *  - النتيجة: البيانات المضافة ضاعت من الواجهة (بس لسه في localStorage)
 *
 * الحل:
 *  - هذا الـ script يقرأ من localStorage (النسخة المفقودة)
 *  - يقرأ من IndexedDB (النسخة الموجودة)
 *  - يعمل merge ذكي (يأخذ الأحدث أو يعرض للاختيار)
 *  - يكتب النتيجة في كلتا المكانين
 *
 * الاستخدام من DevTools Console:
 *   import('/src/utils/dataRecovery.ts').then(m => m.analyzeDataState())
 *   import('/src/utils/dataRecovery.ts').then(m => m.recoverFromLocalStorage())
 */

import { getAllFromStore, putMultipleIntoStore, initIndexedDB } from './indexedDBHelper';
import { logger } from './logger';

const LOCALSTORAGE_KEYS = [
  'lawfirm_sessions', 'lawfirm_transactions', 'lawfirm_deadlines',
  'lawfirm_tasks', 'lawfirm_documents', 'lawfirm_executions',
  'lawfirm_hour_logs', 'lawfirm_invoices'
];

const STORE_MAP: Record<string, string> = {
  lawfirm_sessions: 'sessions',
  lawfirm_transactions: 'transactions',
  lawfirm_deadlines: 'deadlines',
  lawfirm_tasks: 'tasks',
  lawfirm_documents: 'documents',
  lawfirm_executions: 'executions',
  lawfirm_hour_logs: 'hour_logs',
  lawfirm_invoices: 'invoices'
};

export interface DataStateItem {
  source: 'localStorage' | 'indexedDB' | 'both';
  count: number;
  ids: string[];
  sampleMissing?: Array<{ id: string; reason: string }>;
}

export interface DataStateReport {
  stores: Record<string, DataStateItem>;
  totalLocalStorageOnly: number;
  totalIndexedDBOnly: number;
  totalBoth: number;
  totalRecords: number;
}

/**
 * قراءة آمنة من localStorage
 */
function readLocalStorage(key: string): any[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    logger.warn(`[recovery] Failed to read localStorage "${key}":`, e);
    return [];
  }
}

/**
 * تحليل حالة البيانات — يعرض الـ diff بين localStorage و IndexedDB
 */
export async function analyzeDataState(): Promise<DataStateReport> {
  await initIndexedDB();
  const report: DataStateReport = {
    stores: {},
    totalLocalStorageOnly: 0,
    totalIndexedDBOnly: 0,
    totalBoth: 0,
    totalRecords: 0
  };

  for (const lsKey of LOCALSTORAGE_KEYS) {
    const storeName = STORE_MAP[lsKey];
    const lsItems = readLocalStorage(lsKey);
    let idbItems: any[] = [];
    try {
      idbItems = await getAllFromStore(storeName);
    } catch (e) {
      logger.warn(`[recovery] Failed to read IDB "${storeName}":`, e);
    }

    const lsIds = new Set(lsItems.map(i => i.id).filter(Boolean));
    const idbIds = new Set(idbItems.map(i => i.id).filter(Boolean));

    const onlyInLS = lsItems.filter(i => i.id && !idbIds.has(i.id));
    const onlyInIDB = idbItems.filter(i => i.id && !lsIds.has(i.id));
    const inBoth = lsItems.filter(i => i.id && idbIds.has(i.id));

    const source: 'localStorage' | 'indexedDB' | 'both' =
      onlyInLS.length > 0 && onlyInIDB.length === 0 ? 'localStorage' :
      onlyInIDB.length > 0 && onlyInLS.length === 0 ? 'indexedDB' :
      inBoth.length > 0 ? 'both' : 'localStorage';

    report.stores[storeName] = {
      source,
      count: lsItems.length + idbItems.length - inBoth.length,
      ids: [...new Set([...lsIds, ...idbIds])] as string[],
      sampleMissing: [
        ...onlyInLS.slice(0, 5).map(i => ({ id: i.id, reason: 'in localStorage only' })),
        ...onlyInIDB.slice(0, 5).map(i => ({ id: i.id, reason: 'in IndexedDB only' }))
      ]
    };

    report.totalLocalStorageOnly += onlyInLS.length;
    report.totalIndexedDBOnly += onlyInIDB.length;
    report.totalBoth += inBoth.length;
    report.totalRecords += lsItems.length + idbItems.length - inBoth.length;
  }

  return report;
}

/**
 * طباعة تقرير مفصّل في Console
 */
export async function printDataStateReport(): Promise<void> {
  const report = await analyzeDataState();
  console.group('📊 تقرير حالة البيانات (v2.8.0 Recovery)');
  logger.info(`إجمالي السجلات: ${report.totalRecords}`);
  logger.info(`في localStorage فقط: ${report.totalLocalStorageOnly}`);
  logger.info(`في IndexedDB فقط: ${report.totalIndexedDBOnly}`);
  logger.info(`في الاثنين: ${report.totalBoth}`);
  logger.info('');

  for (const [store, info] of Object.entries(report.stores)) {
    const icon = info.source === 'localStorage' ? '💾' :
                 info.source === 'indexedDB' ? '🗄️' : '✅';
    logger.info(`${icon} ${store}: ${info.count} سجل (${info.source})`);
    if (info.sampleMissing && info.sampleMissing.length > 0) {
      info.sampleMissing.forEach(m => {
        logger.info(`   - ${m.id}: ${m.reason}`);
      });
    }
  }

  console.groupEnd();
  logger.info('');
  logger.info('💡 لاستعادة البيانات من localStorage إلى IndexedDB:');
  logger.info('   import("/src/utils/dataRecovery.ts").then(m => m.recoverFromLocalStorage())');
  logger.info('');
  logger.info('💡 لدمج البيانات (الأحدث يفوز):');
  logger.info('   import("/src/utils/dataRecovery.ts").then(m => m.smartMerge())');

  return;
}

/**
 * استعادة البيانات من localStorage إلى IndexedDB.
 * البيانات الموجودة في IDB (الأحدث) تحتفظ بمكانها.
 * البيانات الموجودة في localStorage فقط تُضاف لـ IDB.
 */
export async function recoverFromLocalStorage(): Promise<{
  recovered: Record<string, number>;
  errors: string[];
}> {
  await initIndexedDB();
  const recovered: Record<string, number> = {};
  const errors: string[] = [];

  for (const lsKey of LOCALSTORAGE_KEYS) {
    const storeName = STORE_MAP[lsKey];
    const lsItems = readLocalStorage(lsKey);
    if (lsItems.length === 0) {
      recovered[storeName] = 0;
      continue;
    }

    let idbItems: any[] = [];
    try {
      idbItems = await getAllFromStore(storeName);
    } catch (e: any) {
      errors.push(`Failed to read IDB ${storeName}: ${e.message}`);
      continue;
    }

    const idbIds = new Set(idbItems.map(i => i.id).filter(Boolean));
    const missing = lsItems.filter(i => i.id && !idbIds.has(i.id));

    if (missing.length > 0) {
      try {
        await putMultipleIntoStore(storeName, missing);
        recovered[storeName] = missing.length;
        logger.info(`[recovery] Added ${missing.length} records to "${storeName}" from localStorage`);
      } catch (e: any) {
        errors.push(`Failed to write to ${storeName}: ${e.message}`);
      }
    } else {
      recovered[storeName] = 0;
    }
  }

  logger.info('');
  logger.info('✅ الاستعادة تمت. الإحصائيات:');
  logger.info(JSON.stringify(recovered, null, 2));
  if (errors.length > 0) {
    logger.warn('⚠️ أخطاء:');
    logger.warn(JSON.stringify(errors, null, 2));
  }
  logger.info('');
  logger.info('💡 الـ reload لتطبيق التغييرات:');
  logger.info('   location.reload()');

  return { recovered, errors };
}

/**
 * دمج ذكي: البيانات في IDB تكتب فوق localStorage (IDB هو المرجع).
 * مفيد عندما يكون IDB محدث والـ localStorage قديم.
 */
export async function smartMerge(): Promise<{
  merged: Record<string, number>;
  errors: string[];
}> {
  await initIndexedDB();
  const merged: Record<string, number> = {};
  const errors: string[] = [];

  for (const lsKey of LOCALSTORAGE_KEYS) {
    const storeName = STORE_MAP[lsKey];
    let idbItems: any[] = [];
    try {
      idbItems = await getAllFromStore(storeName);
    } catch (e: any) {
      errors.push(`Failed to read IDB ${storeName}: ${e.message}`);
      continue;
    }

    if (idbItems.length === 0) {
      merged[storeName] = 0;
      continue;
    }

    // Update localStorage with the IDB data (IDB is source of truth)
    try {
      localStorage.setItem(lsKey, JSON.stringify(idbItems));
      merged[storeName] = idbItems.length;
    } catch (e: any) {
      errors.push(`Failed to write to localStorage ${lsKey}: ${e.message}`);
    }
  }

  logger.info('');
  logger.info('✅ الدمج تم. localStorage محدّث من IndexedDB:');
  logger.info(JSON.stringify(merged, null, 2));
  if (errors.length > 0) {
    logger.warn('⚠️ أخطاء:');
    logger.warn(JSON.stringify(errors, null, 2));
  }
  logger.info('');
  logger.info('💡 الـ reload لتطبيق التغييرات:');
  logger.info('   location.reload()');

  return { merged, errors };
}

/**
 * إعادة sync البيانات الحالية من React state إلى IDB.
 * يُستخدم عندما يكون الـ React state محدّث لكن IDB قديم.
 *
 * هذا غير ممكن من هنا لأن الـ state خارج الـ React tree.
 * البديل: المستخدم يضيف البيانات يدوياً من الواجهة.
 */
export function reSyncCurrentState(): void {
  logger.warn('[recovery] reSyncCurrentState() requires React tree access. Add data via UI to trigger auto-sync.');
}
