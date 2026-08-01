/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useProfile.ts — جلب وتعديل وحفظ LawyerProfile من Firestore.
 *
 * v2.9.10: مدخل جديد للـ multi-tenant profile management.
 * كل محامي له profile منفصل محفوظ في users/{userId}/profile/data.
 */

import { useState, useEffect, useCallback } from 'react';
import { getFirebase } from '../firebaseClient';
import { LawyerProfile } from '../types';
import { logger } from '../utils/logger';

const EMPTY_PROFILE: Omit<LawyerProfile, 'uid' | 'email' | 'createdAt' | 'updatedAt'> = {
  displayName: '',
  fullName: '',
  phone: '',
  nationalId: '',
  barRegistrationNumber: '',
  syndicate: '',
  specialty: [],
  yearsOfExperience: 0,
  bio: '',
  officeAddress: '',
  // v2.9.10: استخدم null بدل undefined — Firestore ما يقبلش undefined
  photoURL: null,
};

export function useProfile(uid: string | null) {
  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── جلب الـ profile ──────────────────────────────────────────────
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const f = await getFirebase();
        if (f.disabled) {
          setProfile(null);
          setError(null);
          setLoading(false);
          return;
        }
        const { doc, getDoc } = await import('firebase/firestore');
        const profileRef = doc(f.db, 'users', uid, 'profile', 'data');
        const snap = await getDoc(profileRef);

        if (snap.exists()) {
          setProfile(snap.data() as LawyerProfile);
        } else {
          // أول مرة — profile فاضي
          setProfile(null);
        }
        setError(null);
      } catch (err: any) {
        logger.error('[useProfile] fetch error:', err);
        setError(err.message || 'فشل تحميل البيانات الشخصية');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid]);

  // ── حفظ الـ profile ──────────────────────────────────────────────
  const saveProfile = useCallback(
    async (updates: Partial<LawyerProfile>): Promise<{ success: boolean; error?: string }> => {
      if (!uid) {
        return { success: false, error: 'لم يتم تسجيل الدخول' };
      }

      try {
        setSaving(true);
        setError(null);

        const f = await getFirebase();
        if (f.disabled) return { success: false, error: 'Firebase disabled' };
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const profileRef = doc(f.db, 'users', uid, 'profile', 'data');
        const currentData = profile || ({} as LawyerProfile);

        const newData: LawyerProfile = {
          ...EMPTY_PROFILE,
          ...currentData,
          ...updates,
          uid,
          updatedAt: new Date().toISOString(),
          createdAt: currentData.createdAt || new Date().toISOString(),
        };

        // v2.9.10 FIX: Firestore ما يقبلش undefined — نحذف الـ fields الفاضية
        const cleanData: Record<string, any> = {};
        for (const [key, value] of Object.entries(newData)) {
          if (value !== undefined) {
            cleanData[key] = value;
          }
        }

        await setDoc(profileRef, {
          ...cleanData,
          createdAt: currentData.createdAt
            ? currentData.createdAt
            : serverTimestamp(),
        });

        setProfile(newData);
        logger.info('[useProfile] saved successfully');
        return { success: true };
      } catch (err: any) {
        logger.error('[useProfile] save error:', err);
        const msg = err.message || 'فشل حفظ البيانات';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setSaving(false);
      }
    },
    [uid, profile]
  );

  // ── حذف الـ profile ──────────────────────────────────────────────
  const deleteProfile = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!uid) return { success: false, error: 'لم يتم تسجيل الدخول' };
    try {
      setSaving(true);
      const f = await getFirebase();
      if (f.disabled) return { success: false, error: 'Firebase disabled' };
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const profileRef = doc(f.db, 'users', uid, 'profile', 'data');
      await setDoc(profileRef, { deleted: true, deletedAt: serverTimestamp() }, { merge: true });
      setProfile(null);
      return { success: true };
    } catch (err: any) {
      logger.error('[useProfile] delete error:', err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, [uid]);

  return { profile, loading, saving, error, saveProfile, deleteProfile };
}

export { EMPTY_PROFILE };
