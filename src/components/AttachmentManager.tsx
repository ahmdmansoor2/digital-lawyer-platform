/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Paperclip, 
  Trash2, 
  Eye, 
  Download, 
  Plus, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Maximize2, 
  RotateCw, 
  Printer, 
  File, 
  FileCode,
  ShieldAlert,
  FolderOpen,
  Camera
} from 'lucide-react';
import { ClientAttachment } from '../types';
import SmartScanner from './SmartScanner';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import { mimeTypeToIcon as getMimeIcon } from '../utils/fileIcons';

interface AttachmentManagerProps {
  attachments: ClientAttachment[];
  onAddAttachment: (attachments: ClientAttachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  title?: string;
}

const AttachmentManager = React.memo(function AttachmentManager({
  attachments = [],
  onAddAttachment,
  onRemoveAttachment,
  title = "المستندات والصور المرفقة"
}: AttachmentManagerProps) {
  const confirm = useConfirm();
  const [dragOver, setDragOver] = useState(false);
  const [customName, setCustomName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<ClientAttachment | null>(null);
  
  // Professional Viewer States
  const [rotation, setRotation] = useState(0);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: File[]) => {
    setErrorMsg(null);
    if (!files || files.length === 0) return;

    const accumulatedAttachments: ClientAttachment[] = [];
    let processedCount = 0;

    files.forEach((file, index) => {
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > 5) {
        setErrorMsg('نظراً لحفظ الملفات محلياً، يُرجى رفع مستندات بحجم أقل من 5 ميجابايت لضمان سرعة واستقرار الأداء.');
        processedCount++;
        if (processedCount === files.length && accumulatedAttachments.length > 0) {
          onAddAttachment(accumulatedAttachments);
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          accumulatedAttachments.push({
            id: 'att_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substr(2, 5),
            name: files.length === 1 && customName.trim() ? customName.trim() : file.name,
            fileType: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: dataUrl,
            uploadedAt: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0].substring(0, 5)
          });
        }
        processedCount++;
        if (processedCount === files.length) {
          if (accumulatedAttachments.length > 0) {
            onAddAttachment(accumulatedAttachments);
          }
        }
      };
      reader.onerror = () => {
        setErrorMsg('حدث خطأ أثناء قراءة الملݡ يرجى المحاولة مرة أخرى.');
        processedCount++;
        if (processedCount === files.length && accumulatedAttachments.length > 0) {
          onAddAttachment(accumulatedAttachments);
        }
      };
      reader.readAsDataURL(file);
    });

    setCustomName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (type: string) => {
    return type.startsWith('image/');
  };

  const getFileIcon = (type: string) => {
    const Icon = getMimeIcon(type);
    return <Icon className="w-5 h-5" />;
  };

  // Modern print function inside iframe
  const handlePrintAttachment = async (att: ClientAttachment) => {
    if (!isImage(att.fileType)) {
      await showAlert('الطباعة الفورية المباشرة مدعومة حالياً للصور والمستندات المصورة فقط.');
      return;
    }
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
      doc.write(`
        <html>
          <head>
            <title>${att.name}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: white; }
              img { max-width: 100%; max-height: 100%; object-fit: contain; }
              @media print {
                body { margin: 0; }
                img { max-width: 100vw; max-height: 100vh; }
              }
            </style>
          </head>
          <body>
            <img src="${att.dataUrl}" />
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        if (printIframe.contentWindow) {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        }
        setTimeout(() => {
          document.body.removeChild(printIframe);
        }, 100);
      }, 500);
    }
  };

  return (
    <div className="space-y-4 text-end" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
          <Paperclip className="h-4 w-4 text-slate-500" />
          {title}
          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {attachments.length} مرفقات
          </span>
        </h3>
        
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/10 transition cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-indigo-200" />
          <span>مسح ضوئي ذكي 🖨️</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] flex items-center gap-2 font-bold leading-relaxed">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Zone & Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Name Input */}
        <div className="md:col-span-1 space-y-1">
          <label className="block text-[10px] text-slate-500 font-bold">تسمية المستند (اختياري)</label>
          <input 
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="مثال: عقود البيڡ بطاقة الرقم القومي..."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 font-bold text-slate-800"
          />
        </div>

        {/* Drag/Drop Zone */}
        <div className="md:col-span-2">
          <label className="block text-[10px] text-slate-500 font-bold mb-1">اختر ملف أو اسحبه لإضافته</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-2.5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 min-h-[66px] ${
              dragOver 
                ? 'border-indigo-600 bg-indigo-50/50' 
                : 'border-slate-200 hover:border-indigo-500 hover:bg-slate-50/50'
            }`}
          >
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              multiple
            />
            <div className="flex items-center gap-2 text-slate-500">
              <FolderOpen className="w-5 h-5 text-indigo-500 shrink-0" />
              <span className="text-[11px] font-bold text-indigo-700">اضغط لرفع المرفق أو اسحبه هنا</span>
            </div>
            <p className="text-[9px] text-slate-400">يدعم الصور (PNG, JPG), والمستندات بحد أقصى 5MB</p>
          </div>
        </div>
      </div>

      {/* Professional List View */}
      {attachments.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <Paperclip className="h-6 w-6 mx-auto text-slate-300 mb-1.5" />
          <p className="text-[11px] font-bold text-slate-400">لا توجد صور أو مستندات مرفقة بملف هذا السجل بعد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map((att) => (
            <div 
              key={att.id}
              className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-3 shadow-xs hover:border-indigo-500/30 transition group"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {/* Media representation */}
                {isImage(att.fileType) ? (
                  <div 
                    onClick={() => { setSelectedAttachment(att); setRotation(0); }}
                    className="w-10 h-10 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 shrink-0 cursor-pointer hover:opacity-90 relative group"
                  >
                    <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Maximize2 className="w-3 h-3 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center">
                    {getFileIcon(att.fileType)}
                  </div>
                )}

                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate" title={att.name}>{att.name}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {formatSize(att.size)} • {att.uploadedAt}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {isImage(att.fileType) ? (
                  <button
                    type="button"
                    onClick={() => { setSelectedAttachment(att); setRotation(0); }}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="عرض المستند بحجم كامل"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                ) : (
                  <a
                    href={att.dataUrl}
                    download={att.name}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition inline-block"
                    title="تحميل المستند"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                
                <button
                  type="button"
                  onClick={async () => {
                    if (await confirm(`هل أنت متأكد من رغبتك في حذف مرفق [${att.name}] نهائياً؟`)) {
                      onRemoveAttachment(att.id);
                    }
                  }}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  title="حذف المستند"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Professional Fullscreen Lightbox / Viewer Modal */}
      {selectedAttachment && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-end" dir="rtl">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="font-extrabold text-sm">{selectedAttachment.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {formatSize(selectedAttachment.size)} • تاريخ الرفع: {selectedAttachment.uploadedAt}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-300 hover:text-white"
                  title="تدوير المستند 90 درجة"
                >
                  <RotateCw className="w-4.5 h-4.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintAttachment(selectedAttachment)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-300 hover:text-white"
                  title="طباعة"
                >
                  <Printer className="w-4.5 h-4.5" />
                </button>

                <a
                  href={selectedAttachment.dataUrl}
                  download={selectedAttachment.name}
                  className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-300 hover:text-white"
                  title="تنزيل نسختك الخاصة"
                >
                  <Download className="w-4.5 h-4.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedAttachment(null)}
                  className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition font-bold"
                  title="إغلاق المعاينة"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Img Stage */}
            <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-auto min-h-[400px]">
              <div 
                style={{ transform: `rotate(${rotation}deg)` }}
                className="transition-transform duration-250 ease-out max-w-full max-h-[66vh]"
              >
                <img 
                  src={selectedAttachment.dataUrl} 
                  alt={selectedAttachment.name} 
                  className="max-w-full max-h-[66vh] object-contain rounded shadow-lg border border-slate-800"
                />
              </div>
            </div>

            {/* Footer informational note */}
            <div className="bg-slate-50 border-t border-slate-150 p-3 px-4 flex items-center justify-between text-[11px] text-slate-500 font-bold">
              <span>طريقة عرض المستندات المرفقة بملف الموكل والقضية في منصتنا</span>
              <button
                type="button"
                onClick={() => setSelectedAttachment(null)}
                className="text-indigo-600 hover:underline"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <SmartScanner
          onClose={() => setIsScannerOpen(false)}
          suggestedName={customName || undefined}
          onScanComplete={(scanned) => {
            const attachment: ClientAttachment = {
              id: 'att_sc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              name: scanned.name,
              fileType: scanned.fileType,
              size: scanned.size,
              dataUrl: scanned.dataUrl,
              uploadedAt: scanned.uploadedAt
            };
            onAddAttachment([attachment]);
            setCustomName('');
          }}
        />
      )}
    </div>
  );
});

export default AttachmentManager;
