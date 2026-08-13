/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FirebaseLoginScreen — شاشة تسجيل الدخول
 * تدعم: Email/Password + Google + رقم الهاتف (OTP)
 */

import React, { useState, useRef, useEffect } from 'react';
import PublicThemeToggle from './PublicThemeToggle';
import { getFirebase } from '../firebaseClient';
import {
  Scale,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Shield,
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'phone';

interface FirebaseLoginScreenProps {
  onSuccess?: () => void;
}

// ── Types (lazy-loaded so we avoid importing firebase/auth at module level) ──
type ConfirmationResultType = { confirm: (otp: string) => Promise<{ user: { uid: string; phoneNumber: string | null } }> };
type RecaptchaVerifierType = any;

export default function FirebaseLoginScreen({ onSuccess }: FirebaseLoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmationResultType | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifierType>(null);

  // ── معالجة redirect بعد تسجيل الدخول ────────────────────────────
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (!redirect || redirect === '/') return;
      try {
        const f = await getFirebase();
        if (f.disabled) return;
        const { onAuthStateChanged } = await import('firebase/auth');
        const unsub = onAuthStateChanged(f.auth, (user: any) => {
          if (user) { window.location.href = redirect; }
        });
        return () => unsub();
      } catch (e) {
        console.warn('[FirebaseLoginScreen] redirect handler failed:', e);
      }
    })();
  }, []);

  const clearError = () => setError('');

  // ── إنشاء سجل المستخدم في Firestore ─────────────────────────────
  const initUserProfile = async (uid: string, displayName: string, emailVal: string) => {
    try {
      const f = await getFirebase();
      if (f.disabled) return;
      const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(f.db, 'users', uid, 'profile', 'info');
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          displayName,
          email: emailVal,
          officeName: displayName + ' للمحاماة',
          createdAt: serverTimestamp(),
          uid,
        });
      }
    } catch (e) {
      console.warn('[initUserProfile] failed:', e);
    }
  };

  // ── تسجيل الدخول بالإيميل ───────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    clearError();
    try {
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(f.auth, email, password);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = (err as { code?: string })?.code;
      if (msg === 'auth/invalid-credential' || msg === 'auth/wrong-password') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (msg === 'auth/user-not-found') {
        setError('لا يوجد حساب بهذا البريد الإلكتروني');
      } else if (msg === 'auth/too-many-requests') {
        setError('تم حجب الحساب مؤقتاً بسبب كثرة المحاولات. حاول لاحقاً.');
      } else {
        setError('خطأ في تسجيل الدخول. تأكد من بياناتك.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── إنشاء حساب جديد ─────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setLoading(true);
    clearError();
    try {
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const cred = await createUserWithEmailAndPassword(f.auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await initUserProfile(cred.user.uid, name, email);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = (err as { code?: string })?.code;
      if (msg === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول بدلاً من ذلك.');
      } else if (msg === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.');
      } else {
        setError('حدث خطأ في إنشاء الحساب. حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── فحص نتيجة Google Redirect عند التحميل ───────────────────────
  React.useEffect(() => {
    (async () => {
      try {
        const f = await getFirebase();
        if (f.disabled) return;
        const { getRedirectResult } = await import('firebase/auth');
        getRedirectResult(f.auth).then(async (result: any) => {
          if (result && result.user) {
            await initUserProfile(result.user.uid, result.user.displayName || 'محامي', result.user.email || '');
            onSuccess?.();
          }
        }).catch((err: any) => {
          console.error('[GoogleRedirectResultError]', err);
        });
      } catch (e) {
        console.warn('[getRedirectResult] failed:', e);
      }
    })();
  }, []);

  // ── تسجيل الدخول بـ Google ───────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true);
    clearError();
    let nativeFallbackError = false;
    try {
      const electronAPI = (window as any).electronAPI;

      // ─── Electron: نافذة OAuth أصلية ────
      if (electronAPI?.google?.login) {
        try {
          const { signInWithCredential, GoogleAuthProvider } = await import('firebase/auth');
          const f = await getFirebase();
          if (f.disabled) throw new Error('Firebase disabled');
          const { idToken } = await electronAPI.google.login();
          if (!idToken) throw new Error('لم يتم الحصول على رمز المصادقة');
          const credential = GoogleAuthProvider.credential(idToken);
          const result = await signInWithCredential(f.auth, credential);
          await initUserProfile(result.user.uid, result.user.displayName || 'محامي', result.user.email || '');
          onSuccess?.();
          return;
        } catch (electronErr) {
          console.warn('[Electron Google Login Error]', electronErr);
          nativeFallbackError = true;
        }
      }

      // ─── Web: Popup ────
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(f.auth, provider);
      await initUserProfile(result.user.uid, result.user.displayName || 'محامي', result.user.email || '');
      onSuccess?.();
    } catch (err: unknown) {
      const msg = (err as { code?: string })?.code;
      console.error('[GoogleAuthError]', err);
      const isPopupError = msg === 'auth/popup-blocked' || msg === 'auth/popup-closed-by-user';

      if (isPopupError && !(window as any).electronAPI?.google) {
        try {
          const { signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
          const f = await getFirebase();
          if (!f.disabled) {
            await signInWithRedirect(f.auth, new GoogleAuthProvider());
            return;
          }
        } catch (redirErr) {
          console.error('[GoogleRedirectError]', redirErr);
        }
      }

      if (nativeFallbackError) {
        setError('فشل تسجيل الدخول عبر نافذة سطح المكتب. استخدم البريد الإلكتروني أو أعد تشغيل التطبيق.');
      } else {
        setError('تعذر تسجيل الدخول بـ Google. جرّب البريد الإلكتروني أو رقم الهاتف.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── إرسال OTP للهاتف ────────────────────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    const fullPhone = phone.startsWith('+') ? phone : '+2' + phone;
    setLoading(true);
    clearError();
    try {
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(f.auth, 'recaptcha-container', { size: 'invisible' });
      }
      const result = await signInWithPhoneNumber(f.auth, fullPhone, recaptchaVerifierRef.current);
      setConfirmResult(result as any);
      setOtpSent(true);
    } catch (e) {
      console.warn('[sendOTP] error', e);
      setError('فشل إرسال الرمز. تأكد من رقم الهاتف (مثال: 01012345678).');
    } finally {
      setLoading(false);
    }
  };

  // ── تأكيد OTP ───────────────────────────────────────────────────
  const handleConfirmOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmResult || !otp) return;
    setLoading(true);
    clearError();
    try {
      const res = await confirmResult.confirm(otp);
      await initUserProfile(res.user.uid, 'محامي', res.user.phoneNumber || '');
      onSuccess?.();
    } catch (e) {
      console.warn('[confirmOTP] error', e);
      setError('الرمز غير صحيح أو منتهي الصلاحية. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // شاشة المصادقة intentionally محدودة بعناصر الدخول فقط؛ التفاصيل التسويقية متاحة في الصفحة العامة.

  return (
    <div className="public-site public-auth-screen relative min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.18),transparent_36%),#020617] text-slate-100 flex items-center justify-center px-4 py-8 sm:py-12" dir="rtl">
      <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
        <PublicThemeToggle />
      </div>
      <div id="recaptcha-container" ref={recaptchaRef} />
      <div className="w-full max-w-md">
        <a href="/" className="mb-6 flex items-center justify-center gap-3 text-center" aria-label="العودة إلى الموقع التعريفي">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-950/50">
            <Scale className="h-6 w-6 text-white" />
          </span>
          <span>
            <span className="block text-sm font-black text-white">منصة المحامي الرقمية</span>
            <span className="block text-[11px] text-slate-400">الدخول إلى مساحة العمل</span>
          </span>
        </a>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black text-white">دخول المنصة</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">أدخل إلى مساحة العمل الخاصة بك وتابع أعمال مكتبك بأمان.</p>
          </div>

          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs leading-6 text-slate-300">
            <Shield className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
            <span>تُحفظ بيانات العمل محلياً على جهازك وفق إعدادات المنصة. راجع <a href="/privacy.html" className="font-bold text-emerald-300 hover:text-emerald-200">سياسة الخصوصية</a> قبل إدخال بيانات حساسة.</span>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-center text-xs font-medium text-red-300" role="alert">
              {error}
            </div>
          )}

          <button onClick={handleGoogle} disabled={loading} className="w-full relative group overflow-hidden bg-white hover:bg-indigo-50 text-slate-900 py-4 px-6 rounded-2xl font-black text-sm shadow-xl shadow-indigo-950/30 border border-white transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> : (
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span>{loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول بحساب Google'}</span>
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] text-slate-600"><span className="h-px flex-1 bg-slate-800" /><span>أو</span><span className="h-px flex-1 bg-slate-800" /></div>

          {mode !== 'phone' ? (
            <form onSubmit={mode === 'register' ? handleRegister : handleEmailLogin} className="space-y-3">
              {mode === 'register' && (
                <label className="block text-xs font-bold text-slate-300">الاسم
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-indigo-500" placeholder="اسمك أو اسم المكتب" autoComplete="name" />
                </label>
              )}
              <label className="block text-xs font-bold text-slate-300">البريد الإلكتروني
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-indigo-500" placeholder="name@example.com" autoComplete="email" dir="ltr" />
              </label>
              <label className="block text-xs font-bold text-slate-300">كلمة المرور
                <span className="relative mt-1.5 block">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 pl-11 text-sm text-white outline-none transition focus:border-indigo-500" placeholder="••••••••" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} dir="ltr" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </span>
              </label>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white transition hover:bg-indigo-500 disabled:opacity-50">{loading ? 'جاري المعالجة...' : mode === 'register' ? 'إنشاء الحساب' : 'تسجيل الدخول'}</button>
            </form>
          ) : (
            !otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">رقم الهاتف المصري
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-indigo-500" placeholder="01012345678" autoComplete="tel" dir="ltr" />
                </label>
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white transition hover:bg-indigo-500 disabled:opacity-50">{loading ? 'جاري إرسال الرمز...' : 'إرسال رمز التحقق'}</button>
              </form>
            ) : (
              <form onSubmit={handleConfirmOTP} className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">رمز التحقق
                  <input inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-center text-lg tracking-[0.4em] text-white outline-none transition focus:border-indigo-500" placeholder="123456" autoComplete="one-time-code" dir="ltr" />
                </label>
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white transition hover:bg-indigo-500 disabled:opacity-50">{loading ? 'جاري التحقق...' : 'تأكيد الرمز'}</button>
              </form>
            )
          )}

          <div className="mt-5 flex items-center justify-between gap-3 text-xs">
            <button type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); clearError(); }} className="font-bold text-indigo-300 hover:text-indigo-200">{mode === 'register' ? 'لديك حساب؟ سجّل الدخول' : 'إنشاء حساب جديد'}</button>
            <button type="button" onClick={() => { setMode(mode === 'phone' ? 'login' : 'phone'); clearError(); }} className="font-bold text-slate-400 hover:text-slate-200">{mode === 'phone' ? 'الدخول بالبريد' : 'الدخول بالهاتف'}</button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-slate-500">
          <a href="/" className="transition hover:text-slate-300">العودة إلى الموقع</a>
          <span aria-hidden="true">•</span>
          <a href="/contact.html" className="transition hover:text-slate-300">تواصل معنا</a>
        </div>
      </div>
    </div>
  );
}
