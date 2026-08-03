/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
;
import { 
  FileText, 
  Search, 
  Copy, 
  Printer, 
  FileCheck, 
  ChevronLeft, 
  Info,
  Check,
  RotateCcw
} from 'lucide-react';
import { LegalTemplate } from '../types';
import { mockTemplates } from '../data/mockData';
import { exportHtmlToWord } from '../utils/wordExportHelper';
import { findMatchSnippet } from '../utils/searchHelper';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import { sanitizeHtml } from '../utils/sanitizer';

interface TemplatesLibraryProps {
  templates?: LegalTemplate[]; // optional override
}

const TemplatesLibrary = React.memo(function TemplatesLibrary({ templates = mockTemplates }: TemplatesLibraryProps) {
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [allTemplates, setAllTemplates] = useState<LegalTemplate[]>(() => {
    const saved = localStorage.getItem('custom_legal_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const customOnly = parsed.filter((x: any) => x.id.startsWith('custom_'));
        return [...templates, ...customOnly];
      } catch (e) {
        return templates;
      }
    }
    return templates;
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const saved = localStorage.getItem('custom_legal_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    return templates[0]?.id || '';
  });

  // Stores active filled values for the current template's placeholders
  const [filledValues, setFilledValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const selectedTemplate = allTemplates.find(t => t.id === selectedTemplateId) || allTemplates[0] || templates[0];

  // Custom template creation/editing states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'صحف دعاوى' | 'عقود واتفاقيات' | 'إنذارات وطلبات' | 'مذكرات دفاعية'>('عقود واتفاقيات');
  const [newDescription, setNewDescription] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newPlaceholderKey, setNewPlaceholderKey] = useState('');
  const [newPlaceholderLabel, setNewPlaceholderLabel] = useState('');
  const [newPlaceholderType, setNewPlaceholderType] = useState<'text' | 'date'>('text');
  const [newPlaceholderDefault, setNewPlaceholderDefault] = useState('');

  const [newPlaceholdersList, setNewPlaceholdersList] = useState<Array<{ key: string; label: string; type: 'text' | 'date'; defaultValue?: string }>>([
    { key: 'اسم_المتعاقد_الاول', label: 'اسم الطرف الأول', type: 'text', defaultValue: 'أحمد علي حسن' },
    { key: 'الرقم_القومي_الاول', label: 'الرقم القومي للطرف الأول', type: 'text', defaultValue: '٢٩٠١٢٣٤٥٦٧٨٩٠١' },
    { key: 'اسم_المتعاقد_الثاني', label: 'اسم الطرف الثاني', type: 'text', defaultValue: 'محمد السيد محمود' },
    { key: 'تاريخ_العقد', label: 'تاريخ إبرام العقد', type: 'date', defaultValue: '2026-06-21' }
  ]);

  const addPlaceholderField = async () => {
    if (!newPlaceholderKey || !newPlaceholderLabel) {
      await showAlert('فضلاً أدخل اسم المتغير الفريد وعنوان الحقل التوضيحي');
      return;
    }
    const cleanKey = newPlaceholderKey.trim().replace(/\s+/g, '_');
    if (newPlaceholdersList.some(p => p.key === cleanKey)) {
      await showAlert('اسم المتغير هذا مستخدم بالفعل!');
      return;
    }
    setNewPlaceholdersList([
      ...newPlaceholdersList,
      {
        key: cleanKey,
        label: newPlaceholderLabel.trim(),
        type: newPlaceholderType,
        defaultValue: newPlaceholderDefault.trim() || undefined
      }
    ]);
    setNewPlaceholderKey('');
    setNewPlaceholderLabel('');
    setNewPlaceholderDefault('');
  };

  const removePlaceholderField = (key: string) => {
    setNewPlaceholdersList(newPlaceholdersList.filter(p => p.key !== key));
  };

  const handleSaveCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription || !newBody) {
      await showAlert('يرجى ملء كافة الخانات الأساسية (العنوان، الوصݡ وصيغة المستند)');
      return;
    }

    const newTemplate: LegalTemplate = {
      id: `custom_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      description: newDescription.trim(),
      body: newBody,
      placeholders: newPlaceholdersList
    };

    const updated = [...allTemplates, newTemplate];
    setAllTemplates(updated);
    
    // Save to localStorage (only keeping custom ones to allow clean merging with actual schema amendments)
    const customOnly = updated.filter(x => x.id.startsWith('custom_'));
    localStorage.setItem('custom_legal_templates', JSON.stringify(customOnly));

    setSelectedTemplateId(newTemplate.id);
    
    // Clear state
    setNewTitle('');
    setNewDescription('');
    setNewBody('');
    setNewPlaceholdersList([
      { key: 'اسم_المتعاقد_الاول', label: 'اسم الطرف الأول', type: 'text', defaultValue: 'أحمد علي حسن' },
      { key: 'الرقم_القومي_الاول', label: 'الرقم القومي للطرف الأول', type: 'text', defaultValue: '٢٩٠١٢٣٤٥٦٧٨٩٠١' },
      { key: 'اسم_المتعاقد_الثاني', label: 'اسم الطرف الثاني', type: 'text', defaultValue: 'محمد السيد محمود' },
      { key: 'تاريخ_العقد', label: 'تاريخ إبرام العقد', type: 'date', defaultValue: '2026-06-21' }
    ]);
    setIsAddModalOpen(false);
    setEditingTemplateId(null);
  };

  const handleUpdateCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription || !newBody) {
      await showAlert('يرجى ملء كافة الخانات الأساسية (العنوان، الوصݡ وصيغة المستند)');
      return;
    }
    if (!editingTemplateId) return;

    const updated = allTemplates.map(t => {
      if (t.id === editingTemplateId) {
        return {
          ...t,
          title: newTitle.trim(),
          category: newCategory as any,
          description: newDescription.trim(),
          body: newBody,
          placeholders: newPlaceholdersList
        };
      }
      return t;
    });

    setAllTemplates(updated);
    const customOnly = updated.filter(x => x.id.startsWith('custom_'));
    localStorage.setItem('custom_legal_templates', JSON.stringify(customOnly));

    setNewTitle('');
    setNewDescription('');
    setNewBody('');
    setNewPlaceholdersList([
      { key: 'اسم_المتعاقد_الاول', label: 'اسم الطرف الأول', type: 'text', defaultValue: 'أحمد علي حسن' },
      { key: 'الرقم_القومي_الاول', label: 'الرقم القومي للطرف الأول', type: 'text', defaultValue: '٢٩٠١٢٣٤٥٦٧٨٩٠١' },
      { key: 'اسم_المتعاقد_الثاني', label: 'اسم الطرف الثاني', type: 'text', defaultValue: 'محمد السيد محمود' },
      { key: 'تاريخ_العقد', label: 'تاريخ إبرام العقد', type: 'date', defaultValue: '2026-06-21' }
    ]);
    setIsAddModalOpen(false);
    setEditingTemplateId(null);
  };

  const handleDeleteTemplate = async (id: string) => {
    const tpl = allTemplates.find(t => t.id === id);
    if (!tpl) return;
    if (!await confirm(`هل أنت متأكد من حذف النموذج "${tpl.title}"؟`)) return;

    const updated = allTemplates.filter(t => t.id !== id);
    setAllTemplates(updated);
    const customOnly = updated.filter(x => x.id.startsWith('custom_'));
    localStorage.setItem('custom_legal_templates', JSON.stringify(customOnly));

    if (selectedTemplateId === id) {
      const next = updated[0]?.id || '';
      setSelectedTemplateId(next);
    }
  };

  const openEditTemplate = (tpl: LegalTemplate) => {
    setEditingTemplateId(tpl.id);
    setNewTitle(tpl.title);
    setNewCategory(tpl.category as any);
    setNewDescription(tpl.description);
    setNewBody(tpl.body);
    setNewPlaceholdersList(tpl.placeholders.map(p => ({
      key: p.key,
      label: p.label,
      type: p.type as any,
      defaultValue: p.defaultValue
    })));
    setIsAddModalOpen(true);
  };

  // Initialize form options whenever template changes
  useEffect(() => {
    if (selectedTemplate) {
      const initial: Record<string, string> = {};
      selectedTemplate.placeholders.forEach(p => {
        initial[p.key] = p.defaultValue || '';
      });
      setFilledValues(initial);
      setCopied(false);
    }
  }, [selectedTemplateId]);

  // Filter templates list
  const filteredTemplates = allTemplates.filter(t => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.body.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Calculate compiled text
  const getCompiledText = () => {
    if (!selectedTemplate) return '';
    let result = selectedTemplate.body;
    selectedTemplate.placeholders.forEach(p => {
      const val = filledValues[p.key] || `[ ${p.label} ]`;
      // Replace instances of {{key}}
      result = result.split(`{{${p.key}}}`).join(val);
    });
    return result;
  };

  // Replace and highlight for browser preview showing filled variables
  const getHighlightedPreviewHtml = () => {
    if (!selectedTemplate) return '';
    
    // Safely escape html
    let html = selectedTemplate.body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br />");

    selectedTemplate.placeholders.forEach(p => {
      const val = filledValues[p.key] || `[ ${p.label} ]`;
      const placeholderStr = `{{${p.key}}}`;
      const highlightedSpan = `<span class="bg-indigo-100 text-indigo-950 font-bold px-1 rounded border border-indigo-300 inline-block font-sans">${val}</span>`;
      
      html = html.split(placeholderStr).join(highlightedSpan);
    });

    return html;
  };

  const handleCopyText = () => {
    const textToCopy = getCompiledText();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = async () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      await showAlert('خطأ في تهيئة محرك الطباعة!');
      iframe.remove();
      return;
    }

    const compiledText = getCompiledText().replace(/\n/g, '<br />');

    iframeDoc.open();
    iframeDoc.write(`
      <html lang="ar" dir="rtl">
        <head>
          <title>${selectedTemplate?.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@400;700;900&display=swap');
            body { 
              font-family: 'Amiri', 'Tajawal', serif; 
              padding: 40px; 
              line-height: 1.8; 
              color: #1a1a1a;
              background-color: #fff;
              font-size: 14pt;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              font-family: 'Tajawal', sans-serif;
              text-align: center;
              font-size: 18pt;
              margin-bottom: 30px;
              border-bottom: 2px double #000;
              padding-bottom: 10px;
            }
            .legal-text {
              text-align: justify;
              text-justify: inter-word;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${selectedTemplate?.title}</h1>
          <div class="legal-text">${compiledText}</div>
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
      setTimeout(() => {
        iframe.remove();
      }, 1000);
    }, 500);
  };

  const handleResetForm = () => {
    if (selectedTemplate) {
      const reset: Record<string, string> = {};
      selectedTemplate.placeholders.forEach(p => {
        reset[p.key] = p.defaultValue || '';
      });
      setFilledValues(reset);
    }
  };

  return (
    <div className="space-y-6 text-end" dir="rtl">
      
      {/* HEADER ROW */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي المحترف
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                مستودع النماذج والصيغ
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-indigo-500" />
              مكتبة الصيغ والعقود والدفوع المعتمدة
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              منظومة تعبئة وتخصيص نماذج العقود واللوائح التفاعلية وفق القوانين والأكواد المعتمدة بمصر.
            </p>
          </div>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black py-3 px-5 flex items-center justify-center gap-2 transition cursor-pointer shadow-md no-print self-start md:self-auto z-10"
            id="trigger-add-template-modal"
          >
            <FileCheck className="w-4 h-4 text-emerald-300" />
            <span>إضافة نموذج وصيغة مخصصة جديد</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COL 1: TEMPLATE SELECTOR (LEFT Column - desktop) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* SEARCH & CATEGORY FILTERS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن صيغة أو عريضة..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pe-9 ps-3 py-2 rounded-lg border border-slate-205 border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
              />
              <Search className="absolute end-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="space-y-1.5">
              {[
                { key: 'all', label: 'كافة التصنيفات' },
                { key: 'صحف دعاوى', label: 'عريضة وصحف دعاوى (مدني)' },
                { key: 'عقود واتفاقيات', label: 'عقود بيع وإيجار قانونية' },
                { key: 'إنذارات وطلبات', label: 'إنذارات رسمية على يد محضر' },
                { key: 'مذكرات دفاعية', label: 'مذكرات دفوع جنائية ومرافعات' }
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`w-full text-end px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                    selectedCategory === cat.key 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.label}</span>
                  <ChevronLeft className="h-3 w-3 opacity-50" />
                </button>
              ))}
            </div>
          </div>

          {/* TEMPLATES SEARCH LIST CLICKS */}
          <div className="space-y-2">
            {filteredTemplates.map(t => (
              <div
                key={t.id}
                className={`p-3.5 rounded-xl border text-xs transition flex flex-col gap-1 ${
                  selectedTemplateId === t.id
                    ? 'bg-white border-2 border-indigo-600 shadow-sm ring-2 ring-indigo-600/5'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => setSelectedTemplateId(t.id)}
                  className="w-full text-end"
                  id={`template-tab-${t.id}`}
                >
                  <div className="flex items-center gap-1.5">
                    <FileText className={`h-4 w-4 ${selectedTemplateId === t.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <strong className="text-slate-900 line-clamp-1">{t.title}</strong>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">{t.description}</p>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50/70 p-1 px-1.5 rounded self-start mt-1">
                    {t.category}
                  </span>
                </button>

                {searchQuery && (() => {
                  const match = findMatchSnippet({
                    title: t.title,
                    description: t.description,
                    body: t.body
                  }, searchQuery, {
                    title: 'عنوان النموذج',
                    description: 'وصف النموذج',
                    body: 'متن النموذج والصياغة'
                  });
                  if (match) {
                    return (
                      <div className="text-[10px] text-slate-600 bg-indigo-50/50 border border-indigo-100 p-2 rounded-md font-sans mt-2 text-end">
                        <span className="text-indigo-800 font-extrabold block mb-0.5">مطابقة في {match.fieldName}:</span>
                        <span>{match.before}</span>
                        <mark className="bg-indigo-200 text-indigo-950 font-bold px-0.5 rounded">{match.match}</mark>
                        <span>{match.after}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {t.id.startsWith('custom_') && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditTemplate(t); }}
                      className="text-[10px] text-indigo-700 hover:text-indigo-900 font-extrabold underline cursor-pointer"
                      id={`edit-template-btn-${t.id}`}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                      className="text-[10px] text-red-600 hover:text-red-800 font-extrabold underline cursor-pointer"
                      id={`delete-template-btn-${t.id}`}
                    >
                      حذف
                    </button>
                  </div>
                )}
              </div>
            ))}

            {filteredTemplates.length === 0 && (
              <div className="bg-slate-50 border p-6 rounded-xl text-center text-slate-400 text-xs">
                لا توجد قوالب مطابقة.
              </div>
            )}
          </div>

        </div>

        {/* COL 2: FILLABLE CONTROLS FORM PANEL (CENTER column - desktop) */}
        {selectedTemplate && (
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-full flex flex-col justify-between">
              
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600">{selectedTemplate.category}</span>
                  <h3 className="font-black text-slate-900 text-sm mt-0.5">صياغة وبيانات العريضة التفاعلية</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">املأ المتغيرات أدناه لنسخ العقد أو الصحيفة جاهزاً مباشرة</p>
                </div>

                {/* Form fields dynamically mapped */}
                <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pe-1">
                  {selectedTemplate.placeholders.map(p => (
                    <div key={p.key} className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">{p.label}</label>
                      
                      {p.type === 'date' ? (
                        <input
                          type="date"
                          value={filledValues[p.key] || ''}
                          onChange={e => setFilledValues({...filledValues, [p.key]: e.target.value})}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                        />
                      ) : (
                        <input
                          type="text"
                          value={filledValues[p.key] || ''}
                          placeholder={`إدخال ${p.label}...`}
                          onChange={e => setFilledValues({...filledValues, [p.key]: e.target.value})}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-205 border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset inputs option */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-[10px] text-slate-400 font-bold hover:text-slate-600 flex items-center gap-1 transition"
                  id="reset-template-fields-btn"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  إعادة تعيين الحقول الافتراضية
                </button>

                <span className="text-[10px] text-slate-400 font-bold font-mono">
                  {selectedTemplate.placeholders.length} حقل مطلوب
                </span>
              </div>

            </div>
          </div>
        )}

        {/* COL 3: DOCUMENT PAPER LIVE PREVIEW RENDERING (RIGHT Column - desktop) */}
        {selectedTemplate && (
          <div className="lg:col-span-5 space-y-4">
            
            {/* PAPER CARD BLOCK */}
            <div className="bg-white border-2 border-slate-900/10 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full max-h-[82vh]">
              
              {/* Paper Header / Toolbar */}
              <div className="bg-slate-950 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                  <h4 className="text-xs font-bold text-slate-300">مسودة المستند القضائي المكتوب</h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyText}
                    className="p-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-500 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                    id="copy-legal-text-btn"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span>تم النسخ ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>نسخ النص</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="p-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                    id="print-legal-doc-btn"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>طباعة</span>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedTemplate) {
                        const text = getCompiledText().replace(/\n/g, '<br />');
                        exportHtmlToWord(selectedTemplate.title, `<div class="legal-text">${text}</div>`, `صيغة_${selectedTemplate.title.replace(/\s+/g, '_')}`);
                      }
                    }}
                    className="p-1.5 px-3 bg-emerald-650 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                    id="export-legal-doc-word-btn"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>تصدير لوورد</span>
                  </button>
                </div>
              </div>

              {/* Legal Paper Sheet */}
              <div className="p-6 md:p-8 bg-indigo-50/15 overflow-y-auto flex-grow text-slate-900 leading-relaxed text-xs md:text-sm text-justify font-sans border-t border-slate-100 select-all selection:bg-indigo-100 font-serif">
                {/* Visual Official legal stamp watermark decoration */}
                <div className="border border-indigo-600/10 p-5 rounded-lg relative overflow-hidden bg-white shadow-xs max-w-full">
                  
                  {/* Decorative Scales of Justice stamp in background or top */}
                  <div className="text-center pb-4 mb-4 border-b border-double border-slate-300 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest font-sans">جمهورية مصر العربية</span>
                    <h5 className="font-black text-slate-900 text-sm md:text-base">{selectedTemplate.title}</h5>
                    <span className="text-[9px] text-slate-450 text-slate-400 block font-mono">مكتب الأستاذ المحامي وكيل المدعي/المتهم</span>
                  </div>

                  {/* Highlights body display */}
                  <div 
                    className="text-slate-800 leading-loose text-justify text-[11px] md:text-xs text-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(getHighlightedPreviewHtml()) }}
                  ></div>

                  <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <span>تحريراً في: {filledValues['تاريخ_العقد'] || filledValues['تاريخ_اليوم'] || '٢٠٢٦'}</span>
                    <span>توقيع مقدمه / الوكيل بالتوكيل</span>
                  </div>

                </div>
              </div>

              {/* Informational warning */}
              <div className="bg-slate-50 p-3 text-center border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Info className="h-3.5 w-3.5" />
                <span>يرجى مراجعة الصياغات والبنود بعناية وضبط الدمغات المالية المقررة بنقابة المحامين قبل الحضور أمام المحكمة.</span>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* CUSTOM TEMPLATE CREATION/EDITING DIALOG MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 animate-fade-in no-print" dir="rtl">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="font-black text-sm">{editingTemplateId ? 'تعديل نموذج مستند قانوني' : 'تصميم نموذج مستند قانوني مخصص'}</h3>
                  <p className="text-[10px] text-slate-350">{editingTemplateId ? 'عدّل البيانات والحقول وصيغة المستند' : 'عرّف حقول الإدخال، واكتب القالب بصياغتك المفضلة'}</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingTemplateId(null); }}
                className="text-slate-400 hover:text-white font-extrabold text-xs bg-slate-800 p-1 px-2.5 rounded-lg transition cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={editingTemplateId ? handleUpdateCustomTemplate : handleSaveCustomTemplate} className="p-6 overflow-y-auto space-y-4 text-slate-900 text-end">
              
              {/* Row 1: Title & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-700">عنوان النموذج القضائي / العقد</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عقد تأسيس شركة تضامن مخصصة..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-700">التصنيف الرئيسي</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                  >
                    <option value="عقود واتفاقيات">عقود بيع وإيجار وتأسيس</option>
                    <option value="صحف دعاوى">صحيفة وعريضة دعوى</option>
                    <option value="إنذارات وطلبات">إنذارات رسمية على يد محضر</option>
                    <option value="مذكرات دفاعية">مذكرة دفوع وترافع محكمة</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-700">الوصف الموجز لدواعي الاستعمال</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: صيغة تضامنية لتأسيس الكيان التجاري متضمنة شروط بطلان العزل وحصص الشراكة"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              {/* SECTION: PLACEHOLDERS BUILDER (أداة بناء متغيرات النموذج) */}
              <div className="border border-indigo-100 bg-indigo-50/10 p-4 rounded-xl space-y-3">
                <span className="text-[11px] font-extrabold text-indigo-900 flex items-center gap-1.5 pb-2 border-b border-indigo-100/40">
                  <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block"></span>
                  ١. بناء وتعريف حقول التعبئة التفاعلية (المتغيرات)
                </span>

                {/* Add standard variables interface form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-end">
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-slate-500 font-bold">اسم المتغير البرمجي (دون فواصل)</label>
                    <input
                      type="text"
                      placeholder="مثال: اسم_البائع"
                      value={newPlaceholderKey}
                      onChange={e => setNewPlaceholderKey(e.target.value)}
                      className="w-full text-[11px] p-2 rounded border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-slate-500 font-bold">طبيعة وقيمة الحقل (Label)</label>
                    <input
                      type="text"
                      placeholder="مثال: اسم البائع بالكامل"
                      value={newPlaceholderLabel}
                      onChange={e => setNewPlaceholderLabel(e.target.value)}
                      className="w-full text-[11px] p-2 rounded border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[10px] text-slate-500 font-bold">نوع الحقل</label>
                    <select
                      value={newPlaceholderType}
                      onChange={e => setNewPlaceholderType(e.target.value as any)}
                      className="w-full text-[11px] p-2 rounded border border-slate-200 bg-white"
                    >
                      <option value="text">نص حر / سطري</option>
                      <option value="date">تحديد تاريخ رزنامة</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={addPlaceholderField}
                    className="p-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-black transition cursor-pointer"
                  >
                    أضف حقل الإدخال +
                  </button>
                </div>

                {/* Grid of already built placeholders in actual layout */}
                <div className="space-y-1 pt-1.5">
                  <span className="block text-[10px] font-bold text-slate-400">حقول الإدخال المعرفة للنموذج حالياً:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-[12vh] overflow-y-auto p-1">
                    {newPlaceholdersList.map(item => (
                      <div 
                        key={item.key} 
                        className="bg-white border border-slate-200 rounded p-1.5 px-2.5 text-[10px] font-bold flex items-center justify-between gap-3 text-slate-700"
                      >
                        <div className="space-x-1.5 space-x-reverse flex items-center">
                          <code className="bg-indigo-50 text-indigo-700 p-0.5 rounded text-[9px] font-black">{"{{" + item.key + "}}"}</code>
                          <span className="text-slate-500">({item.label})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePlaceholderField(item.key)}
                          className="text-red-500 hover:text-red-700 font-bold font-sans cursor-pointer"
                          title="حذف هذا المتغير"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {newPlaceholdersList.length === 0 && (
                      <span className="text-[10px] text-indigo-600 font-bold">لا توجد حقول تفاعلية حالياً (سيتم حفظ صياغته كنص ثابت).</span>
                    )}
                  </div>
                </div>

              </div>

              {/* ROW 3: BODY (نص النموذج وصيغته) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-black text-slate-700">٢. كتابة صياغة وبنود العقد / صحيفة الدعوى</label>
                  
                  {/* helper click tags insert info label */}
                  <span className="text-[9px] bg-indigo-50 text-indigo-800 font-extrabold px-2 py-0.5 rounded">تعليمات: انقر بالجدول أدناه لإدراج البند بموقع الكتابة</span>
                </div>

                {/* Quick insertion chips wrapper */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-end space-y-1.5">
                  <span className="text-[9px] text-slate-500 font-black block">قائمة المتغيرات الخاصة بك (انقر لإدراج المتغير في مؤخرة النص):</span>
                  <div className="flex flex-wrap gap-1">
                    {newPlaceholdersList.map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setNewBody(prev => prev + ` {{${item.key}}} `)}
                        className="px-1.5 py-1 bg-white hover:bg-indigo-100 border border-slate-250 hover:border-indigo-300 rounded text-[9px] font-black font-mono transition text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{item.label}</span>
                        <code className="text-[8px] text-indigo-700">{"{{" + item.key + "}}"}</code>
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  required
                  rows={8}
                  placeholder={`إنه في يوم {{تاريخ_العقد}} تحرر هذا العقد بين كل من:\nأولاً: السيد/ {{اسم_المتعاقد_الاول}} المقيم... (طرف أول)\nثانياً: السيد/ {{اسم_المتعاقد_الثاني}}... (طرف ثاني)\n\nتم الاتفاق والتعاقد على البنود التالية...`}
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  className="w-full text-xs p-3.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 leading-relaxed font-serif animate-pulse-once"
                />
              </div>

              {/* Submit / Cancel row */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingTemplateId(null); }}
                  className="px-4 py-2 border border-slate-205 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer"
                >
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  {editingTemplateId ? 'حفظ التعديلات' : 'حفظ النموذج الجديد بالمكتبة'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
});

export default TemplatesLibrary;
