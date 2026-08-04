#!/usr/bin/env node
/**
 * print-secrets.cjs — طباعة قيم GitHub Secrets من youtube-tokens.json
 * بعد `node youtube-oauth.cjs login` اقرأ هذه القيم وانقلها إلى
 * Settings → Secrets and variables → Actions في المستودع.
 */

const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, 'youtube-tokens.json');
if (!fs.existsSync(TOKEN_FILE)) {
  console.error('❌ youtube-tokens.json غير موجود. شغّل أولاً: node youtube-oauth.cjs login');
  process.exit(1);
}

const t = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
const secrets = {
  YT_CLIENT_ID: t.client_id,
  YT_CLIENT_SECRET: t.client_secret,
  YT_ACCESS_TOKEN: t.access_token,
  YT_REFRESH_TOKEN: t.refresh_token,
  YT_EXPIRES_IN: String(t.expires_in || 3600),
};

for (const [k, v] of Object.entries(secrets)) {
  if (!v) {
    console.error(`❌ القيمة ${k} غير موجودة في الملف — أعد تشغيل login.`);
    process.exit(1);
  }
}

console.log('═══ انسخ القيم التالية إلى GitHub Secrets (المستودع → Settings → Secrets → Actions) ═══\n');
for (const [k, v] of Object.entries(secrets)) {
  console.log(`${k}=${v}`);
}
console.log('\n═══ بعد الإضافة، شغّل workflow يدوياً للتجربة: ═══');
console.log('Actions → 🎬 الناشر اليومي — TikTok → Run workflow');
