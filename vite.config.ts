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
      // رفع حد تحذير حجم الـ chunk الأساسي إلى 1500 كيلوبايت (الافتراضي 500)
      chunkSizeWarningLimit: 1500,
      // تقسيم المكتبات الثقيلة إلى chunks منفصلة لتحسين التحميل والتخزين المؤقت
      rollupOptions: {
        output: {
          manualChunks: {
            'pdf-vendor': ['jspdf', 'html2canvas'],
            'charts-vendor': ['recharts'],
            'ui-vendor': ['lucide-react', 'qrcode.react', 'minisearch'],
          },
        },
      },
    },
  };
});
