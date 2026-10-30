const fs = require('fs');
const path = require('path');
const { fetchUrl } = require('./fetch_helper.cjs');

async function downloadNode(nodeId, filename) {
  const res = await fetchUrl(`https://manshurat.org/node/${nodeId}`);
  const html = res.buffer.toString('utf8');
  const fileMatch = html.match(/href="(\/file\/\d+\/download\?[^"]+)"/i);
  if (fileMatch) {
    const downloadUrl = `https://manshurat.org${fileMatch[1]}`;
    console.log(`Downloading ${filename} from ${downloadUrl}`);
    const pdfRes = await fetchUrl(downloadUrl);
    if (pdfRes.status === 200) {
      const targetDir = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية';
      const targetPath = path.join(targetDir, filename);
      fs.writeFileSync(targetPath, pdfRes.buffer);
      console.log(`Saved: ${targetPath} (${pdfRes.buffer.length} bytes)`);
      return targetPath;
    }
  } else {
    console.log(`No direct PDF link found for node ${nodeId}`);
  }
}

downloadNode(22996, '05_قرار_رئيس_الوزراء_رقم_18_لسنة_2017_اللائحة_التنفيذية_لتقنين_أراضي_الدولة_الوقائع_المصرية.pdf').catch(console.error);
