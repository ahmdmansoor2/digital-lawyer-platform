import React, { useState, useRef, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, Mail, AlertTriangle, Check } from 'lucide-react';
import { BailiffPaper, OfficeProfile } from '../types';
import { printEnvelopeCover } from '../utils/printHelper';
import { envelopePrintCSS } from '../utils/envelopePrintStyles';

interface EnvelopePrintPreviewProps {
  paper: BailiffPaper;
  office: OfficeProfile;
  onClose: () => void;
}

type EnvelopeSize = 'A4' | 'C4' | 'C5';

const EnvelopePrintPreview = React.memo(function EnvelopePrintPreview({ paper, office, onClose }: EnvelopePrintPreviewProps) {
  const [envelopeType, setEnvelopeType] = useState(paper.envelopeType || 'إعلان قضائي');
  const [deliveryMethod, setDeliveryMethod] = useState(paper.deliveryMethod || 'محضرين');
  const [recipientAddress, setRecipientAddress] = useState(paper.opponentAddress || '');
  const [envelopeSize, setEnvelopeSize] = useState<EnvelopeSize>('A4');
  const [showQr, setShowQr] = useState(true);
  const [printed, setPrinted] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const qrValue = useMemo(() => {
    if (paper.qrData) return paper.qrData;
    return JSON.stringify({
      id: paper.id,
      num: paper.paperNumber,
      court: paper.courtName,
      opponent: paper.opponentName,
      date: paper.submissionDate
    }, null, 2);
  }, [paper]);

  const handlePrint = () => {
    const updatedPaper: BailiffPaper = {
      ...paper,
      envelopeType: envelopeType as BailiffPaper['envelopeType'],
      deliveryMethod: deliveryMethod as BailiffPaper['deliveryMethod'],
      opponentAddress: recipientAddress || paper.opponentAddress,
    };

    const qrContainer = previewRef.current?.querySelector('#preview-qr-container');
    const qrSvg = qrContainer ? qrContainer.innerHTML : undefined;

    printEnvelopeCover(updatedPaper, office, qrSvg);
    setPrinted(true);
    setTimeout(() => setPrinted(false), 3000);
  };

  const envTypeOptions: { value: string; label: string }[] = [
    { value: 'إعلان قضائي', label: 'إعلان قضائي' },
    { value: 'إنذار', label: 'إنذار' },
    { value: 'تكليف بالحضور', label: 'تكليف بالحضور' },
    { value: 'خطاب رسمي', label: 'خطاب رسمي' },
  ];

  const deliveryOptions: { value: string; label: string }[] = [
    { value: 'محضرين', label: 'محضرين' },
    { value: 'بريد مصري', label: 'بريد مصري' },
    { value: 'يد بيد', label: 'يد بيد' },
  ];

  const sizeOptions: { value: EnvelopeSize; label: string }[] = [
    { value: 'A4', label: 'A4 (مستند كامل)' },
    { value: 'C4', label: 'C4 (مغلف كبير)' },
    { value: 'C5', label: 'C5 (مغلف وسط)' },
  ];

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden text-end mx-4" dir="rtl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-slate-600" />
            <h3 className="text-sm font-black text-slate-800">معاينة وطباعة ظرف الإعلان</h3>
            <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{paper.paperNumber}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded cursor-pointer text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Controls Panel */}
          <div className="w-64 bg-slate-50 p-4 space-y-3 text-xs border-l border-slate-200 overflow-y-auto shrink-0">
            <p className="text-[10px] font-bold text-slate-500">تخصيص الظرف</p>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">نوع الظرف</label>
              <select value={envelopeType} onChange={e => setEnvelopeType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400">
                {envTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">طريقة التسليم</label>
              <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400">
                {deliveryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">عنوان التسليم</label>
              <textarea value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400 h-16"
                placeholder="عنوان المعلن إليه الكامل" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">مقاس الطباعة</label>
              <select value={envelopeSize} onChange={e => setEnvelopeSize(e.target.value as EnvelopeSize)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400">
                {sizeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="showQr" checked={showQr} onChange={e => setShowQr(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400" />
              <label htmlFor="showQr" className="text-[10px] font-bold text-slate-500 cursor-pointer">إظهار QR Code</label>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2">
              <button
                onClick={handlePrint}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs cursor-pointer transition shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                {printed ? 'تم إرسال للطباعة ✓' : 'طباعة الظرف'}
              </button>
            </div>

            {/* Paper summary */}
            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500">بيانات الإعلان</p>
              <div className="text-[10px] text-slate-600 space-y-0.5">
                <p><span className="font-bold text-slate-500">الخصم:</span> {paper.opponentName || '—'}</p>
                <p><span className="font-bold text-slate-500">المحكمة:</span> {paper.courtName}</p>
                {paper.caseNumber && <p><span className="font-bold text-slate-500">قضية:</span> {paper.caseNumber}</p>}
                <p><span className="font-bold text-slate-500">رقم الإعلان:</span> {paper.paperNumber}</p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 flex items-start justify-center">
            <div ref={previewRef}
              className="bg-white shadow-xl border border-slate-200 rounded-lg overflow-hidden"
              style={{
                width: envelopeSize === 'A4' ? '210mm' : envelopeSize === 'C4' ? '229mm' : '162mm',
                minHeight: envelopeSize === 'A4' ? '297mm' : envelopeSize === 'C4' ? '324mm' : '229mm',
                transform: 'scale(0.65)',
                transformOrigin: 'top center',
              }}
            >
              <style>{envelopePrintCSS.replace(/<\/?style>/g, '')}</style>
              <div className="envelope-page" style={{ padding: '20px', minHeight: 'auto' }}>

                {/* Header */}
                <div className="env-header">
                  {office.logoDataUrl ? (
                    <img className="env-logo" src={office.logoDataUrl} alt="شعار المكتب" />
                  ) : (
                    <div className="env-logo-placeholder">⚖️</div>
                  )}
                  <div className="env-office-info">
                    <div className="env-office-name">{office.officeName}</div>
                    <div className="env-office-details">
                      {office.address} • ت: {office.phone} • {office.email}<br />
                      قيد نقابة: {office.barId} • ضريبة: {office.taxId}
                    </div>
                  </div>
                </div>

                {/* Type Badge */}
                <div className="env-type-badge">{envelopeType}</div>

                {/* Address Box */}
                <div className="env-address-box">
                  <div className="env-address-label">إلى السيد/</div>
                  <div className="env-address-text">{paper.opponentName || 'لم يحدد'}</div>
                  <div className="env-address-label" style={{ marginTop: '8px' }}>عنوان التسليم:</div>
                  <div className="env-address-text" style={{ fontWeight: 500 }}>
                    {recipientAddress || paper.opponentAddress || 'لم يحدد'}
                  </div>
                </div>

                {/* Info Table */}
                <table className="env-info-table">
                  <tbody>
                    <tr><td>رقم الإعلان / المحضر</td><td>{paper.paperNumber}</td></tr>
                    {paper.caseNumber ? <tr><td>رقم القضية</td><td>{paper.caseNumber}</td></tr> : null}
                    <tr><td>المحكمة</td><td>{paper.courtName} — {paper.courtLocation}</td></tr>
                    <tr><td>طريقة التسليم</td><td>{deliveryMethod}</td></tr>
                    <tr><td>تاريخ الإعلان</td><td>{currentDate}</td></tr>
                    <tr><td>الموضوع</td><td>{paper.title}</td></tr>
                  </tbody>
                </table>

                {/* Footer */}
                <div className="env-footer">
                  <div className="env-qr-area" id="preview-qr-container">
                    {showQr ? (
                      <QRCodeSVG value={qrValue} size={110} level="M" />
                    ) : (
                      <div style={{ width: '110px', height: '110px', border: '1px dashed #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#94a3b8', background: '#f8fafc', margin: '0 auto' }}>QR ملغي</div>
                    )}
                    <div className="env-qr-label">مسح للتحقق من الإعلان</div>
                  </div>
                  <div className="env-stamp-area">
                    {office.officeStampImage ? (
                      <img className="env-stamp-image" src={office.officeStampImage} alt="خاتم المكتب" />
                    ) : (
                      <div className="env-stamp-placeholder">ختم<br/>المكتب</div>
                    )}
                    <div className="env-signature-line">خاتم وتوقيع المحضر المختص</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default EnvelopePrintPreview;
