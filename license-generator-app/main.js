const { app, BrowserWindow, Menu, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// ════════════════════════════════════════════════════════════════════════════
// المفتاح السري المشترك مع منصة المحامي الرقمية (موجود في main.cjs)
// ════════════════════════════════════════════════════════════════════════════
const _S = [
  '\x39\x32\x66\x33\x30\x62\x64\x63\x63\x65\x31\x39\x62\x32\x38\x39\x37\x61\x33\x38\x65\x66\x34\x37\x39\x37\x31\x34\x32\x38\x35\x62\x33\x30\x31\x33',
  '\x37\x35\x36\x38\x35\x66\x62\x35\x39\x64\x35\x65\x65\x36\x33\x66\x38\x33\x38\x33\x37\x63\x36\x30\x30\x63\x35\x34\x31\x63\x34\x31\x39',
  '\x31\x30\x65\x34\x36\x66\x61\x36\x34\x31\x33\x36\x64\x31\x63\x32\x34\x65\x65\x39\x36\x62\x38\x38\x63\x65\x37',
];
const LICENSE_SECRET = _S.join('');

// ════════════════════════════════════════════════════════════════════════════
// مولّد المعرّف الفريد للجهاز (متطابق مع electron/main.cjs)
// ════════════════════════════════════════════════════════════════════════════
function computeMachineId(raw = null) {
  try {
    const source = raw || `${os.hostname()}::${os.platform()}::${(os.cpus()[0] || {}).model || 'cpu'}::${os.arch()}`;
    return crypto.createHash('sha256').update(source).digest('hex').substring(0, 32);
  } catch {
    return 'fallback-machine-id';
  }
}

// ════════════════════════════════════════════════════════════════════════════
// توليد / التحقق من التوكن
// ════════════════════════════════════════════════════════════════════════════
function b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function generateToken(opts) {
  const {
    customerName, customerKey, machineId, durationDays,
    features = 'full', maxUsers = -1, notes = '',
    issuedAt = Date.now(),
  } = opts;

  if (!customerKey || typeof customerKey !== 'string') {
    throw new Error('customerKey مطلوب');
  }
  if (!durationDays || durationDays <= 0) {
    throw new Error('durationDays يجب أن يكون رقماً موجباً');
  }

  const expiresAt = issuedAt + durationDays * 24 * 60 * 60 * 1000;
  const payload = {
    customer: customerName || customerKey,
    key: customerKey,
    machineId: machineId || null,
    features,
    maxUsers,
    notes,
    issuedAt,
    expiresAt,
    issuer: 'منصة المحامي الرقمية - مولّد التراخيص',
    version: 2,
  };

  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(payloadB64)
    .digest('base64url')
    .substring(0, 16)
    .toUpperCase();

  return {
    token: `${payloadB64}.${signature}`,
    payload,
    signature,
  };
}

function verifyToken(token) {
  try {
    const [payloadB64, signature] = String(token || '').trim().split('.');
    if (!payloadB64 || !signature) {
      return { valid: false, reason: 'تنسيق غير صحيح' };
    }

    const expectedSig = crypto
      .createHmac('sha256', LICENSE_SECRET)
      .update(payloadB64)
      .digest('base64url')
      .substring(0, 16)
      .toUpperCase();

    if (expectedSig !== signature) {
      return { valid: false, reason: 'توقيع غير مطابق - الترخيص مزوّر أو المفتاح السري مختلف' };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    const now = Date.now();
    const expired = now > payload.expiresAt;
    const daysLeft = Math.ceil((payload.expiresAt - now) / (1000 * 60 * 60 * 24));

    return {
      valid: !expired,
      expired,
      daysLeft,
      payload,
    };
  } catch (e) {
    return { valid: false, reason: 'فشل قراءة التوكن: ' + e.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// سجل التراخيص المُولَّدة (يُحفظ على القرص في مجلد بيانات المستخدم)
// ════════════════════════════════════════════════════════════════════════════
function getRecordsPath() {
  return path.join(app.getPath('userData'), 'generated-licenses.json');
}

function loadRecords() {
  try {
    const file = getRecordsPath();
    if (!fs.existsSync(file)) return [];
    const text = fs.readFileSync(file, 'utf-8').trim();
    if (!text) return [];
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function saveRecords(records) {
  const file = getRecordsPath();
  fs.writeFileSync(file, JSON.stringify(records, null, 2), 'utf-8');
}

// ════════════════════════════════════════════════════════════════════════════
// IPC handlers
// ════════════════════════════════════════════════════════════════════════════
function registerIpc() {
  ipcMain.handle('gen:secret', () => LICENSE_SECRET);

  ipcMain.handle('gen:machineId', () => computeMachineId());

  ipcMain.handle('gen:generate', (_e, opts) => {
    try {
      const result = generateToken(opts);
      const record = {
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        ...result,
        ...opts,
      };
      const records = loadRecords();
      records.unshift(record);
      saveRecords(records.slice(0, 5000));
      return { success: true, record, token: result.token };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('gen:verify', (_e, token) => verifyToken(token));

  ipcMain.handle('gen:list', () => loadRecords());

  ipcMain.handle('gen:delete', (_e, id) => {
    const records = loadRecords().filter(r => r.id !== id);
    saveRecords(records);
    return { success: true, count: records.length };
  });

  ipcMain.handle('gen:clear', () => {
    saveRecords([]);
    return { success: true };
  });

  ipcMain.handle('gen:copy', (_e, text) => {
    clipboard.writeText(String(text || ''));
    return { success: true };
  });

  ipcMain.handle('gen:export', async (_e, { format = 'json', recordIds = null }) => {
    const records = loadRecords().filter(r => !recordIds || recordIds.includes(r.id));
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    let content, ext, mime;

    if (format === 'csv') {
      const header = ['generatedAt', 'customer', 'key', 'machineId', 'durationDays', 'maxUsers', 'features', 'notes', 'token', 'expiresAt'];
      const rows = records.map(r => [
        r.generatedAt, r.customerName, r.customerKey, r.machineId || '',
        r.durationDays, r.maxUsers, r.features, r.notes, r.token,
        r.payload ? new Date(r.payload.expiresAt).toISOString() : '',
      ]);
      content = '\uFEFF' + [header, ...rows].map(row => row.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      ext = 'csv'; mime = 'text/csv';
    } else if (format === 'txt') {
      content = records.map(r =>
        `═══════════════════════════════════════════════════\n` +
        `التاريخ: ${r.generatedAt}\n` +
        `العميل: ${r.customerName}\n` +
        `Customer Key: ${r.customerKey}\n` +
        `Machine ID: ${r.machineId || '(سيُربط بأي جهاز)'}\n` +
        `المدة: ${r.durationDays} يوم\n` +
        `تاريخ الانتهاء: ${r.payload ? new Date(r.payload.expiresAt).toLocaleString('ar-EG') : '-'}\n` +
        `الملاحظات: ${r.notes || '-'}\n` +
        `════════════════════════════════════════════════════════\n` +
        `${r.token}\n\n`
      ).join('');
      ext = 'txt'; mime = 'text/plain';
    } else {
      content = JSON.stringify({ generatedAt: new Date().toISOString(), count: records.length, records }, null, 2);
      ext = 'json'; mime = 'application/json';
    }

    const result = await dialog.showSaveDialog({
      title: 'تصدير التراخيص',
      defaultPath: `تراخيص-${ts}.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };

    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, path: result.filePath, count: records.length };
  });
}

// ════════════════════════════════════════════════════════════════════════════
// إنشاء نافذة التطبيق
// ════════════════════════════════════════════════════════════════════════════
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a',
    title: 'مولّد تراخيص منصة المحامي الرقمية',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  Menu.setApplicationMenu(null);

  // CSP للسماح بـ Tailwind CDN و Google Fonts
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.tailwindcss.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'unsafe-inline'; " +
          "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
          "img-src 'self' blob: data: https: http:; " +
          "font-src 'self' blob: data: https://fonts.gstatic.com; " +
          "connect-src 'self' https://cdn.tailwindcss.com https://fonts.googleapis.com https://fonts.gstatic.com;"
        ],
      },
    });
  });

  registerIpc();
  win.loadFile(path.join(__dirname, 'renderer.html'));

  win.webContents.on('before-input-event', (_event, input) => {
    if (input.control && input.shift && input.key === 'I') {
      win.webContents.toggleDevTools();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
