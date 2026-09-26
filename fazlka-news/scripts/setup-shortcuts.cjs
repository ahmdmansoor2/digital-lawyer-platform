const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BOM = '\uFEFF';

const desk = path.join(process.env.USERPROFILE || 'C:\\Users\\احمد منصور', 'Desktop');
const subDir = path.join(desk, 'مجلد جديد (2)');

if (!fs.existsSync(subDir)) {
  fs.mkdirSync(subDir, { recursive: true });
}

// محتوى ملفات الباتش باللغة العربية السليمة تماماً مع الإطلاق في نافذة مخفية لفتح الواجهة الرسومية فوراً
const batPublishContent = `${BOM}@echo off
:: ========================================================
:: بوابة صوت مصر 24 - تشغيل النشر الإخباري التلقائي
:: ========================================================
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "d:\\قانوني 7\\fazlka-news\\scripts\\publish-gui.ps1"
exit
`;

const batDaemonContent = `${BOM}@echo off
:: ========================================================
:: بوابة صوت مصر 24 - تشغيل مركز الأتمتة المستمرة (24/7)
:: ========================================================
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "d:\\قانوني 7\\fazlka-news\\scripts\\daemon-gui.ps1"
exit
`;

// كتابة ملفات الباتش في مجلد جديد (2) وسطح المكتب والمشروع
const targets = [
  desk,
  subDir,
  path.join(__dirname, '..')
];

for (const dir of targets) {
  fs.writeFileSync(path.join(dir, 'تشغيل_نشر_صوت_مصر_24.bat'), batPublishContent, 'utf8');
  fs.writeFileSync(path.join(dir, 'تشغيل_الأتمتة_المستمرة_24_ساعة.bat'), batDaemonContent, 'utf8');
}

// إنشاء اختصارات Windows الرسمية (.lnk) بأيقونات ملونة وتشغيل خفي مباشر
const psCode = `
$WshShell = New-Object -ComObject WScript.Shell

$desk = [Environment]::GetFolderPath('Desktop')
$subDir = Join-Path $desk 'مجلد جديد (2)'

# 1. اختصار النشر الفوري
$lnk1Path = Join-Path $subDir 'تشغيل_نشر_صوت_مصر_24.lnk'
$lnk1 = $WshShell.CreateShortcut($lnk1Path)
$lnk1.TargetPath = 'powershell.exe'
$lnk1.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "d:\\قانوني 7\\fazlka-news\\scripts\\publish-gui.ps1"'
$lnk1.WorkingDirectory = 'd:\\قانوني 7'
$lnk1.IconLocation = 'shell32.dll,13'
$lnk1.Description = 'بوابة صوت مصر 24 - النشر الإخباري التلقائي'
$lnk1.Save()

# 2. اختصار الأتمتة المستمرة 24/7
$lnk2Path = Join-Path $subDir 'تشغيل_الأتمتة_المستمرة_24_ساعة.lnk'
$lnk2 = $WshShell.CreateShortcut($lnk2Path)
$lnk2.TargetPath = 'powershell.exe'
$lnk2.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "d:\\قانوني 7\\fazlka-news\\scripts\\daemon-gui.ps1"'
$lnk2.WorkingDirectory = 'd:\\قانوني 7'
$lnk2.IconLocation = 'shell32.dll,238'
$lnk2.Description = 'بوابة صوت مصر 24 - مركز الأتمتة الإخبارية المستمرة 24/7'
$lnk2.Save()

# نسخ الاختصارات إلى سطح المكتب أيضاً
Copy-Item $lnk1Path (Join-Path $desk 'تشغيل_نشر_صوت_مصر_24.lnk') -Force
Copy-Item $lnk2Path (Join-Path $desk 'تشغيل_الأتمتة_المستمرة_24_ساعة.lnk') -Force

Write-Host "SUCCESS: Created shortcuts and batch files in Desktop and in مجلد جديد (2)"
`;

const b64 = Buffer.from(psCode, 'utf16le').toString('base64');
try {
  const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`, { encoding: 'utf8' });
  console.log(out);
  console.log('✅ تم إنشاء وتحديث كافة الملفات والاختصارات بنجاح!');
} catch (e) {
  console.error('Error creating shortcuts:', e.message);
}
