/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BailiffCard.tsx — بطاقة ورقة المحضرين (display).
 *
 * مستخرج من BailiffPapersPanel.tsx v2.9.6 (السطور 1134-1551 من النسخة القديمة).
 * يحتوي على: status badge، عنوان، بيانات العميل والقضية،
 * تواريخ، المحكمة، الملاحظات، المرفقات، شريط الإجراءات.
 */

import React from 'react';
import {
  CheckCircle, Clock, AlertTriangle, ArrowLeftRight, Trash2, Briefcase,
  Calendar, Building, MapPin, FileText, Eye, Download, Plus,
} from 'lucide-react';
import { BailiffPaper, LawDocument, ClientAttachment } from '../../types';
import { findMatchSnippet } from '../../utils/searchHelper';
import { mimeTypeToIcon as getMimeIcon } from '../../utils/fileIcons';
import { useConfirm } from '../../contexts/ConfirmContext';
import { showAlert } from '../../utils/dialogs';
import { BailiffActionToolbar, BailiffToolbarCallbacks } from './BailiffActionToolbar';

export interface BailiffCardCallbacks {
  onPreview: (p: BailiffPaper) => void;
  onEdit: (p: BailiffPaper) => void;
  onPrint: (p: BailiffPaper) => void;
  onEnvelope: (p: BailiffPaper) => void;
  onExportWord: (p: BailiffPaper) => void;
  onDelete: (p: BailiffPaper) => void;
  onToggleStatus: (p: BailiffPaper) => void;
  onFullscreen: (p: BailiffPaper) => void;
  onAddDocument?: (p: BailiffPaper, doc: LawDocument) => void;
  onDeleteDocument?: (docId: string) => void;
  cases: { id: string; caseNumber: string; clientName: string; clientId: string }[];
  documents: LawDocument[];
}

interface BailiffCardProps {
  paper: BailiffPaper;
  searchQuery: string;
  callbacks: BailiffCardCallbacks;
}

const STATUS_STYLES: Record<string, { bg: string; labelBg: string; icon: React.ReactNode }> = {
  'تم الاستلام والتسليم': {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    labelBg: 'bg-emerald-500',
    icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
  },
  'قيد الإعلان والتسليم': {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    labelBg: 'bg-indigo-500',
    icon: <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />,
  },
  'مرتد لعدم الاستدلال': {
    bg: 'bg-rose-50 text-rose-700 border-rose-100',
    labelBg: 'bg-rose-500',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
  },
  'مؤجل للإعادة': {
    bg: 'bg-purple-50 text-purple-700 border-purple-100',
    labelBg: 'bg-purple-500',
    icon: <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />,
  },
};

function getFileIcon(type?: string) {
  if (!type) return <FileText className="w-5 h-5 text-indigo-500" />;
  const Icon = getMimeIcon(type);
  return <Icon className="w-5 h-5" />;
}

function formatSize(bytes?: number) {
  if (!bytes) return 'N/A';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const BailiffCard = React.memo(function BailiffCard({ paper, searchQuery, callbacks }: BailiffCardProps) {
  const confirm = useConfirm();
  const style = STATUS_STYLES[paper.status] || STATUS_STYLES['قيد الإعلان والتسليم'];

  const toolbar: BailiffToolbarCallbacks = {
    onPreview: () => callbacks.onPreview(paper),
    onEdit: () => callbacks.onEdit(paper),
    onPrint: () => callbacks.onPrint(paper),
    onEnvelope: () => callbacks.onEnvelope(paper),
    onExportWord: () => callbacks.onExportWord(paper),
    onDelete: async () => {
      if (await confirm(`هل أنت متأكد من رغبتك في حذف إعلان [${paper.title}] من الأرشيف نهائياً؟`)) {
        callbacks.onDelete(paper);
      }
    },
  };

  return (
    <div
      className="bg-white border hover:border-indigo-500/40 rounded-2xl p-4 shadow-xs transition group flex flex-col justify-between space-y-4"
      data-testid={`bailiff-card-${paper.id}`}
    >
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span
            onClick={() => callbacks.onToggleStatus(paper)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 cursor-pointer select-none transition hover:opacity-85 ${style.bg}`}
            data-testid={`bailiff-status-badge-${paper.id}`}
          >
            {style.icon}
            {paper.status}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <button
              onClick={async () => {
                if (await confirm(`هل أنت متأكد من رغبتك في حذف إعلان [${paper.title}] من الأرشيف نهائياً؟`)) {
                  callbacks.onDelete(paper);
                }
              }}
              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
              title="حذف الإعلان"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          <h4 className="font-extrabold text-[13px] text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition" title={paper.title}>
            {paper.title}
          </h4>
          <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-sans text-slate-500 font-bold">رقم الإعلان:</span>
            {paper.paperNumber}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="text-[11px] space-y-2 pt-2 border-t border-slate-100">
        {paper.opponentName && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">المراد إعلانه:</span>
            <span className="text-slate-700 font-bold">{paper.opponentName}</span>
          </div>
        )}
        {paper.caseNumber && (
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-slate-400 font-bold">القضية المتصلة:</span>
            <span className="text-indigo-600 font-mono font-bold">رقم {paper.caseNumber}</span>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl text-[10px]">
          <div className="space-y-0.5 border-s border-slate-200 ps-1">
            <span className="text-slate-400 block font-bold">تاريخ التقديم</span>
            <strong className="text-slate-700 font-mono font-bold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-400" />
              {paper.submissionDate}
            </strong>
          </div>
          <div className="space-y-0.5 pe-1">
            <span className="text-slate-400 block font-bold">تاريخ الاستلام والرد</span>
            <strong className="text-slate-700 font-mono font-bold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              {paper.receiptDate || 'قيد الرد وموعد الرجوع...'}
            </strong>
          </div>
        </div>

        {/* Court */}
        <div className="bg-[#fbfcff] border border-blue-50 p-2 rounded-xl space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            {paper.courtName}
          </p>
          {paper.courtLocation && (
            <p className="text-[10px] text-slate-400 leading-relaxed flex items-start gap-1">
              <MapPin className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
              {paper.courtLocation}
            </p>
          )}
        </div>

        {paper.notes && (
          <p className="text-[10px] text-slate-500 bg-indigo-50/50 p-1.5 px-2 rounded-lg border border-indigo-100 font-sans leading-relaxed">
            <span className="font-bold text-indigo-800">ملاحظة ورقة المحضرين:</span> {paper.notes}
          </p>
        )}

        {searchQuery && <SearchMatchSnippet paper={paper} searchQuery={searchQuery} />}
      </div>

      {/* Attachment */}
      {paper.announcementImage ? <AttachmentRow image={paper.announcementImage} onFullscreen={() => callbacks.onFullscreen(paper)} /> : (
        <div className="text-center py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-[10px] text-slate-400 font-bold">لا توجد صورة أو قرار إعلان مرفق</p>
        </div>
      )}

      {/* Action Toolbar */}
      <BailiffActionToolbar callbacks={toolbar} />

      {/* Treasury Documents */}
      {callbacks.onAddDocument && (
        <LinkedTreasuryDocs
          paper={paper}
          documents={callbacks.documents}
          onAddDocument={callbacks.onAddDocument}
          onDeleteDocument={callbacks.onDeleteDocument}
          cases={callbacks.cases}
        />
      )}
    </div>
  );
});

const SearchMatchSnippet = React.memo(function SearchMatchSnippet({ paper, searchQuery }: { paper: BailiffPaper; searchQuery: string }) {
  const match = findMatchSnippet(
    {
      title: paper.title,
      paperNumber: paper.paperNumber,
      opponentName: paper.opponentName,
      caseNumber: paper.caseNumber,
      courtName: paper.courtName,
      courtLocation: paper.courtLocation,
      notes: paper.notes,
    },
    searchQuery,
    {
      title: 'موضوع الإعلان',
      paperNumber: 'رقم الإعلان',
      opponentName: 'اسم المراد إعلانه',
      caseNumber: 'رقم القضية المتصلة',
      courtName: 'اسم المحكمة',
      courtLocation: 'مقر المحكمة التفصيلي',
      notes: 'ملاحظات المحضرين',
    },
  );
  if (!match) return null;
  return (
    <div className="text-[10px] text-slate-600 bg-indigo-50/50 border border-indigo-100 p-2 rounded-md font-sans mt-2">
      <span className="text-indigo-800 font-extrabold block mb-0.5">مطابقة في {match.fieldName}:</span>
      <span>{match.before}</span>
      <mark className="bg-indigo-200 text-indigo-950 font-bold px-0.5 rounded">{match.match}</mark>
      <span>{match.after}</span>
    </div>
  );
});

const AttachmentRow = React.memo(function AttachmentRow({ image, onFullscreen }: { image: ClientAttachment; onFullscreen: () => void }) {
  return (
    <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between gap-2 border border-slate-100">
      <div className="flex items-center gap-2 overflow-hidden">
        {getFileIcon(image.fileType)}
        <div className="overflow-hidden">
          <p className="text-[10px] font-bold text-slate-800 truncate" title={image.name}>{image.name}</p>
          <p className="text-[8px] text-slate-400 font-mono mt-0.5">{formatSize(image.size)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {image.fileType.startsWith('image/') ? (
          <button onClick={onFullscreen} className="p-1 text-indigo-600 hover:bg-white rounded border border-slate-200/40" title="عرض الصورة بحجم كامل">
            <Eye className="w-3.5 h-3.5" />
          </button>
        ) : (
          <a href={image.dataUrl} download={image.name} className="p-1 text-indigo-600 hover:bg-white rounded border border-slate-200/40 inline-block" title="تحميل الملف">
            <Download className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
});

interface LinkedTreasuryDocsProps {
  paper: BailiffPaper;
  documents: LawDocument[];
  onAddDocument?: (p: BailiffPaper, doc: LawDocument) => void;
  onDeleteDocument?: (docId: string) => void;
  cases: { id: string; caseNumber: string; clientName: string; clientId: string }[];
}

const LinkedTreasuryDocs = React.memo(function LinkedTreasuryDocs({
  paper, documents, onAddDocument, onDeleteDocument, cases,
}: LinkedTreasuryDocsProps) {
  const confirm = useConfirm();
  const [isAdding, setIsAdding] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', type: 'أخرى' as LawDocument['type'], notes: '' });
  const [files, setFiles] = React.useState<File[]>([]);

  const linkedDocs = documents.filter(d => d.bailiffPaperId === paper.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || files.length === 0) {
      await showAlert('يرجى تحديد اسم المستند وملف على الأقل');
      return;
    }
    const linkedCase = cases.find(c => c.id === paper.caseId);
    files.forEach((f, idx) => {
      if (!onAddDocument) return;
      const docName = files.length === 1 && form.name
        ? form.name
        : f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
      const newDoc: LawDocument = {
        id: 'doc_' + (Date.now() + idx),
        name: docName,
        type: form.type,
        fileName: f.name,
        fileSize: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
        caseId: paper.caseId || '',
        caseNumber: linkedCase ? linkedCase.caseNumber : '',
        clientId: linkedCase ? linkedCase.clientId : '',
        clientName: linkedCase ? linkedCase.clientName : '',
        bailiffPaperId: paper.id,
        bailiffPaperNumber: paper.paperNumber,
        uploadedAt: new Date().toISOString().split('T')[0],
        notes: form.notes,
        scannedTextByAI: `مستند إعلان ممسوح ضوئياً لورقة المحضرين رقم ${paper.paperNumber} بعنوان ${docName}.`,
      };
      onAddDocument(paper, newDoc);
    });
    setForm({ name: '', type: 'أخرى', notes: '' });
    setFiles([]);
    setIsAdding(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-700">
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px] font-bold">مستندات الخزينة المرتبطة ({linkedDocs.length})</span>
        </div>
        {onAddDocument && (
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>{isAdding ? 'إلغاء' : 'إضافة مستند'}</span>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 space-y-2 text-[10px]">
          <div className="grid grid-cols-2 gap-1.5">
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="اسم المستند" className="bg-white border border-slate-200 rounded p-1 outline-none w-full text-slate-800" required />
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="bg-white border border-slate-200 rounded p-1 outline-none w-full font-medium">
              <option value="عريضة دعوى">عريضة دعوى</option>
              <option value="حكم قضائي">حكم قضائي</option>
              <option value="مذكرة دفاع">مذكرة دفاع</option>
              <option value="توكيل رسمي">توكيل رسمي</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
          <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="ملاحظات..." className="bg-white border border-slate-200 rounded p-1 outline-none w-full text-slate-800" />
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              <input
                type="file"
                multiple
                className="hidden"
                id={`bailiff-doc-input-${paper.id}`}
                onChange={e => {
                  const newFiles = e.target.files ? Array.from(e.target.files) as File[] : [];
                  if (newFiles.length > 0) {
                    setFiles(prev => [...prev, ...newFiles]);
                    if (files.length === 0 && newFiles.length === 1) {
                      setForm(prev => ({ ...prev, name: prev.name || newFiles[0].name.substring(0, newFiles[0].name.lastIndexOf('.')) || newFiles[0].name }));
                    }
                  }
                  e.target.value = '';
                }}
              />
              <button type="button" onClick={() => document.getElementById(`bailiff-doc-input-${paper.id}`)?.click()} className="bg-slate-50 border border-slate-200 hover:bg-slate-100 px-1 py-0.5 rounded cursor-pointer text-[9px] font-bold">
                {files.length === 0 ? 'ملف 📂' : '➕ المزيد'}
              </button>
              <span className="text-[8px] font-mono text-slate-400">{files.length === 0 ? 'لا ملف' : `${files.length} ملف`}</span>
            </div>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-0.5 px-2 rounded text-[9px] cursor-pointer transition">
              {files.length > 0 ? `حفظ (${files.length}) ✓` : 'حفظ ✓'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-1.5">
        {linkedDocs.map(doc => (
          <div key={doc.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100 hover:bg-white transition">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
              <div className="overflow-hidden">
                <h6 className="text-[10px] font-bold text-slate-800 truncate" title={doc.name}>{doc.name}</h6>
                <p className="text-[8px] text-slate-400 truncate font-mono">{doc.fileName} ({doc.fileSize})</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={async () => await showAlert(`تحميل ومعاينة مستند: ${doc.name}`)} className="p-1 text-indigo-600 hover:bg-slate-100 rounded" title="تحميل">
                <Download className="w-3 h-3" />
              </button>
              {onDeleteDocument && (
                <button onClick={async () => { if (await confirm('هل أنت متأكد من حذف هذا المستند؟')) onDeleteDocument(doc.id); }} className="p-1 text-red-600 hover:bg-red-50 rounded" title="حذف">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
