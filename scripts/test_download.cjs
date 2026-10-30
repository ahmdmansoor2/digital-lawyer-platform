const fs = require('fs');
const path = require('path');
const { fetchUrl } = require('./fetch_helper.cjs');

async function downloadSample() {
  const url = 'https://manshurat.org/file/25095/download?token=MrZOGwO6';
  const res = await fetchUrl(url);
  console.log('Status:', res.status, 'Size:', res.buffer.length, 'Type:', res.headers['content-type']);
  
  const targetDir = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetFile = path.join(targetDir, 'قانون_الزراعة_رقم_53_لسنة_1966_الجريدة_الرسمية.pdf');
  fs.writeFileSync(targetFile, res.buffer);
  console.log('Saved to:', targetFile);
}

downloadSample().catch(console.error);
