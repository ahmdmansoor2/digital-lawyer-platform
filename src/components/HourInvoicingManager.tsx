/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
;
import { 
  Clock, 
  Plus, 
  FileText, 
  Trash2, 
  Printer, 
  Check, 
  X, 
  DollarSign, 
  AlertCircle,
  FileSpreadsheet,
  Briefcase,
  User,
  Scale,
  Percent,
  Coins,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { HourLog, Invoice, Case, Client, Transaction, OfficeProfile } from '../types';
import { exportHtmlToWord } from '../utils/wordExportHelper';
import { showAlert } from '../utils/dialogs';

interface HourInvoicingManagerProps {
  cases: Case[];
  clients: Client[];
  hourLogs: HourLog[];
  invoices: Invoice[];
  onAddHourLog: (log: HourLog) => void;
  onDeleteHourLog: (id: string) => void;
  onAddInvoice: (inv: Invoice) => void;
  onUpdateInvoiceStatus: (id: string, status: 'غير مدفوعة' | 'مدفوعة بالكامل' | 'ملغاة') => void;
  onUpdateCase?: (updatedCase: Case) => void;
  officeProfile?: OfficeProfile;
}

const HourInvoicingManager = React.memo(function HourInvoicingManager({
  cases,
  clients,
  hourLogs,
  invoices,
  onAddHourLog,
  onDeleteHourLog,
  onAddInvoice,
  onUpdateInvoiceStatus,
  onUpdateCase,
  officeProfile
}: HourInvoicingManagerProps) {
  const [subTab, setSubTab] = useState<'logs' | 'builder' | 'archive'>('logs');
  
  // States for Hour Logging
  const [logForm, setLogForm] = useState({
    caseId: '',
    lawyerName: officeProfile?.managingPartner || 'أ. محمد محمود',
    hours: '',
    hourlyRate: '500', // Default EGP hourly rate
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Keep lawyerName in sync when officeProfile loads/changes
  React.useEffect(() => {
    if (officeProfile?.managingPartner) {
      setLogForm(prev => ({ ...prev, lawyerName: officeProfile.managingPartner }));
    }
  }, [officeProfile]);

  // States for Invoice Builder
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceDueInDays, setInvoiceDueInDays] = useState('15');
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [taxRate, setTaxRate] = useState('14'); // Egyptian VAT
  const [discount, setDiscount] = useState('0');
  const [additionalFees, setAdditionalFees] = useState('0');
  const [additionalFeesDesc, setAdditionalFeesDesc] = useState('رسوم تابعة ودمغة محاماة');
  const [invoiceNotes, setInvoiceNotes] = useState('أتعاب مهنية مستحقة السداد عن خدمات الاستشارات والمرافعات القضائية.');

  // Selected Active Invoice to Preview/Print
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Filter unbilled hours for the current selected client in Invoice Builder
  const availableLogsForClient = hourLogs.filter(log => {
    if (log.isBilled) return false;
    // Find the case of this log
    const linkedCase = cases.find(c => c.id === log.caseId);
    return linkedCase && linkedCase.clientId === selectedClientId;
  });

  // Calculate stats for logs selection
  const selectedLogsCalculated = hourLogs.filter(l => selectedLogIds.includes(l.id));
  const subtotal = selectedLogsCalculated.reduce((sum, l) => sum + (l.hours * l.hourlyRate), 0);
  const taxAmount = Math.round(subtotal * (parseFloat(taxRate) / 100));
  const grandTotal = Math.max(0, subtotal + taxAmount + (parseFloat(additionalFees) || 0) - (parseFloat(discount) || 0));

  // Handle Log submit
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm.caseId || !logForm.hours || !logForm.description) {
      await showAlert('الرجاء اختيار القضية وتحديد ساعات العمل وبيان تفاصيل الجهد المبذول');
      return;
    }

    const linkedCase = cases.find(c => c.id === logForm.caseId);
    if (!linkedCase) return;

    const newLog: HourLog = {
      id: 'log_' + Date.now(),
      caseId: logForm.caseId,
      caseNumber: linkedCase.caseNumber,
      clientName: linkedCase.clientName,
      lawyerName: logForm.lawyerName,
      date: logForm.date,
      hours: parseFloat(logForm.hours),
      hourlyRate: parseFloat(logForm.hourlyRate) || 500,
      description: logForm.description,
      isBilled: false
    };

    onAddHourLog(newLog);
    // Reset description and hours
    setLogForm({
      ...logForm,
      hours: '',
      description: ''
    });
    await showAlert('تم تقييد وإثبات ساعات العمل بالملف بنجاح');
  };

  // Toggle log selection for Invoice
  const toggleLogSelection = (id: string) => {
    if (selectedLogIds.includes(id)) {
      setSelectedLogIds(selectedLogIds.filter(x => x !== id));
    } else {
      setSelectedLogIds([...selectedLogIds, id]);
    }
  };

  // Select all or deselect unbilled client logs
  const handleSelectAllLogs = () => {
    if (selectedLogIds.length === availableLogsForClient.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(availableLogsForClient.map(x => x.id));
    }
  };

  // Generate Invoice Action
  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      await showAlert('يرجى اختيار الموكل أولاً');
      return;
    }

    if (selectedLogIds.length === 0) {
      await showAlert('يرجى اختيار ساعة عمل مفصِلة واحدة على الأقل لإدراجها في الفاتورة');
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) {
      await showAlert('الموكل غير موجود بالنظام');
      return;
    }

    // Prepare Invoice
    const logsToInclude = hourLogs.filter(l => selectedLogIds.includes(l.id));
    const invoiceId = 'INV-2026-' + String(invoices.length + 1001);
    
    const issueDate = new Date().toISOString().split('T')[0];
    const dueObj = new Date();
    dueObj.setDate(dueObj.getDate() + parseInt(invoiceDueInDays));
    const dueDate = dueObj.toISOString().split('T')[0];

    const newInvoice: Invoice = {
      id: invoiceId,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientNationalId: client.nationalId,
      clientAddress: client.address,
      date: issueDate,
      dueDate: dueDate,
      hourLogs: logsToInclude,
      subtotal: subtotal,
      taxRate: parseFloat(taxRate) || 0,
      taxAmount: taxAmount,
      discount: parseFloat(discount) || 0,
      additionalFees: parseFloat(additionalFees) || 0,
      additionalFeesDescription: additionalFeesDesc || undefined,
      grandTotal: grandTotal,
      status: 'غير مدفوعة',
      notes: invoiceNotes
    };

    onAddInvoice(newInvoice);
    
    // Switch to preview the newly generated invoice
    setPreviewInvoice(newInvoice);
    
    // Clear selection
    setSelectedLogIds([]);
    setSelectedClientId('');
    setDiscount('0');
    setAdditionalFees('0');
    setSubTab('archive');
    
    await showAlert(`تم إصدار فاتورة المطالبة بالرمز الرقمي المالي ${invoiceId} بنجاح!`);
  };

  // Printing logic with clean CSS embedding
  const handlePrint = async () => {
    const printEl = document.getElementById('print-invoice-viewport');
    if (!printEl) {
      await showAlert('لم يتم العثور على منطقة المطالبة لطباعتها!');
      return;
    }

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

    // Capture the exact HTML of the invoice viewport
    const contentHtml = printEl.innerHTML;

    iframeDoc.open();
    iframeDoc.write(`
      <html lang="ar" dir="rtl">
        <head>
          <title>فاتورة مطالبة مالية - مكتب المحاماة</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
            body { 
              padding: 20px; 
              color: #0f172a;
              background-color: #fff;
              direction: rtl;
            }
            .no-print {
              display: none !important;
            }
            /* Style tables elegantly for generic printing */
            table {
              border-collapse: collapse;
              width: 100%;
              margin-top: 15px;
              margin-bottom: 15px;
            }
            th, td {
              border: 1px solid #cbd5e1 !important;
              padding: 8px 12px;
              text-align: right;
            }
            th {
              background-color: #f8fafc !important;
              font-weight: bold;
              color: #0f172a !important;
            }
          </style>
        </head>
        <body>
          <div class="p-2">
            ${contentHtml}
          </div>
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

  return (
    <div className="space-y-6 text-end" dir="rtl" id="hour-invoicing-manager-comp">
      
      {/* LOCALIZED PRINT-ONLY STYLE SHEET */}
      <style>{`
        @media print {
          /* Hide entire main app content and elements */
          body * {
            visibility: hidden;
            background: #ffffff !important;
          }
          /* Show only the targeted invoice component */
          #print-invoice-viewport, #print-invoice-viewport * {
            visibility: visible;
          }
          #print-invoice-viewport {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            direction: rtl !important;
            font-family: inherit;
          }
          /* Hide buttons, tabs and backgrounds inside printing */
          .no-print {
            display: none !important;
          }
          /* Enhance table printing layout borders */
          .print-border-table th, .print-border-table td {
            border: 1px solid #94a3b8 !important;
            padding: 8px !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* HEADER CONTROLLER BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800 no-print">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                إصدار أتعاب الساعات والـ Timesheets
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                منظومة الفوترة المهنية
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Clock className="w-6 h-6" />
              منظومة الساعات والفوترة المهنية المتقدمة
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تقييد ساعات دراسة الطعون، وصياغة لوائح ومذكرات الدفاع والمرافعاʡ مع منشئ فواتير متقن يستدعي الساعات المعقودة ويُخرِجُها في ضوابط ضريبية مصرية وصيغة PDF للتسليم والمحاسبة الفورية.
            </p>
          </div>

          {/* SUB NAVIGATION TABS */}
          <div className="flex bg-slate-800 p-1 rounded-xl self-start md:self-auto shrink-0 border border-slate-700">
            <button
              onClick={() => { setSubTab('logs'); setPreviewInvoice(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'logs' && !previewInvoice ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              دفتر الساعات (Timesheets)
            </button>
            <button
              onClick={() => { setSubTab('builder'); setPreviewInvoice(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'builder' && !previewInvoice ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              توليد فاتورة مهنية
            </button>
            <button
              onClick={() => { setSubTab('archive'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'archive' || previewInvoice ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              سجل الفواتير والصادرات
            </button>
          </div>
        </div>
      </div>

      {/* RENDER INVOICE PREVIEW VIEWPORT IF PRESENT */}
      {previewInvoice ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between no-print border-b border-slate-100 pb-3">
            <button
              onClick={() => setPreviewInvoice(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-850 flex items-center gap-1.5 transition cursor-pointer"
            >
              ← رجوع لـ سجل الفواتير والمستودع
            </button>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-slate-900 text-white font-bold text-xs py-1.5 px-4 rounded-xl flex items-center gap-2 hover:bg-slate-800 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                طباعة وتصدير كملف (PDF) 📱
              </button>

              <button
                onClick={async () => {
                  const printEl = document.getElementById('print-invoice-viewport');
                  if (printEl) {
                    exportHtmlToWord(`فاتورة مطالبة رقم ${previewInvoice.id}`, printEl.innerHTML, `فاتورة_${previewInvoice.id}`, officeProfile);
                  } else {
                    await showAlert('لم يتم العثور على منطقة المطالبة لتصديرها!');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
                id="export-invoice-word-btn"
              >
                <FileText className="w-4 h-4" />
                تصدير إلى وورد
              </button>
              {previewInvoice.status === 'غير مدفوعة' && (
                <button
                  onClick={async () => {
                    onUpdateInvoiceStatus(previewInvoice.id, 'مدفوعة بالكامل');
                    setPreviewInvoice({ ...previewInvoice, status: 'مدفوعة بالكامل' });
                    await showAlert('تم تسوية الفاتورة وإلزام الخزينة بدفعة واردة ممتازة');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  تسجيل كـ (مدفوعة بالكامل) بالخزينة
                </button>
              )}
            </div>
          </div>

          {/* THE OFFICIAL PRINTABLE ARABIC INVOICE SHEET VIEWPORT */}
          <div 
            className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md max-w-4xl mx-auto transition-transform" 
            id="print-invoice-viewport"
          >
            {/* INVOICE UPPER BANNER - LAW FIRM TRADITIONAL HEADER */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
              <div className="space-y-1 text-end">
                <h1 className="text-xl font-black text-slate-900 tracking-wide text-indigo-800">
                  {officeProfile?.officeName || 'مكتب الأستاذ محمد محمود المحامي'}
                </h1>
                <p className="text-xs font-bold text-slate-600">
                  {officeProfile?.courtJurisdiction || 'المحامون بالاستئناف العالي ومجلس الدولة والـجـنـايـات'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {officeProfile?.address || 'القاهرɡ ش الهرم، عمارة الأبراѡ الدور السادس'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {officeProfile?.phone ? `هاتف: ${officeProfile.phone}` : 'هاتف: 01099882233'}
                  {officeProfile?.email ? ` | بريد إلكتروني: ${officeProfile.email}` : ' | فاكس: 0233445566'}
                </p>
              </div>

              {/* LAW SCALES ARCHITECTURAL GRAPHIC */}
              <div className="text-center space-y-1">
                <div className="h-14 w-14 bg-slate-900 text-indigo-500 rounded-full flex items-center justify-center mx-auto border border-indigo-600/30">
                  <Scale className="w-8 h-8" />
                </div>
                <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase">العدل أساس الملك</p>
              </div>
            </div>

            {/* INVOICE NUMBER AND METADATA BAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl mb-6 border border-slate-150">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">رقم المطالبة الضامنة:</span>
                  <span className="text-xs font-black text-slate-900 font-mono bg-indigo-500/20 text-indigo-900 px-2 py-0.5 rounded">
                    {previewInvoice.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">تاريخ التحرير:</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">{previewInvoice.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">أجل السداد المستحق:</span>
                  <span className="text-xs font-bold text-red-650 font-mono">{previewInvoice.dueDate}</span>
                </div>
              </div>

              <div className="space-y-1 md:border-r md:border-slate-200 md:pe-4">
                <p className="text-[10px] font-black uppercase text-slate-400">سند الفاتورة موجه إلى الموكل:</p>
                <p className="text-xs font-extrabold text-slate-900">{previewInvoice.clientName}</p>
                <p className="text-[11px] text-slate-600">الرقم القومي: <span className="font-mono">{previewInvoice.clientNationalId}</span></p>
                <p className="text-[11px] text-slate-650 font-medium">العنوان: {previewInvoice.clientAddress}</p>
                <p className="text-[11px] text-slate-600">الهاتف: <span className="font-mono">{previewInvoice.clientPhone}</span></p>
              </div>
            </div>

            {/* BILLABLE UNITS TABLE OF HOURS (تداولات وتفاصيل ساعات الاستشارات) */}
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                جدول ساعات العمل والجهد القانوني المبذول والمطالعة:
              </h3>
              
              <table className="w-full text-end text-xs print-border-table">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold border border-slate-900">
                    <th className="p-2.5 text-[11px]">بيان الأعمال والنطاق القانوني للمطالعة والمداولة</th>
                    <th className="p-2.5 text-center text-[11px] whitespace-nowrap">رقم القضية</th>
                    <th className="p-2.5 text-center text-[11px] whitespace-nowrap">المحامي المعالج</th>
                    <th className="p-2.5 text-center text-[11px] whitespace-nowrap">المدة الزمنية</th>
                    <th className="p-2.5 text-center text-[11px] whitespace-nowrap">فئة الساعة</th>
                    <th className="p-2.5 text-start text-[11px] whitespace-nowrap">الإجمالي المستحق</th>
                  </tr>
                </thead>
                <tbody>
                  {previewInvoice.hourLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-250">
                      <td className="p-2.5 font-medium text-slate-800">
                        {log.description}
                        <span className="text-[10px] block text-slate-500 mt-0.5">التاريخ: {log.date}</span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-700">{log.caseNumber}</td>
                      <td className="p-2.5 text-center text-slate-700">{log.lawyerName}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900 font-mono">
                        {log.hours} {log.hours >= 3 && log.hours <= 10 ? 'ساعات' : 'ساعة'}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-700">{log.hourlyRate.toLocaleString('ar-EG')} ج.م</td>
                      <td className="p-2.5 text-start font-bold text-slate-950 font-mono">
                        {(log.hours * log.hourlyRate).toLocaleString('ar-EG')} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* INVOICE FINAL AMOUNTS AND CALCULATIONS GRID */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-t border-slate-200 pt-5">
              
              {/* Financial footnotes and compliance */}
              <div className="space-y-2 md:max-w-md">
                <p className="text-[10px] font-bold text-slate-500">إرشادات وشروط السداد المهني:</p>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  تُسدد الأتعاب والمصروفات المهنية المبينة أعلاه إما نقداً بمقر معقل المحاماة أو عبر شيك رسمي مسحوب باسم المكتب أو تحويل بنكي على رقم الحساب البنكي المعتمد <span className="font-mono">EG03505051234567890123</span> بنك مصر.
                </p>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-700 font-semibold">
                  * ملحوظة: {previewInvoice.notes}
                </div>
              </div>

              {/* Dynamic Totals */}
              <div className="w-full md:w-64 space-y-1.5 text-xs text-slate-750 font-semibold">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>الأعمال الصافية (Subtotal):</span>
                  <span className="font-mono text-slate-900">{previewInvoice.subtotal.toLocaleString('ar-EG')} ج.م</span>
                </div>
                
                {previewInvoice.taxAmount > 0 && (
                  <div className="flex justify-between border-b border-slate-100 pb-1 text-slate-550">
                    <span>ضريبة القيمة المضافة ({previewInvoice.taxRate}%):</span>
                    <span className="font-mono">{previewInvoice.taxAmount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                )}

                {previewInvoice.additionalFees > 0 && (
                  <div className="flex justify-between border-b border-slate-100 pb-1 text-slate-550">
                    <span className="text-[10px] text-slate-500 block max-w-[150px] truncate">{previewInvoice.additionalFeesDescription || 'رسوم ومصاريف تابعة'}:</span>
                    <span className="font-mono">{previewInvoice.additionalFees.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                )}

                {previewInvoice.discount > 0 && (
                  <div className="flex justify-between border-b border-slate-100 pb-1 text-emerald-700">
                    <span>الخصم المهني (تنزيل):</span>
                    <span className="font-mono">-{previewInvoice.discount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                )}

                <div className="flex justify-between bg-slate-900 text-white p-2 sm:p-2.5 rounded-lg text-sm font-black">
                  <span>المطلوب الكلي للفاتورة:</span>
                  <span className="font-mono text-indigo-300">
                    {previewInvoice.grandTotal.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>

                <div className="pt-2 text-center">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-black inline-block ${
                    previewInvoice.status === 'مدفوعة بالكامل' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : previewInvoice.status === 'ملغاة'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-indigo-100 text-indigo-800 animate-pulse'
                  }`}>
                    الحالة: الفاتورة {previewInvoice.status}
                  </span>
                </div>
              </div>

            </div>

            {/* STAMP, SIGNATURES AND WATERMARKS ZONE */}
            <div className="mt-10 pt-8 border-t border-dashed border-slate-200 grid grid-cols-2 text-center text-xs">
              <div className="space-y-8">
                <p className="font-extrabold text-slate-650">توقيع الموكل بالعلم والالتزام</p>
                <div className="h-10"></div>
                <p className="text-[11px] text-slate-400 font-mono">...............................................</p>
              </div>

              <div className="space-y-4 relative">
                <p className="font-extrabold text-slate-650">الختم وخاتم مكتب المحاماة الرائد</p>
                
                {/* Simulated Seal/Stamp Graphic */}
                <div className="h-20 w-20 bg-indigo-500/10 border-2 border-dashed border-indigo-500/50 rounded-full flex items-center justify-center mx-auto opacity-70 transform rotate-12 flex-col p-1 text-center select-none">
                  <Scale className="w-5 h-5 text-indigo-600 mb-0.5" />
                  <span className="text-[7px] font-black text-indigo-800 leading-none">مكتب الأستاذ</span>
                  <span className="text-[7px] font-black text-indigo-800 leading-none truncate max-w-full">
                    {officeProfile?.managingPartner ? officeProfile.managingPartner.replace('أ. ', '') : 'محمد محمود'}
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-400">توقيع شريك إدارة الماليات والفوترة</p>
              </div>
            </div>

          </div>

          <div className="text-center no-print">
            <button
              onClick={() => setPreviewInvoice(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-6 rounded-xl font-bold text-xs cursor-pointer transition"
            >
              إغلاق المعاينة والعودة للصفحة
            </button>
          </div>
        </div>
      ) : (
        /* STANDARD SUB-TABS VIEWER */
        <div id="hour-invoicing-subtabs-viewport" className="no-print">
          
          {/* TAB 1: RECORD LOG (دفتر الساعات المنجزة) */}
          {subTab === 'logs' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side Form to log hours */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      إثبات ساعات مداولة جديدة
                    </h3>
                    <p className="text-[10px] text-slate-500">تقييد زمن العمل الفعلي على الدعوى والقضية باسم محامٍ مرجعي</p>
                  </div>

                  <form onSubmit={handleLogSubmit} className="space-y-3.5 text-xs">
                    
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">الملف والقضية المرجعية *</label>
                      <select
                        required
                        value={logForm.caseId}
                        onChange={e => setLogForm({ ...logForm, caseId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- اختر ملف القضية --</option>
                        {cases.map(cs => (
                          <option key={cs.id} value={cs.id}>
                            {cs.caseNumber} - الموكل: {cs.clientName} ({cs.court})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">ساعات العمل بذمتها *</label>
                        <input 
                          type="number"
                          step="0.1"
                          required
                          value={logForm.hours}
                          onChange={e => setLogForm({ ...logForm, hours: e.target.value })}
                          placeholder="مثال: 3.5"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">معدل الساعة (EGP) *</label>
                        <input 
                          type="number"
                          required
                          value={logForm.hourlyRate}
                          onChange={e => setLogForm({ ...logForm, hourlyRate: e.target.value })}
                          placeholder="500"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block font-sans">المحامي أو المستشار المعالج</label>
                      <input 
                        type="text"
                        value={logForm.lawyerName}
                        onChange={e => setLogForm({ ...logForm, lawyerName: e.target.value })}
                        placeholder="الأستاذ محمد محمود"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">تاريخ الإثبات المكتبي</label>
                      <input 
                        type="date"
                        value={logForm.date}
                        onChange={e => setLogForm({ ...logForm, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">تفصيل الجهد القانوني المبذول *</label>
                      <textarea 
                        required
                        value={logForm.description}
                        onChange={e => setLogForm({ ...logForm, description: e.target.value })}
                        placeholder="بيان تفصيلي بالأمور المستندة مثل: صياغة المبررات الكلية للطعن وبناء ردود الدفوع الفرعية..."
                        rows={3.5}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      تسجيل الساعات وتعيينها بالدفتر
                    </button>
                  </form>
                </div>

                {/* Right side Table displaying logged hours */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-2">
                  <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">سجل وجدول الساعات المقيدة</h3>
                      <p className="text-[10px] text-slate-500">حصر تام بكافة جهود المداولة وسعر الساعة المسجل على قضايا المكتب</p>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-150 px-2.5 py-1 rounded-full font-bold">
                      الإجمالي: {hourLogs.length} جهود مسجلة
                    </span>
                  </div>

                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-end text-xs md:text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                          <th className="p-3">بيان الجهد القانوني وطبيعة العمل</th>
                          <th className="p-3 text-center">رقم القضية</th>
                          <th className="p-3 text-center">المدة</th>
                          <th className="p-3 text-center">تكلفة الساعة</th>
                          <th className="p-3 text-center">الحالة</th>
                          <th className="p-3 text-start">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hourLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-10 text-center text-slate-430 text-xs">
                              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-350" />
                              لم يتم إدخال أو حصر أي ساعات عمل بالدفتر بعد. يرجى استخدام النموذج لتسجيل الجهد الأول.
                            </td>
                          </tr>
                        ) : (
                          hourLogs.map((log) => (
                            <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                              <td className="p-3">
                                <p className="font-semibold text-slate-900 text-xs">{log.description}</p>
                                <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                                  <span>بواسطة: {log.lawyerName}</span>
                                  <span>•</span>
                                  <span>الموكل: {log.clientName}</span>
                                  <span>•</span>
                                  <span className="font-mono">{log.date}</span>
                                </div>
                              </td>
                              <td className="p-3 text-center font-mono text-slate-700 text-xs">{log.caseNumber}</td>
                              <td className="p-3 text-center font-bold text-slate-900 font-mono text-xs">{log.hours} س</td>
                              <td className="p-3 text-center font-mono text-slate-700 text-xs">{(log.hourlyRate).toLocaleString('ar-EG')} ج.م</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  log.isBilled 
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                                    : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                                }`}>
                                  {log.isBilled ? 'مفوترة' : 'غير مفوترة'}
                                </span>
                              </td>
                              <td className="p-3 text-start select-none">
                                <button
                                  onClick={() => onDeleteHourLog(log.id)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                                  title="حذف القيد الساعي"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: INVOICE GENERATOR FORM */}
          {subTab === 'builder' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              
              <div className="border-b border-slate-150 pb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">منشئ ومولد الفواتير الضريبية</h3>
                  <p className="text-[10px] text-slate-500">اختر موكلاً مسجلاً لاستدعاء ساعاته غير المفوترɡ وضبط بنود التكاليف ونسب الضريبة المقررة</p>
                </div>
              </div>

              <form onSubmit={handleGenerateInvoice} className="space-y-6 text-xs font-sans">
                
                {/* 1. Select Client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">الموكل المستهدف بالفاتورة *</label>
                    <select
                      required
                      value={selectedClientId}
                      onChange={e => {
                        setSelectedClientId(e.target.value);
                        setSelectedLogIds([]); // clear selection when client shifts
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- اختر الموكل المحاسَب --</option>
                      {clients.map(cl => (
                        <option key={cl.id} value={cl.id}>
                          {cl.name} - رقم قومي: {cl.nationalId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">أجل استحقاق السداد من تاريخه</label>
                    <select
                      value={invoiceDueInDays}
                      onChange={e => setInvoiceDueInDays(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    >
                      <option value="7">خلال ٧ أيام (فوري وعاجل)</option>
                      <option value="15">خلال ١٥ يوماً (مهلة السداد القياسية)</option>
                      <option value="30">خلال ٣٠ يوماً (جدولة شهرية)</option>
                    </select>
                  </div>
                </div>

                {/* 2. Log selection for the selected client */}
                {selectedClientId ? (
                  <div className="space-y-3 bg-slate-50/50 border border-slate-200 rounded-xl p-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <p className="font-bold text-slate-800">ساعات عمل الموكل غير المحاسبة ({availableLogsForClient.length} قيد):</p>
                      {availableLogsForClient.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllLogs}
                          className="text-[10px] text-indigo-800 hover:underline font-bold bg-indigo-50 border border-indigo-200 p-1 px-2.5 rounded-md cursor-pointer"
                        >
                          {selectedLogIds.length === availableLogsForClient.length ? 'إلغاء تحديد الجميع' : 'تحديد جميع الساعات'}
                        </button>
                      )}
                    </div>

                    {availableLogsForClient.length === 0 ? (
                      <div className="py-6 text-center text-slate-430 text-xs">
                        <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-350" />
                        لا تتوجد أي ساعات عمل "غير مفوترة" مسجلة لهذا الموكل حالياً. 
                        يرجى الذهاب أولاً لعلامة "دفتر الساعات (Timesheets)" لإدراج ساعات دراسة القضايا الخاصة به.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {availableLogsForClient.map(log => {
                          const isSelected = selectedLogIds.includes(log.id);
                          return (
                            <label
                              key={log.id}
                              className={`flex items-start gap-3 p-2.5 rounded-lg border transition cursor-pointer text-end text-xs ${
                                isSelected 
                                  ? 'bg-indigo-500/5 border-indigo-400' 
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLogSelection(log.id)}
                                className="mt-1 text-indigo-600 focus:ring-indigo-500 rounded"
                              />
                              <div className="flex-1 text-xs">
                                <div className="flex justify-between font-bold">
                                  <span className="text-slate-900">{log.description}</span>
                                  <span className="font-mono text-slate-900 bg-slate-100 p-0.5 px-1.5 rounded">{log.hours * log.hourlyRate} ج.م</span>
                                </div>
                                <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                                  <span>القضية: {log.caseNumber}</span>
                                  <span>•</span>
                                  <span>المدة: {log.hours} ساعة</span>
                                  <span>•</span>
                                  <span>السعر: {log.hourlyRate} ج.م/س</span>
                                  <span>•</span>
                                  <span>التاريخ: {log.date}</span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                    💡 يرجى اختيار الموكل أولاً بالأعلى لاستدعاء ساعات عمل قضاياه المستحقة الفوترة.
                  </div>
                )}

                {/* 3. Taxes, discounts, other charges */}
                {selectedClientId && selectedLogIds.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-150 pt-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">نسبة ضريبة القيمة المضافة (%) *</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={e => setTaxRate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">قيمة خصم الموكل (EGP)</label>
                      <input 
                        type="number"
                        min="0"
                        value={discount}
                        onChange={e => setDiscount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-emerald-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">رسوم ومصاريف قضائية إضافية (EGP)</label>
                      <div className="flex gap-1.5">
                        <input 
                          type="number"
                          min="0"
                          value={additionalFees}
                          onChange={e => setAdditionalFees(e.target.value)}
                          placeholder="0"
                          className="w-1/3 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                        />
                        <input 
                          type="text"
                          value={additionalFeesDesc}
                          onChange={e => setAdditionalFeesDesc(e.target.value)}
                          placeholder="بيان الرسوم الفارس"
                          className="w-2/3 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes and remarks */}
                {selectedClientId && selectedLogIds.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">شروط وهوامش الفاتورة</label>
                    <textarea 
                      value={invoiceNotes}
                      onChange={e => setInvoiceNotes(e.target.value)}
                      placeholder="تعليمات السداد والحفظ..."
                      rows={2.5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-sans"
                    />
                  </div>
                )}

                {/* Subtotal, Tax amount, Discount, Grand Total preview */}
                {selectedClientId && selectedLogIds.length > 0 && (
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">القيمة الصافية:</span>
                        <span className="font-mono text-white font-bold block">{subtotal.toLocaleString('ar-EG')} ج.م</span>
                      </div>
                      <div>
                        <span className="text-slate-400">المبلغ الضريبي ({taxRate}%):</span>
                        <span className="font-mono text-white font-bold block">+{taxAmount.toLocaleString('ar-EG')} ج.م</span>
                      </div>
                      {parseFloat(additionalFees) > 0 && (
                        <div>
                          <span className="text-slate-400">رسوم تابعة:</span>
                          <span className="font-mono text-white font-bold block">+{parseFloat(additionalFees).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      )}
                      {parseFloat(discount) > 0 && (
                        <div>
                          <span className="text-emerald-400">تنزيل وخصم:</span>
                          <span className="font-mono text-emerald-300 font-bold block">-{parseFloat(discount).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 border-r border-slate-750 pe-4">
                      <div className="text-end">
                        <span className="text-xs text-indigo-400 font-bold block">المستحق النهائي للفاتورة:</span>
                        <span className="text-xl font-black text-indigo-300 font-mono">
                          {grandTotal.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs leading-none cursor-pointer transition shadow-xl"
                      >
                        إصدار واعتماد الفاتورة 🚀
                      </button>
                    </div>
                  </div>
                )}

              </form>

            </div>
          )}

          {/* TAB 3: INVOICES ARCHIVE LIST */}
          {subTab === 'archive' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-150 pb-2 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">أرشيف ومستودع الفواتير المصدرة</h3>
                  <p className="text-[10px] text-slate-500">متابعة تحصيل المطالبات وتنزيل مستنداتها الضريبية الرسمية</p>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-150 p-1 px-2.5 rounded-full font-bold">
                  الصادرات: {invoices.length} مطالباً مالياً
                </span>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-end text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                      <th className="p-3">رقم الفاتورة والرمز المالي</th>
                      <th className="p-3">اسم الموكل المحاسَب</th>
                      <th className="p-3 text-center">عدد المهام المشمولة</th>
                      <th className="p-3 text-center">التحرير / الاستحقاق</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-start">مجموع القيمة المالية</th>
                      <th className="p-3 text-start">التصدير / الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-430 text-xs">
                          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-350" />
                          لم يتم إصدار أي فواتير أتعاب حتى الآن. يرجى التوجه لـ "توليد فاتورة مهنية".
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                          <td className="p-3 font-mono font-bold text-slate-900 text-xs">{inv.id}</td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-800 text-xs">{inv.clientName}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">القومي: {inv.clientNationalId}</p>
                          </td>
                          <td className="p-3 text-center text-slate-650 font-bold font-mono">
                            {inv.hourLogs.length} جهود
                          </td>
                          <td className="p-3 text-center">
                            <p className="font-mono text-slate-700 text-xs">{inv.date}</p>
                            <p className="text-[9px] text-red-600 font-bold font-mono mt-0.5">{inv.dueDate} (أجل)</p>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              inv.status === 'مدفوعة بالكامل'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                : inv.status === 'ملغاة'
                                  ? 'bg-red-50 text-red-800 border border-red-100'
                                  : 'bg-indigo-50 text-indigo-800 border border-indigo-100 animate-pulse'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 text-start font-black text-slate-900 font-mono text-xs">
                            {inv.grandTotal.toLocaleString('ar-EG')} ج.م
                          </td>
                          <td className="p-3 text-start flex justify-end gap-1 select-none">
                            <button
                              onClick={() => setPreviewInvoice(inv)}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold p-1 px-2.5 rounded text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                              title="معاينة تفاصيل الفاتورة وطباعتها"
                            >
                              <Printer className="w-3 h-3 text-indigo-300" />
                              <span>تصدير PDF 📑</span>
                            </button>
                            
                            {inv.status === 'غير مدفوعة' && (
                              <button
                                onClick={async () => {
                                  onUpdateInvoiceStatus(inv.id, 'مدفوعة بالكامل');
                                  await showAlert('تم تحديث الفاتورة كـ مدفوعة بالكامل بنجاح!');
                                }}
                                className="bg-emerald-50 text-emerald-800 border border-emerald-250 font-bold p-1 px-1.5 rounded text-[10px] hover:bg-emerald-100 transition cursor-pointer"
                                title="تغيير الحالة لـ مستحقة مسددة وبناء سند بالخزينة"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
});

export default HourInvoicingManager;
