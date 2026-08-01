import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, AlertCircle, Download } from 'lucide-react';

let pdfjsLib: any = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  try {
    const pdfjs = await import('pdfjs-dist');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      try {
        const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      } catch (e) { console.error('PdfViewer error', e);
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
      }
    }
    pdfjsLib = pdfjs;
    return pdfjsLib;
  } catch (err) {
    console.error('[PdfViewer] فشل تحميل PDF.js:', err);
    throw err;
  }
}

// ─── Single PDF Page rendered to canvas ───────────────────────────────────────
interface PdfPageProps {
  pdfDoc: any;
  pageNumber: number;
  /** Target width in pixels (used as scale basis) */
  targetWidth?: number;
  /** Extra user zoom multiplier (1 = normal) */
  userZoom: number;
  rotation: number;
  onPageSize?: (w: number, h: number) => void;
}

function PdfPage({ pdfDoc, pageNumber, targetWidth, userZoom, rotation, onPageSize }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!active) return;

        // Natural viewport at scale=1
        const naturalVP = page.getViewport({ scale: 1, rotation });
        const naturalW = naturalVP.width;
        const naturalH = naturalVP.height;

        // Compute scale so the page fits targetWidth (default: 600px for scroll, set per layout)
        const baseWidth = targetWidth || 600;
        const scale = (baseWidth / naturalW) * userZoom;

        const viewport = page.getViewport({ scale, rotation });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const canvas = canvasRef.current;
        if (!canvas || !active) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (renderTaskRef.current) renderTaskRef.current.cancel();

        const renderTask = page.render({ canvasContext: ctx, viewport, intent: 'display' });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (active) {
          setIsLoading(false);
          setDims({ w: viewport.width, h: viewport.height });
          if (onPageSize) onPageSize(viewport.width, viewport.height);
        }
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException' && active) {
          setError('تعذّر رسم الصفحة');
          setIsLoading(false);
        }
      }
    };

    render();

    return () => {
      active = false;
      if (renderTaskRef.current) renderTaskRef.current.cancel();
    };
  }, [pdfDoc, pageNumber, targetWidth, userZoom, rotation, onPageSize]);

  return (
    <div
      className="relative flex items-center justify-center bg-white overflow-hidden select-none shrink-0"
      style={{
        width: dims.w || undefined,
        height: dims.h || undefined,
        boxShadow: '0 4px 30px rgba(0,0,0,0.45)',
        borderRadius: 2,
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 bg-red-50 text-[10px] font-bold text-center p-2 z-10">
          <AlertCircle className="w-4 h-4 mb-1" />{error}
        </div>
      )}
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

// ─── Container size hook ───────────────────────────────────────────────────────
function useContainerSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(ref.current);
    setSize({ w: ref.current.clientWidth, h: ref.current.clientHeight });
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// ─── Main PdfViewer ────────────────────────────────────────────────────────────
interface PdfViewerProps {
  dataUrl: string;
  fileName?: string;
  layoutMode: 'scroll' | 'single' | 'double' | 'book3d';
  currentPage: number;
  setCurrentPage: (page: number) => void;
  zoom: number;  // 1 = 100%, 0.5 = 50%, 2 = 200% etc.
  rotation: number;
  setNumPages: (pages: number) => void;
}

const PdfViewer = React.memo(function PdfViewer({
  dataUrl,
  fileName = 'document.pdf',
  layoutMode,
  currentPage,
  setCurrentPage,
  zoom,
  rotation,
  setNumPages,
}: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPagesLocal, setNumPagesLocal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Container refs for auto-sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useContainerSize(containerRef);

  // Load PDF
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const pdfjs = await getPdfJs();
        let pdfSource: Uint8Array | string;

        if (dataUrl.startsWith('data:')) {
          const base64 = dataUrl.split(',')[1];
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          pdfSource = bytes;
        } else {
          pdfSource = dataUrl;
        }

        const pdf = await pdfjs.getDocument({
          data: pdfSource instanceof Uint8Array ? pdfSource : undefined,
          url: typeof pdfSource === 'string' ? pdfSource : undefined,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.4.168/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.4.168/standard_fonts/',
        }).promise;

        if (active) {
          setPdfDoc(pdf);
          setNumPagesLocal(pdf.numPages);
          setNumPages(pdf.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'تعذّر تحميل ملف PDF');
          setLoading(false);
        }
      }
    };

    load();
    return () => { active = false; };
  }, [dataUrl, setNumPages]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#0d1117]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">جاري تحميل المستند PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#0d1117] text-center p-8">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-sm font-bold text-red-300">تعذّر عرض ملف الـ PDF</p>
        <p className="text-[10px] text-slate-500 max-w-xs">{error}</p>
        <a href={dataUrl} download={fileName}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-xl flex items-center gap-2 transition"
        >
          <Download className="w-3.5 h-3.5" /> تحميل الملف
        </a>
      </div>
    );
  }

  // Pages for spread layouts
  const leftPage = currentPage % 2 === 1 ? (currentPage === 1 ? null : currentPage - 1) : currentPage;
  const rightPage = currentPage % 2 === 1 ? currentPage : currentPage + 1;

  // ─── Auto-fit target width calculations ───────────────────────────────────
  // For single/double/book3d: fit the page within the available container.
  // Padding is accounted for.
  const padH = 64; // horizontal padding
  const padV = 80; // vertical padding (reserved for nav bar + bottom)

  // single: fill most of the container
  const singleTargetW = Math.max(200, (containerSize.w - padH));

  // double: two pages side by side with gap
  const doubleTargetW = Math.max(150, (containerSize.w - padH - 32) / 2);

  // book3d: two pages inside the book frame
  const bookTargetW = Math.max(120, (containerSize.w - padH - 80) / 2);

  // scroll: fixed comfortable reading width
  const scrollTargetW = Math.min(700, Math.max(300, containerSize.w - padH));

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-[#13161f] relative flex flex-col">

      {/* ─── SCROLL MODE ─────────────────────────────────────────────────── */}
      {layoutMode === 'scroll' && (
        <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center gap-6">
          {Array.from({ length: numPagesLocal }, (_, i) => (
            <div key={i + 1} className="relative group">
              <PdfPage
                pdfDoc={pdfDoc}
                pageNumber={i + 1}
                targetWidth={scrollTargetW}
                userZoom={zoom}
                rotation={rotation}
              />
              <div className="mt-1.5 text-center text-[9px] text-slate-500 font-mono">
                صفحة {i + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── SINGLE PAGE MODE ─────────────────────────────────────────────── */}
      {layoutMode === 'single' && (
        <div className="flex-1 overflow-auto flex items-start justify-center p-6">
          <div
            key={currentPage}
            className="flex flex-col items-center"
          >
            <PdfPage
              pdfDoc={pdfDoc}
              pageNumber={currentPage}
              targetWidth={singleTargetW}
              userZoom={zoom}
              rotation={rotation}
            />
            <div className="mt-3 text-[10px] text-slate-500 font-mono text-center">
              صفحة {currentPage} من {numPagesLocal}
            </div>
          </div>
        </div>
      )}

      {/* ─── DOUBLE PAGE MODE ─────────────────────────────────────────────── */}
      {layoutMode === 'double' && (
        <div className="flex-1 overflow-auto flex items-start justify-center p-6">
          <div className="flex gap-4 items-start">
            {/* Left Page */}
            <div className="flex flex-col items-center">
              {leftPage !== null && leftPage <= numPagesLocal ? (
                <>
                  <PdfPage
                    pdfDoc={pdfDoc}
                    pageNumber={leftPage}
                    targetWidth={doubleTargetW}
                    userZoom={zoom}
                    rotation={rotation}
                  />
                  <div className="mt-2 text-[9px] text-slate-500 font-mono">{leftPage}</div>
                </>
              ) : (
                <div
                  style={{ width: doubleTargetW * zoom, minHeight: 200 }}
                  className="bg-slate-900/20 rounded"
                />
              )}
            </div>

            {/* Right Page */}
            <div className="flex flex-col items-center">
              {rightPage <= numPagesLocal ? (
                <>
                  <PdfPage
                    pdfDoc={pdfDoc}
                    pageNumber={rightPage}
                    targetWidth={doubleTargetW}
                    userZoom={zoom}
                    rotation={rotation}
                  />
                  <div className="mt-2 text-[9px] text-slate-500 font-mono">{rightPage}</div>
                </>
              ) : (
                <div
                  style={{ width: doubleTargetW * zoom, minHeight: 200 }}
                  className="bg-slate-900/20 rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── BOOK 3D MODE ─────────────────────────────────────────────────── */}
      {layoutMode === 'book3d' && (
        <div className="flex-1 overflow-auto flex items-start justify-center p-6 bg-[#080a0f]"
          style={{ backgroundImage: 'radial-gradient(ellipse at center, #12151f 0%, #060709 100%)' }}
        >
          {/* Book Wrapper */}
          <div
            className="relative flex rounded-2xl select-none"
            style={{
              background: 'linear-gradient(135deg, #2b1a10 0%, #160b05 100%)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9), 0 30px 80px -10px rgba(0,0,0,0.9), 0 0 0 1px rgba(180,120,60,0.08)',
              padding: '12px',
            }}
          >
            {/* Decorative gold border */}
            <div
              className="absolute inset-[10px] rounded-xl pointer-events-none"
              style={{ border: '1px solid rgba(200,150,60,0.12)' }}
            />

            {/* Pages container */}
            <div
              className="flex relative rounded-lg overflow-hidden"
              style={{ background: '#f5f0e8', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)' }}
            >
              {/* Spine shadow */}
              <div
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                style={{
                  width: 24,
                  background: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0) 100%)',
                }}
              />

              {/* Left Page */}
              <div
                className="flex flex-col items-center justify-start p-3 border-r border-slate-200/60"
                style={{ background: '#fdfaf2', minWidth: bookTargetW * zoom + 24 }}
              >
                {leftPage !== null && leftPage <= numPagesLocal ? (
                  <>
                    <PdfPage
                      pdfDoc={pdfDoc}
                      pageNumber={leftPage}
                      targetWidth={bookTargetW}
                      userZoom={zoom}
                      rotation={rotation}
                    />
                    <div className="mt-2 text-[9px] text-slate-400 font-mono">{leftPage}</div>
                  </>
                ) : (
                  <div
                    className="flex items-center justify-center text-slate-400 text-[11px] font-bold"
                    style={{ width: bookTargetW * zoom, minHeight: 300 }}
                  >
                    منصة المحامي الرقمية
                  </div>
                )}
              </div>

              {/* Right Page */}
              <div
                className="flex flex-col items-center justify-start p-3"
                style={{ background: '#fdfaf2', minWidth: bookTargetW * zoom + 24 }}
              >
                {rightPage <= numPagesLocal ? (
                  <>
                    <PdfPage
                      pdfDoc={pdfDoc}
                      pageNumber={rightPage}
                      targetWidth={bookTargetW}
                      userZoom={zoom}
                      rotation={rotation}
                    />
                    <div className="mt-2 text-[9px] text-slate-400 font-mono">{rightPage}</div>
                  </>
                ) : (
                  <div
                    className="flex items-center justify-center text-slate-400 text-[11px] font-bold"
                    style={{ width: bookTargetW * zoom, minHeight: 300 }}
                  >
                    نهاية المرجع
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

export default PdfViewer;
