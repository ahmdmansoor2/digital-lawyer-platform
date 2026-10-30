import fs from 'fs';
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

const canvasFactory = new NodeCanvasFactory();
const targetDir = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\صور_صفحات_الجريدة_الرسمية';

async function main() {
  const pdf144 = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\06_قانون_رقم_144_لسنة_2017_تقنين_أملاك_الدولة_الجريدة_الرسمية.pdf';
  const data = new Uint8Array(fs.readFileSync(pdf144));
  const doc = await pdfjsLib.getDocument({ data, canvasFactory }).promise;
  console.log(`Rendering Law 144: Total Pages: ${doc.numPages}`);

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const cAndC = canvasFactory.create(viewport.width, viewport.height);

    await page.render({
      canvasContext: cAndC.context,
      viewport: viewport,
      canvasFactory: canvasFactory,
    }).promise;

    const outPath = path.join(targetDir, `05_قانون_144_لسنة_2017_تقنين_أراضي_الدولة_صفحة_${String(i).padStart(2, '0')}.jpg`);
    fs.writeFileSync(outPath, cAndC.canvas.toBuffer('image/jpeg', 90));
    console.log(`Rendered Page ${i}/${doc.numPages}`);
  }
}

main().catch(console.error);
