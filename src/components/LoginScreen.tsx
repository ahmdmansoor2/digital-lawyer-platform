/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * شاشة تسجيل الدخول الاحترافية — Material Design 3 + Dark/Light mode
 */

import React, { useState, useEffect } from 'react';
;
import {
  Scale, User as UserIcon, Lock, Eye, EyeOff, Shield, AlertTriangle,
  KeyRound, Loader2, Sun, Moon, ChevronRight, LockKeyhole,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type LoginMode = 'credentials' | 'twoFactor';

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess?: (role: string, name: string) => void } = {}) {
  const auth = useAuth();
  const authReady = auth.isInitialized && auth.users.length > 0;
  const [mode, setMode] = useState<LoginMode>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
 
    if (!authReady) {
      setError('جارٍ تهيئة بيانات المصادقة. حاول بعد لحظة.');
      return;
    }
 
    // Rate limiting
    if (failedAttempts >= 5) {
      setError('تم تجاوز عدد المحاولات. حاول بعد دقيقة.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'credentials') {
        const result = await auth.login(username, password, { rememberMe });
        if (result.success) {
          setFailedAttempts(0);
          const loggedInUser = auth.users.find(u => u.username.toLowerCase() === username.toLowerCase());
          const roleName = loggedInUser?.roleIds?.[0] ? auth.roles.find(r => r.id === loggedInUser.roleIds[0])?.name : null;
          localStorage.setItem('lawfirm_logged_in', 'true');
          if (loggedInUser?.fullName) localStorage.setItem('lawfirm_user_name', loggedInUser.fullName);
          if (roleName) localStorage.setItem('lawfirm_user_role', roleName);
          onLoginSuccess?.(roleName || 'مدير المكتب', loggedInUser?.fullName || username);
        } else if (result.needTwoFactor) {
          setMode('twoFactor');
          setError(null);
        } else {
          setFailedAttempts(prev => prev + 1);
          setError(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        }
      } else {
        const result = await auth.login(username, password, {
          twoFactorCode: totpCode, rememberMe
        });
        if (result.success) {
          setFailedAttempts(0);
          const loggedInUser = auth.users.find(u => u.username.toLowerCase() === username.toLowerCase());
          const roleName = loggedInUser?.roleIds?.[0] ? auth.roles.find(r => r.id === loggedInUser.roleIds[0])?.name : null;
          localStorage.setItem('lawfirm_logged_in', 'true');
          if (loggedInUser?.fullName) localStorage.setItem('lawfirm_user_name', loggedInUser.fullName);
          if (roleName) localStorage.setItem('lawfirm_user_role', roleName);
          onLoginSuccess?.(roleName || 'مدير المكتب', loggedInUser?.fullName || username);
        } else {
          setError(result.error || 'رمز التحقق غير صحيح');
          setFailedAttempts(prev => prev + 1);
        }
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden" dir="rtl">
      {/* خلفية مزخرفة */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-700/10 rounded-full blur-3xl" />
      </div>

      {/* مفتاح الثيم */}
      <button
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-white transition z-10"
        title="تبديل المظهر"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* الشعار */}
        <div className="text-center mb-6">
          <div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-2xl shadow-indigo-500/30 mb-4"
          >
            <Scale className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">منصة المحامي الرقمية</h1>
          <p className="text-sm text-slate-400">نظام إدارة مكتب محاماة متكامل</p>
        </div>

        {/* بطاقة تسجيل الدخول */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <LockKeyhole className="w-5 h-5 text-indigo-400" />
              {mode === 'credentials' ? 'تسجيل الدخول' : 'التحقق الثنائي (2FA)'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === 'credentials'
                ? 'أدخل بيانات اعتمادك للوصول إلى حسابك'
                : 'أدخل الرمز المكون من 6 أرقام من تطبيق Authenticator'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'credentials' ? (
              <>
                {/* اسم المستخدم */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">اسم المستخدم</label>
                  <div className="relative">
                    <UserIcon className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => { setUsername(e.target.value); setError(null); }}
                      placeholder="admin"
                      autoComplete="username"
                      autoFocus
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pe-10 ps-3 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:bg-slate-800 transition"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* كلمة المرور */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(null); }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pe-10 ps-10 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:bg-slate-800 transition"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* تذكرني + نسيت كلمة المرور */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded"
                    />
                    <span>تذكرني</span>
                  </label>
                  <button type="button" className="text-indigo-400 hover:text-indigo-300">
                    نسيت كلمة المروѿ
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">رمز التحقق (6 أرقام)</label>
                  <div className="relative">
                    <KeyRound className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      autoFocus
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pe-10 ps-3 py-3 text-2xl text-white text-center font-bold tracking-[0.5em] outline-none focus:border-indigo-500 focus:bg-slate-800 transition"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-center">
                    افتح تطبيق Authenticator على هاتفك وأدخل الرمز المعروض
                  </p>
                </div>
              </>
            )}

            {/* رسالة الخطأ */}
            {!authReady && (
              <div className="bg-yellow-900/20 border border-yellow-600/40 rounded-xl p-3 text-yellow-100 text-xs mb-3">
                جارٍ تهيئة بيانات المصادقة، يرجى الانتظار قبل المحاولة.
              </div>
            )}
            {error && (
              <div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-900/40 border border-rose-700/50 rounded-xl p-3 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-200">{error}</p>
              </div>
            )}

            {/* زر الدخول الرئيسي */}
            <button
              type="submit"
              disabled={!authReady || isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جارٍ التحقق...
                </>
              ) : (
                <>
                  {mode === 'credentials' ? 'تسجيل الدخول' : 'تحقق'}
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>

            {/* زر الدخول المباشر بنقرة واحدة */}
            <button
              type="button"
              disabled={!authReady || isLoading}
              onClick={async () => {
                setError(null);
                setIsLoading(true);
                try {
                  const result = await auth.login('admin', 'admin123', { rememberMe: true });
                  if (result.success) {
                    const loggedInUser = auth.users.find(u => u.username.toLowerCase() === 'admin');
                    const roleName = loggedInUser?.roleIds?.[0] ? auth.roles.find(r => r.id === loggedInUser.roleIds[0])?.name : 'مدير المكتب';
                    localStorage.setItem('lawfirm_logged_in', 'true');
                    if (loggedInUser?.fullName) localStorage.setItem('lawfirm_user_name', loggedInUser.fullName);
                    localStorage.setItem('lawfirm_user_role', roleName);
                    onLoginSuccess?.(roleName, loggedInUser?.fullName || 'مدير المكتب');
                  } else {
                    setError(result.error || 'تعذر تسجيل الدخول السريع. حاول لاحقاً.');
                  }
                } catch (e: any) {
                  setError(e?.message || 'حدث خطأ أثناء تسجيل الدخول السريع');
                } finally {
                  setIsLoading(false);
                }
              }}
              className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs"
            >
              ⚡ دخول مباشر سريع إلى المنظومة (بنقرة واحدة)
            </button>

            {/* العودة لوضع الاعتماد */}
            {mode === 'twoFactor' && (
              <button
                type="button"
                onClick={() => { setMode('credentials'); setTotpCode(''); setError(null); }}
                className="w-full text-slate-400 hover:text-slate-200 text-xs"
              >
                العودة لبيانات الدخول
              </button>
            )}
          </form>

          {/* معايير الخصوصية والأمان المشفر */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center space-y-1.5">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>خصوصية تامة وتشفير بنكي Zero-Knowledge</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm mx-auto">
              بيانات موكليك وقضاياك ومستنداتك مشفرة ومحفوظة على جهازك عبر IndexedDB مع مزامنة مشفرة؛ لا يمكن لأي طرف ثالث الاطلاع على أسرار مكتبك.
            </p>
          </div>
        </div>

        {/* بيانات الدخول التجريبية */}
        <div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 bg-indigo-900/30 border border-indigo-700/40 rounded-xl p-3 text-xs text-indigo-200"
        >
          <p className="font-bold mb-2 text-indigo-100">🔐 بيانات الدخول التجريبية:</p>
          <div className="space-y-1 font-mono text-[11px]">
            <div><span className="text-indigo-400">المدير:</span> <span className="font-bold">admin</span> / <span className="font-bold">admin123</span></div>
            <div><span className="text-indigo-400">محامي:</span> <span className="font-bold">mohamed</span> / <span className="font-bold">demo123</span></div>
            <div><span className="text-indigo-400">سكرتير:</span> <span className="font-bold">nour</span> / <span className="font-bold">demo123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}