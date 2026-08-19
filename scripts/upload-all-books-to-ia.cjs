/**
 * upload-all-books-to-ia.cjs — يرفع كامل المكتبة (1846 PDF) إلى Internet Archive
 * - LOW auth (verified working)
 * - concurrency 5 (للاستقرار)
 * - resume support (يتخطى الملفات المرفوعة)
 * - تقرير مفصل + تقدير الوقت
 * - يعمل في الخلفية بأمان
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// Internet Archive S3 credentials
const credsPath = process.env.IA_CREDS_FILE || (process.env.USERPROFILE ? process.env.USERPROFILE + '\\.ia-credentials.json' : null);
let _creds = null;
if (credsPath && fs.existsSync(credsPath)) {
  try { _creds = JSON.parse(fs.readFileSync(credsPath, 'utf8')); } catch {}
}
const ACCESS_KEY = process.env.IA_ACCESS_KEY || (_creds && _creds.access) || '';
const SECRET_KEY = process.env.IA_SECRET_KEY || (_creds && _creds.secret) || '';
if (!ACCESS_KEY || !SECRET_KEY) {
  console.error('ERROR: Internet Archive credentials missing.');
  console.error('Set IA_ACCESS_KEY and IA_SECRET_KEY env vars, or create %USERPROFILE%\\.ia-credentials.json:');
  console.error('  { "access": "...", "secret": "..." }');
  process.exit(2);
}
const ITEM = 'mohamidigital-library';
const HOST = 's3.us.archive.org';
const CONCURRENCY = 5;          // 5 طلبات متوازية
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// CLI flags
const CLI_ARGS = process.argv.slice(2);
const RETRY_FAILED = CLI_ARGS.includes('--retry-failed');   // أعد محاولة الفاشل
const ONLY_FAILED = CLI_ARGS.includes('--only-failed');     // ارفع الفاشل بس
const FAIL_FAST_5XX = !CLI_ARGS.includes('--no-fail-fast'); // لا تعيد محاولة 5xx (افتراضي: true)

const BOOKS_DIR = 'D:\\قانوني 7\\public\\books';
const CHUNKS_DIR = 'D:\\قانوني 7\\public\\data\\library-docs-chunks';
const LOG_FILE = path.join(__dirname, 'ia-upload-log.json');
const STATS_FILE = path.join(__dirname, 'ia-upload-stats.json');

// السجل
function loadLog() {
  if (fs.existsSync(LOG_FILE)) {
    try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); }
    catch { return { done: [], failed: [] }; }
  }
  return { done: [], failed: [] };
}
function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}
function loadStats() {
  if (fs.existsSync(STATS_FILE)) {
    try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); }
    catch { return { startedAt: null, finishedAt: null, totalSize: 0, uploadedSize: 0, booksUploaded: 0, booksFailed: 0 }; }
  }
  return { startedAt: null, finishedAt: null, totalSize: 0, uploadedSize: 0, booksUploaded: 0, booksFailed: 0 };
}
function saveStats(s) { fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2)); }

function uploadFile(localPath, remoteName) {
  return new Promise((resolve) => {
    let fileContent;
    try { fileContent = fs.readFileSync(localPath); }
    catch (e) { return resolve({ ok: false, status: 0, body: 'read fail: ' + e.message }); }
    const auth = 'LOW ' + ACCESS_KEY + ':' + SECRET_KEY;
    const fileName = path.basename(localPath);
    // URL-encode the path (Arabic filenames, spaces, etc.)
    const encodedRemote = remoteName.split('/').map(seg => encodeURIComponent(seg)).join('/');
    const urlPath = '/' + ITEM + '/' + encodedRemote;

    const req = https.request({
      hostname: HOST,
      port: 443,
      path: urlPath,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileContent.length,
        'Authorization': auth,
        // HTTP headers must be printable ASCII — strip Arabic/non-ASCII from the title (file content itself keeps Arabic).
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
        if (res.statusCode === 200) resolve({ ok: true, size: fileContent.length });
        else resolve({ ok: false, status: res.statusCode, body });
      });
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, body: 'net: ' + e.message }));
    req.setTimeout(300000, () => { req.destroy(); resolve({ ok: false, status: 0, body: 'timeout' }); });
    req.write(fileContent);
    req.end();
  });
}

function uploadWithRetry(localPath, remoteName, retries) {
  return uploadFile(localPath, remoteName).then(r => {
    if (r.ok) return r;
    // 5xx (server-side) → لا تكرر، المشكلة عند IA مش عندنا
    if (FAIL_FAST_5XX && r.status >= 500 && r.status < 600) return r;
    if (retries < MAX_RETRIES) {
      return new Promise(resolve => setTimeout(() => resolve(uploadWithRetry(localPath, remoteName, retries + 1)), RETRY_DELAY_MS));
    }
    return r;
  });
}

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b/1048576).toFixed(1) + ' MB';
  return (b/1073741824).toFixed(2) + ' GB';
}
function fmtTime(s) {
  if (!isFinite(s) || s < 0) return '?';
  if (s < 60) return Math.round(s) + 's';
  if (s < 3600) return Math.round(s/60) + 'm';
  return Math.floor(s/3600) + 'h ' + Math.round((s%3600)/60) + 'm';
}

async function processQueue(items, type) {
  const log = loadLog();
  const stats = loadStats();
  const done = new Set(log.done);
  const failedSet = new Set(log.failed.map(f => f.name));

  // --only-failed: ارفع الفاشل فقط (يتخطى الـ done)
  let queue;
  if (ONLY_FAILED) {
    queue = items.filter(item => failedSet.has(item.remote) && !done.has(item.remote));
  } else if (RETRY_FAILED) {
    queue = items.filter(item => !done.has(item.remote));
  } else {
    // افتراضي: تخطَّ الـ done والـ failed معاً (السكربت القديم كان بيرجع يحاول في الفاشل كل run — كان ياخد ساعات بدون فايدة)
    queue = items.filter(item => !done.has(item.remote) && !failedSet.has(item.remote));
  }

  const skippedFailed = items.filter(i => !done.has(i.remote) && failedSet.has(i.remote) && !queue.includes(i)).length;
  const alreadyDone = items.length - queue.length - skippedFailed;

  console.log('=== ' + type + ' ===');
  console.log('  Total: ' + items.length);
  if (ONLY_FAILED) {
    console.log('  Not in failed list: ' + alreadyDone + ' (done + unattempted)');
  } else {
    console.log('  Already done: ' + alreadyDone);
  }
  console.log('  Previously failed: ' + skippedFailed + (RETRY_FAILED ? ' (RETRYING — --retry-failed)' : (ONLY_FAILED ? ' (ONLY — --only-failed)' : ' (skipping — use --retry-failed to retry)')));
  console.log('  To upload: ' + queue.length);
  if (queue.length > 0) {
    const totalSize = queue.reduce((s, i) => s + (i.size || 0), 0);
    console.log('  Remaining size: ' + fmtSize(totalSize));
  }
  console.log('');

  if (queue.length === 0) {
    console.log('  (nothing to do)');
    console.log('');
    return;
  }

  const startTime = Date.now();
  let processed = 0;
  let successCount = 0;
  let failCount = 0;
  let uploadedSize = 0;

  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (item) => {
      const r = await uploadWithRetry(item.local, item.remote, 0);
      processed++;
      const sizeMB = (r.size || 0) / 1048576;
      const status = r.ok ? 'OK' : 'FAIL(' + r.status + ')';
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed; // files/sec
      const eta = (queue.length - processed) / rate;
      const pct = ((processed / queue.length) * 100).toFixed(1);
      console.log('  [' + processed + '/' + queue.length + ' ' + pct + '%] ' + status + ' (' + sizeMB.toFixed(1) + ' MB) ' + item.remote + ' | ETA ' + fmtTime(eta));
      if (r.ok) {
        log.done.push(item.remote);
        successCount++;
        uploadedSize += (r.size || 0);
      } else {
        // أزل المحاولة القديمة لنفس الملف قبل إضافة الجديدة (عشان السجل ما يتفخش بتكرار 93-14.pdf 46 مرة)
        log.failed = log.failed.filter(f => f.name !== item.remote);
        log.failed.push({ name: item.remote, status: r.status, body: (r.body || '').substring(0, 200), at: new Date().toISOString() });
        failCount++;
      }
      return r;
    }));
    saveLog(log);
    stats.booksUploaded = successCount;
    stats.booksFailed = failCount;
    stats.uploadedSize = uploadedSize;
    saveStats(stats);
  }

  console.log('');
  console.log('=== Summary (' + type + ') ===');
  console.log('  Success: ' + successCount);
  console.log('  Failed: ' + failCount);
  console.log('  Elapsed: ' + fmtTime((Date.now() - startTime) / 1000));
  console.log('  Uploaded: ' + fmtSize(uploadedSize));
}

async function main() {
  // كل الكتب في BOOKS_DIR
  let bookFiles;
  try { bookFiles = fs.readdirSync(BOOKS_DIR).filter(f => f.toLowerCase().endsWith('.pdf')); }
  catch (e) { console.error('BOOKS_DIR not readable: ' + e.message); process.exit(1); }

  const bookItems = bookFiles.map(name => {
    const local = path.join(BOOKS_DIR, name);
    let size = 0;
    try { size = fs.statSync(local).size; } catch {}
    return { local, remote: name, size };
  });

  console.log('Total books in dir: ' + bookItems.length);
  const totalSize = bookItems.reduce((s, i) => s + i.size, 0);
  console.log('Total size: ' + fmtSize(totalSize));
  console.log('Flags: ' + (RETRY_FAILED ? '[--retry-failed] ' : '') + (ONLY_FAILED ? '[--only-failed] ' : '') + (FAIL_FAST_5XX ? '[--fail-fast-5xx] ' : ''));
  console.log('');

  // chunks (اختياري — موجود مسبقاً لكن نعيد للتأكد)
  let chunkFiles = [];
  if (fs.existsSync(CHUNKS_DIR)) {
    chunkFiles = fs.readdirSync(CHUNKS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const local = path.join(CHUNKS_DIR, f);
        let size = 0;
        try { size = fs.statSync(local).size; } catch {}
        return { local, remote: 'chunks/' + f, size };
      });
  }
  console.log('Chunks: ' + chunkFiles.length);
  console.log('');

  const stats = loadStats();
  stats.startedAt = stats.startedAt || new Date().toISOString();
  stats.totalSize = totalSize + chunkFiles.reduce((s, i) => s + i.size, 0);
  saveStats(stats);

  await processQueue(bookItems, 'Books (PDF) — full library');
  if (chunkFiles.length > 0) await processQueue(chunkFiles, 'Chunks (JSON)');

  const finalLog = loadLog();
  stats.finishedAt = new Date().toISOString();
  saveStats(stats);

  console.log('');
  console.log('=== FINAL ===');
  console.log('  Total done: ' + finalLog.done.length);
  console.log('  Total failed: ' + finalLog.failed.length);
  if (finalLog.failed.length > 0) {
    console.log('');
    console.log('Failed files:');
    finalLog.failed.forEach(f => console.log('  - ' + f.name + ' (' + f.status + ')'));
  }
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
