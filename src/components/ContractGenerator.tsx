/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSignature, 
  Settings, 
  Eye, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  BookOpen, 
  Plus, 
  Trash2,
  FileText,
  X
} from 'lucide-react';
import { showPrintJob } from '../utils/printHelper';
import { exportHtmlToWord } from '../utils/wordExportHelper';
import { ContractTemplate, PRESET_TEMPLATES } from '../data/contractTemplates';
import { sanitizeHtml } from '../utils/sanitizer';

const CUSTOM_CONTRACTS_KEY = 'custom_contract_templates';
const CUSTOM_CLAUSES_KEY = 'contract_custom_clauses';
const FIELD_VALUES_KEY = 'contract_field_values';

const ContractGenerator = React.memo(function ContractGenerator() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('sale_contract');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [activeClauseIds, setActiveClauseIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [customClauses, setCustomClauses] = useState<{ id: string; title: string; defaultText: string }[]>([]);
  const [newClauseTitle, setNewClauseTitle] = useState('');
  const [newClauseText, setNewClauseText] = useState('');
  const [customTemplates, setCustomTemplates] = useState<ContractTemplate[]>(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_CONTRACTS_KEY) || '[]'); } catch (e) { console.warn('Failed to load custom contracts', e); return []; }
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ContractTemplate | null>(null);

  // Template modal form state
  const [tmplName, setTmplName] = useState('');
  const [tmplDesc, setTmplDesc] = useState('');
  const [tmplCategory, setTmplCategory] = useState('عقود البيع والشراء');
  const [tmplIntro, setTmplIntro] = useState('');
  const [tmplFields, setTmplFields] = useState<{ key: string; label: string; type: 'string' | 'number' | 'date' | 'select'; defaultValue: string }[]>([]);
  const [tmplClauses, setTmplClauses] = useState<{ id: string; title: string; defaultText: string }[]>([]);

  const allTemplates = [...PRESET_TEMPLATES, ...customTemplates];

  const currentTemplate = allTemplates.find(t => t.id === selectedTemplateId) || allTemplates[0];

  // Save custom templates to localStorage
  useEffect(() => {
    localStorage.setItem(CUSTOM_CONTRACTS_KEY, JSON.stringify(customTemplates));
  }, [customTemplates]);

  useEffect(() => {
    const initialFields: Record<string, string> = {};
    currentTemplate.fields.forEach(f => {
      initialFields[f.key] = f.defaultValue;
    });
    // Add default day and date
    const today = new Date();
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    initialFields['اليوم'] = days[today.getDay()];
    initialFields['التاريخ'] = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    
    setFieldValues(initialFields);

    const defaultClauses = currentTemplate.clauses
      .filter(c => !c.optional || c.activeByDefault)
      .map(c => c.id);
    setActiveClauseIds(defaultClauses);
    setCustomClauses([]);
  }, [selectedTemplateId]);

  const handleFieldChange = (key: string, val: string) => {
    setFieldValues(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const toggleClause = (id: string) => {
    setActiveClauseIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleAddCustomClause = () => {
    if (!newClauseTitle || !newClauseText) return;
    const item = {
      id: `custom_${Date.now()}`,
      title: newClauseTitle,
      defaultText: newClauseText
    };
    setCustomClauses(prev => [...prev, item]);
    setNewClauseTitle('');
    setNewClauseText('');
  };

  const handleRemoveCustomClause = (id: string) => {
    setCustomClauses(prev => prev.filter(c => c.id !== id));
  };

  // Replace tokens logic
  const getCompiledText = () => {
    let intro = currentTemplate.arabicIntro;
    // Replace in intro
    Object.entries(fieldValues).forEach(([key, val]) => {
      const regex = new RegExp(`\\[${key}\\]`, 'g');
      intro = intro.replace(regex, (val as string) || `(لم يحدد ${key})`);
    });

    const compiledClausesHTML = currentTemplate.clauses
      .filter(c => activeClauseIds.includes(c.id))
      .map(c => {
        let text = c.defaultText;
        Object.entries(fieldValues).forEach(([key, val]) => {
          const regex = new RegExp(`\\[${key}\\]`, 'g');
          text = text.replace(regex, `<strong class="font-bold border-b border-dotted border-slate-500">${(val as string) || '......'}</strong>`);
        });
        return `
          <div class="mb-5 last:mb-0 break-inside-avoid">
            <h4 class="font-bold text-slate-800 text-[14.5px] border-e-2 border-slate-400 pe-2 me-0 mb-1.5">${c.title}</h4>
            <p class="text-slate-700 text-xs leading-relaxed text-justify me-0 font-sans">${text}</p>
          </div>
        `;
      }).join('');

    const compiledCustomHTML = customClauses
      .map((c, idx) => {
        let text = c.defaultText;
        Object.entries(fieldValues).forEach(([key, val]) => {
          const regex = new RegExp(`\\[${key}\\]`, 'g');
          text = text.replace(regex, `<strong class="font-bold border-b border-dotted border-slate-500">${(val as string) || '......'}</strong>`);
        });
        return `
          <div class="mb-5 last:mb-0 break-inside-avoid">
            <h4 class="font-bold text-slate-800 text-[14.5px] border-e-2 border-slate-400 pe-2 me-0 mb-1.5">${c.title}</h4>
            <p class="text-slate-700 text-xs leading-relaxed text-justify me-0 font-sans">${text}</p>
          </div>
        `;
      }).join('');

    return { intro, compiledClausesHTML, compiledCustomHTML };
  };

  const { intro, compiledClausesHTML, compiledCustomHTML } = getCompiledText();

  // Create document preview
  const title = currentTemplate.name;

  const contractWordBody = `
      <div style="margin-bottom: 25px;">
        <h2 style="text-align: center; font-size: 17px; font-weight: 900; color: #1e293b; margin: 0 0 8px; padding-bottom: 8px; border-bottom: 1px solid #cbd5e1;">
          ${title}
        </h2>
      </div>

      <div style="text-align: justify; margin-bottom: 25px; color: #334155;">
        ${intro.replace(/\n/g, '<br>')}
      </div>

      <div style="margin-bottom: 35px;">
        ${compiledClausesHTML}
        ${compiledCustomHTML}
      </div>

      <div style="margin-top: 50px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; padding: 15px; border: 1px dashed #cbd5e1; background-color: #f8fafc; text-align: center; vertical-align: top;">
              <p style="font-weight: bold; color: #334155; margin-bottom: 35px;">إمضاء الطرف الأول (البائع/المؤجر/المتضامن)</p>
              <div style="border-top: 1px solid #475569; width: 70%; margin: 0 auto; padding-top: 5px; font-size: 10px; color: #64748b;">الاسم والصفة المعتبرة</div>
            </td>
            <td style="width: 50%; padding: 15px; border: 1px dashed #cbd5e1; background-color: #f8fafc; text-align: center; vertical-align: top;">
              <p style="font-weight: bold; color: #334155; margin-bottom: 35px;">إمضاء الطرف الثاني (المشتري/المستأجر/المتضامن)</p>
              <div style="border-top: 1px solid #475569; width: 70%; margin: 0 auto; padding-top: 5px; font-size: 10px; color: #64748b;">الاسم والصفة المعتبرة</div>
            </td>
          </tr>
        </table>
      </div>
  `;

  const generatedHTMLReport = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Amiri:wght@400;700&display=swap');
        
        body {
          font-family: 'Amiri', 'Cairo', serif;
          margin: 0;
          padding: 45px 55px;
          background-color: #ffffff;
          color: #1e293b;
          direction: rtl;
          line-height: 1.7;
          font-size: 14px;
        }
        
        .header-logo {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px double #334155;
          padding-bottom: 15px;
        }

        .header-logo h2 {
          font-family: 'Cairo', sans-serif;
          font-size: 16px;
          color: #1e293b;
          margin: 0;
          letter-spacing: 0.3px;
          font-weight: 900;
        }

        .header-logo p {
          font-size: 10px;
          color: #64748b;
          margin: 4px 0 0 0;
          font-family: 'Cairo', sans-serif;
          font-weight: 500;
        }

        .doc-title {
          font-family: 'Cairo', sans-serif;
          text-align: center;
          font-size: 16px;
          font-weight: 900;
          color: #1e293b;
          margin: 25px 0 20px;
          padding: 8px 0;
          border-bottom: 1px solid #cbd5e1;
        }

        .intro-box {
          text-align: justify;
          margin-bottom: 25px;
          padding: 12px 0;
          color: #334155;
        }

        .clauses-container {
          margin-bottom: 35px;
        }

        .break-inside-avoid {
          page-break-inside: avoid;
        }

        .signatures-grid {
          margin-top: 50px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          page-break-inside: avoid;
          font-family: 'Cairo', sans-serif;
        }

        .sig-block {
          border: 1px dashed #cbd5e1;
          padding: 15px;
          border-radius: 6px;
          background-color: #f8fafc;
          text-align: center;
        }

        .sig-title {
          font-weight: bold;
          color: #334155;
          font-size: 11.5px;
          margin-bottom: 35px;
        }

        .sig-line {
          border-top: 1px solid #475569;
          width: 70%;
          margin: 0 auto;
          padding-top: 5px;
          font-size: 10px;
          color: #64748b;
        }

        .footer-stamp {
          text-align: center;
          font-size: 9px;
          color: #94a3b8;
          font-family: 'Cairo', sans-serif;
          margin-top: 60px;
          border-top: 1px dashed #e2e8f0;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header-logo">
        <h2>مِنَصَّةُ المُحَامَاةِ الذَّكِيَّةِ</h2>
        <p>مُولد الصياغات القانونية والعقود الرسمية المعتمدة</p>
      </div>

      <div class="doc-title">
        ${title}
      </div>

      <div class="intro-box">
        ${intro.replace(/\n/g, '<br>')}
      </div>

      <div class="clauses-container">
        ${compiledClausesHTML}
        ${compiledCustomHTML}
      </div>

      <div class="signatures-grid">
        <div class="sig-block">
          <div class="sig-title">توقيع وإمضاء الطرف الأول (البائع/المؤجر/المتضامن)</div>
          <div class="sig-line">الاسم: .......................................</div>
        </div>
        <div class="sig-block">
          <div class="sig-title">توقيع وإمضاء الطرف الثاني (المشتري/المستأجر/المتضامن)</div>
          <div class="sig-line">الاسم: .......................................</div>
        </div>
      </div>

      <div class="footer-stamp">
         صُيغ هذا المستند آلياً عبر نظام المحاماة المبتكر • يحرر من أصلين يوقع عليهما الشركاء
      </div>
    </body>
    </html>
  `;

  const handleSaveCustomTemplate = () => {
    if (!tmplName.trim()) return;
    const id = editTemplate ? editTemplate.id : `custom_${Date.now()}`;
    const template: ContractTemplate = {
      id,
      name: tmplName.trim(),
      description: tmplDesc.trim() || 'قالب مخصص',
      category: tmplCategory,
      arabicIntro: tmplIntro || `إنه في يوم [اليوم] الموافق [التاريخ]\n\n`,
      fields: tmplFields.length > 0 ? tmplFields : [{ key: 'بيان', label: 'البيان', type: 'string', defaultValue: '' }],
      clauses: tmplClauses.map(c => ({ id: c.id, title: c.title, defaultText: c.defaultText }))
    };
    if (editTemplate) {
      setCustomTemplates(prev => prev.map(ct => ct.id === id ? template : ct));
    } else {
      setCustomTemplates(prev => [...prev, template]);
    }
    setSelectedTemplateId(id);
    setShowTemplateModal(false);
    setEditTemplate(null);
  };

  const copyIframeContent = () => {
    navigator.clipboard.writeText(generatedHTMLReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const triggerPlatformPrint = () => {
    showPrintJob(title, generatedHTMLReport);
  };

  return (
    <div className="space-y-6 text-end" dir="rtl" id="contract-generator-module-root">
      {/* Unified Banner */}
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
                صياغة العقود الفورية
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <FileSignature className="h-6 w-6 text-slate-400" />
              منصة صياغة العقود وصحف الدعاوى الذكية
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              توليد متطور وفوري للعقود المدنية والتجارية، عقود الإيجار والبيع، ولوائح الدعاوى، وبنود الاتفاقيات مع خيارات طباعة وحفظ تفاعلية.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8 select-none">
        {/* Parameters Panel */}
        <div className="w-full lg:w-5/12 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-5 text-end font-sans" dir="rtl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileSignature className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">صانع العقود والمظاريف الذكي</h3>
                <p className="text-[10.5px] text-slate-400 mt-0.5">مولد صياغات متكامل للشركات والمبيعات والإيجارات ببنود اختيارية</p>
              </div>
            </div>
            <div className="h-px bg-slate-100 mt-4"></div>
          </div>

        {/* Template selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">اختر نموذج العقد المبدئي</label>
          <div className="flex gap-2">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-semibold bg-slate-50 focus:bg-white outline-none"
            >
              {allTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.id.startsWith('custom_') ? '🔷 ' : ''}{t.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setEditTemplate(null);
                setTmplName(''); setTmplDesc(''); setTmplCategory('عقود البيع والشراء');
                setTmplIntro(''); setTmplFields([]); setTmplClauses([]);
                setShowTemplateModal(true);
              }}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs px-3 rounded-xl flex items-center gap-1 cursor-pointer transition font-bold border border-indigo-200"
            >
              <Plus className="w-3.5 h-3.5" />
              جديد
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-medium flex-1">*{currentTemplate.description}</p>
            {selectedTemplateId.startsWith('custom_') && (
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const t = customTemplates.find(ct => ct.id === selectedTemplateId);
                    if (!t) return;
                    setEditTemplate(t);
                    setTmplName(t.name); setTmplDesc(t.description); setTmplCategory(t.category);
                    setTmplIntro(t.arabicIntro);
                    setTmplFields(t.fields);
                    setTmplClauses(t.clauses);
                    setShowTemplateModal(true);
                  }}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold px-2 py-0.5 cursor-pointer"
                >
                  تعديل
                </button>
                <button
                  onClick={() => {
                    const t = customTemplates.find(ct => ct.id === selectedTemplateId);
                    if (!t) return;
                    setCustomTemplates(prev => prev.filter(ct => ct.id !== selectedTemplateId));
                    setSelectedTemplateId('sale_contract');
                  }}
                  className="text-[10px] text-rose-500 hover:text-rose-700 font-bold px-2 py-0.5 cursor-pointer"
                >
                  حذف
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-slate-100"></div>

        {/* Dynamic fields block */}
        <div className="space-y-4 max-h-[300px] overflow-y-auto pe-1">
          <p className="text-[11px] font-bold text-indigo-600 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>متغيرات التعاقد والبيانات الأساسية</span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {currentTemplate.fields.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={fieldValues[f.key] || ''}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none bg-slate-50"
                  >
                    {f.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={fieldValues[f.key] || ''}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 bg-slate-50 focus:bg-white transition"
                    placeholder={`أدخل ${f.label}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-100"></div>

        {/* Clause Toggles */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-indigo-600 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>التحكم في بنود ومواد العقد</span>
          </p>
          
          <div className="space-y-2 max-h-[220px] overflow-y-auto pe-1">
            {currentTemplate.clauses.map(c => {
              if (!c.optional) return null;
              const isChecked = activeClauseIds.includes(c.id);
              return (
                <div 
                  key={c.id} 
                  className={`p-2.5 rounded-lg border transition ${
                    isChecked ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-50/40 border-slate-100'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleClause(c.id)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                    />
                    <div className="space-y-0.5 text-end">
                      <span className="text-xs font-bold text-slate-700 block">{c.title}</span>
                      {c.helper && <p className="text-[9.5px] text-slate-400">{c.helper}</p>}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-slate-100"></div>

        {/* Custom Clause adding tool */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-indigo-600">إضافة بند مخصص جديد بمجلس العقد</p>
          <input
            type="text"
            value={newClauseTitle}
            onChange={(e) => setNewClauseTitle(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
            placeholder="مثال: البند الثامن: ملحق تسوية المناقصات والطرف الثالث"
          />
          <textarea
            value={newClauseText}
            onChange={(e) => setNewClauseText(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 min-h-[60px]"
            placeholder="اكتب هنا نص البند المخصص بالكامل..."
          />
          <button
            onClick={handleAddCustomClause}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            إدراج البند في أسفل نموذج العقد
          </button>
        </div>

        {customClauses.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-450 uppercase">البنود الإضافية المضافة ({customClauses.length})</p>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
              {customClauses.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10.5px] font-bold text-slate-600 truncate max-w-[200px]">{c.title}</span>
                  <button 
                    onClick={() => handleRemoveCustomClause(c.id)}
                    className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Styled contract and visual sheet Preview */}
      <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between select-text" id="contract-view-card-wrapper">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-3 text-end" dir="rtl">
          <div>
            <span className="bg-slate-700/50 text-slate-300 border border-slate-600/50 text-[10px] px-2 py-0.5 rounded-full font-bold">بوابة صياغة العقود</span>
            <h4 className="text-sm font-black text-slate-100 mt-1">معاينة ورقة العقد المطورة</h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyIframeContent}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم نسخ الشفرة' : 'نسخ الكود'}</span>
            </button>

            <button
              onClick={triggerPlatformPrint}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-black py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة وطباعة العقد</span>
            </button>

            <button
              onClick={() => exportHtmlToWord(title, contractWordBody, `عقد_${currentTemplate.name.replace(/\s+/g, '_')}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition"
              id="export-contract-word-btn"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>تصدير إلى وورد</span>
            </button>
          </div>
        </div>

        {/* Outer White Paper Visual layout */}
        <div className="bg-white border border-slate-200 shadow-2xl p-8 rounded-xl relative select-text text-slate-800 overflow-y-auto max-h-[680px]" dir="rtl">
          {/* Document Heading inside the paper */}
          <div className="text-center pb-2 border-b-2 double border-slate-400 font-sans">
            <p className="text-[11px] font-black text-slate-500 tracking-wider">مِنَصَّةُ المُحَامَاةِ الذَّكِيَّةِ</p>
            <h2 className="text-base font-black text-slate-800 mt-1">{currentTemplate.name}</h2>
          </div>

          {/* Intro block */}
          <div className="mt-4 text-xs text-slate-700 leading-relaxed text-justify" style={{ fontSize: '13px' }}>
            {intro.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-2 last:mb-0">{paragraph}</p>
            ))}
          </div>

          {/* Render active clauses */}
          <div className="mt-6 space-y-6">
            {currentTemplate.clauses
              .filter(c => activeClauseIds.includes(c.id))
              .map(c => {
                let text = c.defaultText;
                // Highlight dynamic values
                Object.entries(fieldValues).forEach(([key, val]) => {
                  const regex = new RegExp(`\\[${key}\\]`, 'g');
                  const valStr = typeof val === 'string' ? val : String(val || '');
                  const escaped = (valStr || '......').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                  text = text.replace(regex, `<strong class="text-slate-800 border-b border-dashed border-slate-400 px-1 font-bold">${escaped}</strong>`);
                });

                return (
                  <div key={c.id} className="border-e-2 border-slate-300 pe-2 me-2">
                    <h5 className="text-[13px] font-bold text-slate-900 mb-1 font-sans">{c.title}</h5>
                    <p className="text-xs text-slate-700 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
                  </div>
                );
              })}

            {/* Custom Clauses */}
            {customClauses.map(c => {
              let text = c.defaultText;
              Object.entries(fieldValues).forEach(([key, val]) => {
                const regex = new RegExp(`\\[${key}\\]`, 'g');
                const valStr = typeof val === 'string' ? val : String(val || '');
                const escaped = (valStr || '......').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                text = text.replace(regex, `<strong class="text-slate-800 border-b border-dashed border-slate-400 px-1 font-bold">${escaped}</strong>`);
              });

              return (
                <div key={c.id} className="border-e-2 border-slate-300 pe-2 me-2">
                  <h5 className="text-[13px] font-bold text-slate-900 mb-1 font-sans">{c.title}</h5>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
                </div>
              );
            })}
          </div>

          {/* Signatures wrapper layout */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 font-sans">
            <div className="border border-slate-100 bg-slate-50/50 p-4 rounded text-center">
              <span className="text-[10px] font-bold text-slate-500 block mb-8">إمضاء الطرف الأول (البائع/المؤجر/المتضامن)</span>
              <div className="border-t border-slate-400/80 w-3/4 mx-auto pt-1 text-[9px] text-slate-400">الاسم والصفة المعتبرة</div>
            </div>
            <div className="border border-slate-100 bg-slate-50/50 p-4 rounded text-center">
              <span className="text-[10px] font-bold text-slate-500 block mb-8">إمضاء الطرف الثاني (المشتري/المستأجر/المتضامن)</span>
              <div className="border-t border-slate-400/80 w-3/4 mx-auto pt-1 text-[9px] text-slate-400">الاسم والصفة المعتبرة</div>
            </div>
          </div>
        </div>

        {/* Status indicator note */}
        <p className="text-[10.5px] text-center text-slate-500 mt-4 leading-normal">
          * يمكنك التعديل على البنود أعلاه وسينعكس التغيير تلقائياً وتلوين المتغيرات في مسودة الطباعة.
        </p>
      </div>

      {/* Modal for add/edit custom template */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 text-end mx-4" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800">{editTemplate ? 'تعديل القالب المخصص' : 'إضافة قالب مخصص جديد'}</h3>
              <button onClick={() => setShowTemplateModal(false)} className="p-1 hover:bg-slate-100 rounded cursor-pointer text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم القالب *</label>
                <input type="text" value={tmplName} onChange={e => setTmplName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" placeholder="مثال: عقد بيع تجاري" />
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">التصنيف</label>
                <input type="text" value={tmplCategory} onChange={e => setTmplCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" placeholder="عقود البيع والشراء" />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">وصف القالب</label>
                <input type="text" value={tmplDesc} onChange={e => setTmplDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" placeholder="وصف مختصر للقالب" />
              </div>

              {/* Intro */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">النص التمهيدي <span className="text-slate-400 font-normal">(يمكن استخدام [الحقول] كمتغيرات)</span></label>
                <textarea value={tmplIntro} onChange={e => setTmplIntro(e.target.value)} rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" placeholder={'إنه في يوم [اليوم] الموافق [التاريخ]...'} />
              </div>

              {/* Fields */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500">الحقول المخصصة</label>
                  <button onClick={() => setTmplFields(prev => [...prev, { key: '', label: '', type: 'string', defaultValue: '' }])}
                    className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 cursor-pointer">
                    <Plus className="w-3 h-3" /> إضافة حقل
                  </button>
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {tmplFields.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border">
                      <input type="text" value={f.key} onChange={e => {
                        const arr = [...tmplFields]; arr[i] = { ...arr[i], key: e.target.value }; setTmplFields(arr);
                      }} className="w-[120px] border border-slate-200 rounded px-1.5 py-1 text-[10px] outline-none" placeholder="المفتاح" />
                      <input type="text" value={f.label} onChange={e => {
                        const arr = [...tmplFields]; arr[i] = { ...arr[i], label: e.target.value }; setTmplFields(arr);
                      }} className="flex-1 border border-slate-200 rounded px-1.5 py-1 text-[10px] outline-none" placeholder="التسمية" />
                      <select value={f.type} onChange={e => {
                        const arr = [...tmplFields]; arr[i] = { ...arr[i], type: e.target.value as any }; setTmplFields(arr);
                      }} className="w-[70px] border border-slate-200 rounded px-1 py-1 text-[10px] outline-none">
                        <option value="string">نص</option>
                        <option value="number">رقم</option>
                        <option value="date">تاريخ</option>
                        <option value="select">قائمة</option>
                      </select>
                      <button onClick={() => setTmplFields(prev => prev.filter((_, j) => j !== i))}
                        className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clauses */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500">البنود</label>
                  <button onClick={() => setTmplClauses(prev => [...prev, { id: `clause_${Date.now()}_${prev.length}`, title: '', defaultText: '' }])}
                    className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 cursor-pointer">
                    <Plus className="w-3 h-3" /> إضافة بند
                  </button>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {tmplClauses.map((c, i) => (
                    <div key={c.id || i} className="bg-slate-50 p-2 rounded border space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <input type="text" value={c.title} onChange={e => {
                          const arr = [...tmplClauses]; arr[i] = { ...arr[i], title: e.target.value }; setTmplClauses(arr);
                        }} className="flex-1 border border-slate-200 rounded px-1.5 py-1 text-[10px] outline-none" placeholder="عنوان البند" />
                        <button onClick={() => setTmplClauses(prev => prev.filter((_, j) => j !== i))}
                          className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <textarea value={c.defaultText} onChange={e => {
                        const arr = [...tmplClauses]; arr[i] = { ...arr[i], defaultText: e.target.value }; setTmplClauses(arr);
                      }} rows={2} className="w-full border border-slate-200 rounded px-1.5 py-1 text-[10px] outline-none" placeholder={'نص البند... يمكن استخدام [الحقول] كمتغيرات'} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setShowTemplateModal(false)}
                className="text-xs text-slate-500 font-bold px-4 py-2 hover:bg-slate-50 rounded cursor-pointer">إلغاء</button>
              <button onClick={handleSaveCustomTemplate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-6 py-2 rounded-lg cursor-pointer transition shadow-sm">
                {editTemplate ? 'حفظ التعديلات' : 'إضافة القالب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
});

export default ContractGenerator;
