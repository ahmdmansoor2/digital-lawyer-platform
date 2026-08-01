/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * مكون قسم الملاحظات — واجهة شبيهة بـ Google Keep.
 *
 * الميزات:
 * - ملاحظات نصية + قوائم مهام (checklists)
 * - 9 ألوان للخلفيات
 * - تثبيت (pinned) وأرشفة
 * - تصنيف بالملصقات (labels)
 * - تذكيرات
 * - بحث متقدم
 * - تخزين هجين (Electron IPC + localStorage)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Search, Trash2, Edit, Pin, PinOff, Archive, RotateCcw,
  X, Check, CheckSquare, Square, Palette, Tag, Bell, Calendar,
  Database, AlertCircle, CheckCircle, FileText, ListChecks,
  MoreVertical, Copy, Download, Upload, Filter, ChevronDown,
  Lightbulb, Briefcase, AlertTriangle, Clock,
} from 'lucide-react';
import { Note, NoteColor, ChecklistItem } from '../types_notes';
import { Case } from '../types';

import {
  loadNotesFromLocal,
  saveNotesToLocal,
  hydrateNotesFromDisk,
  getNotesStorageDiagnostics,
  generateNoteId,
  generateChecklistItemId,
  clearCustomNotes,
  loadDeletedNoteIds,
  saveDeletedNoteId,
} from '../utils/notesStorage';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import { logger } from '../utils/logger';

// ألوان الملاحظات — خلفية + نص
const COLOR_STYLE: Record<NoteColor, { bg: string; border: string; text: string; label: string }> = {
  default: { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-800', label: 'افتراضي' },
  red:    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', label: 'أحمر' },
  orange: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', label: 'رمادي' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900', label: 'أصفر' },
  green:  { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', label: 'أخضر' },
  teal:   { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900', label: 'تركوازي' },
  blue:   { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', label: 'أزرق' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', label: 'بنفسجي' },
  pink:   { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900', label: 'وردي' },
};

const COLOR_KEYS: NoteColor[] = ['default', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];

interface NotesProps {
  cases: Case[];
}

interface EditingState {
  id: string | null;       // null = new
  isOpen: boolean;
  type: 'text' | 'checklist';
  title: string;
  content: string;
  checklist: ChecklistItem[];
  color: NoteColor;
  labels: string[];
  reminderAt: string;
  caseId: string;
}

const EMPTY_EDITING: EditingState = {
  id: null,
  isOpen: false,
  type: 'text',
  title: '',
  content: '',
  checklist: [],
  color: 'default',
  labels: [],
  reminderAt: '',
  caseId: '',
};

const Notes = React.memo(function Notes({ cases }: NotesProps) {
  const confirm = useConfirm();
  // ===== الحالة =====
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = loadNotesFromLocal();
    const deletedIds = loadDeletedNoteIds();
    if (saved.length === 0) return [];
    const byId = new Map<string, Note>();
    saved.forEach(n => byId.set(n.id, n));
    return Array.from(byId.values());
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<'all' | 'pinned' | 'archive' | 'label'>('all');
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState>(EMPTY_EDITING);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');

  // ===== حفظ تلقائي =====
  useEffect(() => { saveNotesToLocal(notes); }, [notes]);

  // ===== تحميل من القرص =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const diskResult = await hydrateNotesFromDisk();
        if (cancelled) return;
        if (diskResult && diskResult.count > 0) {
          const data = loadNotesFromLocal();
          const deletedIds = loadDeletedNoteIds();
          const merged = (() => {
            const byId = new Map<string, Note>();
            data.forEach(n => byId.set(n.id, n));
            return Array.from(byId.values());
          })();
          setNotes(merged);
          logger.debug('[Notes] ✅ تم استرداد البيانات من القرص');
        }
        setLoadError(null);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'فشل تحميل الملاحظات');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ===== كل الملصقات المتاحة =====
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => n.labels?.forEach(l => set.add(l)));
    return Array.from(set).sort();
  }, [notes]);

  // ===== الإحصائيات =====
  const stats = useMemo(() => {
    const active = notes.filter(n => !n.isArchived);
    const archived = notes.filter(n => n.isArchived);
    return {
      total: notes.length,
      active: active.length,
      pinned: active.filter(n => n.isPinned).length,
      text: active.filter(n => n.type === 'text').length,
      checklist: active.filter(n => n.type === 'checklist').length,
      withReminder: active.filter(n => n.reminderAt && !n.reminderDone).length,
      archived: archived.length,
    };
  }, [notes]);

  // ===== الفلترة والبحث =====
  const filtered = useMemo(() => {
    let result = notes;
    if (filterView === 'pinned') result = result.filter(n => n.isPinned && !n.isArchived);
    else if (filterView === 'archive') result = result.filter(n => n.isArchived);
    else if (filterView === 'label' && activeLabel) result = result.filter(n => !n.isArchived && n.labels?.includes(activeLabel));
    else result = result.filter(n => !n.isArchived);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(n => {
        if (n.title?.toLowerCase().includes(q)) return true;
        if (n.content?.toLowerCase().includes(q)) return true;
        if (n.labels?.some(l => l.toLowerCase().includes(q))) return true;
        if (n.checklist?.some(c => c.text.toLowerCase().includes(q))) return true;
        return false;
      });
    }
    // ترتيب: المثبت أولاً، ثم الأحدث
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, searchQuery, filterView, activeLabel]);

  // ===== CRUD =====
  const openNew = (type: 'text' | 'checklist' = 'text') => {
    setEditing({ ...EMPTY_EDITING, isOpen: true, type });
  };

  const openEdit = (note: Note) => {
    setEditing({
      id: note.id,
      isOpen: true,
      type: note.type,
      title: note.title || '',
      content: note.content || '',
      checklist: note.checklist ? [...note.checklist] : [],
      color: note.color,
      labels: note.labels ? [...note.labels] : [],
      reminderAt: note.reminderAt || '',
      caseId: note.caseId || '',
    });
  };

  const saveEditing = async () => {
    if (!editing.title.trim() && !editing.content.trim() && editing.checklist.length === 0) {
      await showAlert('لا يمكن حفظ ملاحظة فارغة. اكتب عنوان أو محتوى أو أضف عناصر.');
      return;
    }
    const now = new Date().toISOString();
    const linkedCase = editing.caseId ? cases.find(c => c.id === editing.caseId) : undefined;
    const caseNumber = linkedCase?.caseNumber;
    const clientId = linkedCase?.clientId;
    if (editing.id) {
      // تعديل
      setNotes(prev => prev.map(n =>
        n.id === editing.id
          ? {
              ...n,
              title: editing.title.trim() || undefined,
              content: editing.type === 'text' ? editing.content : undefined,
              checklist: editing.type === 'checklist' ? editing.checklist : undefined,
              color: editing.color,
              labels: editing.labels.length > 0 ? editing.labels : undefined,
              reminderAt: editing.reminderAt || undefined,
              caseId: editing.caseId || undefined,
              caseNumber: caseNumber || undefined,
              clientId: clientId || undefined,
              updatedAt: now,
            }
          : n
      ));
    } else {
      // إضافة جديدة
      const newNote: Note = {
        id: generateNoteId(),
        type: editing.type,
        title: editing.title.trim() || undefined,
        content: editing.type === 'text' ? editing.content : undefined,
        checklist: editing.type === 'checklist' ? editing.checklist : undefined,
        color: editing.color,
        isPinned: false,
        isArchived: false,
        labels: editing.labels.length > 0 ? editing.labels : undefined,
        reminderAt: editing.reminderAt || undefined,
        reminderDone: false,
        caseId: editing.caseId || undefined,
        caseNumber: caseNumber || undefined,
        clientId: clientId || undefined,
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      };
      setNotes(prev => [newNote, ...prev]);
    }
    setEditing(EMPTY_EDITING);
  };

  const togglePin = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n));
  };

  const toggleArchive = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? {
      ...n,
      isArchived: !n.isArchived,
      archivedAt: !n.isArchived ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    } : n));
  };

  const deleteNote = async (id: string) => {
    if (!await confirm('هل أنت متأكد من حذف هذه الملاحظة نهائياً؟')) return;
    saveDeletedNoteId(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const duplicateNote = (id: string) => {
    const original = notes.find(n => n.id === id);
    if (!original) return;
    const now = new Date().toISOString();
    const newNote: Note = {
      ...original,
      id: generateNoteId(),
      title: (original.title || 'بدون عنوان') + ' (نسخة)',
      isPinned: false,
      checklist: original.checklist?.map(c => ({ ...c, id: generateChecklistItemId() })),
      createdAt: now,
      updatedAt: now,
    };
    setNotes(prev => [newNote, ...prev]);
  };

  const toggleChecklistItem = (noteId: string, itemId: string) => {
    setNotes(prev => prev.map(n =>
      n.id === noteId
        ? {
            ...n,
            checklist: n.checklist?.map(c => c.id === itemId ? { ...c, isDone: !c.isDone } : c),
            updatedAt: new Date().toISOString(),
          }
        : n
    ));
  };

  const addChecklistItemToNote = (noteId: string) => {
    const text = prompt('نص العنصر الجديد:');
    if (!text?.trim()) return;
    setNotes(prev => prev.map(n =>
      n.id === noteId
        ? {
            ...n,
            checklist: [...(n.checklist || []), { id: generateChecklistItemId(), text: text.trim(), isDone: false, order: (n.checklist?.length || 0) + 1 }],
            updatedAt: new Date().toISOString(),
          }
        : n
    ));
  };

  const removeChecklistItem = (noteId: string, itemId: string) => {
    setNotes(prev => prev.map(n =>
      n.id === noteId
        ? {
            ...n,
            checklist: n.checklist?.filter(c => c.id !== itemId),
            updatedAt: new Date().toISOString(),
          }
        : n
    ));
  };

  const toggleReminderDone = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, reminderDone: !n.reminderDone, updatedAt: new Date().toISOString() } : n));
  };

  // ===== Checklist items in editing =====
  const addEditingChecklistItem = () => {
    setEditing(prev => ({
      ...prev,
      checklist: [...prev.checklist, { id: generateChecklistItemId(), text: '', isDone: false, order: prev.checklist.length + 1 }],
    }));
  };

  const updateEditingChecklistItem = (id: string, field: keyof ChecklistItem, value: any) => {
    setEditing(prev => ({
      ...prev,
      checklist: prev.checklist.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  };

  const removeEditingChecklistItem = (id: string) => {
    setEditing(prev => ({
      ...prev,
      checklist: prev.checklist.filter(c => c.id !== id),
    }));
  };

  // ===== إدارة الملصقات =====
  const handleAddLabel = () => {
    const v = labelInput.trim();
    if (!v) return;
    if (!editing.labels.includes(v)) {
      setEditing(prev => ({ ...prev, labels: [...prev.labels, v] }));
    }
    setLabelInput('');
  };

  const removeLabel = (label: string) => {
    setEditing(prev => ({ ...prev, labels: prev.labels.filter(l => l !== label) }));
  };

  // ===== التشخيص =====
  const handleDiagnostics = async () => {
    const d = await getNotesStorageDiagnostics();
    await showAlert(
      `=== تشخيص تخزين الملاحظات ===\n` +
      `• localStorage: ${d.localStorageAvailable ? '✅ متاح' : '❌ غير متاح'}\n` +
      `• ملف القرص: ${d.electronDiskPath || 'غير متاح (متصفح)'}\n` +
      `• حالة القرص: ${d.electronDiskWritable ? '✅ قابل للكتابة' : '❌ غير قابل'}\n` +
      `• في الذاكرة: ${d.inMemoryCount} ملاحظة\n` +
      `• في localStorage: ${d.inLocalStorageCount} ملاحظة`
    );
  };

  // ===== تصدير JSON =====
  const handleExport = () => {
    const json = JSON.stringify(notes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== عرض بطاقة ملاحظة =====
  const renderNoteCard = (note: Note) => {
    const color = COLOR_STYLE[note.color];
    const completedItems = note.checklist?.filter(c => c.isDone).length || 0;
    const totalItems = note.checklist?.length || 0;

    return (
      <div
        key={note.id}
        className={`${color.bg} border ${color.border} rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer group`}
        onClick={() => openEdit(note)}
      >
        {note.isPinned && (
          <div className="absolute top-2 start-2 z-10">
            <Pin className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500" />
          </div>
        )}

        <div className="p-4 space-y-2">
          {note.title && (
            <h3 className={`font-bold text-sm ${color.text} line-clamp-2 pe-6`}>{note.title}</h3>
          )}

          {note.type === 'text' && note.content && (
            <p className={`text-xs ${color.text} opacity-80 line-clamp-6 whitespace-pre-wrap leading-relaxed`}>
              {note.content}
            </p>
          )}

          {note.type === 'checklist' && note.checklist && note.checklist.length > 0 && (
            <div className="space-y-1">
              {note.checklist.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => toggleChecklistItem(note.id, item.id)}
                    className="mt-0.5 shrink-0"
                  >
                    {item.isDone ? (
                      <CheckSquare className={`w-3.5 h-3.5 ${color.text} opacity-70`} />
                    ) : (
                      <Square className={`w-3.5 h-3.5 ${color.text} opacity-50`} />
                    )}
                  </button>
                  <span className={`text-xs ${color.text} ${item.isDone ? 'line-through opacity-60' : ''} truncate`}>
                    {item.text || 'بدون نص'}
                  </span>
                </div>
              ))}
              {note.checklist.length > 5 && (
                <p className={`text-[10px] ${color.text} opacity-60`}>
                  + {note.checklist.length - 5} عناصر أخرى...
                </p>
              )}
              {totalItems > 0 && (
                <div className="w-full bg-black/10 rounded-full h-1 mt-2">
                  <div
                    className="bg-current rounded-full h-1 transition-all"
                    style={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* شريط سفلي: ملصقات + تذكير */}
          <div className="flex items-center justify-between gap-1 flex-wrap pt-1">
            <div className="flex items-center gap-1 flex-wrap">
              {note.labels?.slice(0, 2).map(l => (
                <span key={l} className={`text-[9px] px-1.5 py-0.5 rounded ${color.text} bg-black/5 font-bold`}>
                  {l}
                </span>
              ))}
              {note.reminderAt && !note.reminderDone && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold flex items-center gap-1`}>
                  <Bell className="w-2.5 h-2.5" />
                  {new Date(note.reminderAt).toLocaleDateString('ar-EG')}
                </span>
              )}
            </div>
            <span className={`text-[9px] ${color.text} opacity-50`}>
              {new Date(note.updatedAt).toLocaleDateString('ar-EG')}
            </span>
          </div>
        </div>

        {/* أزرار الإجراءات السريعة — تظهر عند hover */}
        <div className="absolute bottom-2 start-2 end-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => togglePin(note.id)}
            className="p-1.5 bg-white/80 hover:bg-white rounded text-slate-600 transition"
            title={note.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
          >
            {note.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
          <button
            onClick={() => duplicateNote(note.id)}
            className="p-1.5 bg-white/80 hover:bg-white rounded text-slate-600 transition"
            title="تكرار"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={() => toggleArchive(note.id)}
            className="p-1.5 bg-white/80 hover:bg-white rounded text-slate-600 transition"
            title={note.isArchived ? 'استعادة' : 'أرشفة'}
          >
            {note.isArchived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
          </button>
          <button
            onClick={() => deleteNote(note.id)}
            className="p-1.5 bg-white/80 hover:bg-rose-100 rounded text-rose-600 transition"
            title="حذف نهائي"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* الرأس */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12" />
        <div className="relative z-10 flex items-center justify-between gap-4 w-full">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> الملاحظات السريعة
              </span>
              {isLoading && (
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                  جاري التحميل
                </span>
              )}
              {!isLoading && !loadError && (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> تم التحميل
                </span>
              )}
              {loadError && (
                <span className="bg-red-500/20 text-red-300 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> فشل التحميل
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Lightbulb className="h-6 w-6" />
              الملاحظات السريعة
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              دفتر ملاحظات شبيه Google Keep — ملاحظات نصيɡ قوائم مهام، ملصقاʡ وتذكيرات.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-center min-w-[60px]">
              <div className="text-base font-black text-white">{stats.active}</div>
              <div className="text-slate-400 text-[10px]">نشطة</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-center min-w-[60px]">
              <div className="text-base font-black text-white">{stats.pinned}</div>
              <div className="text-slate-400 text-[10px]">مثبتة</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-center min-w-[60px]">
              <div className="text-base font-black text-white">{stats.checklist}</div>
              <div className="text-slate-400 text-[10px]">قوائم</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-center min-w-[60px]">
              <div className="text-base font-black text-white">{stats.withReminder}</div>
              <div className="text-slate-400 text-[10px]">تذكيرات</div>
            </div>
          </div>
        </div>
      </div>

      {/* شريط الأدوات */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث في الملاحظات..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pe-9 ps-3 py-2 text-xs outline-none focus:border-indigo-400"
            />
          </div>

          {/* أزرار نوع الملاحظة الجديد */}
          <button
            onClick={() => openNew('text')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-sm"
          >
            <Plus className="w-3 h-3" /> ملاحظة
          </button>
          <button
            onClick={() => openNew('checklist')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-sm"
          >
            <ListChecks className="w-3 h-3" /> قائمة مهام
          </button>

          <button
            onClick={handleExport}
            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
            title="تصدير JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDiagnostics}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition cursor-pointer"
            title="تشخيص التخزين"
          >
            <Database className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={async () => {
              if (!await confirm('سيتم مسح كل الملاحظات المخصصة والإبقاء على البيانات الافتراضية فقط. متابعɿ')) return;
              const r = clearCustomNotes();
              setNotes(prev => prev.filter(n => n.source === 'mock'));
              await showAlert(`تم مسح ${r.removed} ملاحظة مخصصة.`);
            }}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
            title="إعادة الضبط"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* فلاتر */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-500">عرض:</span>
          {[
            { v: 'all' as const, l: 'الكل', i: Lightbulb },
            { v: 'pinned' as const, l: 'المثبتة', i: Pin },
            { v: 'archive' as const, l: 'الأرشيف', i: Archive },
          ].map(f => {
            const Icon = f.i;
            return (
              <button
                key={f.v}
                onClick={() => { setFilterView(f.v); setActiveLabel(null); }}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                  filterView === f.v ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3 h-3" />
                {f.l}
                {f.v === 'archive' && stats.archived > 0 && <span className="text-[9px] opacity-70">({stats.archived})</span>}
              </button>
            );
          })}

          {allLabels.length > 0 && (
            <>
              <span className="text-[10px] font-bold text-slate-500 me-2">ملصقات:</span>
              {allLabels.map(l => (
                <button
                  key={l}
                  onClick={() => { setFilterView('label'); setActiveLabel(l); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    activeLabel === l && filterView === 'label'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                   <Tag className="w-2.5 h-2.5 inline ms-0.5" />
                  {l}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* شبكة الملاحظات */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
          <Lightbulb className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-500">
            {searchQuery.trim()
              ? 'لا توجد ملاحظات تطابق البحث'
              : filterView === 'archive'
              ? 'لا توجد ملاحظات مؤرشفة'
              : filterView === 'pinned'
              ? 'لا توجد ملاحظات مثبتة'
              : 'لا توجد ملاحظات'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">اضغط على زر "+ ملاحظة" لبدء الكتابة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(renderNoteCard)}
        </div>
      )}

      {/* مودال التعديل/الإضافة */}
      {editing.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(EMPTY_EDITING)}>
          <div className={`${COLOR_STYLE[editing.color].bg} border-2 ${COLOR_STYLE[editing.color].border} rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={e => e.stopPropagation()}>
            {/* نوع + إغلاق */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 bg-white/60 rounded-lg p-1">
                <button
                  onClick={() => setEditing(prev => ({ ...prev, type: 'text' }))}
                  className={`px-3 py-1 text-[11px] font-bold rounded transition ${
                    editing.type === 'text' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  }`}
                >
                   <FileText className="w-3 h-3 inline ms-1" /> نص
                </button>
                <button
                  onClick={() => setEditing(prev => ({ ...prev, type: 'checklist' }))}
                  className={`px-3 py-1 text-[11px] font-bold rounded transition ${
                    editing.type === 'checklist' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  }`}
                >
                   <ListChecks className="w-3 h-3 inline ms-1" /> قائمة
                </button>
              </div>
              <button onClick={() => setEditing(EMPTY_EDITING)} className="p-1.5 hover:bg-white/50 rounded-lg cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* العنوان */}
            <input
              value={editing.title}
              onChange={e => setEditing(prev => ({ ...prev, title: e.target.value }))}
              placeholder="العنوان"
              className="w-full bg-white/70 border border-slate-200 rounded-xl px-3 py-2 text-base font-bold outline-none focus:bg-white mb-3"
              autoFocus
            />

            {/* المحتوى حسب النوع */}
            {editing.type === 'text' ? (
              <textarea
                value={editing.content}
                onChange={e => setEditing(prev => ({ ...prev, content: e.target.value }))}
                placeholder="اكتب ملاحظتك هنا..."
                className="w-full bg-white/70 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:bg-white min-h-[180px] resize-y leading-relaxed"
              />
            ) : (
              <div className="space-y-2 mb-3">
                {editing.checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2 bg-white/70 rounded-lg p-2">
                    <button onClick={() => updateEditingChecklistItem(item.id, 'isDone', !item.isDone)}>
                      {item.isDone ? <CheckSquare className="w-4 h-4 text-slate-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </button>
                    <input
                      value={item.text}
                      onChange={e => updateEditingChecklistItem(item.id, 'text', e.target.value)}
                      placeholder="عنصر..."
                      className={`flex-1 bg-transparent outline-none text-sm ${item.isDone ? 'line-through opacity-60' : ''}`}
                    />
                    <button onClick={() => removeEditingChecklistItem(item.id)} className="text-rose-500 hover:text-rose-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addEditingChecklistItem}
                  className="w-full bg-white/70 hover:bg-white border border-dashed border-slate-300 rounded-xl py-2 text-xs font-bold text-slate-600 transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> إضافة عنصر
                </button>
              </div>
            )}

            {/* شريط الأدوات السفلي */}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
              {/* الملصقات */}
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {editing.labels.map(l => (
                  <span key={l} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold flex items-center gap-1">
                    {l}
                    <button onClick={() => removeLabel(l)} className="text-slate-400 hover:text-rose-600">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  value={labelInput}
                  onChange={e => setLabelInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLabel(); } }}
                  placeholder="ملصق + Enter"
                  className="text-[10px] bg-white/70 border border-slate-200 rounded px-2 py-1 outline-none focus:bg-white w-32"
                />
              </div>

              {/* ربط قضية */}
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={editing.caseId}
                  onChange={e => setEditing(prev => ({ ...prev, caseId: e.target.value }))}
                  className="text-[10px] bg-white/70 border border-slate-200 rounded px-2 py-1 outline-none focus:bg-white"
                >
                  <option value="">بدون ربط</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.caseNumber} — {c.claimSubject}</option>
                  ))}
                </select>
                {editing.caseId && (
                  <button onClick={() => setEditing(prev => ({ ...prev, caseId: '' }))} className="text-rose-500 hover:text-rose-700">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* التذكير */}
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="datetime-local"
                  value={editing.reminderAt}
                  onChange={e => setEditing(prev => ({ ...prev, reminderAt: e.target.value }))}
                  className="text-[10px] bg-white/70 border border-slate-200 rounded px-2 py-1 outline-none focus:bg-white"
                />
                {editing.reminderAt && (
                  <button onClick={() => setEditing(prev => ({ ...prev, reminderAt: '' }))} className="text-rose-500 hover:text-rose-700">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* الألوان */}
              <div className="flex items-center gap-2 flex-wrap">
                <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {COLOR_KEYS.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditing(prev => ({ ...prev, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 ${COLOR_STYLE[c].bg} ${COLOR_STYLE[c].border} transition ${
                      editing.color === c ? 'ring-2 ring-offset-1 ring-slate-700 scale-110' : 'hover:scale-110'
                    }`}
                    title={COLOR_STYLE[c].label}
                  />
                ))}
              </div>
            </div>

            {/* أزرار الحفظ والإلغاء */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditing(EMPTY_EDITING)}
                className="flex-1 bg-white/80 hover:bg-white text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition border border-slate-200"
              >
                إلغاء
              </button>
              <button
                onClick={saveEditing}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition shadow-sm"
              >
                {editing.id ? 'حفظ التعديلات' : 'إنشاء الملاحظة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Notes;
