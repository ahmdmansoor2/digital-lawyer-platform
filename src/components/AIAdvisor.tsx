/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AIAdvisor — «المستشار الذكي»: مساعد يجيب من محتوى المنصة حصراً (RAG خفيف).
 *
 * آلية العمل:
 *  1. يبحث في search-index.json المحلي (389 عنصراً) ويستخرج أفضل 5 مقاطع صلةً بالسؤال.
 *  2. يمررها لـ Gemini Flash مع تعليمات صارمة: الاعتماد على المقاطع فقط + ذكر المصادر.
 *  3. المفتاح ملك الزائر وحده (يُحفظ في متصفحه localStorage) — لا مفاتيح في الكود إطلاقاً.
 *
 * حدود مسؤول: الإجابات استرشادية وليست استشارة قانونية رسمية.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Send, KeyRound, ExternalLink, Trash2 } from 'lucide-react';
import { loadSearchIndex, search, type SearchIndex } from '../utils/siteSearch';

const KEY_STORE = 'mohami_ai_gemini_key';
const QUOTE_STORE = 'mohami_ai_daily';
const MAX_PER_DAY = 25;

const MODELS = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'];

const SYSTEM_PROMPT = `أنت «المستشار الذكي» في منصة المحامي الرقمية، خبير قانوني مصري وخليجي.
قواعد صارمة:
1) اعتمد حصراً على المقاطع المصدرية المرفقة في الإجابة، ولا تخترع مواد قانونية أو أرقام.
2) إن كانت المقاطع غير كافية للإجابة قل ذلك صراحة ووجّه المستخدم لمختص أو للبحث في الموقع.
3) اذكر المصادر في نهاية الإجابة كقائمة بعناوينها كما وردت.
4) أجب بالعربية بأسلوب مبسط ومنظم (نقاط عند الحاجة)، وبحد أقصى ~250 كلمة.
5) اختم دائماً بسطر: «⚠️ هذه معلومة استرشادية وليست استشارة قانونية رسمية.»`;

interface Msg { role: 'user' | 'ai'; text: string; sources?: { title: string; url: string }[] }

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function readCount(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(QUOTE_STORE) || '{}');
    return raw.d === todayKey() ? raw.n || 0 : 0;
  } catch { return 0; }
}
function bumpCount(): number {
  const n = readCount() + 1;
  try { localStorage.setItem(QUOTE_STORE, JSON.stringify({ d: todayKey(), n })); } catch {}
  return n;
}

export default function AIAdvisor() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKeyBox, setShowKeyBox] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [indexData, setIndexData] = useState<SearchIndex | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setApiKey(localStorage.getItem(KEY_STORE) || ''); } catch {}
  }, []);

  // تحميل الفهرس مؤجلاً عند أول فتح
  useEffect(() => {
    if (!open || indexData) return;
    loadSearchIndex().then(setIndexData).catch(() => {});
  }, [open, indexData]);

  // Esc للإغلاق + نقر خارج
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  // تمرير تلقائي لآخر رسالة
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, busy]);

  const remaining = useMemo(() => MAX_PER_DAY - readCount(), [msgs]);

  function saveKey() {
    const k = keyInput.trim();
    if (!k) return;
    try { localStorage.setItem(KEY_STORE, k); } catch {}
    setApiKey(k);
    setShowKeyBox(false);
    setKeyInput('');
  }
  function clearKey() {
    try { localStorage.removeItem(KEY_STORE); } catch {}
    setApiKey('');
    setShowKeyBox(true);
  }

  async function askGemini(question: string, index: SearchIndex): Promise<{ answer: string; sources: { title: string; url: string }[] }> {
    const hits = search(index, question, 5);
    const context = hits.length
      ? hits.map((h, i) => `[${i + 1}] ${h.item.title}\nالتصنيف: ${h.item.category} | الرابط: ${h.item.url}\n${(h.item.snippet || h.item.description || '').slice(0, 400)}`).join('\n\n')
      : '(لا توجد مقاطع مطابقة في فهرس الموقع)';

    const userText =
      `سؤال المواطن: ${question}\n\nالمقاطع المصدرية من منصة المحامي الرقمية:\n${context}`;

    let lastErr: unknown = null;
    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: [{ role: 'user', parts: [{ text: userText }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
            }),
          }
        );
        if (!res.ok) {
          lastErr = new Error('HTTP ' + res.status);
          // 404 نموذج غير متاح → جرب التالي؛ 429/400 مفاتيح/حصة → جرب التالي أيضاً ثم رسالة واضحة
          continue;
        }
        const data = await res.json();
        const text = (data?.candidates?.[0]?.content?.parts || [])
          .map((p: any) => p?.text || '')
          .join('')
          .trim();
        if (!text) throw new Error('رد فارغ');
        return {
          answer: text,
          sources: hits.map((h) => ({ title: h.item.title, url: h.item.url })),
        };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('تعذر الاتصال');
  }

  async function send() {
    const q = question.trim();
    if (!q || busy) return;
    if (!indexData) { setError('ما زال فهرس المحتوى يُحمَّل… لحظة وأعد الإرسال.'); return; }
    if (!apiKey) { setShowKeyBox(true); setError('أدخل مفتاح Gemini الخاص بك أولاً (مجاني من Google AI Studio).'); return; }
    if (readCount() >= MAX_PER_DAY) { setError('وصلت الحد اليومي التجريبي (' + MAX_PER_DAY + ' سؤالاً). عد غداً.'); return; }

    setError(null);
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setQuestion('');
    setBusy(true);

    try {
      const { answer, sources } = await askGemini(q, indexData);
      bumpCount();
      setMsgs((m) => [...m, { role: 'ai', text: answer, sources }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: 'ai', text: '' }]);
      setError('فشل الاتصال بـ Gemini. تأكد من صلاحية المفتاح ومن الحصة المجانية، ثم أعد المحاولة.');
      setMsgs((m) => m.filter(x => x.text !== ''));
    } finally {
      setBusy(false);
    }
  }

  const panel = createPortal(
    <div dir="rtl" className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center sm:p-6 pointer-events-none">
      <div
        ref={panelRef}
        className="pointer-events-auto w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: 'rgba(15,23,42,0.97)',
          border: '1px solid rgba(99,102,241,0.35)',
          maxHeight: '85vh',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        {/* رأس */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/50" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,.12),transparent)' }}>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white">المستشار الذكي</div>
            <div className="text-[10px] font-bold text-slate-400">يجيب من محتوى المنصة · نسخة تجريبية</div>
          </div>
          <button onClick={clearKey} title="تغيير المفتاح" className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-500 hover:text-slate-300 transition">
            <KeyRound className="w-4 h-4" />
          </button>
          <button onClick={() => setMsgs([])} title="محادثة جديدة" className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-500 hover:text-slate-300 transition">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setOpen(false)} aria-label="إغلاق" className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* مربع المفتاح */}
        {(!apiKey || showKeyBox) && (
          <div className="px-5 py-4 border-b border-slate-700/40 bg-indigo-500/5">
            <label className="text-xs font-extrabold text-slate-200 block mb-2">
              🔑 مفتاح Gemini الخاص بك (مجاني — يُحفظ في متصفحك فقط ولا يُرسل لأي جهة أخرى)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                placeholder="AIza…"
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-600/40 text-sm text-white focus:outline-none focus:border-indigo-400"
                dir="ltr"
              />
              <button onClick={saveKey} className="px-4 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 text-white text-xs font-extrabold hover:opacity-90 transition">
                حفظ
              </button>
            </div>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-cyan-300 hover:underline">
              احصل على مفتاح مجاني <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* المحادثة */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]">
          {msgs.length === 0 && !error && (
            <div className="text-center py-8 px-4">
              <div className="text-4xl mb-3">⚖️✨</div>
              <div className="text-sm font-extrabold text-slate-200 mb-1">اسأل أي سؤال قانوني</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                سيبحث المساعد في {indexData ? indexData.count.toLocaleString('ar-EG') : '…'} صفحة من محتوى المنصة
                ويعطيك إجابة موثقة بمصادرها.
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['متى يسقط حق المطالبة بالشيك؟', 'حقوق المستأجر عند انتهاء العقد', 'كيف أحسب مكافأة نهاية الخدمة؟'].map(s => (
                  <button key={s} onClick={() => setQuestion(s)} className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-slate-800/70 border border-slate-700 text-slate-300 hover:border-indigo-400/50 hover:text-indigo-200 transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-indigo-600/30 border border-indigo-400/25 text-sm text-indigo-50 font-bold leading-relaxed">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div className="max-w-[92%] px-4 py-3 rounded-2xl rounded-br-md bg-slate-800/80 border border-slate-600/40 text-sm text-slate-100 leading-loose whitespace-pre-wrap">
                  {m.text}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/60">
                      <div className="text-[10px] font-extrabold text-slate-400 mb-1.5">📚 المصادر من المنصة:</div>
                      <div className="flex flex-col gap-1">
                        {m.sources.map((s) => (
                          <a key={s.url + s.title} href={s.url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 hover:underline truncate">
                            ↗ {s.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {busy && (
            <div className="flex justify-end">
              <div className="px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-600/40 text-xs font-bold text-indigo-300 animate-pulse">
                ✨ يبحث في محتوى المنصة ويصيغ الإجابة…
              </div>
            </div>
          )}

          {error && (
            <div className="text-center text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}
        </div>

        {/* إدخال */}
        <div className="border-t border-slate-700/50 p-3 flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={remaining <= 0 ? 'انتهت الحصة اليومية التجريبية — عد غداً' : 'اكتب سؤالك القانوني هنا…'}
            disabled={remaining <= 0}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-600/40 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400/60 font-bold"
          />
          <button
            onClick={send}
            disabled={busy || !question.trim() || remaining <= 0}
            aria-label="إرسال"
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-l from-indigo-600 to-violet-600 text-white disabled:opacity-40 hover:opacity-90 transition shrink-0"
          >
            <Send className="w-4 h-4 -scale-x-100" />
          </button>
        </div>
        <div className="px-4 pb-2.5 text-center text-[9px] font-bold text-slate-600">
          إجابات آلية استرشادية من محتوى المنصة · متبقٍ اليوم: {Math.max(0, remaining)} سؤالاً · ليست استشارة رسمية
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {/* زر عائم — أسفل يسار (بعيداً عن زر الفهرس أسفل يمين) */}
      <button
        onClick={() => setOpen(v => !v)}
        data-ai-advisor
        aria-label="المستشار الذكي"
        title="المستشار الذكي — اسأل من محتوى المنصة"
        className="fixed bottom-5 left-5 z-[9890] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group"
        style={{
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          boxShadow: '0 10px 30px rgba(99,102,241,.45)',
        }}
      >
        <Sparkles className="w-6 h-6 text-white" />
        <span
          className="absolute inset-0 rounded-full opacity-60 animate-ping pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,.55), transparent 65%)' }}
        />
      </button>
      {open && panel}
    </>
  );
}
