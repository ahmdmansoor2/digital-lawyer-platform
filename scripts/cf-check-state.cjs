const p = require('puppeteer-core');

(async () => {
  console.log('=== Check Chrome state ===');
  const browser = await p.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  console.log(`Found ${pages.length} tab(s):`);
  for (let i = 0; i < pages.length; i++) {
    const url = pages[i].url();
    const title = await pages[i].title();
    console.log(`  ${i}: ${title} - ${url.substring(0, 100)}`);
  }
  const page = pages.find(pg => pg.url().includes('user.cloudfam.io') || pg.url().includes('cloudfam.io/dashboard'));
  if (page) {
    console.log(`\nOn cloudfam tab. URL: ${page.url()}`);
    const hasFileInput = await page.$('input[type="file"]');
    console.log(`Has file input: ${!!hasFileInput}`);

    // Try to find upload zone / dropzone
    const state = await page.evaluate(() => {
      const dz = document.querySelectorAll('[class*="drop"], [class*="upload"], [class*="file-input"]');
      return {
        url: location.href,
        title: document.title,
        dropzoneCount: dz.length,
        bodySample: document.body.innerText.substring(0, 300)
      };
    });
    console.log('Page state:', JSON.stringify(state, null, 2));
  }
  await browser.disconnect();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
