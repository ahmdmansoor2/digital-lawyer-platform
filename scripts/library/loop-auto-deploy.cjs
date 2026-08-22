#!/usr/bin/env node
/**
 * loop-auto-deploy.cjs
 * يدير عملية نشر كامل المكتبة في حلقة تكرارية مستمرة
 * حتى يصل لنسبة 100% بنجاح ودون توقف
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, 'smart-batch-deployer.cjs');

console.log('🏁 بدء دورة الرفع المتواصل للمكتبة القانونية الكاملة...');

let iteration = 1;

while (true) {
  console.log(`\n================== [ الدورة #${iteration} ] ==================`);
  const res = spawnSync('node', [SCRIPT_PATH], {
    stdio: 'inherit',
    encoding: 'utf8'
  });

  if (res.status === 0) {
    // تحقق من السجل إذا انتهى كل شيء
    const logPath = path.join(__dirname, 'deployed-books-list.json');
    if (fs.existsSync(logPath)) {
      const deployed = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      if (deployed.length >= 1840) {
        console.log(`\n🎉🎉🎉 تم رفع كامل المكتبة بنجاح تام (${deployed.length} كتاب)!`);
        break;
      }
    }
  } else {
    console.warn(`⚠️ تعثر مؤقت في الدفعة، إعادة المحاولة بعد 5 ثوانٍ...`);
    spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 5']);
  }

  iteration++;
}
