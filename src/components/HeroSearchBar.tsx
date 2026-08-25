/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HeroSearchBar — شريط البحث الذكي في الصفحة الرئيسية (أسفل الهيدر مباشرة).
 *
 * - اقتراحات فورية منسدلة أثناء الكتابة (أفضل 8 نتائج مصنفة)
 * - تنقل كامل بلوحة المفاتيح ↑ ↓ Enter Esc
 * - آخر عمليات البحث + اختصارات سريعة عند الفراغ
 * - "كل النتائج" يفتح SiteSearchModal بنفس الاستعلام
 * - تحميل الفهرس مؤجل عند أول تفاعل (صفر تأثير على سرعة الصفحة)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileText, BookOpen, Layers, Radio, ScrollText, Globe, Clock, ArrowLeft } from 'lucide-react';
import {
  loadSearchIndex,
  search,
  highlight,
  type SearchIndex,
  type IndexType,
  type RankedResult,
} from '../utils/siteSearch';

const RECENT_KEY = 'mohami_recent_searches';
const MAX_RECENT = 5;

export const TYPE_META: Record<IndexType | 'default', { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  blog:   { label: 'مقال',        icon: FileText,  color: 'text-amber-300',   bg: 'bg-amber-400/15' },
  pillar: { label: 'مرجع شامل',    icon: BookOpen,  color: 'text-purple-300',  bg: 'bg-purple-400/15' },
  page:   { label: 'صفحة',        icon: Layers,    color: 'text-emerald-300', bg: 'bg-emerald-400/15' },
  radar:  { label: 'رصد المحامي',  icon: Radio,     color: 'text-cyan-300',    bg: 'bg-cyan-400/15' },
  form:   { label: 'صيغة قانونية', icon: ScrollText, color: 'text-indigo-300', bg: 'bg-indigo-400/15' },
  default:{ label: 'نتيجة',       icon: Layers,    color: 'text-slate-300',   bg: 'bg-slate-400/15' },
};

const QUICK_LINKS = [
  { label: '📰 المدونة القانونية', href: '/blog/' },
  { label: '📝 صيغ العقود والدعاوي', href: '/legal-forms.html' },
  { label: '🏛️ دليل المحاكم والشهر العقاري', href: '/courts-directory.html' },
  { label: '🧮 الحاسبات القانونية', href: '/legal-calculators.html' },
  { label: '⚖️ مبادئ النقض', href: '/court-precedents.html' },
  { label: '🇸🇦 بوابة السعودية', href: '/saudi-legal-hub.html' },
  { label: '🇦🇪 بوابة الإمارات', href: '/uae-legal-hub.html' },
  { label: '🇴🇲 بوابة عُمان', href: '/oman-legal-hub.html' },
];

const PLACEHOLDERS = [
  'ابحث عن أي موضوع قانوني… مثال: خلع، فصل تعسفي، عقد بيع',
  'جرّب: حضانة، إيجار قديم، حاسبة الميراث، منع سفر',
  'ابحث في 290+ صفحة: مقالات، صيغ، مراجع، راد المحامي',
];

interface Props {
  onOpenFullSearch: (initialQuery?: string) => void;
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  try {
    const list = readRecent().filter(x => x !== q);
    list.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* التخزين غير متاح */
  }
}

export default function HeroSearchBar({ onOpenFullSearch }: Props) {
  const [indexData, setIndexData] = useState<SearchIndex | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [phIdx, setPhIdx] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const indexLoadedRef = useRef(false);

  // Placeholder دوّار
  useEffect(() => {
    const t = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  // تحميل الفهرس مؤجل — عند أول تركيز فقط
  const ensureIndex = useCallback(() => {
    if (indexLoadedRef.current) return;
    indexLoadedRef.current = true;
    loadSearchIndex()
      .then(setIndexData)
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 140);
    return () => clearTimeout(t);
  }, [query]);

  const results: RankedResult[] = useMemo(
    () => (debounced.trim().length >= 2 ? search(indexData, debounced, 8) : []),
    [indexData, debounced]
  );

  useEffect(() => setActiveIdx(results.length ? 0 : -1), [debounced]);

  // إغلاق بالنقر خارجه
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    return () => { clearTimeout(timer); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  // تنقل كيبورد
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      if (results[activeIdx]) {
        pushRecent(q);
        window.open(results[activeIdx].item.url, '_blank', 'noopener,noreferrer');
        setOpen(false);
      } else {
        openFull();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const openFull = () => {
    pushRecent(query.trim());
    setRecent(readRecent());
    setOpen(false);
    onOpenFullSearch(query.trim());
  };

  const showDropdown = open && (
    (query.trim().length >= 2 && results.length > 0) ||
    (query.trim().length < 2 && (recent.length > 0 || true))
  );

  const panel = createPortal(
    <div
      ref={listRef}
      dir="rtl"
      className="absolute top-full mt-2 start-0 end-0 z-[9998] rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: 'rgba(15,23,42,0.97)',
        border: '1px solid rgba(99,102,241,0.3)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* خطأ تحميل الفهرس */}
      {loadError && (
        <div className="px-5 py-6 text-center text-sm text-rose-300 font-bold">
          تعذر تحميل فهرس البحث — تأكد من الاتصال وأعد المحاولة
        </div>
      )}

      {/* نتائج مباشرة */}
      {!loadError && query.trim().length >= 2 && results.length > 0 && (
        <>
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {results.map((r, i) => {
              const meta = TYPE_META[r.item.type] || TYPE_META.default;
              const Icon = meta.icon;
              return (
                <a
                  key={r.item.id}
                  href={r.item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { pushRecent(query.trim()); setOpen(false); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={
                    'flex items-start gap-3 p-3 rounded-xl transition group ' +
                    (i === activeIdx ? 'bg-indigo-500/20 outline outline-1 outline-indigo-400/40' : 'hover:bg-slate-700/30')
                  }
                >
                  <div className={'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ' + meta.bg}>
                    <Icon className={'w-4 h-4 ' + meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-extrabold text-slate-100 truncate mb-0.5"
                      dangerouslySetInnerHTML={{ __html: highlight(r.item.title, debounced) }}
                    />
                    <div
                      className="text-xs text-slate-400 line-clamp-1"
                      dangerouslySetInnerHTML={{ __html: highlight(r.item.description || r.item.snippet, debounced) }}
                    />
                  </div>
                  <span className={'shrink-0 self-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ' + meta.bg + ' ' + meta.color}>
                    {meta.label}
                  </span>
                </a>
              );
            })}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); openFull(); }}
            className="w-full flex items-center justify-center gap-2 py-3 border-t border-slate-700/40 text-xs font-extrabold text-indigo-300 hover:bg-indigo-500/10 transition"
          >
            عرض جميع النتائج في «{query.trim()}» <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      {/* لا نتائج */}
      {!loadError && query.trim().length >= 2 && results.length === 0 && indexData && (
        <div className="px-5 py-8 text-center">
          <div className="text-3xl mb-2 opacity-60">🤷</div>
          <div className="text-sm font-bold text-slate-300 mb-1">لا توجد نتائج لـ «{query}»</div>
          <button onClick={openFull} className="text-xs font-bold text-indigo-300 hover:underline">
            افتح البحث الكامل للتحقق
          </button>
        </div>
      )}

      {/* حالة الفراغ: عمليات سابقة + اختصارات */}
      {query.trim().length < 2 && !loadError && (
        <div className="p-4">
          {recent.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 mb-2">
                <Clock className="w-3.5 h-3.5" /> آخر عمليات البحث
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map(q => (
                  <button
                    key={q}
                    onClick={() => { setQuery(q); inputRef.current?.focus(); }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-700/40 text-slate-200 hover:bg-indigo-500/20 hover:text-indigo-200 border border-slate-600/30 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="text-[11px] font-extrabold text-slate-500 mb-2">اختصارات سريعة</div>
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800/60 text-slate-300 hover:bg-indigo-500/15 hover:text-indigo-200 border border-slate-700/40 transition"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>,
    wrapRef.current || document.body
  );

  return (
    <div ref={wrapRef} className="relative z-30 w-full max-w-2xl mx-auto" data-hero-search>
      <div
        className="flex items-center gap-3 px-5 py-1.5 rounded-2xl shadow-2xl transition-all duration-300 focus-within:border-indigo-400/60 focus-within:shadow-indigo-500/10"
        style={{
          background: 'rgba(15,23,42,0.85)',
          border: '1px solid rgba(99,102,241,0.35)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <Search className="w-5 h-5 text-indigo-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); ensureIndex(); }}
          onFocus={() => { setOpen(true); ensureIndex(); }}
          onKeyDown={onKeyDown}
          placeholder={PLACEHOLDERS[phIdx]}
          className="flex-1 bg-transparent focus:outline-none text-sm md:text-base font-bold text-slate-100 placeholder:text-slate-500 placeholder:font-normal py-3"
          autoComplete="off"
          spellCheck={false}
          aria-label="البحث في محتوى الموقع"
        />
        {!indexData && !loadError && (
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg bg-slate-800/70 border border-slate-600/40 text-[10px] font-mono text-slate-400 shrink-0">Ctrl K</kbd>
        )}
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="text-slate-500 hover:text-slate-200 text-lg leading-none shrink-0 px-1"
            aria-label="مسح"
          >
            ✕
          </button>
        )}
      </div>

      {/* عدّاد الفهرس */}
      {indexData && open && query.trim().length < 2 && (
        <div className="absolute -bottom-6 start-1 end-1 text-center text-[10px] font-bold text-slate-500 pointer-events-none">
          فهرس يغطي {indexData.count.toLocaleString('ar-EG')} صفحة من محتوى المنصة
        </div>
      )}

      {showDropdown && panel}
    </div>
  );
}
