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
      chunkSizeWarningLimit: 800,
      // تقسيم المكتبات الثقيلة إلى chunks منفصلة لتحسين التحميل والتخزين المؤقت
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // PDF libs — يُحمَّل فقط عند استخدام PDF
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('pdfjs-dist') || id.includes('react-pdf')) {
              return 'pdf-vendor';
            }
            // Charts — يُحمَّل فقط عند فتح التقارير
            if (id.includes('recharts')) {
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
            // Firebase SDK — منفصل لأنه ثابت نادراً يتغير
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            // UI components
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
