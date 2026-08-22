#!/usr/bin/env node
/**
 * deploy-linked-catalog-clean.cjs
 * يقوم بنشر الفهرس المحدث بالكامل وصفحة المكتبة القانونية
 * مع الحفاظ على الكتب المرفوعة مسبقاً على السيرفر
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const DIST_BOOKS = path.join(DIST_DIR, 'books');

console.log('🔄 تحضير dist لنشر التحديثات البرمجية والفهرس المربوط...');

// تنظيف dist/books مؤقتاً لتفادي بطء الرفع (الكتب مرفوعة وموجودة بالفعل على خوادم Firebase)
if (fs.existsSync(DIST_BOOKS)) {
  fs.readdirSync(DIST_BOOKS).forEach(f => {
    try { fs.unlinkSync(path.join(DIST_BOOKS, f)); } catch(e) {}
  });
}

// إعادة وضع أمهات الكتب الـ 20
const MASTER_BOOKS = [
  'sanhouri-waseet-vol-1-sources-of-obligation.pdf',
  'sanhouri-waseet-vol-2-evidence-and-effects.pdf',
  'sanhouri-waseet-vol-3-assignment-and-extinction.pdf',
  'sanhouri-waseet-vol-4-sale-and-barter-contracts.pdf',
  'sanhouri-waseet-vol-5-remaining-contracts.pdf',
  'sanhouri-waseet-vol-6-1-lease-and-loan-for-use.pdf',
  'sanhouri-waseet-vol-8-ownership-rights.pdf',
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

const STASH_BOOKS = path.join(PROJECT_ROOT, '_staged_all_books');
fs.mkdirSync(DIST_BOOKS, { recursive: true });

MASTER_BOOKS.forEach(b => {
  const src = path.join(STASH_BOOKS, b);
  const dest = path.join(DIST_BOOKS, b);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});

// نسخ ملفات الفهرس وHTML
fs.copyFileSync(path.join(PROJECT_ROOT, 'public', 'legal-library.html'), path.join(DIST_DIR, 'legal-library.html'));
fs.copyFileSync(path.join(PROJECT_ROOT, 'public', 'data', 'legal-catalog-summary.json'), path.join(DIST_DIR, 'data', 'legal-catalog-summary.json'));
fs.copyFileSync(path.join(PROJECT_ROOT, 'public', 'data', 'legal-catalog.json'), path.join(DIST_DIR, 'data', 'legal-catalog.json'));

console.log('🚀 تنفيذ deploy خفيف وسريع للفهرس والواجهة...');

// تنظيف كاش firebase
const cacheDir = path.join(PROJECT_ROOT, '.firebase');
if (fs.existsSync(cacheDir)) {
  fs.readdirSync(cacheDir)
    .filter(f => f.startsWith('hosting.') && f.endsWith('.cache'))
    .forEach(f => { try { fs.unlinkSync(path.join(cacheDir, f)); } catch {} });
}

const out = execSync('npx firebase deploy --only hosting:app --project justice-91571', {
  cwd: PROJECT_ROOT,
  encoding: 'utf8',
  timeout: 300000
});

console.log(out);
console.log('✅ تم نشر الفهرس المحدث بنجاح تام!');
