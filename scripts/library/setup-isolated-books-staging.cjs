#!/usr/bin/env node
/**
 * setup-isolated-books-staging.cjs
 * ينظف مجلد dist ليكون خفيفاً وسريعاً للـ deployment الأساسي (HTML, JS, CSS, Data)
 * ويفرز الكتب في _staged_all_books لإدخالها تدريجياً وبشكل منظم.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const DIST_BOOKS = path.join(DIST_DIR, 'books');
const STASH_BOOKS = path.join(PROJECT_ROOT, '_staged_all_books');
const PUBLIC_BOOKS = path.join(PROJECT_ROOT, 'public', 'books');

if (!fs.existsSync(STASH_BOOKS)) {
  fs.mkdirSync(STASH_BOOKS, { recursive: true });
}

// 1. نقل كل الملفات من dist/books إلى STASH_BOOKS
if (fs.existsSync(DIST_BOOKS)) {
  const files = fs.readdirSync(DIST_BOOKS).filter(f => f.endsWith('.pdf'));
  console.log(`📦 جاري تأمين ${files.length} ملف PDF من dist إلى التخزين الآمن...`);
  files.forEach(f => {
    const src = path.join(DIST_BOOKS, f);
    const dest = path.join(STASH_BOOKS, f);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  });
}

// 2. تنظيف dist/books مؤقتاً
if (fs.existsSync(DIST_BOOKS)) {
  fs.readdirSync(DIST_BOOKS).forEach(f => {
    try { fs.unlinkSync(path.join(DIST_BOOKS, f)); } catch(e) {}
  });
}

// 3. إعادة الكتب الأساسية (أمهات الكتب الكبرى - 20 مجلداً) إلى dist/books
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

fs.mkdirSync(DIST_BOOKS, { recursive: true });
let restored = 0;
MASTER_BOOKS.forEach(b => {
  const src = path.join(STASH_BOOKS, b);
  const dest = path.join(DIST_BOOKS, b);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    restored++;
  }
});

console.log(`✅ تم تأمين وحفظ الكتب في _staged_all_books (${fs.readdirSync(STASH_BOOKS).length} ملف)`);
console.log(`✅ تم تجهيز dist/books مع أمهات الكتب الكبرى المعتمدة (${restored} كتاب) لضمان سرعة واستقرار الموقع.`);
