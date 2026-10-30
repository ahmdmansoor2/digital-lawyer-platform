const fs = require('fs');

const data = fs.readFileSync('C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\04_القرار_الوزاري_رقم_615_لسنة_2016_حماية_الأراضي_الوقائع_المصرية.pdf');
const text = data.toString('latin1');

console.log('PDF Length:', data.length);
const xobjects = text.match(/\/Subtype\s*\/Image/g) || [];
console.log('Subtype /Image count:', xobjects.length);

const filters = text.match(/\/Filter\s*(\/[a-zA-Z0-9]+|\[[^\]]+\])/g) || [];
console.log('Filters found:', Array.from(new Set(filters)));
