import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

async function run() {
  const filePath = 'C:/Users/احمد منصور/.gemini/antigravity/brain/82e1cf6b-533a-4130-8dc1-c60b4acf8a58/.user_uploaded/media_1792259443580_db58ef9b.pdf';
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  console.log('Pages:', doc.numPages);
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    console.log(`\n=================== PAGE ${i} ===================`);
    let lastY = null;
    let line = '';
    for (const item of content.items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        console.log(line);
        line = '';
      }
      line += (line ? ' ' : '') + item.str;
      lastY = item.transform[5];
    }
    if (line) console.log(line);
  }
}

run().catch(console.error);
