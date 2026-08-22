const p = require('puppeteer-core');

(async () => {
  console.log('=== CloudFam Login + Upload Page Test ===');
  const browser = await p.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  page.on('console', msg => console.log('  [browser]', msg.text()));
  page.on('pageerror', err => console.log('  [pageerror]', err.message));

  // Login
  console.log('\n[1] Login...');
  await page.goto('https://cloudfam.io/auth', { waitUntil: 'networkidle2' });
  console.log('  On auth page. Title:', await page.title());

  // Check if reCAPTCHA is required
  const recaptchaInfo = await page.evaluate(() => {
    const iframes = document.querySelectorAll('iframe[src*="recaptcha"]');
    const grecaptcha = typeof window.grecaptcha !== 'undefined';
    return {
      iframeCount: iframes.length,
      grecaptchaLoaded: grecaptcha,
      widgetId: window.loginWidgetId
    };
  });
  console.log('  reCAPTCHA:', JSON.stringify(recaptchaInfo));

  // Type credentials
  await page.type('input[name="identifier"]', 'ahmdmansoor2@gmail.com', { delay: 30 });
  await page.type('input[name="password"]', 'TEST_PASSWORD', { delay: 30 });
  console.log('  Typed credentials (test)');

  // Check submit button state
  const submitState = await page.evaluate(() => {
    const btn = document.getElementById('login-submit');
    return {
      disabled: btn ? btn.disabled : 'no button',
      text: btn ? btn.innerText : 'no button'
    };
  });
  console.log('  Submit button:', JSON.stringify(submitState));

  // Check the form's handler to see what URL it posts to
  const handlerInfo = await page.evaluate(() => {
    return {
      loginFormExists: !!document.getElementById('login-form'),
      registerFormExists: !!document.getElementById('registration-form')
    };
  });
  console.log('  Forms:', JSON.stringify(handlerInfo));

  await browser.close();
  console.log('\nDone.');
})().catch(e => { console.error('FAIL:', e.message); console.error(e.stack); process.exit(1); });
