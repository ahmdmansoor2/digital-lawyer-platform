/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FirebaseLoginScreen — شاشة تسجيل الدخول
 * تدعم: Email/Password + Google + رقم الهاتف (OTP)
 */

import React, { useState, useRef, useEffect } from 'react';
import { getFirebase } from '../firebaseClient';
import {
  Scale,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  Smartphone,
  Briefcase,
  Calendar,
  FileText,
  Calculator,
  Shield,
  Check,
  Sparkles,
  Users,
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

  // ── قائمة مميزات المنصة (العمود التسويقي) ──────────────────────
  const features = [
    {
      icon: Briefcase,
      title: 'إدارة القضايا',
      desc: 'تتبع كل قضية بمواعيدها وجلساتها ومستنداتها',
      color: 'from-orange-500/25 to-rose-500/25',
      iconColor: 'text-orange-400',
    },
    {
      icon: Calendar,
      title: 'تنبيهات الجلسات',
      desc: 'تذكيرات ذكية قبل كل جلسة بأيام أو ساعات',
      color: 'from-pink-500/25 to-rose-500/25',
      iconColor: 'text-pink-400',
    },
    {
      icon: FileText,
      title: 'أوراق المحضرين',
      desc: 'تنظيم محاضر الجلسات وربطها بالقضايا تلقائياً',
      color: 'from-purple-500/25 to-fuchsia-500/25',
      iconColor: 'text-purple-400',
    },
    {
      icon: Calculator,
      title: 'الحاسبات القانونية',
      desc: 'حاسبات النفقة والميراث والتعويضات جاهزة',
      color: 'from-amber-500/25 to-orange-500/25',
      iconColor: 'text-amber-400',
    },
  ];

  // ── روابط الصفحات التي تظهر أسفل بطاقة الدخول ──────────────────
  const pageLinks = [
    { href: '/about.html', label: 'عن المنصة', icon: '⚖️', color: 'warm' },
    { href: '/features.html', label: 'المميزات', icon: '⚡', color: 'warm' },
    { href: '/pricing.html', label: 'مجاني 100%', icon: '🎁', color: 'emerald' },
    { href: '/blog/', label: 'المدونة', icon: '📚', color: 'warm' },
    { href: '/contact.html', label: 'تواصل معنا', icon: '✉️', color: 'warm' },
    { href: '/privacy.html', label: 'الخصوصية', icon: '🔐', color: 'emerald' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0713] via-[#2b1020] to-[#0a0814] flex flex-col items-center justify-start p-4 sm:p-6 relative overflow-hidden" dir="rtl">
      <div id="recaptcha-container" ref={recaptchaRef} />

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-700/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.8s' }} />
        <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="w-full max-w-6xl relative z-10 pt-8 pb-6">

        {/* ── Header / Logo ── */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 shadow-2xl shadow-orange-500/30 mx-auto ring-1 ring-white/15">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-300 text-[11px] font-bold mb-2">
              <Sparkles className="w-3 h-3" />
              المنصة القانونية الأولى في مصر
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">منصة المحامي الرقمية</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">إدارة مكتبك القانوني بذكاء وأمان — من القضايا إلى الجلسات في مكان واحد</p>
          </div>
        </div>

        {/* ── Main Grid: Marketing (left) + Login Form (right in RTL) ── */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-start">

          {/* ── عمود النموذج ── */}
          <div className="order-1 space-y-4">
            <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl shadow-orange-950/40 space-y-5 ring-1 ring-white/10">

              {/* Security badge */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <Shield className="w-3 h-3 text-orange-400" />
                <span>اتصال مشفّر • بياناتك آمنة معنا</span>
              </div>

              {/* ── تسجيل الدخول والإنشاء بحساب Google فقط ── */}
              <div className="space-y-4 py-2">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-white">الدخول بضغطة واحدة</h3>
                  <p className="text-xs text-slate-400">سجّل دخولك أو أنشئ حسابك الجديد فوراً باستخدام حساب Google الخاص بك</p>
                </div>

                {/* رسالة الخطأ */}
                {error && (
                  <div className="bg-red-950/40 border border-red-800/50 rounded-2xl px-4 py-3 text-red-400 text-xs font-medium text-center">
                    {error}
                  </div>
                )}

                {/* ── زر Google ── */}
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full relative group overflow-hidden bg-white hover:bg-orange-50 text-slate-900 py-4 px-6 rounded-2xl font-black text-base shadow-2xl shadow-orange-500/20 hover:shadow-orange-500/30 border border-white transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                  ) : (
                    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  <span>{loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول بحساب Google'}</span>
                </button>

                <p className="text-[11px] text-slate-400 text-center font-medium">
                  ⚡ سرعة وأمان بدون الحاجة لحفظ كلمات مرور جديدة
                </p>
              </div>

              {/* مجاني 100% */}
              <p className="text-center text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 pt-1 border-t border-slate-800/80">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                المنصة مجانية بالكامل 100% لكل المحامين والقانونيين بدون أي رسوم
              </p>
            </div>

            {/* ── روابط الصفحات — تظهر أسفل بطاقة الدخول ── */}
            <div className="space-y-2">
              <p className="text-center text-slate-500 text-[11px] font-bold">تعرّف على المنصة</p>
              <div className="grid grid-cols-3 gap-2">
                {pageLinks.slice(0, 3).map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-slate-900/60 border transition text-center cursor-pointer ${
                      link.color === 'emerald'
                        ? 'border-emerald-800/40 hover:border-emerald-600/50 hover:bg-emerald-950/30'
                        : 'border-white/10 hover:border-orange-500/50 hover:bg-orange-950/30 hover:-translate-y-0.5'
                    }`}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className={`text-[10px] font-black ${
                      link.color === 'emerald' ? 'text-emerald-400' : 'text-orange-200'
                    }`}>{link.label}</span>
                  </a>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {pageLinks.slice(3).map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-slate-900/60 border transition text-center cursor-pointer ${
                      link.color === 'emerald'
                        ? 'border-emerald-800/40 hover:border-emerald-600/50 hover:bg-emerald-950/30'
                        : 'border-white/10 hover:border-orange-500/50 hover:bg-orange-950/30 hover:-translate-y-0.5'
                    }`}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className={`text-[10px] font-black ${
                      link.color === 'emerald' ? 'text-emerald-400' : 'text-orange-200'
                    }`}>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* حقوق النشر */}
            <p className="text-center text-slate-600 text-[10px] pb-2">
              © 2026 منصة المحامي الرقمية •{' '}
              <a href="/terms.html" target="_blank" rel="noopener" className="hover:text-slate-400 transition">الشروط والأحكام</a>
            </p>
          </div>

          {/* ── العمود التسويقي (يظهر يسار في RTL، يختفي على الموبايل) ── */}
          <div className="order-2 space-y-6 hidden lg:block">
            <div className="space-y-3">
              <h2 className="text-3xl xl:text-4xl font-black text-white leading-[1.3]">
                كل ما يحتاجه مكتبك القانوني
                <br />
                <span className="bg-gradient-to-l from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  في مكان واحد
                </span>
              </h2>
              <p className="text-slate-400 text-sm xl:text-base leading-relaxed max-w-md">
                منصة متكاملة لإدارة القضايا والجلسات والموكلين والمحضرين — صُممت خصيصاً للمحامي المصري بأدوات ذكية وسير عمل سلس.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="group relative p-4 rounded-2xl bg-slate-900/40 border border-white/10 hover:border-orange-500/40 transition-all duration-300 hover:bg-slate-900/60 hover:-translate-y-0.5"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 ring-1 ring-white/5`}>
                    <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1">{feature.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Trust Signal */}
            <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-orange-950/40 via-pink-950/30 to-purple-950/30 border border-orange-800/40">
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-orange-500/15 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div className="flex -space-x-2 space-x-reverse flex-shrink-0">
                  {['from-orange-500 to-pink-600', 'from-pink-500 to-purple-600', 'from-purple-500 to-fuchsia-600', 'from-rose-500 to-orange-600'].map((gradient, i) => (
                    <div key={i} className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} border-2 border-slate-950`} />
                  ))}
                  <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-orange-400">+</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                    <Users className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    أكثر من 500 محامي يستخدمون المنصة
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">موثوق من نخبة المحامين والمستشارين القانونيين</p>
                </div>
              </div>
            </div>

            {/* Highlights */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              {[
                { icon: Check, text: 'مجاني 100% بدون بطاقة ائتمان' },
                { icon: Check, text: 'تشفير من الطرف للطرف' },
                { icon: Check, text: 'دعم فني بالعربية' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <item.icon className="w-3.5 h-3.5 text-orange-400" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
