/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NewsletterBox — اشتراك بريدي في النشرة القانونية.
 * يكتب في Firestore مجموعة newsletter_subscribers (قاعدة أمان: create فقط، بلا قراءة عامة).
 * الإرسال الفعلي للبريد يُربط لاحقاً بمزوّد خارجي — القائمة مملوكة ومحفوظة من الآن.
 */

import React, { useState } from 'react';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function docId(email: string): string {
  // معرّف ثابت مشتق من البريد لمنع الازدواجية (setDoc يستبدل بدل إضافة نسخ)
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

export default function NewsletterBox() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function subscribe() {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) { setState('error'); setMsg('أدخل بريداً صحيحاً.'); return; }
    setState('busy'); setMsg('');
    try {
      const { getFirebase } = await import('../firebaseClient');
      const fb = await getFirebase();
      if (fb.disabled) throw new Error('disabled');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(fb.db, 'newsletter_subscribers', docId(e)), {
        email: e.toLowerCase(),
        createdAt: serverTimestamp(),
        src: 'home',
      });
      setState('done');
      try { localStorage.setItem('mohami_newsletter', e); } catch {}
    } catch (err: any) {
      setState('error');
      setMsg(err?.message === 'disabled' ? 'الاشتراك متاح عبر الموقع الإلكتروني.' : 'تعذر الاشتراك الآن — حاول لاحقاً.');
    }
  }

  if (typeof window !== 'undefined') {
    try {
      if (!state && localStorage.getItem('mohami_newsletter')) { /* لا نمنع العرض؛ المستخدم قد يغير بريده */ }
    } catch {}
  }

  return (
    <section
      data-newsletter
      className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 mb-14"
    >
      <div
        className="rounded-3xl p-7 sm:p-9 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,.12), rgba(16,185,129,.07))',
          border: '1px solid rgba(99,102,241,.3)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 text-[11px] font-extrabold mb-4">
          📬 النشرة القانونية الأسبوعية — مجاناً
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2 leading-snug">
          خلاصة قانونية أسبوعية تصلك بريداً
        </h2>
        <p className="text-sm text-slate-300 mb-6 max-w-md mx-auto leading-relaxed">
          أهم المقالات ونشرة «رصد المحامي» وتحديثات المنصة — رسالة واحدة كل أسبوع، بدون إزعاج.
        </p>

        {state === 'done' ? (
          <div className="flex items-center justify-center gap-2 text-emerald-300 font-extrabold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            تم الاشتراك بنجاح! أول نشرة ستصلك قريباً 🎉
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/70 border border-slate-600/40 focus-within:border-indigo-400/60 transition">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && subscribe()}
                  placeholder="your@email.com"
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none font-bold"
                  autoComplete="email"
                />
              </div>
              <button
                onClick={subscribe}
                disabled={state === 'busy'}
                className="px-7 py-3 rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 text-white text-sm font-extrabold hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap"
              >
                {state === 'busy' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'اشترك مجاناً'
                )}
              </button>
            </div>
            {state === 'error' && <p className="mt-3 text-xs font-bold text-rose-300">{msg}</p>}
            <p className="mt-4 text-[10.5px] text-slate-500 font-bold">
              🔒 بريدك محفوظ لدينا ولا يُشارك أبداً · يمكنك إلغاء الاشتراك في أي وقت
            </p>
          </>
        )}
      </div>
    </section>
  );
}
