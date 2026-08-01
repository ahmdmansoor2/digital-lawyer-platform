/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useEntityPersistence.ts — يحفظ state تلقائياً في localStorage + IndexedDB.
 *
 * v2.8.9: استخرج من App.tsx عشان نقلل 12 useEffect مكررة.
 *
 * الاستخدام:
 *   useEntityPersistence('lawfirm_sessions', 'sessions', sessions, isDBLoading);
 *
 * الـ hook:
 *  - ينتظر لحد `isDBLoading === false` (تجنب race condition مع restore)
 *  - يكتب في localStorage (fallback سريع + safety net)
 *  - يكتب في IndexedDB (المصدر الأساسي)
 *  - يـ log أي خطأ بدون throw
 */

import { useEffect } from 'react';
import { putMultipleIntoStore } from '../utils/indexedDBHelper';
import { logger } from '../utils/logger';

export function useEntityPersistence<T>(
  localStorageKey: string,
  idbStoreName: string,
  data: T,
  isDBLoading: boolean
): void {
  useEffect(() => {
    if (isDBLoading) return;

    // localStorage: try/catch in case of quota errors
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(data));
    } catch (e) {
      logger.warn(`[useEntityPersistence] Failed to save ${localStorageKey} to localStorage`, e);
    }

    // IndexedDB: async, .catch to handle errors
    putMultipleIntoStore(idbStoreName, data as any).catch(e =>
      logger.error(`[useEntityPersistence] IDB ${idbStoreName} sync failed:`, e)
    );
  }, [localStorageKey, idbStoreName, data, isDBLoading]);
}
