#!/usr/bin/env node
/**
 * continuous-library-deployer.cjs
 * سكريبت ذاتي القيادة يعمل في الخلفية لرفع كل الكتب دفعات متتالية ومستقرة
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'upload-batch-direct.cjs');
const PROGRESS_FILE = path.join(__dirname, 'live-uploaded-books.json');
const STASH_BOOKS = path.join(__dirname, '..', '..', '_staged_all_books');

const totalBooks = fs.readdirSync(STASH_BOOKS).filter(f => f.endsWith('.pdf')).length;

console.log(`🚀 بدء عملية الرفع الذاتي المستمر للمكتبة (${totalBooks} كتاب)...`);

let iteration = 1;

while (true) {
  let uploaded = 0;
  if (fs.existsSync(PROGRESS_FILE)) {
    try { uploaded = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')).length; } catch(e) {}
  }

  console.log(`\n================== [ دفعة #${iteration} | تم نشر: ${uploaded} من أصل ${totalBooks} ] ==================`);

  if (uploaded >= totalBooks) {
    console.log(`\n🎉🎉🎉 اكتمل رفع كامل المكتبة القانونية بنجاح 100%!`);
    break;
  }

  const res = spawnSync('node', [SCRIPT_PATH], { stdio: 'inherit', encoding: 'utf8' });

  if (res.status !== 0) {
    console.warn(`⚠️ تنبيه: إعادة المحاولة بعد 10 ثوانٍ لضمان استقرار الشبكة...`);
    spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 10']);
  }

  iteration++;
}
