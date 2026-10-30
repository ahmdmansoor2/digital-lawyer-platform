const fs = require('fs');
const path = require('path');

function extractJpegsFromPdf(pdfPath, outputDir, prefix) {
  const data = fs.readFileSync(pdfPath);
  let count = 0;
  let pos = 0;

  while (pos < data.length) {
    // Look for JPEG start of image marker: 0xFF, 0xD8
    const soi = data.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]), pos);
    if (soi === -1) break;

    // Look for JPEG end of image marker: 0xFF, 0xD9
    const eoi = data.indexOf(Buffer.from([0xFF, 0xD9]), soi + 3);
    if (eoi === -1) {
      pos = soi + 3;
      continue;
    }

    const jpegLength = (eoi + 2) - soi;
    if (jpegLength > 50000) { // filter out small thumbnails/artifacts (>50KB)
      count++;
      const jpegBuffer = data.slice(soi, eoi + 2);
      const outName = `${prefix}_صفحة_${String(count).padStart(2, '0')}.jpg`;
      fs.writeFileSync(path.join(outputDir, outName), jpegBuffer);
      console.log(`Extracted: ${outName} (${jpegLength} bytes)`);
    }
    pos = eoi + 2;
  }
  return count;
}

const targetDir = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\صور_صفحات_الوقائع_المصرية';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const pdf615 = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\04_القرار_الوزاري_رقم_615_لسنة_2016_حماية_الأراضي_الوقائع_المصرية.pdf';
console.log('Extracting images from القرار 615...');
const c1 = extractJpegsFromPdf(pdf615, targetDir, 'القرار_615_لسنة_2016_الوقائع_المصرية');
console.log(`Total extracted from 615: ${c1}`);

const pdf53 = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\01_قانون_الزراعة_رقم_53_لسنة_1966_الجريدة_الرسمية.pdf';
console.log('\nExtracting images from قانون الزراعة 53...');
const c2 = extractJpegsFromPdf(pdf53, targetDir, 'قانون_الزراعة_53_لسنة_1966_الجريدة_الرسمية');
console.log(`Total extracted from 53: ${c2}`);

const pdf143 = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\02_قانون_الأراضي_الصحراوية_رقم_143_لسنة_1981_الجريدة_الرسمية.pdf';
console.log('\nExtracting images from قانون الصحراوية 143...');
const c3 = extractJpegsFromPdf(pdf143, targetDir, 'قانون_الصحراوية_143_لسنة_1981_الجريدة_الرسمية');
console.log(`Total extracted from 143: ${c3}`);
