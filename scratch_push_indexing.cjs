'use strict';
// Push key fixed pages to Google Indexing API
const { GoogleAuth } = require('google-auth-library');
const https = require('https');

const KEY_FILE = 'd:/قانوني 7/google-service-account.json';

// Pages that were fixed in this session
const FIXED_PAGES = [
  'https://mohamidigital.online/',
  'https://mohamidigital.online/legal-radar.html',
  'https://mohamidigital.online/contact.html',
  'https://mohamidigital.online/sitemap.html',
  'https://mohamidigital.online/calculate-inheritance.html',
  'https://mohamidigital.online/courts-directory.html',
  'https://mohamidigital.online/legal-forms.html',
  'https://mohamidigital.online/blog/',
  // Sample of blog articles that now have robots meta
  'https://mohamidigital.online/blog/alimony-calculation-egypt.html',
  'https://mohamidigital.online/blog/bounced-check-laws-egypt.html',
  'https://mohamidigital.online/blog/old-rent-law-2026-eviction-and-increase.html',
  'https://mohamidigital.online/blog/arbitrary-dismissal-and-form-6-challenge-labor-law.html',
  'https://mohamidigital.online/blog/property-tax-egypt.html',
  'https://mohamidigital.online/blog/real-estate-registration-vs-customary-sale.html',
  'https://mohamidigital.online/blog/content-creators-tax-law-egypt.html',
  'https://mohamidigital.online/blog/shahr-aqary-apartment-registration-guide-2026.html',
  'https://mohamidigital.online/blog/execution-judgments-egypt.html',
  'https://mohamidigital.online/blog/administrative-appeals-egypt.html',
  'https://mohamidigital.online/blog/administrative-dismissal-appeal.html',
  'https://mohamidigital.online/blog/administrative-grievance.html',
];

async function getToken() {
  const auth = new GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

function pushUrl(token, url) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ url, type: 'URL_UPDATED' });
    const req = https.request({
      hostname: 'indexing.googleapis.com',
      path: '/v3/urlNotifications:publish',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ url, status: res.statusCode, body: data }));
    });
    req.on('error', e => resolve({ url, status: 'ERROR', error: e.message }));
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('Getting Google auth token...');
  let token;
  try {
    token = await getToken();
    console.log('Token obtained ✓');
  } catch (e) {
    console.log('Auth error:', e.message);
    return;
  }

  let success = 0;
  let failed = 0;
  for (const url of FIXED_PAGES) {
    const result = await pushUrl(token, url);
    if (result.status === 200) {
      console.log('[200 OK] ' + url);
      success++;
    } else {
      console.log('[' + result.status + '] FAIL: ' + url + ' | ' + result.body.slice(0, 100));
      failed++;
    }
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\nGoogle Indexing API push complete:');
  console.log('Success: ' + success + ' | Failed: ' + failed);
})();
