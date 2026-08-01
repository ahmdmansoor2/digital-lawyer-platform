const { app, BrowserWindow, Menu, ipcMain, dialog, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

let mainWindow;

// ─────────────────────────────────────────────────────────────────────────────
// نظام ترخيص منصة المحامي الرقمية - نسخة مُحصّنة
// المفتاح السري مقسَّم لتصعيب الاكتشاف بالهندسة العكسية
// ─────────────────────────────────────────────────────────────────────────────
const _S = [
  '\x39\x32\x66\x33\x30\x62\x64\x63\x63\x65\x31\x39\x62\x32\x38\x39\x37\x61\x33\x38\x65\x66\x34\x37\x39\x37\x31\x34\x32\x38\x35\x62\x33\x30\x31\x33',
  '\x37\x35\x36\x38\x35\x66\x62\x35\x39\x64\x35\x65\x65\x36\x33\x66\x38\x33\x38\x33\x37\x63\x36\x30\x30\x63\x35\x34\x31\x63\x34\x31\x39',
  '\x31\x30\x65\x34\x36\x66\x61\x36\x34\x31\x33\x36\x64\x31\x63\x32\x34\x65\x65\x39\x36\x62\x38\x38\x63\x65\x37',
];
const LICENSE_SECRET = _S.join('');

// v2.8.1: Use extracted license logic (testable in isolation)
const { verifyLicenseToken: _verifyLicenseToken, getMachineId, isSameMachine } = require('./licenseValidator.cjs');

// ─── Rate limiting: تحديد محاولات التفعيل ────────────────────────────────────
const activationAttempts = new Map(); // ip/session -> { count, lastAttempt }
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 دقيقة حظر بعد 5 محاولات فاشلة

function checkRateLimit(sessionId) {
  const now = Date.now();
  const record = activationAttempts.get(sessionId) || { count: 0, lastAttempt: 0 };
  
  // إعادة العداد بعد انتهاء فترة الحظر
  if (now - record.lastAttempt > LOCKOUT_MS) {
    activationAttempts.set(sessionId, { count: 0, lastAttempt: now });
    return { allowed: true };
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    const remaining = Math.ceil((LOCKOUT_MS - (now - record.lastAttempt)) / 60000);
    return { allowed: false, reason: `تم تجاوز عدد المحاولات. حاول مجدداً بعد ${remaining} دقيقة.` };
  }
  
  return { allowed: true };
}

function recordFailedAttempt(sessionId) {
  const now = Date.now();
  const record = activationAttempts.get(sessionId) || { count: 0, lastAttempt: 0 };
  activationAttempts.set(sessionId, { count: record.count + 1, lastAttempt: now });
}

// ─── Machine ID: ربط الترخيص بالجهاز (delegated to licenseValidator for testability)
function getMachineIdLocal() {
  return getMachineId();
}

function getLicensePath() {
  return path.join(app.getPath('userData'), 'license.dat');
}

function verifyLicenseToken(token) {
  // v2.8.1: Delegate to tested implementation in licenseValidator.cjs
  return _verifyLicenseToken(token, LICENSE_SECRET);
}

// ─── تخزين الترخيص مع ربطه بمعرّف الجهاز ────────────────────────────────────
function loadStoredLicense() {
  try {
    const file = getLicensePath();
    if (!fs.existsSync(file)) return null;
    
    const raw = fs.readFileSync(file, 'utf-8').trim();
    if (!raw) return null;
    
    // التحقق من أن الترخيص مربوط بهذا الجهاز
    const parts = raw.split('::');
    if (parts.length !== 2) return null;
    
    const [storedMachineId, token] = parts;
    const currentMachineId = getMachineId();
    
    if (storedMachineId !== currentMachineId) {
      console.warn('[License] ترخيص منقول من جهاز آخر - مرفوض');
      // حذف الترخيص غير الصالح
      try { fs.unlinkSync(file); } catch (_) {}
      return null;
    }
    
    return token;
  } catch (_) { return null; }
}

function saveLicense(token) {
  try {
    const userData = app.getPath('userData');
    if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
    // تخزين المعرّف مع الرمز
    const machineId = getMachineId();
    fs.writeFileSync(getLicensePath(), `${machineId}::${token.trim()}`, 'utf-8');
    return true;
  } catch (_) { return false; }
}

function deleteLicense() {
  try { fs.unlinkSync(getLicensePath()); } catch (_) {}
}

// ─── التحقق المبكر من الترخيص (قبل عرض أي شيء) ─────────────────────────────
let cachedLicenseStatus = null;
let lastLicenseCheck = 0;
const LICENSE_CHECK_INTERVAL = 30 * 60 * 1000; // إعادة التحقق كل 30 دقيقة

function checkLicenseNow() {
  const now = Date.now();
  // استخدام النتيجة المخزنة إذا لم يمر وقت كافٍ
  if (cachedLicenseStatus && (now - lastLicenseCheck) < LICENSE_CHECK_INTERVAL) {
    return cachedLicenseStatus;
  }
  
  const token = loadStoredLicense();
  if (!token) {
    cachedLicenseStatus = { valid: false, reason: 'لا يوجد ترخيص مفعّل' };
  } else {
    cachedLicenseStatus = verifyLicenseToken(token);
  }
  lastLicenseCheck = now;
  return cachedLicenseStatus;
}

// ─── IPC: تفعيل الترخيص ───────────────────────────────────────────────────────
ipcMain.handle('license:activate', async (event, { token }) => {
  // Rate limiting
  const sessionId = 'activation'; // يمكن استخدام webContents.id
  const rateCheck = checkRateLimit(sessionId);
  if (!rateCheck.allowed) {
    return { success: false, reason: rateCheck.reason };
  }
  
  const result = verifyLicenseToken(token);
  if (result.valid) {
    saveLicense(token);
    // إعادة ضبط cache
    cachedLicenseStatus = result;
    lastLicenseCheck = Date.now();
    return { success: true, license: result.payload, machineId: getMachineId() };
  }
  
  // تسجيل المحاولة الفاشلة
  recordFailedAttempt(sessionId);
  return { success: false, reason: result.reason };
});

// ════════════════════════════════════════════════════════════════════════════
// Native Dialogs — بديل آمن لـ window.alert/confirm/prompt
// السبب: window.alert/confirm/prompt الأصلية لا تعمل بشكل أصلي في Electron
// (تظهر نوافذ مكسورة أو لا تظهر)، وأحياناً تتسبب في كراش التطبيق.
// نوفّر نوافذ native حقيقية عبر dialog.showMessageBox + IPC sync.
// ════════════════════════════════════════════════════════════════════════════
ipcMain.handle('dialog:alert', async (event, message) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      await dialog.showMessageBox(win, {
        type: 'info',
        title: 'منصة المحامي الرقمية',
        message: String(message || ''),
        buttons: ['حسناً'],
        defaultId: 0,
        noLink: true,
      });
    } else {
      console.log('[Alert]', message);
    }
    return { success: true };
  } catch (e) {
    console.error('[dialog:alert] failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('dialog:confirm', async (event, message) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return true;
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      title: 'تأكيد',
      message: String(message || ''),
      buttons: ['موافق', 'إلغاء'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    return response === 0;
  } catch (e) {
    console.error('[dialog:confirm] failed:', e);
    return true; // آمن: default true لتفادي الكسر
  }
});

ipcMain.handle('dialog:prompt', async (event, message, defaultValue) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return defaultValue || '';
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      title: 'إدخال',
      message: String(message || '') + (defaultValue ? `\n\nالقيمة الافتراضية: ${defaultValue}` : ''),
      buttons: ['موافق', 'إلغاء'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (response !== 0) return null;
    // dialog.showMessageBox لا يدعم input — نُعيد default.
    // للكود الذي يحتاج input حقيقي، استخدم React modal عبر useConfirm().
    return defaultValue || '';
  } catch (e) {
    console.error('[dialog:prompt] failed:', e);
    return defaultValue || '';
  }
});

// ─── IPC: التحقق من الترخيص الحالي ───────────────────────────────────────────
ipcMain.handle('license:check', async () => {
  // إلزامي: التحقق دائماً من صلاحية الترخيص في Main process
  return checkLicenseNow();
});

// ─── IPC: إلغاء تفعيل الترخيص ───────────────────────────────────────────────
ipcMain.handle('license:deactivate', async () => {
  deleteLicense();
  cachedLicenseStatus = null;
  lastLicenseCheck = 0;
  return { success: true };
});

// ─── IPC: الحصول على معرّف الجهاز (للعرض فقط) ───────────────────────────────
ipcMain.handle('license:getMachineId', async () => {
  return { machineId: getMachineId() };
});


// ─────────────────────────────────────────────────────────────────────────────
// تخزين المكتبة القانونية على القرص (JSON file) — يحلّ مشكلة الفقد في Electron
// يُحفظ الملف في userData (مثلاً %APPDATA%\com.lawfirm.digitallawyer\library.json)
// ─────────────────────────────────────────────────────────────────────────────

function getLibraryPath() {
  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true });
  }
  return path.join(userData, 'legal-library.json');
}

ipcMain.handle('library:getPath', async () => {
  try {
    return { success: true, path: getLibraryPath(), userData: app.getPath('userData') };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('library:read', async () => {
  try {
    const file = getLibraryPath();
    if (!fs.existsSync(file)) {
      return { success: true, data: null, path: file };
    }
    const text = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(text);
    return { success: true, data, path: file };
  } catch (e) {
    console.error('[library:read] فشل قراءة المكتبة:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('library:write', async (event, { data }) => {
  try {
    const file = getLibraryPath();
    // كتابة ذرّية — تكتب في ملف مؤقت ثم تنقله، لتفادي إفساد الملف عند انقطاع التيار
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, file);
    return { success: true, path: file, size: fs.statSync(file).size };
  } catch (e) {
    console.error('[library:write] فشل كتابة المكتبة:', e);
    return { success: false, error: e.message };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// تخزين الخصوم (Opponents) — ملف منفصل عن المكتبة لتقليل مخاطر التداخل
// ─────────────────────────────────────────────────────────────────────────────

function getOpponentsPath() {
  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true });
  }
  return path.join(userData, 'opponents.json');
}

ipcMain.handle('opponents:getPath', async () => {
  try {
    return { success: true, path: getOpponentsPath(), userData: app.getPath('userData') };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('opponents:read', async () => {
  try {
    const file = getOpponentsPath();
    if (!fs.existsSync(file)) {
      return { success: true, data: null, path: file };
    }
    const text = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(text);
    return { success: true, data, path: file };
  } catch (e) {
    console.error('[opponents:read] فشل قراءة الخصوم:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('opponents:write', async (event, data) => {
  try {
    const file = getOpponentsPath();
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, file);
    return { success: true, path: file, size: fs.statSync(file).size };
  } catch (e) {
    console.error('[opponents:write] فشل كتابة الخصوم:', e);
    return { success: false, error: e.message };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// تخزين الملاحظات (Notes) — Google Keep-style
// ─────────────────────────────────────────────────────────────────────────────

function getNotesPath() {
  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true });
  }
  return path.join(userData, 'notes.json');
}

ipcMain.handle('notes:getPath', async () => {
  try {
    return { success: true, path: getNotesPath(), userData: app.getPath('userData') };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('notes:read', async () => {
  try {
    const file = getNotesPath();
    if (!fs.existsSync(file)) {
      return { success: true, data: null, path: file };
    }
    const text = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(text);
    return { success: true, data, path: file };
  } catch (e) {
    console.error('[notes:read] فشل قراءة الملاحظات:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('notes:write', async (event, data) => {
  try {
    const file = getNotesPath();
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, file);
    return { success: true, path: file, size: fs.statSync(file).size };
  } catch (e) {
    console.error('[notes:write] فشل كتابة الملاحظات:', e);
    return { success: false, error: e.message };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// تخزين الـ Auth & RBAC (Users, Roles, Permissions, Groups, Audit, Login History)
// ─────────────────────────────────────────────────────────────────────────────

function getAuthPath(filename) {
  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  return path.join(userData, filename);
}

// v2.9.5: Whitelist of allowed auth files — prevents arbitrary file read/write via IPC
const ALLOWED_AUTH_FILES = new Set([
  'users.json', 'roles.json', 'permissions.json', 'settings.json',
  'office_profile.json', 'license.dat', 'session.json',
  'groups.json', 'audit-logs.json', 'login-history.json', 'password-policy.json',
]);

ipcMain.handle('auth:read', async (event, filename) => {
  if (!ALLOWED_AUTH_FILES.has(filename)) {
    console.error(`[auth:read] DENIED: "${filename}" not in whitelist`);
    return { success: false, error: 'Access denied: file not in whitelist' };
  }
  try {
    const file = getAuthPath(filename);
    if (!fs.existsSync(file)) return { success: true, data: null, path: file };
    const text = fs.readFileSync(file, 'utf-8');
    return { success: true, data: JSON.parse(text), path: file };
  } catch (e) {
    console.error(`[auth:read] فشل قراءة ${filename}:`, e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('auth:write', async (event, filename, data) => {
  if (!ALLOWED_AUTH_FILES.has(filename)) {
    console.error(`[auth:write] DENIED: "${filename}" not in whitelist`);
    return { success: false, error: 'Access denied: file not in whitelist' };
  }
  try {
    const file = getAuthPath(filename);
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, file);
    return { success: true, path: file, size: fs.statSync(file).size };
  } catch (e) {
    console.error(`[auth:write] فشل كتابة ${filename}:`, e);
    return { success: false, error: e.message };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: Google OAuth — يلتقط نافذة البوب آب من Firebase Auth Handler
// ويعيد توجيهها لنفس النافذة، ثم يستخدم CDP لالتقاط verifyAssertion
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('auth:google-login', async (_event, { apiKey, authDomain }) => {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let authWin = null;
    let currentRequestId = null;

    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      try { if (authWin && !authWin.isDestroyed()) authWin.webContents.debugger.detach(); } catch (_) {}
      try { if (authWin && !authWin.isDestroyed()) authWin.close(); } catch (_) {}
      resolve(result);
    };

    const fail = (err) => {
      if (resolved) return;
      resolved = true;
      try { if (authWin && !authWin.isDestroyed()) authWin.webContents.debugger.detach(); } catch (_) {}
      try { if (authWin && !authWin.isDestroyed()) authWin.close(); } catch (_) {}
      reject(err);
    };

    // 1. إنشاء النافذة
    authWin = new BrowserWindow({
      width: 520,
      height: 650,
      show: true,
      title: 'تسجيل الدخول بحساب Google',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    // 2. التقاط فتح البوب آب → توجيه لنفس النافذة
    authWin.webContents.setWindowOpenHandler(({ url }) => {
      if (url && url.includes('accounts.google.com')) {
        // بدلاً من فتح نافذة جديدة، نوجه نفس النافذة لصفحة Google OAuth
        authWin.loadURL(url);
      }
      return { action: 'deny' };
    });

    // 3. إرفاق CDP
    try {
      authWin.webContents.debugger.attach('1.3');
      authWin.webContents.debugger.sendCommand('Network.enable').catch(() => {});

      authWin.webContents.debugger.on('message', (_evt, method, params) => {
        if (method === 'Network.responseReceived') {
          const respUrl = (params.response && params.response.url) || '';
          if (respUrl.includes('verifyAssertion') || respUrl.includes('signInWithIdp') || respUrl.includes('relyingparty')) {
            currentRequestId = params.requestId;
          }
        }
        if (method === 'Network.loadingFinished' && params.requestId === currentRequestId) {
          const reqId = currentRequestId;
          currentRequestId = null;
          authWin.webContents.debugger.sendCommand('Network.getResponseBody', {
            requestId: reqId,
          }).then(({ body }) => {
            try {
              const data = JSON.parse(body);
              if (data.idToken) {
                finish({
                  idToken: data.idToken,
                  refreshToken: data.refreshToken,
                  email: data.email,
                  displayName: data.displayName,
                  localId: data.localId,
                });
              } else if (data.error) {
                fail(new Error(data.error.message || 'Firebase Auth error'));
              }
            } catch (_) {
              fail(new Error('Failed to parse auth response'));
            }
          }).catch(() => {});
        }
      });
    } catch (debugErr) {
      console.error('[GoogleAuth] CDP attach failed:', debugErr.message);
    }

    // 4. تحميل Firebase Auth Handler بوضع signInViaPopup
    const authUrl =
      `https://${authDomain}/__/auth/handler` +
      `?apiKey=${apiKey}` +
      `&appName=[DEFAULT]` +
      `&authType=signInViaPopup` +
      `&v=10.12.2` +
      `&providerId=google.com` +
      `&scopes=profile,email`;

    authWin.loadURL(authUrl);

    // 5. مهلة 5 دقائق
    const timeout = setTimeout(() => {
      fail(new Error('انتهت مهلة تسجيل الدخول'));
    }, 5 * 60 * 1000);

    authWin.on('closed', () => {
      if (!resolved) {
        clearTimeout(timeout);
        fail(new Error('تم إغلاق نافذة تسجيل الدخول'));
      }
    });
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
      pdfViewerEnabled: true,
    },
    title: "منصة المحامي الرقمية - نظام إدارة القضايا والمالية",
    backgroundColor: '#0f172a',
    autoHideMenuBar: true
  });

  // ─── منع فتح DevTools بلوحة المفاتيح في الإنتاج ────────────────────────────
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  // ─── تشخيص: التقاط أخطاء الـ console من الـ renderer ───────────────────────
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message}`);
  });
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('[Renderer] CRASHED:', killed);
  });

  // منع النقر بزر الماوس الأيمن (Context Menu) لمنع "فحص العنصر"
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // ─── السماح بـ blob: و data: داخل الـ iframes (لعارض الملفات) ───
  // هذا ضروري لأن Electron يحجب data: URLs في iframes افتراضياً
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' blob: data: file:; " +
          "script-src 'self' blob: https://fonts.googleapis.com https://pagead2.googlesyndication.com https://adservice.google.com; " +
          "script-src-elem 'self' blob: https://fonts.googleapis.com https://pagead2.googlesyndication.com https://adservice.google.com; " +
          "style-src 'self' 'unsafe-inline' blob: data: https://fonts.googleapis.com; " +
          "style-src-elem 'self' 'unsafe-inline' blob: data: https://fonts.googleapis.com https://fonts.gstatic.com; " +
          "img-src 'self' blob: data: file: https:; " +
          "media-src 'self' blob: data: file:; " +
          "frame-src 'self' blob: data: file:; " +
          "connect-src 'self' blob: data: https://fonts.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;" +
          "font-src 'self' blob: data: https://fonts.gstatic.com;"
        ]
      }
    });
  });

  // Disable default browser menu bar
  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // ─── إعادة التحقق من الترخيص دورياً كل 30 دقيقة ─────────────────────────────
  if (!isDev) {
    const licenseCheckTimer = setInterval(() => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        clearInterval(licenseCheckTimer);
        return;
      }
      
      // إعادة ضبط cache لإجبار التحقق من الملف مجدداً
      cachedLicenseStatus = null;
      lastLicenseCheck = 0;
      
      const result = checkLicenseNow();
      if (!result.valid) {
        console.warn('[License] الترخيص انتهى أو أُلغي. إغلاق التطبيق.');
        // إعلام الـ renderer بانتهاء الترخيص
        mainWindow.webContents.send('license:expired', { reason: result.reason });
      }
    }, LICENSE_CHECK_INTERVAL);
    
    mainWindow.on('closed', () => {
      clearInterval(licenseCheckTimer);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC: Print HTML — renders to PDF and opens in system default PDF viewer
// so the user gets a full visual preview with native print from the viewer.
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('print-html', async (event, { html, title }) => {
  // 1. Write HTML to a temp file so fonts and images resolve via file://
  const tmpHtml = path.join(os.tmpdir(), `legal_print_${Date.now()}.html`);
  try {
    fs.writeFileSync(tmpHtml, html, 'utf-8');
  } catch (writeErr) {
    return { success: false, reason: 'Failed to write temp file: ' + writeErr.message };
  }

  return new Promise((resolve) => {
    // 2. Create hidden BrowserWindow to render the HTML
    const printWin = new BrowserWindow({
      show: false,
      width: 794,   // A4 width at 96 DPI
      height: 1123,  // A4 height at 96 DPI
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    printWin.loadURL('file://' + tmpHtml.replace(/\\/g, '/'));

    printWin.webContents.once('did-finish-load', async () => {
      // Give fonts and images time to fully render
      await new Promise(r => setTimeout(r, 1000));

      try {
        // 3. Generate PDF from the rendered content
        const pdfData = await printWin.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          margins: { marginType: 'default' },
          landscape: false,
        });

        // 4. Save PDF to temp directory
        const safeTitle = (title || 'document').replace(/[\\/:*?"<>|]/g, '_');
        const tmpPdf = path.join(os.tmpdir(), `معاينة_طباعة_${safeTitle}_${Date.now()}.pdf`);
        fs.writeFileSync(tmpPdf, pdfData);

        // 5. Open the PDF with the system's default PDF viewer
        //    (Edge, Adobe, Foxit, etc.) which provides full preview + print
        await shell.openPath(tmpPdf);

        resolve({ success: true, pdfPath: tmpPdf });
      } catch (pdfErr) {
        resolve({ success: false, reason: 'PDF generation failed: ' + pdfErr.message });
      } finally {
        // Cleanup
        try { fs.unlinkSync(tmpHtml); } catch (_) {}
        if (!printWin.isDestroyed()) printWin.close();
      }
    });

    printWin.webContents.once('did-fail-load', (ev, code, desc) => {
      try { fs.unlinkSync(tmpHtml); } catch (_) {}
      if (!printWin.isDestroyed()) printWin.close();
      resolve({ success: false, reason: desc });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: Save file with native "Save As" dialog
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('save-file', async (event, { defaultFilename, base64Data, mimeType, filters }) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'حفظ الملف',
    defaultPath: path.join(app.getPath('documents'), defaultFilename),
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    properties: ['createDirectory'],
  });

  if (canceled || !filePath) {
    return { success: false, reason: 'canceled' };
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, reason: err.message };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: Write file to temp directory for local previewing
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('write-temp-file', async (event, { base64Data, fileName }) => {
  try {
    const rawData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(rawData, 'base64');
    const tempDir = app.getPath('temp');
    // Ensure uniqueness by prepending timestamp
    const safeName = `${Date.now()}_${fileName.replace(/[\\/:*?"<>|]/g, '_')}`;
    const tempFilePath = path.join(tempDir, safeName);
    fs.writeFileSync(tempFilePath, buffer);
    return { success: true, filePath: tempFilePath };
  } catch (err) {
    console.error('[write-temp-file] Error:', err);
    return { success: false, reason: err.message };
  }
});

// ─── CLI: --reset-password ──────────────────────────────────────────────────
app.whenReady().then(() => {
  if (process.argv.includes('--reset-password')) {
    const userData = app.getPath('userData');
    const usersFile = path.join(userData, 'users.json');
    const NEW_PW = 'admin123';
    const ITERATIONS = 100_000;
    const KEY_LEN = 32;
    const salt = crypto.randomBytes(16).toString('hex');
    const key = crypto.pbkdf2Sync(NEW_PW, salt, ITERATIONS, KEY_LEN, 'sha256');
    const hash = `pbkdf2$${ITERATIONS}$${salt}$${key.toString('hex')}`;

    try {
      let data = [];
      if (fs.existsSync(usersFile)) {
        data = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
      }
      let changed = false;
      for (const user of data) {
        if (user.username === 'admin') {
          user.passwordHash = hash;
          changed = true;
          console.log(`[reset-password] Admin password reset to "${NEW_PW}"`);
          break;
        }
      }
      if (!changed) {
        console.log('[reset-password] Creating admin user with new password');
        data.push({
          id: 'user_admin',
          username: 'admin',
          passwordHash: hash,
          mustChangePassword: false,
          twoFactorEnabled: false,
          fullName: 'مدير النظام',
          email: 'admin@lawfirm.local',
          phone: '01000000000',
          jobTitle: 'مدير النظام',
          grade: 'admin',
          department: 'الإدارة',
          status: 'active',
          failedLoginAttempts: 0,
          roleIds: ['role_admin'],
          groupIds: ['group_executive'],
          extraPermissions: [],
          deniedPermissions: [],
          passwordHistory: [hash],
          passwordLastChangedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'mock',
        });
      }
      const tmp = usersFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmp, usersFile);
      console.log(`[reset-password] Written to ${usersFile}`);
    } catch (e) {
      console.error('[reset-password] Error:', e);
    }
    app.exit(0);
    return;
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
