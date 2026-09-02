import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 1200,
      // تقسيم المكتبات الثقيلة إلى chunks منفصلة لتحسين التحميل والتخزين المؤقت
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // PDF Export (jsPDF + html2canvas) — يُحمَّل فقط عند تصدير المستندات
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-export-vendor';
            }
            // PDF Viewer (pdfjs-dist + react-pdf) — يُحمَّل فقط عند استعراض الـ PDF
            if (id.includes('pdfjs-dist') || id.includes('react-pdf')) {
              return 'pdf-viewer-vendor';
            }
            // Charts — يُحمَّل فقط عند فتح التقارير
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts-vendor';
            }
            // Calendar — يُحمَّل فقط عند فتح التقويم
            if (id.includes('@fullcalendar') || id.includes('fullcalendar')) {
              return 'calendar-vendor';
            }
            // DnD Kit
            if (id.includes('@dnd-kit')) {
              return 'dnd-vendor';
            }
            // Firebase Firestore (قاعدة البيانات السحابية)
            if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) {
              return 'firebase-firestore-vendor';
            }
            // Firebase Auth & Core SDK
            if (id.includes('firebase')) {
              return 'firebase-core-vendor';
            }
            // UI components & icons
            if (id.includes('lucide-react') || id.includes('qrcode.react') || id.includes('minisearch')) {
              return 'ui-vendor';
            }
            // React core
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-vendor';
            }
          },
        },
      },
    },
  };
});
