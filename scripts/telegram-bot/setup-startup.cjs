const fs = require('fs');
const path = require('path');

const startupDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const targetVbs = path.join(startupDir, 'MohamiDigital-Assistant.vbs');

// Windows Script Host handles UTF-16LE / ANSI; if using UTF-8, characters might get mangled.
// We use Windows 8.3 short path or safe drive path.
const scriptPath = path.resolve(__dirname, 'assistant.cjs');
const nodeExe = 'C:\\Program Files\\nodejs\\node.exe';

const vbsContent = [
  'Set WshShell = CreateObject("WScript.Shell")',
  `WshShell.Run """${nodeExe}"" """ & "${scriptPath}" & """", 0, False`
].join('\r\n') + '\r\n';

fs.writeFileSync(targetVbs, vbsContent, 'utf8');

console.log('✅ تم تسجيل المساعد في بدء التشغيل التلقائي بنجاح!');
console.log('المسار:', targetVbs);
console.log('موجود:', fs.existsSync(targetVbs));
