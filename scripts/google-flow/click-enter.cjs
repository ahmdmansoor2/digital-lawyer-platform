const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const page = browser.contexts()[0].pages()[0];
    console.log('Clicking button...');
    await page.click('button:has-text("يمكنك إنشاء المحتوى باستخدام Google Flow")');
    await page.waitForTimeout(4000);
    console.log('New URL:', page.url());
    console.log('New Title:', await page.title());
    await page.screenshot({ path: 'scripts/google-flow/after-click.png' });
    console.log('Screenshot saved to after-click.png');
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
