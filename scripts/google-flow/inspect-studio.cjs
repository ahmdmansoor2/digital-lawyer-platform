const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();
    
    console.log('Pages count:', pages.length);
    for (let i = 0; i < pages.length; i++) {
      console.log(`Page ${i}: URL = ${pages[i].url()} | Title = ${await pages[i].title()}`);
    }

    const activePage = pages[pages.length - 1];
    await activePage.bringToFront();
    
    // لقطة شاشة للواجهة الحالية
    await activePage.screenshot({ path: 'scripts/google-flow/studio-current.png' });
    console.log('Screenshot saved to scripts/google-flow/studio-current.png');

    // استخراج النصوص والأزرار والحقول المتاحة في الواجهة
    const interactiveElements = await activePage.$$eval('button, input, textarea, div[role="button"], a', els =>
      els.map(el => ({
        tag: el.tagName,
        text: (el.innerText || '').trim().replace(/\n+/g, ' '),
        placeholder: el.getAttribute('placeholder'),
        ariaLabel: el.getAttribute('aria-label'),
        role: el.getAttribute('role'),
        type: el.getAttribute('type'),
        id: el.id,
        className: el.className ? el.className.toString().slice(0, 50) : ''
      })).filter(item => item.text || item.placeholder || item.ariaLabel)
    );

    console.log('Interactive elements count:', interactiveElements.length);
    console.log('Sample elements:', JSON.stringify(interactiveElements.slice(0, 25), null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
