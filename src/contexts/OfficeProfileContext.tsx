/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * السياق المركزي لـ OfficeProfile — يضمن التزامن الفوري
 * بين SettingsPanel و QuickActionHeader و LegalLibrary
 * وباقي المكونات التي تعرض بيانات المكتب.
 *
 * يحل مشكلة: كان كل مكوّن يقرأ ويكتب إلى localStorage بشكل مستقل،
 * فما كانت التغييرات تنعكس في كل المكونات تلقائياً.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { OfficeProfile } from '../types';

const LS_KEY = 'lawfirm_office_profile';

/** القيم الافتراضية — تُستخدم عند أول تشغيل أو عند تلف البيانات.
 * ملاحظة: هذه القيم يتم استبدالها تلقائياً عند تسجيل الدخول بـ Firebase Auth
 * عبر FirebaseAuthGate.tsx → initOfficeProfileIfNew()
 */
const DEFAULT_OFFICE_PROFILE: OfficeProfile = {
  officeName: 'مكتب المحاماة',
  managingPartner: '',
  barId: '',
  taxId: '',
  phone: '',
  email: '',
  address: '',
  courtJurisdiction: '',
};

function loadInitial(): OfficeProfile {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.officeName) {
        return { ...DEFAULT_OFFICE_PROFILE, ...parsed };
      }
    }
  } catch (e) { console.warn('Failed to load office profile', e); }
  return DEFAULT_OFFICE_PROFILE;
}

interface OfficeProfileContextValue {
  officeProfile: OfficeProfile;
  setOfficeProfile: (profile: OfficeProfile) => void;
  updateOfficeProfile: (patch: Partial<OfficeProfile>) => void;
  resetOfficeProfile: () => void;
}

const OfficeProfileContext = createContext<OfficeProfileContextValue | null>(null);

export function OfficeProfileProvider({ children }: { children: React.ReactNode }) {
  const [officeProfile, _setOfficeProfile] = useState<OfficeProfile>(loadInitial);

  /**
   * يكتب localStorage ويطلق حدث 'office-profile-updated' ليستخدمه أي
   * مكوّن قد يكون محتفظاً بنسخة محلية احتياطية.
   * الـ context نفسه سيتحدث تلقائياً عبر _setOfficeProfile.
   */
  const setOfficeProfile = useCallback((profile: OfficeProfile) => {
    _setOfficeProfile(profile);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(profile));
    } catch (e) { console.warn('Failed to save office profile', e); }
    // إبلاغ أي مستمعين قديمين (مثل LegalLibrary و QuickActionHeader)
    try {
      window.dispatchEvent(new CustomEvent('office-profile-updated', { detail: profile }));
    } catch (e) { console.warn('Failed to save office profile', e);
      // browsers قديمة قد لا تدعمها — لا تهم
    }
  }, []);

  const updateOfficeProfile = useCallback((patch: Partial<OfficeProfile>) => {
    setOfficeProfile({ ...officeProfile, ...patch });
  }, [officeProfile, setOfficeProfile]);

  const resetOfficeProfile = useCallback(() => {
    setOfficeProfile(DEFAULT_OFFICE_PROFILE);
  }, [setOfficeProfile]);

  /**
   * مزامنة عبر الـ tabs/windows الأخرى:
   * لو وسم الـ localStorage تغيّر في tab آخѡ نُحدّث الحالة تلقائياً.
   */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.officeName) {
          _setOfficeProfile(parsed);
        }
      } catch (e) { console.warn('Failed to clear office profile', e); }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as OfficeProfile | undefined;
      if (detail && detail.officeName) {
        _setOfficeProfile(detail);
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('office-profile-updated', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('office-profile-updated', onCustom as EventListener);
    };
  }, []);

  const value = useMemo(
    () => ({ officeProfile, setOfficeProfile, updateOfficeProfile, resetOfficeProfile }),
    [officeProfile, setOfficeProfile, updateOfficeProfile, resetOfficeProfile],
  );

  return (
    <OfficeProfileContext.Provider value={value}>
      {children}
    </OfficeProfileContext.Provider>
  );
}

export function useOfficeProfile(): OfficeProfileContextValue {
  const ctx = useContext(OfficeProfileContext);
  if (!ctx) throw new Error('useOfficeProfile must be used within OfficeProfileProvider');
  return ctx;
}

/** نسخة القراءة فقط — عديمة الأخطاء لو استدعيت خارج الـ Provider. */
export function useOfficeProfileSafe(): OfficeProfile {
  const ctx = useContext(OfficeProfileContext);
  return ctx?.officeProfile ?? DEFAULT_OFFICE_PROFILE;
}
