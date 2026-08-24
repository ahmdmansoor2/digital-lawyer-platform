/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FirebaseLoginScreen — شاشة تسجيل الدخول (v2.0)
 * تدعم: Email/Password + Google + رقم الهاتف (OTP)
 * + نسيت كلمة المرور + إعادة إرسال بريد التحقق
 */

import React, { useState, useRef, useEffect } from 'react';
import PublicThemeToggle from './PublicThemeToggle';
import SiteHeader from './SiteHeader';
import { getFirebase } from '../firebaseClient';
import {
  Scale,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'phone' | 'forgot';

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
  const [info, setInfo] = useState(''); // رسائل نجاح (مثل "تم إرسال بريد التحقق")
  const [otpSent, setOtpSent] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmationResultType | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifierType>(null);

  // ── معالجة redirect بعد تسجيل الدخول ───────────────────────────
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

  const clearError = () => { setError(''); setInfo(''); };
  const switchMode = (m: AuthMode) => { setMode(m); clearError(); };

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
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message;
      console.warn('[EmailLoginError]', code, message);
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/invalid-login-credentials') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (code === 'auth/user-not-found') {
        setError('لا يوجد حساب بهذا البريد الإلكتروني. يمكنك إنشاء حساب جديد.');
      } else if (code === 'auth/too-many-requests') {
        setError('تم حجب الحساب مؤقتاً بسبب كثرة المحاولات. حاول بعد 5-10 دقائق أو استخدم "نسيت كلمة المرور" لإعادة التعيين.');
      } else if (code === 'auth/user-disabled') {
        setError('هذا الحساب معطّل. تواصل مع الدعم لتفعيله.');
      } else if (code === 'auth/network-request-failed') {
        setError('فشل الاتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.');
      } else {
        setError('خطأ في تسجيل الدخول. تأكد من بياناتك وحاول مرة أخرى.');
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
      const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import('firebase/auth');
      const cred = await createUserWithEmailAndPassword(f.auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      // إرسال بريد التحقق تلقائياً
      try {
        await sendEmailVerification(cred.user);
        setInfo(`تم إنشاء الحساب بنجاح. أرسلنا بريد تحقق إلى ${email} — يرجى التحقق من صندوق الوارد وتأكيد البريد.`);
      } catch (verifyErr) {
        console.warn('[sendEmailVerification] failed:', verifyErr);
        setInfo('تم إنشاء الحساب بنجاح. يمكنك المتابعة الآن.');
      }
      await initUserProfile(cred.user.uid, name, email);
      // لا نستدعي onSuccess مباشرة — نترك المستخدم يطّلع على الرسالة أولاً
      // يمكنه الضغط على زر للدخول أو يُغلق وينتقل تلقائياً
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.warn('[RegisterError]', code);
      if (code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول بدلاً من ذلك أو استخدم "نسيت كلمة المرور".');
      } else if (code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل مع أحرف وأرقام.');
      } else if (code === 'auth/invalid-email') {
        setError('البريد الإلكتروني غير صالح. تأكد من كتابته بشكل صحيح.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('تسجيل الحسابات الجديدة معطّل حالياً. تواصل مع الدعم.');
      } else {
        setError('حدث خطأ في إنشاء الحساب. حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── نسيت كلمة المرور ─────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('أدخل بريدك الإلكتروني أولاً'); return; }
    setLoading(true);
    clearError();
    try {
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const { sendPasswordResetEmail } = await import('firebase/auth');
      // continueUrl ضروري جداً: يخلي رابط الـ email يفتح على دوميننا (mohamidigital.online)
      // بدل الدومين الافتراضي firebaseapp.com
      const continueUrl = `${window.location.origin}/__/auth/action`;
      await sendPasswordResetEmail(f.auth, email, { url: continueUrl });
      setInfo(`✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}. تحقق من صندوق الوارد (وربما مجلد Spam). الرابط صالح لمدة ساعة واحدة.`);
      setMode('login');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.warn('[ForgotPasswordError]', code);
      if (code === 'auth/invalid-email') {
        setError('البريد الإلكتروني غير صالح. تأكد من كتابته بشكل صحيح.');
      } else if (code === 'auth/user-not-found') {
        setError('لا يوجد حساب بهذا البريد الإلكتروني. يمكنك إنشاء حساب جديد.');
      } else if (code === 'auth/too-many-requests') {
        setError('محاولات كثيرة جداً. انتظر 5 دقائق وحاول مرة أخرى.');
      } else if (code === 'auth/network-request-failed') {
        setError('فشل الاتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.');
      } else {
        setError('فشل إرسال البريد. حاول مرة أخرى بعد قليل.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── إعادة إرسال بريد التحقق ─────────────────────────────────────
  const handleResendVerification = async () => {
    if (!email) { setError('أدخل بريدك الإلكتروني المسجّل أولاً'); return; }
    setLoading(true);
    clearError();
    try {
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      // نحتاج لتسجيل الدخول أولاً لإرسال بريد التحقق
      // بدلاً من ذلك، نُظهر للمستخدم طريقة بديلة
      setInfo(`ℹ️ ميزة "إعادة إرسال بريد التحقق" تتطلب منك تسجيل الدخول أولاً. بعد الدخول، ستجد خيار "إعادة إرسال التحقق" في الإعدادات. أو تواصل معنا على صفحة "تواصل معنا".`);
    } catch (e) {
      console.warn('[ResendVerification] failed:', e);
      setError('فشل إرسال البريد. حاول لاحقاً.');
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
  // الاستراتيجية: redirect flow (أكثر موثوقية في embedded browsers)
  // بدل popup، لأن popup يُحجَب في WebViews والمتصفحات المضمنة
  const handleGoogle = async () => {
    setLoading(true);
    clearError();
    try {
      const electronAPI = (window as any).electronAPI;
      // ─── Electron: نافذة OAuth أصلية (تعمل دائماً) ────
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
        }
      }

      // ─── Web: Redirect (أفضل من popup في embedded views) ────
      // نتجنّب signInWithPopup لأنه يفشل في WebView/MSTeams/Slack
      const { signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
      const f = await getFirebase();
      if (f.disabled) throw new Error('Firebase disabled');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(f.auth, provider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error('[GoogleAuthError]', code, err);
      if (code === 'auth/network-request-failed') {
        setError('فشل الاتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.');
      } else if (code === 'auth/popup-blocked') {
        setError('المتصفح يحجب نافذة Google. جرّب من متصفح آخر أو استخدم البريد الإلكتروني.');
      } else {
        setError('تعذر تسجيل الدخول بـ Google. جرّب البريد الإلكتروني أو رقم الهاتف.');
      }
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
      // reCAPTCHA بحجم 'normal' أقل عرضة لإظهار تحدي الصور
      // ونستخدم callback صريح لإصلاح الـ loop
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch (e) {}
        recaptchaVerifierRef.current = null;
      }
      recaptchaVerifierRef.current = new RecaptchaVerifier(f.auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('[reCAPTCHA] verified');
        },
        'expired-callback': () => {
          console.warn('[reCAPTCHA] expired');
          setError('انتهت صلاحية التحقق. حاول مرة أخرى.');
        },
      });
      const result = await signInWithPhoneNumber(f.auth, fullPhone, recaptchaVerifierRef.current);
      setConfirmResult(result as any);
      setOtpSent(true);
      setInfo('✅ تم إرسال رمز التحقق إلى هاتفك. أدخل الرمز المكوّن من 6 أرقام.');
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      console.warn('[sendOTP] error', code, e);
      if (code === 'auth/invalid-phone-number') {
        setError('رقم الهاتف غير صالح. أدخل الرقم بالصيغة الدولية (مثال: +201012345678).');
      } else if (code === 'auth/too-many-requests') {
        setError('محاولات كثيرة جداً. انتظر بضع دقائق وحاول مرة أخرى.');
      } else if (code === 'auth/captcha-check-failed') {
        setError('فشل التحقق reCAPTCHA. حدّث الصفحة وحاول مرة أخرى.');
      } else if (code === 'auth/quota-exceeded') {
        setError('تم تجاوز الحد الأقصى لإرسال SMS. حاول لاحقاً.');
      } else {
        setError('فشل إرسال الرمز. تأكد من رقم الهاتف (مثال: 01012345678).');
      }
      // تنظيف reCAPTCHA عند الفشل
      try { recaptchaVerifierRef.current?.clear(); } catch (e) {}
      recaptchaVerifierRef.current = null;
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
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      console.warn('[confirmOTP] error', code);
      if (code === 'auth/invalid-verification-code') {
        setError('الرمز غير صحيح. تأكد من كتابته بشكل صحيح أو اطلب رمزاً جديداً.');
      } else if (code === 'auth/code-expired') {
        setError('انتهت صلاحية الرمز. اضغط "إعادة الإرسال" للحصول على رمز جديد.');
        setOtpSent(false);
        setOtp('');
        setConfirmResult(null);
      } else {
        setError('فشل التحقق. حاول مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── UI: رسائل الخطأ والنجاح ─────────────────────────────────────
  const renderMessages = () => (
    <>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-xs leading-6 text-red-300" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={clearError} className="text-red-400 hover:text-red-200" aria-label="إغلاق">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {info && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-800/50 bg-emerald-950/40 px-4 py-3 text-xs leading-6 text-emerald-200" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{info}</span>
          <button type="button" onClick={clearError} className="text-emerald-400 hover:text-emerald-200" aria-label="إغلاق">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="public-site public-auth-screen relative min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.18),transparent_36%),#020617] text-slate-100 flex flex-col" dir="rtl">
      <SiteHeader variant="login" activeKey="home" />
      <div className="relative flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
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
              {mode === 'forgot' ? <KeyRound className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </div>
            <h1 className="text-2xl font-black text-white">
              {mode === 'login' && 'دخول المنصة'}
              {mode === 'register' && 'إنشاء حساب جديد'}
              {mode === 'phone' && 'الدخول بالهاتف'}
              {mode === 'forgot' && 'نسيت كلمة المرور'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {mode === 'login' && 'أدخل إلى مساحة العمل الخاصة بك وتابع أعمال مكتبك بأمان.'}
              {mode === 'register' && 'أنشئ حساباً مجانياً للوصول إلى جميع أدوات المحاماة.'}
              {mode === 'phone' && 'سنرسل لك رمز تحقق مكوّن من 6 أرقام على هاتفك.'}
              {mode === 'forgot' && 'أدخل بريدك المسجّل وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.'}
            </p>
          </div>

          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs leading-6 text-slate-300">
            <Shield className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
            <span>تُحفظ بيانات العمل محلياً على جهازك وفق إعدادات المنصة. راجع <a href="/privacy.html" className="font-bold text-emerald-300 hover:text-emerald-200">سياسة الخصوصية</a> قبل إدخال بيانات حساسة.</span>
          </div>

          {renderMessages()}

          {mode !== 'forgot' && mode !== 'phone' && (
            <button onClick={handleGoogle} disabled={loading} className="w-full relative group overflow-hidden bg-white hover:bg-indigo-50 text-slate-900 py-4 px-6 rounded-2xl font-black text-sm shadow-xl shadow-indigo-950/30 border border-white transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> : (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>{loading ? 'جاري...' : 'تسجيل الدخول بحساب Google'}</span>
            </button>
          )}

          {mode !== 'forgot' && (
            <div className="my-5 flex items-center gap-3 text-[11px] text-slate-600"><span className="h-px flex-1 bg-slate-800" /><span>أو</span><span className="h-px flex-1 bg-slate-800" /></div>
          )}

          {mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">البريد الإلكتروني المسجّل
                <div className="relative mt-1.5">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 pr-10 pl-3 text-sm text-white outline-none transition focus:border-indigo-500" placeholder="name@example.com" autoComplete="email" dir="ltr" required />
                </div>
              </label>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white transition hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                <span>{loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}</span>
              </button>
              <p className="text-center text-[11px] leading-5 text-slate-500">
                سنرسل لك رسالة على بريدك المسجّل تحتوي على رابط آمن لإنشاء كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة.
              </p>
            </form>
          ) : mode !== 'phone' ? (
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
              {mode === 'login' && (
                <div className="flex flex-col gap-2 pt-1">
                  <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-bold text-indigo-300 hover:text-indigo-200 flex items-center justify-center gap-1.5">
                    <KeyRound className="h-3 w-3" />
                    <span>نسيت كلمة المرور؟</span>
                  </button>
                  <button type="button" onClick={handleResendVerification} disabled={loading} className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    <span>إعادة إرسال بريد التحقق</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            !otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">رقم الهاتف المصري
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-indigo-500" placeholder="01012345678" autoComplete="tel" dir="ltr" />
                  <span className="mt-1 block text-[10.5px] text-slate-500">سنحوّله تلقائياً إلى الصيغة الدولية (+2). SMS مجاني.</span>
                </label>
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white transition hover:bg-indigo-500 disabled:opacity-50">{loading ? 'جاري إرسال الرمز...' : 'إرسال رمز التحقق'}</button>
              </form>
            ) : (
              <form onSubmit={handleConfirmOTP} className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">رمز التحقق المكوّن من 6 أرقام
                  <input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-center text-lg tracking-[0.4em] text-white outline-none transition focus:border-indigo-500" placeholder="123456" autoComplete="one-time-code" dir="ltr" />
                </label>
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-black text-white transition hover:bg-indigo-500 disabled:opacity-50">{loading ? 'جاري التحقق...' : 'تأكيد الرمز'}</button>
                <div className="flex flex-col gap-1.5 pt-1 text-center">
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setConfirmResult(null); try { recaptchaVerifierRef.current?.clear(); } catch(e){} recaptchaVerifierRef.current = null; }} className="text-xs font-bold text-slate-400 hover:text-slate-200">
                    تغيير رقم الهاتف
                  </button>
                  <button type="button" onClick={handleSendOTP} disabled={loading} className="text-xs font-bold text-indigo-300 hover:text-indigo-200">
                    إعادة إرسال الرمز
                  </button>
                </div>
              </form>
            )
          )}

          <div className="mt-5 flex items-center justify-between gap-3 text-xs flex-wrap">
            {mode !== 'phone' && mode !== 'forgot' && (
              <button type="button" onClick={() => switchMode(mode === 'register' ? 'login' : 'register')} className="font-bold text-indigo-300 hover:text-indigo-200">
                {mode === 'register' ? (
                  <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" />لديك حساب؟ سجّل الدخول</span>
                ) : (
                  'إنشاء حساب جديد'
                )}
              </button>
            )}
            {mode !== 'phone' && (
              <button type="button" onClick={() => switchMode('phone')} className="font-bold text-slate-400 hover:text-slate-200">
                {mode === 'phone' ? 'الدخول بالبريد' : 'الدخول بالهاتف'}
              </button>
            )}
            {(mode === 'phone' || mode === 'forgot') && (
              <button type="button" onClick={() => switchMode('login')} className="font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                العودة لتسجيل الدخول
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-slate-500">
          <a href="/" className="transition hover:text-slate-300">العودة إلى الموقع</a>
          <span aria-hidden="true">•</span>
          <a href="/contact.html" className="transition hover:text-slate-300">تواصل معنا</a>
        </div>
        </div>
      </div>
    </div>
  );
}
