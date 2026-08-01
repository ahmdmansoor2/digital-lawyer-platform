/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Case, Client, Session, Transaction, LawTask, OfficeProfile, Execution } from '../types';
import { escapeHtml } from './security';

/**
 * Wraps clean HTML body content into a document formatted specifically to open as an RTL Word document.
 * We include standard MS Office XML namespace schema to declare direction and document zoom.
 */
/**
 * Helper: يحوّل HTML من TipTap لتنسيق Word مع styles كاملة.
 * يتعامل مع:
 *  - <h1>, <h2>, <h3>: العناوين
 *  - <strong>, <em>, <u>: التنسيق
 *  - <ul>, <ol>: القوائم
 *  - <blockquote>: الاقتباسات
 *  - <table>: الجداول
 *  - <a>: الروابط
 *  - <mark>: التمييز
 */
function renderRichTextToWord(html: string | undefined | null): string {
  if (!html) return '<p style="font-size: 11pt; color: #64748b; font-style: italic;">لم يتم إضافة محتوى</p>';

  // If it's plain text (no HTML tags), wrap in paragraph
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    const safeText = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    return `<p style="font-size:11pt; line-height: 1.8; margin: 0;">${safeText}</p>`;
  }

  // Convert headings
  let result = html
    .replace(/<h1[^>]*>/g, '<h1 style="font-size: 16pt; font-weight: 900; color: #0f172a; margin: 12pt 0 6pt 0;">')
    .replace(/<\/h1>/g, '</h1>')
    .replace(/<h2[^>]*>/g, '<h2 style="font-size: 14pt; font-weight: 900; color: #4338ca; margin: 10pt 0 5pt 0;">')
    .replace(/<\/h2>/g, '</h2>')
    .replace(/<h3[^>]*>/g, '<h3 style="font-size: 12pt; font-weight: 900; color: #475569; margin: 8pt 0 4pt 0;">')
    .replace(/<\/h3>/g, '</h3>')
    // Paragraphs
    .replace(/<p[^>]*>/g, '<p style="font-size: 11pt; line-height: 1.8; margin: 4pt 0;">')
    // Lists
    .replace(/<ul[^>]*>/g, '<ul style="margin: 6pt 0; padding-right: 18pt;">')
    .replace(/<ol[^>]*>/g, '<ol style="margin: 6pt 0; padding-right: 18pt;">')
    .replace(/<li[^>]*>/g, '<li style="font-size: 11pt; margin: 2pt 0;">')
    // Blockquote
    .replace(/<blockquote[^>]*>/g, '<blockquote style="border-right: 3px solid #6366f1; padding: 6pt 10pt; margin: 6pt 0; background: #f8fafc; font-style: italic; color: #475569;">')
    .replace(/<\/blockquote>/g, '</blockquote>')
    // Strong, em, u, s
    .replace(/<strong>/g, '<strong style="color: #0f172a;">')
    .replace(/<em>/g, '<em>')
    .replace(/<u>/g, '<u>')
    .replace(/<s>/g, '<s>')
    // Tables (TipTap wraps them in <table>)
    .replace(/<table[^>]*>/g, '<table style="border-collapse: collapse; width: 100%; margin: 8pt 0;">')
    .replace(/<th[^>]*>/g, '<th style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4pt 8pt; font-weight: 900; text-align: right;">')
    .replace(/<td[^>]*>/g, '<td style="border: 1px solid #cbd5e1; padding: 4pt 8pt; vertical-align: top;">')
    // Mark
    .replace(/<mark>/g, '<mark style="background: #fef08a; padding: 0 2px;">')
    .replace(/<\/mark>/g, '</mark>')
    // Links
    .replace(/<a /g, '<a target="_blank" style="color: #4338ca; text-decoration: underline;" ');

  return result;
}

function wrapInWordTemplate(title: string, htmlContent: string, office?: OfficeProfile): string {
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const headerHtml = office ? `
    <div class="legal-header" style="margin-bottom: 25px; border-bottom: 3px double #1e293b; padding-bottom: 12px; direction: rtl;">
      <table style="width: 100%; border: none; margin-bottom: 15px;">
        <tr style="border: none;">
          <td style="border: none; width: 70%; text-align: right; vertical-align: middle; padding: 0;">
            <h1 style="font-family: 'Arial', 'Tajawal', sans-serif; font-size: 16pt; color: #1e293b; margin: 0 0 5px 0; font-weight: bold;">
              ${escapeHtml(office.officeName)}
            </h1>
            <p style="font-family: 'Arial', 'Tajawal', sans-serif; font-size: 11pt; color: #334155; margin: 0 0 3px 0; font-weight: bold;">
              المستشار القانوني: ${escapeHtml(office.managingPartner)}
            </p>
            <p style="font-family: 'Arial', sans-serif; font-size: 9.5pt; color: #64748b; margin: 0;">
              رقم القيد بالنقابة: ${escapeHtml(office.barId)} | بطاقة ضريبية رقم: ${escapeHtml(office.taxId)}
            </p>
          </td>
          <td style="border: none; width: 30%; text-align: left; vertical-align: middle; padding: 0;">
            <div style="font-family: 'Arial', 'Tajawal', sans-serif; font-size: 9pt; color: #475569; background: #f1f5f9; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: right; display: inline-block;">
              <p style="margin: 2px 0;"><strong>التاريخ:</strong> ${currentDate}</p>
              <p style="margin: 2px 0;"><strong>الحالة:</strong> معتمد رسمي</p>
              <p style="margin: 2px 0;"><strong>المنصة:</strong> المحامي الذكي</p>
            </div>
          </td>
        </tr>
      </table>
      <div style="text-align: center; margin: 15px 0;">
        <h2 style="font-family: 'Arial', 'Tajawal', sans-serif; font-size: 14pt; color: #1e293b; background: #f8fafc; padding: 8px 15px; border: 1px solid #cbd5e1; border-radius: 6px; display: inline-block; margin: 0;">
          ${escapeHtml(title)}
        </h2>
      </div>
    </div>
  ` : `<h2 style="text-align: center; color: #1e293b; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px;">${escapeHtml(title)}</h2>`;

  const footerHtml = `
    <div class="legal-footer" style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: center; font-family: 'Arial', sans-serif; font-size: 8.5pt; color: #64748b; direction: rtl;">
      <table style="width: 100%; border: none; margin-top: 20px; margin-bottom: 20px;">
        <tr style="border: none;">
          <td style="border: none; text-align: center; width: 33%;">
            <p style="font-weight: bold; color: #475569; margin-bottom: 30px;">توقيع المستشار المسؤول</p>
            <div style="border-top: 1px dashed #94a3b8; width: 80%; margin: 0 auto;"></div>
          </td>
          <td style="border: none; text-align: center; width: 33%;">
            <p style="font-weight: bold; color: #475569; margin-bottom: 15px;">خاتم المكتب الرسمي</p>
            <div style="width: 80px; height: 80px; border: 2px dashed #94a3b8; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #475569; font-size: 8.5pt;">
              معتمد
            </div>
          </td>
          <td style="border: none; text-align: center; width: 33%;">
            <p style="font-weight: bold; color: #475569; margin-bottom: 30px;">توقيع المستخرج الإداري</p>
            <div style="border-top: 1px dashed #94a3b8; width: 80%; margin: 0 auto;"></div>
          </td>
        </tr>
      </table>
      <p style="margin: 5px 0;">تم تصدير هذا الملف إلكترونياً وصيانته بواسطة "نظام المحامي الذكي لإدارة المكاتب القانونية".</p>
      <p style="margin: 2px 0;">حقوق الطبع محفوظة © نقابة المحامين لجمهورية مصر العربية</p>
    </div>
  `;

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:w="urn:schemas-microsoft-com:office:word" 
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <!--[if gte mso 9]>
        <xml>
          <o:DocumentProperties>
            <o:Author>منصة المحامي الذكي</o:Author>
            <o:Title>${escapeHtml(title)}</o:Title>
          </o:DocumentProperties>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
          
          body {
            font-family: 'Tajawal', 'Arial', 'Sakkal Majalla', sans-serif;
            direction: rtl;
            text-align: right;
            margin: 20mm 20mm 20mm 20mm;
            font-size: 11pt;
            line-height: 1.6;
            color: #1e293b;
            background-color: #ffffff;
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Tajawal', 'Arial', sans-serif;
            color: #1e293b;
            margin-top: 14pt;
            margin-bottom: 6pt;
          }
          
          h2 { font-size: 13pt; font-weight: bold; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; }
          h3 { font-size: 11.5pt; font-weight: bold; color: #1e293b; margin-top: 10pt; }
          
          p { margin: 0 0 8px 0; }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            direction: rtl;
          }
          
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: right;
            font-size: 10pt;
            vertical-align: middle;
          }
          
          th {
            background-color: #1e293b;
            color: #ffffff;
            font-weight: bold;
          }
          
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          
          .grid-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .grid-table td {
            border: 1px solid #cbd5e1;
            background-color: #fcfdfd;
            padding: 10px 12px;
            width: 50%;
            vertical-align: top;
          }
          
          .label-span {
            font-weight: bold;
            color: #64748b;
            font-size: 9pt;
            display: block;
            margin-bottom: 4px;
          }
          
          .value-span {
            font-weight: bold;
            color: #0f172a;
            font-size: 11pt;
          }
          
          .badge {
            background-color: #e2e8f0;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: 8.5pt;
            font-weight: bold;
            display: inline-block;
          }
          
          .badge-primary { background-color: #e2e8f0; color: #1e293b; }
          .badge-success { background-color: #e2e8f0; color: #1e293b; }
          .badge-warning { background-color: #e2e8f0; color: #1e293b; }
          .badge-danger { background-color: #e2e8f0; color: #1e293b; }
          .badge-secondary { background-color: #f1f5f9; color: #475569; }
        </style>
      </head>
      <body>
        ${headerHtml}
        ${htmlContent}
        ${footerHtml}
      </body>
    </html>
  `;
}

/**
 * Universal HTML content exporter to Word file (.doc)
 */
export function exportHtmlToWord(title: string, htmlBody: string, fileName: string, office?: OfficeProfile) {
  const fullDocument = wrapInWordTemplate(title, htmlBody, office);
  // Prepend UTF-8 BOM so MS Word imports Arabic Arabic characters perfectly
  const blob = new Blob(['\ufeff', fullDocument], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==========================================
// 1. SINGLE RECORD EXPORTERS
// ==========================================

export function exportCaseToWord(c: Case, sessions: Session[], transactions: Transaction[], office: OfficeProfile) {
  const caseSessions = sessions.filter(s => s.caseId === c.id);
  const caseTransactions = transactions.filter(t => t.caseId === c.id);

  const totalPaid = caseTransactions
    .filter(t => t.ioType.includes('وارد') && t.type === 'أتعاب')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = caseTransactions
    .filter(t => t.ioType.includes('صادر') || t.type === 'مصروفات دعوى')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const remaining = Math.max(0, c.totalFees - totalPaid);

  const sessionsRows = caseSessions.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#64748b;">لا يوجد جلسات مسجلة بملف القضية حالياً</td></tr>`
    : caseSessions.map(s => `
        <tr>
          <td style="font-weight:bold;">${escapeHtml(s.date)}</td>
          <td>${escapeHtml(s.objective)}</td>
          <td>${s.decision ? escapeHtml(s.decision) : 'بانتظار تدوين قرار الجلسة'}</td>
          <td>${s.judgeName ? escapeHtml(s.judgeName) : '-'}</td>
          <td>${escapeHtml(s.status)}</td>
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

  const bodyContent = `
    <h2>أولاً: البيانات الأساسية لملف القضية</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">الموكل صاحب الدعوى</span>
          <span class="value-span">${escapeHtml(c.clientName)}</span>
        </td>
        <td>
          <span class="label-span">صفة الموكل في الخصومة</span>
          <span class="value-span">${escapeHtml(c.clientRole)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">المحكمة المختصة</span>
          <span class="value-span">${escapeHtml(c.court)}</span>
        </td>
        <td>
          <span class="label-span">الدائرة الماثل أمامها</span>
          <span class="value-span">${escapeHtml(c.circuit)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">الخصم المقابل</span>
          <span class="value-span" style="color:#dc2626;">${escapeHtml(c.opponentName)}</span>
        </td>
        <td>
          <span class="label-span">نوع النزاع القضائي</span>
          <span class="value-span">${escapeHtml(c.type)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">محامي الخصم</span>
          <span class="value-span">${c.opponentLawyer ? escapeHtml(c.opponentLawyer) : 'غير مسجل'}</span>
        </td>
        <td>
          <span class="label-span">درجة التقاضي الحالية</span>
          <span class="value-span">${escapeHtml(c.litigationLevel)}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <span class="label-span">موضوع الدعوى والمطالبة القانونية</span>
          ${renderRichTextToWord(c.claimSubject)}
        </td>
      </tr>
      ${c.notes ? `<tr>
        <td colspan="2">
          <span class="label-span">ملاحظات المكتب الإدارية</span>
          ${renderRichTextToWord(c.notes)}
        </td>
      </tr>` : ''}
    </table>

    <h2>ثانياً: جدول الجلسات وقرارات المحكمة</h2>
    <table>
      <thead>
          <tr style="background-color: #1e3a8a; color: white;">
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

    <h2>ثالثاً: الميزانية المالية لملف القضية</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">إجمالي الأتعاب المتفق عليها</span>
          <span class="value-span">${c.totalFees.toLocaleString('ar-EG')} ج.م</span>
        </td>
        <td>
          <span class="label-span">المسدد الفعلي من الموكل</span>
          <span class="value-span" style="color: #16a34a;">${totalPaid.toLocaleString('ar-EG')} ج.م</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">المتبقي المستحق ذمة الموكل</span>
          <span class="value-span" style="color: #dc2626;">${remaining.toLocaleString('ar-EG')} ج.م</span>
        </td>
        <td>
          <span class="label-span">رسوم ومصروفات قضائية مسددة</span>
          <span class="value-span">${totalExpenses.toLocaleString('ar-EG')} ج.م</span>
        </td>
      </tr>
    </table>

    <h2>رابعاً: حركة الحسابات المالية والتسويات بقيد الدعوى</h2>
    <table>
      <thead>
        <tr style="background-color: #1e3a8a; color: white;">
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
  `;

  exportHtmlToWord(`ملف تقييم قضية رقم ${c.caseNumber} لسنة ${c.year}`, bodyContent, `قضية_${c.caseNumber.replace(/\//g, '-')}`, office);
}

export function exportClientToWord(cl: Client, cases: Case[], office: OfficeProfile) {
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
          <td>${escapeHtml(c.status)}</td>
        </tr>
      `).join('');

  const bodyContent = `
    <h2>أولاً: بيانات هوية الموكل وتفاصيل الاتصال</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">اسم وعنوان الموكل بالكامل</span>
          <span class="value-span">${escapeHtml(cl.name)}</span>
        </td>
        <td>
          <span class="label-span">الرقم القومي المصري / السجل التجاري</span>
          <span class="value-span">${escapeHtml(cl.nationalId)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">رقم الهاتف الرسمي للتواصل</span>
          <span class="value-span">${escapeHtml(cl.phone)}</span>
        </td>
        <td>
          <span class="label-span">البريد الإلكتروني</span>
          <span class="value-span">${cl.email ? escapeHtml(cl.email) : 'لم يدون بريد الكتروني'}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <span class="label-span">محل الإقامة المختار والموطن المختار</span>
          <span class="value-span" style="font-weight: normal;">${escapeHtml(cl.address)}</span>
        </td>
      </tr>
      ${cl.notes ? `
      <tr>
        <td colspan="2">
          <span class="label-span">ملاحظات قانونية بملف الموكل</span>
          <p style="white-space: pre-wrap; font-size:10.5pt; margin:0;">${escapeHtml(cl.notes)}</p>
        </td>
      </tr>` : ''}
    </table>

    <h2>ثانياً: التوكيلات وسندات الوكالة القضائية المودعة</h2>
    <table>
      <thead>
        <tr style="background-color: #1e3a8a; color: white;">
          <th style="width:25%">رقم التوكيل</th>
          <th style="width:30%">مكتب التوثيق (الشهر العقاري)</th>
          <th style="width:25%">نوع التوكيل</th>
          <th style="width:20%">تاريخ التسجيل</th>
        </tr>
      </thead>
      <tbody>
        ${poasRows}
      </tbody>
    </table>

    <h2>ثالثاً: القضايا والملفات النشطة الموكلة للمكتب</h2>
    <table>
      <thead>
        <tr style="background-color: #1e3a8a; color: white;">
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
  `;

  exportHtmlToWord(`ملف الموكل القانوني: ${cl.name}`, bodyContent, `موكل_${cl.name.replace(/\s+/g, '_')}`, office);
}

export function exportSessionToWord(s: Session, c: Case | undefined, office: OfficeProfile) {
  const bodyContent = `
    <h2>أولاً: بيانات الخصومة والقضية الموصولة</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">رقم وعام الدعوى</span>
          <span class="value-span">قضية رقم ${escapeHtml(s.caseNumber)}</span>
        </td>
        <td>
          <span class="label-span">اسم الموكل الطرف</span>
          <span class="value-span">${escapeHtml(s.clientName)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">المحكمة الماثلة أمامها</span>
          <span class="value-span">${s.court ? escapeHtml(s.court) : 'غير محددة ببطاقة الجلسة'}</span>
        </td>
        <td>
          <span class="label-span">رقم وتصنيف الدائرة</span>
          <span class="value-span">${s.circuit ? escapeHtml(s.circuit) : 'غير محددة'}</span>
        </td>
      </tr>
      ${s.judgeName ? `
      <tr>
        <td>
          <span class="label-span">القاضي المختص بالجلسة</span>
          <span class="value-span">${escapeHtml(s.judgeName)}</span>
        </td>
        <td></td>
      </tr>` : ''}
      ${c ? `
      <tr>
        <td>
          <span class="label-span">صفة الموكل بالنزاع</span>
          <span class="value-span">${escapeHtml(c.clientRole)}</span>
        </td>
        <td>
          <span class="label-span">الخصم المقابل في الدعوى</span>
          <span class="value-span" style="color:#dc2626;">${escapeHtml(c.opponentName)}</span>
        </td>
      </tr>` : ''}
    </table>

    <h2>ثانياً: القرار المطلوب وموضوع الجلسة</h2>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
      <p style="font-weight: bold; color: #b45309; margin: 0 0 5px 0;">المطلوب لتهيئة الدعوى بالجلسة:</p>
      <p style="font-size: 11.5pt; font-weight: bold; color: #1e293b; margin: 0;">${escapeHtml(s.objective)}</p>
    </div>

    <h2>ثالثاً: وقائع الجلسة وما تم تدوينه وقرار عدالة المحكمة</h2>
    <div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 6px; min-height: 80px; margin-bottom: 20px;">
      <p style="font-weight: bold; color: #16a34a; margin: 0 0 8px 0;">سجل وقائع وقرار المحكمة المودع:</p>
      <p style="font-size: 12pt; font-weight: bold; color: #1e293b; margin: 0; line-height: 1.7;">
        ${s.decision ? escapeHtml(s.decision) : 'المحاكمة سارية / لم يدون قرار رسمي بعد لهذه الجلسة.'}
      </p>
    </div>

    ${s.notes ? `
    <h2>ملاحظات على الجلسة</h2>
    <div style="background:#fefce8; border:1px solid #fde047; padding:12px; border-radius:6px; margin-bottom:20px;">
      <p style="font-weight:bold; color:#b45309; margin:0 0 5px 0;">ملاحظات إضافية:</p>
      <p style="font-size:11.5pt; margin:0; line-height:1.7;">${escapeHtml(s.notes)}</p>
    </div>` : ''}

    <table class="grid-table" style="margin-top: 15px;">
      <tr>
        <td>
          <span class="label-span">حالة بطاقة الجلسة</span>
          <span class="value-span">${escapeHtml(s.status)}</span>
        </td>
        <td>
          <span class="label-span">تاريخ المتابعة بالجلسة</span>
          <span class="value-span">${escapeHtml(s.date)}</span>
        </td>
      </tr>
    </table>
  `;

  exportHtmlToWord(`محضر وكشف جلسة يوم ${s.date}`, bodyContent, `جلسة_${s.caseNumber.replace(/\//g, '-')}_تاريخ_${s.date}`, office);
}

export function exportTaskToWord(t: LawTask, c: Case | undefined, office: OfficeProfile) {
  const bodyContent = `
    <h2>أولاً: تفاصيل التكليف والمتابعة الإدارية</h2>
    <table class="grid-table">
      <tr>
        <td colspan="2">
          <span class="label-span">موضوع التكليف والعمل الرئيسي</span>
          <span class="value-span" style="font-size: 13pt; color: #1e3a8a;">${escapeHtml(t.title)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">المستشار / المحامي المسؤول</span>
          <span class="value-span" style="color: #2563eb;">${escapeHtml(t.assignedTo)}</span>
        </td>
        <td>
          <span class="label-span">تاريخ وموعد الاستحقاق التنفيذي</span>
          <span class="value-span" style="color: #b45309;">${escapeHtml(t.dueDate)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">ارتباط التكليف بالقضايا</span>
          <span class="value-span">${t.caseNumber ? `ملف قضية رقم ${escapeHtml(t.caseNumber)}` : 'عمل عام تشغيلي للمكتب'}</span>
        </td>
        <td>
          <span class="label-span">حالة الإنجاز والتنفيذ الحالي</span>
          <span class="value-span">${t.status === 'completed' ? 'تم الإنجاز بالكامل' : 'قيد المتابعة والعمل الجاري'}</span>
        </td>
      </tr>
    </table>

    <h2>ثانياً: الشرح الفني والخطوات الإجرائية المطلوبة</h2>
    <div style="border: 1px solid #cbd5e1; background-color: #fcfdfd; padding: 15px; border-radius: 6px; min-height: 100px;">
      <p style="font-weight: bold; color: #475569; margin-bottom: 6px;">مذكرة وصف الإجراء والتحضير الفني:</p>
      <p style="font-size: 11pt; line-height: 1.7; white-space: pre-wrap; margin: 0;">${t.description ? escapeHtml(t.description) : 'لا يوجد شرح تفصيلي مضاف للمهمة.'}</p>
    </div>

    ${c ? `
    <h2>ثالثاً: ملخص صياغة ملف القضية المتصلة</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">الموكل المدعي / المدعى عليه</span>
          <span class="value-span">${escapeHtml(c.clientName)}</span>
        </td>
        <td>
          <span class="label-span">المحكمة المختصة بالتحضير</span>
          <span class="value-span">${escapeHtml(c.court)}</span>
        </td>
      </tr>
    </table>` : ''}
  `;

  exportHtmlToWord(`ورقة تكليف بمهمة قانونية: ${t.title}`, bodyContent, `تكليف_${t.title.replace(/\s+/g, '_')}`, office);
}

export function exportTransactionToWord(t: Transaction, c: Case | undefined, office: OfficeProfile) {
  const bodyContent = `
    <div style="border: 2px solid #cbd5e1; padding: 20px; border-radius: 8px; background-color: #fffdf9; margin-bottom: 20px;">
      <div style="text-align: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 15px;">
        <h3 style="margin: 0; color: #1e3a8a; font-size: 15pt;">سند إيصال قيد واستلام مالي</h3>
        <p style="margin: 4px 0 0 0; font-size: 9pt; color: #64748b;">رقم السند المالي المرجعي: REC-${t.id.slice(-8).toUpperCase()}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 30%; font-weight: bold; background-color: #f8fafc;">سدد من السيد / الأستاذ:</td>
          <td style="font-weight: bold; font-size: 11.5pt;">${escapeHtml(t.clientName)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">المبلغ المدفوع كلياً:</td>
          <td style="font-weight: bold; color: #16a34a; font-size: 12.5pt;">${t.amount.toLocaleString('ar-EG')} جنيهاً مصرياً لا غير</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">وذلك مقابل وبناء على:</td>
          <td>${escapeHtml(t.description)} (${escapeHtml(t.type)})</td>
        </tr>
        ${t.caseNumber ? `
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">الارتباط بملف دعوى رقم:</td>
          <td>قضية رقم ${escapeHtml(t.caseNumber)} ${c ? `- محكمة ${escapeHtml(c.court)}` : ''}</td>
        </tr>` : ''}
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">طريقة ووسيلة الدفع:</td>
          <td>${escapeHtml(t.paymentMethod)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">تاريخ استحقاق وقيد الحركة:</td>
          <td style="font-weight: bold;">${escapeHtml(t.date)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">تصنيف ميزانية الدفاتر:</td>
          <td><span style="font-weight: bold; color: ${t.ioType.includes('وارد') ? '#16a34a' : '#dc2626'}">${escapeHtml(t.ioType)}</span></td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; font-size: 9.5pt; color: #475569; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 4px; background-color: #fafafb;">
      يعتبر هذا السند إقراراً رسمياً صادراً من إدارة التدقيق المالي للمكتب لتمثيل الموكل في الشؤون والنفقات المبينة أعلاه.
    </div>
  `;

  exportHtmlToWord(`إيصال مالي معتمد: ${t.type}`, bodyContent, `سند_مالي_REC_${t.id.slice(-8).toUpperCase()}`, office);
}

// ==========================================
// 2. BULK & AGGREGATE REPORTS EXPORTERS
// ==========================================

export function exportBulkCasesToWord(casesList: Case[], office: OfficeProfile) {
  const activeCount = casesList.filter(c => c.status === 'متداولة').length;
  const pleadingCount = casesList.filter(c => c.status === 'محجوزة للحكم').length;
  const closedCount = casesList.filter(c => c.status === 'منتهية ومحفوظة').length;

  const totalContractedFees = casesList.reduce((acc, curr) => acc + curr.totalFees, 0);
  const totalPaidFees = casesList.reduce((acc, curr) => acc + curr.paidFees, 0);
  const totalOutstanding = Math.max(0, totalContractedFees - totalPaidFees);

  const rows = casesList.length === 0
    ? `<tr><td colspan="7" style="text-align:center;color:#64748b;">لا توجد أي قضايا مسجلة بالنظام حالياً</td></tr>`
    : casesList.map((c, idx) => `
        <tr>
          <td style="font-weight:bold; text-align: center;">${idx + 1}</td>
          <td style="font-weight:bold;">${escapeHtml(c.caseNumber)}</td>
          <td>${escapeHtml(c.clientName)}</td>
          <td>${escapeHtml(c.court)}</td>
          <td>${escapeHtml(c.type)}</td>
          <td>${escapeHtml(c.status)}</td>
          <td style="font-weight:bold; text-align:left;">
            ${c.paidFees.toLocaleString('ar-EG')} / ${c.totalFees.toLocaleString('ar-EG')} ج.م
          </td>
        </tr>
      `).join('');

  const bodyContent = `
    <h2>أولاً: التحليل الإحصائي الكلي لملفات المكتب القضائية</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">إجمالي القضايا والنزاعات</span>
          <span class="value-span">${casesList.length} ملفات دعاوى</span>
        </td>
        <td>
          <span class="label-span">قضايا متداولة نشطة بالدائرة</span>
          <span class="value-span" style="color:#16a34a;">${activeCount} قضية</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">قضايا محجوزة لنطق الحكم</span>
          <span class="value-span" style="color:#b45309;">${pleadingCount} حجز موضوعي</span>
        </td>
        <td>
          <span class="label-span">قضايا منتهية محفوظة بالأرشيف</span>
          <span class="value-span" style="color:#64748b;">${closedCount} قضية مؤرشفة</span>
        </td>
      </tr>
    </table>

    <h2>ثانياً: الملاءة المالية وإجمالي المطالبات المقيدة</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">إجمالي الأتعاب التعاقدية للمكتب</span>
          <span class="value-span" style="color: #1e3a8a;">${totalContractedFees.toLocaleString('ar-EG')} ج.م</span>
        </td>
        <td>
          <span class="label-span">إجمالي المقبوضات والمسدد الفعلي</span>
          <span class="value-span" style="color: #16a34a;">${totalPaidFees.toLocaleString('ar-EG')} ج.م</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <span class="label-span">الأقساط والمتبقيات في دائنية الموكلين</span>
          <span class="value-span" style="color: #dc2626;">${totalOutstanding.toLocaleString('ar-EG')} ج.م</span>
        </td>
      </tr>
    </table>

    <h2>ثالثاً: جدول تتبع القضايا التفصيلي المقيد</h2>
    <table>
      <thead>
        <tr style="background-color: #1e3a8a; color: white;">
          <th style="width:5%">م</th>
          <th style="width:20%">رقم القضية والعام</th>
          <th style="width:20%">الموكل</th>
          <th style="width:20%">المحكمة والفرع</th>
          <th style="width:15%">التصنيف</th>
          <th style="width:10%">الحالة</th>
          <th style="width:10%; text-align:left;">المسدد / الكلي</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  exportHtmlToWord('الكشف الكلي والمنهجي لكافة القضايا النشطة والمتداولة', bodyContent, 'تقرير_القضايا_الشامل', office);
}

export function exportBulkClientsToWord(clientsList: Client[], casesList: Case[], office: OfficeProfile) {
  const rows = clientsList.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#64748b;">لا يوجد موكلين مسجلين بالنظام حالياً</td></tr>`
    : clientsList.map((cl, idx) => {
        const cCount = casesList.filter(c => c.clientId === cl.id && !c.isArchived).length;
        const poasCount = cl.poas.length;
        return `
          <tr>
            <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
            <td style="font-weight:bold;">${escapeHtml(cl.name)}</td>
            <td>${escapeHtml(cl.phone)}</td>
            <td>${escapeHtml(cl.nationalId)}</td>
            <td style="font-weight:bold; color: #1e3a8a;">${poasCount} توكيلات</td>
            <td style="font-weight:bold; color: #16a34a; text-align:center;">${cCount} قضايا</td>
          </tr>
        `;
      }).join('');

  const bodyContent = `
    <h2>أولاً: إحصائيات عامة لقاعدة الموكلين بالمكتب</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">إجمالي الموكلين والشركات المقيدة</span>
          <span class="value-span">${clientsList.length} اسم تجاري وفردي</span>
        </td>
        <td>
          <span class="label-span">إجمالي التوكيلات وسندات الوكالة المحفوظة</span>
          <span class="value-span" style="color: #1e3a8a;">
            ${clientsList.reduce((acc, cl) => acc + cl.poas.length, 0)} توكيل معتمد
          </span>
        </td>
      </tr>
    </table>

    <h2>ثانياً: جدول بيان الموكلين وتفاصيل الوكالة القضائية والقضايا</h2>
    <table>
      <thead>
        <tr style="background-color: #1e3a8a; color: white;">
          <th style="width:5%">م</th>
          <th style="width:25%">الاسم والكامل للموكل</th>
          <th style="width:15%">الهاتف الرسمي</th>
          <th style="width:20%">الرقم القومي / السجل</th>
          <th style="width:20%">التوكيلات المحفوظة</th>
          <th style="width:15%; text-align:center;">القضايا المتداولة</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  exportHtmlToWord('سجل ودليل قاعدة الموكلين التراكمي المعتمد', bodyContent, 'تقرير_الموكلين_الشامل', office);
}

export function exportBulkSessionsToWord(sessionsList: Session[], office: OfficeProfile) {
  const upcomingCount = sessionsList.filter(s => s.status === 'قادمة').length;
  const finishedCount = sessionsList.filter(s => s.status === 'منتهية').length;

  const rows = sessionsList.length === 0
    ? `<tr><td colspan="8" style="text-align:center;color:#64748b;">لا توجد أي جلسات مضافة لجدول الأعمال حالياً</td></tr>`
    : sessionsList
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((s, idx) => `
          <tr>
            <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
            <td style="font-weight:bold;">${escapeHtml(s.date)}</td>
            <td>قضية رقم ${escapeHtml(s.caseNumber)}</td>
            <td>${escapeHtml(s.clientName)}</td>
            <td>${escapeHtml(s.court)} - ${escapeHtml(s.circuit)}</td>
            <td>${s.judgeName ? escapeHtml(s.judgeName) : '-'}</td>
            <td>${escapeHtml(s.objective)}</td>
            <td>${escapeHtml(s.status)}</td>
          </tr>
        `).join('');

  const bodyContent = `
    <h2>أولاً: تلخيص أجندة قضايا وجلسات المحاكم بالجدول</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">إجمالي الجلسات التراكمي المقيد</span>
          <span class="value-span">${sessionsList.length} جلسة محاكمة</span>
        </td>
        <td>
          <span class="label-span">أجندة وقائع جلسات قادمة حية مرتقبة</span>
          <span class="value-span" style="color: #b45309;">${upcomingCount} جلسة مرتقبة</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <span class="label-span">جلسات منقضية ومسجل قراراتها الإجرائية</span>
          <span class="value-span" style="color: #16a34a;">${finishedCount} جلسة منتهية</span>
        </td>
      </tr>
    </table>

    <h2>ثانياً: جدول بيان رول الجلسات وحضور المحاكم اليومي والشهري</h2>
    <table>
      <thead>
          <tr style="background-color: #1e3a8a; color: white;">
            <th style="width:5%">م</th>
            <th style="width:13%">تاريخ الجلسة</th>
            <th style="width:13%">رقم القضية</th>
            <th style="width:17%">الموكل لصالحه</th>
            <th style="width:17%">المحكمة والدائرة</th>
            <th style="width:12%">القاضي</th>
            <th style="width:13%">الهدف والمطلوب</th>
            <th style="width:10%">الحالة</th>
          </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  exportHtmlToWord('تقرير رول وأجندة الجلسات القضائية ومحاضر الحضور', bodyContent, 'أجندة_الجلسات_الشاملة', office);
}

export function exportBulkTasksToWord(tasksList: LawTask[], office: OfficeProfile) {
  const compCount = tasksList.filter(t => t.status === 'completed').length;
  const pendCount = tasksList.filter(t => t.status === 'pending').length;

  const rows = tasksList.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#64748b;">لا توجد أي مهام أو تكليفات مسجلة بالجدول حالياً</td></tr>`
    : tasksList.map((t, idx) => `
        <tr>
          <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
          <td style="font-weight:bold;">${escapeHtml(t.title)}</td>
          <td>${t.caseNumber ? `قضية رقم ${escapeHtml(t.caseNumber)}` : 'إجراء عام لمكتب التشغيل'}</td>
          <td>${escapeHtml(t.assignedTo)}</td>
          <td style="font-weight:bold; color:#b45309;">${escapeHtml(t.dueDate)}</td>
          <td>${t.status === 'completed' ? 'منجز كامل' : 'قيد المتابعة والعمل'}</td>
        </tr>
      `).join('');

  const bodyContent = `
    <h2>أولاً: الكفاءة والإنتاجية وتوزيع الإجراءات والمهام</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">إجمالي التكليفات القضائية والمهام الموزعة</span>
          <span class="value-span">${tasksList.length} مهمة إجرائية</span>
        </td>
        <td>
          <span class="label-span">إجراءات ومهام مكتملة ومنجزة كلياً</span>
          <span class="value-span" style="color:#16a34a;">${compCount} مهمة منجزة</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <span class="label-span">مهام نشطة سارية وقيد الدفاع الفعلي</span>
          <span class="value-span" style="color:#dc2626;">${pendCount} تكليف ساري</span>
        </td>
      </tr>
    </table>

    <h2>ثانياً: جدول تفصيل وتوزيع المهام القانونية والإدارية اليومية للمكتب</h2>
    <table>
      <thead>
        <tr style="background-color: #1e3a8a; color: white;">
          <th style="width:5%">م</th>
          <th style="width:30%">عنوان الإجراء / التكليف الفني</th>
          <th style="width:20%">صالح ملف الدعوى</th>
          <th style="width:15%">اسم المحامي المتابع</th>
          <th style="width:15%">موعد الاستحقاق</th>
          <th style="width:15%">الحالة والتنفيذ</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  exportHtmlToWord('كشف متابعة التكليفات والمهام التنفيذية والإنذار المبكر للمكتب', bodyContent, 'تقرير_المهام_والتكليفات', office);
}

export function exportBulkFinancialsToWord(txList: Transaction[], office: OfficeProfile) {
  const incomeCount = txList.filter(t => t.ioType.includes('وارد')).length;
  const expenseCount = txList.filter(t => t.ioType.includes('صادر')).length;

  const totalIncomes = txList
    .filter(t => t.ioType.includes('وارد'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = txList
    .filter(t => t.ioType.includes('صادر') || t.type === 'مصاريف مكتب تشغيلية' || t.type === 'مصروفات دعوى')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const rows = txList.length === 0
    ? `<tr><td colspan="7" style="text-align:center;color:#64748b;">لا يوجد أي قيود محاسبية أو معاملات مالية مقيدة بالدفاتر</td></tr>`
    : txList.map((t, idx) => `
        <tr>
          <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
          <td>${escapeHtml(t.date)}</td>
          <td>${escapeHtml(t.type)}</td>
          <td>${escapeHtml(t.clientName)}</td>
          <td>${escapeHtml(t.description)}</td>
          <td>${escapeHtml(t.paymentMethod)}</td>
          <td style="font-weight:bold; color: ${t.ioType.includes('وارد') ? '#16a34a' : '#dc2626'}; text-align:left;">
            ${t.ioType.includes('وارد') ? '+' : '-'}${t.amount.toLocaleString('ar-EG')} ج.م
          </td>
        </tr>
      `).join('');

  const bodyContent = `
    <h2>أولاً: قائمة تدفق الإيرادات والموازنة التشغيلية الكبرى</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">إجمالي المقبوضات ودفوع الأتعاب الواردة</span>
          <span class="value-span" style="color: #16a34a;">+${totalIncomes.toLocaleString('ar-EG')} ج.م</span>
        </td>
        <td>
          <span class="label-span">إجمالي النفقات ومصاريف الدعاوى ومصاريف التشغيل</span>
          <span class="value-span" style="color: #dc2626;">-${totalExpenses.toLocaleString('ar-EG')} ج.م</span>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="background-color: #f3e8ff; border-color: #c084fc;">
          <span class="label-span" style="color:#7e22ce;">الصافي المتبقي من الميدان التشغيلي (صافي أرباح المكتب)</span>
          <span class="value-span" style="font-size: 14pt; color: #1e293b;">${(totalIncomes - totalExpenses).toLocaleString('ar-EG')} ج.م</span>
        </td>
      </tr>
    </table>

    <h2>ثانياً: إحصائيات نوعية المعاملات والقيود المحاسبية</h2>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">إجمالي عدد المعاملات والعمليات المقيدة</span>
          <span class="value-span">${txList.length} حركات مالية</span>
        </td>
        <td>
          <span class="label-span">دفعات واردة (أتعاب ومقدمات)</span>
          <span class="value-span" style="color: #16a34a;">${incomeCount} حركة دفع</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <span class="label-span">حركات نفقات وصادر مصاريف رسوم تشغيلية</span>
          <span class="value-span" style="color: #dc2626;">${expenseCount} حركة صادر</span>
        </td>
      </tr>
    </table>

    <h2>ثالثاً: دفتر الأستاذ والميزانية وقيد السجلات المالي بالتواريخ</h2>
    <table>
      <thead>
        <tr style="background-color: #1e3a8a; color: white;">
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
  `;

  exportHtmlToWord('تقرير كشف التدقيق المالي وميزانية السحوبات والإيرادات لمكتب المحاماة', bodyContent, 'دفتر_الحسابات_المالية_الشامل', office);
}

/**
 * تصدير ملف تنفيذ حكم قضائي إلى مستند Microsoft Word (.doc/.docx)
 */
export function exportExecutionToWord(e: Execution, office: OfficeProfile) {
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
    <tr>
      <td style="padding:6pt; border:1px solid #cbd5e1; text-align:center;">${idx + 1}</td>
      <td style="padding:6pt; border:1px solid #cbd5e1;">${escapeHtml(s.title || '—')}</td>
      <td style="padding:6pt; border:1px solid #cbd5e1; text-align:center;">
        ${s.status === 'completed' ? 'مكتمل (تم)' : s.status === 'cancelled' ? 'ملغي' : 'لم يبدأ'}
      </td>
      <td style="padding:6pt; border:1px solid #cbd5e1; text-align:center;">${s.dueDate ? escapeHtml(s.dueDate.slice(0, 10)) : '—'}</td>
    </tr>
  `).join('');

  const bodyContent = `
    <h1>تقرير ملف تنفيذ حكم قضائي — ${escapeHtml(typeLabel)}</h1>
    <table class="grid-table">
      <tr>
        <td>
          <span class="label-span">رقم القضية</span>
          <span class="value-span">${escapeHtml(e.caseNumber || '—')}</span>
        </td>
        <td>
          <span class="label-span">نوع التنفيذ وموقفه</span>
          <span class="value-span">${escapeHtml(typeLabel)} (${escapeHtml(statusLabel)})</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">اسم الموكل</span>
          <span class="value-span">${escapeHtml(e.clientName || '—')}</span>
        </td>
        <td>
          <span class="label-span">موقف النفاذ</span>
          <span class="value-span">${escapeHtml(e.enforceabilityStatus || 'واجب النفاذ')}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">المحكمة والدائرة</span>
          <span class="value-span">${escapeHtml(e.court || '—')} ${e.circuit ? `— ${escapeHtml(e.circuit)}` : ''}</span>
        </td>
        <td>
          <span class="label-span">رقم الحكم والقاضي</span>
          <span class="value-span">${escapeHtml(e.judgmentNumber || '—')} (${escapeHtml(e.judgeName || 'غير محدد')})</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="label-span">تاريخ الحكم</span>
          <span class="value-span">${e.judgmentDate ? escapeHtml(e.judgmentDate.slice(0, 10)) : '—'}</span>
        </td>
        <td>
          <span class="label-span">موعد التنفيذ والطعن</span>
          <span class="value-span">تنفيذ: ${e.executionDeadline ? escapeHtml(e.executionDeadline.slice(0, 10)) : '—'} | طعن: ${e.appealDeadline ? escapeHtml(e.appealDeadline.slice(0, 10)) : '—'}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="background:#ecfdf5;">
          <span class="label-span" style="color:#065f46;">المبلغ المحكوم به ومصاريف التنفيذ</span>
          <span class="value-span" style="color:#047857; font-size:13pt;">
            المبلغ: ${e.amount ? e.amount.toLocaleString('ar-EG') + ' ج.م' : '—'} | مصاريف: ${e.fees ? e.fees.toLocaleString('ar-EG') + ' ج.م' : '—'} | الإجمالي: ${e.totalAmount ? e.totalAmount.toLocaleString('ar-EG') + ' ج.م' : '—'}
          </span>
        </td>
      </tr>
    </table>

    ${e.judgmentText ? `
    <h2>منطوق الحكم والقرار القضائي</h2>
    <div style="background:#f8fafc; padding:10pt; border:1px solid #e2e8f0; border-radius:6pt; font-size:11pt; line-height:1.8;">
      ${escapeHtml(e.judgmentText)}
    </div>` : ''}

    ${(e.steps || []).length > 0 ? `
    <h2>جدول خطوات وإجراءات التنفيذ</h2>
    <table>
      <thead>
        <tr style="background-color:#1e3a8a; color:white;">
          <th style="width:5%">#</th>
          <th style="width:55%">عنوان الخطوة الإجرائية</th>
          <th style="width:20%">الحالة</th>
          <th style="width:20%">تاريخ الاستحقاق</th>
        </tr>
      </thead>
      <tbody>
        ${stepsRows}
      </tbody>
    </table>` : ''}

    ${e.notes ? `
    <div style="margin-top:16pt; padding:10pt; background:#fffbeb; border:1px solid #fde68a; border-radius:6pt;">
      <strong>ملاحظات وتوجيهات:</strong> ${escapeHtml(e.notes)}
    </div>` : ''}
  `;

  exportHtmlToWord(`ملف تنفيذ — ${e.caseNumber || 'تنفيذ'}`, bodyContent, `تقرير_تنفيذ_قضية_${e.caseNumber || 'تنفيذ'}`, office);
}

