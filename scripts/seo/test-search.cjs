// scripts/seo/test-search.cjs — اختبار البحث باستخدام JSDOM
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const BASE = 'https://mohamidigital.online';

class LocalLoader extends ResourceLoader {
  fetch(url, options) {
    if (url.startsWith(BASE)) {
      const localPath = path.join(__dirname, '..', '..', 'dist', url.replace(BASE, ''));
      if (fs.existsSync(localPath)) {
        return Promise.resolve(Buffer.from(fs.readFileSync(localPath)));
      }
    }
    return super.fetch(url, options);
  }
}

function setupWindow(window) {
  // Mock fetch using local files
  window.fetch = (url, opts) => {
    if (typeof url === 'string') {
      // Strip query string and version params
      const cleanUrl = url.split('?')[0].split('&')[0];
      const localPath = path.join(__dirname, '..', '..', 'dist', cleanUrl.replace(BASE, ''));
      if (fs.existsSync(localPath)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(JSON.parse(fs.readFileSync(localPath, 'utf8'))),
          text: () => Promise.resolve(fs.readFileSync(localPath, 'utf8')),
        });
      }
    }
    return Promise.resolve({ ok: false, status: 404 });
  };
  window.document.elementFromPoint = () => null;
}

function makeConsole() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => { /* ignore AdSense, canvas, etc */ });
  return vc;
}

async function testSearch() {
  console.log('=== Test 1: search.html?q=حضانة ===\n');
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'dist', 'search.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: BASE + '/search.html?q=حضانة',
    runScripts: 'dangerously',
    resources: new LocalLoader(),
    pretendToBeVisual: true,
    virtualConsole: makeConsole(),
    beforeParse(window) { setupWindow(window); },
  });

  await new Promise(r => setTimeout(r, 2500));

  const doc = dom.window.document;
  const results = doc.getElementById('results');
  if (!results) { console.log('FAIL: results element not found'); return; }
  const cards = results.querySelectorAll('.result-card');
  console.log('Result cards rendered:', cards.length);
  if (cards.length > 0) {
    console.log('First 3 results:');
    [...cards].slice(0, 3).forEach((c, i) => {
      const title = c.querySelector('.result-title')?.textContent?.trim();
      console.log(`  ${i+1}. ${title?.slice(0, 70)}`);
    });
  } else {
    console.log('Results inner HTML:');
    console.log(results.innerHTML.slice(0, 300));
  }
  console.log('window.__siteSearch:', !!dom.window.__siteSearch);
  if (dom.window.__siteSearch) {
    const idx = dom.window.__siteSearch._index();
    console.log('Index count:', idx?.count);
  }
  dom.window.close();

  console.log('\n=== Test 2: about.html (Ctrl+K simulation) ===\n');
  let aboutHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'dist', 'about.html'), 'utf8');
  aboutHtml = aboutHtml.replace(/<ins class="adsbygoogle"[\s\S]*?<\/ins>/g, '');
  aboutHtml = aboutHtml.replace(/<script[^>]*googlesyndication[^>]*><\/script>/g, '');
  const dom2 = new JSDOM(aboutHtml, {
    url: BASE + '/about.html',
    runScripts: 'dangerously',
    resources: new LocalLoader(),
    pretendToBeVisual: true,
    virtualConsole: makeConsole(),
    beforeParse(window) { setupWindow(window); },
  });

  await new Promise(r => setTimeout(r, 2500));

  const trigger = dom2.window.document.querySelector('.ss-trigger');
  console.log('Search trigger button exists:', !!trigger);
  if (trigger) console.log('Trigger text:', trigger.textContent?.trim().slice(0, 60));

  const event = new dom2.window.KeyboardEvent('keydown', {
    key: 'k', ctrlKey: true, bubbles: true, cancelable: true,
  });
  dom2.window.document.dispatchEvent(event);

  await new Promise(r => setTimeout(r, 800));

  const overlay = dom2.window.document.querySelector('.ss-overlay');
  console.log('Modal opened after Ctrl+K:', !!overlay);
  if (overlay) {
    // Use API مباشرة لتجاوز input event issue
    const searchApi = dom2.window.__siteSearch;
    if (searchApi) {
      const r = searchApi.search('حضانة');
      console.log('Direct search("حضانة") via API:', r.length, 'results');
      r.slice(0, 3).forEach((x, i) => {
        console.log(`  ${i+1}. [${x.item.type}] ${x.item.title.slice(0, 60)} (score=${x.score})`);
      });
    }
    const input = overlay.querySelector('.ss-input');
    console.log('Input element exists:', !!input);
    if (input) {
      // simulate user typing
      const nativeSetter = Object.getOwnPropertyDescriptor(dom2.window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, 'حضانة');
      input.dispatchEvent(new dom2.window.Event('input', { bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 800));
      const resDiv = overlay.querySelector('.ss-results');
      const resCards = resDiv?.querySelectorAll('.ss-result');
      console.log('After typing in input - results:', resCards?.length);
      if (resCards?.length) {
        [...resCards].slice(0, 3).forEach((c, i) => {
          console.log(`  ${i+1}. ${c.textContent?.trim().slice(0, 80)}`);
        });
      } else {
        console.log('Results inner HTML:');
        console.log(resDiv?.innerHTML?.slice(0, 300));
      }
    }
  }
  dom2.window.close();
}

testSearch().catch(e => { console.error('ERROR:', e); process.exit(1); });
