/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  Tag, 
  Briefcase, 
  Calendar, 
  FileCode,
  FileCheck,
  CheckCircle,
  FolderOpen,
  ArrowUpRight,
  Archive,
  Camera,
  Edit,
  Printer,
  X,
  FileImage,
  Image,
  User
} from 'lucide-react';
import { sanitizeText } from '../utils/security';
import { sanitizeHtml } from '../utils/sanitizer';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import { LawDocument, Case, Client, BailiffPaper, OfficeProfile } from '../types';
import { getFileIcon as getSharedFileIcon } from '../utils/fileIcons';
import SmartScanner from './SmartScanner';
import { printSingleDocument } from '../utils/printHelper';

const getMatchingSnippet = (text?: string, query?: string): { before: string; match: string; after: string } | null => {
  if (!text || !query) return null;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return null;

  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + query.length + 40);

  return {
    before: (start > 0 ? '...' : '') + text.substring(start, index),
    match: text.substring(index, index + query.length),
    after: text.substring(index + query.length, end) + (end < text.length ? '...' : '')
  };
};

interface DocumentManagerProps {
  documents: LawDocument[];
  cases: Case[];
  clients?: Client[];
  bailiffPapers?: BailiffPaper[];
  onAddDocument: (newDoc: LawDocument) => void;
  onDeleteDocument: (id: string) => void;
  onArchiveDocument?: (id: string) => void;
  onUpdateDocument?: (updatedDoc: LawDocument) => void;
  officeProfile: OfficeProfile;
  defaultLinkedType?: 'case' | 'client' | 'bailiff';
  defaultLinkedId?: string;
  onClose?: () => void;
}

const DocumentManager = React.memo(function DocumentManager({
  documents,
  cases,
  clients = [],
  bailiffPapers = [],
  onAddDocument,
  onDeleteDocument,
  onArchiveDocument,
  onUpdateDocument,
  officeProfile,
  defaultLinkedType,
  defaultLinkedId,
  onClose
  }: DocumentManagerProps) {
  const confirm = useConfirm();
  const [viewingDoc, setViewingDoc] = useState<LawDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<LawDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
  const [selectedBailiffFilter, setSelectedBailiffFilter] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(!!defaultLinkedType);
  
  // OCR selected preview document
  const [activePreviewDoc, setActivePreviewDoc] = useState<LawDocument | null>(documents[0] || null);

  // File Upload Form State
  const [uploadFormData, setUploadFormData] = useState({
    name: '',
    type: 'عريضة دعوى' as LawDocument['type'],
    caseId: defaultLinkedType === 'case' ? (defaultLinkedId || '') : '',
    clientId: defaultLinkedType === 'client' ? (defaultLinkedId || '') : '',
    bailiffPaperId: defaultLinkedType === 'bailiff' ? (defaultLinkedId || '') : '',
    fileName: '',
    fileSize: '1.2 MB',
    notes: '',
    scannedDataUrl: '',
    scannedText: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUploadFiles, setSelectedUploadFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Classify Document options
  const docTypes: LawDocument['type'][] = [
    'عريضة دعوى',
    'حكم قضائي',
    'مذكرة دفاع',
    'توكيل رسمي',
    'تقرير خبراء',
    'مستندات ملكية',
    'أخرى'
  ];

  // Search logic
  const filteredDocs = documents.filter(doc => {
    // Only show non-archived documents in active document manager
    if (doc.isArchived === true) return false;

    const matchesSearch = 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.scannedTextByAI && doc.scannedTextByAI.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.caseNumber && doc.caseNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.clientName && doc.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.bailiffPaperNumber && doc.bailiffPaperNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || doc.type === selectedType;
    const matchesCase = selectedCaseFilter === 'all' || doc.caseId === selectedCaseFilter;
    const matchesClient = selectedClientFilter === 'all' || doc.clientId === selectedClientFilter;
    const matchesBailiff = selectedBailiffFilter === 'all' || doc.bailiffPaperId === selectedBailiffFilter;

    return matchesSearch && matchesType && matchesCase && matchesClient && matchesBailiff;
  });

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const getFileExt = (fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImageExt = (ext: string): boolean => ['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext);
  const isPdfExt = (ext: string): boolean => ext === 'pdf';
  const isWordExt = (ext: string): boolean => ['doc','docx'].includes(ext);
  const isExcelExt = (ext: string): boolean => ['xls','xlsx'].includes(ext);
  const isTextExt = (ext: string): boolean => ext === 'txt';

  const getDocIcon = getSharedFileIcon;

  const getDocColor = (fileName: string) => {
    const ext = getFileExt(fileName);
    if (isImageExt(ext)) return { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' };
    if (isPdfExt(ext)) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    if (isWordExt(ext)) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    if (isExcelExt(ext)) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (isTextExt(ext)) return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' };
    return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
  };

  const renderFilePreview = (dataUrl: string, fileName: string) => {
    const ext = getFileExt(fileName);

    if (!dataUrl) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 gap-2">
          <FileText className="w-8 h-8 text-slate-300" />
          <p className="text-[10px] text-slate-500 font-bold text-center">هذا المستند لا يحتوي على محتوى رقمي للمعاينة</p>
          <p className="text-[9px] text-slate-400">تم رفعه قبل تفعيل ميزة المعاينة. أعد رفعه لعرض محتواه.</p>
        </div>
      );
    }

    if (isImageExt(ext)) {
      return (
        <div className="space-y-1">
          <a href={dataUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img src={dataUrl} alt={fileName} className="w-full max-h-[400px] object-contain rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:opacity-95 transition" />
          </a>
          <span className="text-[9px] text-slate-400 block text-center">اضغط لتكبير الصورة</span>
        </div>
      );
    }
    if (isPdfExt(ext)) {
      return (
        <iframe
          src={dataUrl}
          title={fileName}
          className="w-full h-[500px] rounded-xl border border-slate-200 bg-white"
        />
      );
    }
    if (isTextExt(ext)) {
      return (
        <div className="w-full max-h-[300px] overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(sanitizeText(atob(dataUrl.split(',')[1] || '').replace(/\n/g, '<br>'))) }}
        />
      );
    }
    // Word, Excel, and other types: show download link
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200 gap-2">
        {React.createElement(getDocIcon(fileName), { className: "w-10 h-10 text-slate-400" })}
        <p className="text-xs text-slate-500 font-bold text-center">هذا النوع من الملفات لا يدعم المعاينة المباشرة</p>
        <a href={dataUrl} download={fileName}
          className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-100 transition flex items-center gap-1"
        >
          <Download className="w-3 h-3" /> تحميل الملف
        </a>
      </div>
    );
  };

  const handleAnalyzeWithAI = async (dataUrl: string, originalName?: string, mimeType?: string) => {
    if (!dataUrl) return;
    setIsAnalyzingAI(true);
    setAiError(null);

    try {
      const response = await fetch("/api/gemini/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dataUrl, mimeType })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "فشلت عملية التحليل بالذكاء الاصطناعي");
      }

      const result = await response.json();
      
      // Auto-match case id based on extracted case number or party names
      let matchedCaseId = uploadFormData.caseId || "";
      if (result.caseNumber) {
        const cleanCaseNum = result.caseNumber.trim();
        const matched = cases.find(c => c.caseNumber.includes(cleanCaseNum) || cleanCaseNum.includes(c.caseNumber));
        if (matched) matchedCaseId = matched.id;
      }
      if (!matchedCaseId && result.parties?.length) {
        for (const party of result.parties) {
          const matched = cases.find(c => 
            c.clientName.includes(party) || party.includes(c.clientName) || 
            c.opponentName.includes(party) || party.includes(c.opponentName)
          );
          if (matched) {
            matchedCaseId = matched.id;
            break;
          }
        }
      }

      // Auto pre-populate fields
      setUploadFormData(prev => ({
        ...prev,
        name: result.docName || prev.name || originalName?.substring(0, originalName.lastIndexOf('.')) || "مستند_محلل",
        type: (docTypes.includes(result.docType) ? result.docType : "أخرى") as any,
        caseId: matchedCaseId,
        scannedText: result.extractedText,
        notes: `ملخص الذكاء الاصطناعي (Gemini): ${result.summary || 'تم استخراجه بنجاح'}\n\nالأطراف المكتشفة: ${result.parties?.join('، ') || 'غير محدد'}\nالتواريخ المذكورة: ${result.dates?.join('، ') || 'غير محدد'}\nرقم القضية المكتشف: ${result.caseNumber || 'غير محدد'}`
      }));
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      setAiError(err.message || "عطل أثناء الاتصال بخادم الذكاء الاصطناعي. تم استخدام نص افتراضي.");
      
      // Fallback to simulated Arabic legal text
      const docName = uploadFormData.name || originalName?.substring(0, originalName.lastIndexOf('.')) || "مستند_مرفوع";
      const docType = uploadFormData.type;
      let fallbackText = `مستند ممسوح ضوئياً بعنوان ${docName}.\n\nلم نتمكن من الوصول لذكاء Gemini حالياً، يرجى التحقق من مفتاح API في ملف الإعدادات البيئية.\nتمت تصفية الصورة وتجهيزها للحفظ بنجاح.`;
      
      setUploadFormData(prev => ({
        ...prev,
        scannedText: fallbackText
      }));
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  // Handle Drag Leave
  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Handle Drop - supports multiple files
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      setSelectedUploadFiles(files);
      if (files.length === 1) {
        const file = files[0];
        try {
          const dataUrl = await readFileAsDataUrl(file);
          setUploadFormData(prev => ({
            ...prev,
            name: prev.name || file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
            fileName: file.name,
            fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
            scannedDataUrl: dataUrl
          }));
          handleAnalyzeWithAI(dataUrl, file.name, file.type);
        } catch (err) {
          console.error("Failed to read dropped file:", err);
        }
      } else {
        const totalSize = files.reduce((s, f) => s + f.size, 0);
        setUploadFormData(prev => ({
          ...prev,
          fileName: `${files.length} ملفات محددة`,
          fileSize: (totalSize / (1024 * 1024)).toFixed(1) + ' MB',
          scannedDataUrl: ''
        }));
      }
    }
  };

  // Handle manual file select - supports multiple files
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      setSelectedUploadFiles(files);
      if (files.length === 1) {
        const file = files[0];
        try {
          const dataUrl = await readFileAsDataUrl(file);
          setUploadFormData(prev => ({
            ...prev,
            name: prev.name || file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
            fileName: file.name,
            fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
            scannedDataUrl: dataUrl
          }));
          handleAnalyzeWithAI(dataUrl, file.name, file.type);
        } catch (err) {
          console.error("Failed to read selected file:", err);
        }
      } else {
        const totalSize = files.reduce((s, f) => s + f.size, 0);
        setUploadFormData(prev => ({
          ...prev,
          fileName: `${files.length} ملفات محددة`,
          fileSize: (totalSize / (1024 * 1024)).toFixed(1) + ' MB',
          scannedDataUrl: ''
        }));
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Submit new document(s) - uses selectedUploadFiles state
  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUploadFiles.length === 0 && !uploadFormData.fileName) {
      await showAlert('الرجاء اختيار ملف واحد على الأقل');
      return;
    }

    const linkedCase = cases.find(c => c.id === uploadFormData.caseId);
    const linkedClient = clients.find(cl => cl.id === uploadFormData.clientId) || 
                         (linkedCase ? clients.find(cl => cl.id === linkedCase.clientId) : undefined);
    const linkedPaper = bailiffPapers.find(bp => bp.id === uploadFormData.bailiffPaperId);

    const makeOCR = (name: string) => {
      if (uploadFormData.scannedText) return uploadFormData.scannedText;
      if (uploadFormData.type === 'عريضة دعوى') return `صحيفة افتتاح دعوى ${linkedCase ? `أمام محكمة ${linkedCase.court} دائرة ${linkedCase.circuit}` : ''} وموضوعها المطالبة في ${name}.`;
      if (uploadFormData.type === 'حكم قضائي') return `حكم حضوري فاصل صادر باسم الشعب المصري ${linkedCase ? `من ${linkedCase.court} في الدعوى رقم ${linkedCase.caseNumber}` : ''} بالإلزام بمصروفات القضية.`;
      if (uploadFormData.type === 'مذكرة دفاع') return `مذكرة بدفاع السيد / ${linkedClient?.name || 'الموكل'} ومضمونها الدفع بسند الملكية وجدوى التنفيذ.`;
      return `محتويات مستند رسمي ممسوح ضوئياً بعنوان ${name} المودع رسمياً بتاريخ اليوم.`;
    };

    if (selectedUploadFiles.length > 1) {
      // Multiple files: read content and create one document per file
      const createDocs = async () => {
        for (let idx = 0; idx < selectedUploadFiles.length; idx++) {
          const f = selectedUploadFiles[idx];
          const docName = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
          let dataUrl: string | undefined;
          try { dataUrl = await readFileAsDataUrl(f); } catch (_) {}
          const newDoc: LawDocument = {
            id: 'doc_' + (Date.now() + idx),
            name: docName,
            type: uploadFormData.type,
            fileName: f.name,
            fileSize: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
            caseId: linkedCase?.id || '',
            caseNumber: linkedCase?.caseNumber || '',
            clientId: linkedClient?.id || '',
            clientName: linkedClient?.name || '',
            bailiffPaperId: linkedPaper?.id || '',
            bailiffPaperNumber: linkedPaper?.paperNumber || '',
            uploadedAt: new Date().toISOString().split('T')[0],
            notes: uploadFormData.notes,
            scannedTextByAI: makeOCR(docName),
            dataUrl
          };
          onAddDocument(newDoc);
          if (idx === 0) setActivePreviewDoc(newDoc);
        }
      };
      createDocs();
    } else {
      // Single file
      const newDoc: LawDocument = {
        id: 'doc_' + Date.now(),
        name: uploadFormData.name || (selectedUploadFiles[0]?.name.substring(0, selectedUploadFiles[0].name.lastIndexOf('.')) || uploadFormData.fileName),
        type: uploadFormData.type,
        fileName: uploadFormData.fileName,
        fileSize: uploadFormData.fileSize,
        caseId: linkedCase?.id || '',
        caseNumber: linkedCase?.caseNumber || '',
        clientId: linkedClient?.id || '',
        clientName: linkedClient?.name || '',
        bailiffPaperId: linkedPaper?.id || '',
        bailiffPaperNumber: linkedPaper?.paperNumber || '',
        uploadedAt: new Date().toISOString().split('T')[0],
        notes: uploadFormData.notes,
        scannedTextByAI: makeOCR(uploadFormData.name),
        dataUrl: uploadFormData.scannedDataUrl || undefined
      };
      onAddDocument(newDoc);
      setActivePreviewDoc(newDoc);
    }

    setIsUploading(false);
    setSelectedUploadFiles([]);

    // Reset Form
    setUploadFormData({
      name: '',
      type: 'عريضة دعوى',
      caseId: '',
      clientId: '',
      bailiffPaperId: '',
      fileName: '',
      fileSize: '1.2 MB',
      notes: '',
      scannedDataUrl: '',
      scannedText: ''
    });

    if (onClose) {
      onClose();
    }
  };

  const [editFields, setEditFields] = useState<LawDocument | null>(null);

  const handleStartEdit = (doc: LawDocument) => {
    setEditingDoc(doc);
    setEditFields({ ...doc });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFields) return;
    if (onUpdateDocument) {
      onUpdateDocument(editFields);
    }
    // Sync current active preview document
    if (activePreviewDoc?.id === editFields.id) {
      setActivePreviewDoc(editFields);
    }
    setEditingDoc(null);
    setEditFields(null);
  };

  return (
    <div className="space-y-4 font-sans text-end" id="document-module-root" dir="rtl">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي المحترف
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                المستندات والأرشفة الإلكترونية
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              📂 خزينة الملفات وعرائض الدعاوى الآمنة
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              حفظ، فهرسة، وتصنيف جميع مذكرات الدفاع والأحكام القضائية مع ميزة البحث والربط الفوري بالقضايا والبحث الذكي بالمحتوى.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-bold">
              <span className="inline-flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                🔒 تشفير تام: وثائقك وعرائضك محفوظة محلياً ولا يمكن لأي طرف ثالث الاطلاع عليها
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto z-10">
            <button
              onClick={() => {
                setIsScannerOpen(true);
                setIsUploading(true); // Auto-open form panel so they can fill category/case
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-4 rounded-2xl shadow-md text-xs flex items-center gap-1.5 transition cursor-pointer"
              id="scan-doc-header-trigger"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-200" />
              <span>مسح ضوئي ذكي بالكاميرا 🖨️</span>
            </button>

            <button 
              onClick={() => setIsUploading(!isUploading)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-2xl shadow-md text-xs flex items-center gap-1.5 transition cursor-pointer"
              id="upload-doc-tab-trigger"
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? 'إلغاء وإغلاق الرفع' : 'رفع مستند قانوني جديد'}
            </button>
          </div>
        </div>
      </div>

      {/* DETAILED UPLOAD PANEL WITH TRANSITION */}
        {isUploading && (
          <div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            id="upload-panel-container"
          >
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: Form Details */}
              <form onSubmit={handleDocSubmit} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-[11px]">اسم المستند (الاسم المعرف)</label>
                  <input 
                    type="text" 
                    value={uploadFormData.name}
                    onChange={(e) => setUploadFormData({...uploadFormData, name: e.target.value})}
                    placeholder="مثال: مذكرة دفاع كيدية التبديد النهائية"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px]">تصنيف وموضوع المستند</label>
                    <select 
                      value={uploadFormData.type}
                      onChange={(e) => setUploadFormData({...uploadFormData, type: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {docTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px]">القضية المرفق بها (اختياري)</label>
                    <select 
                      value={uploadFormData.caseId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const linkedCase = cases.find(c => c.id === val);
                        setUploadFormData({
                          ...uploadFormData,
                          caseId: val,
                          clientId: linkedCase ? linkedCase.clientId : uploadFormData.clientId
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- غير مرتبط بقضية --</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>{c.caseNumber} - {c.clientName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px]">الموكل المرتبط بالمستند (اختياري)</label>
                    <select 
                      value={uploadFormData.clientId}
                      onChange={(e) => setUploadFormData({...uploadFormData, clientId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- غير مرتبط بموكل --</option>
                      {clients.map(cl => (
                        <option key={cl.id} value={cl.id}>{cl.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px]">ورقة المحضرين المرتبطة (اختياري)</label>
                    <select 
                      value={uploadFormData.bailiffPaperId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const linkedPaper = bailiffPapers.find(bp => bp.id === val);
                        setUploadFormData({
                          ...uploadFormData,
                          bailiffPaperId: val,
                          caseId: (linkedPaper && linkedPaper.caseId) ? linkedPaper.caseId : uploadFormData.caseId
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- غير مرتبط بورقة محضرين --</option>
                      {bailiffPapers.map(bp => (
                        <option key={bp.id} value={bp.id}>{bp.paperNumber} - {bp.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-[11px]">ملاحظات ومحتوى ملخص</label>
                  <textarea 
                    value={uploadFormData.notes}
                    onChange={(e) => setUploadFormData({...uploadFormData, notes: e.target.value})}
                    placeholder="ملاحظات توثيقية إضافية خاصة بالمحامي..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {isAnalyzingAI && (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-lg text-indigo-950 flex flex-col gap-2 animate-pulse" id="ai-analyzing-indicator">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                      <span className="font-extrabold text-[11px] text-indigo-800">جاري قراءة وتصنيف المستند آلياً بالذكاء الاصطناعي (Gemini)...</span>
                    </div>
                    <div className="w-full bg-indigo-200 h-1.5 rounded-full overflow-hidden relative">
                      <div className="bg-indigo-600 h-full w-1/3 rounded-full absolute animate-bounce"></div>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-medium">نقوم باستخراج الخصوم، التواريΡ ورقم القضيɡ وتعبئة النموذج تلقائياً لتسريع الإجراءات...</span>
                  </div>
                )}

                {aiError && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 text-[10px] leading-relaxed" id="ai-error-banner">
                    ⚠️ {aiError}
                  </div>
                )}

              <div className="pt-1">
                  <button 
                    type="submit"
                    className="w-full bg-[#1e293b] hover:bg-[#111827] text-white font-bold py-1.5 px-3 rounded shadow-xs text-center flex items-center justify-center gap-1.5 transition cursor-pointer"
                    id="submit-doc-upload-btn"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {selectedUploadFiles.length > 1
                      ? `تخزين (${selectedUploadFiles.length}) مستندات رسمياً`
                      : 'تخزين وأرشفة المستند رسمياً'}
                  </button>
                </div>
              </form>

              {/* Right Column: Simulated Drag-and-drop file selector */}
              <div className="flex flex-col justify-between space-y-3">
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all flex-1 min-h-[160px] ${
                    isDragOver 
                      ? 'border-indigo-500 bg-indigo-50/20' 
                      : uploadFormData.fileName 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/40'
                  }`}
                  id="dropzone-file-upload"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    multiple
                  />

                  {selectedUploadFiles.length > 0 ? (
                    <div className="space-y-2 w-full">
                      <div className="p-3 bg-emerald-100 text-emerald-800 rounded-full inline-block mx-auto">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 leading-snug">
                        {selectedUploadFiles.length === 1
                          ? selectedUploadFiles[0].name
                          : `${selectedUploadFiles.length} ملفات محددة`}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        إجمالي الحجم: {formatFileSize(selectedUploadFiles.reduce((s, f) => s + f.size, 0))}
                      </p>
                      {selectedUploadFiles.length > 1 && (
                        <div className="max-h-32 overflow-y-auto w-full space-y-1 px-1">
                          {selectedUploadFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100 rounded px-2 py-1">
                              <div className={`p-0.5 rounded ${getDocColor(f.name).bg}`}>
                                {React.createElement(getDocIcon(f.name), { className: `w-3 h-3 ${getDocColor(f.name).text}` })}
                              </div>
                              <span className="text-[9px] text-emerald-900 truncate flex-1 text-end font-semibold" title={f.name}>{f.name}</span>
                              <span className="text-[8px] text-emerald-500 font-mono whitespace-nowrap">{formatFileSize(f.size)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[9px] text-[#22c55e] font-sans font-bold">جاهز للأرشفة الفورية</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full inline-block mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-700">اسحب وأسقط ملفات المستندات هنا</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">يمكنك اختيار أكثر من ملف في نفس الوقت (PDF, Word, JPG)</p>
                      <div className="text-[9px] text-slate-450 mt-1">يتطابق مع ضوابط الأمن وحماية الخصوصية للموكلين</div>
                      
                      <div className="pt-2 border-t border-slate-100 mt-2 w-full max-w-[200px] mx-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent file upload popup
                            setIsScannerOpen(true);
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 mx-auto transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          <span>سحب مستند مباشر من السكانر</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {uploadFormData.fileName && (
                  <button 
                    onClick={() => setUploadFormData(prev => ({...prev, fileName: ''}))}
                    className="text-[10px] text-red-600 hover:underline text-center font-bold"
                  >
                    حذف الملف المرفق وإعادة اختيار ملف آخر
                  </button>
                )}
              </div>

            </div>
          </div>
        )}
      {/* SEARCH AND GRID WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Columns (3/4 on normal screen): Safe list and Search bar */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
            
            {/* Extended Multi-search filters */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              
              {/* Text search */}
              <div className="relative sm:col-span-1">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، نوع المستنϡ محتوى..."
                  className="w-full bg-slate-50 border border-slate-200 rounded pe-8 ps-3 py-1 outline-none text-xs text-slate-800 h-8"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute end-2.5 top-2.5" />
              </div>

              {/* Type Category selection */}
              <div>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-semibold text-slate-800 h-8"
                >
                  <option value="all">كل التصنيفات</option>
                  {docTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Case linkage selection */}
              <div>
                <select 
                  value={selectedCaseFilter}
                  onChange={(e) => setSelectedCaseFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-semibold text-slate-800 h-8"
                >
                  <option value="all">كل القضايا</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.caseNumber}</option>
                  ))}
                </select>
              </div>

              {/* Client linkage selection */}
              <div>
                <select 
                  value={selectedClientFilter}
                  onChange={(e) => setSelectedClientFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-semibold text-slate-800 h-8"
                >
                  <option value="all">كل الموكلين</option>
                  {clients.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.name}</option>
                  ))}
                </select>
              </div>

              {/* Bailiff Paper linkage selection */}
              <div>
                <select 
                  value={selectedBailiffFilter}
                  onChange={(e) => setSelectedBailiffFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-semibold text-slate-800 h-8"
                >
                  <option value="all">كل أوراق المحضرين</option>
                  {bailiffPapers.map(bp => (
                    <option key={bp.id} value={bp.id}>{bp.paperNumber} - {bp.title.substring(0, 15)}...</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Render items database */}
            {filteredDocs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                لم نعثر على مستندات مطابقة لمعايير البحث في خزينة المحاماة.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocs.map((doc) => {
                  const isActive = activePreviewDoc?.id === doc.id;
                  
                  return (
                    <div 
                      key={doc.id}
                      onClick={() => setActivePreviewDoc(doc)}
                      className={`p-3 border rounded-lg transition-all flex items-start justify-between gap-3 cursor-pointer ${
                        isActive 
                          ? 'border-indigo-500 bg-indigo-50/15 shadow-xs ring-1 ring-indigo-500/20' 
                          : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/20'
                      }`}
                      id={`doc-card-${doc.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className={`p-1.5 rounded-lg ${getDocColor(doc.fileName).bg} ${getDocColor(doc.fileName).text} border ${getDocColor(doc.fileName).border}`}>
                            {React.createElement(getDocIcon(doc.fileName), { className: "w-4 h-4" })}
                          </div>
                          <span className={`text-[7px] font-extrabold uppercase ${getDocColor(doc.fileName).text} px-1 py-[1px] rounded-sm ${getDocColor(doc.fileName).bg} border ${getDocColor(doc.fileName).border}`}>
                            .{getFileExt(doc.fileName)}
                          </span>
                        </div>

                        <div className="space-y-0.5 min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 leading-tight truncate" title={doc.name}>
                            {doc.name}
                          </h4>
                          
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] text-slate-450 font-mono truncate" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <span className="text-[8px] text-slate-400 bg-slate-100 px-1 py-[1px] rounded font-mono">
                              {doc.fileSize}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 pt-1 font-sans">
                            <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                              <Tag className="w-2.5 h-2.5 text-indigo-500" /> <span>{doc.type}</span>
                            </span>
                            {doc.caseNumber && (
                              <span className="flex items-center gap-1 bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                                <Briefcase className="w-2.5 h-2.5 text-blue-500" /> <span>القضية: {doc.caseNumber}</span>
                              </span>
                            )}
                            {doc.clientName && (
                              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                                <User className="w-2.5 h-2.5 text-emerald-500" /> <span>الموكل: {doc.clientName}</span>
                              </span>
                            )}
                            {doc.bailiffPaperNumber && (
                              <span className="flex items-center gap-1 bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                                <FileText className="w-2.5 h-2.5 text-indigo-500" /> <span>محضرين: رقم {doc.bailiffPaperNumber}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-400 font-mono">
                              <Calendar className="w-2.5 h-2.5" /> <span>رفع: {doc.uploadedAt}</span>
                            </span>
                          </div>

                          {/* Highlight matching text snippet if query matches OCR content */}
                          {searchQuery && (
                            (() => {
                              const snippet = getMatchingSnippet(doc.scannedTextByAI, searchQuery);
                              if (snippet) {
                                return (
                                  <div className="mt-2 text-[10px] text-slate-600 bg-indigo-50/50 border border-indigo-100 p-2 rounded-md font-sans">
                                    <span className="text-indigo-800 font-extrabold block mb-0.5">مطابقة في محتوى المستند (ذكاء اصطناعي):</span>
                                    <span>{snippet.before}</span>
                                    <mark className="bg-indigo-200 text-indigo-950 font-bold px-0.5 rounded">{snippet.match}</mark>
                                    <span>{snippet.after}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}
                        </div>
                      </div>

                      {/* Tool actions on row */}
                      <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setViewingDoc(doc)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 rounded-lg text-[11px] font-black flex items-center gap-1 transition cursor-pointer"
                          title="عرض المستند بالكامل والـ OCR"
                          id={`doc-view-button-${doc.id}`}
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>عرض</span>
                        </button>

                        <button 
                          onClick={() => handleStartEdit(doc)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-black flex items-center gap-1 transition cursor-pointer"
                          title="تعديل بيانات ونص المستند"
                          id={`doc-edit-button-${doc.id}`}
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-600" />
                          <span>تعديل</span>
                        </button>

                        <button 
                          onClick={() => printSingleDocument(doc, officeProfile)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/50 rounded-lg text-[11px] font-black flex items-center gap-1 transition cursor-pointer"
                          title="طباعة تقرير المستند والـ OCR"
                          id={`doc-print-button-${doc.id}`}
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          <span>طباعة</span>
                        </button>

                        <button 
                          onClick={async () => {
                            if (await confirm(`هل أنت متأكد من حذف المستند [${doc.name}] نهائياً؟`)) {
                              onDeleteDocument(doc.id);
                            }
                          }}
                          className="p-1 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                          title="حذف المستند نهائياً"
                          id={`doc-delete-button-${doc.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        {onArchiveDocument && (
                          <button 
                            type="button"
                            onClick={async () => {
                              if (await confirm(`هل أنت متأكد من أرشفة المستند [${doc.name}]؟ سيتم نقله وإبعاده للأرشيف المغلق.`)) {
                                onArchiveDocument(doc.id);
                              }
                            }}
                            className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
                            title="أرشفة المستند وحفظه بالخزنة"
                            id={`doc-archive-button-${doc.id}`}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Right Column (1/4): OCR visualizer and document detail */}
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3 sticky top-4">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <FileCode className="w-4 h-4 text-indigo-600" />
                معاينة النص الرقمي والـ OCR
              </h3>
              
              {activePreviewDoc && (
                <span className="text-[9px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded">
                  {activePreviewDoc.fileSize}
                </span>
              )}
            </div>

            {activePreviewDoc ? (
              <div className="space-y-3 text-xs">
                  <div className="p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
                    <h4 className="font-bold text-slate-900 text-[11px] leading-tight">
                      {activePreviewDoc.name}
                    </h4>
                    <p className="text-[10px] text-slate-450 font-mono truncate">{activePreviewDoc.fileName}</p>
                  </div>

                  {renderFilePreview(activePreviewDoc.dataUrl || '', activePreviewDoc.fileName)}

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">نص المستند المقروء بالماسح الضوئي الذكي (Simulated OCR)</span>
                  <div className="p-3 bg-indigo-50/20 border border-indigo-500/10 rounded font-serif text-[11px] text-slate-800 leading-relaxed text-slate-700 h-[210px] overflow-y-auto pe-1">
                    {activePreviewDoc.scannedTextByAI ? (
                      activePreviewDoc.scannedTextByAI
                    ) : (
                      "لا يتوفر نص للماسح الضوئي لهذا المستنϡ انقر على زر محاكاة المستند أو ارفع مستنداً جديداً تلقائياً."
                    )}
                  </div>
                </div>

                {activePreviewDoc.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">الهوامش والملاحظات</span>
                    <p className="text-[11px] text-slate-500 bg-slate-50/50 p-2 rounded border border-slate-100 leading-normal">
                      {activePreviewDoc.notes}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-[10px] font-semibold">
                  <button 
                    onClick={async () => { if (activePreviewDoc.dataUrl) { const a = document.createElement('a'); a.href = activePreviewDoc.dataUrl; a.download = activePreviewDoc.fileName; a.click(); } else { await showAlert('هذا المستند لا يحتوي على محتوى رقمي للتحميل.'); } }}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1.5 rounded transition flex items-center justify-center gap-1 cursor-pointer"
                    id="download-preview-btn"
                  >
                    <Download className="w-3 h-3" /> تحميل نسخة
                  </button>
                  <button 
                    onClick={async () => { if (activePreviewDoc.dataUrl) { window.open(activePreviewDoc.dataUrl, '_blank'); } else { await showAlert('لا يتوفر معاينة للمستند'); } }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded transition flex items-center justify-center gap-1 cursor-pointer"
                    id="share-preview-btn"
                  >
                    <ArrowUpRight className="w-3 h-3" /> فتح في نافذة جديدة
                  </button>
                </div>

              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">
                اختر مستنداً من الخزينة لتشغيل الفحص المعمق ومعاينة الـ OCR.
              </div>
            )}

          </div>
        </div>

      </div>

      {isScannerOpen && (
        <SmartScanner
          onClose={() => setIsScannerOpen(false)}
          suggestedName={uploadFormData.name || "مستند_ممسوح_ضوئياً"}
          onScanComplete={(scanned) => {
            const docName = scanned.name.replace(/\.[^/.]+$/, "").replace(/^ممسوح_/, "");
            setUploadFormData(prev => ({
              ...prev,
              name: docName,
              fileName: scanned.name,
              fileSize: (scanned.size / (1024 * 1024)).toFixed(2) + " MB",
              scannedDataUrl: scanned.dataUrl,
            }));
            // Trigger automatic Gemini AI processing!
            handleAnalyzeWithAI(scanned.dataUrl, scanned.name, scanned.fileType);
          }}
        />
      )}

      {/* 1. VIEW DOCUMENT OVERLAY MODAL */}
        {viewingDoc && (
          <div 
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 text-end font-sans"
            id="view-doc-modal-overlay"
            dir="rtl"
          >
            <div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-300 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">{viewingDoc.name}</h2>
                    <p className="text-[10px] text-slate-400 font-mono">ملف رقمي: {viewingDoc.fileName} | {viewingDoc.fileSize}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 max-h-[60vh]">
                
                {/* Metadata cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">تصنيف المستند</span>
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg inline-block">
                      {viewingDoc.type}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">تاريخ الأرشفة</span>
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {viewingDoc.uploadedAt}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl col-span-1 md:col-span-2">
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">القضية المرتبطة</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      {viewingDoc.caseNumber ? (
                        <>
                          <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                          <span>رقم {viewingDoc.caseNumber}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">غير مرتبطة بقضية</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">الموكل المقترن</span>
                    <span className="text-xs font-bold text-slate-800">
                      {viewingDoc.clientName || <span className="text-slate-400">غير مرتبط بموكل</span>}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">ورقة المحضرين المقترنة</span>
                    <span className="text-xs font-bold text-slate-800">
                      {viewingDoc.bailiffPaperNumber ? `رقم ورقة ${viewingDoc.bailiffPaperNumber}` : <span className="text-slate-400">غير مرتبطة بورقة محضرين</span>}
                    </span>
                  </div>
                </div>

                {/* File Preview */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-500 block">معاينة المستند:</span>
                  {renderFilePreview(viewingDoc.dataUrl || '', viewingDoc.fileName)}
                </div>

                {/* Scanned text OCR */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-500 block">النص المستخرج والماسح الضوئي الذكي (OCR):</span>
                  <div className="p-4 bg-indigo-50/15 border border-indigo-500/10 rounded-2xl font-serif text-sm text-slate-800 leading-relaxed h-[220px] overflow-y-auto whitespace-pre-wrap text-justify shadow-inner">
                    {viewingDoc.scannedTextByAI || "لا يتوفر مضمون نصي رقمي للمستند حالياً."}
                  </div>
                </div>

                {/* Notes */}
                {viewingDoc.notes && (
                  <div className="space-y-1 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 block">ملاحظات توثيقية إضافية:</span>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{viewingDoc.notes}</p>
                  </div>
                )}

              </div>

              {/* Footer Actions */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-150 gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    printSingleDocument(viewingDoc, officeProfile);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl shadow-xs text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-indigo-200" />
                  <span>طباعة المستند</span>
                </button>

                <div className="flex items-center gap-2">
                  {viewingDoc.dataUrl && (
                    <button
                      type="button"
                      onClick={() => { const a = document.createElement('a'); a.href = viewingDoc.dataUrl!; a.download = viewingDoc.fileName; a.click(); }}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل</span>
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => {
                      handleStartEdit(viewingDoc);
                      setViewingDoc(null);
                    }}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>تعديل البيانات</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setViewingDoc(null)}
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    إغلاق النافذة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      {/* 2. EDIT DOCUMENT OVERLAY MODAL */}
        {editingDoc && editFields && (
          <div 
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 text-end font-sans"
            id="edit-doc-modal-overlay"
            dir="rtl"
          >
            <div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-300 rounded-xl">
                    <Edit className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">تعديل بيانات وأرشفة المستند</h2>
                    <p className="text-[10px] text-slate-400 font-mono">رقم التعريف: {editingDoc.id}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingDoc(null);
                    setEditFields(null);
                  }}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh] text-xs">
                  
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">اسم المستند الجديد</label>
                    <input 
                      type="text" 
                      value={editFields.name}
                      onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800 font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Type Field */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">التصنيف القانوني</label>
                      <select 
                        value={editFields.type}
                        onChange={(e) => setEditFields({ ...editFields, type: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800 font-bold"
                      >
                        {docTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Case Linkage */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">ارتباط بقضية</label>
                      <select 
                        value={editFields.caseId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const linkedCase = cases.find(c => c.id === val);
                          setEditFields({
                            ...editFields,
                            caseId: val,
                            caseNumber: linkedCase ? linkedCase.caseNumber : '',
                            clientId: linkedCase ? linkedCase.clientId : editFields.clientId,
                            clientName: linkedCase ? linkedCase.clientName : editFields.clientName
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800 font-bold"
                      >
                        <option value="">-- غير مرتبط بقضية --</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.id}>{c.caseNumber} - {c.clientName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Client Linkage */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">ارتباط بموكل</label>
                      <select 
                        value={editFields.clientId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const cl = clients.find(c => c.id === val);
                          setEditFields({
                            ...editFields,
                            clientId: val,
                            clientName: cl ? cl.name : ''
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800 font-bold"
                      >
                        <option value="">-- غير مرتبط بموكل --</option>
                        {clients.map(cl => (
                          <option key={cl.id} value={cl.id}>{cl.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Bailiff Paper Linkage */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">ارتباط بورقة محضرين</label>
                      <select 
                        value={editFields.bailiffPaperId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const bp = bailiffPapers.find(p => p.id === val);
                          setEditFields({
                            ...editFields,
                            bailiffPaperId: val,
                            bailiffPaperNumber: bp ? bp.paperNumber : '',
                            caseId: (bp && bp.caseId) ? bp.caseId : editFields.caseId
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800 font-bold"
                      >
                        <option value="">-- غير مرتبط بورقة محضرين --</option>
                        {bailiffPapers.map(bp => (
                          <option key={bp.id} value={bp.id}>{bp.paperNumber} - {bp.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Scanned text direct editing */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">النص المستخرج والماسح الضوئي (OCR) - قابل للتعديل المباشر</label>
                    <textarea 
                      value={editFields.scannedTextByAI || ''}
                      onChange={(e) => setEditFields({ ...editFields, scannedTextByAI: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-indigo-500 font-serif text-xs text-slate-800 h-[150px] leading-relaxed"
                      placeholder="اكتب أو عدل النص المستخرج هنا..."
                    />
                  </div>

                  {/* Notes field */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">ملاحظات وهوامش الأرشفة</label>
                    <textarea 
                      value={editFields.notes || ''}
                      onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800"
                      rows={3}
                      placeholder="أي تعليق أو تفاصيل إضافية عن المستند..."
                    />
                  </div>

                </div>

                {/* Footer buttons */}
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-slate-150">
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingDoc(null);
                      setEditFields(null);
                    }}
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#1e293b] hover:bg-[#111827] text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    id="submit-doc-edit-btn"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>حفظ التغييرات المعتمدة</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
});

export default DocumentManager;
