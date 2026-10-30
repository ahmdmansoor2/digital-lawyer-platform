const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function run() {
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\احمد منصور';
  const filePath = path.join(userProfile, 'Desktop', 'خطاب_مديرية_الزراعة_إلى_رئيس_نيابة_برج_العرب.docx');
  console.log('Target file:', filePath);
  console.log('Exists:', fs.existsSync(filePath));

  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);
  const docXml = await zip.file('word/document.xml').async('text');
  
  // Save raw xml
  fs.writeFileSync(path.join(__dirname, 'current_document.xml'), docXml, 'utf8');
  console.log('Saved current_document.xml');

  // Strip XML tags to see all text paragraphs
  const paragraphs = docXml.split(/<\/w:p>/);
  console.log('Total paragraphs:', paragraphs.length);
  paragraphs.forEach((p, idx) => {
    const text = p.replace(/<[^>]+>/g, '').trim();
    if (text) {
      console.log(`[P${idx}] ${text}`);
    }
  });
}

run().catch(console.error);
