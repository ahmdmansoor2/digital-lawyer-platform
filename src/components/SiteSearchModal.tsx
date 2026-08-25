/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SiteSearchModal — نافذة البحث في محتوى الموقع (مقالات، مراجع، مكتبة).
 *
 * يفتح بـ:
 *  - اختصار لوحة المفاتيح: Ctrl+Shift+K (أو Cmd+Shift+K على ماك)
 *  - أيقونة البحث في الشريط العلوي
 *
 * يبحث في /search-index.json — ملف JSON يحوي كل صفحات الموقع العام.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, FileText, BookOpen, Layers, ExternalLink, Radio, ScrollText, Globe } from 'lucide-react';
import {
  loadSearchIndex,
  search as runSearch,
  highlight,
  type SearchIndex,
  type IndexType,
} from '../utils/siteSearch';

const TYPE_META: Record<IndexType | 'default', { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  blog:   { label: 'مقال',         icon: FileText,   color: 'text-amber-300',   bg: 'bg-amber-400/15' },
  pillar: { label: 'مرجع شامل',     icon: BookOpen,   color: 'text-purple-300',  bg: 'bg-purple-400/15' },
  page:   { label: 'صفحة',         icon: Layers,     color: 'text-emerald-300', bg: 'bg-emerald-400/15' },
  radar:  { label: 'رصد المحامي',   icon: Radio,      color: 'text-cyan-300',    bg: 'bg-cyan-400/15' },
  form:   { label: 'صيغة قانونية',  icon: ScrollText, color: 'text-indigo-300',  bg: 'bg-indigo-400/15' },
  default:{ label: 'نتيجة',        icon: Globe,      color: 'text-slate-300',   bg: 'bg-slate-400/15' },
};

interface SiteSearchModalProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function SiteSearchModal({ open, onClose, initialQuery }: SiteSearchModalProps) {
  const [indexData, setIndexData] = useState<SearchIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // حمّل الفهرس عند فتح الـ modal أول مرة
  useEffect(() => {
    if (!open || indexData) return;
    loadSearchIndex()
      .then((data: SearchIndex) => setIndexData(data))
      .catch(err => {
        console.error('[SiteSearch] فشل تحميل الفهرس:', err);
        setLoadError(String(err));
      });
  }, [open, indexData]);

  // استعلام مبدئي يُمرر من شريط البحث الرئيسي
  useEffect(() => {
    if (open) {
      setQuery(initialQuery || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounce للبحث
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 130);
    return () => clearTimeout(t);
  }, [query]);

  // Reset
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const results = useMemo(() => runSearch(indexData, debounced), [indexData, debounced]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault();
        window.open(results[activeIndex].item.url, '_blank', 'noopener,noreferrer');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, results, activeIndex, onClose]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('pointerdown', handlePointerDown), 0);
    return () => { clearTimeout(timer); document.removeEventListener('pointerdown', handlePointerDown); };
  }, [open, onClose]);

  // Scroll active into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('.ss-active') as HTMLElement | null;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 md:pt-24 px-4"
      style={{ backgroundColor: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="بحث في الموقع"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        dir="rtl"
        style={{
          background: 'rgba(15,23,42,0.96)',
          border: '1px solid rgba(99,102,241,0.25)',
          maxHeight: 'calc(100vh - 120px)',
        }}
      >
        {/* شريط البحث */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/40" style={{ background: 'rgba(99,102,241,0.05)' }}>
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث في محتوى الموقع: مقالات، مراجع شاملة، المكتبة القانونية…"
            className="flex-1 text-sm font-bold text-slate-100 placeholder:text-slate-500 placeholder:font-normal focus:outline-none bg-transparent"
            autoComplete="off"
            spellCheck={false}
          />
          {!indexData && !loadError && (
            <span className="text-[10px] font-bold text-slate-500">⏳ يحمّل الفهرس…</span>
          )}
          {loadError && (
            <span className="text-[10px] font-bold text-rose-400">فشل التحميل</span>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 transition"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* النتائج */}
        <div ref={listRef} className="overflow-y-auto flex-1 p-2">
          {!query.trim() && (
            <div className="text-center py-14 px-6">
              <div className="text-5xl mb-3 opacity-70">🔍</div>
              <div className="text-sm font-bold text-slate-300 mb-1">
                ابدأ الكتابة للبحث في {indexData ? indexData.count : '…'} صفحة محتوى
              </div>
              <div className="text-xs text-slate-500">
                مقالات • مراجع شاملة • المكتبة القانونية • صفحات الموقع
              </div>
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="text-center py-14 px-6">
              <div className="text-5xl mb-3 opacity-70">🤷</div>
              <div className="text-sm font-bold text-slate-300 mb-1">
                لا توجد نتائج لـ "{query}"
              </div>
              <div className="text-xs text-slate-500">جرّب كلمات أخرى أو تحقق من الإملاء</div>
            </div>
          )}

          {results.map((r, i) => {
            const item = r.item;
            const meta = TYPE_META[item.type] || TYPE_META.page;
            const Icon = meta.icon;
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className={
                  'flex items-start gap-3 p-3 rounded-xl transition group ' +
                  (i === activeIndex
                    ? 'bg-indigo-500/15 outline outline-1 outline-indigo-400/40'
                    : 'hover:bg-slate-700/30')
                }
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className={'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ' + meta.bg}>
                  <Icon className={'w-4 h-4 ' + meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-extrabold text-slate-100 mb-1 truncate"
                    dangerouslySetInnerHTML={{ __html: highlight(item.title, debounced) }}
                  />
                  <div
                    className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-1.5"
                    dangerouslySetInnerHTML={{ __html: highlight(item.description || item.snippet, debounced) }}
                  />
                  <div className="flex items-center gap-2 flex-wrap text-[10px]">
                    <span className={'px-2 py-0.5 rounded-full font-extrabold ' + meta.bg + ' ' + meta.color}>
                      {meta.label}
                    </span>
                    {item.category && (
                      <span className="text-slate-500 font-bold">{item.category}</span>
                    )}
                    <span className="text-slate-600 font-mono truncate max-w-[180px]">
                      {item.url.replace('https://mohamidigital.online', '')}
                    </span>
                  </div>
                </div>
                <ExternalLink className="shrink-0 w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition mt-2" />
              </a>
            );
          })}
        </div>

        {/* فوتر */}
        <div className="flex items-center gap-4 flex-wrap px-5 py-2.5 border-t border-slate-700/30 text-[10px] text-slate-500 font-bold" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <span><kbd className="px-1.5 py-0.5 bg-slate-700/40 border border-slate-600/40 rounded font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-700/40 border border-slate-600/40 rounded font-mono text-[10px]">↓</kbd> للتنقل</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-700/40 border border-slate-600/40 rounded font-mono text-[10px]">Enter</kbd> للفتح</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-700/40 border border-slate-600/40 rounded font-mono text-[10px]">Esc</kbd> للإغلاق</span>
          <span className="mr-auto text-indigo-400">
            {indexData ? `${indexData.count} صفحة مفهرسة` : ''}
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
