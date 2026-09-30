const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const context = browser.contexts()[0];
    const page = context.pages()[0];
    
    console.log('Current URL:', page.url());
    console.log('Current Title:', await page.title());

    // استخراج الروابط والأزرار الرئيسية في الصفحة
    const buttons = await page.$$eval('button, a[href*="flow"], a[role="button"]', elements =>
      elements.map(el => ({
        text: el.innerText.trim(),
        href: el.getAttribute('href'),
        ariaLabel: el.getAttribute('aria-label'),
        tag: el.tagName
      })).filter(b => b.text || b.ariaLabel)
    );

    console.log('Found actions/buttons:', JSON.stringify(buttons.slice(0, 15), null, 2));

    // لقطة شاشة للتحقق
    await page.screenshot({ path: 'scripts/google-flow/current-page.png' });
    console.log('Screenshot saved to scripts/google-flow/current-page.png');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
