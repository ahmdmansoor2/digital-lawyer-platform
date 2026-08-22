/**
 * upload-ia-master-showcase.cjs — يرفع الـ 18 كتاب PDF (أمهات الكتب) إلى Internet Archive
 * عنصر جديد: mohamidigital-law-books
 * 
 * الاستخدام:
 *   node scripts/upload-ia-master-showcase.cjs
 *   node scripts/upload-ia-master-showcase.cjs --dry-run
 *   node scripts/upload-ia-master-showcase.cjs --status
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ITEM = 'mohamidigital-law-books';
const HOST = 's3.us.archive.org';
const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const BOOKS_DIR = path.join(__dirname, '..', 'public', 'books');
const LOG_FILE = path.join(__dirname, 'ia-master-showcase-log.json');

const MASTER_PDFS = [
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

const BOOK_TITLES = {
  'sanhouri-waseet-vol-1-sources-of-obligation.pdf': 'Al-Waseet fi Sharh al-Qanun al-Madani - Vol 1 (Sources of Obligation)',
  'sanhouri-waseet-vol-2-evidence-and-effects.pdf': 'Al-Waseet fi Sharh al-Qanun al-Madani - Vol 2 (Evidence and Effects)',
  'sanhouri-waseet-vol-3-assignment-and-extinction.pdf': 'Al-Waseet fi Sharh al-Qanun al-Madani - Vol 3 (Assignment and Extinction)',
  'sanhouri-waseet-vol-4-sale-and-barter-contracts.pdf': 'Al-Waseet fi Sharh al-Qanun al-Madani - Vol 4 (Sale and Barter)',
  'sanhouri-waseet-vol-6-1-lease-and-loan-for-use.pdf': 'Al-Waseet fi Sharh al-Qanun al-Madani - Vol 6 (Lease and Loan for Use)',
  'sanhouri-waseet-vol-10-collaterals-and-guarantees.pdf': 'Al-Waseet fi Sharh al-Qanun al-Madani - Vol 10 (Collaterals and Guarantees)',
  'raouf-obeid-criminal-procedures.pdf': 'Principles of Criminal Procedure in Egyptian Law - Raouf Obeid',
  'marsafawi-criminal-procedures-vol-1.pdf': 'Usul Qanun al-Ijraat al-Jinaaiyya - Vol 1 - Marsafawi',
  'meleigy-forced-execution-vol-2.pdf': 'Al-Mawsua al-Shamila fi al-Tanfidh al-Jabari - Vol 2 - Meleigy',
  'ali-rateb-summary-judiciary.pdf': 'Qada al-Umur al-Mustaajila fi al-Qanun al-Masri - Ali Rateb',
  'cassation-leases-principles-2013-2014.pdf': 'Cassation Court - Lease Principles 2013-2014',
  'cassation-criminal-principles-2011-2012.pdf': 'Cassation Court - Criminal Principles 2011-2012',
  'cassation-evidence-principles-10-years.pdf': 'Cassation Court - Evidence Principles (10 Years)',
  'cassation-pleadings-principles-10-years.pdf': 'Cassation Court - Pleadings Principles (10 Years)',
  'cassation-personal-status-2010-2011.pdf': 'Cassation Court - Personal Status Principles 2010-2011',
  'cassation-criminal-acquittals-compendium.pdf': 'Cassation Court - Criminal Acquittals Compendium',
  'cassation-economic-crimes-principles.pdf': 'Cassation Court - Economic Crimes and Money Laundering Principles',
  'cassation-general-assembly-civil-criminal-2016.pdf': 'Cassation Court - General Assembly Civil and Criminal 2016'
};

const isDryRun = process.argv.includes('--dry-run');
const isStatus = process.argv.includes('--status');

function loadLog() {
  if (fs.existsSync(LOG_FILE)) {
    try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch {}
  }
  return { done: [], failed: [] };
}
function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function loadCreds() {
  const credsPath = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, '.ia-credentials.json')
    : null;
  if (credsPath && fs.existsSync(credsPath)) {
    try {
      const c = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      return { access: c.access, secret: c.secret };
    } catch {}
  }
  return { access: process.env.IA_ACCESS_KEY || '', secret: process.env.IA_SECRET_KEY || '' };
}

function uploadFile(localPath, remoteName) {
  const creds = loadCreds();
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(localPath);
    const auth = 'LOW ' + creds.access + ':' + creds.secret;
    const title = BOOK_TITLES[remoteName] || remoteName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

    const req = https.request({
      hostname: HOST,
      port: 443,
      path: '/' + ITEM + '/' + remoteName,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileContent.length,
        'Authorization': auth,
        'x-archive-meta-title': title,
        'x-archive-meta-mediatype': 'texts',
        'x-archive-meta-language': 'ara',
        'x-archive-meta-creator': 'Egyptian Law Library - Ahmed Mansour',
        'x-archive-meta-licenseurl': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
        'x-archive-meta-description': 'Egyptian legal reference book for lawyers and law students.'
      }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, size: fileContent.length });
        } else {
          resolve({ ok: false, status: res.statusCode, body: body.substring(0, 500) });
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
      console.log('    Retry ' + (retries + 1) + '/' + MAX_RETRIES + ' for ' + remoteName);
      return new Promise(resolve => setTimeout(() => {
        resolve(uploadWithRetry(localPath, remoteName, retries + 1));
      }, 3000));
    }
    return r;
  });
}

async function main() {
  const log = loadLog();
  const doneSet = new Set(log.done);

  const items = MASTER_PDFS.map(name => ({
    local: path.join(BOOKS_DIR, name),
    remote: name
  }));

  const missing = items.filter(i => !fs.existsSync(i.local));
  if (missing.length > 0) {
    console.error('ERROR: Missing files:');
    missing.forEach(m => console.error('  - ' + m.local));
    process.exit(1);
  }

  const totalSizeMB = items.reduce((sum, i) => sum + fs.statSync(i.local).size, 0) / 1048576;

  if (isStatus) {
    console.log('=== Status ===');
    console.log('  Item: https://archive.org/details/' + ITEM);
    console.log('  Total PDFs: ' + items.length);
    console.log('  Total size: ' + totalSizeMB.toFixed(1) + ' MB');
    console.log('  Uploaded: ' + log.done.length);
    console.log('  Failed: ' + log.failed.length);
    console.log('  Remaining: ' + (items.length - log.done.length));
    return;
  }

  const queue = items.filter(i => !doneSet.has(i.remote));

  console.log('=== Upload to Internet Archive ===');
  console.log('  Item: ' + ITEM);
  console.log('  URL: https://archive.org/details/' + ITEM);
  console.log('  Total PDFs: ' + items.length);
  console.log('  Total size: ' + totalSizeMB.toFixed(1) + ' MB');
  console.log('  Already uploaded: ' + (items.length - queue.length));
  console.log('  To upload: ' + queue.length);
  console.log('');

  if (isDryRun) {
    console.log('DRY RUN — would upload:');
    queue.forEach(i => {
      const sizeMB = (fs.statSync(i.local).size / 1048576).toFixed(1);
      console.log('  ' + i.remote + ' (' + sizeMB + ' MB)');
    });
    return;
  }

  if (queue.length === 0) {
    console.log('All files already uploaded. Use --status to check.');
    return;
  }

  let processed = 0;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (item) => {
      const r = await uploadWithRetry(item.local, item.remote);
      processed++;
      const sizeMB = ((r.size || 0) / 1048576).toFixed(1);
      const status = r.ok ? 'OK' : 'FAIL(' + r.status + ')';
      console.log('  [' + processed + '/' + queue.length + '] ' + status + ' (' + sizeMB + ' MB) ' + item.remote);
      if (r.ok) {
        log.done.push(item.remote);
        successCount++;
      } else {
        log.failed.push({ name: item.remote, status: r.status, body: r.body, time: new Date().toISOString() });
        failCount++;
      }
    }));
    saveLog(log);
  }

  console.log('');
  console.log('=== Summary ===');
  console.log('  Success: ' + successCount);
  console.log('  Failed: ' + failCount);
  console.log('  Total uploaded: ' + log.done.length + '/' + items.length);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Wait 10-30 minutes for IA to process');
  console.log('  2. Test: https://archive.org/download/' + ITEM + '/<filename>.pdf');
  console.log('  3. Update URLs in public/legal-library.html');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
