/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSubscription — نظام الاشتراك المجاني بالكامل
 * - المنصة مجانية 100% لكل المحامين بدون رسوم أو شروط
 * - يعيد دائماً حالة: active + isAllowed: true
 */

import { useState, useEffect } from 'react';
import { getFirebase } from '../firebaseClient';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'loading';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
  isAllowed: boolean;
}

export function useSubscription(uid: string | null): SubscriptionInfo {
  const [info, setInfo] = useState<SubscriptionInfo>({
    status: 'active',
    trialDaysLeft: 3650,
    trialEndsAt: null,
    paidUntil: new Date('2099-12-31'),
    isAllowed: true,
  });

  useEffect(() => {
    if (!uid) {
      setInfo({
        status: 'active',
        trialDaysLeft: 3650,
        trialEndsAt: null,
        paidUntil: new Date('2099-12-31'),
        isAllowed: true,
      });
      return;
    }

    const syncSubscriptionRecord = async () => {
      try {
        const f = await getFirebase();
        if (f.disabled) return;
        const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const subRef = doc(f.db, 'subscriptions', uid);
        const snap = await getDoc(subRef);
        if (!snap.exists()) {
          await setDoc(subRef, {
            status: 'active',
            plan: 'free_unlimited',
            isFreeForever: true,
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn('[useSubscription] Free sync info:', err);
      }
    };

    syncSubscriptionRecord();
  }, [uid]);

  return info;
}
