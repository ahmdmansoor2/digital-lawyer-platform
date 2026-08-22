/**
 * upload-referenced-books.cjs — يرفع فقط الكتب الـ 1085 المُشار إليها في الـ catalog
 * - LOW auth
 * - URL-encoded paths (يدعم العربية)
 * - concurrency 5
 * - resume support
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

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
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const BOOKS_DIR = 'D:\\قانوني 7\\public\\books';
const CATALOG = 'D:\\قانوني 7\\public\\data\\legal-catalog-summary.json';
const LOG_FILE = path.join(__dirname, 'ia-upload-log.json');

function loadLog() {
  if (fs.existsSync(LOG_FILE)) {
    try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); }
    catch { return { done: [], failed: [] }; }
  }
  return { done: [], failed: [] };
}
function saveLog(log) { fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2)); }

function uploadFile(localPath, remoteName) {
  return new Promise((resolve) => {
    let fileContent;
    try { fileContent = fs.readFileSync(localPath); }
    catch (e) { return resolve({ ok: false, status: 0, body: 'read fail: ' + e.message }); }
    const auth = 'LOW ' + ACCESS_KEY + ':' + SECRET_KEY;
    const fileName = path.basename(localPath);
    // URL-encode each path segment
    const encodedRemote = remoteName.split('/').map(seg => encodeURIComponent(seg)).join('/');
    const urlPath = '/' + ITEM + '/' + encodedRemote;

    const req = https.request({
      hostname: HOST, port: 443, path: urlPath, method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileContent.length,
        'Authorization': auth,
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
        else resolve({ ok: false, status: res.statusCode, body: body.substring(0, 300) });
      });
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, body: 'net: ' + e.message }));
    req.setTimeout(600000, () => { req.destroy(); resolve({ ok: false, status: 0, body: 'timeout 10min' }); });
    req.write(fileContent);
    req.end();
  });
}

function uploadWithRetry(localPath, remoteName, retries) {
  return uploadFile(localPath, remoteName).then(r => {
    if (r.ok) return r;
    if (retries < MAX_RETRIES) {
      return new Promise(resolve => setTimeout(() => resolve(uploadWithRetry(localPath, remoteName, retries + 1)), RETRY_DELAY_MS));
    }
    return r;
  });
}

function fmtSize(b) {
  if (b < 1048576) return (b/1024).toFixed(0) + ' KB';
  if (b < 1073741824) return (b/1048576).toFixed(1) + ' MB';
  return (b/1073741824).toFixed(2) + ' GB';
}
function fmtTime(s) {
  if (!isFinite(s) || s < 0) return '?';
  if (s < 60) return Math.round(s) + 's';
  if (s < 3600) return Math.round(s/60) + 'm';
  return Math.floor(s/3600) + 'h' + Math.round((s%3600)/60) + 'm';
}

async function main() {
  // Read catalog and extract referenced books
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const bookItems = catalog.items.filter(i => (i.u || '').startsWith('/books/'));
  console.log('Catalog /books/ items: ' + bookItems.length);

  // Build upload queue — only files that exist
  const files = new Set(fs.readdirSync(BOOKS_DIR));
  const queue = [];
  let missing = 0;
  for (const item of bookItems) {
    const urlPath = item.u.substring(7); // remove '/books/'
    let decoded;
    try { decoded = decodeURIComponent(urlPath); } catch { decoded = urlPath; }
    if (files.has(decoded)) {
      let size = 0;
      try { size = fs.statSync(path.join(BOOKS_DIR, decoded)).size; } catch {}
      queue.push({ local: path.join(BOOKS_DIR, decoded), remote: decoded, size, catalogId: item.i });
    } else {
      missing++;
    }
  }
  console.log('To upload: ' + queue.length + ', missing: ' + missing);
  const totalSize = queue.reduce((s, i) => s + i.size, 0);
  console.log('Total size: ' + fmtSize(totalSize));
  console.log('');

  const log = loadLog();
  const done = new Set(log.done);
  const todo = queue.filter(i => !done.has(i.remote));
  console.log('Already done: ' + (queue.length - todo.length));
  console.log('Remaining: ' + todo.length);
  if (todo.length === 0) {
    console.log('All done!');
    return;
  }
  const remainingSize = todo.reduce((s, i) => s + i.size, 0);
  console.log('Remaining size: ' + fmtSize(remainingSize));
  console.log('');

  const startTime = Date.now();
  let processed = 0, successCount = 0, failCount = 0, uploadedSize = 0;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (item) => {
      const r = await uploadWithRetry(item.local, item.remote, 0);
      processed++;
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const eta = (todo.length - processed) / rate;
      const pct = ((processed / todo.length) * 100).toFixed(1);
      const status = r.ok ? 'OK' : 'FAIL(' + r.status + ')';
      const sizeMB = ((r.size || item.size) / 1048576).toFixed(1);
      console.log('[' + processed + '/' + todo.length + ' ' + pct + '%] ' + status + ' ' + sizeMB + 'MB ' + item.remote.substring(0, 60) + ' | ETA ' + fmtTime(eta));
      if (r.ok) {
        log.done.push(item.remote);
        successCount++;
        uploadedSize += (r.size || 0);
      } else {
        log.failed.push({ name: item.remote, status: r.status, body: r.body });
        failCount++;
      }
    }));
    saveLog(log);
  }

  console.log('');
  console.log('=== Summary ===');
  console.log('  Success: ' + successCount);
  console.log('  Failed: ' + failCount);
  console.log('  Elapsed: ' + fmtTime((Date.now() - startTime) / 1000));
  console.log('  Uploaded: ' + fmtSize(uploadedSize));
  if (failCount > 0) {
    console.log('');
    console.log('Failed files:');
    log.failed.slice(-10).forEach(f => console.log('  - ' + f.name + ' (' + f.status + ')'));
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
