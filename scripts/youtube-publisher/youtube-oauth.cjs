#!/usr/bin/env node
/**
 * youtube-oauth.cjs — إدارة OAuth2 لـ YouTube Data API v3
 *
 * - يبدأ Authorization Code Flow (مع client_secret — بدون PKCE، كافي)
 * - يفتح local server على YT_OAUTH_PORT (افتراضي 8788) ليستقبل الـ callback
 *   (جوجل تسمح بـ http://localhost بدون TLS — أبسط من TikTok)
 * - يحوّل الكود لـ access_token + refresh_token
 * - يخزّنهم في youtube-tokens.json (مستثنى في .gitignore — لا يُلتزم في الـ repo؛ الـ CI يبني من secrets)
 * - يجدد التوكن أوتوماتيك (صلاحية access_token ساعة)
 *
 * الاستخدام:
 *   node youtube-oauth.cjs login     # يفتح المتصفح لربط قناة YouTube (مرة واحدة)
 *   node youtube-oauth.cjs status    # عرض حالة التوكن
 *   node youtube-oauth.cjs refresh   # تجديد يدوي
 *   node youtube-oauth.cjs import    # بناء الملف من متغيرات env (CI)
 *   node youtube-oauth.cjs clear     # حذف التوكنز
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const url = require('url');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN_FILE = path.join(__dirname, 'youtube-tokens.json');
const CLIENT_ID = process.env.YT_CLIENT_ID;
const CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
const REDIRECT_URI = process.env.YT_REDIRECT_URI || 'http://localhost:8788/oauth/callback';
const OAUTH_PORT = parseInt(process.env.YT_OAUTH_PORT || '8788', 10);
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// ─── أدوات ──────────────────────────────────────────────────────────────────
function readTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); }
  catch { return null; }
}

function writeTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  console.log(`[youtube-oauth] ✓ تم حفظ التوكنز في ${TOKEN_FILE}`);
}

function assertConfigured() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ خطأ: YT_CLIENT_ID و YT_CLIENT_SECRET غير مضبوطين في .env');
    console.error('   راجع README.md — أنشئ OAuth Client من Google Cloud Console (Web application).');
    process.exit(1);
  }
}

// ─── بناء youtube-tokens.json من env (لـ GitHub Actions headless) ───────────
function importTokensFromEnv() {
  const needed = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_ACCESS_TOKEN', 'YT_REFRESH_TOKEN'];
  const missing = needed.filter(k => !process.env[k]);
  if (missing.length) {
    console.log(`[youtube-oauth] لا يوجد ملف توكنز ولا متغيرات env كاملة (ناقص: ${missing.join(', ')})`);
    return null;
  }
  const tokens = {
    client_id: process.env.YT_CLIENT_ID,
    client_secret: process.env.YT_CLIENT_SECRET,
    access_token: process.env.YT_ACCESS_TOKEN,
    refresh_token: process.env.YT_REFRESH_TOKEN,
    expires_in: parseInt(process.env.YT_EXPIRES_IN, 10) || 3600,
    obtained_at: 0, // صفر = يفرض التجديد فوراً في أول تشغيل CI
    scope: process.env.YT_SCOPE || SCOPE,
  };
  writeTokens(tokens);
  return tokens;
}

// ─── فتح المتصفح ────────────────────────────────────────────────────────────
function openBrowser(targetUrl) {
  const cmd = process.platform === 'win32' ? `start "" "${targetUrl}"`
            : process.platform === 'darwin' ? `open "${targetUrl}"`
            : `xdg-open "${targetUrl}"`;
  exec(cmd, (err) => {
    if (err) console.log(`[youtube-oauth] افتح الرابط يدوياً في المتصفح:\n   ${targetUrl}`);
  });
}

// ─── login: Authorization Code Flow ──────────────────────────────────────────
async function login() {
  assertConfigured();
  const state = crypto.randomBytes(16).toString('hex');

  const authUrl = new URL(AUTH_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPE);
  authUrl.searchParams.set('access_type', 'offline'); // ضروري للحصول على refresh_token
  authUrl.searchParams.set('prompt', 'consent');      // يضمن إصدار refresh_token حتى مع الموافقة المتكررة
  authUrl.searchParams.set('state', state);

  console.log(`[youtube-oauth] جاري فتح المتصفح لربط قناة YouTube...`);
  console.log(`[youtube-oauth] Redirect URI: ${REDIRECT_URI}`);
  console.log(`[youtube-oauth] ⚠️ تأكد أن هذا الـ Redirect URI مسجّل بالضبط في Google Cloud Console.`);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsed = url.parse(req.url, true);
        const expectedPath = new URL(REDIRECT_URI).pathname;
        if (parsed.pathname !== expectedPath) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1 style="color:red;font-family:tahoma">404 — مسار خاطئ</h1><p>وصلنا: <code>${parsed.pathname}</code></p><p>المتوقع: <code>${expectedPath}</code></p>`);
          return;
        }
        const { code, state: returnedState, error } = parsed.query;
        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1 style="color:red;font-family:tahoma">فشل الربط: ${error}</h1><p>أغلق الصفحة وارجع للترمنال.</p>`);
          server.close();
          return reject(new Error(`OAuth error: ${error}`));
        }
        if (returnedState !== state) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1 style="color:red;font-family:tahoma">خطأ: state غير مطابق</h1>`);
          server.close();
          return reject(new Error('State mismatch'));
        }

        // Exchange code → tokens
        const tokenResp = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: String(code),
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          }),
        });
        const tokenData = await tokenResp.json();
        if (!tokenResp.ok || tokenData.error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1 style="color:red;font-family:tahoma">فشل استلام التوكن</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
          server.close();
          return reject(new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`));
        }

        const tokens = {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in || 3600,
          obtained_at: Date.now(),
          scope: tokenData.scope,
        };
        writeTokens(tokens);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1 style="color:green;font-family:tahoma">✓ تم ربط قناة YouTube بنجاح!</h1><p>أغلق الصفحة وارجع للترمنال.</p>`);
        server.close();
        resolve(tokens);
      } catch (e) {
        res.writeHead(500); res.end('Internal error');
        server.close();
        reject(e);
      }
    });
    server.listen(OAUTH_PORT, () => {
      console.log(`[youtube-oauth] Listening on ${REDIRECT_URI}`);
      console.log(`[youtube-oauth] لو ما فتحش المتصفح، الصق الرابط ده يدوياً:\n   ${authUrl.toString()}`);
      openBrowser(authUrl.toString());
    });
    setTimeout(() => {
      server.close();
      reject(new Error('انتهت مهلة الانتظار (15 دقيقة) — لم يصل الـ callback. تحقق من الـ Redirect URI المسجل في Google Cloud.'));
    }, 15 * 60 * 1000).unref();
  });
}

// ─── refresh: استبدال refresh_token بـ access_token جديد ────────────────────
async function refresh() {
  assertConfigured();
  const tokens = readTokens();
  if (!tokens?.refresh_token) {
    throw new Error('مفيش refresh_token. شغّل `login` الأول.');
  }
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(`فشل تجديد التوكن: ${JSON.stringify(data)}`);
  }
  const updated = {
    ...tokens,
    access_token: data.access_token,
    expires_in: data.expires_in || 3600,
    obtained_at: Date.now(),
  };
  if (data.refresh_token) updated.refresh_token = data.refresh_token;
  writeTokens(updated);
  console.log('✓ تم تجديد التوكن');
}

function status() {
  const tokens = readTokens();
  if (!tokens) {
    console.log('❌ مفيش توكنز مخزّنة. شغّل `login`.');
    return;
  }
  const ageHours = ((Date.now() - tokens.obtained_at) / 1000 / 3600).toFixed(1);
  const expiresAt = new Date(tokens.obtained_at + tokens.expires_in * 1000);
  console.log('─── حالة YouTube ───');
  console.log(`scope:        ${tokens.scope}`);
  console.log(`refresh_token: ${tokens.refresh_token ? 'موجود ✓' : 'غير موجود ✗'}`);
  console.log(`access_token: ${ageHours} ساعة`);
  console.log(`ينتهي:        ${expiresAt.toLocaleString('ar-EG')}`);
}

function clear() {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
    console.log('✓ تم حذف التوكنز');
  } else {
    console.log('مفيش توكنز محفوظة.');
  }
}

async function getValidAccessToken() {
  // أولوية: env (secrets) فوق أي ملف توكنز ملتزَم/قديم — يمنع استخدام توكن متقادم في CI
  let tokens = (process.env.YT_CLIENT_ID && process.env.YT_REFRESH_TOKEN)
    ? importTokensFromEnv()
    : null;
  if (!tokens) tokens = readTokens();
  if (!tokens) {
    console.log('[youtube-oauth] لا يوجد ملف توكنز — محاولة البناء من env (وضع CI)');
    tokens = importTokensFromEnv();
  }
  if (!tokens) {
    throw new Error('لا يوجد توكن. شغّل `node youtube-oauth.cjs login` أولاً.');
  }
  const age = (Date.now() - tokens.obtained_at) / 1000;
  if (age < tokens.expires_in - 60) return tokens.access_token; // صالح (مع هامش دقيقة)

  console.log('[youtube-oauth] التوكن قرب ينتهي — جاري التجديد...');
  await refresh();
  const fresh = readTokens();
  if (!fresh?.access_token) {
    throw new Error('فشل تجديد التوكن: لا يوجد access_token بعد التجديد.');
  }
  return fresh.access_token;
}

const cmd = process.argv[2];
if (require.main === module) {
  (async () => {
    try {
      if (cmd === 'login') await login();
      else if (cmd === 'refresh') await refresh();
      else if (cmd === 'import') importTokensFromEnv();
      else if (cmd === 'status') status();
      else if (cmd === 'clear') clear();
      else {
        console.log('استخدام: node youtube-oauth.cjs {login|refresh|import|status|clear}');
        process.exit(1);
      }
    } catch (e) {
      console.error('❌', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { getValidAccessToken, TOKEN_FILE };
