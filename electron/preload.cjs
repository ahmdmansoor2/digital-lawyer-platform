const { contextBridge, ipcRenderer } = require('electron');

// Disable Firebase initialization for portable/desktop builds so renderer doesn't try to init Firebase on module load
try {
  // preload runs before renderer scripts; setting a window global here will be visible to renderer
  // this flag is read by src/firebase.ts to avoid initializing Firebase in problematic environments
  window.__disableFirebase = true;
} catch (e) { /* ignore if window not available */ }

// Expose a safe, minimal API bridge to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Send HTML content to the main process to open a native Windows print dialog.
   * @param {string} html - Full HTML document string to print.
   * @param {string} title - Title of the print job.
   */
  print: (html, title) => ipcRenderer.invoke('print-html', { html, title }),

  /**
   * Show a native "Save As" dialog and write binary data to the chosen path.
   */
  saveFile: (defaultFilename, base64Data, mimeType, filters) =>
    ipcRenderer.invoke('save-file', { defaultFilename, base64Data, mimeType, filters }),

  // ============================================================
  // واجهة التخزين الدائم (Disk-based Storage API)
  // ============================================================
  library: {
    read: () => ipcRenderer.invoke('library:read'),
    write: (data) => ipcRenderer.invoke('library:write', { data }),
    getPath: () => ipcRenderer.invoke('library:getPath'),
  },

  // واجهة تخزين بيانات الخصوم
  opponents: {
    read: () => ipcRenderer.invoke('opponents:read'),
    write: (data) => ipcRenderer.invoke('opponents:write', data),
    getPath: () => ipcRenderer.invoke('opponents:getPath'),
  },

  // واجهة تخزين الملاحظات (Notes)
  notes: {
    read: () => ipcRenderer.invoke('notes:read'),
    write: (data) => ipcRenderer.invoke('notes:write', data),
    getPath: () => ipcRenderer.invoke('notes:getPath'),
  },

  // واجهة تخزين الـ Auth & RBAC
  auth: {
    read: (filename) => ipcRenderer.invoke('auth:read', filename),
    write: (filename, data) => ipcRenderer.invoke('auth:write', filename, data),
  },

  /**
   * Write a base64 string to a temporary file on disk for preview.
   */
  writeTempFile: (base64Data, fileName) =>
    ipcRenderer.invoke('write-temp-file', { base64Data, fileName }),

  // ============================================================
  // واجهة نظام الترخيص التجاري
  // ============================================================
  license: {
    check: () => ipcRenderer.invoke('license:check'),
    activate: (token) => ipcRenderer.invoke('license:activate', { token }),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
    onExpired: (callback) => ipcRenderer.on('license:expired', (_, data) => callback(data)),
    offExpired: () => ipcRenderer.removeAllListeners('license:expired'),
  },

  // ─── واجهة النوافذ native البديلة لـ alert/confirm/prompt ──────
  dialogs: {
    alert:    (message) => ipcRenderer.invoke('dialog:alert', message),
    confirm:  (message) => ipcRenderer.invoke('dialog:confirm', message),
    prompt:   (message, defaultValue) => ipcRenderer.invoke('dialog:prompt', message, defaultValue),
  },

  // ─── تسجيل الدخول بـ Google عبر نافذة Electron أصلية ──────────
  google: {
    login: () => ipcRenderer.invoke('auth:google-login', {
      apiKey: 'AIzaSyCYzLif-sT3dFqezeHJnRvK0o52ENBMzu4',
      authDomain: 'justice-91571.firebaseapp.com',
    }),
  },

  isElectron: true,
});
