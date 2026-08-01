/**
 * docxExtractor.ts
 * استخراج النصوص من ملفات Word (.docx) مباشرة في المتصفح
 * يعتمد على pako (موجود مسبقاً) لـ ZIP inflation
 */
import { inflate } from 'pako';

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

interface ZipEntry {
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  filename: string;
  dataOffset: number;
}

/**
 * فك ضغط ZIP والبحث عن entry معين باسمه
 */
function findZipEntry(data: Uint8Array, targetName: string): ZipEntry | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  while (offset + 30 <= data.length) {
    const sig = readUint32(view, offset);
    if (sig !== 0x04034b50) break; // PK\x03\x04

    const compressionMethod = readUint16(view, offset + 8);
    const compressedSize = readUint32(view, offset + 18);
    const uncompressedSize = readUint32(view, offset + 22);
    const filenameLen = readUint16(view, offset + 26);
    const extraLen = readUint16(view, offset + 28);

    const filenameBytes = data.slice(offset + 30, offset + 30 + filenameLen);
    const filename = new TextDecoder('utf-8').decode(filenameBytes).replace(/\0+$/, '');

    const dataStart = offset + 30 + filenameLen + extraLen;

    if (filename === targetName) {
      return {
        compressionMethod,
        compressedSize: compressedSize || (data.length - dataStart),
        uncompressedSize,
        filename,
        dataOffset: dataStart,
      };
    }

    // انتقل إلى الإدخال التالي
    const nextOffset = dataStart + (compressedSize || (data.length - dataStart));
    if (nextOffset <= offset) break; // تجنب الحلقات اللانهائية
    offset = nextOffset;
  }

  return null;
}

/**
 * استخراج النص من ملف Word (.docx) معطى كـ dataUrl base64
 */
export async function extractDocxText(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) throw new Error('يجب أن يكون الملف بصيغة dataUrl');

  const base64 = dataUrl.split(',')[1];
  const bytes = base64ToBytes(base64);

  // ابحث عن word/document.xml داخل الـ ZIP
  const entry = findZipEntry(bytes, 'word/document.xml');
  if (!entry) throw new Error('لم يتم العثور على word/document.xml داخل الملف');

  // اقرأ البيانات المضغوطة
  const compressedData = bytes.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize);

  let xmlBytes: Uint8Array;
  if (entry.compressionMethod === 0) {
    xmlBytes = compressedData;
  } else if (entry.compressionMethod === 8) {
    xmlBytes = inflate(compressedData);
  } else {
    throw new Error(`طريقة الضغط غير مدعومة: ${entry.compressionMethod}`);
  }

  const xmlStr = new TextDecoder('utf-8').decode(xmlBytes);

  // استخرج النصوص من عناصر <w:t> باستخدام DOMParser
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const tElements = xmlDoc.getElementsByTagNameNS(ns, 't');

  const textParts: string[] = [];
  for (let i = 0; i < tElements.length; i++) {
    const txt = tElements[i].textContent;
    if (txt) textParts.push(txt);
  }

  if (textParts.length === 0) {
    // fallback: جرب بأسماء عناصر مختلفة
    const allEls = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      if (el.localName === 't' && el.textContent) {
        textParts.push(el.textContent);
      }
    }
  }

  const result = textParts.join('').trim();
  if (!result) throw new Error('لم يتم العثور على نصوص قابلة للقراءة في الملف');

  return result;
}

/**
 * التحقق مما إذا كان الملف من نوع Word (.docx) بصيغة dataUrl
 */
export function isDocxDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith('data:') &&
    (dataUrl.includes('application/vnd.openxmlformats-officedocument.wordprocessingml') ||
     dataUrl.includes('.docx'));
}
