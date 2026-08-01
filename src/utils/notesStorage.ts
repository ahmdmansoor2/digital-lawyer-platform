/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * طبقة حفظ الملاحظات (Notes) — شبيه Google Keep.
 *
 * الترتيب: 1) ملف القرص (Electron IPC) - مضمون 100%
 *         2) localStorage - fallback
 *         3) mock - البيانات الافتراضية
 *
 * v2.9.11: Scoped dynamically by Firebase User UID.
 */

import { Note } from '../types_notes';
import { logger } from './logger';

interface ElectronAPIWindow {
  electronAPI?: {
    notes?: {
      read: () => Promise<{ success: boolean; data?: any; path?: string; error?: string }>;
      write: (data: any) => Promise<{ success: boolean; path?: string; size?: number; error?: string }>;
      getPath: () => Promise<{ success: boolean; path?: string; error?: string }>;
    };
  };
}

function getWindow(): (Window & ElectronAPIWindow) | null {
  if (typeof window === 'undefined') return null;
  return window as unknown as (Window & ElectronAPIWindow);
}

function isElectronEnv(): boolean {
  const w = getWindow();
  return !!(w?.electronAPI?.notes);
}

// ===== الديناميكية وعزل المستخدمين =====
function getLsKey(): string {
  const uid = (window as any).__firebaseUser?.uid;
  return uid ? `lawfirm_${uid}_notes_v1` : 'notes_v1';
}

function getDeletedIdsKey(): string {
  const uid = (window as any).__firebaseUser?.uid;
  return uid ? `lawfirm_${uid}_notes_deleted_ids_v1` : 'notes_deleted_ids_v1';
}

// ===== الذاكرة المؤقتة والمعزولة =====
let memoryCache: Note[] | null = null;
let cachedUid: string | null = null;

function getMemoryCache(): Note[] | null {
  const uid = (window as any).__firebaseUser?.uid || null;
  if (cachedUid !== uid) {
    memoryCache = null;
    cachedUid = uid;
  }
  return memoryCache;
}

function setMemoryCache(notes: Note[] | null) {
  memoryCache = notes;
  cachedUid = (window as any).__firebaseUser?.uid || null;
}

const WRITE_DEBOUNCE_MS = 300;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDiskWrite(): void {
  const cache = getMemoryCache();
  if (!isElectronEnv() || cache === null) return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    flushToDisk();
  }, WRITE_DEBOUNCE_MS);
}

async function flushToDisk(): Promise<void> {
  const cache = getMemoryCache();
  if (!isElectronEnv() || cache === null) return;
  const w = getWindow();
  if (!w?.electronAPI?.notes) return;
  try {
    const result = await w.electronAPI.notes.write(cache);
    if (!result.success) console.error('[notesStorage] فشل الكتابة على القرص:', result.error);
  } catch (e) {
    console.error('[notesStorage] فشل الكتابة على القرص:', e);
  }
}

function safeGetLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[notesStorage] فشل قراءة ${key}:`, e);
    return fallback;
  }
}

function safeSetLS(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e: any) {
    console.error(`[notesStorage] فشل كتابة ${key}:`, e?.name, e?.message);
    return false;
  }
}

export function loadNotesFromLocal(): Note[] {
  const cache = getMemoryCache();
  if (cache) return cache;
  return safeGetLS<Note[]>(getLsKey(), []);
}

export function saveNotesToLocal(notes: Note[]): boolean {
  setMemoryCache(notes);
  const ok = safeSetLS(getLsKey(), notes);
  scheduleDiskWrite();
  return ok;
}

export async function hydrateNotesFromDisk(): Promise<{ count: number; source: string } | null> {
  if (!isElectronEnv()) return null;
  const w = getWindow();
  if (!w?.electronAPI?.notes) return null;
  try {
    const result = await w.electronAPI.notes.read();
    if (!result.success || !result.data) {
      logger.debug('[notesStorage] لا توجد ملاحظات محفوظة على القرص');
      return null;
    }
    const data = Array.isArray(result.data) ? result.data : [];
    setMemoryCache(data);
    logger.debug(`[notesStorage] ✅ تم استرداد ${data.length} ملاحظة من القرص`);
    return { count: data.length, source: 'electron-disk' };
  } catch (e) {
    console.error('[notesStorage] فشل استرداد البيانات من القرص:', e);
    return null;
  }
}

export interface NotesStorageDiagnostics {
  localStorageAvailable: boolean;
  electronDiskPath: string | null;
  electronDiskWritable: boolean;
  inMemoryCount: number;
  inLocalStorageCount: number;
}

export async function getNotesStorageDiagnostics(): Promise<NotesStorageDiagnostics> {
  let lsAvailable = false;
  try {
    const testKey = '__test_notes__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    lsAvailable = true;
  } catch (e) { lsAvailable = false; }

  let diskPath: string | null = null;
  let diskWritable = false;
  if (isElectronEnv()) {
    const w = getWindow();
    if (w?.electronAPI?.notes) {
      try {
        const pInfo = await w.electronAPI.notes.getPath();
        diskPath = pInfo.path || null;
        const writeResult = await w.electronAPI.notes.write(getMemoryCache() || []);
        diskWritable = writeResult.success;
      } catch (e) { diskWritable = false; }
    }
  }

  return {
    localStorageAvailable: lsAvailable,
    electronDiskPath: diskPath,
    electronDiskWritable: diskWritable,
    inMemoryCount: getMemoryCache()?.length ?? 0,
    inLocalStorageCount: safeGetLS<Note[]>(getLsKey(), []).length,
  };
}

export function generateNoteId(): string {
  return 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export function generateChecklistItemId(): string {
  return 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export function loadDeletedNoteIds(): string[] {
  return safeGetLS<string[]>(getDeletedIdsKey(), []);
}

export function saveDeletedNoteId(id: string): void {
  const ids = loadDeletedNoteIds();
  if (!ids.includes(id)) {
    ids.push(id);
    safeSetLS(getDeletedIdsKey(), ids);
  }
}

export function clearDeletedNoteIds(): void {
  safeSetLS(getDeletedIdsKey(), []);
}

export function clearCustomNotes(): { removed: number } {
  const current = loadNotesFromLocal();
  const filtered = current.filter(n => n.source === 'mock');
  const removed = current.length - filtered.length;
  saveNotesToLocal(filtered);
  return { removed };
}