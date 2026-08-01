/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BailiffPapersPanel.tsx — إدارة أوراق السادة المحضرين والإعلانات القضائية.
 *
 * v2.9.7 (Refactored): تقسيم لـ sub-components في `./bailiff/`.
 * الـ main يحتوي على: state + handlers + orchestration فقط.
 * الـ sub-components:
 *   - BailiffStats           : banner إحصائيات
 *   - BailiffFilters         : search/status/court/print-all
 *   - BailiffCard            : عرض ورقة المحضرين كبطاقة
 *   - BailiffActionToolbar   : شريط الأزرار الـ 6
 *   - BailiffForm            : form الإضافة/التعديل
 *
 * الـ السلوك مطابق 100% للنسخة v2.9.6 (2178 سطر).
 */

import React, { useState, useRef } from 'react';
import { Plus, X, Search, Printer, FileText, Download, Eye, RotateCw, Clipboard } from 'lucide-react';
import { BailiffPaper, Case, ClientAttachment, LawDocument, OfficeProfile } from '../types';
import { exportHtmlToWord } from '../utils/wordExportHelper';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import EnvelopePrintPreview from './EnvelopePrintPreview';
import { BailiffStats } from './bailiff/BailiffStats';
import { BailiffFilters } from './bailiff/BailiffFilters';
import { BailiffCard, BailiffCardCallbacks } from './bailiff/BailiffCard';
import { BailiffForm, BailiffFormData } from './bailiff/BailiffForm';

interface BailiffPapersPanelProps {
  bailiffPapers: BailiffPaper[];
  cases: Case[];
  documents?: LawDocument[];
  onAddDocument?: (newDoc: LawDocument) => void;
  onDeleteDocument?: (id: string) => void;
  onAddPaper: (paper: BailiffPaper) => void;
  onUpdatePaper: (paper: BailiffPaper) => void;
  onDeletePaper: (id: string) => void;
  officeProfile: OfficeProfile;
}

const INITIAL_FORM_DATA: BailiffFormData = {
  title: '',
  paperNumber: '',
  submissionDate: new Date().toISOString().split('T')[0],
  receiptDate: '',
  courtName: '',
  courtLocation: '',
  status: 'قيد الإعلان والتسليم',
  opponentName: '',
  opponentAddress: '',
  envelopeType: '',
  deliveryMethod: '',
  caseId: '',
  notes: '',
  announcementImage: undefined,
};

const BailiffPapersPanel = React.memo(function BailiffPapersPanel({
  bailiffPapers = [], cases = [], documents = [],
  onAddDocument, onDeleteDocument,
  onAddPaper, onUpdatePaper, onDeletePaper,
  officeProfile,
}: BailiffPapersPanelProps) {
  const confirm = useConfirm();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courtFilter, setCourtFilter] = useState('all');

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<BailiffFormData>(INITIAL_FORM_DATA);
  const [editingPaper, setEditingPaper] = useState<BailiffPaper | null>(null);
  const [editFormData, setEditFormData] = useState<BailiffFormData | null>(null);

  // Modal state
  const [envelopePreviewPaper, setEnvelopePreviewPaper] = useState<BailiffPaper | null>(null);
  const [fullscreenPaper, setFullscreenPaper] = useState<BailiffPaper | null>(null);
  const [selectedPaperForPreview, setSelectedPaperForPreview] = useState<BailiffPaper | null>(null);
  const [rotation, setRotation] = useState(0);

  // Sync edit form with selected paper
  React.useEffect(() => {
    if (editingPaper) {
      setEditFormData({
        id: editingPaper.id,
        title: editingPaper.title,
        paperNumber: editingPaper.paperNumber,
        submissionDate: editingPaper.submissionDate,
        receiptDate: editingPaper.receiptDate || '',
        courtName: editingPaper.courtName,
        courtLocation: editingPaper.courtLocation || '',
        status: editingPaper.status,
        opponentName: editingPaper.opponentName || '',
        opponentAddress: editingPaper.opponentAddress || '',
        envelopeType: editingPaper.envelopeType || '',
        deliveryMethod: editingPaper.deliveryMethod || '',
        caseId: editingPaper.caseId || '',
        notes: editingPaper.notes || '',
        announcementImage: editingPaper.announcementImage,
      });
    } else {
      setEditFormData(null);
    }
  }, [editingPaper]);

  // Unique courts for filter
  const uniqueCourts = Array.from(new Set(bailiffPapers.map(p => p.courtName).filter(Boolean)));

  // Filtered papers
  const filteredPapers = bailiffPapers.filter(paper => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      paper.title.toLowerCase().includes(q) ||
      paper.paperNumber.toLowerCase().includes(q) ||
      (paper.opponentName && paper.opponentName.toLowerCase().includes(q)) ||
      (paper.caseNumber && paper.caseNumber.toLowerCase().includes(q)) ||
      paper.courtName.toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'all' || paper.status === statusFilter;
    const matchesCourt = courtFilter === 'all' || paper.courtName === courtFilter;
    return matchesSearch && matchesStatus && matchesCourt;
  });

  // Status toggle handler
  const handleToggleStatus = (paper: BailiffPaper) => {
    const statuses: BailiffPaper['status'][] = [
      'قيد الإعلان والتسليم', 'تم الاستلام والتسليم', 'مرتد لعدم الاستدلال', 'مؤجل للإعادة',
    ];
    const currentIndex = statuses.indexOf(paper.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const updatedReceiptDate = statuses[nextIndex] === 'تم الاستلام والتسليم'
      ? new Date().toISOString().split('T')[0]
      : paper.receiptDate;
    onUpdatePaper({ ...paper, status: statuses[nextIndex], receiptDate: updatedReceiptDate });
  };

  // Print single paper
  const handlePrintPaperReport = (paper: BailiffPaper) => {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '100%';
    printIframe.style.bottom = '100%';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = 'none';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><title>تقرير إعلان محضرين - رقم ${paper.paperNumber}</title><style>body{font-family:'Segoe UI',Tahoma,sans-serif;margin:40px;color:#334155;background:#fff;direction:rtl;text-align:right;}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px double #4f46e5;padding-bottom:20px;margin-bottom:30px;}.office-title{font-size:18px;font-weight:900;color:#1e1b4b;}.doc-title{font-size:24px;font-weight:900;color:#4f46e5;text-align:center;margin:10px 0 30px;text-decoration:underline;}.table-details{width:100%;border-collapse:collapse;margin-bottom:30px;}.table-details td{padding:12px 16px;border:1px solid #cbd5e1;font-size:14px;}.table-details td.label{background:#f8fafc;font-weight:bold;color:#1e293b;width:25%;}.status-badge{display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:bold;background:#fef3c7;color:#d97706;border:1px solid #fde68a;}.status-completed{background:#d1fae5;color:#065f46;border-color:#a7f3d0;}.status-returned{background:#fee2e2;color:#991b1b;border-color:#fca5a5;}.notes-box{background:#f8fafc;border-right:4px solid #4f46e5;padding:15px;border-radius:4px;font-size:13px;line-height:1.6;margin-top:20px;}.footer{margin-top:60px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:15px;}@media print{body{margin:20px;}}</style></head><body><div class="header"><div><div class="office-title">مكتب المحامي الرقمي المحترف</div><div style="font-size:12px;color:#64748b;margin-top:4px;">إدارة الشؤون القضائية والإعلانات</div></div><div style="text-align:left;font-size:12px;color:#64748b;"><div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div><div>الحالة: ${paper.status}</div></div></div><div class="doc-title">تقرير تفصيلي لورقة المحضرين والإعلان القضائي</div><table class="table-details"><tr><td class="label">اسم وموضوع الإعلان:</td><td style="font-weight:bold;color:#1e1b4b;font-size:15px;">${paper.title}</td></tr><tr><td class="label">رقم الإعلان وقلم المحضرين:</td><td style="font-weight:bold;font-family:monospace;">${paper.paperNumber}</td></tr><tr><td class="label">المحكمة المعنية:</td><td>${paper.courtName} ${paper.courtLocation ? `(${paper.courtLocation})` : ''}</td></tr><tr><td class="label">الخصم المراد إعلانه:</td><td style="font-weight:bold;">${paper.opponentName || 'غير محدد'}</td></tr><tr><td class="label">تاريخ التقديم للمحضرين:</td><td style="font-family:monospace;">${paper.submissionDate}</td></tr><tr><td class="label">تاريخ الاستلام والرد:</td><td style="font-family:monospace;">${paper.receiptDate || 'قيد الإجراء (لم يتم الاستلام بعد)'}</td></tr><tr><td class="label">القضية المرتبطة بالمكتب:</td><td>${paper.caseNumber ? `قضية رقم ${paper.caseNumber}` : 'غير مرتبطة بقضية مباشرة'}</td></tr><tr><td class="label">حالة الإعلان:</td><td><span class="status-badge ${paper.status === 'تم الاستلام والتسليم' ? 'status-completed' : paper.status === 'مرتد لعدم الاستدلال' ? 'status-returned' : ''}">${paper.status}</span></td></tr></table>${paper.notes ? `<div style="font-weight:bold;font-size:14px;margin-top:25px;color:#1e293b;">ملاحظات توثيقية وقانونية:</div><div class="notes-box">${paper.notes}</div>` : ''}<div class="footer">تم استخراج وطباعة هذا المستند عبر نظام إدارة القضايا والمكاتب القانونية الذكية</div></body></html>`);
      doc.close();
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printIframe), 100);
      }, 500);
    }
  };

  // Export single paper to Word
  const handleExportSinglePaperWord = (paper: BailiffPaper) => {
    const html = `<h2 style="color:#4338ca;border-bottom:2px solid #4338ca;padding-bottom:10px;font-weight:900;text-align:right;direction:rtl;">تقرير تفصيلي لورقة المحضرين</h2><table style="width:100%;border-collapse:collapse;margin-top:20px;direction:rtl;text-align:right;"><tr style="background:#f3f4f6;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;width:30%;">اسم ورقة الإعلان:</td><td style="padding:10px;border:1px solid #e5e7eb;">${paper.title}</td></tr><tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">رقم ورقة المحضرين:</td><td style="padding:10px;border:1px solid #e5e7eb;font-family:monospace;">${paper.paperNumber}</td></tr><tr style="background:#f3f4f6;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">تاريخ التقديم:</td><td style="padding:10px;border:1px solid #e5e7eb;">${paper.submissionDate}</td></tr><tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">تاريخ الاستلام:</td><td style="padding:10px;border:1px solid #e5e7eb;">${paper.receiptDate || 'قيد الرد'}</td></tr><tr style="background:#f3f4f6;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">المحكمة المختصة:</td><td style="padding:10px;border:1px solid #e5e7eb;">${paper.courtName} - ${paper.courtLocation || 'غير محدد'}</td></tr><tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">اسم الخصم المعلن إليه:</td><td style="padding:10px;border:1px solid #e5e7eb;">${paper.opponentName || 'غير محدد'}</td></tr><tr style="background:#f3f4f6;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">القضية المرتبطة:</td><td style="padding:10px;border:1px solid #e5e7eb;">${paper.caseNumber || 'لا يوجد ربط مباشر'}</td></tr><tr><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">حالة الإعلان الحالية:</td><td style="padding:10px;border:1px solid #e5e7eb;color:#4338ca;font-weight:bold;">${paper.status}</td></tr><tr style="background:#f3f4f6;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">ملاحظات قانونية:</td><td style="padding:10px;border:1px solid #e5e7eb;">${paper.notes || 'لا يوجد'}</td></tr></table><div style="margin-top:50px;padding:15px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:11px;color:#6b7280;text-align:center;">هذا التقرير مستخرج ومصدّق تلقائياً بالكامل عبر منصة المحاماة الذكية المتكاملة</div>`;
    exportHtmlToWord(paper.title, html, `تقرير_إعلان_محضرين_${paper.paperNumber}`);
  };

  // Print all filtered papers
  const handlePrintAllPapersReport = () => {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '100%';
    printIframe.style.bottom = '100%';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = 'none';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (doc) {
      const rows = filteredPapers.map((paper, idx) => `<tr><td style="text-align:center;font-family:monospace;">${idx + 1}</td><td style="font-weight:bold;color:#1e1b4b;">${paper.title}</td><td style="font-family:monospace;">${paper.paperNumber}</td><td>${paper.courtName}</td><td>${paper.opponentName || 'غير محدد'}</td><td style="font-family:monospace;text-align:center;">${paper.submissionDate}</td><td style="font-family:monospace;text-align:center;">${paper.receiptDate || 'قيد الرد'}</td><td style="font-weight:bold;text-align:center;">${paper.status}</td></tr>`).join('');

      doc.open();
      doc.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><title>كشف الإعلانات القضائية</title><style>body{font-family:'Segoe UI',Tahoma,sans-serif;margin:30px;color:#334155;background:#fff;direction:rtl;text-align:right;}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4f46e5;padding-bottom:15px;margin-bottom:25px;}.office-title{font-size:16px;font-weight:900;color:#1e1b4b;}.doc-title{font-size:20px;font-weight:900;color:#4f46e5;text-align:center;margin-bottom:25px;}.table-list{width:100%;border-collapse:collapse;margin-bottom:30px;font-size:12px;}.table-list th{background:#f1f5f9;color:#1e293b;font-weight:bold;border:1px solid #cbd5e1;padding:10px;text-align:right;}.table-list td{padding:10px;border:1px solid #e2e8f0;}.footer{margin-top:40px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;}@media print{@page{size:landscape;}body{margin:15px;}}</style></head><body><div class="header"><div><div class="office-title">مكتب المحامي الرقمي المحترف</div><div style="font-size:11px;color:#64748b;margin-top:2px;">إدارة الشؤون القضائية وقوائم المحضرين</div></div><div style="text-align:left;font-size:11px;color:#64748b;"><div>تاريخ الكشف: ${new Date().toLocaleDateString('ar-EG')}</div><div>عدد البنود المدرجة: ${filteredPapers.length} بند</div></div></div><div class="doc-title">جدول كشف ومتابعة أوراق المحضرين والإعلانات القضائية</div><table class="table-list"><thead><tr><th style="width:5%;text-align:center;">م</th><th style="width:25%;">موضوع الإعلان ورسالته</th><th style="width:15%;">رقم المحضرين والمحكمة</th><th style="width:15%;">قلم المحضرين المختص</th><th style="width:15%;">الموجه إليه (الخصم)</th><th style="width:10%;text-align:center;">تاريخ التقديم</th><th style="width:10%;text-align:center;">تاريخ الاستلام والرد</th><th style="width:15%;text-align:center;">الحالة الحالية</th></tr></thead><tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8;">لا توجد بيانات مدرجة في هذا الكشف حالياً.</td></tr>'}</tbody></table><div class="footer">تم استخراج هذا الكشف آلياً بالكامل عبر نظام إدارة المكاتب القانونية الذكية</div></body></html>`);
      doc.close();
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printIframe), 100);
      }, 500);
    }
  };

  // Submit new paper
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.paperNumber || !formData.courtName) {
      await showAlert('الرجاء كتابة اسم الإعلان، رقم الإعلان، واسم محكمة المحضرين التابع لها.');
      return;
    }
    let linkedCaseNumber = '';
    if (formData.caseId) {
      const selectedC = cases.find(c => c.id === formData.caseId);
      if (selectedC) linkedCaseNumber = selectedC.caseNumber;
    }
    const newPaper: BailiffPaper = {
      id: 'bp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      title: formData.title,
      paperNumber: formData.paperNumber,
      submissionDate: formData.submitFormData?.submissionDate || formData.submissionDate || new Date().toISOString().split('T')[0],
      receiptDate: formData.receiptDate,
      courtName: formData.courtName,
      courtLocation: formData.courtLocation,
      status: formData.status,
      opponentName: formData.opponentName,
      opponentAddress: formData.opponentAddress || undefined,
      envelopeType: formData.envelopeType || undefined,
      deliveryMethod: formData.deliveryMethod || undefined,
      caseId: formData.caseId || undefined,
      caseNumber: linkedCaseNumber || undefined,
      notes: formData.notes,
      announcementImage: formData.announcementImage,
    };
    onAddPaper(newPaper);
    setFormData(INITIAL_FORM_DATA);
    setIsAdding(false);
  };

  // Submit edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !editingPaper) return;
    if (!editFormData.title || !editFormData.paperNumber || !editFormData.courtName) {
      await showAlert('يرجى تعبئة كافة الحقول الإجبارية (*).');
      return;
    }
    let linkedCaseNumber = '';
    if (editFormData.caseId) {
      const selectedC = cases.find(c => c.id === editFormData.caseId);
      if (selectedC) linkedCaseNumber = selectedC.caseNumber;
    }
    onUpdatePaper({
      ...editingPaper,
      title: editFormData.title,
      paperNumber: editFormData.paperNumber,
      submissionDate: editFormData.submissionDate,
      receiptDate: editFormData.receiptDate || undefined,
      courtName: editFormData.courtName,
      courtLocation: editFormData.courtLocation || undefined,
      status: editFormData.status,
      opponentName: editFormData.opponentName || undefined,
      opponentAddress: editFormData.opponentAddress || undefined,
      envelopeType: editFormData.envelopeType || undefined,
      deliveryMethod: editFormData.deliveryMethod || undefined,
      caseId: editFormData.caseId || undefined,
      caseNumber: linkedCaseNumber || undefined,
      notes: editFormData.notes || undefined,
      announcementImage: editFormData.announcementImage,
    });
    setEditingPaper(null);
  };

  // Card callbacks
  const cardCallbacks: BailiffCardCallbacks = React.useMemo(() => ({
    onPreview: setSelectedPaperForPreview,
    onEdit: setEditingPaper,
    onPrint: handlePrintPaperReport,
    onEnvelope: setEnvelopePreviewPaper,
    onExportWord: handleExportSinglePaperWord,
    onDelete: (p) => onDeletePaper(p.id),
    onToggleStatus: handleToggleStatus,
    onFullscreen: (p) => { setFullscreenPaper(p); setRotation(0); },
    onAddDocument: onAddDocument ? (p, doc) => onAddDocument(doc) : undefined,
    onDeleteDocument,
    cases: cases.map(c => ({ id: c.id, caseNumber: c.caseNumber, clientName: c.clientName, clientId: c.clientId })),
    documents,
  }), [cases, documents, onAddDocument, onDeleteDocument, onDeletePaper]);

  return (
    <div className="space-y-6 text-end" dir="rtl" id="bailiff-papers-view-root">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">مكتب المحامي الرقمي المحترف</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />تخزين IndexedDB سحابي
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">إدارة أوراق السادة المحضرين والإعلانات القضائية</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              قم بمتابعة مواعيد تقديم وعودة الإعلانات القضائية من محضري المحاكم المختلفة وصور المستندات وبطاقات الرقم القومي للخصوم بجودة فائقة.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 py-3 rounded-2xl font-black shadow-lg transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            {isAdding ? (<><X className="w-4 h-4" />إلغاء الإضافة</>) : (<><Plus className="w-4 h-4" />تسجيل مستند محضرين جديد</>)}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-[13px] text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-indigo-500" />
            تعبئة البيانات الرسمية لورقة المحضرين
          </h3>
          <BailiffForm
            mode="add"
            formData={formData}
            setFormData={setFormData}
            cases={cases}
            onClose={() => setIsAdding(false)}
            onSubmit={handleAddSubmit}
          />
        </div>
      )}

      {/* Stats */}
      <BailiffStats papers={bailiffPapers} />

      {/* Filters */}
      <BailiffFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        courtFilter={courtFilter}
        onCourtFilterChange={setCourtFilter}
        uniqueCourts={uniqueCourts}
        filteredCount={filteredPapers.length}
        onPrintAll={handlePrintAllPapersReport}
      />

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="bailiff-cards-grid">
        {filteredPapers.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100">
            <Clipboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-extrabold text-slate-700 mb-1">لا توجد أوراق أو إعلانات محضرين تطابق بحثك</h4>
            <p className="text-xs text-slate-400">قم بإضافة مستند جديد عبر نموذج الإضافة العلوي لتسجيله.</p>
          </div>
        ) : (
          filteredPapers.map(paper => (
            <BailiffCard key={paper.id} paper={paper} searchQuery={searchQuery} callbacks={cardCallbacks} />
          ))
        )}
      </div>

      {/* Fullscreen Preview */}
      {fullscreenPaper && fullscreenPaper.announcementImage && (
        <BailiffFullscreenModal
          paper={fullscreenPaper}
          rotation={rotation}
          onRotate={() => setRotation(r => (r + 90) % 360)}
          onClose={() => setFullscreenPaper(null)}
        />
      )}

      {/* Detail Preview Modal */}
      {selectedPaperForPreview && (
        <BailiffPreviewModal
          paper={selectedPaperForPreview}
          onEdit={(p) => { setEditingPaper(p); setSelectedPaperForPreview(null); }}
          onPrint={handlePrintPaperReport}
          onExportWord={handleExportSinglePaperWord}
          onClose={() => setSelectedPaperForPreview(null)}
          onFullscreen={(p) => { setFullscreenPaper(p); setRotation(0); }}
        />
      )}

      {/* Edit Modal */}
      {editingPaper && editFormData && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-end leading-relaxed" dir="rtl">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h4 className="font-extrabold text-sm">تعديل بيانات ورقة المحضرين والإعلان</h4>
              </div>
              <button type="button" onClick={() => setEditingPaper(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <BailiffForm
                mode="edit"
                formData={editFormData}
                setFormData={setEditFormData as any}
                cases={cases}
                onClose={() => setEditingPaper(null)}
                onSubmit={handleEditSubmit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Envelope */}
      {envelopePreviewPaper && (
        <EnvelopePrintPreview paper={envelopePreviewPaper} office={officeProfile} onClose={() => setEnvelopePreviewPaper(null)} />
      )}
    </div>
  );
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  Internal modals                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

interface BailiffFullscreenModalProps {
  paper: BailiffPaper;
  rotation: number;
  onRotate: () => void;
  onClose: () => void;
}

const BailiffFullscreenModal = React.memo(function BailiffFullscreenModal({
  paper, rotation, onRotate, onClose,
}: BailiffFullscreenModalProps) {
  const handlePrint = (att: ClientAttachment) => {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '100%';
    printIframe.style.bottom = '100%';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = 'none';
    document.body.appendChild(printIframe);
    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>${att.name}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#fff;}img{max-width:100%;max-height:100%;object-fit:contain;}@media print{body{margin:0;}img{max-width:100vw;max-height:100vh;}}</style></head><body><img src="${att.dataUrl}"/></body></html>`);
      doc.close();
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printIframe), 100);
      }, 500);
    }
  };

  if (!paper.announcementImage) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden leading-relaxed text-end" dir="rtl">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clipboard className="w-5 h-5 text-indigo-400" />
            <div>
              <h4 className="font-extrabold text-xs">{paper.title}</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                رقم المحضرين: {paper.paperNumber} • تاريخ التقديم: {paper.submissionDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onRotate} className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-bold" title="تدوير المستند 90 درجة">
              <RotateCw className="w-4 h-4" />تدوير
            </button>
            <button type="button" onClick={() => handlePrint(paper.announcementImage!)} className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-300 hover:text-white" title="طباعة الإعلان القضائي">
              <Printer className="w-4 h-4" />
            </button>
            <a href={paper.announcementImage.dataUrl} download={paper.announcementImage.name} className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-300 hover:text-white" title="تنزيل">
              <Download className="w-4 h-4" />
            </a>
            <button type="button" onClick={onClose} className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition font-bold" title="إغلاق المعاينة">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-auto min-h-[420px]">
          <div style={{ transform: `rotate(${rotation}deg)` }} className="transition-transform duration-200 ease-out max-w-full max-h-[64vh]">
            <img src={paper.announcementImage.dataUrl} alt={paper.title} className="max-w-full max-h-[64vh] object-contain rounded-xl shadow-lg border border-slate-800" />
          </div>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 px-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600 font-bold">
          <div>
            <span className="text-slate-400 block font-bold mb-0.5">محكمة المحضرين ومكانها:</span>
            <span className="text-slate-800 font-extrabold">{paper.courtName} - {paper.courtLocation || 'غير محدد'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-bold mb-0.5">الخصم والحالة:</span>
            <span className="text-slate-800">{paper.opponentName || 'لا يوجد'} • <span className="text-indigo-600">{paper.status}</span></span>
          </div>
          <div className="flex items-center justify-end">
            <button type="button" onClick={onClose} className="text-indigo-600 hover:underline">إغلاق هذه المعاينة المتقدمة</button>
          </div>
        </div>
      </div>
    </div>
  );
});

interface BailiffPreviewModalProps {
  paper: BailiffPaper;
  onEdit: (p: BailiffPaper) => void;
  onPrint: (p: BailiffPaper) => void;
  onExportWord: (p: BailiffPaper) => void;
  onClose: () => void;
  onFullscreen: (p: BailiffPaper) => void;
}

const BailiffPreviewModal = React.memo(function BailiffPreviewModal({
  paper, onEdit, onPrint, onExportWord, onClose, onFullscreen,
}: BailiffPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/85 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-end leading-relaxed" dir="rtl">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clipboard className="w-5 h-5 text-indigo-400" />
            <h4 className="font-extrabold text-sm">تفاصيل ومعاينة ورقة المحضرين</h4>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="border-b border-slate-100 pb-4">
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-100">{paper.status}</span>
            <h3 className="text-base font-black text-slate-800 mt-2">{paper.title}</h3>
            <p className="text-xs text-slate-400 font-mono mt-1">رقم الورقة: {paper.paperNumber}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl space-y-1">
              <span className="text-slate-400 block font-bold">اسم الخصم:</span>
              <span className="text-slate-800 font-extrabold">{paper.opponentName || 'غير محدد'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl space-y-1">
              <span className="text-slate-400 block font-bold">المحكمة المعنية:</span>
              <span className="text-slate-800 font-extrabold">{paper.courtName}</span>
            </div>
            {paper.courtLocation && (
              <div className="bg-slate-50 p-3 rounded-xl space-y-1 md:col-span-2">
                <span className="text-slate-400 block font-bold">مكان وعنوان محكمة قلم المحضرين:</span>
                <span className="text-slate-800 font-bold">{paper.courtLocation}</span>
              </div>
            )}
            <div className="bg-slate-50 p-3 rounded-xl space-y-1">
              <span className="text-slate-400 block font-bold">تاريخ التقديم:</span>
              <span className="text-slate-800 font-mono font-bold">{paper.submissionDate}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl space-y-1">
              <span className="text-slate-400 block font-bold">تاريخ الاستلام والرد:</span>
              <span className="text-slate-800 font-mono font-bold">{paper.receiptDate || 'قيد الرد...'}</span>
            </div>
            {paper.caseNumber && (
              <div className="bg-indigo-50/40 border border-indigo-100 p-3 rounded-xl space-y-1 md:col-span-2">
                <span className="text-indigo-600 block font-bold">القضية المرتبطة:</span>
                <span className="text-slate-800 font-bold">قضية رقم {paper.caseNumber}</span>
              </div>
            )}
          </div>
          {paper.notes && (
            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-1">
              <span className="text-indigo-800 block font-black text-xs">ملاحظات قانونية:</span>
              <p className="text-xs text-slate-600 leading-relaxed font-bold">{paper.notes}</p>
            </div>
          )}
          {paper.announcementImage && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-700">المستند أو الصورة المرفقة:</h5>
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {paper.announcementImage.fileType.startsWith('image/') ? (
                      <img src={paper.announcementImage.dataUrl} alt="attachment" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-5 h-5 text-indigo-500" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate">{paper.announcementImage.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{(paper.announcementImage.size / 1024).toFixed(1)} KB • {paper.announcementImage.fileType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {paper.announcementImage.fileType.startsWith('image/') ? (
                    <button type="button" onClick={() => onFullscreen(paper)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                      <Eye className="w-3.5 h-3.5" /><span>عرض الحجم الكامل</span>
                    </button>
                  ) : (
                    <a href={paper.announcementImage.dataUrl} download={paper.announcementImage.name} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                      <Download className="w-3.5 h-3.5" /><span>تحميل</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onPrint(paper)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer">
              <Printer className="w-4 h-4" /><span>طباعة التقرير</span>
            </button>
            <button type="button" onClick={() => onExportWord(paper)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer">
              <FileText className="w-4 h-4" /><span>تصدير Word</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onEdit(paper)} className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer">تعديل</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BailiffPapersPanel;
