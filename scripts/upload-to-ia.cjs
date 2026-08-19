/**
 * upload-to-ia.cjs — يرفع كتب PDF و chunks إلى Internet Archive
 * - LOW auth (verified working)
 * - concurrency 3 (للاستقرار)
 * - resume support (يتخطى الملفات المرفوعة)
 * - تقرير مفصل
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// Internet Archive S3 credentials — يجب توفيرها كمتغيرات بيئة:
//   set IA_ACCESS_KEY=<access>
//   set IA_SECRET_KEY=<secret>
// أو ملف C:\Users\<user>\.ia-credentials.json (محلي، غير ملتزم)
const fs_creds = require('fs');
const credsPath = process.env.IA_CREDS_FILE || (process.env.USERPROFILE ? process.env.USERPROFILE + '\\.ia-credentials.json' : null);
let _creds = null;
if (credsPath && fs_creds.existsSync(credsPath)) {
  try { _creds = JSON.parse(fs_creds.readFileSync(credsPath, 'utf8')); } catch {}
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
const CONCURRENCY = 3;
const MAX_RETRIES = 3;

const BOOKS_DIR = 'D:\\قانوني 7\\public\\books';
const CHUNKS_DIR = 'D:\\قانوني 7\\public\\data\\library-docs-chunks';
const LOG_FILE = path.join(__dirname, 'ia-upload-log.json');

// السجل (للإكمال لاحقاً)
function loadLog() {
  if (fs.existsSync(LOG_FILE)) {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  }
  return { done: [], failed: [] };
}
function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function uploadFile(localPath, remoteName) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(localPath);
    const auth = 'LOW ' + ACCESS_KEY + ':' + SECRET_KEY;
    const fileName = path.basename(localPath);
    const urlPath = '/' + ITEM + '/' + remoteName;

    const req = https.request({
      hostname: HOST,
      port: 443,
      path: urlPath,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileContent.length,
        'Authorization': auth,
        'x-archive-meta-title': fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '),
        'x-archive-meta-mediatype': 'texts',
        'x-archive-meta-language': 'ara',
        'x-archive-meta-creator': 'Ahmed Mansour - Egyptian Lawyer',
        'x-archive-meta-licenseurl': 'http://creativecommons.org/licenses/by-nc-sa/4.0/'
      }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, size: fileContent.length });
        } else {
          resolve({ ok: false, status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(fileContent);
    req.end();
  });
}

function uploadWithRetry(localPath, remoteName, retries = 0) {
  return uploadFile(localPath, remoteName).then(r => {
    if (r.ok) return r;
    if (retries < MAX_RETRIES) {
      return new Promise(resolve => setTimeout(() => {
        resolve(uploadWithRetry(localPath, remoteName, retries + 1));
      }, 2000));
    }
    return r;
  });
}

async function processQueue(items, type) {
  const log = loadLog();
  const done = new Set(log.done);
  const queue = items.filter(item => !done.has(item.remote));
  console.log('=== ' + type + ' ===');
  console.log('  Total: ' + items.length);
  console.log('  Already done: ' + (items.length - queue.length));
  console.log('  To upload: ' + queue.length);
  console.log('');

  let processed = 0;
  let successCount = 0;
  let failCount = 0;

  // معالجة متوازية
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (item) => {
      const r = await uploadWithRetry(item.local, item.remote);
      processed++;
      const sizeMB = (r.size || 0) / 1048576;
      const status = r.ok ? 'OK' : 'FAIL(' + r.status + ')';
      console.log('  [' + processed + '/' + queue.length + '] ' + status + ' (' + sizeMB.toFixed(1) + ' MB) ' + item.remote);
      if (r.ok) {
        log.done.push(item.remote);
        successCount++;
      } else {
        log.failed.push({ name: item.remote, status: r.status, body: r.body });
        failCount++;
      }
      return r;
    }));
    // حفظ السجل بعد كل دفعة
    saveLog(log);
  }

  console.log('');
  console.log('=== Summary (' + type + ') ===');
  console.log('  Success: ' + successCount);
  console.log('  Failed: ' + failCount);
  console.log('  Log saved to: ' + LOG_FILE);
}

async function main() {
  // الكتب المُشار إليها في legal-library.html (18 كتاب)
  const refBooks = [
    'sanhouri-waseet-vol-1-sources-of-obligation.pdf',
    'sanhouri-waseet-vol-2-evidence-and-effects.pdf',
    'sanhouri-waseet-vol-3-assignment-and-extinction.pdf',
    'sanhouri-waseet-vol-4-sale-and-barter-contracts.pdf',
    'sanhouri-waseet-vol-6-1-lease-and-loan-for-use.pdf',
    'sanhouri-waseet-vol-10-collaterals-and-guarantees.pdf',
    'raouf-obeid-criminal-procedures.pdf',
    'marsafawi-criminal-procedures-vol-1.pdf',
    'meleigy-forced-execution-vol-2.pdf',
    'ali-rateb-summary-judiciary.pdf',
    'cassation-leases-principles-2013-2014.pdf',
    'cassation-criminal-principles-2011-2012.pdf',
    'cassation-evidence-principles-10-years.pdf',
    'cassation-pleadings-principles-10-years.pdf',
    'cassation-personal-status-2010-2011.pdf',
    'cassation-criminal-acquittals-compendium.pdf',
    'cassation-economic-crimes-principles.pdf',
    'cassation-general-assembly-civil-criminal-2016.pdf'
  ];
  const bookItems = refBooks.map(name => ({
    local: path.join(BOOKS_DIR, name),
    remote: name
  })).filter(item => fs.existsSync(item.local));

  // الـ chunks (127 ملف)
  const chunkFiles = fs.readdirSync(CHUNKS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ local: path.join(CHUNKS_DIR, f), remote: 'chunks/' + f }));

  console.log('Total to upload: ' + (bookItems.length + chunkFiles.length));
  console.log('');

  await processQueue(bookItems, 'Books (PDF)');
  await processQueue(chunkFiles, 'Chunks (JSON)');

  const finalLog = loadLog();
  console.log('');
  console.log('=== Final ===');
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
