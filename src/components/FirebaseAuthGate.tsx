/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FirebaseAuthGate — بوابة المصادقة الجديدة
 * تستخدم Firebase Auth بدلاً من النظام القديم
 * تتعامل مع: Loading → Login → Subscription → App | Admin
 *
 * v2.9.11:
 * - يُمرِّر بيانات المستخدم (displayName/email) لـ window.__firebaseUser
 * - يُهيئ officeProfile تلقائياً عند أول دخول مستخدم جديد
 */

import React, { useState, useEffect } from 'react';
import { getFirebase } from '../firebaseClient';
import { useSubscription } from '../hooks/useSubscription';
import FirebaseLoginScreen from './FirebaseLoginScreen';
import SubscriptionPage from './SubscriptionPage';
import AdminPanel, { ADMIN_UID } from './AdminPanel';
import App from '../App';
import { Shield } from 'lucide-react';
import type { User } from 'firebase/auth';

type GateState = 'loading' | 'unauthenticated' | 'checking_sub' | 'subscription_expired' | 'ready' | 'admin';

// ── مفاتيح localStorage ────────────────────────────────────────────────────
const LS_PROFILE = 'lawfirm_office_profile';
const LS_USER_NAME = 'lawfirm_user_name';

/**
 * يُهيئ OfficeProfile تلقائياً من بيانات Firebase Auth عند أول دخول.
 * لو المحامي عنده بروفايل مضبوط من قبل → لا يمسّه.
 */
function initOfficeProfileIfNew(user: User) {
  try {
    const saved = localStorage.getItem(LS_PROFILE);
    const displayName = user.displayName || user.email?.split('@')[0] || 'المحامي';
    const email = user.email || '';

    // حفظ الاسم في lawfirm_user_name
    localStorage.setItem(LS_USER_NAME, displayName);

    if (!saved) {
      // مستخدم جديد تماماً — أنشئ له بروفايل بدون اسم محدد (هو سيكمله لاحقاً)
      const freshProfile = {
        officeName: `مكتب ${displayName} للمحاماة والاستشارات القانونية`,
        managingPartner: displayName,
        barId: '',
        taxId: '',
        phone: '',
        email,
        address: '',
        courtJurisdiction: '',
      };
      localStorage.setItem(LS_PROFILE, JSON.stringify(freshProfile));
      return;
    }

    // بروفايل موجود — فقط نُحدِّث الاسم لو كان الافتراضي العام
    const parsed = JSON.parse(saved);
    const isGenericName =
      !parsed.managingPartner ||
      parsed.managingPartner === 'المستشار العام للمكتب' ||
      parsed.managingPartner === 'الأستاذ/ أحمد منصور' ||
      parsed.managingPartner === 'مكتب المستشار / أحمد منصور المحامي';

    if (isGenericName) {
      parsed.managingPartner = displayName;
      if (!parsed.email && email) parsed.email = email;
      localStorage.setItem(LS_PROFILE, JSON.stringify(parsed));
    }
  } catch (e) {
    console.warn('[FirebaseAuthGate] Failed to init office profile', e);
  }
}

export default function FirebaseAuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [gateState, setGateState] = useState<GateState>('loading');
  // v2.18: شاشة الدخول لا تظهر للزوار — تُفتح فقط عند طلب الدخول للمنصة
  const [showLogin, setShowLogin] = useState(false);

  const subscription = useSubscription(user?.uid ?? null);

  const isAdmin = user?.uid === ADMIN_UID;

  // ── استماع لحالة المصادقة ────────────────────────────────────────
  useEffect(() => {
    let unsub: any = null;
    (async () => {
      try {
        const f = await getFirebase();
        if (f.disabled) {
          // Firebase disabled — no auth listeners
          setUser(null);
          setGateState('unauthenticated');
          return;
        }
        const { onAuthStateChanged } = await import('firebase/auth');
        unsub = onAuthStateChanged(f.auth, (fbUser: any) => {
          setUser(fbUser);
          if (!fbUser) {
            // مسح بيانات المستخدم من window عند الخروج
            (window as any).__firebaseUser = null;
            setGateState('unauthenticated');
          } else {
            // ── تمرير بيانات المستخدم لـ App.tsx عبر window ──────────────
            (window as any).__firebaseUser = {
              uid: fbUser.uid,
              displayName: fbUser.displayName,
              email: fbUser.email,
              photoURL: fbUser.photoURL,
            };
            // تهيئة البروفايل تلقائياً لو مستخدم جديد
            try { initOfficeProfileIfNew(fbUser); } catch (e) { /* ignore */ }
            setGateState('checking_sub');
          }
        });
      } catch (e) {
        console.warn('[FirebaseAuthGate] auth init failed:', e);
        setUser(null);
        setGateState('unauthenticated');
      }
    })();

    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  // ── تحديث الحالة بعد تحميل بيانات الاشتراك ─────────────────────
  useEffect(() => {
    if (gateState !== 'checking_sub') return;
    if (subscription.status === 'loading') return;

    // المدير يدخل مباشرة بدون قيود الاشتراك
    if (isAdmin) {
      setGateState('ready');
      return;
    }

    if (subscription.isAllowed) {
      setGateState('ready');
    } else {
      setGateState('subscription_expired');
    }
  }, [subscription.status, subscription.isAllowed, gateState, isAdmin]);

  // ── تسجيل الخروج ────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      const f = await getFirebase();
      if (!f.disabled) {
        const { signOut } = await import('firebase/auth');
        await signOut(f.auth);
      }
    } catch (e) {
      console.warn('[handleLogout] signOut failed:', e);
    }
    (window as any).__firebaseUser = null;
    setGateState('unauthenticated');
  };

  // ── شاشة التحميل ────────────────────────────────────────────────
  if (gateState === 'loading' || gateState === 'checking_sub') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-bold">
            {gateState === 'checking_sub' ? 'جاري التحقق من الاشتراك...' : 'جاري التحميل...'}
          </p>
        </div>
      </div>
    );
  }

  // ── شاشة تسجيل الدخول ───────────────────────────────────────────
  // v2.18: الموقع عام — الزوار يرون InfoCenter مباشرة بدون تسجيل دخول.
  // شاشة الدخول تُعرض فقط عند طلب المستخدم الدخول إلى المنصة (زر «دخول التطبيق»).
  if (gateState === 'unauthenticated') {
    if (showLogin) {
      return (
        <FirebaseLoginScreen
          onSuccess={() => {
            setShowLogin(false);
            setGateState('checking_sub');
          }}
        />
      );
    }
    return <App userUid={undefined} onRequestLogin={() => setShowLogin(true)} />;
  }

  // ── صفحة الاشتراك (انتهت التجربة) ────────────────────────────────
  if (gateState === 'subscription_expired') {
    return (
      <SubscriptionPage
        userEmail={user?.email || undefined}
        userName={user?.displayName || undefined}
        onLogout={handleLogout}
      />
    );
  }

  // ── لوحة تحكم المدير ────────────────────────────────────────────
  if (gateState === 'admin') {
    return (
      <div>
        {/* زر العودة للتطبيق */}
        <div className="fixed top-3 left-3 z-[9999]">
          <button
            onClick={() => setGateState('ready')}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs text-slate-300 transition-colors"
          >
            ← العودة للتطبيق
          </button>
        </div>
        <AdminPanel adminUid={user!.uid} />
      </div>
    );
  }

  // ── التطبيق الرئيسي ─────────────────────────────────────────────
  return (
    <div className="relative">
      {/* شريط التجربة المجانية */}
      {!isAdmin && subscription.status === 'trial' && subscription.trialDaysLeft <= 3 && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-600 to-orange-600 text-white text-center py-2 text-xs font-bold shadow-lg" dir="rtl">
          ⏰ باقي <strong>{subscription.trialDaysLeft} {subscription.trialDaysLeft === 1 ? 'يوم' : 'أيام'}</strong> من تجربتك المجانية —
          <button onClick={() => setGateState('subscription_expired')} className="underline mr-2 cursor-pointer hover:no-underline">
            اشترك الآن بـ 50 جنيه/شهر
          </button>
        </div>
      )}

      {/* زر لوحة تحكم المدير — يظهر فقط للمدير */}
      {isAdmin && (
        <button
          onClick={() => setGateState('admin')}
          title="لوحة تحكم المدير"
          className="fixed bottom-5 left-5 z-[9999] flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-900/40 border border-emerald-600 transition-all hover:scale-105 text-sm font-medium"
        >
          <Shield className="w-4 h-4" />
          لوحة التحكم
        </button>
      )}

      <App userUid={user?.uid} onRequestLogin={() => setShowLogin(true)} />
    </div>
  );
}
