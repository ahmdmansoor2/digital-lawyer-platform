/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Sliders, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  RotateCw, 
  X, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Cpu, 
  Printer, 
  Maximize2,
  FileCheck,
  Zap,
  Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface SmartScannerProps {
  onScanComplete: (scannedFile: {
    name: string;
    fileType: string;
    size: number;
    dataUrl: string;
    uploadedAt: string;
  }) => void;
  onClose: () => void;
  suggestedName?: string;
}

type ScanFilter = 'original' | 'grayscale' | 'photocopy' | 'magic-color' | 'retro-paper';

const SmartScanner = React.memo(function SmartScanner({
  onScanComplete,
  onClose,
  suggestedName = "مسند_ممسوح_ضوئياً"
}: SmartScannerProps) {
  const [scanSource, setScanSource] = useState<'camera' | 'upload'>('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ScanFilter>('magic-color');
  
  // Custom Adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [fileName, setFileName] = useState<string>(suggestedName);
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png' | 'application/pdf'>('application/pdf');

  // Scanner VFX & Feedback
  const [scanningInProgress, setScanningInProgress] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [scannerStatusText, setScannerStatusText] = useState('');
  const [flashActive, setFlashActive] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraPermission(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setCameraPermission(true);
    } catch (err) {
      console.error('Camera access denied or failed:', err);
      setCameraPermission(false);
      setScanSource('upload');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (scanSource === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanSource]);

  // Capture Photo
  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    // Trigger flash animation
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // Handle File upload as Scanner Source
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedImage(event.target.result as string);
          // Set suggested filename without extension
          const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setFileName(`ممسوح_${cleanName}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset Scanner State
  const resetScanner = () => {
    setCapturedImage(null);
    setBrightness(100);
    setContrast(100);
    setRotation(0);
    setSelectedFilter('magic-color');
    if (scanSource === 'camera') {
      startCamera();
    }
  };

  // Core filter logic executed in real time on HTML5 Canvas
  const processImageAndSave = async () => {
    if (!capturedImage) return;
    setScanningInProgress(true);
    setScanningProgress(0);

    const steps = [
      { progress: 15, text: 'تحميل مصفوفة الصورة الخام...' },
      { progress: 40, text: 'تطبيق التصفية الرقمية وحذف الشوائب...' },
      { progress: 65, text: 'تعديل التباين والسطوع وتحسين التكبير البصري...' },
      { progress: 85, text: 'تجميع المستند وصقل الترويسة...' },
      { progress: 100, text: 'تصدير المستند بالصيغة المطلوبة آمنياً...' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));
      setScanningProgress(step.progress);
      setScannerStatusText(step.text);
    }

    // Real processing on offscreen canvas
    const img = new Image();
    img.src = capturedImage;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply rotation dimensions
    if (rotation === 90 || rotation === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    // Translate and rotate canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Apply Filter & Adjustments via ImageData pixel manipulation for pixel-perfect results
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Apply Filters
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i+1];
      let b = data[i+2];

      // 1. Basic Grayscale
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (selectedFilter === 'grayscale') {
        r = g = b = gray;
      } 
      // 2. High Contrast Monochrome Photocopy
      else if (selectedFilter === 'photocopy') {
        const threshold = 128;
        // Increase contrast dramatically
        const mono = gray > threshold ? 255 : 0;
        r = g = b = mono;
      } 
      // 3. Magic Color (Optimized scanner color output)
      else if (selectedFilter === 'magic-color') {
        // Boost whites and darks, increase saturation
        r = Math.min(255, Math.max(0, (r - 128) * 1.25 + 128));
        g = Math.min(255, Math.max(0, (g - 128) * 1.25 + 128));
        b = Math.min(255, Math.max(0, (b - 128) * 1.25 + 128));
        
        // Clean back backgrounds (if pixels are close to white, make them pure white)
        if (r > 200 && g > 200 && b > 200) {
          r = g = b = 255;
        }
      }
      // 4. Retro Egyptian Court Paper Vibe (indigo/sepia-like texture)
      else if (selectedFilter === 'retro-paper') {
        r = Math.min(255, gray * 1.05 + 15);
        g = Math.min(255, gray * 0.95 + 5);
        b = Math.min(255, gray * 0.8);
      }

      // Apply Sqrt adjustments for brightness/contrast
      const bFactor = brightness / 100;
      r = Math.min(255, Math.max(0, r * bFactor));
      g = Math.min(255, Math.max(0, g * bFactor));
      b = Math.min(255, Math.max(0, b * bFactor));

      const cFactor = (contrast - 100) / 100 + 1;
      r = Math.min(255, Math.max(0, (r - 128) * cFactor + 128));
      g = Math.min(255, Math.max(0, (g - 128) * cFactor + 128));
      b = Math.min(255, Math.max(0, (b - 128) * cFactor + 128));

      data[i] = r;
      data[i+1] = g;
      data[i+2] = b;
    }

    ctx.putImageData(imgData, 0, 0);

    // Prepare Output according to format
    let finalDataUrl = '';
    let finalFileType = '';
    let fileSize = 0;

    if (exportFormat === 'application/pdf') {
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      const imgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      pdf.addImage(imgDataUrl, 'JPEG', 0, 0, canvas.width, canvas.height);
      
      const pdfBlob = pdf.output('blob');
      fileSize = pdfBlob.size;
      
      // Convert pdf blob to dataURL
      finalDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(pdfBlob);
      });
      finalFileType = 'application/pdf';
    } else {
      finalFileType = exportFormat;
      finalDataUrl = canvas.toDataURL(exportFormat, 0.92);
      // Estimate size
      const stringLength = finalDataUrl.length - 'data:image/png;base64,'.length;
      fileSize = Math.round(stringLength * 0.75);
    }

    // Complete the callback
    const formattedDate = new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0].substring(0, 5);
    
    // Auto suffix extension if missing
    let finalName = fileName.trim();
    const ext = exportFormat === 'application/pdf' ? '.pdf' : exportFormat === 'image/png' ? '.png' : '.jpg';
    if (!finalName.endsWith(ext)) {
      finalName += ext;
    }

    onScanComplete({
      name: finalName,
      fileType: finalFileType,
      size: fileSize,
      dataUrl: finalDataUrl,
      uploadedAt: formattedDate
    });

    setScanningInProgress(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 z-[200] flex items-center justify-center p-3 font-sans text-end" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header bar */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-white flex items-center gap-2">
                <span>مساعد المسح الضوئي الذكي للمحامين</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                  مطور v3.5
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">أرشفة رقمية بجودة المطابع مع الفلاتر المكتملة وتصدير PDF/صور فوري</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-400 rounded-lg transition"
            title="إغلاق المعالج"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info panel */}
        <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 py-2 text-[10px] text-indigo-300 flex items-center gap-2 font-bold">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>تم ربط المعالج التلقائي. يمكنك الرفع من الذاكرة أو التقاط المستند بالكاميرǡ وسيتكفل المعالج بتبييض الخلفية وصقل الألوان كأنه جهاز سكانر حقيقي!</span>
        </div>

        {/* Content Body Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* Main Stage (Viewport) - Left 7 columns */}
          <div className="lg:col-span-7 bg-slate-950 p-4 flex flex-col items-center justify-center relative min-h-[350px] border-l border-slate-800/60">
            
            {/* Captured image display with active filters */}
            {capturedImage ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center max-h-[55vh]">
                
                {/* CSS Filter simulation wrapper */}
                <div 
                  className={`relative max-w-full max-h-[460px] overflow-hidden rounded-lg shadow-2xl border border-slate-800 bg-white transition-all`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.25s ease'
                  }}
                >
                  <img
                    src={capturedImage}
                    alt="Captured Scan Preview"
                    className={`max-w-full max-h-[460px] object-contain block`}
                    style={{
                      filter: `
                        brightness(${brightness}%) 
                        contrast(${contrast}%)
                        ${selectedFilter === 'grayscale' ? 'grayscale(100%)' : ''}
                        ${selectedFilter === 'photocopy' ? 'grayscale(100%) contrast(300%) brightness(110%)' : ''}
                        ${selectedFilter === 'magic-color' ? 'saturate(130%) contrast(115%)' : ''}
                        ${selectedFilter === 'retro-paper' ? 'sepia(30%) saturate(110%) hue-rotate(340deg) contrast(105%)' : ''}
                      `
                    }}
                  />

                  {/* Scanning scanline animation overlay */}
                  {scanningInProgress && (
                    <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-[scan_1.5s_ease-in-out_infinite]" />
                  )}
                </div>

                <div className="flex gap-2.5 mt-4 z-10">
                  <button
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>تدوير المستند 90°</span>
                  </button>
                  
                  <button
                    onClick={resetScanner}
                    className="bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-rose-500/30"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>مسح وإعادة التقاط</span>
                  </button>
                </div>

              </div>
            ) : (
              /* Input/Capture Mode selection */
              <div className="w-full max-w-md space-y-4">
                
                {/* Mode Selector Tab */}
                <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setScanSource('upload')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                      scanSource === 'upload' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>رفع صورة أو مستند خام</span>
                  </button>

                  <button
                    onClick={() => setScanSource('camera')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
                      scanSource === 'camera' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>الكاميرا الفورية (المحمول/الويب)</span>
                  </button>
                </div>

                {/* Upload Mode Box */}
                {scanSource === 'upload' && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-800 hover:border-indigo-500 bg-slate-900/50 hover:bg-slate-900 rounded-2xl p-12 text-center cursor-pointer transition group flex flex-col items-center justify-center gap-3.5"
                  >
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*"
                    />
                    <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-full group-hover:scale-110 transition duration-300">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">اختر صورة أو ملف لمسحه ضوئياً</h4>
                      <p className="text-[11px] text-slate-400 mt-1">يدعم جميع صيغ الصور وامتداداتها (JPG, PNG, WebP, BMP)</p>
                      <p className="text-[9px] text-indigo-400 mt-2 font-mono">سيتم معالجة الصورة وفلترتها محلياً بشكل فوري</p>
                    </div>
                  </div>
                )}

                {/* Camera Mode Viewfinder */}
                {scanSource === 'camera' && (
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 relative aspect-[4/3] flex flex-col justify-between items-center p-3">
                    
                    {/* Real Video Stream */}
                    <video 
                      ref={videoRef}
                      className={`w-full h-full object-cover rounded-xl ${flashActive ? 'brightness-150 contrast-50' : ''}`}
                      playsInline
                      muted
                    />

                    {/* Laser line overlay */}
                    {cameraActive && (
                      <div className="absolute inset-x-3 h-[2px] bg-red-500 shadow-md shadow-red-500/80 animate-[scan_2s_ease-in-out_infinite]" />
                    )}

                    {/* Visual Crop Guide overlay */}
                    <div className="absolute inset-5 border-2 border-dashed border-white/20 rounded-lg pointer-events-none flex items-center justify-center">
                      <p className="text-[10px] text-white/50 font-bold bg-black/60 px-2 py-1 rounded">ضع المستند داخل هذا النطاق</p>
                    </div>

                    {/* Camera Control Trigger */}
                    {cameraActive && (
                      <div className="absolute bottom-4 flex justify-center w-full z-10">
                        <button
                          onClick={capturePhoto}
                          className="w-14 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer border-4 border-slate-900"
                          title="التقاط المستند"
                        >
                          <Zap className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                        </button>
                      </div>
                    )}

                    {/* Blocked or Initializing Message */}
                    {cameraPermission === false && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-center gap-3">
                        <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full">
                          <X className="w-7 h-7" />
                        </div>
                        <h4 className="text-xs font-extrabold text-rose-300">تعذر الوصول لكاميرا هذا الجهاز</h4>
                        <p className="text-[10.5px] text-slate-400 leading-relaxed">
                          قد يكون المتصفح حظر إذن الكاميرا داخل الإطار (iFrame) أو أن جهازك لا يمتلك كاميرا متصلة. يرجى استخدام خيار <b>"رفع صورة أو مستند خام"</b> لتطبيق فلاتر التصفية باحترافية.
                        </p>
                        <button
                          onClick={() => setScanSource('upload')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          التحويل لخيار الرفع اليدوي
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Simulated Scanning Progress Dialog */}
              {scanningInProgress && (
                <div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 z-50"
                >
                  <div className="w-full max-w-sm space-y-4 text-center">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                      <Cpu className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-sm text-white">جاري محاكاة المسح الضوئي الذكي...</h4>
                      <p className="text-xs text-indigo-400 font-mono h-5">{scannerStatusText}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-l from-indigo-500 to-emerald-400 h-full transition-all duration-300"
                        style={{ width: `${scanningProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 font-mono font-bold block">{scanningProgress}% مكمَل</span>
                  </div>
                </div>
              )}

          </div>

          {/* Scanner Controls Sidebar - Right 5 columns */}
          <div className="lg:col-span-5 bg-slate-900/60 p-5 space-y-5 flex flex-col justify-between overflow-y-auto">
            
            {/* Control Inputs */}
            <div className="space-y-5">
              
              {/* Document Info */}
              <div className="space-y-1.5">
                <label className="block text-[11px] text-slate-400 font-bold">اسم المستند الممسوح ضوئياً</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="مثال: صورة_عقد_البيع_الابتدائي"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-700 bg-slate-950 focus:outline-none focus:border-indigo-500 font-bold text-slate-200"
                  disabled={!capturedImage}
                />
              </div>

              {/* Advanced Image Presets / Filters */}
              <div className="space-y-2">
                <label className="block text-[11px] text-slate-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>فلتر معالجة المستند (Presets)</span>
                </label>
                
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <button
                    onClick={() => setSelectedFilter('magic-color')}
                    className={`p-2.5 rounded-xl border text-end font-bold transition flex items-center justify-between ${
                      selectedFilter === 'magic-color'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 bg-slate-950/45 text-slate-400 hover:text-slate-300'
                    }`}
                    disabled={!capturedImage}
                  >
                    <span>تصفية الألوان السحرية</span>
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    onClick={() => setSelectedFilter('photocopy')}
                    className={`p-2.5 rounded-xl border text-end font-bold transition flex items-center justify-between ${
                      selectedFilter === 'photocopy'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 bg-slate-950/45 text-slate-400 hover:text-slate-300'
                    }`}
                    disabled={!capturedImage}
                  >
                    <span>أبيض وأسود (نسخة ضوئية)</span>
                    <FileCheck className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    onClick={() => setSelectedFilter('grayscale')}
                    className={`p-2.5 rounded-xl border text-end font-bold transition flex items-center justify-between ${
                      selectedFilter === 'grayscale'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 bg-slate-950/45 text-slate-400 hover:text-slate-300'
                    }`}
                    disabled={!capturedImage}
                  >
                    <span>رمادي مستندي ناعم</span>
                    <Sliders className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    onClick={() => setSelectedFilter('retro-paper')}
                    className={`p-2.5 rounded-xl border text-end font-bold transition flex items-center justify-between ${
                      selectedFilter === 'retro-paper'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 bg-slate-950/45 text-slate-400 hover:text-slate-300'
                    }`}
                    disabled={!capturedImage}
                  >
                    <span>ورق محاكم مصري (عتيق)</span>
                    <Zap className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    onClick={() => setSelectedFilter('original')}
                    className={`col-span-2 p-2 rounded-xl border text-center font-bold transition ${
                      selectedFilter === 'original'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 bg-slate-950/45 text-slate-400 hover:text-slate-300'
                    }`}
                    disabled={!capturedImage}
                  >
                    صورة خام أصلية (بدون تصفية)
                  </button>
                </div>
              </div>

              {/* Sliders manual tuning */}
              <div className="space-y-3.5 bg-slate-950/30 p-3.5 rounded-xl border border-slate-800">
                <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">ضبط يدوي دقيق للأحبار والسطوع</h4>
                
                {/* Brightness slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>السطوع</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                    disabled={!capturedImage}
                  />
                </div>

                {/* Contrast slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>درجة التباين (Contrast)</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                    disabled={!capturedImage}
                  />
                </div>
              </div>

              {/* Format Export Selector */}
              <div className="space-y-2">
                <label className="block text-[11px] text-slate-400 font-bold">صيغة وامتداد الملف الناتج</label>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <button
                    onClick={() => setExportFormat('application/pdf')}
                    className={`p-2 rounded-xl border text-center font-bold transition flex flex-col items-center justify-center gap-1 ${
                      exportFormat === 'application/pdf'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-800 bg-slate-950/45 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>ملف PDF</span>
                  </button>

                  <button
                    onClick={() => setExportFormat('image/jpeg')}
                    className={`p-2 rounded-xl border text-center font-bold transition flex flex-col items-center justify-center gap-1 ${
                      exportFormat === 'image/jpeg'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 bg-slate-950/45 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>صورة JPG</span>
                  </button>

                  <button
                    onClick={() => setExportFormat('image/png')}
                    className={`p-2 rounded-xl border text-center font-bold transition flex flex-col items-center justify-center gap-1 ${
                      exportFormat === 'image/png'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-slate-800 bg-slate-950/45 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>صورة PNG</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={processImageAndSave}
                disabled={!capturedImage}
                className={`w-full font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer text-sm ${
                  capturedImage 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/10'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
                id="submit-digital-scan-btn"
              >
                <Check className="h-4.5 w-4.5 animate-bounce" />
                <span>حفظ وأرشفة المستند الممسوح ضوئياً</span>
              </button>

              <button
                onClick={onClose}
                className="w-full bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                إلغاء العملية
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
});

export default SmartScanner;
