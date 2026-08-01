/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Case, Client, Session, Transaction, LawTask, OfficeProfile, LawDocument, BailiffPaper, Opponent, Execution } from '../types';
import { envelopePrintCSS } from './envelopePrintStyles';
import { escapeHtml } from './security';
import { showAlert } from './dialogs';

let globalPrintHandler: ((title: string, htmlContent: string) => void) | null = null;

export function registerGlobalPrintHandler(handler: (title: string, htmlContent: string) => void) {
  globalPrintHandler = handler;
}

export function unregisterGlobalPrintHandler() {
  globalPrintHandler = null;
}

/**
 * Common print helper that:
 * - In Electron (Windows desktop app): sends the HTML to the main process
 *   via IPC so that `webContents.print()` can open the native Windows print
 *   dialog with full preview support.
 * - In a normal browser: opens a hidden iframe, populates it with stylized
 *   Arabic HTML, and triggers the browser's print dialog.
 */
export function showPrintJob(title: string, htmlContent: string) {
  // ── Route through the global handler (PrintPreviewModal) if registered ──
  if (globalPrintHandler) {
    globalPrintHandler(title, htmlContent);
    return;
  }

  // ── Electron path: use IPC → webContents.print() for native dialog ──
  const electronAPI = (window as unknown as { electronAPI?: { print: (html: string, title: string) => Promise<{ success: boolean; reason?: string }> } }).electronAPI;
  if (electronAPI?.print) {
    electronAPI.print(htmlContent, title).catch((err: unknown) => {
      console.error('Electron IPC print failed:', err);
    });
    return;
  }

  // ── Browser / web path: hidden iframe approach ──
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
    showAlert('تعذر فتح محرك الطباعة الفرعي!');
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // Wait slightly to ensure styles are parsed before printing
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error(e);
    } finally {
      // Remove iframe from DOM after a delay so printing modal finishes
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  }, 500);
}

function triggerIframePrint(title: string, htmlContent: string) {
  showPrintJob(title, htmlContent);
}

/**
 * HTML Header template reflecting the office credentials, registry IDs, etc.
 */
function getLegalHeaderHTML(title: string, office: OfficeProfile) {
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const logoSrc = office.logoDataUrl;

  return `
    <div class="legal-header">
      <div class="header-top">
        <div class="office-seal">
          ${logoSrc ? `<img src="${escapeHtml(logoSrc)}" alt="شعار المكتب" style="width:60px;height:60px;object-fit:contain;border-radius:6px;" />` : `<div class="seal-inner">⚖️</div>`}
        </div>
        <div class="office-identity">
          <h1>${escapeHtml(office.officeName)}</h1>
          <p class="managing-partner">المستشار القانوني: ${escapeHtml(office.managingPartner)}</p>
          <p class="credentials">رقم القيد بالنقابة: ${escapeHtml(office.barId)} | بطاقة ضريبية رقم: ${escapeHtml(office.taxId)}</p>
        </div>
        <div class="report-meta">
          <p><strong>تاريخ التحرير:</strong> ${currentDate}</p>
          <p><strong>حالة التقرير:</strong> رسمي معتمد</p>
          <p><strong>المنظومة:</strong> منصة المحامي الذكي</p>
        </div>
      </div>
      <div class="header-divider"></div>
      <h2 class="report-main-title">${escapeHtml(title)}</h2>
    </div>
  `;
}

/**
 * HTML Footer template containing official stamp and signatures placeholders.
 */
function getLegalFooterHTML() {
  return `
    <div class="legal-footer">
      <div class="signature-section">
        <div class="signature-box animate-box">
          <p class="role">توقيع المستشار المسؤول</p>
          <div class="sign-line"></div>
        </div>
        <div class="signature-box seal-box">
          <p class="role">خاتم المكتب الرسمي</p>
          <div class="seal-stamp">
            <span>⚖️ معتمد ⚖️</span>
            <span>مكتب النقض</span>
          </div>
        </div>
        <div class="signature-box">
          <p class="role">توقيع الكاتب والمستخرج</p>
          <div class="sign-line"></div>
        </div>
      </div>
      <div class="footer-note">
        <p>هذا كشف رسمي صادر إلكترونياً عن "منصة المحاماة المبتكرة والذكية" ومحمي ضد التزوير بذاكرة المكتب الآمنة.</p>
        <p>الصفحة 1 من 1 | جمهورية مصر العربية • نقابة المحامين الفرعية بالقاهرة</p>
      </div>
    </div>
  `;
}

/**
 * CSS stylesheet to stylize printed reports professionally
 */
const printStyles = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Tajawal:wght@400;500;700;900&display=swap');
    
    @page {
      size: A4;
      margin: 20mm;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Amiri', 'Tajawal', serif;
      direction: rtl;
      text-align: right;
      padding: 0;
      margin: 0;
      color: #1e293b;
      font-size: 11.5pt;
      background-color: #fff;
      line-height: 1.6;
    }
    
    /* Header Styles */
    .legal-header {
      margin-bottom: 25px;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .office-seal {
      width: 70px;
      height: 70px;
      border: 3px double #1a2333;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      background: #f8fafc;
    }
    
    .office-identity {
      flex: 1;
      margin-right: 20px;
    }
    
    .office-identity h1 {
      font-family: 'Tajawal', sans-serif;
      font-weight: 900;
      font-size: 15pt;
      color: #1e3a8a;
      margin: 0 0 4px 0;
    }
    
    .managing-partner {
      font-family: 'Tajawal', sans-serif;
      font-weight: 700;
      font-size: 11pt;
      color: #334155;
      margin: 0 0 2px 0;
    }
    
    .credentials {
      font-size: 9.5pt;
      color: #64748b;
      margin: 0;
    }
    
    .report-meta {
      font-family: 'Tajawal', sans-serif;
      font-size: 8.5pt;
      text-align: left;
      color: #475569;
      background: #f1f5f9;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    
    .report-meta p {
      margin: 2px 0;
    }
    
    .header-divider {
      height: 4px;
      border-top: 1px solid #1e3a8a;
      border-bottom: 3px double #1e3a8a;
      margin-bottom: 20px;
    }
    
    .report-main-title {
      font-family: 'Tajawal', sans-serif;
      font-weight: 900;
      color: #1e293b;
      font-size: 14pt;
      text-align: center;
      margin: 10px 0 25px 0;
      background: #f8fafc;
      padding: 8px 15px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      box-shadow: inset 0 0 5px rgba(0,0,0,0.02);
    }
    
    /* Layout styling modules */
    .section-title {
      font-family: 'Tajawal', sans-serif;
      font-weight: 700;
      font-size: 11pt;
      color: #1e3a8a;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 5px;
      margin: 20px 0 10px 0;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .info-card {
      border: 1px solid #e2e8f0;
      background: #fafafb;
      padding: 10px 14px;
      border-radius: 6px;
    }
    
    .info-card.span-2 {
      grid-column: span 2;
    }
    
    .info-label {
      font-family: 'Tajawal', sans-serif;
      font-weight: 700;
      font-size: 9.5pt;
      color: #64748b;
      display: block;
      margin-bottom: 3px;
    }
    
    .info-value {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
    }
    
    /* Tables design */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0 25px 0;
      font-size: 10pt;
    }
    
    th {
      font-family: 'Tajawal', sans-serif;
      font-weight: 700;
      background: #1e3a8a;
      color: #fff;
      padding: 8px 12px;
      text-align: right;
      border: 1px solid #1e3a8a;
    }
    
    td {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'Tajawal', sans-serif;
      font-size: 8.5pt;
      font-weight: 700;
    }
    
    .badge-primary { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-warning { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .badge-secondary { background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; }
    
    .total-highlight {
      font-weight: bold;
      color: #1e3a8a;
      background: #f0fdf4 !important;
    }
    
    /* Footer design */
    .legal-footer {
      margin-top: 50px;
      page-break-inside: avoid;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
    }
    
    .signature-box {
      width: 30%;
      text-align: center;
    }
    
    .signature-box .role {
      font-family: 'Tajawal', sans-serif;
      font-weight: 700;
      font-size: 10pt;
      margin-bottom: 5px;
      color: #475569;
    }
    
    .sign-line {
      height: 45px;
      border-bottom: 1px dashed #94a3b8;
    }
    
    .seal-stamp {
      width: 100px;
      height: 100px;
      border: 2px dashed #dc2626;
      border-radius: 50%;
      margin: 5px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #dc2626;
      font-size: 8pt;
      font-weight: bold;
      transform: rotate(-10deg);
      opacity: 0.85;
      font-family: 'Tajawal', sans-serif;
    }
    
    .footer-note {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
      font-family: 'Tajawal', sans-serif;
    }
    
    .footer-note p {
      margin: 2px 0;
    }
    
    .font-mono {
      font-family: monospace;
      letter-spacing: 0.5px;
    }
  </style>
`;


// ==========================================
// 1. SINGLE RECORD PRINTERS
// ==========================================

export function printSingleCase(c: Case, sessions: Session[], transactions: Transaction[], office: OfficeProfile) {
  const caseSessions = sessions.filter(s => s.caseId === c.id);
  const caseTransactions = transactions.filter(t => t.caseId === c.id);

  const totalPaid = caseTransactions
    .filter(t => t.ioType.includes('وارد') && t.type === 'أتعاب')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = caseTransactions
    .filter(t => t.ioType.includes('صادر') || t.type === 'مصروفات دعوى')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const remaining = Math.max(0, (c.totalFees || 0) - totalPaid);

  const sessionsRows = caseSessions.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#64748b;">لا يوجد جلسات مسجلة بملف القضية حالياً</td></tr>`
    : caseSessions.map(s => `
        <tr>
          <td style="font-weight:bold;">${escapeHtml(s.date)}</td>
          <td>${escapeHtml(s.objective)}</td>
          <td>${s.decision ? escapeHtml(s.decision) : '<span style="color:#94a3b8;">قيد النظر/لم يدون قرار</span>'}</td>
          <td>${s.judgeName ? escapeHtml(s.judgeName) : '-'}</td>
          <td>
            <span class="badge ${s.status === 'قادمة' ? 'badge-warning' : 'badge-success'}">${escapeHtml(s.status)}</span>
          </td>
        </tr>
      `).join('');

  const financeRows = caseTransactions.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#64748b;">لم تسجل أي دفعات مالية أو مصروفات للملف</td></tr>`
    : caseTransactions.map(t => `
        <tr>
          <td>${escapeHtml(t.date)}</td>
          <td>${escapeHtml(t.type)}</td>
          <td>${escapeHtml(t.description)}</td>
          <td>${escapeHtml(t.paymentMethod)}</td>
          <td style="font-weight:bold; color: ${t.ioType.includes('وارد') ? '#10b981' : '#ef4444'};">
            ${t.ioType.includes('وارد') ? '+' : '-'}${t.amount.toLocaleString('ar-EG')} ج.م
          </td>
        </tr>
      `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>ملف قضية: ${escapeHtml(c.caseNumber)}</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML(`تقرير تقييم ملف قضية رقم ${c.caseNumber} لسنة ${c.year}`, office)}
        
        <h3 class="section-title">أولاً: البيانات الأساسية لملف الخصومة</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">الموكل صاحب الصفة</span>
            <span class="info-value">${escapeHtml(c.clientName)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">صفة الموكل في الدعوى</span>
            <span class="info-value"><span class="badge badge-primary">${escapeHtml(c.clientRole)}</span></span>
          </div>
          <div class="info-card">
            <span class="info-label">المحكمة المختصة</span>
            <span class="info-value">${escapeHtml(c.court)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">الدائرة الماثل أمامها</span>
            <span class="info-value">${escapeHtml(c.circuit)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">الخصم المقابل</span>
            <span class="info-value" style="color:#ef4444;">${escapeHtml(c.opponentName)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">محامي الخصم</span>
            <span class="info-value">${c.opponentLawyer ? escapeHtml(c.opponentLawyer) : 'غير معلوم/لم يحضر'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">نوع النزاع القضائي</span>
            <span class="info-value">${escapeHtml(c.type)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">درجة التقاضي الحالية</span>
            <span class="info-value"><span class="badge badge-secondary">${escapeHtml(c.litigationLevel)}</span></span>
          </div>
          <div class="info-card span-2">
            <span class="info-label">موضوع الدعوى والمطالبة القانونية</span>
            <span class="info-value" style="font-weight:normal;font-size:10.5pt;display:block;white-space:pre-wrap;">${c.claimSubject ? escapeHtml(c.claimSubject) : 'لم يحدد موضوع الدعوى تفصيلياً'}</span>
          </div>
        </div>

        <h3 class="section-title" style="page-break-before: auto;">ثانياً: جدول الجلسات وقرارات المحكمة</h3>
        <table>
          <thead>
            <tr>
              <th style="width:13%">تاريخ الجلسة</th>
              <th style="width:30%">الهدف والمطلوب</th>
              <th style="width:27%">قرار وقيد المحكمة</th>
              <th style="width:15%">القاضي</th>
              <th style="width:15%">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${sessionsRows}
          </tbody>
        </table>

        <h3 class="section-title">ثالثاً: الميزانية المالية لملف القضية</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">إجمالي الأتعاب المتفق عليها</span>
            <span class="info-value">${c.totalFees.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div class="info-card">
            <span class="info-label">المسدد الفعلي بقيد Ledger</span>
            <span class="info-value" style="color: #10b981;">${totalPaid.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div class="info-card">
            <span class="info-label">المتبقي المستحق ذمة الموكل</span>
            <span class="info-value" style="color: #ef4444;">${remaining.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div class="info-card">
            <span class="info-label">رسوم ومصروفات انتقالية وقضائية مسددة</span>
            <span class="info-value" style="color: #64748b;">${totalExpenses.toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>

        <h3 class="section-title">رابعاً: حركة السحوبات والدفعات المسجلة بالدعوى</h3>
        <table>
          <thead>
            <tr>
              <th style="width:15%">التاريخ</th>
              <th style="width:15%">النوع</th>
              <th style="width:35%">بيان السداد</th>
              <th style="width:15%">وسيلة الدفع</th>
              <th style="width:20%">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${financeRows}
          </tbody>
        </table>

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint(`ملف القضية رقم ${c.caseNumber}`, html);
}

export function printSingleClient(cl: Client, cases: Case[], office: OfficeProfile) {
  const clientCases = cases.filter(c => c.clientId === cl.id && !c.isArchived);

  const poasRows = cl.poas.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:#64748b;">لا يوجد توكيلات مودعة بملف الموكل حالياً</td></tr>`
    : cl.poas.map(poa => `
        <tr>
          <td style="font-weight:bold;">${escapeHtml(poa.poaNumber)}</td>
          <td>${escapeHtml(poa.office)}</td>
          <td>${escapeHtml(poa.type)}</td>
          <td>${escapeHtml(poa.date)}</td>
        </tr>
      `).join('');

  const casesRows = clientCases.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#64748b;">لا يوجد قضايا مسجلة تحت اسم هذا الموكل حالياً</td></tr>`
    : clientCases.map(c => `
        <tr>
          <td style="font-weight:bold;">${escapeHtml(c.caseNumber)}</td>
          <td>${escapeHtml(c.court)}</td>
          <td>${escapeHtml(c.circuit)}</td>
          <td>${escapeHtml(c.type)}</td>
          <td><span class="badge ${c.status === 'متداولة' ? 'badge-success' : 'badge-warning'}">${escapeHtml(c.status)}</span></td>
        </tr>
      `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>الموكل: ${escapeHtml(cl.name)}</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML(`ملف بيانات الموكل القانونية: ${cl.name}`, office)}
        
        <h3 class="section-title">أولاً: تفاصيل هوية الموكل والاتصال</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">اسم وعنوان الموكل بالكامل</span>
            <span class="info-value">${escapeHtml(cl.name)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">الرقم القومي المصري / السجل التجاري</span>
            <span class="info-value font-mono">${escapeHtml(cl.nationalId)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">رقم الهاتف الجوال</span>
            <span class="info-value font-mono">${escapeHtml(cl.phone)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">البريد الإلكتروني المراسلات بريد</span>
            <span class="info-value font-mono">${cl.email ? escapeHtml(cl.email) : 'لم يدون بريد رسمي'}</span>
          </div>
          <div class="info-card span-2">
            <span class="info-label">محل الإقامة المختار والموطن القانوني</span>
            <span class="info-value">${escapeHtml(cl.address)}</span>
          </div>
          ${cl.notes ? `
          <div class="info-card span-2">
            <span class="info-label">ملاحظات ومحاضر تتبع الموكل</span>
            <span class="info-value" style="font-weight:normal;font-size:10pt;">${escapeHtml(cl.notes)}</span>
          </div>` : ''}
        </div>

        <h3 class="section-title">ثانياً: التوكيلات وسندات الحضور والوكالة القضائية</h3>
        <table>
          <thead>
            <tr>
              <th style="width:25%">رقم التوكيل</th>
              <th style="width:30%">مكتب التوثيق (الشهر العقاري)</th>
              <th style="width:25%">نوع التوكيل</th>
              <th style="width:20%">تاريخ الصدور والتسجيل</th>
            </tr>
          </thead>
          <tbody>
            ${poasRows}
          </tbody>
        </table>

        <h3 class="section-title">ثالثاً: القضايا والملفات النشطة الموكلة للمكتب</h3>
        <table>
          <thead>
            <tr>
              <th style="width:20%">رقم القضية</th>
              <th style="width:30%">المحكمة والفرع</th>
              <th style="width:20%">الدائرة</th>
              <th style="width:15%">نوع القضية</th>
              <th style="width:15%">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${casesRows}
          </tbody>
        </table>

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint(`ملف الموكل ${cl.name}`, html);
}

export function printSingleSession(s: Session, c: Case | undefined, office: OfficeProfile) {
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>محضر جلسة: ${escapeHtml(s.date)}</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML(`محضر وكشف جلسة يوم ${s.date}`, office)}
        
        <h3 class="section-title">أولاً: بيانات الخصومة والقضية الموصولة</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">رقم وعام القضية</span>
            <span class="info-value">قضية رقم ${escapeHtml(s.caseNumber)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">اسم الموكل الطرف</span>
            <span class="info-value">${escapeHtml(s.clientName)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">المحكمة الماثلة أمامها</span>
            <span class="info-value">${s.court ? escapeHtml(s.court) : 'غير محددة ببطاقة الجلسة'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">رقم وتصنيف الدائرة</span>
            <span class="info-value">${s.circuit ? escapeHtml(s.circuit) : 'غير محددة'}</span>
          </div>
          ${s.judgeName ? `
          <div class="info-card">
            <span class="info-label">القاضي المختص بالجلسة</span>
            <span class="info-value">${escapeHtml(s.judgeName)}</span>
          </div>` : ''}
          ${c ? `
          <div class="info-card">
            <span class="info-label">صفة الموكل بالنزاع</span>
            <span class="info-value">${escapeHtml(c.clientRole)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">الخصم ومدى تواجده</span>
            <span class="info-value" style="color:#ef4444">${escapeHtml(c.opponentName)}</span>
          </div>` : ''}
        </div>

        <h3 class="section-title">ثانياً: القرار المطلوب وموضوع الجلسة</h3>
        <div class="info-card span-2" style="background:#fffbeb; border:1px solid #fde68a;">
          <span class="info-label" style="color:#b45309">المطلوب لتهيئة الدعوى بالجلسة:</span>
          <p style="font-size:12pt;font-weight:bold;margin:5px 0 0 0;line-height:1.7;">${escapeHtml(s.objective)}</p>
        </div>

        <h3 class="section-title">ثالثاً: ما تم بالجلسة وقرار عدالة المحكمة</h3>
        <div class="info-card span-2" style="background:#f0fdf4; border:1px solid #86efac; min-height: 100px;">
          <span class="info-label" style="color:#15803d font-weight:900">سجل وقائع وقرار المحكمة المودع:</span>
          <p style="font-size:12.5pt;font-weight:bold;margin:10px 0 0 0;line-height:1.7;color:#1e293b;">
            ${s.decision ? escapeHtml(s.decision) : '<span style="color:#94a3b8;font-weight:normal;">المحاكمة سارية / لم تسجل قرارات بعد لهذه الجلسة تفتقر للتدوين الجنائي</span>'}
          </p>
        </div>

        <div style="margin-top:20px;" class="info-grid">
          <div class="info-card">
            <span class="info-label">حالة بطاقة الجلسة</span>
            <span class="info-value"><span class="badge ${s.status === 'قادمة' ? 'badge-warning' : 'badge-success'}">${escapeHtml(s.status)}</span></span>
          </div>
        </div>

        ${s.notes ? `
        <h3 class="section-title">ملاحظات على الجلسة</h3>
        <div class="info-card span-2" style="background:#fefce8; border:1px solid #fde047;">
          <span class="info-label">ملاحظات إضافية:</span>
          <p style="font-size:11.5pt;margin:5px 0 0 0;line-height:1.7;">${escapeHtml(s.notes)}</p>
        </div>` : ''}

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint(`جلسة قضية ${s.caseNumber}`, html);
}

export function printSingleTask(t: LawTask, c: Case | undefined, office: OfficeProfile) {
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>تكليف بمهمة قانونية</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML(`ورقة تكليف بمهمة قانونية قضائية`, office)}
        
        <h3 class="section-title">اولاً: تفاصيل المهمة والتوجه</h3>
        <div class="info-grid">
          <div class="info-card span-2">
            <span class="info-label">موضوع التكليف الرئيسي</span>
            <span class="info-value" style="font-size:13pt;color:#1e3a8a;">${escapeHtml(t.title)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">المستشار / المحامي المسؤول</span>
            <span class="info-value" style="color:#0369a1">${escapeHtml(t.assignedTo)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">تاريخ الاستحقاق التنفيذي وموعده</span>
            <span class="info-value font-mono" style="color:#b45309">${escapeHtml(t.dueDate)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">رقم وعام القضية المتصلة</span>
            <span class="info-value">${t.caseNumber ? `قضية رقم ${escapeHtml(t.caseNumber)}` : 'تكليف مكتب عام تشغيلي'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">حالة الاستجابة والتنفيذ</span>
            <span class="info-value"><span class="badge ${t.status === 'completed' ? 'badge-success' : 'badge-danger'}">${t.status === 'completed' ? 'تم الإنجاز بالكامل' : 'قيد المتابعة جاري'}</span></span>
          </div>
        </div>

        <h3 class="section-title">ثانياً: الشرح والخطوات الإجرائية المطلوبة</h3>
        <div class="info-card span-2" style="background:#fcfdfd; min-height: 120px; border: 1px solid #cbd5e1; white-space: pre-wrap; line-height: 1.8;">
          <span class="info-label">وصف الإجراء والتحضير الفني:</span>
          ${t.description ? escapeHtml(t.description) : 'لا يوجد شرح تفصيلي مضاف للمهمة.'}
        </div>

        ${c ? `
        <h3 class="section-title">ثالثاً: ملخص صياغة القضية الحاضنة</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">الموكل المدعي/المدعى عليه</span>
            <span class="info-value">${escapeHtml(c.clientName)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">المحكمة المختصة بالتحضير</span>
            <span class="info-value">${escapeHtml(c.court)}</span>
          </div>
        </div>` : ''}

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint(`تكليف بمهمة ${t.title}`, html);
}

export function printSingleTransaction(t: Transaction, c: Case | undefined, office: OfficeProfile) {
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>إيصال استلام مالي رسمي</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML(`إيصال وسند مالي مالي معتمد: ${t.type}`, office)}
        
        <div style="border: 2px solid #cbd5e1; padding: 20px; border-radius: 8px; background: #fffdf9; margin-bottom: 25px; page-break-inside: avoid;">
          <div style="text-align: center; margin-bottom: 15px;">
            <span style="font-size: 10pt; color: #64748b; font-family: 'Tajawal', sans-serif;">مستند الحركة المالي الرقمي</span>
            <h3 style="margin: 5px 0; color: #1e3a8a; font-family: 'Tajawal', sans-serif; font-size:16pt;">سند استلام وقيد</h3>
          </div>
          
          <table style="margin: 0; font-size:11pt;">
            <tr>
              <td style="width: 30%; font-weight: bold; background: #f8fafc;">رقم السند المالي:</td>
              <td style="font-family: monospace;">REC-${t.id.slice(-8).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f8fafc;">سدد من السيد / الأستاذ:</td>
              <td style="font-weight: bold; font-size:12.5px;">${escapeHtml(t.clientName)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f8fafc;">مبلغ وقدره حرفياً:</td>
              <td style="font-weight: bold; color: #10b981; font-size:12pt;">${t.amount.toLocaleString('ar-EG')} جنيهاً مصرياً لا غير</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f8fafc;">وذلك مقابل وبناء على:</td>
              <td>${escapeHtml(t.description)} (${escapeHtml(t.type)})</td>
            </tr>
            ${t.caseNumber ? `
            <tr>
              <td style="font-weight: bold; background: #f8fafc;">ارتباطاً بملف القضية:</td>
              <td>قضية رقم ${escapeHtml(t.caseNumber)} ${c ? `- محكمة ${escapeHtml(c.court)}` : ''}</td>
            </tr>` : ''}
            <tr>
              <td style="font-weight: bold; background: #f8fafc;">طريقة ووسيلة السداد:</td>
              <td>${escapeHtml(t.paymentMethod)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f8fafc;">تاريخ استحقاق الحركة:</td>
              <td style="font-weight: bold;">${escapeHtml(t.date)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f8fafc;">تصنيف حركة الحسابات:</td>
              <td><span class="badge ${t.ioType.includes('وارد') ? 'badge-success' : 'badge-danger'}">${escapeHtml(t.ioType)}</span></td>
            </tr>
          </table>
        </div>

        <div class="info-card span-2" style="text-align: center; font-size:9.5pt; color:#475569; border-style: dashed;">
          يعتبر هذا السند إقراراً رسمياً صادراً من إدارة التدقيق المالي للمكتب لتمثيل الموكل قانونياً في الشؤون والنفقات المبينة أعلاه.
        </div>

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint(`إيصال حركة مالية ${t.id}`, html);
}


// ==========================================
// 2. CENTRAL BULK & AGGREGATE REPORTS
// ==========================================

export function printBulkCases(casesList: Case[], office: OfficeProfile) {
  const activeCount = casesList.filter(c => c.status === 'متداولة').length;
  const pleadingCount = casesList.filter(c => c.status === 'محجوزة للحكم').length;
  const closedCount = casesList.filter(c => c.status === 'منتهية ومحفوظة').length;

  const totalContractedFees = casesList.reduce((acc, curr) => acc + (curr.totalFees || 0), 0);
  const totalPaidFees = casesList.reduce((acc, curr) => acc + (curr.paidFees || 0), 0);
  const totalOutstanding = Math.max(0, totalContractedFees - totalPaidFees);

  const rows = casesList.length === 0
    ? `<tr><td colspan="7" style="text-align:center;color:#64748b;">لا توجد أي قضايا مسجلة بالنظام حالياً</td></tr>`
    : casesList.map((c, idx) => `
        <tr>
          <td style="font-family: monospace; font-weight:bold;">${idx + 1}</td>
          <td style="font-weight:bold;">${escapeHtml(c.caseNumber)}</td>
          <td>${escapeHtml(c.clientName)}</td>
          <td>${escapeHtml(c.court)}</td>
          <td>${escapeHtml(c.type)}</td>
          <td><span class="badge ${
            c.status === 'متداولة' ? 'badge-success' : 
            c.status === 'محجوزة للحكم' ? 'badge-warning' : 
            'badge-secondary'
          }">${escapeHtml(c.status)}</span></td>
          <td style="font-weight:bold; font-family: monospace; text-align:left;">
            ${c.paidFees.toLocaleString('ar-EG')} / ${c.totalFees.toLocaleString('ar-EG')} ج.م
          </td>
        </tr>
      `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>الكشف الشامل للقضايا والملفات القضائية</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML('الكشف الكلي والمنهجي لكافة القضايا النشطة والمتداولة وبطاقات الأتعاب', office)}
        
        <h3 class="section-title">أولاً: التحليل الإحصائي الإجمالي لملفات المكتب</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">إجمالي القضايا الكلي</span>
            <span class="info-value">${casesList.length} ملفات دعاوى</span>
          </div>
          <div class="info-card">
            <span class="info-label">قضايا متداولة بالدائرة</span>
            <span class="info-value" style="color: #10b981;">${activeCount} قضية</span>
          </div>
          <div class="info-card">
            <span class="info-label">دعاوي محجوزة لنطق الحكم</span>
            <span class="info-value" style="color: #b45309;">${pleadingCount} حجز موضوعي</span>
          </div>
          <div class="info-card">
            <span class="info-label">دعاوي منتهية ومحفوظة بالأرشيف</span>
            <span class="info-value" style="color: #64748b;">${closedCount} قضية مؤرشفة</span>
          </div>
        </div>

        <h3 class="section-title">ثانياً: الملاءة المالية وإجمالي المطالبات المقيدة</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">إجمالي الأتعاب التعاقدية للمكتب</span>
            <span class="info-value" style="color: #1e3a8a;">${totalContractedFees.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div class="info-card">
            <span class="info-label font-black">المقبوضات والمسدد الفعلي حتى الآن</span>
            <span class="info-value" style="color: #10b981;">${totalPaidFees.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div class="info-card">
            <span class="info-label">الأقساط والمتبقيات في دائنية الموكلين</span>
            <span class="info-value" style="color: #ef4444;">${totalOutstanding.toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>

        <h3 class="section-title">ثالثاً: جدول تتبع القضايا التفصيلي المسجل</h3>
        <table>
          <thead>
            <tr>
              <th style="width:5%">م</th>
              <th style="width:20%">رقم القضية والعام</th>
              <th style="width:20%">الموكل</th>
              <th style="width:20%">المحكمة والفرع</th>
              <th style="width:15%">التصنيف</th>
              <th style="width:10%">الحالة</th>
              <th style="width:10%; text-align:left;">المسدد/التعاقدى</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint('كشف القضايا الشامل', html);
}

export function printBulkClients(clientsList: Client[], casesList: Case[], office: OfficeProfile) {
  const rows = clientsList.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#64748b;">لا يوجد موكلين مسجلين بالنظام حالياً</td></tr>`
    : clientsList.map((cl, idx) => {
        const cCount = casesList.filter(c => c.clientId === cl.id && !c.isArchived).length;
        const poasCount = cl.poas.length;
        return `
          <tr>
            <td style="font-family: monospace; font-weight:bold;">${idx + 1}</td>
            <td style="font-weight:bold;">${escapeHtml(cl.name)}</td>
            <td style="font-family: monospace;">${escapeHtml(cl.phone)}</td>
            <td style="font-family: monospace;">${escapeHtml(cl.nationalId)}</td>
            <td style="font-weight:bold; color: #1e3a8a;">${poasCount} توكيلات</td>
            <td style="font-weight:bold; color: #15803d; text-align:center;">${cCount} قضية</td>
          </tr>
        `;
      }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>سجل ودليل الموكلين التراكمي</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML('تقرير كشف الموكلين المعتمدين والمقيدين بملف توكيلات المكتب الرسمي', office)}
        
        <h3 class="section-title">أولاً: إحصائيات عامة لقاعدة الموكلين وجداول العمل</h3>
        <div class="info-grid py-2">
          <div class="info-card">
            <span class="info-label">إجمالي عدد العملاء والشركات المسجلة</span>
            <span class="info-value">${clientsList.length} اسم تجاري وفردي</span>
          </div>
          <div class="info-card">
            <span class="info-label">إجمالي التوكيلات وسندات الوكالة المودعة</span>
            <span class="info-value" style="color: #1e3a8a;">
              ${clientsList.reduce((acc, cl) => acc + cl.poas.length, 0)} سند توكيل معتمد
            </span>
          </div>
        </div>

        <h3 class="section-title">ثانياً: جدول بيان الموكلين وتفاصيل القضايا</h3>
        <table>
          <thead>
            <tr>
              <th style="width:5%">م</th>
              <th style="width:25%">الاسم والكامل للموكل</th>
              <th style="width:15%">الهاتف الرسمي</th>
              <th style="width:20%">الرقم القومي / السجل التجاري</th>
              <th style="width:20%">التوكيلات المحفوظة</th>
              <th style="width:15%; text-align:center;">قضايا متداولة مقيدة</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint('دليل الموكلين الشامل', html);
}

export function printBulkSessions(sessionsList: Session[], office: OfficeProfile) {
  const upcomingCount = sessionsList.filter(s => s.status === 'قادمة').length;
  const finishedCount = sessionsList.filter(s => s.status === 'منتهية').length;

  const rows = sessionsList.length === 0
    ? `<tr><td colspan="9" style="text-align:center;color:#64748b;">لا توجد أي جلسات مضافة لجدول الأعمال حالياً</td></tr>`
    : sessionsList
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((s, idx) => `
          <tr>
            <td style="font-family: monospace; font-weight:bold;">${idx + 1}</td>
            <td style="font-weight:bold;">${escapeHtml(s.date)}</td>
            <td>قضية رقم ${escapeHtml(s.caseNumber)}</td>
            <td>${escapeHtml(s.clientName)}</td>
            <td>${escapeHtml(s.court)} - ${escapeHtml(s.circuit)}</td>
            <td>${s.judgeName ? escapeHtml(s.judgeName) : '-'}</td>
            <td>${escapeHtml(s.objective)}</td>
            <td>${s.notes ? escapeHtml(s.notes) : '-'}</td>
            <td><span class="badge ${s.status === 'قادمة' ? 'badge-warning' : 'badge-success'}">${escapeHtml(s.status)}</span></td>
          </tr>
        `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>كشف أجندة الجلسات القضائية للأسبوع والشهر</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML('تقرير رول وأجندة الجلسات القضائية ومحاضر الحضور بالمحاكم', office)}
        
        <h3 class="section-title">أولاً: تلخيص أجندة قضايا الاستيراد بالجدول</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">إجمالي الجلسات التراكمي المقيد</span>
            <span class="info-value">${sessionsList.length} جلسة محكمة</span>
          </div>
          <div class="info-card">
            <span class="info-label">أجندة وقائع جلسات قادمة حية</span>
            <span class="info-value" style="color: #b45309;">${upcomingCount} جلسات مرتقبة</span>
          </div>
          <div class="info-card">
            <span class="info-label">جلسات منقضية ومدونة القرارات</span>
            <span class="info-value" style="color: #10b981;">${finishedCount} جلسة منتهية</span>
          </div>
        </div>

        <h3 class="section-title">ثانياً: جدول بيان رول الجلسات وحضور المحاكم</h3>
        <table>
          <thead>
            <tr>
              <th style="width:5%">م</th>
              <th style="width:13%">تاريخ الجلسة</th>
              <th style="width:12%">رقم القضية</th>
              <th style="width:15%">الموكل لصالحه</th>
              <th style="width:13%">المحكمة والدائرة</th>
              <th style="width:12%">القاضي</th>
              <th style="width:10%">الهدف والمطلوب</th>
              <th style="width:10%">ملاحظات</th>
              <th style="width:10%">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint('أجندة الجلسات الكلية', html);
}

export function printBulkTasks(tasksList: LawTask[], office: OfficeProfile) {
  const compCount = tasksList.filter(t => t.status === 'completed').length;
  const pendCount = tasksList.filter(t => t.status === 'pending').length;

  const rows = tasksList.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#64748b;">لا توجد أي مهام أو تكليفات مسجلة بالجدول حالياً</td></tr>`
    : tasksList.map((t, idx) => `
        <tr>
          <td style="font-family: monospace; font-weight:bold;">${idx + 1}</td>
          <td style="font-weight:bold;">${escapeHtml(t.title)}</td>
          <td>${t.caseNumber ? `قضية رقم ${escapeHtml(t.caseNumber)}` : 'إجراء عام لمكتب التشغيل'}</td>
          <td>${escapeHtml(t.assignedTo)}</td>
          <td style="font-family: monospace; font-weight:bold; color:#b45309;">${escapeHtml(t.dueDate)}</td>
          <td>
            <span class="badge ${t.status === 'completed' ? 'badge-success' : 'badge-danger'}">
              ${t.status === 'completed' ? 'منجز' : 'قيد العمل'}
            </span>
          </td>
        </tr>
      `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>تقرير كشف المهام القضائية والإجراءات الاستباقية</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML('كشف متابعة التكليفات والمهام التنفيذية والإنذار المبكر للمكتب', office)}
        
        <h3 class="section-title">أولاً: الكفاءة والإنتاجية وتوزيع الإجراءات</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">إجمالي التكليفات القضائية المسجلة</span>
            <span class="info-value">${tasksList.length} مهمة إجرائية</span>
          </div>
          <div class="info-card">
            <span class="info-label">إجراءات ومهام مكتملة ومنجزة</span>
            <span class="info-value" style="color: #10b981;">${compCount} مهمة منجزة</span>
          </div>
          <div class="info-card">
            <span class="info-label">مهام قيد العمل والدفاع النشط</span>
            <span class="info-value" style="color: #ef4444;">${pendCount} تكليف ساري</span>
          </div>
        </div>

        <h3 class="section-title">ثانياً: جدول تفصيل وتوزيع المهام</h3>
        <table>
          <thead>
            <tr>
              <th style="width:5%">م</th>
              <th style="width:30%">عنوان الإجراء / التكليف</th>
              <th style="width:20%">صالح ملف الدعوى</th>
              <th style="width:15%">اسم المحامي المتابع</th>
              <th style="width:15%">موعد الاستحقاق</th>
              <th style="width:15%">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint('تقرير المهام والتكليفات', html);
}

export function printBulkFinancials(txList: Transaction[], office: OfficeProfile) {
  const incomeCount = txList.filter(t => t.ioType.includes('وارد')).length;
  const expenseCount = txList.filter(t => t.ioType.includes('صادر')).length;

  const totalIncomes = txList
    .filter(t => t.ioType.includes('وارد'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = txList
    .filter(t => t.ioType.includes('صادر') || t.type === 'مصاريف مكتب تشغيلية' || t.type === 'مصروفات دعوى')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netOfficeRevenue = Math.max(0, totalIncomes - totalExpenses);

  const rows = txList.length === 0
    ? `<tr><td colspan="7" style="text-align:center;color:#64748b;">لا يوجد أي قيود محاسبية أو معاملات مالية مقيدة بالدفاتر</td></tr>`
    : txList.map((t, idx) => `
        <tr>
          <td style="font-family: monospace; font-weight:bold;">${idx + 1}</td>
          <td style="font-family: monospace;">${escapeHtml(t.date)}</td>
          <td>${escapeHtml(t.type)}</td>
          <td>${escapeHtml(t.clientName)}</td>
          <td>${escapeHtml(t.description)}</td>
          <td>${escapeHtml(t.paymentMethod)}</td>
          <td style="font-weight:bold; font-family: monospace; color: ${t.ioType.includes('وارد') ? '#10b981' : '#ef4444'}; text-align:left;">
            ${t.ioType.includes('وارد') ? '+' : '-'}${t.amount.toLocaleString('ar-EG')} ج.م
          </td>
        </tr>
      `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>ميزانية السحوبات والميزانية المالية للمكتب</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML('كشف التدقيق المالي وميزانية السحوبات والإيرادات التشغيلية لمكتب المحاماة', office)}
        
        <h3 class="section-title">أولاً: قائمة تدفق الإيرادات والموازنة التشغيلية الكبرى</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">إجمالي المقبوضات ودفوع الأتعاب</span>
            <span class="info-value" style="color: #10b981;">+${totalIncomes.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div class="info-card">
            <span class="info-label">إجمالي النفقات ومصاريف الدعاوى ومصاريف التشغيل</span>
            <span class="info-value" style="color: #ef4444;">-${totalExpenses.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div class="info-card span-2" style="background:#f0edf6; border:1px solid #c084fc;">
            <span class="info-label" style="color:#7e22ce font-weight:900;">الصافي المتبقي من الميدان التشغيلي (صافي الربح)</span>
            <span class="info-value" style="color: #1a2333; font-size:14pt;">${(totalIncomes - totalExpenses).toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>

        <h3 class="section-title">ثانياً: إحصائيات نوعية المدفوعات والقيود المحاسبية</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">إجمالي عدد المعاملات والعمليات</span>
            <span class="info-value">${txList.length} حركة محاسبية</span>
          </div>
          <div class="info-card">
            <span class="info-label">المقبوضات والواردات المسجلة</span>
            <span class="info-value">${incomeCount} دفعة واردة</span>
          </div>
          <div class="info-card">
            <span class="info-label">السحوبات والمصاريف المودعة</span>
            <span class="info-value">${expenseCount} حركة صادر</span>
          </div>
        </div>

        <h3 class="section-title">ثالثاً: دفتر الأستاذ والميزانية وقيد السجلات المالي بالتاريخ</h3>
        <table>
          <thead>
            <tr>
              <th style="width:5%">م</th>
              <th style="width:12%">التاريخ</th>
              <th style="width:13%">التصنيف المحاسبي</th>
              <th style="width:20%">اسم الطرف المالي</th>
              <th style="width:23%">البيان والشرح</th>
              <th style="width:12%">طريقة السجل</th>
              <th style="width:15%; text-align:left;">المبلغ بالفئات ج.م</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint('ميزانية الحسابات الكبرى', html);
}

export function printSingleDocument(doc: LawDocument, office: OfficeProfile) {
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>طباعة مستند: ${escapeHtml(doc.name)}</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML(`مستند رسمي مؤرشف: ${doc.name}`, office)}
        
        <h3 class="section-title">أولاً: بطاقة وبيانات المستند الفنية</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">اسم وعنوان المستند</span>
            <span class="info-value">${escapeHtml(doc.name)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">تصنيف المستند</span>
            <span class="info-value"><span class="badge badge-primary">${escapeHtml(doc.type)}</span></span>
          </div>
          <div class="info-card">
            <span class="info-label">اسم الملف الإلكتروني</span>
            <span class="info-value font-mono">${escapeHtml(doc.fileName)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">حجم الملف الرقمي</span>
            <span class="info-value font-mono">${escapeHtml(doc.fileSize)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">تاريخ الأرشفة والرفع</span>
            <span class="info-value font-mono">${escapeHtml(doc.uploadedAt)}</span>
          </div>
          ${doc.caseNumber ? `
          <div class="info-card">
            <span class="info-label">الربط بملف القضية</span>
            <span class="info-value">قضية رقم ${escapeHtml(doc.caseNumber)}</span>
          </div>` : ''}
          ${doc.clientName ? `
          <div class="info-card">
            <span class="info-label">اسم الموكل المقترن</span>
            <span class="info-value">${escapeHtml(doc.clientName)}</span>
          </div>` : ''}
          ${doc.bailiffPaperNumber ? `
          <div class="info-card">
            <span class="info-label">ورقة المحضرين المقترنة</span>
            <span class="info-value">رقم ${escapeHtml(doc.bailiffPaperNumber)}</span>
          </div>` : ''}
        </div>

        ${doc.notes ? `
        <h3 class="section-title">ثانياً: ملاحظات وهوامش مستخرج الأرشفة</h3>
        <div class="info-card span-2" style="background:#fafafb; border:1px solid #e2e8f0; font-size:10pt;">
          <span class="info-label">هوامش التدقيق:</span>
          <p style="margin:4px 0 0 0; line-height:1.6; white-space:pre-wrap;">${escapeHtml(doc.notes)}</p>
        </div>` : ''}

        ${doc.dataUrl ? `
        <h3 class="section-title">ثالثاً: صورة المستند الممسوح ضوئياً</h3>
        <div class="info-card span-2" style="text-align:center; padding:10px; background:#f8fafc; border:1px solid #d1d5db;">
          <img src="${escapeHtml(doc.dataUrl)}" alt="${escapeHtml(doc.name)}" style="max-width:100%; max-height:800px; object-fit:contain; border:1px solid #e2e8f0; border-radius:4px;" />
        </div>` : ''}

        <h3 class="section-title">${doc.dataUrl ? 'رابعاً' : 'ثالثاً'}: النص القانوني والمستخرج الرقمي (OCR)</h3>
        <div class="info-card span-2" style="background:#fffbeb; border:1px solid #fde68a; min-height: 250px; font-family:'Amiri', serif; line-height:1.8; white-space:pre-wrap; padding: 15px; font-size:12pt; text-align: justify;">
          <span class="info-label" style="color:#b45309; font-weight:700; font-family:'Tajawal', sans-serif;">مضمون ومحتوى المستند المقروء:</span>
          ${doc.scannedTextByAI ? escapeHtml(doc.scannedTextByAI) : 'لا يوجد مضمون نصي مؤرشف لهذ المستند.'}
        </div>

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;

  triggerIframePrint(`مستند ${doc.name}`, html);
}

export function printEnvelopeCover(paper: BailiffPaper, office: OfficeProfile, qrSvg?: string) {
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const logoHtml = office.logoDataUrl
    ? `<img class="env-logo" src="${escapeHtml(office.logoDataUrl)}" alt="شعار المكتب" />`
    : `<div class="env-logo-placeholder">⚖️</div>`;

  const stampHtml = office.officeStampImage
    ? `<img class="env-stamp-image" src="${escapeHtml(office.officeStampImage)}" alt="خاتم المكتب" />`
    : `<div class="env-stamp-placeholder">ختم<br/>المكتب</div>`;

  const qrHtml = qrSvg
    ? qrSvg
    : `<div style="width:110px;height:110px;border:1px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;background:#f8fafc;margin:0 auto;">بدون QR</div>`;

  const typeLabel = paper.envelopeType || 'إعلان قضائي';
  const opponentAddr = paper.opponentAddress || 'لم يحدد';
  const opponentName = paper.opponentName || 'لم يحدد';
  const deliveryMethod = paper.deliveryMethod || 'محضرين';

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>ظرف إعلان: ${escapeHtml(paper.title)}</title>
      ${envelopePrintCSS}
    </head>
    <body>
      <div class="envelope-page">

        <!-- Header -->
        <div class="env-header">
          ${logoHtml}
          <div class="env-office-info">
            <div class="env-office-name">${escapeHtml(office.officeName)}</div>
            <div class="env-office-details">
              ${escapeHtml(office.address)} • ت: ${escapeHtml(office.phone)} • ${escapeHtml(office.email)}<br/>
              قيد نقابة: ${escapeHtml(office.barId)} • ضريبة: ${escapeHtml(office.taxId)}
            </div>
          </div>
        </div>

        <!-- Type Badge -->
        <div class="env-type-badge">${escapeHtml(typeLabel)}</div>

        <!-- Opponent Address -->
        <div class="env-address-box">
          <div class="env-address-label">إلى السيد/</div>
          <div class="env-address-text">${escapeHtml(opponentName)}</div>
          <div class="env-address-label" style="margin-top:8px;">عنوان التسليم:</div>
          <div class="env-address-text" style="font-weight:500;">${escapeHtml(opponentAddr)}</div>
        </div>

        <!-- Info Table -->
        <table class="env-info-table">
          <tr>
            <td>رقم الإعلان / المحضر</td>
            <td>${escapeHtml(paper.paperNumber)}</td>
          </tr>
          ${paper.caseNumber ? `<tr><td>رقم القضية</td><td>${escapeHtml(paper.caseNumber)}</td></tr>` : ''}
          <tr>
            <td>المحكمة</td>
            <td>${escapeHtml(paper.courtName)} — ${escapeHtml(paper.courtLocation)}</td>
          </tr>
          <tr>
            <td>طريقة التسليم</td>
            <td>${escapeHtml(deliveryMethod)}</td>
          </tr>
          <tr>
            <td>تاريخ الإعلان</td>
            <td>${currentDate}</td>
          </tr>
          <tr>
            <td>الموضوع</td>
            <td>${escapeHtml(paper.title)}</td>
          </tr>
        </table>

        <!-- Footer: QR + Stamp -->
        <div class="env-footer">
          <div class="env-qr-area">
            ${qrHtml}
            <div class="env-qr-label">مسح للتحقق من الإعلان</div>
          </div>
          <div class="env-stamp-area">
            ${stampHtml}
            <div class="env-signature-line">خاتم وتوقيع المحضر المختص</div>
          </div>
        </div>

      </div>
    </body>
    </html>
  `;

  triggerIframePrint(`ظرف إعلان: ${paper.title}`, html);
}

/**
 * طباعة QR كود خاص بملف الموكل
 * @param qrSvg - نص SVG لرمز QR (يتم توليده من QRCodeSVG)
 */
export function printClientFileQR(cl: Client, office: OfficeProfile, qrSvg?: string) {
  const fileInfo = `${cl.fileNumber ? `الملف رقم: ${cl.fileNumber}` : ''}`;
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>QR - ${escapeHtml(cl.name)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: #f8fafc; }
          .qr-page { max-width: 400px; width: 100%; text-align: center; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 30px; }
          .qr-page h1 { font-size: 16pt; color: #1e293b; margin-bottom: 4px; }
          .qr-page .sub { font-size: 10pt; color: #64748b; margin-bottom: 20px; }
          .qr-box { border: 3px solid #1e293b; border-radius: 12px; padding: 16px; display: inline-block; background: white; }
          .qr-box svg { display: block; }
          .qr-page .info { margin-top: 20px; font-size: 9pt; color: #475569; }
          .qr-page .info span { display: block; margin: 3px 0; }
          .qr-page .footer { margin-top: 24px; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { background: white; padding: 0; }
            .qr-page { box-shadow: none; border: none; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="qr-page">
          <h1>${escapeHtml(office.officeName)}</h1>
          <p class="sub">${fileInfo}رمز الاستجابة السريع لملف الموكل</p>
          <div class="qr-box">
            ${qrSvg || '<p style="color:#94a3b8;font-size:12pt;">QR غير متاح</p>'}
          </div>
          <div class="info">
            <span><strong>الاسم:</strong> ${escapeHtml(cl.name)}</span>
            ${cl.fileNumber ? `<span><strong>رقم الملف:</strong> ${escapeHtml(cl.fileNumber)}</span>` : ''}
            <span><strong>الهاتف:</strong> ${escapeHtml(cl.phone)}</span>
          </div>
          <div class="footer">
            تم إنشاء هذا الرمز بواسطة منصة المحامي الرقمي
          </div>
        </div>
      </body>
    </html>
  `;
  triggerIframePrint(`QR - ${cl.name}`, html);
}

/**
 * طباعة QR كود خاص بملف القضية
 * @param qrSvg - نص SVG لرمز QR (يتم توليده من QRCodeSVG)
 */
export function buildCaseFileQRHtml(c: any, office: OfficeProfile, qrSvg?: string): string {
  const fileInfo = `${c.fileNumber ? `الملف رقم: ${c.fileNumber}` : ''}`;
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>QR - ${escapeHtml(c.caseNumber)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: #f8fafc; }
          .qr-page { max-width: 400px; width: 100%; text-align: center; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 30px; }
          .qr-page h1 { font-size: 16pt; color: #1e293b; margin-bottom: 4px; }
          .qr-page .sub { font-size: 10pt; color: #64748b; margin-bottom: 20px; }
          .qr-box { border: 3px solid #1e293b; border-radius: 12px; padding: 16px; display: inline-block; background: white; }
          .qr-box svg { display: block; }
          .qr-page .info { margin-top: 20px; font-size: 9pt; color: #475569; }
          .qr-page .info span { display: block; margin: 3px 0; }
          .qr-page .footer { margin-top: 24px; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { background: white; padding: 0; }
            .qr-page { box-shadow: none; border: none; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="qr-page">
          <h1>${escapeHtml(office.officeName)}</h1>
          <p class="sub">${fileInfo}رمز الاستجابة السريع لملف القضية</p>
          <div class="qr-box">
            ${qrSvg || '<p style="color:#94a3b8;font-size:12pt;">QR غير متاح</p>'}
          </div>
          <div class="info">
            <span><strong>رقم القضية:</strong> ${escapeHtml(c.caseNumber)}</span>
            ${c.fileNumber ? `<span><strong>رقم الملف:</strong> ${escapeHtml(c.fileNumber)}</span>` : ''}
            <span><strong>الموكل:</strong> ${escapeHtml(c.clientName)}</span>
            <span><strong>المحكمة:</strong> ${escapeHtml(c.court)}</span>
          </div>
          <div class="footer">
            تم إنشاء هذا الرمز بواسطة منصة المحامي الرقمي
          </div>
        </div>
      </body>
    </html>
  `;
}

export function printCaseFileQR(c: any, office: OfficeProfile, qrSvg?: string) {
  const html = buildCaseFileQRHtml(c, office, qrSvg);
  triggerIframePrint(`QR - ${c.caseNumber}`, html);
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    'جاري': 'badge-warning', 'مرفوعة': 'badge-warning', 'منظورة': 'badge-warning',
    'محكومة': 'badge-success', 'مقيدة': 'badge-info', 'منتهية': 'badge-success',
    'مؤجلة': 'badge-danger', 'مستأنفة': 'badge-warning'
  };
  return map[status] || 'badge-info';
};

export function printSingleOpponent(opponent: Opponent, cases: Case[], office: OfficeProfile) {
  const relatedCases = cases.filter(c => c.opponentId === opponent.id && !c.isArchived);
  const casesRows = relatedCases.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:15px;">لا توجد قضايا مرتبطة بهذا الخصم</td></tr>`
    : relatedCases.map(c => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:700;">${escapeHtml(c.caseNumber)}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${escapeHtml(c.court)}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${escapeHtml(c.claimSubject)}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;">${escapeHtml(c.clientName)}</td>
        <td style="padding:6px 10px;border:1px solid #e2e8f0;"><span class="${getStatusClass(c.status)}">${escapeHtml(c.status)}</span></td>
      </tr>
    `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>الخصم: ${escapeHtml(opponent.fullName)}</title>
        ${printStyles}
      </head>
      <body>
        ${getLegalHeaderHTML(`سجل الخصم القانوني: ${opponent.fullName}`, office)}

        <h3 class="section-title">أولاً: بيانات الخصم</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">الاسم الكامل</span>
            <span class="info-value">${escapeHtml(opponent.fullName)}</span>
          </div>
          <div class="info-card">
            <span class="info-label">رقم الهاتف</span>
            <span class="info-value font-mono">${opponent.phone ? escapeHtml(opponent.phone) : '—'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">الرقم القومي</span>
            <span class="info-value font-mono">${opponent.nationalId ? escapeHtml(opponent.nationalId) : '—'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">البريد الإلكتروني</span>
            <span class="info-value">${opponent.email ? escapeHtml(opponent.email) : '—'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">العنوان</span>
            <span class="info-value">${opponent.address ? escapeHtml(opponent.address) : '—'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">تاريخ التسجيل</span>
            <span class="info-value">${escapeHtml(opponent.createdAt.split('T')[0])}</span>
          </div>
        </div>

        ${opponent.opponentLawyer ? `
        <h3 class="section-title">ثانياً: محامي الخصم</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">اسم المحامي</span>
            <span class="info-value">${escapeHtml(opponent.opponentLawyer)}</span>
          </div>
          ${opponent.opponentLawyerPhone ? `
          <div class="info-card">
            <span class="info-label">هاتف المحامي</span>
            <span class="info-value font-mono">${escapeHtml(opponent.opponentLawyerPhone)}</span>
          </div>` : ''}
          ${opponent.opponentLawyerOffice ? `
          <div class="info-card">
            <span class="info-label">مكتب المحاماة</span>
            <span class="info-value">${escapeHtml(opponent.opponentLawyerOffice)}</span>
          </div>` : ''}
        </div>` : ''}

        ${opponent.notes ? `
        <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <div style="font-size:9pt;color:#64748b;font-weight:700;margin-bottom:4px;">ملاحظات:</div>
          <div style="font-size:10pt;color:#334155;">${escapeHtml(opponent.notes)}</div>
        </div>` : ''}

        ${relatedCases.length > 0 ? `
        <h3 class="section-title" style="margin-top:24px;">ثالثاً: القضايا المرتبطة بالخصم</h3>
        <div style="margin-top:8px;">
          <table style="width:100%;border-collapse:collapse;font-size:9pt;">
            <thead>
              <tr style="background:#1e293b;color:white;">
                <th style="padding:8px 10px;text-align:right;">رقم القضية</th>
                <th style="padding:8px 10px;text-align:right;">المحكمة</th>
                <th style="padding:8px 10px;text-align:right;">الموضوع</th>
                <th style="padding:8px 10px;text-align:right;">الموكل</th>
                <th style="padding:8px 10px;text-align:right;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${casesRows}
            </tbody>
          </table>
        </div>` : ''}

        ${getLegalFooterHTML()}
      </body>
    </html>
  `;
  showPrintJob(`سجل الخصم: ${opponent.fullName}`, html);
}

/**
 * طباعة تقرير مستندي رسمي لملف تنفيذ حكم قضائي
 */
export function printSingleExecution(e: Execution, office: OfficeProfile) {
  const typeLabel = ({
    primary_judgment: 'حكم ابتدائي',
    appeal: 'استئناف',
    cassation: 'نقض',
    executive_order: 'أمر تنفيذية',
    enforcement: 'تنفيذ جبري',
    payment_order: 'أمر أداء',
  } as Record<string, string>)[e.type] || e.type;

  const statusLabel = ({
    pending: 'جاري التنفيذ',
    suspended: 'متوقف',
    challenged: 'مطعون فيه',
    executed: 'منفّذ',
    completed: 'منتهي',
    cancelled: 'ملغي',
  } as Record<string, string>)[e.status] || e.status;

  const stepsRows = (e.steps || []).map((s, idx) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px; text-align: center; font-weight: bold;">${idx + 1}</td>
      <td style="padding: 8px;">${escapeHtml(s.title || '—')}</td>
      <td style="padding: 8px; text-align: center;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 8.5pt; font-weight: bold; background: ${s.status === 'completed' ? '#dcfce7; color: #15803d;' : s.status === 'cancelled' ? '#fee2e2; color: #b91c1c;' : '#f1f5f9; color: #475569;'}">
          ${s.status === 'completed' ? 'مكتمل (تم)' : s.status === 'cancelled' ? 'ملغي' : 'لم يبدأ'}
        </span>
      </td>
      <td style="padding: 8px; text-align: center;">${s.dueDate ? escapeHtml(s.dueDate.slice(0, 10)) : '—'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>ملف تنفيذ - ${escapeHtml(e.caseNumber || 'بدون رقم')}</title>
      ${printStyles}
    </head>
    <body>
        ${getLegalHeaderHTML(`ملف متابعة تنفيذ حكم قضائي — ${escapeHtml(typeLabel)}`, office)}

        <div class="badge-header">
          <span class="badge" style="background:#e0e7ff; color:#3730a3;">نوع التنفيذ: ${escapeHtml(typeLabel)}</span>
          <span class="badge" style="background:#f1f5f9; color:#334155;">الحالة: ${escapeHtml(statusLabel)}</span>
          ${e.enforceabilityStatus ? `<span class="badge" style="background:#dcfce7; color:#166534;">نفاذ: ${escapeHtml(e.enforceabilityStatus)}</span>` : ''}
        </div>

        <h3 class="section-title">أولاً: بيانات القضية والموكل</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">رقم القضية</span>
            <span class="info-value font-mono font-bold">${escapeHtml(e.caseNumber || '—')}</span>
          </div>
          <div class="info-card">
            <span class="info-label">اسم الموكل</span>
            <span class="info-value font-bold">${escapeHtml(e.clientName || '—')}</span>
          </div>
          <div class="info-card">
            <span class="info-label">المحكمة</span>
            <span class="info-value">${escapeHtml(e.court || '—')}</span>
          </div>
          <div class="info-card">
            <span class="info-label">الدائرة</span>
            <span class="info-value">${escapeHtml(e.circuit || '—')}</span>
          </div>
          <div class="info-card">
            <span class="info-label">رقم الحكم</span>
            <span class="info-value font-mono">${escapeHtml(e.judgmentNumber || '—')}</span>
          </div>
          <div class="info-card">
            <span class="info-label">اسم القاضي</span>
            <span class="info-value">${escapeHtml(e.judgeName || '—')}</span>
          </div>
        </div>

        <h3 class="section-title" style="margin-top:20px;">ثانياً: التواريخ والمبالغ</h3>
        <div class="info-grid">
          <div class="info-card">
            <span class="info-label">تاريخ الحكم</span>
            <span class="info-value">${e.judgmentDate ? escapeHtml(e.judgmentDate.slice(0,10)) : '—'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">موعد التنفيذ</span>
            <span class="info-value font-bold" style="color:#4338ca;">${e.executionDeadline ? escapeHtml(e.executionDeadline.slice(0,10)) : '—'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">موعد الطعن</span>
            <span class="info-value">${e.appealDeadline ? escapeHtml(e.appealDeadline.slice(0,10)) : '—'}</span>
          </div>
          <div class="info-card" style="background:#ecfdf5; border-color:#a7f3d0;">
            <span class="info-label" style="color:#065f46;">المبلغ المحكوم به</span>
            <span class="info-value font-mono font-bold" style="color:#047857; font-size:12pt;">
              ${e.amount ? e.amount.toLocaleString('ar-EG') + ' ج.م' : '—'}
            </span>
          </div>
          <div class="info-card">
            <span class="info-label">مصاريف التنفيذ</span>
            <span class="info-value font-mono">${e.fees ? e.fees.toLocaleString('ar-EG') + ' ج.م' : '—'}</span>
          </div>
          <div class="info-card">
            <span class="info-label">الإجمالي</span>
            <span class="info-value font-mono font-bold">${e.totalAmount ? e.totalAmount.toLocaleString('ar-EG') + ' ج.م' : '—'}</span>
          </div>
        </div>

        ${e.judgmentText ? `
        <h3 class="section-title" style="margin-top:20px;">ثالثاً: منطوق الحكم / القرار القضائي</h3>
        <div style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 10pt; line-height: 1.8; color: #0f172a;">
          ${escapeHtml(e.judgmentText)}
        </div>` : ''}

        ${(e.steps || []).length > 0 ? `
        <h3 class="section-title" style="margin-top:20px;">رابعاً: جدول خطوات وإجراءات التنفيذ</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th style="padding: 8px; width: 40px; text-align: center;">#</th>
              <th style="padding: 8px; text-align: right;">عنوان الإجراء / الخطوة</th>
              <th style="padding: 8px; width: 110px; text-align: center;">الحالة</th>
              <th style="padding: 8px; width: 110px; text-align: center;">تاريخ الاستحقاق</th>
            </tr>
          </thead>
          <tbody>
            ${stepsRows}
          </tbody>
        </table>` : ''}

        ${e.notes ? `
        <div style="margin-top:16px; padding:12px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; font-size:9.5pt; color:#92400e;">
          <strong>ملاحظات:</strong> ${escapeHtml(e.notes)}
        </div>` : ''}

        ${getLegalFooterHTML()}
    </body>
    </html>
  `;

  showPrintJob(`ملف تنفيذ - ${e.caseNumber || 'تنفيذ'}`, html);
}

/**
 * طباعة QR كود لملف التنفيذ
 */
export function printExecutionFileQR(e: Execution, office: OfficeProfile, qrSvg?: string) {
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>QR تنفيذ - ${escapeHtml(e.caseNumber || '')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: #f8fafc; }
          .qr-page { max-width: 400px; width: 100%; text-align: center; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 30px; }
          .qr-page h1 { font-size: 16pt; color: #1e293b; margin-bottom: 4px; }
          .qr-page .sub { font-size: 10pt; color: #64748b; margin-bottom: 20px; }
          .qr-box { border: 3px solid #4338ca; border-radius: 12px; padding: 16px; display: inline-block; background: white; }
          .qr-box svg { display: block; }
          .qr-page .info { margin-top: 20px; font-size: 9pt; color: #475569; }
          .qr-page .info span { display: block; margin: 3px 0; }
          .qr-page .footer { margin-top: 24px; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { background: white; padding: 0; }
            .qr-page { box-shadow: none; border: none; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="qr-page">
          <h1>${escapeHtml(office.officeName)}</h1>
          <p class="sub">رمز الاستجابة السريع لملف التنفيذ القضائي</p>
          <div class="qr-box">
            ${qrSvg || '<p style="color:#94a3b8;font-size:12pt;">QR غير متاح</p>'}
          </div>
          <div class="info">
            <span><strong>رقم القضية:</strong> ${escapeHtml(e.caseNumber || '—')}</span>
            <span><strong>الموكل:</strong> ${escapeHtml(e.clientName || '—')}</span>
            <span><strong>المحكمة:</strong> ${escapeHtml(e.court || '—')}</span>
          </div>
          <div class="footer">
            تم إنشاء هذا الرمز بواسطة منصة المحامي الرقمية
          </div>
        </div>
      </body>
    </html>
  `;
  showPrintJob(`QR تنفيذ - ${e.caseNumber || ''}`, html);
}
