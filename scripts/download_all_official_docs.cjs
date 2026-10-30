const fs = require('fs');
const path = require('path');
const { fetchUrl } = require('./fetch_helper.cjs');

const targetDir = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const nodesToDownload = [
  { id: 13372, filename: '01_قانون_الزراعة_رقم_53_لسنة_1966_الجريدة_الرسمية.pdf' },
  { id: 259, filename: '02_قانون_الأراضي_الصحراوية_رقم_143_لسنة_1981_الجريدة_الرسمية.pdf' },
  { id: 36586, filename: '03_القرار_الوزاري_رقم_1836_لسنة_2011_شروط_البناء_الوقائع_المصرية.pdf' },
  { id: 13590, filename: '04_القرار_الوزاري_رقم_615_لسنة_2016_حماية_الأراضي_الوقائع_المصرية.pdf' },
];

async function processNode(item) {
  console.log(`\n--- Fetching Node ${item.id} (${item.filename}) ---`);
  const nodeUrl = `https://manshurat.org/node/${item.id}`;
  const res = await fetchUrl(nodeUrl);
  const html = res.buffer.toString('utf8');

  // Find file download link
  const fileMatch = html.match(/href="(\/file\/\d+\/download\?[^"]+)"/i);
  if (!fileMatch) {
    console.log(`No direct PDF file download found for Node ${item.id}`);
    // Save html text as fallback
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const contentMatch = html.match(/<div class="field-item even"[^>]*>([\s\S]*?)<\/div>/i);
    const text = (titleMatch ? titleMatch[1] : '') + '\n\n' + (contentMatch ? contentMatch[1].replace(/<[^>]+>/g, ' ') : '');
    fs.writeFileSync(path.join(targetDir, item.filename.replace('.pdf', '.txt')), text, 'utf8');
    return;
  }

  const downloadUrl = `https://manshurat.org${fileMatch[1]}`;
  console.log(`Found download URL: ${downloadUrl}`);
  const pdfRes = await fetchUrl(downloadUrl);
  if (pdfRes.status === 200 && pdfRes.buffer.length > 1000) {
    const savePath = path.join(targetDir, item.filename);
    fs.writeFileSync(savePath, pdfRes.buffer);
    console.log(`SUCCESS: Downloaded ${pdfRes.buffer.length} bytes to ${savePath}`);
  } else {
    console.log(`Failed downloading PDF, status: ${pdfRes.status}`);
  }
}

async function main() {
  for (const item of nodesToDownload) {
    try {
      await processNode(item);
    } catch (e) {
      console.error(`Error on node ${item.id}:`, e.message);
    }
  }
}

main();
