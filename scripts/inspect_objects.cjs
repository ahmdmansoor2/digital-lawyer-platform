const fs = require('fs');

const data = fs.readFileSync('C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\04_القرار_الوزاري_رقم_615_لسنة_2016_حماية_الأراضي_الوقائع_المصرية.pdf');
const text = data.toString('latin1');

const objNums = [5, 19, 25, 31, 37, 43, 49];
for (const n of objNums) {
  const marker = `${n} 0 obj`;
  const pos = text.indexOf(marker);
  console.log(`Obj ${n} at pos ${pos}:`);
  console.log(text.substring(pos, pos + 250).replace(/\r?\n/g, ' '));
}
