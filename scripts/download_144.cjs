const fs = require('fs');
const path = require('path');
const { fetchUrl } = require('./fetch_helper.cjs');

async function main() {
  const res = await fetchUrl('https://manshurat.org/node/13360');
  const html = res.buffer.toString('utf8');
  const fileMatch = html.match(/href="(\/file\/\d+\/download\?[^"]+)"/i);
  if (fileMatch) {
    const downloadUrl = 'https://manshurat.org' + fileMatch[1];
    console.log('Downloading law 144 from:', downloadUrl);
    const pdfRes = await fetchUrl(downloadUrl);
    if (pdfRes.status === 200) {
      const target = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\06_قانون_رقم_144_لسنة_2017_تقنين_أملاك_الدولة_الجريدة_الرسمية.pdf';
      fs.writeFileSync(target, pdfRes.buffer);
      console.log('Saved law 144 PDF successfully! Size:', pdfRes.buffer.length);
    }
  } else {
    console.log('No file match on node 13360');
  }
}

main().catch(console.error);
