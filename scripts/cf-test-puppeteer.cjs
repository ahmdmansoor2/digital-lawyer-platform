const p = require('puppeteer-core');

(async () => {
  console.log('Launching Chrome...');
  const browser = await p.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('OK launched');
  const page = await browser.newPage();
  await page.goto('https://cloudfam.io/auth', { waitUntil: 'networkidle2' });
  console.log('Title:', await page.title());
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
