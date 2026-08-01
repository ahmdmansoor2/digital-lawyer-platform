/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BailiffForm.tsx — form الإضافة/التعديل لأوراق المحضرين.
 *
 * مستخرج من BailiffPapersPanel.tsx v2.9.6. يدعم:
 *   - add mode (formData فارغ)
 *   - edit mode (formData معبأ)
 *   - رفع المرفقات بـ drag-and-drop
 *   - ربط بقضية من دليل القضايا
 *
 * يستقبل: formData، setFormData، onSubmit، onClose
 */

import React, { useRef, useState } from 'react';
import { Clipboard, Paperclip, Image as ImageIcon, X, ShieldAlert } from 'lucide-react';
import { BailiffPaper, ClientAttachment, Case } from '../../types';
import { mimeTypeToIcon as getMimeIcon } from '../../utils/fileIcons';

export interface BailiffFormData {
  title: string;
  paperNumber: string;
  submissionDate: string;
  receiptDate: string;
  courtName: string;
  courtLocation: string;
  status: BailiffPaper['status'];
  opponentName: string;
  opponentAddress: string;
  envelopeType: string;
  deliveryMethod: string;
  caseId: string;
  notes: string;
  announcementImage: ClientAttachment | undefined;
}

interface BailiffFormProps {
  mode: 'add' | 'edit';
  formData: BailiffFormData;
  setFormData: React.Dispatch<React.SetStateAction<BailiffFormData>>;
  cases: Case[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const STATUS_OPTIONS: BailiffPaper['status'][] = [
  'قيد الإعلان والتسليم',
  'تم الاستلام والتسليم',
  'مرتد لعدم الاستدلال',
  'مؤجل للإعادة',
];

function formatSize(bytes?: number) {
  if (!bytes) return 'N/A';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type?: string) {
  if (!type) return <Clipboard className="w-5 h-5 text-indigo-500" />;
  const Icon = getMimeIcon(type);
  return <Icon className="w-5 h-5" />;
}

export const BailiffForm = React.memo(function BailiffForm({
  mode, formData, setFormData, cases, onClose, onSubmit,
}: BailiffFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileProcess = (file: File) => {
    setUploadError(null);
    if (!file) return;
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 10) {
      setUploadError('حجم الملف كبير جداً. يرجى رفع ملف بحجم أقل من 10 ميجابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      const attachment: ClientAttachment = {
        id: 'bp_att_' + Date.now(),
        name: customFileName.trim() || file.name,
        fileType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString().split('T')[0],
      };
      setFormData(prev => ({ ...prev, announcementImage: attachment }));
      setCustomFileName('');
    };
    reader.onerror = () => setUploadError('حدث خطأ أثناء تحميل الملف، يرجى إعادة المحاولة.');
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid={`bailiff-form-${mode}`}>
      {/* Row 1 */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">اسم وموضوع الإعلان القضائي *</label>
        <input
          type="text"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder="مثال: صحيفة إعلان افتتاح الدعوى الأصلية"
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">رقم الإعلان وقلم محضري المحكمة *</label>
        <input
          type="text"
          value={formData.paperNumber}
          onChange={e => setFormData({ ...formData, paperNumber: e.target.value })}
          placeholder="مثال: ١٤٢٥ لسنة ٢٠٢٦ محضري قصر النيل"
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">الخصم المراد إعلانه</label>
        <input
          type="text"
          value={formData.opponentName}
          onChange={e => setFormData({ ...formData, opponentName: e.target.value })}
          placeholder="مثال: محمد سعيد عبد العال السويفي"
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
        />
      </div>

      {/* Row 1b: opponent details */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">عنوان الخصم</label>
        <input
          type="text"
          value={formData.opponentAddress}
          onChange={e => setFormData({ ...formData, opponentAddress: e.target.value })}
          placeholder="مثال: شارع الهرم، المعادي، القاهرة"
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">نوع المظروف / الإعلان</label>
        <select
          value={formData.envelopeType}
          onChange={e => setFormData({ ...formData, envelopeType: e.target.value })}
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-bold"
        >
          <option value="">-- اختر --</option>
          <option value="إعلان قضائي">إعلان قضائي</option>
          <option value="إنذار">إنذار</option>
          <option value="تكليف بالحضور">تكليف بالحضور</option>
          <option value="خطاب رسمي">خطاب رسمي</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">طريقة التوصيل</label>
        <select
          value={formData.deliveryMethod}
          onChange={e => setFormData({ ...formData, deliveryMethod: e.target.value })}
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-bold"
        >
          <option value="">-- اختر --</option>
          <option value="محضرين">محضرين</option>
          <option value="بريد مصري">بريد مصري</option>
          <option value="يد بيد">يد بيد</option>
        </select>
      </div>

      {/* Row 2 */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">تاريخ تقديم الورقة للمحضرين *</label>
        <input
          type="date"
          value={formData.submissionDate}
          onChange={e => setFormData({ ...formData, submissionDate: e.target.value })}
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">تاريخ الاستلام والرد</label>
        <input
          type="date"
          value={formData.receiptDate}
          onChange={e => setFormData({ ...formData, receiptDate: e.target.value })}
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">ربط الورقة بقضية</label>
        <select
          value={formData.caseId}
          onChange={e => setFormData({ ...formData, caseId: e.target.value })}
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-bold"
        >
          <option value="">-- اختر القضية للربط الآلي --</option>
          {cases.map(c => (
            <option key={c.id} value={c.id}>
              قضية رقم {c.caseNumber} ({c.clientName})
            </option>
          ))}
        </select>
      </div>

      {/* Row 3 */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-600">اسم المحكمة التابع لها المحضرين *</label>
        <input
          type="text"
          value={formData.courtName}
          onChange={e => setFormData({ ...formData, courtName: e.target.value })}
          placeholder="مثال: محكمة الهرم الكلية"
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
          required
        />
      </div>

      <div className="space-y-1 md:col-span-2">
        <label className="block text-xs font-bold text-slate-600">شرح عنوان ومكان قلم محضري المحكمة</label>
        <input
          type="text"
          value={formData.courtLocation}
          onChange={e => setFormData({ ...formData, courtLocation: e.target.value })}
          placeholder="مثال: الطابق الأرضي، مبنى مجمع المحاكم الجديد"
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
        />
      </div>

      {/* Row 4: status + notes */}
      <div className="md:col-span-1 space-y-3">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-600">حالة الإعلان الحالية</label>
          <select
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as BailiffPaper['status'] })}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-bold"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-600">ملاحظات توثيقية وقانونية</label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="مثال: رفض الموظف تسليمه في الموعد..."
            className="w-full h-20 text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
          />
        </div>
      </div>

      {/* Upload Announcement Attachment */}
      <div className="md:col-span-2 bg-[#fafafc] border border-slate-200 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 leading-relaxed">
          <Paperclip className="w-4 h-4 text-indigo-500" />
          تحميل المستند التمهيدي أو المشفوع للإعلان
        </h4>

        {uploadError && (
          <div className="p-2 border border-rose-200 bg-rose-50 rounded-xl text-[10px] font-bold text-rose-700 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-500 font-bold">اسم المستند المرفق</label>
            <input
              type="text"
              value={customFileName}
              onChange={e => setCustomFileName(e.target.value)}
              placeholder="مثال: أصل عريضة الإعلان المرفقة"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none"
            />
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[90px] ${
              dragOver ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => e.target.files && e.target.files[0] && handleFileProcess(e.target.files[0])}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <ImageIcon className="w-6 h-6 text-indigo-500 mb-1" />
            <span className="text-[10px] font-bold text-indigo-700">اضغط لرفع صورة الإعلان أو الملف المرفق</span>
            <p className="text-[8px] text-slate-400">يدعم الصور والمستندات (PDF, DOCX) حتى 10MB</p>
          </div>
        </div>

        {formData.announcementImage && (
          <div className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 border border-slate-150 shrink-0">
                {formData.announcementImage.fileType.startsWith('image/') ? (
                  <img src={formData.announcementImage.dataUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileIcon(formData.announcementImage.fileType)}
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-slate-800 truncate">{formData.announcementImage.name}</p>
                <p className="text-[9px] text-slate-400 font-mono">{formatSize(formData.announcementImage.size)} • {formData.announcementImage.fileType}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, announcementImage: undefined })}
              className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Form Buttons */}
      <div className="md:col-span-3 border-t border-slate-100 pt-3.5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
        >
          إلغاء البيانات
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition shadow-md"
          id={mode === 'add' ? 'bailiff-submit-add-btn' : 'bailiff-submit-edit-btn'}
        >
          {mode === 'add' ? 'حفظ وتسجيل بالإرشيف القضائي' : 'حفظ وتحديث البيانات'}
        </button>
      </div>
    </form>
  );
});
