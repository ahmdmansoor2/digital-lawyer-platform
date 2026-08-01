/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * طبقة التخزين الأساسية للمكتبة القانونية.
 *
 * الترتيب: disk (Electron IPC) → localStorage → mock defaults
 *
 * في Electron: نستخدم ملف JSON حقيقي على القرص عبر window.electronAPI.library
 * (يكتبه main process في %APPDATA%\com.lawfirm.digitallawyer\legal-library.json).
 * هذا مضمون 100% ولا يتأثر بمشاكل localStorage أو IndexedDB في Electron portable.
 *
 * في المتصفح: نستخدم localStorage كبديل.
 */

import { LawArticle, CourtPrecedent, LegalBook, BookFolder } from '../types';
import { logger } from './logger';

const LS_PREFIX = 'legal_lib_';
const LS_KEYS = {
  laws: `${LS_PREFIX}laws_v1`,
  precedents: `${LS_PREFIX}precedents_v1`,
  books: `${LS_PREFIX}books_v1`,
  encyclopedias: `${LS_PREFIX}encyclopedias_v1`,
  folders: `${LS_PREFIX}book_folders_v1`,
  meta: `${LS_PREFIX}meta_v1`,
} as const;

interface LibraryMeta {
  lastSavedAt: string;
  version: number;
  counts: { laws: number; precedents: number; books: number; encyclopedias?: number };
  storageLocation: string;
}

const STORAGE_VERSION = 2;
const LIBRARY_VERSION_KEY = 'version';

// نوع النافذة مع electronAPI
interface ElectronAPIWindow {
  electronAPI?: {
    library: {
      read: () => Promise<{ success: boolean; data?: any; path?: string; error?: string }>;
      write: (data: any) => Promise<{ success: boolean; path?: string; size?: number; error?: string }>;
      getPath: () => Promise<{ success: boolean; path?: string; userData?: string; error?: string }>;
    };
  };
}

function getWindow(): (Window & ElectronAPIWindow) | null {
  if (typeof window === 'undefined') return null;
  return window as unknown as (Window & ElectronAPIWindow);
}

function isElectronEnv(): boolean {
  const w = getWindow();
  return !!(w?.electronAPI?.library);
}

// ===== ملف غير متزامن (debounced) =====
// نستخدم الذاكرة المؤقتة + كتابة بـ debounce لتفادي الإفراط في القرص I/O
let memoryCache: { laws: LawArticle[]; precedents: CourtPrecedent[]; books: LegalBook[]; encyclopedias: any[]; folders: BookFolder[] } | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
const WRITE_DEBOUNCE_MS = 300;

function scheduleDiskWrite(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    flushToDisk();
  }, WRITE_DEBOUNCE_MS);
}

async function flushToDisk(): Promise<void> {
  if (!memoryCache) return;
  if (!isElectronEnv()) return; // في المتصف͡ الـ useEffect يكتب في localStorage
  const w = getWindow();
  if (!w?.electronAPI) return;
  const result = await w.electronAPI.library.write(memoryCache);
  if (!result.success) {
    console.error('[legalLibraryStorage] فشل الكتابة على القرص:', result.error);
  }
}

function safeGetLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[legalLibraryStorage] فشل قراءة ${key}:`, e);
    return fallback;
  }
}

function safeSetLS(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e: any) {
    console.error(`[legalLibraryStorage] فشل كتابة ${key}:`, e?.name, e?.message);
    return false;
  }
}

// ===== قراءة فورية (متزامنة) =====
// عند بدء التشغيل، نقرأ من localStorage فوراً (هذا متاح في كل البيئات).
// ثم في Electron، الـ disk read سيُستدعى async ويُحدّث الذاكرة المؤقتة.

export function loadLawsFromLocal(): LawArticle[] {
  // رجّع من الذاكرة المؤقتة أولاً
  if (memoryCache) return memoryCache.laws;
  return safeGetLS<LawArticle[]>(LS_KEYS.laws, []);
}

export function loadPrecedentsFromLocal(): CourtPrecedent[] {
  if (memoryCache) return memoryCache.precedents;
  return safeGetLS<CourtPrecedent[]>(LS_KEYS.precedents, []);
}

export function loadBooksFromLocal(): LegalBook[] {
  if (memoryCache) return memoryCache.books;
  return safeGetLS<LegalBook[]>(LS_KEYS.books, []);
}

export function loadEncyclopediasFromLocal(): any[] {
  if (memoryCache) return memoryCache.encyclopedias;
  const saved = safeGetLS<any[]>(LS_KEYS.encyclopedias, []);
  if (saved.length === 0) {
    return [
      { id: 'enc_1', title: 'موسوعة التشريع الجنائي المقارن', description: 'أبحاث في قانون العقوبات ومقارناته.', createdAt: '2026-06-01', files: [] },
      { id: 'enc_2', title: 'مجلد صحف العقود التجارية', description: 'نماذج العقود والشروط التجارية.', createdAt: '2026-06-01', files: [] },
    ];
  }
  return saved;
}

// ===== حفظ فوري =====

export function saveLawsToLocal(laws: LawArticle[]): boolean {
  // تحديث الذاكرة المؤقتة
  if (!memoryCache) memoryCache = { laws: [], precedents: [], books: [], encyclopedias: [], folders: [] };
  memoryCache.laws = laws;
  // كتابة localStorage دائماً (fallback)
  const ok = safeSetLS(LS_KEYS.laws, laws);
  if (ok) updateMeta({ laws: laws.length });
  // جدولة كتابة القرص
  scheduleDiskWrite();
  return ok;
}

export function savePrecedentsToLocal(precs: CourtPrecedent[]): boolean {
  if (!memoryCache) memoryCache = { laws: [], precedents: [], books: [], encyclopedias: [], folders: [] };
  memoryCache.precedents = precs;
  const ok = safeSetLS(LS_KEYS.precedents, precs);
  if (ok) updateMeta({ precedents: precs.length });
  scheduleDiskWrite();
  return ok;
}

export function saveBooksToLocal(books: LegalBook[]): boolean {
  if (!memoryCache) memoryCache = { laws: [], precedents: [], books: [], encyclopedias: [], folders: [] };
  memoryCache.books = books;
  const ok = safeSetLS(LS_KEYS.books, books);
  if (ok) updateMeta({ books: books.length });
  scheduleDiskWrite();
  return ok;
}

export function saveEncyclopediasToLocal(encyclopedias: any[]): boolean {
  if (!memoryCache) memoryCache = { laws: [], precedents: [], books: [], encyclopedias: [], folders: [] };
  memoryCache.encyclopedias = encyclopedias;
  const ok = safeSetLS(LS_KEYS.encyclopedias, encyclopedias);
  if (ok) updateMeta({ encyclopedias: encyclopedias.length });
  scheduleDiskWrite();
  return ok;
}

export function loadFoldersFromLocal(): BookFolder[] {
  if (memoryCache) return memoryCache.folders;
  return safeGetLS<BookFolder[]>(LS_KEYS.folders, []);
}

export function saveFoldersToLocal(folders: BookFolder[]): boolean {
  if (!memoryCache) memoryCache = { laws: [], precedents: [], books: [], encyclopedias: [], folders: [] };
  memoryCache.folders = folders;
  const ok = safeSetLS(LS_KEYS.folders, folders);
  scheduleDiskWrite();
  return ok;
}

function updateMeta(partial: Partial<LibraryMeta['counts']>): void {
  const current = safeGetLS<LibraryMeta | null>(LS_KEYS.meta, null);
  const counts = {
    laws: partial.laws ?? current?.counts.laws ?? 0,
    precedents: partial.precedents ?? current?.counts.precedents ?? 0,
    books: partial.books ?? current?.counts.books ?? 0,
    encyclopedias: partial.encyclopedias ?? current?.counts.encyclopedias ?? 0,
  };
  const meta: LibraryMeta = {
    lastSavedAt: new Date().toISOString(),
    version: STORAGE_VERSION,
    counts,
    storageLocation: isElectronEnv() ? 'electron-disk + localStorage' : 'localStorage',
  };
  safeSetLS(LS_KEYS.meta, meta);
}

// ===== التهيئة من القرص (في Electron) =====
// تُستدعى مرة واحدة عند تحميل المكون في LegalLibrary

export async function hydrateFromDisk(): Promise<{ laws: number; precedents: number; books: number; encyclopedias?: number; source: string } | null> {
  if (!isElectronEnv()) return null;
  const w = getWindow();
  if (!w?.electronAPI) return null;
  try {
    const pathInfo = await w.electronAPI.library.getPath();
    logger.debug('[legalLibraryStorage] مسار ملف المكتبة:', pathInfo);
    const result = await w.electronAPI.library.read();
    if (!result.success || !result.data) {
      logger.debug('[legalLibraryStorage] لا توجد بيانات محفوظة على القرص بعد');
      return null;
    }
    const data = result.data as { laws?: LawArticle[]; precedents?: CourtPrecedent[]; books?: LegalBook[]; encyclopedias?: any[]; folders?: BookFolder[] };
    memoryCache = {
      laws: Array.isArray(data.laws) ? data.laws : [],
      precedents: Array.isArray(data.precedents) ? data.precedents : [],
      books: Array.isArray(data.books) ? data.books : [],
      encyclopedias: Array.isArray(data.encyclopedias) ? data.encyclopedias : [],
      folders: Array.isArray(data.folders) ? data.folders : [],
    };
    logger.debug('[legalLibraryStorage] تم استرداد البيانات من القرص:', {
      laws: memoryCache.laws.length,
      precedents: memoryCache.precedents.length,
      books: memoryCache.books.length,
      encyclopedias: memoryCache.encyclopedias.length,
      folders: memoryCache.folders.length,
    });
    // Write back to localStorage for fallback consistency
    safeSetLS(LS_KEYS.laws, memoryCache.laws);
    safeSetLS(LS_KEYS.precedents, memoryCache.precedents);
    safeSetLS(LS_KEYS.books, memoryCache.books);
    safeSetLS(LS_KEYS.encyclopedias, memoryCache.encyclopedias);
    safeSetLS(LS_KEYS.folders, memoryCache.folders);

    return {
      laws: memoryCache.laws.length,
      precedents: memoryCache.precedents.length,
      books: memoryCache.books.length,
      encyclopedias: memoryCache.encyclopedias.length,
      source: 'electron-disk',
    };
  } catch (e) {
    console.error('[legalLibraryStorage] فشل استرداد البيانات من القرص:', e);
    return null;
  }
}

// ===== تشخيص =====

export interface StorageDiagnostics {
  localStorageAvailable: boolean;
  localStorageUsedBytes: number;
  localStorageQuotaBytes: number;
  electronDiskPath: string | null;
  electronDiskWritable: boolean;
  electronDiskError: string | null;
  libraryMeta: LibraryMeta | null;
  lawsInCache: number;
  precedentsInCache: number;
  booksInCache: number;
  foldersInCache: number;
  lawsInLocal: number;
  precedentsInLocal: number;
  booksInLocal: number;
  foldersInLocal: number;
}

export async function getStorageDiagnostics(): Promise<StorageDiagnostics> {
  let lsAvailable = false;
  let lsUsed = 0;
  let lsQuota = 5 * 1024 * 1024;
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    lsAvailable = true;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        const v = localStorage.getItem(k) || '';
        lsUsed += k.length + v.length;
      }
    }
  } catch (e) { lsAvailable = false; }

  let diskPath: string | null = null;
  let diskWritable = false;
  let diskError: string | null = null;
  if (isElectronEnv()) {
    const w = getWindow();
    if (w?.electronAPI) {
      try {
        const pInfo = await w.electronAPI.library.getPath();
        diskPath = pInfo.path || null;
        // اختبار الكتابة
        const testResult = await w.electronAPI.library.write({ test: 'write-test-' + Date.now() });
        if (testResult.success) {
          // نعيد قراءة لتأكيد
          const r = await w.electronAPI.library.read();
          diskWritable = r.success && r.data && r.data.test === testResult.path ? true : r.success;
        } else {
          diskError = testResult.error || 'unknown';
        }
      } catch (e: any) {
        diskError = e?.message || 'unknown';
      }
    }
  }

  return {
    localStorageAvailable: lsAvailable,
    localStorageUsedBytes: lsUsed,
    localStorageQuotaBytes: lsQuota,
    electronDiskPath: diskPath,
    electronDiskWritable: diskWritable,
    electronDiskError: diskError,
    libraryMeta: safeGetLS<LibraryMeta | null>(LS_KEYS.meta, null),
    lawsInCache: memoryCache?.laws.length ?? 0,
    precedentsInCache: memoryCache?.precedents.length ?? 0,
    booksInCache: memoryCache?.books.length ?? 0,
    foldersInCache: memoryCache?.folders.length ?? 0,
    lawsInLocal: safeGetLS<LawArticle[]>(LS_KEYS.laws, []).length,
    precedentsInLocal: safeGetLS<CourtPrecedent[]>(LS_KEYS.precedents, []).length,
    booksInLocal: safeGetLS<LegalBook[]>(LS_KEYS.books, []).length,
    foldersInLocal: safeGetLS<BookFolder[]>(LS_KEYS.folders, []).length,
  };
}

// ===== استيراد / تصدير JSON =====

export interface LibraryBackup {
  exportedAt: string;
  version: number;
  laws: LawArticle[];
  precedents: CourtPrecedent[];
  books: LegalBook[];
  encyclopedias?: any[];
  folders?: BookFolder[];
}

export function exportLibraryToJSON(): LibraryBackup {
  return {
    exportedAt: new Date().toISOString(),
    version: STORAGE_VERSION,
    laws: loadLawsFromLocal(),
    precedents: loadPrecedentsFromLocal(),
    books: loadBooksFromLocal(),
    encyclopedias: loadEncyclopediasFromLocal(),
    folders: loadFoldersFromLocal(),
  };
}

export function importLibraryFromJSON(backup: LibraryBackup): { laws: number; precedents: number; books: number; encyclopedias: number } {
  let counts = { laws: 0, precedents: 0, books: 0, encyclopedias: 0 };
  if (Array.isArray(backup.laws)) {
    saveLawsToLocal(backup.laws);
    counts.laws = backup.laws.length;
  }
  if (Array.isArray(backup.precedents)) {
    savePrecedentsToLocal(backup.precedents);
    counts.precedents = backup.precedents.length;
  }
  if (Array.isArray(backup.books)) {
    saveBooksToLocal(backup.books);
    counts.books = backup.books.length;
  }
  if (Array.isArray(backup.encyclopedias)) {
    saveEncyclopediasToLocal(backup.encyclopedias);
    counts.encyclopedias = backup.encyclopedias.length;
  }
  if (Array.isArray(backup.folders)) {
    saveFoldersToLocal(backup.folders);
  }
  return counts;
}

// ===== مسح البيانات المخصصة =====

export function clearCustomLibraryData(): { laws: number; precedents: number; books: number; encyclopedias: number } {
  let removed = { laws: 0, precedents: 0, books: 0, encyclopedias: 0 };
  const laws = loadLawsFromLocal().filter(l => !l.id.startsWith('custom_law_'));
  removed.laws = loadLawsFromLocal().length - laws.length;
  saveLawsToLocal(laws);

  const precs = loadPrecedentsFromLocal().filter(p => !p.id.startsWith('custom_prec_'));
  removed.precedents = loadPrecedentsFromLocal().length - precs.length;
  savePrecedentsToLocal(precs);

  const books = loadBooksFromLocal().filter(b => !b.id.startsWith('custom_book_'));
  removed.books = loadBooksFromLocal().length - books.length;
  saveBooksToLocal(books);

  const encs = loadEncyclopediasFromLocal().filter(e => !e.id.startsWith('custom_enc_'));
  removed.encyclopedias = loadEncyclopediasFromLocal().length - encs.length;
  saveEncyclopediasToLocal(encs);

  return removed;
}
