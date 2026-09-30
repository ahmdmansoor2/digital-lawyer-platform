const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const context = browser.contexts()[0];
    const pages = context.pages();
    console.log('Pages count:', pages.length);
    for (let i = 0; i < pages.length; i++) {
      const title = await pages[i].title();
      console.log(`Page ${i}: URL = ${pages[i].url()} | Title = ${title}`);
    }
  } catch (err) {
    console.error('Error connecting to CDP:', err.message);
  }
})();
