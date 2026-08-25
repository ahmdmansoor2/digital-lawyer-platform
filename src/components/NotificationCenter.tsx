/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NotificationCenter — 🔔 جرس الإشعارات العائم:
 *  - يرصد الجديد (مقالات + رادار) من search-index.json مقارنةً بآخر زيارة (localStorage).
 *  - «تفعيل إشعارات المتصفح» يظهر فقط بعد إضافة VAPID في public/push-config.json
 *    (خطوات التفعيل: docs/SETUP-PUSH.md) — حتى ذلك الحين يعمل الجرس كمركز متابعة داخلي.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Radio, FileText, ExternalLink, BellRing } from 'lucide-react';
import { loadSearchIndex, type SearchIndex } from '../utils/siteSearch';

const SEEN_KEY = 'mohami_seen_ids';
const PUSH_CFG = '/push-config.json';

function readSeen(): Record<string, 1> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch { return {}; }
}
function writeSeen(map: Record<string, 1>) {
  try {
    // احتفظ بآخر 1500 معرف فقط لتفادي نمو الذاكرة
    const keys = Object.keys(map);
    if (keys.length > 1500) {
      const trimmed: Record<string, 1> = {};
      keys.slice(-1500).forEach(k => (trimmed[k] = 1));
      localStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(SEEN_KEY, JSON.stringify(map));
    }
  } catch {}
}

async function getVapid(): Promise<string> {
  try {
    const r = await fetch(PUSH_CFG + '?t=' + Date.now());
    if (!r.ok) return '';
    const cfg = await r.json();
    return cfg.vapidKey || '';
  } catch { return ''; }
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [indexData, setIndexData] = useState<SearchIndex | null>(null);
  const [seen, setSeen] = useState<Record<string, 1>>({});
  const [seeded, setSeeded] = useState(false);
  const [vapid, setVapid] = useState('');
  const [pushOn, setPushOn] = useState(false);
  const [pushMsg, setPushMsg] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // تحميل مؤجل للفهرس + تهيئة خط الأساس في أول زيارة
  useEffect(() => {
    let alive = true;
    loadSearchIndex().then(idx => {
      if (!alive) return;
      setIndexData(idx);
      const prev = readSeen();
      if (!prev.__seeded && Object.keys(prev).length === 0) {
        // أول زيارة: علّم الكل كمقروء دون شارة، وابدأ الرصد من الآن
        const map: Record<string, 1> = { __seeded: 1 };
        idx.items.forEach(i => (map[i.id] = 1));
        writeSeen(map);
        setSeen(map);
        setSeeded(false); // لا شارة أول زيارة
      } else {
        setSeen(prev);
        setSeeded(true);
      }
    }).catch(() => {});
    getVapid().then(v => { if (alive) setVapid(v); });
    try { setPushOn(Notification.permission === 'granted' && !!localStorage.getItem('mohami_push_token')); } catch {}
    return () => { alive = false; };
  }, []);

  const freshItems = useMemo(() => {
    if (!indexData || !seeded) return [];
    return indexData.items
      .filter(i => (i.type === 'blog' || i.type === 'radar') && !seen[i.id])
      .sort((a, b) => (b.dateModified || '').localeCompare(a.dateModified || ''))
      .slice(0, 12);
  }, [indexData, seen, seeded]);

  const latest = useMemo(() => {
    if (!indexData) return [];
    return indexData.items
      .filter(i => i.type === 'blog' || i.type === 'radar')
      .sort((a, b) => (b.dateModified || '').localeCompare(a.dateModified || ''))
      .slice(0, 12);
  }, [indexData]);

  function markAllRead() {
    if (!indexData) return;
    const map = readSeen();
    indexData.items.forEach(i => (map[i.id] = 1));
    map.__seeded = 1;
    writeSeen(map);
    setSeen({ ...map });
  }

  async function enablePush() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushMsg('المتصفح لا يدعم الإشعارات.');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushMsg('لم يتم منح صلاحية الإشعارات.'); return; }
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const { getFirebase } = await import('../firebaseClient');
      const fb = await getFirebase();
      if (fb.disabled) { setPushMsg('الإشعارات غير متاحة داخل تطبيق سطح المكتب.'); return; }
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      if (isSupported && !(await isSupported())) { setPushMsg('غير مدعوم في هذا المتصفح.'); return; }
      const messaging = getMessaging(fb.app);
      const token = await getToken(messaging, {
        vapidKey: vapid,
        serviceWorkerRegistration: reg,
      });
      if (!token) throw new Error('no-token');
      try { localStorage.setItem('mohami_push_token', token); } catch {}
      // حفظ التوكن في Firestore لإرسال البث لاحقاً من CI
      const { doc, setDoc } = await import('firebase/firestore');
      const id = token.slice(-24).replace(/[^a-zA-Z0-9]/g, '');
      await setDoc(doc(fb.db, 'push_tokens', id), { token, ts: Date.now(), ua: navigator.userAgent.slice(0, 140) });
      setPushOn(true);
      setPushMsg('✅ تم تفعيل الإشعارات على هذا الجهاز.');
    } catch (e: any) {
      setPushMsg('تعذر التفعيل: ' + (e?.message || 'خطأ غير معروف'));
    }
  }

  // إغلاق بالنقر خارجه
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.('[data-notif-bell]')) return;
      setOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    return () => { clearTimeout(timer); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  const count = freshItems.length;

  const list = createPortal(
    <div
      ref={panelRef}
      dir="rtl"
      className="fixed z-[9992] w-[min(94vw,380px)] rounded-2xl overflow-hidden shadow-2xl"
      style={{
        top: 70, left: 16,
        background: 'rgba(15,23,42,.97)',
        border: '1px solid rgba(99,102,241,.35)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        maxHeight: '75vh',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
        <BellRing className="w-4 h-4 text-indigo-300" />
        <span className="text-sm font-black text-white flex-1">الجديد على المنصة</span>
        {count > 0 && (
          <button onClick={markAllRead} className="text-[10px] font-extrabold text-indigo-300 hover:text-indigo-200">
            تعليم الكل كمقروء ({count})
          </button>
        )}
        <button onClick={() => setOpen(false)} aria-label="إغلاق" className="text-slate-500 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* تفعيل Push */}
      <div className="px-4 py-3 border-b border-slate-700/40" style={{ background: 'rgba(99,102,241,.05)' }}>
        {!vapid ? (
          <div className="text-[10.5px] text-slate-500 font-bold leading-relaxed">
            🔕 إشعارات المتصفح قيد الإعداد — المركز الداخلي يعمل ويجمع الجديد يومياً.
          </div>
        ) : pushOn ? (
          <div className="text-[11px] font-extrabold text-emerald-300">🔔 الإشعارات مفعّلة على هذا الجهاز</div>
        ) : (
          <button onClick={enablePush} className="w-full py-2 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 text-white text-xs font-extrabold hover:opacity-90 transition">
            🔔 فعّل إشعارات المتصفح (تنبيه يومي بالمقالات والرادار)
          </button>
        )}
        {pushMsg && <div className="mt-1.5 text-[10px] text-slate-400 font-bold">{pushMsg}</div>}
      </div>

      {/* القائمة */}
      <div className="overflow-y-auto p-2" style={{ maxHeight: '52vh' }}>
        {(count > 0 ? freshItems : latest).map(item => {
          const isNew = !seen[item.id] && seeded;
          const Icon = item.type === 'radar' ? Radio : FileText;
          return (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
              onClick={() => { const m = readSeen(); m[item.id] = 1; writeSeen(m); setSeen({ ...m }); setOpen(false); }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-700/30 transition group relative"
            >
              {isNew && <span className="absolute top-3 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow shadow-emerald-400/60" />}
              <span className={'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ' + (item.type === 'radar' ? 'bg-cyan-400/15' : 'bg-amber-400/15')}>
                <Icon className={'w-4 h-4 ' + (item.type === 'radar' ? 'text-cyan-300' : 'text-amber-300')} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-extrabold text-slate-100 line-clamp-2 leading-relaxed mb-0.5">{item.title}</span>
                <span className="block text-[10px] text-slate-500 font-bold">
                  {item.type === 'radar' ? '📡 رصد المحامي' : '📰 مدونة'} · {new Date(item.dateModified || Date.now()).toLocaleDateString('ar-EG')}
                </span>
              </span>
              <ExternalLink className="shrink-0 w-3.5 h-3.5 mt-2 text-slate-600 group-hover:text-indigo-400" />
            </a>
          );
        })}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <button
        data-notif-bell
        onClick={() => setOpen(v => !v)}
        aria-label="إشعارات المنصة"
        title="الجديد على المنصة"
        className="fixed bottom-[88px] left-5 z-[9889] w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: 'rgba(15,23,42,.92)',
          border: '1px solid rgba(99,102,241,.45)',
          boxShadow: '0 8px 24px rgba(0,0,0,.45)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Bell className={'w-5 h-5 ' + (count > 0 ? 'text-indigo-300' : 'text-slate-400')} />
        {count > 0 && (
          <>
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-900">
              {count > 9 ? '٩+' : count.toLocaleString('ar-EG')}
            </span>
            <span className="absolute inset-0 rounded-full animate-ping pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,.4), transparent 70%)' }} />
          </>
        )}
      </button>
      {open && list}
    </>
  );
}
