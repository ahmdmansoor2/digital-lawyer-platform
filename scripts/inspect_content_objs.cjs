const fs = require('fs');
const zlib = require('zlib');

const data = fs.readFileSync('C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\04_القرار_الوزاري_رقم_615_لسنة_2016_حماية_الأراضي_الوقائع_المصرية.pdf');
const text = data.toString('latin1');

const contentObjs = [4, 18, 24, 30, 36, 42, 48];
for (const n of contentObjs) {
  const marker = `${n} 0 obj`;
  const pos = text.indexOf(marker);
  console.log(`Obj ${n} at pos ${pos}:`);
  console.log(text.substring(pos, pos + 250).replace(/\r?\n/g, ' '));
}
