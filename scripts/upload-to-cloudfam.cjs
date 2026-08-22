#!/usr/bin/env node
/**
 * scripts/upload-to-cloudfam.cjs
 * ─────────────────────────────
 * رفع كل ملفات PDF في public/books/ إلى CloudFam (PPD)
 * يستخدم PowerShell للرفع ( UPLOAD TO R2) لأن Node.js HTTPS لا يرفع بشكل صحيح
 *
 * الاستخدام:
 *   node scripts/upload-to-cloudfam.cjs --key YOUR_API_KEY
 *   node scripts/upload-to-cloudfam.cjs --key YOUR_API_KEY --limit 5
 *   node scripts/upload-to-cloudfam.cjs --key YOUR_API_KEY --resume
 *   node scripts/upload-to-cloudfam.cjs --key YOUR_API_KEY --status
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');
const { execSync } = require('child_process');

const BOOKS_DIR = path.join(__dirname, '..', 'public', 'books');
const LOG_FILE = path.join(__dirname, 'cloudfam-upload-log.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'cloudfam-urls.json');
const BASE_URL = 'https://cloudfam.io/api/v3';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { key: null, limit: Infinity, resume: false, status: false, concurrency: 1, delayMs: 1500 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--key' && args[i + 1]) opts.key = args[++i];
    else if (args[i] === '--limit' && args[i + 1]) opts.limit = parseInt(args[++i], 10);
    else if (args[i] === '--resume') opts.resume = true;
    else if (args[i] === '--status') opts.status = true;
    else if (args[i] === '--delay' && args[i + 1]) opts.delayMs = parseInt(args[++i], 10);
  }
  return opts;
}

function loadLog() {
  if (fs.existsSync(LOG_FILE)) {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  }
  return { uploaded: {}, failed: {}, total: 0 };
}

function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

function apiRequest(method, apiPath, body, apiKey) {
  return new Promise((resolve, reject) => {
    const fullPath = BASE_URL + apiPath;
    const url = new URL(fullPath);
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function uploadBinary(uploadUrl, filePath) {
  const escapedPath = filePath.replace(/'/g, "''");
  const escapedUrl = uploadUrl.replace(/'/g, "''");
  const psCmd = `$ErrorActionPreference='Stop'; $r = Invoke-WebRequest -Uri '${escapedUrl}' -Method PUT -ContentType 'application/pdf' -InFile '${escapedPath}' -UseBasicParsing -TimeoutSec 600; $r.StatusCode`;
  const result = execSync(`powershell.exe -NoProfile -Command "${psCmd}"`, {
    encoding: 'utf8',
    timeout: 600000,
    windowsHide: true
  }).trim();
  return { status: parseInt(result, 10) };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function showStatus(apiKey) {
  console.log('\n📊 حالة الحساب:');
  const balance = await apiRequest('GET', '/user/balance', null, apiKey);
  if (balance.success) {
    const d = balance.data;
    console.log(`  الرصيد: $${d.account_balance} | اليوم: $${d.today_earnings} | الإجمالي: $${d.lifetime_earnings}`);
  } else {
    console.log('  ⚠️ تعذر جلب الرصيد:', balance);
  }

  console.log('\n📁 الملفات المرفوعة:');
  const files = await apiRequest('GET', '/files?limit=10&page=1', null, apiKey);
  if (files.success) {
    const total = files.data.pagination?.total || 0;
    console.log(`  الإجمالي: ${total} ملف`);
    (files.data.data || []).slice(0, 5).forEach(f => {
      console.log(`  - ${f.original_filename} (${(f.file_size_bytes / 1048576).toFixed(1)} MB) | ${f.download_count} تحميل | ${f.download_url}`);
    });
  } else {
    console.log('  ⚠️ تعذر جلب الملفات:', JSON.stringify(files).substring(0, 200));
  }
}

async function main() {
  const opts = parseArgs();

  if (!opts.key) {
    console.error('❌ يجب تحديد API Key:');
    console.error('   node scripts/upload-to-cloudfam.cjs --key YOUR_API_KEY');
    process.exit(1);
  }

  if (opts.status) {
    await showStatus(opts.key);
    return;
  }

  if (!fs.existsSync(BOOKS_DIR)) {
    console.error('❌ المجلد غير موجود:', BOOKS_DIR);
    process.exit(1);
  }

  const log = loadLog();
  const pdfFiles = fs.readdirSync(BOOKS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`\n📚 ${pdfFiles.length} ملف PDF في ${BOOKS_DIR}`);

  let uploaded = 0, skipped = 0, failed = 0, attempted = 0;
  const limit = Math.min(opts.limit, pdfFiles.length);

  for (const filename of pdfFiles) {
    if (attempted >= limit) break;
    attempted++;

    const localPath = path.join(BOOKS_DIR, filename);
    const remotePath = '/books/' + filename;
    const fileSize = fs.statSync(localPath).size;
    const sizeMB = (fileSize / 1048576).toFixed(1);

    if (opts.resume && log.uploaded[remotePath]) {
      skipped++;
      continue;
    }

    console.log(`\n📤 [${attempted}/${limit}] ${filename.substring(0, 60)}... (${sizeMB} MB)`);

    try {
      const session = await apiRequest('POST', '/upload/session', {}, opts.key);
      if (!session.success || !session.data?.upload_url) {
        console.error('  ❌ فشل إنشاء جلسة:', JSON.stringify(session).substring(0, 200));
        log.failed[remotePath] = { error: 'session_failed' };
        failed++;
        await sleep(opts.delayMs * 2);
        continue;
      }

      const { upload_url, key } = session.data;
      console.log('  ⬆️ رفع...');

      const uploadResult = uploadBinary(upload_url, localPath);
      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        console.error('  ❌ فشل الرفع:', uploadResult.status);
        log.failed[remotePath] = { error: 'upload_failed', status: uploadResult.status };
        failed++;
        await sleep(opts.delayMs);
        continue;
      }

      console.log('  📝 إنهاء...');
      const finalize = await apiRequest('POST', '/files/finalize', {
        key: key,
        filename: filename,
        size: fileSize
      }, opts.key);

      let downloadUrl = null;
      if (finalize.success && finalize.data?.download_url) {
        downloadUrl = finalize.data.download_url;
      } else if (finalize.success && finalize.data?.short_url_id) {
        downloadUrl = 'https://cloudfam.io/' + finalize.data.short_url_id;
      } else {
        await sleep(3000);
        const search = await apiRequest('GET', `/files?q=${encodeURIComponent(filename)}&limit=1`, null, opts.key);
        if (search.success && search.data?.data?.[0]?.download_url) {
          downloadUrl = search.data.data[0].download_url;
        }
      }

      if (downloadUrl) {
        log.uploaded[remotePath] = { cloudfamUrl: downloadUrl, size: fileSize, uploadedAt: new Date().toISOString() };
        console.log(`  ✅ ${downloadUrl}`);
        uploaded++;
      } else {
        console.error('  ⚠️ الرفع نجح لكن لا رابط:', JSON.stringify(finalize).substring(0, 200));
        log.failed[remotePath] = { error: 'no_url' };
        failed++;
      }

      saveLog(log);
      await sleep(opts.delayMs);

    } catch (err) {
      console.error('  ❌ خطأ:', err.message);
      log.failed[remotePath] = { error: err.message };
      failed++;
      saveLog(log);
      await sleep(opts.delayMs);
    }
  }

  console.log('\n📝 إنشاء خريطة الروابط...');
  const urlMap = {
    v: '1.0.0',
    total: Object.keys(log.uploaded).length,
    uploaded: new Date().toISOString().split('T')[0],
    urls: log.uploaded
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(urlMap, null, 2), 'utf8');
  console.log(`  ✅ ${OUTPUT_FILE} (${Object.keys(log.uploaded).length} رابط)`);

  console.log(`\n📊 النتيجة:`);
  console.log(`  ✅ نجح: ${uploaded}`);
  console.log(`  ⏭️ مسبقاً: ${skipped}`);
  console.log(`  ❌ فشل: ${failed}`);
  console.log(`  📁 الإجمالي في السجل: ${Object.keys(log.uploaded).length}`);

  saveLog(log);
}

main().catch(err => {
  console.error('❌ خطأ عام:', err);
  process.exit(1);
});
