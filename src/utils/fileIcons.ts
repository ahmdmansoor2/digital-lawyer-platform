import React from 'react';
import { FileText, FileImage, File, FileCode } from 'lucide-react';

const isImageExt = (ext: string): boolean => ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif'].includes(ext);
const isPdfExt = (ext: string): boolean => ext === 'pdf';
const isWordExt = (ext: string): boolean => ['doc', 'docx'].includes(ext);
const isExcelExt = (ext: string): boolean => ['xls', 'xlsx'].includes(ext);
const isTextExt = (ext: string): boolean => ext === 'txt';

export const getFileIcon = (fileName: string): React.ComponentType<{ className?: string }> => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (isImageExt(ext)) return FileImage;
  if (isPdfExt(ext)) return FileText;
  if (isWordExt(ext)) return FileCode;
  if (isExcelExt(ext)) return FileCode;
  if (isTextExt(ext)) return FileText;
  return FileText;
};

export const mimeTypeToIcon = (mimeType: string): React.ComponentType<{ className?: string }> => {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('word') || mimeType.includes('officedocument')) return FileText;
  return FileText;
};

export const getFileIconColor = (ext: string): string => {
  if (isImageExt(ext)) return 'text-pink-500';
  if (isPdfExt(ext)) return 'text-rose-500';
  if (isWordExt(ext)) return 'text-blue-500';
  if (isExcelExt(ext)) return 'text-emerald-500';
  if (isTextExt(ext)) return 'text-slate-500';
  return 'text-indigo-500';
};
