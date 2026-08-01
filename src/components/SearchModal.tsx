/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SearchModal — نافذة البحث الشامل (Full-Text Search).
 *
 * يفتح بـ:
 *  - اختصار لوحة المفاتيح: Ctrl+K (أو Cmd+K على ماك)
 *  - أيقونة البحث في الشريط العلوي (سنضيفها لاحقاً)
 *
 * يبحث في:
 *  - القضايا، الموكلين، الجلسات، المواعيد، المهام،
 *    المعاملات المالية، المستندات.
 *
 * المميزات:
 *  - بحث فوري (real-time) مع debounce خفيف
 *  - فلترة حسب النوع (case/client/session/...)
 *  - تجميع النتائج حسب النوع
 *  - snippet مع highlight للكلمة المطابقة
 *  - تنقل بـ Enter، إغلاق بـ Esc
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Briefcase, Users, Calendar, AlertTriangle,
  Clock, Wallet, FileText, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useFullTextSearch, SearchResult } from '../hooks/useFullTextSearch';
import {
  Case, Client, Session, LegalDeadline, LawTask,
  Transaction, LawDocument
} from '../types';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  cases: Case[];
  clients: Client[];
  sessions: Session[];
  deadlines: LegalDeadline[];
  tasks: LawTask[];
  transactions: Transaction[];
  documents: LawDocument[];
  onNavigateToCase?: (caseId: string) => void;
  onNavigateToClient?: (clientId: string) => void;
  onNavigateToSession?: (sessionId: string) => void;
}

const TYPE_META: Record<SearchResult['type'], {
  label: string; icon: React.ComponentType<any>; color: string; bg: string;
}> = {
  case:        { label: 'قضية',     icon: Briefcase,    color: 'text-indigo-700',  bg: 'bg-indigo-50' },
  client:      { label: 'موكل',     icon: Users,        color: 'text-emerald-700', bg: 'bg-emerald-50' },
  session:     { label: 'جلسة',     icon: Calendar,     color: 'text-indigo-700',   bg: 'bg-indigo-50' },
  deadline:    { label: 'ميعاد',    icon: AlertTriangle,color: 'text-rose-700',    bg: 'bg-rose-50' },
  task:        { label: 'مهمة',     icon: Clock,        color: 'text-blue-700',    bg: 'bg-blue-50' },
  transaction: { label: 'معاملة',   icon: Wallet,       color: 'text-purple-700',  bg: 'bg-purple-50' },
  document:    { label: 'مستند',    icon: FileText,     color: 'text-slate-700',   bg: 'bg-slate-50' }
};

const ALL_TYPES: SearchResult['type'][] = [
  'case', 'client', 'session', 'deadline', 'task', 'transaction', 'document'
];

export default function SearchModal({
  open,
  onClose,
  cases, clients, sessions, deadlines, tasks, transactions, documents,
  onNavigateToCase,
  onNavigateToClient,
  onNavigateToSession
}: SearchModalProps) {

  const { query, setQuery, results, filters, toggleFilter, clearFilters, hasQuery } = useFullTextSearch({
    cases, clients, sessions, deadlines, tasks, transactions, documents
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length, query, filters]);

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery('');
      clearFilters();
    }
  }, [open, setQuery, clearFilters]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, Math.max(0, results.length - 1)));
      } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
        e.preventDefault();
        setActiveIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, results, activeIndex, onClose]);

  // Close on click outside modal (using document listener — most reliable pattern)
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay attaching to avoid closing on the same click that opened the modal
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, onClose]);

  // Group results by type for display
  const grouped = useMemo(() => {
    const map: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!map[r.type]) map[r.type] = [];
      map[r.type].push(r);
    });
    return map;
  }, [results]);

  if (!open) return null;

  function handleSelect(r: SearchResult) {
    // Close modal first
    onClose();

    // Then navigate (use setTimeout to allow modal close to settle)
    setTimeout(() => {
      if (r.type === 'case') onNavigateToCase?.(r.id);
      else if (r.type === 'client') onNavigateToClient?.(r.id);
      else if (r.type === 'session') onNavigateToSession?.(r.id);
      else if (r.type === 'deadline' || r.type === 'task') {
        const caseId = (r.data as any).caseId;
        if (caseId) onNavigateToCase?.(caseId);
      } else if (r.type === 'transaction') {
        const caseId = (r.data as any).caseId;
        if (caseId) onNavigateToCase?.(caseId);
      } else if (r.type === 'document') {
        const caseId = (r.data as any).caseId;
        if (caseId) onNavigateToCase?.(caseId);
      }
    }, 50);
  }

  // Use Portal to escape any parent overflow/stacking context issues
  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 md:pt-24 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث في القضايا، الموكلين، الجلسات، المواعيد، المهام، المستندات..."
            className="flex-1 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none bg-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden md:inline-block text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
            Esc
          </kbd>
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-100 bg-slate-50 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {ALL_TYPES.map(t => {
            const meta = TYPE_META[t];
            const active = filters.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleFilter(t)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition border ${
                  active
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {meta.label} ({grouped[t]?.length || 0})
              </button>
            );
          })}
          {filters.size > 0 && (
            <button
              onClick={clearFilters}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-800 whitespace-nowrap"
            >
              مسح الفلاتر
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!hasQuery ? (
            <EmptyState
              icon={<Search className="w-12 h-12 text-slate-300" />}
              title="ابدأ بالكتابة للبحث"
              hint="جرّب البحث عن: رقم قضية، اسم موكل، تاريخ جلسة، عنوان مستند، أو أي نص من الملاحظات."
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Search className="w-12 h-12 text-slate-300" />}
              title="لا توجد نتائج"
              hint="جرّب كلمات أبسط أو تحقق من الإملاء."
            />
          ) : (
            <div className="py-2">
              {ALL_TYPES.map(type => {
                const items = grouped[type];
                if (!items || items.length === 0) return null;
                const meta = TYPE_META[type];
                const Icon = meta.icon;

                return (
                  <div key={type} className="mb-2">
                    {/* Group header (NOT sticky — to avoid stacking context issues over buttons) */}
                    <div className="px-5 py-1.5 flex items-center gap-2 bg-slate-100 border-b border-slate-200">
                      <div className={`w-5 h-5 rounded ${meta.bg} flex items-center justify-center`}>
                        <Icon className={`w-3 h-3 ${meta.color}`} />
                      </div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                        {meta.label} ({items.length})
                      </span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {/* Items */}
                    {items.map(r => {
                      const globalIndex = results.indexOf(r);
                      const isActive = globalIndex === activeIndex;
                      return (
                        <div
                          key={`${r.type}-${r.id}`}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelect(r);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelect(r);
                            }
                          }}
                          onMouseEnter={() => setActiveIndex(globalIndex)}
                          style={{ position: 'relative', zIndex: 1 }}
                          className={`w-full text-end px-5 py-2.5 flex items-start gap-3 transition cursor-pointer select-none ${
                            isActive ? 'bg-indigo-50 border-e-2 border-indigo-500' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-black text-slate-900 truncate">
                                {r.title}
                              </span>
                              {r.reference && (
                                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                  #{r.reference}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {highlightMatch(r.snippet || r.description, query)}
                            </p>
                          </div>
                          {isActive && <ChevronLeft className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">↑↓</kbd>
              تنقل
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">Enter</kbd>
              فتح
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">Esc</kbd>
              إغلاق
            </span>
          </div>
          {results.length > 0 && (
            <span className="font-bold text-slate-600">
              {results.length} نتيجة
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// ─── Sub-components ──────────────────────────────────────────────────────

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-3 opacity-60">{icon}</div>
      <h3 className="text-sm font-black text-slate-700 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md leading-relaxed">{hint}</p>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!text || !query.trim()) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text;

  return (
    <>
      {text.substring(0, idx)}
      <mark className="bg-indigo-200 text-indigo-900 px-0.5 rounded font-bold">
        {text.substring(idx, idx + query.length)}
      </mark>
      {text.substring(idx + query.length)}
    </>
  );
}
