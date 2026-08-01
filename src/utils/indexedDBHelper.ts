/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * indexedDBHelper.ts — IndexedDB wrapper for the law platform.
 *
 * v2.7.0: Added new stores for full localStorage migration:
 *  - sessions, transactions, deadlines, tasks, documents,
 *    executions, hour_logs, invoices
 *
 * v2.9.7: Bumped DB_VERSION to 5 — added secondary indexes for fast filtering:
 *  - cases, clients, sessions, transactions, deadlines, documents,
 *    bailiff_papers, opponents, executions, hour_logs, invoices
 *
 * الـ stores الـ 8 الأصلية (cases, clients, bailiff_papers, opponents,
 * legal_books, legal_laws, legal_precedents) + الـ 8 الجديدة = 16 store.
 */

import { Case, Client, BailiffPaper, LawArticle, CourtPrecedent, LegalBook, Opponent } from '../types';
import { logger } from './logger';

import { mockCases, mockClients, mockOpponents } from '../data/mockData';

// Lazy import to avoid circular dependency — migrationHelper imports from indexedDBHelper
let _setMigrationUidFn: ((uid: string | null) => void) | null = null;
function notifyMigrationHelper(uid: string | null): void {
  if (_setMigrationUidFn) {
    _setMigrationUidFn(uid);
    return;
  }
  // Lazy-load on first call
  import('./migrationHelper').then(m => {
    _setMigrationUidFn = m.setMigrationUid;
    m.setMigrationUid(uid);
  }).catch(() => {});
}

const DB_NAME = 'lawfirm_unlimited_db';
const DB_VERSION = 5; // v2.9.7: bump for secondary indexes

// ─── v2.9.7: Schema definition (testable as pure data) ─────────────────────

export interface StoreIndex {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
  multiEntry?: boolean;
}

export interface StoreSchema {
  name: string;
  keyPath: string;
  indexes: StoreIndex[];
}

export const SCHEMA: StoreSchema[] = [
  // ─── Original stores (v1-v3) ───────────────────────────────────────────
  {
    name: 'cases',
    keyPath: 'id',
    indexes: [
      { name: 'caseNumber', keyPath: 'caseNumber', unique: false },
      { name: 'clientId', keyPath: 'clientId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'court', keyPath: 'court', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
    ],
  },
  {
    name: 'clients',
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name', unique: false },
      { name: 'phone', keyPath: 'phone', unique: false },
    ],
  },
  {
    name: 'bailiff_papers',
    keyPath: 'id',
    indexes: [
      { name: 'caseId', keyPath: 'caseId', unique: false },
      { name: 'paperNumber', keyPath: 'paperNumber', unique: false },
    ],
  },
  {
    name: 'opponents',
    keyPath: 'id',
    indexes: [
      { name: 'fullName', keyPath: 'fullName', unique: false },
      { name: 'phone', keyPath: 'phone', unique: false },
    ],
  },
  {
    name: 'legal_books',
    keyPath: 'id',
    indexes: [
      { name: 'category', keyPath: 'category', unique: false },
    ],
  },
  {
    name: 'legal_laws',
    keyPath: 'id',
    indexes: [
      { name: 'lawName', keyPath: 'lawName', unique: false },
    ],
  },
  {
    name: 'legal_precedents',
    keyPath: 'id',
    indexes: [
      { name: 'category', keyPath: 'category', unique: false },
      { name: 'courtName', keyPath: 'courtName', unique: false },
    ],
  },
  // ─── New stores (v2.7.0) — for localStorage migration ──────────────────
  {
    name: 'sessions',
    keyPath: 'id',
    indexes: [
      { name: 'caseId', keyPath: 'caseId', unique: false },
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'court', keyPath: 'court', unique: false },
    ],
  },
  {
    name: 'transactions',
    keyPath: 'id',
    indexes: [
      { name: 'caseId', keyPath: 'caseId', unique: false },
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'type', keyPath: 'type', unique: false },
    ],
  },
  {
    name: 'deadlines',
    keyPath: 'id',
    indexes: [
      { name: 'caseId', keyPath: 'caseId', unique: false },
      { name: 'deadlineDate', keyPath: 'deadlineDate', unique: false },
      { name: 'isCompleted', keyPath: 'isCompleted', unique: false },
    ],
  },
  {
    name: 'tasks',
    keyPath: 'id',
    indexes: [
      { name: 'caseId', keyPath: 'caseId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'dueDate', keyPath: 'dueDate', unique: false },
    ],
  },
  {
    name: 'documents',
    keyPath: 'id',
    indexes: [
      { name: 'caseId', keyPath: 'caseId', unique: false },
      { name: 'clientId', keyPath: 'clientId', unique: false },
      { name: 'uploadedAt', keyPath: 'uploadedAt', unique: false },
    ],
  },
  {
    name: 'executions',
    keyPath: 'id',
    indexes: [
      { name: 'caseId', keyPath: 'caseId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
    ],
  },
  {
    name: 'hour_logs',
    keyPath: 'id',
    indexes: [
      { name: 'caseId', keyPath: 'caseId', unique: false },
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'isBilled', keyPath: 'isBilled', unique: false },
    ],
  },
  {
    name: 'invoices',
    keyPath: 'id',
    indexes: [
      { name: 'clientId', keyPath: 'clientId', unique: false },
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
    ],
  },
];

/**
 * v2.9.7: Pure migration function — applies the full schema to a database
 * during an upgrade event. Idempotent: checks existence before creating.
 * Testable without a real IndexedDB by passing a mock IDBDatabase.
 */
export function applySchema(
  dbOrRequest: IDBDatabase | IDBOpenDBRequest,
  _oldVersion: number,
  _newVersion: number
): void {
  // v2.9.8 FIX: detect if we got a real IDBOpenDBRequest (from onupgradeneeded) so
  // we can use `request.transaction` (the versionchange transaction) — this is the
  // correct way to access an existing objectStore during upgrade. The previous code
  // called `db.transaction(name, 'versionchange')` which is NOT a valid IDB mode and
  // would fail on real upgrades when stores already exist (e.g. v4 → v5).
  const candidate = dbOrRequest as any;
  const isRequest = candidate.result !== undefined
    && candidate.transaction !== undefined
    && !candidate.objectStoreNames;

  const db: IDBDatabase = isRequest ? candidate.result : dbOrRequest as IDBDatabase;
  const txn: IDBTransaction | undefined = isRequest ? candidate.transaction : undefined;

  for (const store of SCHEMA) {
    let objectStore: IDBObjectStore;
    if (!db.objectStoreNames.contains(store.name)) {
      objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
    } else if (txn) {
      // ✅ Production path: real versionchange transaction
      objectStore = txn.objectStore(store.name);
    } else {
      // ⚠️ Test-only fallback: fake the transaction. Won't work in real IDB.
      const fakeTxn = (db as any).transaction(store.name, 'versionchange');
      objectStore = fakeTxn.objectStore(store.name);
    }

    for (const index of store.indexes) {
      if (!objectStore.indexNames.contains(index.name)) {
        objectStore.createIndex(index.name, index.keyPath, {
          unique: !!index.unique,
          multiEntry: !!index.multiEntry,
        });
      }
    }
  }
}

let activeUid: string | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;
let testInitIndexedDBOverride: (() => Promise<IDBDatabase>) | null = null;

export function setFirebaseUserUid(uid: string | null) {
  if (activeUid !== uid) {
    activeUid = uid;
    // Notify migrationHelper so its flags are UID-scoped too
    notifyMigrationHelper(uid);
    // Close the old database connection if it was opened
    if (dbPromise) {
      dbPromise.then(db => db.close()).catch(() => {});
      dbPromise = null;
      logger.info(`[indexedDB] Database switched to user UID: ${uid}`);
    }
  }
}

/**
 * Test helpers: manage cached IndexedDB state for unit tests.
 */
export function __resetIndexedDBStateForTests(): void {
  activeUid = null;
  dbPromise = null;
  testInitIndexedDBOverride = null;
}

export function __setInitIndexedDBForTests(fn: (() => Promise<IDBDatabase>) | null): void {
  testInitIndexedDBOverride = fn;
}

export function initIndexedDB(): Promise<IDBDatabase> {
  if (testInitIndexedDBOverride) {
    return testInitIndexedDBOverride();
  }
  if (dbPromise) {
    return dbPromise;
  }
  const dbName = activeUid ? `lawfirm_db_${activeUid}` : 'lawfirm_unlimited_db';
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);

    request.onerror = () => {
      logger.error(`Failed to open IndexedDB database: ${dbName}`);
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const req = event.target as IDBOpenDBRequest;
      const db = req.result;
      const oldVersion = event.oldVersion as number;
      const newVersion = event.newVersion as number;
      logger.info(`[indexedDB] Upgrading schema for ${dbName} from v${oldVersion} to v${newVersion}`);
      try {
        // v2.9.8: pass `req` (the IDBOpenDBRequest) so applySchema can access
        // `req.transaction` — the real versionchange transaction. Passing only
        // `db` (as before) broke upgrades when stores already existed.
        applySchema(req, oldVersion, newVersion);
      } catch (e) {
        logger.error('[indexedDB] Schema migration failed:', e);
        throw e;
      }
    };
  });
  return dbPromise;
}

/**
 * Custom Promise-wrapped IndexedDB Operations
 */
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as T[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * v2.9.7: Query a store by an indexed field.
 * Uses an IDB index to filter server-side; faster than getAll + filter.
 *
 * Example:
 *   const activeCases = await getByIndex<Case>('cases', 'status', 'متداولة');
 */
export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    if (!store.indexNames.contains(indexName)) {
      reject(new Error(`Index "${indexName}" not found on store "${storeName}"`));
      return;
    }
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => {
      resolve(request.result as T[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function putIntoStore<T>(storeName: string, item: T): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function putMultipleIntoStore<T>(storeName: string, items: T[]): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    items.forEach(item => {
      store.put(item);
    });

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

export async function removeFromStore(storeName: string, id: string): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * v2.8.1: Clear all records in a single store (keeps the store, deletes data).
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve();
      return;
    }
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * v2.8.1: Clear all application stores (used by factory reset).
 */
export async function clearAllStores(): Promise<void> {
  const db = await initIndexedDB();
  const storeNames = Array.from(db.objectStoreNames);
  for (const name of storeNames) {
    try {
      await clearStore(name);
    } catch (e) {
      logger.error(`[clearAllStores] Failed to clear "${name}":`, e);
    }
  }
}

/**
 * Runs on startup, migrating any older localStorage cases/clients to IndexedDB
 */
export async function syncAndLoadApplicationData(): Promise<{
  cases: Case[];
  clients: Client[];
  bailiffPapers: BailiffPaper[];
  opponents: Opponent[];
}> {
  // Step 1: Load from IndexedDB (best-effort)
  let loadedCases: Case[] = [];
  let loadedClients: Client[] = [];
  let loadedBailiffPapers: BailiffPaper[] = [];
  let loadedOpponents: Opponent[] = [];

  try { loadedCases = await getAllFromStore<Case>('cases'); } catch (e) { logger.error('Failed to load cases from IndexedDB', e); }
  try { loadedClients = await getAllFromStore<Client>('clients'); } catch (e) { logger.error('Failed to load clients from IndexedDB', e); }
  try { loadedBailiffPapers = await getAllFromStore<BailiffPaper>('bailiff_papers'); } catch (e) { logger.error('Failed to load bailiff papers from IndexedDB', e); }
  try { loadedOpponents = await getAllFromStore<Opponent>('opponents'); } catch (e) { logger.error('Failed to load opponents from IndexedDB', e); }

  // Step 2: Use IndexedDB as primary, localStorage as fallback cache
  // localStorage is limited (~5-10MB), IndexedDB is virtually unlimited
  const getLSKey = (baseKey: string) => activeUid ? `lawfirm_${activeUid}_${baseKey}` : `lawfirm_${baseKey}`;

  const localCasesRaw = localStorage.getItem(getLSKey('cases'));
  const localClientsRaw = localStorage.getItem(getLSKey('clients'));
  const localPapersRaw = localStorage.getItem(getLSKey('bailiff_papers'));
  const localOpponentsRaw = localStorage.getItem(getLSKey('opponents'));

  const hasLocalData = localCasesRaw !== null || localClientsRaw !== null;
  const migrationDone = localStorage.getItem(getLSKey('migration_v2_7_done')) === 'true';

  // v2.9.10: detect desktop — الـ mock data يبقى للـ desktop بس
  const isDesktop = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

  // If IndexedDB is empty but localStorage has data, migrate from localStorage
  // ONLY on first run (migration not yet done). After migration, localStorage is stale.
  if (!migrationDone && loadedCases.length === 0 && loadedClients.length === 0) {
    if (hasLocalData) {
      try {
        if (localCasesRaw !== null) { const p = JSON.parse(localCasesRaw); if (Array.isArray(p)) loadedCases = p; }
        if (localClientsRaw !== null) { const p = JSON.parse(localClientsRaw); if (Array.isArray(p)) loadedClients = p; }
        if (localPapersRaw !== null) { const p = JSON.parse(localPapersRaw); if (Array.isArray(p)) loadedBailiffPapers = p; }
        if (localOpponentsRaw !== null) { const p = JSON.parse(localOpponentsRaw); if (Array.isArray(p)) loadedOpponents = p; }
        // Sync migrated data to IndexedDB
        if (loadedCases.length > 0) try { await putMultipleIntoStore('cases', loadedCases); } catch (e) { logger.warn('IDB sync failed during migration', e); }
        if (loadedClients.length > 0) try { await putMultipleIntoStore('clients', loadedClients); } catch (e) { logger.warn('IDB sync failed during migration', e); }
        if (loadedBailiffPapers.length > 0) try { await putMultipleIntoStore('bailiff_papers', loadedBailiffPapers); } catch (e) { logger.warn('IDB sync failed during migration', e); }
        if (loadedOpponents.length > 0) try { await putMultipleIntoStore('opponents', loadedOpponents); } catch (e) { logger.warn('IDB sync failed during migration', e); }
      } catch (e) { logger.error('Failed to migrate localStorage data', e); }
    } else if (isDesktop) {
      // v2.9.11: Start clean for everyone
      logger.info('[IndexedDB] First run on desktop — starting with empty data');
    } else {
      // v2.9.11: Start clean for everyone
      logger.info('[IndexedDB] First run on web — starting with empty data');
    }

    // v2.9.11: Web users start with empty bailiff papers — no sample seeding
  }

  // localStorage sync removed — all data persists in IndexedDB.
  // Previously stripped dataUrl here but even metadata writes risk QuotaExceededError
  // on accounts with many attachments across clients/cases.

  return {
    cases: loadedCases,
    clients: loadedClients,
    bailiffPapers: loadedBailiffPapers,
    opponents: loadedOpponents
  };
}

// === Legal Library IndexedDB Operations ===
// ملاحظة: الدوال السابقة كانت تبتلع الأخطاء وتُرجع [] فارغɡ مما يخفي فشل الاسترداد عن المستخدم.
// تم تعديلها لتُرجع خطأً مرئياً وتسجيله في console.error حتى يمكن تشخيص المشكلة لاحقاً.

interface LegalLibraryLoadResult<T> {
  items: T[];
  error: string | null;
}

export async function getAllLegalLaws(): Promise<LawArticle[]> {
  try {
    return await getAllFromStore<LawArticle>('legal_laws');
  } catch (e) {
    logger.error('[getAllLegalLaws] فشل قراءة المواد القانونية من IndexedDB:', e);
    return [];
  }
}

export async function saveLegalLaw(law: LawArticle): Promise<void> {
  await putIntoStore('legal_laws', law);
}

export async function saveLegalLaws(laws: LawArticle[]): Promise<void> {
  if (laws.length === 0) return;
  await putMultipleIntoStore('legal_laws', laws);
}

export async function updateLegalLaw(law: LawArticle): Promise<void> {
  // put يُنشئ أو يُحدّث بحسب وجود الـ id
  await putIntoStore('legal_laws', law);
}

export async function deleteLegalLaw(id: string): Promise<void> {
  await removeFromStore('legal_laws', id);
}

export async function getAllLegalPrecedents(): Promise<CourtPrecedent[]> {
  try {
    return await getAllFromStore<CourtPrecedent>('legal_precedents');
  } catch (e) {
    logger.error('[getAllLegalPrecedents] فشل قراءة السوابق القضائية من IndexedDB:', e);
    return [];
  }
}

export async function saveLegalPrecedent(prec: CourtPrecedent): Promise<void> {
  await putIntoStore('legal_precedents', prec);
}

export async function saveLegalPrecedents(precs: CourtPrecedent[]): Promise<void> {
  if (precs.length === 0) return;
  await putMultipleIntoStore('legal_precedents', precs);
}

export async function updateLegalPrecedent(prec: CourtPrecedent): Promise<void> {
  await putIntoStore('legal_precedents', prec);
}

export async function deleteLegalPrecedent(id: string): Promise<void> {
  await removeFromStore('legal_precedents', id);
}

export async function getAllLegalBooks(): Promise<LegalBook[]> {
  try {
    return await getAllFromStore<LegalBook>('legal_books');
  } catch (e) {
    logger.error('[getAllLegalBooks] فشل قراءة الكتب القانونية من IndexedDB:', e);
    return [];
  }
}

export async function saveLegalBook(book: LegalBook): Promise<void> {
  await putIntoStore('legal_books', book);
}

export async function saveLegalBooks(books: LegalBook[]): Promise<void> {
  if (books.length === 0) return;
  await putMultipleIntoStore('legal_books', books);
}

export async function updateLegalBook(book: LegalBook): Promise<void> {
  await putIntoStore('legal_books', book);
}

export async function deleteLegalBook(id: string): Promise<void> {
  await removeFromStore('legal_books', id);
}

/**
 * يحذف كل المحتوى المخصص (custom/imported) دون المساس بالمحتوى الافتراضي (mock).
 * مفيد لإعادة ضبط المكتبة إلى الحالة الأصلية.
 */
export async function clearCustomLegalLibraryData(): Promise<{ laws: number; precedents: number; books: number }> {
  const db = await initIndexedDB();
  let lawCount = 0;
  let precCount = 0;
  let bookCount = 0;

  // حذف المواد غير الافتراضية
  if (db.objectStoreNames.contains('legal_laws')) {
    const t = db.transaction('legal_laws', 'readwrite');
    const store = t.objectStore('legal_laws');
    const req = store.getAll();
    await new Promise<void>((resolve) => {
      req.onsuccess = () => {
        const items: LawArticle[] = req.result || [];
        items.forEach(it => {
          if (it.id && it.id.startsWith('custom_law_')) {
            store.delete(it.id);
            lawCount++;
          }
        });
        resolve();
      };
      req.onerror = () => resolve();
    });
  }

  // حذف السوابق غير الافتراضية
  if (db.objectStoreNames.contains('legal_precedents')) {
    const t = db.transaction('legal_precedents', 'readwrite');
    const store = t.objectStore('legal_precedents');
    const req = store.getAll();
    await new Promise<void>((resolve) => {
      req.onsuccess = () => {
        const items: CourtPrecedent[] = req.result || [];
        items.forEach(it => {
          if (it.id && it.id.startsWith('custom_prec_')) {
            store.delete(it.id);
            precCount++;
          }
        });
        resolve();
      };
      req.onerror = () => resolve();
    });
  }

  // حذف الكتب غير الافتراضية
  if (db.objectStoreNames.contains('legal_books')) {
    const t = db.transaction('legal_books', 'readwrite');
    const store = t.objectStore('legal_books');
    const req = store.getAll();
    await new Promise<void>((resolve) => {
      req.onsuccess = () => {
        const items: LegalBook[] = req.result || [];
        items.forEach(it => {
          if (it.id && it.id.startsWith('custom_book_')) {
            store.delete(it.id);
            bookCount++;
          }
        });
        resolve();
      };
      req.onerror = () => resolve();
    });
  }

  return { laws: lawCount, precedents: precCount, books: bookCount };
}

/**
 * يحذف كل محتوى المكتبة القانونية (تحذير: يحذف المحتوى الافتراضي أيضاً إن كان محفوظاً).
 */
export async function clearAllLegalLibraryData(): Promise<void> {
  const db = await initIndexedDB();
  ['legal_books', 'legal_laws', 'legal_precedents'].forEach(storeName => {
    if (db.objectStoreNames.contains(storeName)) {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).clear();
    }
  });
}


/**
 * v2.8.1: Atomic write across multiple stores in a single transaction.
 * لو أي store فشل، الـ transaction كله يتراجع تلقائياً.
 */
export async function atomicMultiStoreWrite<T = any>(
  updates: Record<string, T[]>
): Promise<void> {
  const storeNames = Object.keys(updates).filter(name => {
    const items = updates[name];
    return Array.isArray(items) && items.length > 0;
  });

  if (storeNames.length === 0) {
    return;
  }

  const db = await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, 'readwrite');

    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const items = updates[storeName];
      items.forEach(item => store.put(item));
    }

    transaction.oncomplete = () => {
      logger.info(`[atomicMultiStoreWrite] Updated ${storeNames.length} stores atomically`);
      resolve();
    };

    transaction.onerror = () => {
      logger.error('[atomicMultiStoreWrite] Transaction failed:', transaction.error);
      reject(transaction.error);
    };

    transaction.onabort = () => {
      logger.warn('[atomicMultiStoreWrite] Transaction aborted (rolled back)');
      reject(new Error('Transaction aborted'));
    };
  });
}
