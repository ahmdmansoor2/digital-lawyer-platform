const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const sharp = require('sharp');

const targetDir = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\صور_القرارات_الرسمية';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function extractImagesFromPdf(pdfPath, prefix) {
  const data = fs.readFileSync(pdfPath);
  let pos = 0;
  let imgIndex = 0;

  while (pos < data.length) {
    const objPos = data.indexOf(Buffer.from('obj'), pos);
    if (objPos === -1) break;

    const streamPos = data.indexOf(Buffer.from('stream'), objPos);
    if (streamPos === -1) {
      pos = objPos + 3;
      continue;
    }

    const dictBuf = data.slice(objPos, streamPos);
    const dictStr = dictBuf.toString('latin1');

    if (dictStr.includes('/Subtype') && dictStr.includes('/Image')) {
      const endStreamPos = data.indexOf(Buffer.from('endstream'), streamPos);
      if (endStreamPos !== -1) {
        // Stream data usually starts after \r\n or \n
        let sStart = streamPos + 6;
        while (sStart < endStreamPos && (data[sStart] === 10 || data[sStart] === 13)) {
          sStart++;
        }
        let sEnd = endStreamPos;
        while (sEnd > sStart && (data[sEnd - 1] === 10 || data[sEnd - 1] === 13)) {
          sEnd--;
        }

        const rawStream = data.slice(sStart, sEnd);
        imgIndex++;
        console.log(`\nFound Image Obj ${imgIndex}: Dict:`, dictStr.replace(/\s+/g, ' ').substring(0, 150));
        console.log(`Raw Stream length: ${rawStream.length}`);

        // Check if DCTDecode (JPEG)
        if (dictStr.includes('/DCTDecode')) {
          const outPath = path.join(targetDir, `${prefix}_صفحة_${String(imgIndex).padStart(2, '0')}.jpg`);
          fs.writeFileSync(outPath, rawStream);
          console.log(`Saved JPEG: ${outPath}`);
        } else if (dictStr.includes('/FlateDecode')) {
          try {
            const decompressed = zlib.inflateSync(rawStream);
            console.log(`Decompressed size: ${decompressed.length}`);

            // extract width, height, bpc, colorspace
            const wMatch = dictStr.match(/\/Width\s+(\d+)/);
            const hMatch = dictStr.match(/\/Height\s+(\d+)/);
            const bpcMatch = dictStr.match(/\/BitsPerComponent\s+(\d+)/);
            const csMatch = dictStr.match(/\/ColorSpace\s*(\/[a-zA-Z0-9]+)/);

            const width = wMatch ? parseInt(wMatch[1], 10) : null;
            const height = hMatch ? parseInt(hMatch[1], 10) : null;
            const bpc = bpcMatch ? parseInt(bpcMatch[1], 10) : 8;
            const cs = csMatch ? csMatch[1] : '/DeviceRGB';

            console.log(`Dimensions: ${width}x${height}, BPC: ${bpc}, ColorSpace: ${cs}`);

            if (width && height) {
              const channels = cs === '/DeviceGray' ? 1 : (cs === '/DeviceCMYK' ? 4 : 3);
              const outPath = path.join(targetDir, `${prefix}_صفحة_${String(imgIndex).padStart(2, '0')}.png`);
              
              if (channels === 1 || channels === 3 || channels === 4) {
                await sharp(decompressed, {
                  raw: {
                    width: width,
                    height: height,
                    channels: channels
                  }
                }).png().toFile(outPath);
                console.log(`Saved PNG via sharp: ${outPath}`);
              }
            }
          } catch (err) {
            console.log(`Error processing FlateDecode image: ${err.message}`);
          }
        }
      }
    }
    pos = streamPos + 6;
  }
}

async function main() {
  const pdf615 = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\04_القرار_الوزاري_رقم_615_لسنة_2016_حماية_الأراضي_الوقائع_المصرية.pdf';
  console.log('=== Extracting from القرار 615 لسنة 2016 ===');
  await extractImagesFromPdf(pdf615, 'القرار_الوزاري_615_لسنة_2016_الوقائع_المصرية');
}

main().catch(console.error);
