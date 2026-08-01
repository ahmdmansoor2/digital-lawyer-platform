import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Download,
  FileText, File, Maximize2, Minimize2, Printer, Copy, Check,
  Search, AlertCircle, Loader2, Sparkles, Brain, ArrowLeft, ArrowRight,
  ZoomIn, ZoomOut, RotateCw, BookOpen, Layers, Book
} from 'lucide-react';
import PdfViewer from './PdfViewer';
import { extractDocxText } from '../utils/docxExtractor';
import { sanitizeHtml } from '../utils/sanitizer';
import { showAlert } from '../utils/dialogs';
;

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileDataUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: string;
  initialExtractedText?: string;
  onSaveExtractedText?: (text: string) => void;
}

type ViewerMode = 'pdf' | 'image' | 'text' | 'word' | 'doc-legacy' | 'html' | 'unsupported';
type TabMode = 'preview' | 'ai-ocr';
type LayoutMode = 'scroll' | 'single' | 'double' | 'book3d';

function detectViewerMode(fileType: string, fileName: string): ViewerMode {
  const name = fileName.toLowerCase();
  const type = (fileType || '').toLowerCase();
  if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico|tiff?)$/i.test(name)) return 'image';
  if (type.includes('text/') || /\.(txt|md|csv|log|rtf|xml|json|js|ts|py|css|sql|sh|bat|ini|yaml|yml|toml)$/i.test(name)) return 'text';
  // Only .docx (ZIP-based) is supported; .doc is legacy OLE binary
  if (/\.(docx|odt)$/i.test(name)) return 'word';
  if (/\.doc$/i.test(name)) return 'doc-legacy';
  if (type.includes('html') || /\.html?$/i.test(name)) return 'html';
  return 'unsupported';
}

function getFileColor(fileName: string): string {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    pdf: '#e53e3e', doc: '#2b5ce6', docx: '#2b5ce6', xls: '#1d7a4b', xlsx: '#1d7a4b',
    ppt: '#c33b17', pptx: '#c33b17', txt: '#718096', md: '#553c9a', json: '#d97706',
    csv: '#2d8547', xml: '#2d8547', png: '#9b59b6', jpg: '#e67e22', jpeg: '#e67e22',
    gif: '#fd79a8', svg: '#00b894', zip: '#8e44ad', rar: '#8e44ad', mp4: '#0984e3',
    mp3: '#6c5ce7', html: '#e67e22', htm: '#e67e22',
  };
  return map[ext] || '#64748b';
}

function getExtensionLabel(fileName: string): string {
  return (fileName.split('.').pop() || 'FILE').toUpperCase();
}

function dataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    const [header, b64] = dataUrl.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) { console.error('FileViewer: failed to save file', e);
    return null;
  }
}

function dataUrlToText(dataUrl: string): string {
  try {
    const [header, b64] = dataUrl.split(',');
    if (header.includes('base64')) {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    }
    return decodeURIComponent(b64);
  } catch (e) { console.error('FileViewer: failed to load file', e);
    return 'تعذّر قراءة محتوى الملف النصي';
  }
}

function splitTextIntoPages(text: string, charsPerPage = 1000): string[] {
  if (!text) return [''];
  const paragraphs = text.split('\n');
  const pages: string[] = [];
  let currentPage = '';
  for (const para of paragraphs) {
    if ((currentPage + para).length > charsPerPage) {
      if (currentPage) pages.push(currentPage.trim());
      currentPage = para + '\n';
    } else {
      currentPage += para + '\n';
    }
  }
  if (currentPage) pages.push(currentPage.trim());
  return pages;
}

const FileViewer = React.memo(function FileViewer({
  isOpen,
  onClose,
  fileDataUrl,
  fileName,
  fileType,
  fileSize,
  initialExtractedText = '',
  onSaveExtractedText
}: FileViewerProps) {
  const mode = detectViewerMode(fileType, fileName);
  
  // UI states
  const [tab, setTab] = useState<TabMode>('preview');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  
  // Reading mode states
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('book3d');
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(0);

  // Text & Search States
  const [textContent, setTextContent] = useState('');
  const [isLoadingText, setIsLoadingText] = useState(false);

  // Word (.docx) extraction states
  const [docxText, setDocxText] = useState('');
  const [isLoadingDocx, setIsLoadingDocx] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // AI OCR States
  const [aiText, setAiText] = useState(initialExtractedText);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSearchText, setAiSearchText] = useState('');
  const [aiCopied, setAiCopied] = useState(false);

  // Search occurrence navigation
  const [searchMatches, setSearchMatches] = useState<number>(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  const fileColor = getFileColor(fileName);
  const extLabel = getExtensionLabel(fileName);

  // Split text/docx into pages
  const textPages = useMemo(() => {
    return splitTextIntoPages(docxText || textContent || aiText || '', 1100);
  }, [docxText, textContent, aiText]);

  const totalPages = mode === 'pdf' ? pdfNumPages : textPages.length;

  // Sync initial extracted text; for unsupported files default to AI tab
  useEffect(() => {
    setAiText(initialExtractedText || '');
    setDocxText('');
    setDocxError(null);
    if (initialExtractedText || mode === 'unsupported') {
      setTab('ai-ocr');
    } else {
      setTab('preview');
    }
  }, [initialExtractedText, fileDataUrl, mode]);

  // Create Blob URL for HTML files
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    let createdUrl: string | null = null;

    if (mode === 'html') {
      const url = dataUrlToBlobUrl(fileDataUrl);
      if (active) {
        setBlobUrl(url);
        createdUrl = url;
      }
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, fileDataUrl, mode]);

  // Decode plain text if file is text type
  useEffect(() => {
    if (!isOpen || mode !== 'text') return;
    setIsLoadingText(true);
    setTimeout(() => {
      setTextContent(dataUrlToText(fileDataUrl));
      setIsLoadingText(false);
    }, 50);
  }, [isOpen, mode, fileDataUrl]);

  // Extract text from Word (.docx) files
  useEffect(() => {
    if (!isOpen || mode !== 'word') return;
    setIsLoadingDocx(true);
    setDocxText('');
    setDocxError(null);
    setTab('preview');
    extractDocxText(fileDataUrl)
      .then(text => {
        setDocxText(text);
        setIsLoadingDocx(false);
      })
      .catch(err => {
        console.error('[FileViewer] فشل استخراج نص Word:', err);
        setDocxError(err?.message || 'فشل استخراج النص');
        setIsLoadingDocx(false);
        setTab('ai-ocr');
      });
  }, [isOpen, mode, fileDataUrl]);

  const handleCopyText = async (text: string, setCopyState: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopyState(true);
    setTimeout(() => setCopyState(false), 2000);
  };

  // Call Gemini AI OCR backend
  const handleExtractText = async () => {
    setIsExtracting(true);
    setAiError(null);
    try {
      const response = await fetch('/api/gemini/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: fileDataUrl, mimeType: fileType })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'فشلت عملية استخراج النصوص بالذكاء الاصطناعي');
      }

      const result = await response.json();
      if (result.extractedText) {
        setAiText(result.extractedText);
        if (onSaveExtractedText) {
          onSaveExtractedText(result.extractedText);
        }
      } else {
        throw new Error('لم يتم العثور على نصوص مستخرجة في الملف.');
      }
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || 'حدث خطأ أثناء معالجة الملف بالذكاء الاصطناعي.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Premium printing that converts PDF and Word to HTML images or page segments
  const handlePrint = async () => {
    try {
      setIsLoadingText(true);
      let printHtml = '';

      if (mode === 'pdf') {
        const pdfjs = await import('pdfjs-dist');
        let pdfSource: Uint8Array | string;

        if (fileDataUrl.startsWith('data:')) {
          const base64 = fileDataUrl.split(',')[1];
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          pdfSource = bytes;
        } else {
          pdfSource = fileDataUrl;
        }

        const loadingTask = pdfjs.getDocument({
          data: pdfSource instanceof Uint8Array ? pdfSource : undefined,
          url: typeof pdfSource === 'string' ? pdfSource : undefined,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.4.168/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.4.168/standard_fonts/',
        });
        
        const pdf = await loadingTask.promise;
        const imagesHtml: string[] = [];
        
        // Render each page canvas to image data URL for bulletproof printing
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const imgData = canvas.toDataURL('image/png');
            imagesHtml.push(`<img src="${imgData}" style="width:100%; max-width:100%; page-break-after:always; display:block; margin:0;" />`);
          }
        }
        
        printHtml = `
          <html>
            <head>
              <title>${fileName}</title>
              <style>body { margin:0; padding:0; background:#fff; }</style>
            </head>
            <body>${imagesHtml.join('')}</body>
          </html>
        `;
      } else if (tab === 'ai-ocr') {
        printHtml = `<html><head><meta charset="utf-8"/><title>${fileName}</title><style>body { font-family: sans-serif; direction: rtl; white-space: pre-wrap; padding: 30px; line-height: 1.8; }</style></head><body><h2>نص المستند المستخرج ذكياً (${fileName})</h2><hr/>${aiText}</body></html>`;
      } else if (mode === 'image') {
        printHtml = `<html><head><title>${fileName}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000"><img src="${fileDataUrl}" style="max-width:100%;max-height:100vh;"/></body></html>`;
      } else if (mode === 'text') {
        printHtml = `<html><head><meta charset="utf-8"/><title>${fileName}</title><style>body { font-family: monospace; direction: rtl; white-space: pre-wrap; padding: 20px; font-size: 13px; }</style></head><body>${textContent}</body></html>`;
      } else if (mode === 'word') {
        const pagesText = splitTextIntoPages(docxText, 1000);
        const pagesHtml = pagesText.map((p, idx) => `
          <div style="page-break-after:always; padding:40px; direction:rtl; font-size:14pt; line-height:2.0; text-align:justify; background:#fff; min-height:100%;">
            ${p.replace(/\n/g, '<br/>')}
            <div style="margin-top:50px; text-align:center; font-size:10pt; color:#888; border-top:1px solid #eee; padding-top:10px;">صفحة ${idx + 1} من ${pagesText.length}</div>
          </div>
        `).join('');
        printHtml = `<html><head><meta charset="utf-8"/><title>${fileName}</title><link href="https://fonts.googleapis.com/css2?family=Amiri&display=swap" rel="stylesheet"></head><body style="margin:0; background:#fff;">${pagesHtml}</body></html>`;
      } else if (mode === 'html' && blobUrl) {
        printHtml = `<html><body style="margin:0;"><iframe src="${blobUrl}" style="width:100%;height:100vh;border:none;"></iframe></body></html>`;
      }

      const hasElectronApi = typeof window !== 'undefined' && (window as any).electronAPI && typeof (window as any).electronAPI.print === 'function';
      if (hasElectronApi) {
        await (window as any).electronAPI.print(printHtml, fileName);
      } else {
        const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) {
          win.addEventListener('load', () => URL.revokeObjectURL(blobUrl));
        }
      }
    } catch (err) {
      console.error('[FileViewer Print Error]:', err);
      await showAlert('تعذّر طباعة الملف.');
    } finally {
      setIsLoadingText(false);
    }
  };

  // Highlights search query
  const getHighlightedHtml = (text: string, query: string) => {
    if (!query.trim()) return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    let matchCounter = 0;
    
    const highlighted = parts.map((part) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        matchCounter++;
        const isCurrent = matchCounter === currentMatchIndex;
        return `<mark class="search-match ${isCurrent ? 'current-match' : ''}" style="background: ${isCurrent ? '#f59e0b' : '#fef08a'}; color: #1a1a1a; border-radius: 2px; padding: 0 2px; font-weight: bold; border: ${isCurrent ? '1px solid #d97706' : 'none'}">${part}</mark>`;
      }
      return part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }).join('');

    if (searchMatches !== matchCounter) {
      setTimeout(() => setSearchMatches(matchCounter), 0);
    }
    return highlighted;
  };

  useEffect(() => {
    setCurrentMatchIndex(1);
    setSearchMatches(0);
  }, [searchText, aiSearchText]);

  const handleNextMatch = () => {
    if (searchMatches === 0) return;
    setCurrentMatchIndex(prev => (prev >= searchMatches ? 1 : prev + 1));
  };

  const handlePrevMatch = () => {
    if (searchMatches === 0) return;
    setCurrentMatchIndex(prev => (prev <= 1 ? searchMatches : prev - 1));
  };

  const handleNextPage = () => {
    if (currentPage >= totalPages) return;
    if (layoutMode === 'double' || layoutMode === 'book3d') {
      setCurrentPage(p => Math.min(totalPages, p + 2));
    } else {
      setCurrentPage(p => Math.min(totalPages, p + 1));
    }
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    if (layoutMode === 'double' || layoutMode === 'book3d') {
      setCurrentPage(p => Math.max(1, p - 2));
    } else {
      setCurrentPage(p => Math.max(1, p - 1));
    }
  };

  const leftDocxPageIdx = currentPage % 2 === 1 ? (currentPage === 1 ? null : currentPage - 2) : currentPage - 1;
  const rightDocxPageIdx = currentPage % 2 === 1 ? currentPage - 1 : currentPage;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: 'rgba(5,6,10,0.85)', backdropFilter: 'blur(16px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`flex flex-col bg-[#0f1117] text-white shadow-2xl transition-all duration-300 ${
          isFullscreen ? 'fixed inset-0 rounded-none' : 'rounded-3xl w-[96vw] max-w-6xl h-[92vh]'
        }`}
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* ─── Top Header Bar ─── */}
        <div
          className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3.5 shrink-0 gap-4 bg-[#141722]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', borderRadius: isFullscreen ? 0 : '1.5rem 1.5rem 0 0' }}
        >
          {/* File Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shrink-0 select-none shadow-lg"
              style={{ background: fileColor, fontSize: extLabel.length > 4 ? 8 : 11 }}
            >
              {extLabel.slice(0, 4)}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white truncate max-w-[280px]" title={fileName}>{fileName}</h3>
              <p className="text-[10px] text-slate-400">
                {fileSize && <>{fileSize} · </>}
                {mode === 'pdf' && 'مستند PDF'}
                {mode === 'image' && 'صورة ضوئية'}
                {mode === 'text' && 'ملف نصي'}
                {mode === 'word' && 'مستند Word (DOCX)'}
                {mode === 'doc-legacy' && 'مستند Word القديم (DOC)'}
                {mode === 'html' && 'صفحة ويب'}
                {mode === 'unsupported' && 'مرفق'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#1e2330] p-1 rounded-xl border border-slate-700/30 self-center">
            <button
              onClick={() => setTab('preview')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${tab === 'preview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              المعاين الذكي والمطالعة
            </button>
            <button
              onClick={() => setTab('ai-ocr')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'ai-ocr' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              البحث الذكي والاستخراج (Gemini)
            </button>
          </div>

          {/* Mode Selector and Actions */}
          <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
            {/* Layout mode selector for pdf / word / text */}
            {tab === 'preview' && (mode === 'pdf' || mode === 'word' || mode === 'text') && (
              <div className="flex bg-[#1e2330] p-0.5 rounded-lg border border-slate-700/40 text-[10px] font-bold text-slate-400">
                <button
                  onClick={() => setLayoutMode('book3d')}
                  className={`px-2 py-1 rounded cursor-pointer transition ${layoutMode === 'book3d' ? 'bg-indigo-600 text-white shadow' : 'hover:text-white'}`}
                  title="عرض كتاب ثلاثي الأبعاد"
                >
                  📖 كتاب 3D
                </button>
                <button
                  onClick={() => setLayoutMode('double')}
                  className={`px-2 py-1 rounded cursor-pointer transition ${layoutMode === 'double' ? 'bg-indigo-600 text-white shadow' : 'hover:text-white'}`}
                  title="صفحتان متجاورتان"
                >
                  ⊟ صفحتان
                </button>
                <button
                  onClick={() => setLayoutMode('single')}
                  className={`px-2 py-1 rounded cursor-pointer transition ${layoutMode === 'single' ? 'bg-indigo-600 text-white shadow' : 'hover:text-white'}`}
                  title="صفحة واحدة"
                >
                  ▭ صفحة
                </button>
                <button
                  onClick={() => setLayoutMode('scroll')}
                  className={`px-2 py-1 rounded cursor-pointer transition ${layoutMode === 'scroll' ? 'bg-indigo-600 text-white shadow' : 'hover:text-white'}`}
                  title="عرض التمرير الكامل"
                >
                  ≡ تمرير
                </button>
              </div>
            )}

            {/* PDF Zoom Controls */}
            {tab === 'preview' && mode === 'pdf' && (
              <div className="flex items-center gap-0.5 bg-[#1e2330] p-0.5 rounded-lg border border-slate-700/40">
                <button
                  onClick={() => setZoom(z => Math.max(0.2, parseFloat((z - 0.1).toFixed(2))))}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  title="تصغير العرض"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer min-w-[46px] text-center"
                  title="إعادة ضبط التكبير إلى 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom(z => Math.min(5, parseFloat((z + 0.1).toFixed(2))))}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  title="تكبير العرض"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-0.5" />
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  title="تدوير الصفحة"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Print & Download & Fullscreen */}
            <button onClick={handlePrint} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer" title="طباعة المستند المنسق">
              <Printer className="w-4 h-4" />
            </button>

            <a href={fileDataUrl} download={fileName} className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition" title="تحميل الملف الأصلي">
              <Download className="w-4 h-4" />
            </a>

            <button onClick={() => setIsFullscreen(f => !f)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer" title="ملء الشاشة">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer" title="إغلاق">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Main Content Area ─── */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-[#0b0c10]">
          
          {tab === 'preview' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Pagination Controls */}
              {layoutMode !== 'scroll' && totalPages > 0 && (
                <div className="bg-[#12151e] border-b border-white/5 px-5 py-2 flex items-center justify-between text-xs text-slate-400 shrink-0 select-none">
                  <button 
                    disabled={currentPage <= 1}
                    onClick={handlePrevPage}
                    className="flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-bold"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> الصفحة السابقة
                  </button>

                  <span className="font-bold font-mono">
                    الصفحة {currentPage} من {totalPages}
                  </span>

                  <button 
                    disabled={currentPage >= totalPages}
                    onClick={handleNextPage}
                    className="flex items-center gap-1 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-bold"
                  >
                    الصفحة التالية <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* PDF Previewer */}
              {mode === 'pdf' && (
                <div className="flex-1 overflow-hidden">
                  <PdfViewer
                    dataUrl={fileDataUrl}
                    fileName={fileName}
                    layoutMode={layoutMode}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    zoom={zoom}
                    rotation={rotation}
                    setNumPages={setPdfNumPages}
                  />
                </div>
              )}

              {/* Image Previewer */}
              {mode === 'image' && (
                <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-slate-950/20">
                  <img
                    src={fileDataUrl}
                    alt={fileName}
                    className="max-w-[90%] max-h-[90%] object-contain rounded-2xl shadow-2xl border border-white/10"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                </div>
              )}

              {/* Text, Word, and Fallback formatted paper previewer */}
              {(mode === 'text' || mode === 'word') && (
                <div className="flex-1 overflow-hidden relative">
                  
                  {isLoadingText || isLoadingDocx ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0f1117]">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-xs text-slate-400">جاري قراءة محتويات المستند وتنسيقه...</p>
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-y-auto">
                      
                      {/* Scrolling page layout */}
                      {layoutMode === 'scroll' && (
                        <div className="p-8 space-y-6 flex flex-col items-center bg-[#0d0f14]/50">
                          {textPages.map((pageText, idx) => (
                            <div 
                              key={idx} 
                              className="w-full max-w-2xl bg-[#fdfaf2] text-[#2c1a04] p-10 shadow-2xl border border-slate-300/30 rounded-2xl relative min-h-[600px] flex flex-col justify-between"
                              dir="rtl"
                            >
                              <div className="text-justify leading-loose text-sm whitespace-pre-wrap select-text">
                                {pageText}
                              </div>
                              <div className="mt-8 text-center text-[10px] text-slate-400 font-bold border-t border-slate-200/50 pt-3">
                                صفحة {idx + 1} من {textPages.length}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Single Page layout */}
                      {layoutMode === 'single' && (
                        <div className="h-full flex items-center justify-center p-6 bg-[#0d0f14]/50">
                          <div 
                            className="w-full max-w-xl bg-[#fdfaf2] text-[#2c1a04] p-10 shadow-2xl border border-slate-300/30 rounded-2xl relative min-h-[500px] flex flex-col justify-between"
                            dir="rtl"
                          >
                            <div className="text-justify leading-loose text-sm whitespace-pre-wrap select-text">
                              {textPages[currentPage - 1]}
                            </div>
                            <div className="mt-6 text-center text-[10px] text-slate-400 font-bold border-t border-slate-200/50 pt-3">
                              صفحة {currentPage} من {textPages.length}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Double page layout */}
                      {layoutMode === 'double' && (
                        <div className="h-full flex items-center justify-center p-6 bg-[#0d0f14]/50">
                          <div className="flex gap-6 w-full max-w-5xl justify-center items-stretch">
                            {/* Left Page (Even) */}
                            {leftDocxPageIdx !== null && leftDocxPageIdx < textPages.length ? (
                              <div 
                                className="flex-1 bg-[#fdfaf2] text-[#2c1a04] p-10 shadow-2xl border border-slate-300/30 rounded-2xl relative min-h-[500px] flex flex-col justify-between"
                                dir="rtl"
                              >
                                <div className="text-justify leading-loose text-sm whitespace-pre-wrap select-text">
                                  {textPages[leftDocxPageIdx]}
                                </div>
                                <div className="mt-6 text-center text-[10px] text-slate-400 font-bold border-t border-slate-200/50 pt-3">
                                  صفحة {leftDocxPageIdx + 1}
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1" />
                            )}

                            {/* Right Page (Odd) */}
                            {rightDocxPageIdx < textPages.length ? (
                              <div 
                                className="flex-1 bg-[#fdfaf2] text-[#2c1a04] p-10 shadow-2xl border border-slate-300/30 rounded-2xl relative min-h-[500px] flex flex-col justify-between"
                                dir="rtl"
                              >
                                <div className="text-justify leading-loose text-sm whitespace-pre-wrap select-text">
                                  {textPages[rightDocxPageIdx]}
                                </div>
                                <div className="mt-6 text-center text-[10px] text-slate-400 font-bold border-t border-slate-200/50 pt-3">
                                  صفحة {rightDocxPageIdx + 1}
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3D Book Layout */}
                      {layoutMode === 'book3d' && (
                        <div className="h-full flex items-center justify-center p-8 bg-[#07080a]/90">
                          <div className="perspective-[1500px] w-full max-w-5xl flex justify-center">
                            <div 
                              className="relative flex p-3.5 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] border border-indigo-950/20 bg-gradient-to-br from-[#2b1712] to-[#120705] select-none"
                              style={{
                                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.7), 0 25px 60px -10px rgba(0,0,0,0.8)'
                              }}
                            >
                              <div className="absolute inset-2 border border-indigo-500/10 rounded-xl pointer-events-none" />

                              <div className="flex relative bg-[#faf8f5] rounded-lg overflow-hidden border border-slate-300/80">
                                {/* Spine shadow */}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/0 via-black/30 to-black/0 z-20 pointer-events-none" />

                                {/* Left Page (Even) */}
                                {leftDocxPageIdx !== null && leftDocxPageIdx < textPages.length ? (
                              <div 
                                className="flex-1 bg-[#fdfaf2] text-[#2c1a04] p-10 shadow-2xl border border-slate-300/30 rounded-2xl relative min-h-[500px] flex flex-col justify-between"
                                dir="rtl"
                                  >
                                    <div className="text-justify leading-loose text-[12.5px] whitespace-pre-wrap select-text">
                                      {textPages[leftDocxPageIdx]}
                                    </div>
                                    <div className="mt-4 text-center text-[9px] text-slate-400 font-bold font-mono">
                                      {leftDocxPageIdx + 1}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-8 w-[380px] min-h-[460px] border-r border-slate-200/50 bg-[#e3d1bc]/20 text-slate-400 text-center flex items-center justify-center font-bold text-xs">
                                    منصة المحامي
                                  </div>
                                )}

                                {/* Right Page (Odd) */}
                                {rightDocxPageIdx < textPages.length ? (
                                  <div 
                                    className="p-8 w-[380px] min-h-[460px] border-r border-slate-200/50 bg-[#fdfaf2] text-[#2c1a04] relative flex flex-col justify-between"
                                    dir="rtl"
                                  >
                                    <div className="text-justify leading-loose text-[12.5px] whitespace-pre-wrap select-text">
                                      {textPages[rightDocxPageIdx]}
                                    </div>
                                    <div className="mt-4 text-center text-[9px] text-slate-400 font-bold font-mono">
                                      {rightDocxPageIdx + 1}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-8 w-[380px] min-h-[460px] bg-[#e3d1bc]/20 text-slate-400 text-center flex items-center justify-center font-bold text-xs">
                                    نهاية المستند
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                    </div>
                  )}

                </div>
              )}


              {/* HTML frame viewer */}
              {mode === 'html' && (
                <div className="flex-1">
                  {blobUrl ? (
                    <iframe
                      src={blobUrl}
                      title={fileName}
                      className="w-full h-full border-0 bg-white"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                  )}
                </div>
              )}

              {/* Legacy .doc file — not parseable in browser (OLE binary format) */}
              {mode === 'doc-legacy' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-[#0d0f14]">
                  <div
                    className="w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-xl"
                    style={{ background: '#2b5ce6', boxShadow: '0 0 40px rgba(43,92,230,0.3)' }}
                  >
                    <FileText className="w-10 h-10 text-white" />
                    <span className="text-[9px] text-white/75 font-bold">DOC</span>
                  </div>

                  <div className="text-center space-y-3 max-w-md" dir="rtl">
                    <p className="text-sm font-bold text-white">{fileName}</p>
                    {fileSize && <p className="text-[10px] text-slate-500">{fileSize}</p>}

                    <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-xl text-end space-y-2">
                      <p className="text-[11.5px] text-indigo-300 font-bold flex items-center gap-1.5">
                        ⚠️ ملف Word القديم (.doc)
                      </p>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed">
                        ملفات <strong>.doc</strong> القديمة تستخدم صيغة OLE ثنائية مغلقة لا يمكن عرضها مباشرة في المتصفح.
                        يمكنك إما <strong>تحميل الملف وفتحه في Microsoft Word</strong>، أو استخدام
                        <strong> الاستخراج الذكي بـ Gemini AI</strong> لقراءة محتواه النصي.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                      <a
                        href={fileDataUrl}
                        download={fileName}
                        className="px-5 py-2.5 bg-[#2b5ce6] hover:bg-[#3b6cf0] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-lg"
                      >
                        <Download className="w-4 h-4" /> تحميل الملف للفتح الخارجي
                      </a>
                      <button
                        onClick={() => setTab('ai-ocr')}
                        className="px-5 py-2.5 bg-gradient-to-r from-violet-700 to-indigo-700 hover:from-violet-600 hover:to-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-lg cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-300" /> استخراج ذكي بـ Gemini AI
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}


          {/* AI OCR Tab */}
          {tab === 'ai-ocr' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0d12]" dir="rtl">
              {!aiText && !isExtracting && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto gap-5">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 animate-pulse border border-indigo-500/20">
                    <Brain className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-white">استخراج وقراءة النصوص بالذكاء الاصطناعي</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      هذا الملف لا يحتوي على نصوص قابلة للبحث مباشرة (مثل الصوѡ ملفات المسح الضوئي، أو ملفات PDF المغلقة).
                      بإمكان ذكاء Gemini الاصطناعي قراءة المستند كاملاً واستخراج نصوصه وجداوله لتتمكن من البحث فيه بشكل كامل.
                    </p>
                  </div>
                  {aiError && (
                    <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-[11px] text-end flex items-start gap-2 w-full">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{aiError}</span>
                    </div>
                  )}
                  <button
                    onClick={handleExtractText}
                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-950 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    استخراج النصوص وبدء البحث الذكي
                  </button>
                </div>
              )}

              {isExtracting && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">جاري معالجة المستند بذكاء Gemini AI...</p>
                    <p className="text-[10px] text-slate-500">نقوم الآن بـ OCR واستخراج النصوص وتصفية الكلمات والجداول...</p>
                  </div>
                </div>
              )}

              {aiText && !isExtracting && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 bg-[#11141e] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                      <div className="relative flex-1">
                        <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                        <input
                          value={aiSearchText}
                          onChange={e => setAiSearchText(e.target.value)}
                          placeholder="ابحث بالحرف أو بالكلمة بالكامل داخل المستند المستخرج..."
                          className="w-full bg-white/5 border border-indigo-950 rounded-xl pe-10 ps-8 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50"
                        />
                        {aiSearchText && (
                          <button onClick={() => setAiSearchText('')} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      {aiSearchText && searchMatches > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/30">
                          <span>{currentMatchIndex} من {searchMatches} مطابقة</span>
                          <button onClick={handlePrevMatch} className="p-0.5 hover:bg-white/10 rounded me-1" title="المطابقة السابقة"><ArrowRight className="w-3.5 h-3.5" /></button>
                          <button onClick={handleNextMatch} className="p-0.5 hover:bg-white/10 rounded" title="المطابقة التالية"><ArrowLeft className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyText(aiText, setAiCopied)}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold rounded-xl flex items-center gap-1 transition"
                      >
                        {aiCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        نسخ النص المستخرج
                      </button>
                      <button
                        onClick={handleExtractText}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold rounded-xl flex items-center gap-1 transition"
                        title="إعادة تشغيل استخراج النصوص لتحديث النتائج"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        تحديث الـ OCR
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-[#0c0e14]">
                    <div className="max-w-3xl mx-auto bg-[#11141e] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl">
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Brain className="w-3 h-3 text-indigo-300 animate-pulse" />
                          نص مستخرج بالكامل ذكياً
                        </span>
                        <span className="text-[10px] text-slate-500">دقة عالية · حرف بحرف</span>
                      </div>
                      
                      <div 
                        className="text-xs md:text-sm text-slate-200 leading-relaxed text-justify whitespace-pre-wrap font-sans select-text select-all"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(getHighlightedHtml(aiText, aiSearchText)) }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ─── Status Bar ─── */}
        <div
          className="flex items-center justify-between px-5 py-2.5 shrink-0 text-[10px] text-slate-500"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: '#13161f',
            borderRadius: isFullscreen ? 0 : '0 0 1.5rem 1.5rem'
          }}
        >
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: fileColor }} />
            <span>عرض المستند: {fileName}</span>
            {tab === 'ai-ocr' && aiText && (
              <>
                <span className="text-slate-700">|</span>
                <span className="text-indigo-400 font-bold">مستند مفهرس بالذكاء الاصطناعي وقابل للبحث بالكامل</span>
              </>
            )}
          </span>
          <span className="font-mono text-slate-600">منصة المحامي الرقمية</span>
        </div>
      </div>
    </div>
  );
});

export default FileViewer;
