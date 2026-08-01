/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { showAlert } from '../utils/dialogs';
import { 
  Printer, 
  X, 
  Copy, 
  Check, 
  Settings, 
  BookOpen, 
  FileText, 
  ExternalLink,
  Laptop,
  Download,
  Eye
} from 'lucide-react';
;
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PrintPreviewModalProps {
  title: string;
  htmlContent: string;
  onClose: () => void;
}

const PrintPreviewModal = React.memo(function PrintPreviewModal({ title, htmlContent, onClose }: PrintPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showDownloadHint, setShowDownloadHint] = useState(false);

  // Auto focus and set loading complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  const handlePrint = async () => {
    // ── Electron path: delegate to main process via IPC for native print dialog ──
    const electronAPI = (window as unknown as { electronAPI?: { print: (html: string, title: string) => Promise<{ success: boolean; reason?: string }> } }).electronAPI;
    if (electronAPI?.print) {
      try {
        await electronAPI.print(htmlContent, title);
      } catch (e) {
        console.error('Electron IPC print failed:', e);
      }
      return;
    }

    // ── Browser path: direct iframe print ──
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch (e) {
        console.warn('Direct iframe print failed, falling back:', e);
      }
    }

    // 1. Open blank window synchronously first to bypass browser popup blockers
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>جاري تجهيز المستند...</title>
          <style>
            body {
              background-color: #020617;
              color: #f1f5f9;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              padding: 24px;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 4px solid #4f46e5;
              border-top-color: transparent;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            h3 {
              margin: 0 0 8px 0;
              font-size: 16px;
              font-weight: 700;
              color: #ffffff;
            }
            p {
              margin: 0;
              font-size: 12px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h3>جاري تهيئة بيئة الطباعة الآمنة...</h3>
            <p>يرجى الانتظار ثوانٍ معدودة لتجهيز كافة خطوط وبيانات التقرير القانوني</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }

    try {
      // 2. Save the print job to the server backend
      const response = await fetch('/api/print/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          title: title,
        }),
      });

      if (!response.ok) {
        throw new Error('فشل حفظ المستند في الخادم المؤقت للطباعة');
      }

      const data = await response.json();
      const jobId = data.jobId;

      // 3. Redirect the opened window to the print path with jobId
      const printUrl = window.location.origin + window.location.pathname + '?print=true&jobId=' + jobId;
      
      if (printWindow) {
        printWindow.location.href = printUrl;
      } else {
        // Fallback: If popup blocker somehow blocked the initial window, open it now
        window.open(printUrl, '_blank');
      }
    } catch (err) {
      console.error('Print trigger failed, attempting local print fallback:', err);
      // Fallback: If backend is down or unreachable, write content directly to the print window!
      if (printWindow) {
        try {
          printWindow.document.open();
          
          // Prepare HTML content with self-executing print script as fallback
          let fallbackHtml = htmlContent;
          if (!fallbackHtml.includes('window.print()')) {
            const autoPrintScript = `
              <script>
                window.addEventListener('DOMContentLoaded', () => {
                  setTimeout(() => {
                    window.focus();
                    window.print();
                  }, 500);
                });
              </script>
            `;
            fallbackHtml = fallbackHtml.replace('</body>', `${autoPrintScript}</body>`);
          }
          
          printWindow.document.write(fallbackHtml);
          printWindow.document.close();
        } catch (fallbackErr) {
          console.error('Local fallback print write failed:', fallbackErr);
          try {
            printWindow.document.body.innerHTML = `
              <div style="text-align: center; padding: 40px; font-family: sans-serif; color: #ef4444;" dir="rtl">
                <h3>⚠️ فشل تجهيز المستند تلقائياً</h3>
                <p style="color: #64748b; font-size: 13px;">يرجى إغلاق هذه النافذة ومحاولة الضغط على زر بدء الطباعة مرة أخرى.</p>
              </div>
            `;
          } catch (e) {
            // ignore
          }
        }
      }
    }
  };


  const handleOpenInNewTab = async () => {
    const safeTitle = title.replace(/\s+/g, '_') || 'document';
    const filename = `طباعة_مستند_${safeTitle}.html`;

    // ── Electron: show native Save As dialog ──
    const electronAPI = (window as unknown as { electronAPI?: { saveFile: (name: string, data: string, mime: string, filters: unknown[]) => Promise<{ success: boolean; reason?: string }> } }).electronAPI;
    if (electronAPI?.saveFile) {
      try {
        const base64 = btoa(unescape(encodeURIComponent(htmlContent)));
        const result = await electronAPI.saveFile(
          filename,
          base64,
          'text/html',
          [{ name: 'HTML Document', extensions: ['html'] }]
        );
        if (result.success) {
          setShowDownloadHint(true);
          setTimeout(() => setShowDownloadHint(false), 6000);
        }
      } catch (err) {
        console.error('Electron save HTML failed:', err);
      }
      return;
    }

    // ── Browser fallback: Blob download ──
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      setShowDownloadHint(true);
      setTimeout(() => setShowDownloadHint(false), 8000);
    } catch (err) {
      console.error('HTML Blob download failed:', err);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      // Render the HTML into an off-screen div to capture via html2canvas
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '800px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.dir = 'rtl';
      tempContainer.innerHTML = htmlContent;
      document.body.appendChild(tempContainer);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_') || 'report';
      const filename = `منصة_المحامي_${safeTitle}.pdf`;

      // ── Electron: native Save As dialog ──
      const electronAPI = (window as unknown as { electronAPI?: { saveFile: (name: string, data: string, mime: string, filters: unknown[]) => Promise<{ success: boolean; reason?: string }> } }).electronAPI;
      if (electronAPI?.saveFile) {
        // jsPDF output as base64 string
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const result = await electronAPI.saveFile(
          filename,
          pdfBase64,
          'application/pdf',
          [{ name: 'PDF Document', extensions: ['pdf'] }]
        );
        if (!result.success && result.reason !== 'canceled') {
          await showAlert('فشل حفظ ملف PDF: ' + result.reason);
        }
        return;
      }

      // ── Browser fallback ──
      pdf.save(filename);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      await showAlert('حدث عطل أثناء التصدير. يرجى المحاولة مجدداً.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(htmlContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex flex-col md:flex-row-reverse select-none overflow-hidden" id="print-preview-modal-container">
      {/* Sidebar Control Panel (Right aligned for RTL flow) */}
      <div className="w-full md:w-96 bg-slate-900 border-b md:border-b-0 md:border-l border-slate-800 p-6 flex flex-col justify-between shrink-0 text-end overflow-y-auto" dir="rtl">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-sans tracking-tight">معاينة الطباعة الفنية</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">منصة المحامي رقم: {title}</p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="إغلاق المعاينة"
              id="close-print-preview-btn"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="h-px bg-slate-800 mb-6"></div>

          {/* Quick Actions */}
          <div className="space-y-3.5">
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">خيارات معالجة التقرير</p>
            
            <button
              onClick={handlePrint}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 shadow-md shadow-indigo-950/20 text-sm cursor-pointer hover:shadow-lg transition active:scale-[0.98]"
              id="trigger-direct-inpage-print-btn"
            >
              <Printer className="h-5 w-5 animate-pulse" />
              <span>بدء طباعة المستند الفورية</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="w-full bg-slate-800 hover:bg-slate-750 text-emerald-400 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition text-xs"
              id="trigger-direct-pdf-btn"
            >
              <Download className="h-4 w-4 animate-bounce" />
              <span>{exportingPDF ? 'جاري استخراج وتجهيز PDF...' : 'تصدير وتحميل PDF مباشر'}</span>
            </button>

            <button
              onClick={handleOpenInNewTab}
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-850 cursor-pointer transition text-xs"
              id="download-html-standalone-btn"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              <span>تنزيل الملف المصدري للمستند (HTML)</span>
            </button>

            <button
              onClick={handleCopyHTML}
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-350 font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-850 cursor-pointer transition text-[11px]"
              id="copy-report-html-btn"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-400">تم نسخ كود المستند بنجاح</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>نسخ مستند التقرير بالكامل (HTML)</span>
                </>
              )}
            </button>
          </div>

          {/* Custom Warnings */}
          <div className="mt-8 space-y-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-indigo-500/70" />
              <span>تعليمات ضبط الطباعة والصفحة</span>
            </p>
            
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-xs text-slate-350 space-y-2.5 leading-relaxed font-sans">
              <div className="flex gap-2 text-slate-300">
                <span className="text-indigo-500 font-bold font-mono">1.</span>
                <p><strong>خلفيات الألوان والرسومات:</strong> يرجى تفعيل خيار <span className="text-slate-100 font-semibold underline">"Background graphics"</span> أو <span className="text-slate-100 font-semibold underline">"خلفيات الرسومات"</span> لإظهار الأختام، الألوان، والجداول الذهبية بوضوح.</p>
              </div>
              <div className="flex gap-2 text-slate-350">
                <span className="text-indigo-500 font-bold font-mono">2.</span>
                <p><strong>حذف الرأس والذيل التلقائي:</strong> يرجى إلغاء تفعيل خيار <span className="text-slate-100 font-semibold underline">"Headers and footers"</span> حتى لا يظهر عنوان الموقع أو رابط الويب في أطراف الصفحة المطبوعة.</p>
              </div>
              <div className="flex gap-2 text-slate-350">
                <span className="text-indigo-500 font-bold font-mono">3.</span>
                <p><strong>مقياس الصفحة:</strong> يفضل جعل خيار Scale كـ <span className="text-slate-100 font-semibold underline">"Default"</span> ليتناسب التقرير مع أبعاد ورقة الـ <span className="font-mono">A4</span> الرسمية.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clean footer */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <div className="text-[9px] text-slate-500 text-center font-mono">
            نظام المحاماة المبتكر • إصدار الويندوز والويب الذكي المباشر
          </div>
        </div>
      </div>

      {/* Visual A4 Live Paper Container */}
      <div className="flex-1 bg-slate-950 p-4 md:p-8 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-[820px] flex flex-col items-center justify-center my-auto">
          {/* Top Sheet indicator bar */}
          <div className="w-full flex justify-between items-center px-4 py-2 border border-slate-800 bg-slate-900/60 backdrop-blur rounded-t-xl text-slate-400 text-xs select-none">
            <span className="font-mono flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              تقرير A4 فني جاهز للطباعة والتصدير
            </span>
            <span className="font-sans font-bold text-indigo-500">{title}</span>
          </div>

          {/* Simulated printed paper wrapper */}
          <div className="w-full bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-slate-800 relative select-text overflow-hidden aspect-[1/1.414]">
            {!isReady ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-200 z-10 gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                <span className="text-xs font-semibold text-indigo-500">جاري صياغة التقرير الفني بالأبعاد الرسمية...</span>
              </div>
            ) : null}

            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              className="w-full h-full border-0 select-text"
              title="Print Preview Document Instance"
              referrerPolicy="no-referrer"
            />
          </div>
          
          {/* Mobile indicator advice */}
          <p className="text-[10px] text-slate-500 mt-3 text-center">
            يمكنك استخدام عجلة الفأرة للتمرير وقراءة تفاصيل المستند.
          </p>
        </div>
      </div>
    </div>
  );
});

export default PrintPreviewModal;
