/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * entityHandler.ts — Unified entity mutation helper (v2.9.6).
 *
 * الـ pattern الموحد لكل entity handler (add/update/delete):
 *   1. تحديث React state (functional form لتجنب stale closure)
 *   2. mirror للتغيير في localStorage (اختياري — `useEntityPersistence` يغطي fallback)
 *   3. mirror للتغيير في IndexedDB (المصدر الأساسي للـ persistence)
 *
 * استخدمه للحالات البسيطة (single-item add/update/delete).
 * للحالات المعقدة (cascade delete, archive/restore, multi-entity mutations)
 * ابقَ على الـ pattern اليدوي لتفادي الإفراط في الـ abstraction.
 *
 * ⚠️ لا تستدعي state setters من داخل الـ updater — React قد يعيد استدعاءها
 * في StrictMode مما يسبب side effects مكررة. الـ helper يفصل الـ side effects
 * عن الـ state update.
 */

import { Dispatch, SetStateAction } from 'react';
import { putIntoStore, removeFromStore } from './indexedDBHelper';
import { logger } from './logger';

export type EntityAction = 'add' | 'update' | 'delete';

export interface HandleEntityOptions {
  /**
   * سياق للـ logs (e.g. 'add case' / 'update transaction'). الافتراضي: اسم الـ action.
   */
  logContext?: string;
  /**
   * اسم حقل المعرّف في الـ entity. الافتراضي: 'id'. يُستخدم في update و delete.
   */
  idField?: string;
  /**
   * تخطّي الكتابة في localStorage. الافتراضي: false.
   * استخدم true إذا كنت متأكداً إن `useEntityPersistence` يغطي هذا الـ entity.
   */
  skipLocalStorage?: boolean;
  /**
   * تخطّي الكتابة في IndexedDB. الافتراضي: false.
   * نادراً ما يُستخدم — فقط في حالة cascade حيث الـ parent حذف الأطفال.
   */
  skipIndexedDB?: boolean;
}

/**
 * Unified entity mutation. يحدّث state + localStorage + IndexedDB بشكل consistent.
 *
 * @param setData React state setter (الذي يُرجَع من useState). functional form.
 * @param action 'add' | 'update' | 'delete'
 * @param item العنصر (للـ add/update) أو عنصر فيه الـ id فقط (للـ delete).
 * @param idbStoreName اسم الـ store في IndexedDB (e.g. 'cases' / 'clients' / 'transactions')
 * @param localStorageKey مفتاح localStorage (e.g. 'lawfirm_cases'). اتركه فارغاً لتخطّي الكتابة.
 * @param options خيارات متقدمة.
 */
export async function handleEntityAction<T extends Record<string, any>>(
  setData: Dispatch<SetStateAction<T[]>>,
  action: EntityAction,
  item: T,
  idbStoreName: string,
  localStorageKey?: string,
  options: HandleEntityOptions = {}
): Promise<void> {
  const {
    logContext = action,
    idField = 'id',
    skipLocalStorage = false,
    skipIndexedDB = false,
  } = options;

  // ─── 1. تحديث state (functional form) ─────────────────────────────────────
  setData(prev => {
    let next: T[];
    if (action === 'add') {
      next = [item, ...prev];
    } else if (action === 'update') {
      next = prev.map(x => (x[idField] === item[idField] ? item : x));
    } else {
      // delete
      next = prev.filter(x => x[idField] !== item[idField]);
    }

    // ─── 2. mirror في localStorage (اختياري) ───────────────────────────────
    if (!skipLocalStorage && localStorageKey) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(next));
      } catch (e) {
        logger.warn(
          `[handleEntityAction:${logContext}] localStorage write failed for "${localStorageKey}":`,
          e
        );
      }
    }

    return next;
  });

  // ─── 3. mirror في IndexedDB (async) ─────────────────────────────────────
  if (skipIndexedDB) return;

  try {
    if (action === 'delete') {
      await removeFromStore(idbStoreName, String(item[idField]));
    } else {
      await putIntoStore(idbStoreName, item);
    }
  } catch (e) {
    logger.error(
      `[handleEntityAction:${logContext}] IndexedDB sync failed for "${idbStoreName}":`,
      e
    );
  }
}
