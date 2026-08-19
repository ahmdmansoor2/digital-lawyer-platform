/**
 * upload-to-ia-smart.cjs — نسخة محترمة من الـ SlowDown:
 * - concurrency 1 (مطلب واحد كل مرة)
 * - على 503/SlowDown: exponential backoff (1m, 5m, 15m, 30m, 60m, 120m)
 * - resume support (يتخطى الـ done والـ failed)
 * - يكتب إلى log + stdout
 * - يقدر يشتغل لأيام بدون تدخل
 *
 * الاستخدام:
 *   node scripts/upload-to-ia-smart.cjs            # افتراضي
 *   node scripts/upload-to-ia-smart.cjs --retry-failed   # أعد الـ failed
 *   node scripts/upload-to-ia-smart.cjs --only-failed    # الفاشل فقط
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Credentials
const credsPath = process.env.IA_CREDS_FILE || (process.env.USERPROFILE ? process.env.USERPROFILE + '\\.ia-credentials.json' : null);
let _creds = null;
if (credsPath && fs.existsSync(credsPath)) {
  try { _creds = JSON.parse(fs.readFileSync(credsPath, 'utf8')); } catch {}
}
const ACCESS_KEY = process.env.IA_ACCESS_KEY || (_creds && _creds.access) || '';
const SECRET_KEY = process.env.IA_SECRET_KEY || (_creds && _creds.secret) || '';
if (!ACCESS_KEY || !SECRET_KEY) {
  console.error('ERROR: Internet Archive credentials missing.');
  process.exit(2);
}
const ITEM = 'mohamidigital-library';
const HOST = 's3.us.archive.org';
const CONCURRENCY = 1;
// مسارات قابلة للتهيئة — محلياً D:\... وعلى GH Actions /workspace/...
const BOOKS_DIR = process.env.IA_BOOKS_DIR || 'D:\\قانوني 7\\public\\books';
const CHUNKS_DIR = process.env.IA_CHUNKS_DIR || 'D:\\قانوني 7\\public\\data\\library-docs-chunks';
const LOG_FILE = process.env.IA_LOG_FILE || path.join(__dirname, 'ia-upload-log.json');
const STATS_FILE = process.env.IA_STATS_FILE || path.join(__dirname, 'ia-upload-stats.json');
const BACKOFF_SCHEDULE = [60, 300, 900, 1800, 3600, 7200]; // 1m, 5m, 15m, 30m, 60m, 120m

// CLI flags
const CLI_ARGS = process.argv.slice(2);
const RETRY_FAILED = CLI_ARGS.includes('--retry-failed');
const ONLY_FAILED = CLI_ARGS.includes('--only-failed');

function loadLog() {
  if (fs.existsSync(LOG_FILE)) {
    try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); }
    catch { return { done: [], failed: [] }; }
  }
  return { done: [], failed: [] };
}
function saveLog(log) { fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2)); }

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b/1048576).toFixed(1) + ' MB';
  return (b/1073741824).toFixed(2) + ' GB';
}
function fmtTime(s) {
  if (!isFinite(s) || s < 0) return '?';
  if (s < 60) return Math.round(s) + 's';
  if (s < 3600) return Math.floor(s/60) + 'm' + Math.round(s%60) + 's';
  return Math.floor(s/3600) + 'h' + Math.floor((s%3600)/60) + 'm';
}
function now() { return new Date().toISOString().replace('T', ' ').substring(0, 19); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function uploadFile(localPath, remoteName) {
  return new Promise((resolve) => {
    let fileContent;
    try { fileContent = fs.readFileSync(localPath); }
    catch (e) { return resolve({ ok: false, status: 0, body: 'read fail: ' + e.message, isSlowDown: false }); }
    const auth = 'LOW ' + ACCESS_KEY + ':' + SECRET_KEY;
    const fileName = path.basename(localPath);
    const encodedRemote = remoteName.split('/').map(seg => encodeURIComponent(seg)).join('/');
    const urlPath = '/' + ITEM + '/' + encodedRemote;

    const req = https.request({
      hostname: HOST, port: 443, path: urlPath, method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileContent.length,
        'Authorization': auth,
        'x-archive-meta-title': fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').replace(/[^\x20-\x7E]/g, '').trim() || 'untitled',
        'x-archive-meta-mediatype': 'texts',
        'x-archive-meta-language': 'ara',
        'x-archive-meta-creator': 'Ahmed Mansour - Egyptian Lawyer',
        'x-archive-meta-licenseurl': 'http://creativecommons.org/licenses/by-nc-sa/4.0/'
      }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        const isSlowDown = res.statusCode === 503 && /SlowDown/i.test(body);
        if (res.statusCode === 200) resolve({ ok: true, size: fileContent.length });
        else resolve({ ok: false, status: res.statusCode, body: body.substring(0, 200), isSlowDown });
      });
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, body: 'net: ' + e.message, isSlowDown: false }));
    req.setTimeout(300000, () => { req.destroy(); resolve({ ok: false, status: 0, body: 'timeout', isSlowDown: false }); });
    req.write(fileContent);
    req.end();
  });
}

async function uploadWithBackoff(localPath, remoteName) {
  let attempt = 0;
  while (true) {
    const r = await uploadFile(localPath, remoteName);
    if (r.ok) return { ...r, attempts: attempt + 1 };
    if (r.isSlowDown && attempt < BACKOFF_SCHEDULE.length) {
      const wait = BACKOFF_SCHEDULE[attempt];
      console.log('  [' + now() + '] SlowDown — sleeping ' + fmtTime(wait) + ' before retry (attempt ' + (attempt + 2) + '/' + (BACKOFF_SCHEDULE.length + 1) + ')');
      await sleep(wait * 1000);
      attempt++;
      continue;
    }
    return { ...r, attempts: attempt + 1 };
  }
}

async function processQueue(items, type) {
  const log = loadLog();
  const done = new Set(log.done);
  const failedSet = new Set(log.failed.map(f => f.name));

  let queue;
  if (ONLY_FAILED) {
    queue = items.filter(item => failedSet.has(item.remote) && !done.has(item.remote));
  } else if (RETRY_FAILED) {
    queue = items.filter(item => !done.has(item.remote));
  } else {
    queue = items.filter(item => !done.has(item.remote) && !failedSet.has(item.remote));
  }

  console.log('=== ' + type + ' ===');
  console.log('  ' + now() + ' | Total: ' + items.length + ' | Done: ' + done.size + ' | Failed: ' + failedSet.size + ' | Queue: ' + queue.length);
  if (queue.length === 0) { console.log('  (nothing to do)'); return; }

  let processed = 0, successCount = 0, failCount = 0;
  const startTime = Date.now();
  for (const item of queue) {
    const r = await uploadWithBackoff(item.local, item.remote);
    processed++;
    const sizeMB = (r.size || 0) / 1048576;
    if (r.ok) {
      console.log('  [' + now() + '] [' + processed + '/' + queue.length + '] OK (' + sizeMB.toFixed(1) + ' MB, ' + r.attempts + ' attempts) ' + item.remote);
      log.done.push(item.remote);
      log.failed = log.failed.filter(f => f.name !== item.remote);
      successCount++;
    } else {
      console.log('  [' + now() + '] [' + processed + '/' + queue.length + '] FAIL(' + r.status + ') (' + sizeMB.toFixed(1) + ' MB, ' + r.attempts + ' attempts) ' + item.remote);
      log.failed = log.failed.filter(f => f.name !== item.remote);
      log.failed.push({ name: item.remote, status: r.status, body: r.body, at: new Date().toISOString() });
      failCount++;
    }
    saveLog(log);
  }
  console.log('  ' + now() + ' | ' + type + ' done. Success: ' + successCount + ' | Failed: ' + failCount + ' | Elapsed: ' + fmtTime((Date.now() - startTime) / 1000));
}

async function main() {
  const bookFiles = fs.readdirSync(BOOKS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  const bookItems = bookFiles.map(name => {
    const local = path.join(BOOKS_DIR, name);
    let size = 0; try { size = fs.statSync(local).size; } catch {}
    return { local, remote: name, size };
  });
  let chunkFiles = [];
  if (fs.existsSync(CHUNKS_DIR)) {
    chunkFiles = fs.readdirSync(CHUNKS_DIR).filter(f => f.endsWith('.json')).map(f => {
      const local = path.join(CHUNKS_DIR, f);
      let size = 0; try { size = fs.statSync(local).size; } catch {}
      return { local, remote: 'chunks/' + f, size };
    });
  }
  console.log('Smart IA Upload — concurrency 1, respect SlowDown');
  console.log('Books: ' + bookItems.length + ' | Chunks: ' + chunkFiles.length);
  console.log('Started: ' + now());
  console.log('');
  await processQueue(bookItems, 'Books (PDF)');
  if (chunkFiles.length > 0) await processQueue(chunkFiles, 'Chunks (JSON)');
  const log = loadLog();
  console.log('');
  console.log('=== FINAL ===');
  console.log('  Total done: ' + log.done.length);
  console.log('  Total failed: ' + log.failed.length);
  console.log('Finished: ' + now());
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
