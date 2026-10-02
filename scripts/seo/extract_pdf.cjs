'use strict';
const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const pdfPath = 'C:\\Users\\احمد منصور\\.gemini\\antigravity\\brain\\82e1cf6b-533a-4130-8dc1-c60b4acf8a58\\.user_uploaded\\media_1790929886782.pdf';

async function extractText() {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  console.log('Total pages:', doc.numPages);
  
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    const pageText = strings.join(' ');
    fullText += `\n\n--- PAGE ${i} ---\n\n` + pageText;
  }
  
  fs.writeFileSync('extracted_gemini_report.txt', fullText, 'utf8');
  console.log('Saved to extracted_gemini_report.txt, total chars:', fullText.length);
  console.log('Preview (first 1000 chars):');
  console.log(fullText.slice(0, 1000));
}

extractText().catch(err => console.error(err));
