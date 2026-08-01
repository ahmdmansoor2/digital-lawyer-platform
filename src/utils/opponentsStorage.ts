/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * طبقة حفظ بيانات الخصوم (Opponents).
 *
 * الترتيب: 1) ملف القرص (Electron IPC) - مضمون 100%
 *         2) localStorage - fallback للمتصفح وللحالات اللي Electron مش متاح
 *         3) mock - البيانات الافتراضية عند أول تشغيل
 *
 * v2.9.11: Scoped dynamically by Firebase User UID.
 */

import { Opponent } from '../types';
import { logger } from './logger';

// نوع النافذة مع electronAPI
interface ElectronAPIWindow {
  electronAPI?: {
    opponents?: {
      read: () => Promise<{ success: boolean; data?: any; path?: string; error?: string }>;
      write: (data: any) => Promise<{ success: boolean; path?: string; size?: number; error?: string }>;
      getPath: () => Promise<{ success: boolean; path?: string; error?: string }>;
    };
    library?: any;
  };
}

function getWindow(): (Window & ElectronAPIWindow) | null {
  if (typeof window === 'undefined') return null;
  return window as unknown as (Window & ElectronAPIWindow);
}

function isElectronEnv(): boolean {
  const w = getWindow();
  return !!(w?.electronAPI?.opponents);
}

// ===== الديناميكية وعزل المستخدمين =====
function getLsKey(): string {
  const uid = (window as any).__firebaseUser?.uid;
  return uid ? `lawfirm_${uid}_opponents_v1` : 'opponents_v1';
}

function getDeletedIdsKey(): string {
  const uid = (window as any).__firebaseUser?.uid;
  return uid ? `lawfirm_${uid}_opponents_deleted_ids_v1` : 'opponents_deleted_ids_v1';
}

// ===== الذاكرة المؤقتة والمعزولة =====
let memoryCache: Opponent[] | null = null;
let cachedUid: string | null = null;

function getMemoryCache(): Opponent[] | null {
  const uid = (window as any).__firebaseUser?.uid || null;
  if (cachedUid !== uid) {
    memoryCache = null;
    cachedUid = uid;
  }
  return memoryCache;
}

function setMemoryCache(opponents: Opponent[] | null) {
  memoryCache = opponents;
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
  if (!w?.electronAPI?.opponents) return;
  try {
    const result = await w.electronAPI.opponents.write(cache);
    if (!result.success) {
      console.error('[opponentsStorage] فشل الكتابة على القرص:', result.error);
    }
  } catch (e) {
    console.error('[opponentsStorage] فشل الكتابة على القرص:', e);
  }
}

function safeGetLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[opponentsStorage] فشل قراءة ${key}:`, e);
    return fallback;
  }
}

function safeSetLS(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e: any) {
    console.error(`[opponentsStorage] فشل كتابة ${key}:`, e?.name, e?.message);
    return false;
  }
}

export function loadOpponentsFromLocal(): Opponent[] {
  const cache = getMemoryCache();
  if (cache) return cache;
  return safeGetLS<Opponent[]>(getLsKey(), []);
}

export function saveOpponentsToLocal(opponents: Opponent[]): boolean {
  setMemoryCache(opponents);
  const ok = safeSetLS(getLsKey(), opponents);
  scheduleDiskWrite();
  return ok;
}

export async function hydrateOpponentsFromDisk(): Promise<{ count: number; source: string } | null> {
  if (!isElectronEnv()) return null;
  const w = getWindow();
  if (!w?.electronAPI?.opponents) return null;
  try {
    const result = await w.electronAPI.opponents.read();
    if (!result.success || !result.data) {
      logger.debug('[opponentsStorage] لا توجد بيانات خصوم محفوظة على القرص');
      return null;
    }
    const data = Array.isArray(result.data) ? result.data : [];
    setMemoryCache(data);
    logger.debug(`[opponentsStorage] ✓ تم تحميل ${data.length} خصم من القرص`);
    return { count: data.length, source: 'electron-disk' };
  } catch (e) {
    console.error('[opponentsStorage] فشل استرداد البيانات من القرص:', e);
    return null;
  }
}

export interface OpponentsStorageDiagnostics {
  localStorageAvailable: boolean;
  electronDiskPath: string | null;
  electronDiskWritable: boolean;
  inMemoryCount: number;
  inLocalStorageCount: number;
}

export async function getOpponentsStorageDiagnostics(): Promise<OpponentsStorageDiagnostics> {
  let lsAvailable = false;
  try {
    const testKey = '__test_opponents__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    lsAvailable = true;
  } catch (e) { lsAvailable = false; }

  let diskPath: string | null = null;
  let diskWritable = false;
  if (isElectronEnv()) {
    const w = getWindow();
    if (w?.electronAPI?.opponents) {
      try {
        const pInfo = await w.electronAPI.opponents.getPath();
        diskPath = pInfo.path || null;
        const writeResult = await w.electronAPI.opponents.write(getMemoryCache() || []);
        diskWritable = writeResult.success;
      } catch (e) { diskWritable = false; }
    }
  }

  return {
    localStorageAvailable: lsAvailable,
    electronDiskPath: diskPath,
    electronDiskWritable: diskWritable,
    inMemoryCount: getMemoryCache()?.length ?? 0,
    inLocalStorageCount: safeGetLS<Opponent[]>(getLsKey(), []).length,
  };
}

export function generateOpponentId(): string {
  return 'opponent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export function loadDeletedOpponentIds(): string[] {
  return safeGetLS<string[]>(getDeletedIdsKey(), []);
}

export function saveDeletedOpponentId(id: string): void {
  const ids = loadDeletedOpponentIds();
  if (!ids.includes(id)) {
    ids.push(id);
    safeSetLS(getDeletedIdsKey(), ids);
  }
}

export function clearDeletedOpponentIds(): void {
  safeSetLS(getDeletedIdsKey(), []);
}

export function clearCustomOpponents(): { removed: number } {
  const current = loadOpponentsFromLocal();
  const filtered = current.filter(o => o.notes === 'mock'); // check if any source exists
  const removed = current.length - filtered.length;
  saveOpponentsToLocal(filtered);
  return { removed };
}
