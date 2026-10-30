import fs from 'fs';

const buf = fs.readFileSync('C:/Users/احمد منصور/.gemini/antigravity/brain/82e1cf6b-533a-4130-8dc1-c60b4acf8a58/.user_uploaded/media_1792259443580_db58ef9b.pdf');

// Look for JPEG markers (FF D8 ... FF D9) or extract streams
let count = 0;
let pos = 0;
while ((pos = buf.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]), pos)) !== -1) {
  let end = buf.indexOf(Buffer.from([0xFF, 0xD9]), pos);
  if (end !== -1) {
    const jpg = buf.subarray(pos, end + 2);
    count++;
    const outPath = `d:/قانوني 7/scripts/extracted_img_${count}.jpg`;
    fs.writeFileSync(outPath, jpg);
    console.log(`Extracted JPEG ${count}: length ${jpg.length} bytes to ${outPath}`);
    pos = end + 2;
  } else {
    break;
  }
}
console.log(`Total JPEG extracted: ${count}`);
