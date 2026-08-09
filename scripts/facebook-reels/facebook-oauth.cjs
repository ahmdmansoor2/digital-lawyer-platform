#!/usr/bin/env node
/**
 * facebook-oauth.cjs — إدارة OAuth + Page Access Token لـ Facebook Graph API
 *
 * التدفّق:
 *   1) Authorization Code Flow → User Access Token قصير
 *   2) Exchange لـ Long-Lived User Token (60 يوم)
 *   3) جلب Pages اللي يديّرها المستخدم + الـ Page Access Tokens (دائمة)
 *   4) حفظ في facebook-tokens.json
 *
 * الاستخدام:
 *   node facebook-oauth.cjs login          # يفتح المتصفح
 *   node facebook-oauth.cjs status         # حالة التوكن
 *   node facebook-oauth.cjs clear          # حذف
 *
 * المتطلبات (في .env):
 *   FB_APP_ID=...      (developers.facebook.com/apps)
 *   FB_APP_SECRET=...
 *   FB_REDIRECT_URI=http://localhost:8788/oauth/callback
 *   FB_OAUTH_PORT=8788
 *   FB_PAGE_ID=...     (بعد login — هيظهر في status)
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

const TOKEN_FILE = path.join(__dirname, 'facebook-tokens.json');
const APP_ID = process.env.FB_APP_ID;
const APP_SECRET = process.env.FB_APP_SECRET;
const REDIRECT_URI = process.env.FB_REDIRECT_URI || 'http://localhost:8788/oauth/callback';
const OAUTH_PORT = parseInt(process.env.FB_OAUTH_PORT || '8788', 10);
const SCOPES = 'pages_show_list,pages_manage_posts,pages_read_engagement,public_profile';

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
function assertConfigured() {
  if (!APP_ID || !APP_SECRET) {
    console.error('❌ FB_APP_ID و FB_APP_SECRET مش متضبوطين في .env');
    console.error('   سجّل تطبيق على https://developers.facebook.com/apps/');
    process.exit(1);
  }
}
function openBrowser(targetUrl) {
  const cmd = process.platform === 'win32' ? `start "" "${targetUrl}"`
            : process.platform === 'darwin' ? `open "${targetUrl}"`
            : `xdg-open "${targetUrl}"`;
  exec(cmd, () => {});
}

async function login() {
  assertConfigured();
  const { verifier, challenge } = generatePKCE();
  const state = b64url(crypto.randomBytes(16));

  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth/');
  authUrl.searchParams.set('client_id', APP_ID);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  console.log(`[oauth] جاري فتح المتصفح لربط حساب Facebook...`);
  console.log(`[oauth] Redirect URI: ${REDIRECT_URI}`);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsed = url.parse(req.url, true);
        if (parsed.pathname !== new URL(REDIRECT_URI).pathname) {
          res.writeHead(404); res.end('Not found'); return;
        }
        const { code, state: returnedState, error } = parsed.query;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (error) {
          res.end(`<h1 style="color:red;font-family:tahoma">فشل الربط: ${error}</h1>`);
          server.close();
          return reject(new Error(`OAuth error: ${error}`));
        }
        if (returnedState !== state) {
          res.end(`<h1 style="color:red;font-family:tahoma">خطأ: state غير مطابق</h1>`);
          server.close();
          return reject(new Error('State mismatch'));
        }

        // 1) Exchange code → short-lived user token
        const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', APP_ID);
        tokenUrl.searchParams.set('client_secret', APP_SECRET);
        tokenUrl.searchParams.set('code', String(code));
        tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        tokenUrl.searchParams.set('code_verifier', verifier);

        const tokenResp = await fetch(tokenUrl);
        const tokenData = await tokenResp.json();
        if (tokenData.error) {
          res.end(`<h1 style="color:red;font-family:tahoma">فشل استلام التوكن</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
          server.close();
          return reject(new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`));
        }
        const shortLivedToken = tokenData.access_token;

        // 2) Exchange → long-lived user token (60 days)
        const longUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
        longUrl.searchParams.set('grant_type', 'fb_exchange_token');
        longUrl.searchParams.set('client_id', APP_ID);
        longUrl.searchParams.set('client_secret', APP_SECRET);
        longUrl.searchParams.set('fb_exchange_token', shortLivedToken);
        const longResp = await fetch(longUrl);
        const longData = await longResp.json();
        const longLivedToken = longData.access_token || shortLivedToken;

        // 3) جلب الـ Pages + Page Access Tokens
        const pagesResp = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`);
        const pagesData = await pagesResp.json();
        if (pagesData.error) {
          res.end(`<h1 style="color:red">فشل جلب الصفحات</h1><pre>${JSON.stringify(pagesData.error, null, 2)}</pre>`);
          server.close();
          return reject(new Error(`Pages fetch failed: ${JSON.stringify(pagesData.error)}`));
        }

        const pages = (pagesData.data || []).map(p => ({
          id: p.id,
          name: p.name,
          access_token: p.access_token,
          category: p.category,
        }));

        const tokens = {
          user_token: longLivedToken,
          user_token_expires_at: Date.now() + (longData.expires_in || 60 * 24 * 3600) * 1000,
          pages,
          obtained_at: Date.now(),
        };
        writeTokens(tokens);
        res.end(`<h1 style="color:green;font-family:tahoma">✓ تم الربط بنجاح!</h1>
                 <p>عدد الصفحات: ${pages.length}</p>
                 <ul>${pages.map(p => `<li>${p.name} (ID: ${p.id})</li>`).join('')}</ul>
                 <p>أغلق الصفحة وارجع للترمنال.</p>`);
        server.close();
        resolve(tokens);
      } catch (e) {
        res.writeHead(500); res.end('Internal error');
        server.close();
        reject(e);
      }
    });
    server.listen(OAUTH_PORT, '127.0.0.1', () => {
      console.log(`[oauth] Listening on http://127.0.0.1:${OAUTH_PORT}`);
      openBrowser(authUrl.toString());
    });
  });
}

function status() {
  const tokens = readTokens();
  if (!tokens) {
    console.log('❌ مفيش توكنز. شغّل `login`.');
    return;
  }
  console.log('─── حالة Facebook ───');
  const userExpires = new Date(tokens.user_token_expires_at).toLocaleString('ar-EG');
  console.log(`User Token ينتهي: ${userExpires}`);
  console.log(`عدد الصفحات: ${tokens.pages?.length || 0}`);
  tokens.pages?.forEach(p => {
    console.log(`  • ${p.name} (ID: ${p.id}) — category: ${p.category}`);
  });
  if (process.env.FB_PAGE_ID) {
    const page = tokens.pages?.find(p => p.id === process.env.FB_PAGE_ID);
    if (page) console.log(`✓ FB_PAGE_ID مضبوط على: ${page.name}`);
    else console.warn(`⚠️  FB_PAGE_ID=${process.env.FB_PAGE_ID} مش في التوكنز. المتاح: ${tokens.pages?.map(p => p.id).join(', ')}`);
  } else {
    console.log('⚠️  FB_PAGE_ID مش مضبوط في .env — حط ID الصفحة المطلوبة');
  }
}

function clear() {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
    console.log('✓ تم حذف التوكنز');
  } else {
    console.log('مفيش توكنز محفوظة.');
  }
}

function getPageAccessToken() {
  const tokens = readTokens();
  if (!tokens) throw new Error('لا يوجد توكن. شغّل `node facebook-oauth.cjs login` أولاً.');
  const pageId = process.env.FB_PAGE_ID;
  if (!pageId) throw new Error('FB_PAGE_ID مش مضبوط في .env');
  const page = tokens.pages?.find(p => p.id === pageId);
  if (!page) throw new Error(`الصفحة ${pageId} مش في التوكنز. شغّل login مرة أخرى.`);
  return { pageId, pageName: page.name, accessToken: page.access_token };
}

if (require.main === module) {
  const cmd = process.argv[2];
  (async () => {
    try {
      if (cmd === 'login') await login();
      else if (cmd === 'status') status();
      else if (cmd === 'clear') clear();
      else {
        console.log('استخدام: node facebook-oauth.cjs {login|status|clear}');
        process.exit(1);
      }
    } catch (e) {
      console.error('❌', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { getPageAccessToken, TOKEN_FILE };
