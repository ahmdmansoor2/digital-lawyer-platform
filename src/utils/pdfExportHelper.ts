/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * pdfExportHelper.ts — تصدير HTML إلى PDF.
 *
 * يستخدم jsPDF + html2canvas. الـ Arabic text يظهر كصور (canvas) — مقبول للمحاكم.
 *
 * الاستخدام:
 *   import { exportHtmlToPdf } from '../utils/pdfExportHelper';
 *   exportHtmlToPdf('عنوان', htmlContent, 'document.pdf');
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { logger } from './logger';

export interface PdfOptions {
  filename?: string;
  format?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  quality?: number;
}

export async function exportHtmlToPdf(
  title: string,
  htmlContent: string,
  filename: string = 'document.pdf',
  options: PdfOptions = {}
): Promise<void> {
  const {
    format = 'a4',
    orientation = 'portrait',
    margin = 10,
    quality = 0.95,
  } = options;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.padding = `${margin}mm`;
  container.style.background = 'white';
  container.style.color = 'black';
  container.style.fontFamily = 'Cairo, Tajawal, Arial, sans-serif';
  container.style.fontSize = '11pt';
  container.style.direction = 'rtl';
  container.style.lineHeight = '1.6';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    const imgWidth = format === 'a4' ? 210 : 216;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = format === 'a4' ? 297 : 279;

    const pdf = new jsPDF({ orientation, unit: 'mm', format });

    const imgData = canvas.toDataURL('image/jpeg', quality);
    let heightLeft = imgHeight;
    let position = 0;

    pdf.setFontSize(16);
    pdf.text(title, margin, margin + 5);
    pdf.addImage(imgData, 'JPEG', margin, position + 15, imgWidth - 2 * margin, imgHeight);
    heightLeft -= (pageHeight - position - 15);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth - 2 * margin, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    logger.info(`[pdfExport] PDF saved: ${filename}`);
  } catch (e: any) {
    logger.error('[pdfExport] Failed', e);
    throw new Error(`فشل تصدير PDF: ${e.message}`);
  } finally {
    container.remove();
  }
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options: PdfOptions = {}
): Promise<void> {
  const { format = 'a4', orientation = 'portrait', margin = 10, quality = 0.95 } = options;
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });
    const imgWidth = format === 'a4' ? 210 : 216;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = format === 'a4' ? 297 : 279;
    const pdf = new jsPDF({ orientation, unit: 'mm', format });
    const imgData = canvas.toDataURL('image/jpeg', quality);
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth - 2 * margin, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth - 2 * margin, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(filename);
    logger.info(`[pdfExport] Element PDF saved: ${filename}`);
  } catch (e: any) {
    logger.error('[pdfExport] Element failed', e);
    throw new Error(`فشل تصدير PDF: ${e.message}`);
  }
}


/**
 * تصدير قضية كاملة كـ PDF.
 */
import type { Case, Client, Session, Transaction, LawTask, LawDocument, OfficeProfile } from "../types";
import { buildCaseFileQRHtml } from "./printHelper";

export async function exportCaseAsPdf(args: {
  caseData: Case;
  client: Client | undefined;
  sessions: Session[];
  transactions: Transaction[];
  tasks: LawTask[];
  documents: LawDocument[];
  office: OfficeProfile;
}): Promise<void> {
  const { caseData, office } = args;
  const html = buildCaseFileQRHtml(caseData, office);
  const filename = `قضية_${caseData.caseNumber.replace(/[\/\\\\:]/g, "-")}.pdf`;
  await exportHtmlToPdf(
    `ملف القضية رقم ${caseData.caseNumber} لسنة ${caseData.year || ""}`,
    html,
    filename
  );
}

