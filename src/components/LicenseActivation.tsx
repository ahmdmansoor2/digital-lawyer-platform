import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle, XCircle, Loader2, RefreshCw, Star, Zap, Users, Building2 } from 'lucide-react';

interface LicensePayload {
  id: string;
  customer: string;
  plan: string;
  issuedAt: number;
  expiresAt: number;
  maxCases: number;
  maxFiles: number;
  features: string[];
}

interface LicenseActivationProps {
  onActivated: (license: LicensePayload) => void;
}

const PLAN_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  trial:      { label: 'تجريبي',      color: '#64748b', icon: <Star className="w-4 h-4"/>,     desc: '5 قضايا · 10 ملفات' },
  pro:        { label: 'محامي Pro',   color: '#6366f1', icon: <Zap className="w-4 h-4"/>,      desc: 'قضايا غير محدودة · AI كامل' },
  firm:       { label: 'مكتب',        color: '#0ea5e9', icon: <Users className="w-4 h-4"/>,    desc: 'فريق عمل كامل + تقارير' },
  enterprise: { label: 'مؤسسة',      color: '#f59e0b', icon: <Building2 className="w-4 h-4"/>,desc: 'كل المميزات + دعم مخصص' },
};

const LicenseActivation = React.memo(function LicenseActivation({ onActivated }: LicenseActivationProps) {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'activating' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeLicense, setActiveLicense] = useState<LicensePayload | null>(null);

  // On mount: check if already activated
  useEffect(() => {
    const check = async () => {
      setStatus('checking');
      try {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.license) {
          // Not in Electron — allow dev access
          setStatus('idle');
          return;
        }
        const result = await electronAPI.license.check();
        if (result.valid && result.payload) {
          setActiveLicense(result.payload);
          setStatus('success');
          // Auto-proceed after 1.5s
          setTimeout(() => onActivated(result.payload), 1500);
        } else {
          setStatus('idle');
        }
      } catch (e) { console.error('License activation error', e);
        setStatus('idle');
      }
    };
    check();
  }, [onActivated]);

  const handleActivate = async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setErrorMsg('الرجاء إدخال رمز التفعيل');
      setStatus('error');
      return;
    }

    setStatus('activating');
    setErrorMsg('');

    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.license) {
        setErrorMsg('لا يمكن التفعيل خارج بيئة التطبيق.');
        setStatus('error');
        return;
      }

      const result = await electronAPI.license.activate(trimmedToken);

      if (result.success && result.license) {
        setActiveLicense(result.license);
        setStatus('success');
        setTimeout(() => onActivated(result.license), 2000);
      } else {
        setErrorMsg(result.reason || 'مفتاح غير صحيح');
        setStatus('error');
      }
    } catch (e: any) {
      setErrorMsg('حدث خطأ غير متوقع: ' + e.message);
      setStatus('error');
    }
  };

  const daysRemaining = activeLicense
    ? Math.max(0, Math.ceil((activeLicense.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const planInfo = activeLicense ? PLAN_LABELS[activeLicense.plan] || PLAN_LABELS.trial : null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #060810 0%, #0d1025 50%, #07090f 100%)',
      }}
      dir="rtl"
    >
      {/* Glowing orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-violet-600/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/5 rounded-full blur-2xl" />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #111827 0%, #0f1420 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        {/* Top gradient bar */}
        <div
          className="h-1 w-full"
          style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)' }}
        />

        <div className="p-8">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
              }}
            >
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-black text-white mb-1">منصة المحامي الرقمية</h1>
            <p className="text-xs text-slate-500 font-bold">نسخة تجارية مرخصة</p>
          </div>

          {/* Checking state */}
          {status === 'checking' && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-400">جاري التحقق من الترخيص...</p>
            </div>
          )}

          {/* Success state */}
          {status === 'success' && activeLicense && planInfo && (
            <div className="text-center py-4 space-y-4">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-2"
                style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)' }}
              >
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-black text-white">مرحباً، {activeLicense.customer}</p>
                <div
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: `${planInfo.color}20`, color: planInfo.color, border: `1px solid ${planInfo.color}40` }}
                >
                  {planInfo.icon}
                  خطة {planInfo.label}
                </div>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-4 text-sm text-slate-300 space-y-1.5 text-end border border-slate-700/30">
                <div className="flex justify-between">
                  <span className="text-slate-500">الخطة</span>
                  <span className="font-bold">{planInfo.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">متبقي من الترخيص</span>
                  <span className={`font-bold ${daysRemaining < 14 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                    {daysRemaining} يوم
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المميزات</span>
                  <span className="text-indigo-300 font-bold text-xs">{planInfo.desc}</span>
                </div>
              </div>
              <p className="text-xs text-slate-600">جاري فتح التطبيق...</p>
            </div>
          )}

          {/* Idle / Error — activation form */}
          {(status === 'idle' || status === 'error' || status === 'activating') && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-slate-400 leading-relaxed">
                  أدخل رمز التفعيل الذي تلقيته عبر البريد الإلكتروني لتفعيل نسختك التجارية
                </p>
              </div>

              {/* Token input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  رمز التفعيل
                </label>
                <textarea
                  value={token}
                  onChange={e => { setToken(e.target.value); setStatus('idle'); setErrorMsg(''); }}
                  placeholder="الصق رمز التفعيل هنا..."
                  rows={4}
                  className="w-full rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none resize-none transition"
                  style={{
                    background: 'rgba(15,20,35,0.8)',
                    border: status === 'error' ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(99,102,241,0.2)',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
                  }}
                  dir="ltr"
                  disabled={status === 'activating'}
                />
              </div>

              {/* Error message */}
              {status === 'error' && errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-red-400 font-bold"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Activate button */}
              <button
                onClick={handleActivate}
                disabled={status === 'activating'}
                className="w-full py-3.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                }}
              >
                {status === 'activating' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> جاري التفعيل...</>
                ) : (
                  <><Shield className="w-4 h-4" /> تفعيل الترخيص</>
                )}
              </button>

              {/* Plans info */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {Object.entries(PLAN_LABELS).map(([key, info]) => (
                  <div
                    key={key}
                    className="p-2.5 rounded-xl text-center"
                    style={{ background: `${info.color}08`, border: `1px solid ${info.color}20` }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1" style={{ color: info.color }}>
                      {info.icon}
                      <span className="text-[10px] font-black">{info.label}</span>
                    </div>
                    <p className="text-[9px] text-slate-600">{info.desc}</p>
                  </div>
                ))}
              </div>

              <p className="text-center text-[10px] text-slate-700">
                لشراء ترخيص أو تجديده تواصل معنا عبر:{' '}
                <span className="text-indigo-500 font-bold">support@lawyerdigital.com</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default LicenseActivation;
