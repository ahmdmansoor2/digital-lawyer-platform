import fs from 'fs';
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return {
      canvas,
      context,
    };
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
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function renderPdfPages(pdfPath, prefix, maxPages = 15) {
  console.log(`\nRendering PDF: ${path.basename(pdfPath)}`);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({
    data,
    canvasFactory: canvasFactory,
  }).promise;
  console.log(`Total Pages: ${doc.numPages}`);

  const pagesToRender = Math.min(doc.numPages, maxPages);
  for (let i = 1; i <= pagesToRender; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

    await page.render({
      canvasContext: canvasAndContext.context,
      viewport: viewport,
      canvasFactory: canvasFactory,
    }).promise;

    const outPath = path.join(targetDir, `${prefix}_صفحة_${String(i).padStart(2, '0')}.jpg`);
    const buffer = canvasAndContext.canvas.toBuffer('image/jpeg', 90);
    fs.writeFileSync(outPath, buffer);
    console.log(`Rendered Page ${i}/${doc.numPages}: ${path.basename(outPath)} (${buffer.length} bytes)`);
  }
}

async function main() {
  const dir = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية';

  // 1. قانون الأراضي الصحراوية 143 لسنة 1981 (الجريدة الرسمية عدد 35 مكرر)
  const pdf143 = path.join(dir, '02_قانون_الأراضي_الصحراوية_رقم_143_لسنة_1981_الجريدة_الرسمية.pdf');
  if (fs.existsSync(pdf143)) {
    await renderPdfPages(pdf143, '02_قانون_الأراضي_الصحراوية_143_لسنة_1981_الجريدة_الرسمية', 12);
  }

  // 2. قانون الزراعة 53 لسنة 1966 (الجريدة الرسمية)
  const pdf53 = path.join(dir, '01_قانون_الزراعة_رقم_53_لسنة_1966_الجريدة_الرسمية.pdf');
  if (fs.existsSync(pdf53)) {
    await renderPdfPages(pdf53, '03_قانون_الزراعة_53_لسنة_1966_الجريدة_الرسمية', 15);
  }
}

main().catch(console.error);
