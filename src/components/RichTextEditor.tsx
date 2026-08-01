/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RichTextEditor — محرر نصوص متقدم قائم على TipTap (النسخة الاحترافية الكاملة).
 *
 * يُستخدم في:
 *  - مذكرات القضايا
 *  - ملاحظات القضايا والجلسات
 *  - موضوع الدعوى
 *  - قرارات المحكمة
 *  - بنود العقود
 *
 * المميزات (v2.8.0):
 *  - تنسيق النص (Bold, Italic, Underline, Strikethrough, Highlight)
 *  - العناوين (H1, H2, H3)
 *  - القوائم (نقطية، مرقمة)
 *  - الاقتباسات
 *  - المحاذاة (يمين، وسط، يسار)
 *  - الروابط (Links)
 *  - الجداول (Tables) — لبنود العقود والجداول الزمنية
 *  - تراجع / إعادة
 *  - **قوالب جاهزة** (مذكرات، عقود، إدراج نصوص)
 *  - **Snippets سريعة** (عبارات قانونية متكررة)
 *  - دعم كامل للعربية RTL
 *  - Backward compatible مع النصوص القديمة
 *
 * الـ API:
 *  - value: string (HTML)
 *  - onChange(html: string): void
 *  - placeholder: string
 *  - minHeight: number
 *  - showTemplates: boolean (default true)
 *  - className: string
 */

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote,
  AlignRight, AlignCenter, AlignLeft,
  Undo, Redo, Type,
  Table as TableIcon, Link as LinkIcon, FileText, Sparkles, ChevronDown
} from 'lucide-react';
import { LEGAL_TEMPLATES, LEGAL_SNIPPETS, type LegalTemplate } from '../data/legalTemplates';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  showTemplates?: boolean;
  className?: string;
}

// Helper: detect if value is HTML or plain text
function normalizeInitialValue(value: string): string {
  if (!value) return '';
  if (value.trim().startsWith('<')) return value;
  return value
    .split('\n')
    .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p></p>')
    .join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ToolButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolButton({ active, onClick, title, children, disabled }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition flex items-center justify-center ${
        active
          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function ToolDivider() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5" />;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'اكتب هنا...',
  minHeight = 120,
  showTemplates = true,
  className = ''
}: RichTextEditorProps) {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSnippetMenu, setShowSnippetMenu] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'right'
      }),
      Placeholder.configure({ placeholder }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'tiptap-table' }
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'tiptap-link', rel: 'noopener noreferrer', target: '_blank' }
      }),
      Highlight.configure({ multicolor: false })
    ],
    content: normalizeInitialValue(value),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content focus:outline-none',
        dir: 'rtl',
        style: `min-height: ${minHeight}px;`
      }
    }
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml && value !== normalizeInitialValue(currentHtml)) {
      editor.commands.setContent(normalizeInitialValue(value), false);
    }
  }, [value, editor]);

  useEffect(() => {
    return () => { editor?.destroy(); };
  }, [editor]);

  if (!editor) {
    return (
      <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-400 ${className}`} style={{ minHeight: `${minHeight}px` }}>
        جاري تحميل المحرر...
      </div>
    );
  }

  // ─── Template insertion ───────────────────────────────────────────────
  const insertTemplate = (template: LegalTemplate) => {
    // Insert the template HTML at the current cursor position
    editor.commands.insertContent(template.html);
    setShowTemplateMenu(false);
  };

  // ─── Snippet insertion ───────────────────────────────────────────────
  const insertSnippet = (text: string) => {
    editor.commands.insertContent(text);
    setShowSnippetMenu(false);
  };

  // ─── Link insertion ──────────────────────────────────────────────────
  const insertLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  // ─── Table operations ───────────────────────────────────────────────
  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-100 transition ${className}`}>
      {/* ─── Toolbar ─── */}
      <div className="bg-slate-50 border-b border-slate-200 p-1.5 flex items-center gap-0.5 flex-wrap">
        {/* Templates menu (optional) */}
        {showTemplates && (
          <>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowTemplateMenu(!showTemplateMenu); setShowSnippetMenu(false); }}
                className="px-2 py-1.5 rounded text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 transition flex items-center gap-1 border border-indigo-200"
                title="قوالب جاهزة"
              >
                <Sparkles className="w-3 h-3" /> قوالب <ChevronDown className="w-2.5 h-2.5" />
              </button>
              {showTemplateMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTemplateMenu(false)} />
                  <div className="absolute top-full mt-1 end-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl w-72 max-h-80 overflow-y-auto">
                    <div className="bg-indigo-50 px-3 py-2 border-b border-indigo-200 text-[10px] font-black text-indigo-800 sticky top-0 z-10">
                      ✨ اختر قالب جاهز
                    </div>
                    {(['header', 'memo', 'contract', 'citation'] as const).map(cat => {
                      const items = LEGAL_TEMPLATES.filter(t => t.category === cat);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat} className="border-b border-slate-100 last:border-b-0">
                          <div className="px-3 py-1 text-[9px] font-black text-slate-500 bg-slate-50 uppercase">
                            {cat === 'header' ? '📋 عناوين' : cat === 'memo' ? '📝 مذكرات' : cat === 'contract' ? '📄 عقود' : '⚖️ إدراج قانوني'}
                          </div>
                          {items.map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => insertTemplate(t)}
                              className="w-full text-end px-3 py-2 hover:bg-indigo-50 border-t border-slate-100 first:border-t-0 transition"
                            >
                              <div className="text-xs font-bold text-slate-800">{t.label}</div>
                              <div className="text-[10px] text-slate-500 line-clamp-1">{t.description}</div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowSnippetMenu(!showSnippetMenu); setShowTemplateMenu(false); }}
                className="px-2 py-1.5 rounded text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 transition flex items-center gap-1 border border-indigo-200"
                title="عبارات سريعة"
              >
                <FileText className="w-3 h-3" /> عبارات <ChevronDown className="w-2.5 h-2.5" />
              </button>
              {showSnippetMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSnippetMenu(false)} />
                  <div className="absolute top-full mt-1 end-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl w-80 max-h-80 overflow-y-auto">
                    <div className="bg-indigo-50 px-3 py-2 border-b border-indigo-200 text-[10px] font-black text-indigo-800 sticky top-0 z-10">
                      ⚡ إدراج عبارة سريعة
                    </div>
                    <div className="border-b border-slate-100">
                      <div className="px-3 py-1 text-[9px] font-black text-slate-500 bg-slate-50 uppercase">عبارات شائعة</div>
                      {LEGAL_SNIPPETS.filter(s => s.category === 'phrase').map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => insertSnippet(s.text)}
                          className="w-full text-end px-3 py-2 hover:bg-indigo-50 border-t border-slate-100 first:border-t-0 transition"
                        >
                          <div className="text-xs font-bold text-slate-800">{s.label}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">{s.text}</div>
                        </button>
                      ))}
                    </div>
                    <div>
                      <div className="px-3 py-1 text-[9px] font-black text-slate-500 bg-slate-50 uppercase">نصوص قانونية</div>
                      {LEGAL_SNIPPETS.filter(s => s.category === 'citation').map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => insertSnippet(s.text)}
                          className="w-full text-end px-3 py-2 hover:bg-indigo-50 border-t border-slate-100 first:border-t-0 transition"
                        >
                          <div className="text-xs font-bold text-slate-800">{s.label}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">{s.text}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <ToolDivider />
          </>
        )}

        {/* Text formatting */}
        <ToolButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="عريض (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="مائل (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="تحته خط (Ctrl+U)">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="مشطوب">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} title="تمييز بالأصفر">
          <Highlighter className="w-3.5 h-3.5" />
        </ToolButton>

        <ToolDivider />

        {/* Headings */}
        <ToolButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="عنوان رئيسي">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="عنوان فرعي">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="عنوان صغير">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} title="فقرة عادية">
          <Type className="w-3.5 h-3.5" />
        </ToolButton>

        <ToolDivider />

        {/* Lists */}
        <ToolButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="قائمة نقطية">
          <List className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="قائمة مرقمة">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="اقتباس">
          <Quote className="w-3.5 h-3.5" />
        </ToolButton>

        <ToolDivider />

        {/* Alignment */}
        <ToolButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="محاذاة يمين">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="توسيط">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="محاذاة يسار">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolButton>

        <ToolDivider />

        {/* Table */}
        <ToolButton onClick={insertTable} title="إدراج جدول (3×3)">
          <TableIcon className="w-3.5 h-3.5" />
        </ToolButton>

        {/* Link */}
        <div className="relative">
          <ToolButton
            active={editor.isActive('link')}
            onClick={() => { setShowLinkInput(!showLinkInput); setLinkUrl(editor.getAttributes('link').href || ''); }}
            title="إدراج/تعديل رابط"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolButton>
          {showLinkInput && (
            <div className="absolute top-full mt-1 end-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 flex items-center gap-1 w-72">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-indigo-400"
                onKeyDown={(e) => { if (e.key === 'Enter') insertLink(); }}
              />
              <button onClick={insertLink} className="px-2 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">
                إضافة
              </button>
              <button onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkInput(false); }} className="px-2 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200">
                إزالة
              </button>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <ToolButton onClick={() => editor.chain().focus().undo().run()} title="تراجع (Ctrl+Z)" disabled={!editor.can().undo()}>
          <Undo className="w-3.5 h-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} title="إعادة (Ctrl+Y)" disabled={!editor.can().redo()}>
          <Redo className="w-3.5 h-3.5" />
        </ToolButton>
      </div>

      {/* ─── Editor Content ─── */}
      <EditorContent editor={editor} />
    </div>
  );
}
