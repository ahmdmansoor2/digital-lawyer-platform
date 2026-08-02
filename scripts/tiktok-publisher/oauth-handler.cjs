#!/usr/bin/env node
/**
 * oauth-handler.cjs — إدارة OAuth2 + تخزين التوكنز لـ TikTok Content Posting API
 *
 * - يبدأ Authorization Code Flow مع PKCE
 * - يفتح local server على TIKTOK_OAUTH_PORT ليستقبل الـ callback
 * - يحوّل الكود لـ access_token + refresh_token
 * - يخزّنهم في tiktok-tokens.json (محلياً — يجب حمايته بصلاحيات NTFS)
 * - يجدد التوكن أوتوماتيك لو انتهى
 *
 * الاستخدام:
 *   node oauth-handler.cjs login     # يفتح المتصفح لبدء OAuth
 *   node oauth-handler.cjs status    # يعرض حالة التوكن
 *   node oauth-handler.cjs refresh   # يجدد التوكن يدوياً
 *   node oauth-handler.cjs import    # يبني الملف من متغيرات env (CI)
 *   node oauth-handler.cjs clear     # يحذف التوكنز المخزّنة
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { exec } = require('child_process');
const url = require('url');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOKEN_FILE = path.join(__dirname, 'tiktok-tokens.json');
const CERTS_DIR = path.join(__dirname, '.certs');
const CERT_KEY = path.join(CERTS_DIR, 'localhost-key.pem');
const CERT_PEM = path.join(CERTS_DIR, 'localhost-cert.pem');
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'https://localhost:8787/oauth/callback';
const OAUTH_PORT = parseInt(process.env.TIKTOK_OAUTH_PORT || '8787', 10);
const SCOPES = 'user.info.basic,video.upload,video.publish';

// ─── أدوات ──────────────────────────────────────────────────────────────────
function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generatePKCE() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function readTokens() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); }
  catch { return null; }
}

function writeTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  console.log(`[oauth] ✓ تم حفظ التوكنز في ${TOKEN_FILE}`);
}

// ─── بناء tiktok-tokens.json من env (لـ GitHub Actions headless) ───────────
// المستخدم يشغّل `login` مرة واحدة محلياً، ثم ينقل قيم التوكنز لـ repo secrets.
// في الـ workflow يُبنى الملف من المتغيرات (obtained_at=0 → أول تجديد فوراً)،
// وبعد التجديد يُكتب refresh_token الجديد ويُرفع عبر commit في نفس الـ run.
function importTokensFromEnv() {
  const needed = ['TIKTOK_ACCESS_TOKEN', 'TIKTOK_REFRESH_TOKEN', 'TIKTOK_OPEN_ID', 'TIKTOK_EXPIRES_IN'];
  const missing = needed.filter(k => !process.env[k]);
  if (missing.length) {
    console.log(`[oauth] لا يوجد ملف توكنز ولا متغيرات env كاملة (ناقص: ${missing.join(', ')})`);
    return null;
  }
  const tokens = {
    access_token: process.env.TIKTOK_ACCESS_TOKEN,
    refresh_token: process.env.TIKTOK_REFRESH_TOKEN,
    expires_in: parseInt(process.env.TIKTOK_EXPIRES_IN, 10) || 86400,
    refresh_expires_in: parseInt(process.env.TIKTOK_REFRESH_EXPIRES_IN || '31536000', 10),
    obtained_at: 0, // صفر = يفرض التجديد فوراً في أول تشغيل CI
    scope: process.env.TIKTOK_SCOPE || 'user.info.basic,video.upload,video.publish',
    open_id: process.env.TIKTOK_OPEN_ID,
  };
  writeTokens(tokens);
  return tokens;
}

function assertConfigured() {
  if (!CLIENT_KEY || !CLIENT_SECRET) {
    console.error('❌ خطأ: TIKTOK_CLIENT_KEY و TIKTOK_CLIENT_SECRET مش متضبطين في .env');
    console.error('   سجّل تطبيق على https://developers.tiktok.com/apps/ وحط القيم في .env');
    process.exit(1);
  }
}

// ─── فتح الـ browser ────────────────────────────────────────────────────────
function openBrowser(targetUrl) {
  const cmd = process.platform === 'win32' ? `start "" "${targetUrl}"`
            : process.platform === 'darwin' ? `open "${targetUrl}"`
            : `xdg-open "${targetUrl}"`;
  exec(cmd, (err) => {
    if (err) console.log(`[oauth] افتح الرابط يدوياً في المتصفح:\n   ${targetUrl}`);
  });
}

// ─── شهادة self-signed لاستقبال الـ callback على https://localhost ──────────
// TikTok يرفض أي redirect_uri بدون https (حتى localhost). لذا نولّد شهادة
// محلية مرة واحدة، ويمرر المستخدم على تحذير "Not private" في المتصفح مرة واحدة.
function ensureCertificates() {
  try {
    if (fs.existsSync(CERT_KEY) && fs.existsSync(CERT_PEM)) {
      return {
        key: fs.readFileSync(CERT_KEY),
        cert: fs.readFileSync(CERT_PEM),
      };
    }
    const selfsigned = require('selfsigned');
    const pems = selfsigned.generate(
      [{ name: 'commonName', value: 'localhost' }],
      {
        days: 365,
        keySize: 2048,
        extensions: [
          { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }] },
        ],
      }
    );
    fs.mkdirSync(CERTS_DIR, { recursive: true });
    fs.writeFileSync(CERT_KEY, pems.private, { mode: 0o600 });
    fs.writeFileSync(CERT_PEM, pems.cert, { mode: 0o600 });
    return { key: pems.private, cert: pems.cert };
  } catch (e) {
    console.error('❌ فشل توليد الشهادة المحلية:', e.message);
    process.exit(1);
  }
}

// ─── الأوامر ────────────────────────────────────────────────────────────────
async function login() {
  assertConfigured();
  const { verifier, challenge } = generatePKCE();
  const state = b64url(crypto.randomBytes(16));

  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.set('client_key', CLIENT_KEY);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  console.log(`[oauth] جاري فتح المتصفح لربط حساب TikTok...`);
  console.log(`[oauth] Redirect URI: ${REDIRECT_URI}`);

  return new Promise((resolve, reject) => {
    const server = https.createServer(ensureCertificates(), async (req, res) => {
      try {
        const parsed = url.parse(req.url, true);
        const expectedPath = new URL(REDIRECT_URI).pathname;
        if (parsed.pathname !== expectedPath) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1 style="color:red;font-family:tahoma">404 — مسار خاطئ</h1><p>وصلنا: <code>${parsed.pathname}</code></p><p>المتوقع: <code>${expectedPath}</code></p><p>راجع قيمة Redirect URL في بورتال TikTok (يجب تطابق المسار حرفياً).</p>`);
          return;
        }
        const { code, state: returnedState, error } = parsed.query;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (error) {
          res.end(`<h1 style="color:red;font-family:tahoma">فشل الربط: ${error}</h1><p>أغلق الصفحة وارجع للترمنال.</p>`);
          server.close();
          return reject(new Error(`OAuth error: ${error}`));
        }
        if (returnedState !== state) {
          res.end(`<h1 style="color:red;font-family:tahoma">خطأ: state غير مطابق</h1>`);
          server.close();
          return reject(new Error('State mismatch'));
        }

        // Exchange code → tokens
        const tokenResp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: CLIENT_KEY,
            client_secret: CLIENT_SECRET,
            code: String(code),
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
            code_verifier: verifier,
          }),
        });
        const tokenData = await tokenResp.json();
        if (!tokenResp.ok || tokenData.error) {
          res.end(`<h1 style="color:red;font-family:tahoma">فشل استلام التوكن</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
          server.close();
          return reject(new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`));
        }

        const tokens = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          refresh_expires_in: tokenData.refresh_expires_in,
          obtained_at: Date.now(),
          scope: tokenData.scope,
          open_id: tokenData.open_id,
        };
        writeTokens(tokens);
        res.end(`<h1 style="color:green;font-family:tahoma">✓ تم الربط بنجاح!</h1><p>أغلق الصفحة وارجع للترمنال.</p>`);
        server.close();
        resolve(tokens);
      } catch (e) {
        res.writeHead(500); res.end('Internal error');
        server.close();
        reject(e);
      }
    });
    // نستمع على كل الواجهات (بدون host) حتى يصل الـ callback سواء كان المتصفح
    // يحل `localhost` على IPv4 (127.0.0.1) أو IPv6 (::1).
    server.listen(OAUTH_PORT, () => {
      console.log(`[oauth] Listening on ${REDIRECT_URI}`);
      console.log('[oauth] ⚠️ أول مرة بيظهر تحذير "Not private / غير آمن" — اضغط Advanced ثم Proceed to localhost (مرة واحدة).');
      console.log(`[oauth] لو ما فتحش المتصفح، الصق الرابط ده يدوياً:\n   ${authUrl.toString()}`);
      openBrowser(authUrl.toString());
    });
    // إغلاق أمان: لو ما جاش callback خلال 15 دقيقة، نقفل السيرفر
    setTimeout(() => {
      server.close();
      reject(new Error('انتهت مهلة الانتظار (15 دقيقة) — لم يصل الـ callback. تحقق من Redirect URL في البورتال.'));
    }, 15 * 60 * 1000).unref();
  });
}

async function refresh() {
  assertConfigured();
  const tokens = readTokens();
  if (!tokens?.refresh_token) {
    console.error('❌ مفيش refresh_token. شغّل `login` الأول.');
    process.exit(1);
  }
  const resp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) {
    console.error('❌ فشل التجديد:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
  const updated = {
    ...tokens,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    refresh_expires_in: data.refresh_expires_in,
    obtained_at: Date.now(),
  };
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
  console.log('─── حالة TikTok ───');
  console.log(`open_id:      ${tokens.open_id || '?'}`);
  console.log(`scope:        ${tokens.scope}`);
  console.log(`حصل عليه:     ${ageHours} ساعة`);
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
  let tokens = readTokens();
  if (!tokens) {
    console.log('[oauth] لا يوجد ملف توكنز — محاولة البناء من env (وضع CI)');
    tokens = importTokensFromEnv();
  }
  if (!tokens) {
    throw new Error('لا يوجد توكن. شغّل `node oauth-handler.cjs login` أولاً.');
  }
  const age = (Date.now() - tokens.obtained_at) / 1000;
  if (age < tokens.expires_in - 300) return tokens.access_token; // صالح (مع هامش 5 دقايق)

  console.log('[oauth] التوكن قرب ينتهي — جاري التجديد...');
  await refresh();
  return readTokens().access_token;
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
        console.log('استخدام: node oauth-handler.cjs {login|refresh|import|status|clear}');
        process.exit(1);
      }
    } catch (e) {
      console.error('❌', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { getValidAccessToken, TOKEN_FILE };
