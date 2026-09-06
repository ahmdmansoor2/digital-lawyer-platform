const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const KEY_FILE = path.join(__dirname, '..', '..', 'google-service-account.json');
let keyData = null;

if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  try {
    keyData = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch (e) {
    console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON environment variable.');
  }
}

if (!keyData && fs.existsSync(KEY_FILE)) {
  try {
    keyData = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  } catch (e) {
    console.error('❌ Failed to parse google-service-account.json file.');
  }
}

if (!keyData) {
  console.error('⚠️ Neither google-service-account.json nor GOOGLE_SERVICE_ACCOUNT_JSON env var found. Skipping indexing.');
  process.exit(0);
}

const jwtClient = new google.auth.JWT({
  email: keyData.client_email,
  key: keyData.private_key,
  scopes: ['https://www.googleapis.com/auth/indexing']
});

async function main() {
  console.log('Authenticating with Google Indexing API...');
  await jwtClient.authorize();
  console.log('✅ Authenticated successfully as:', keyData.client_email);

  const indexing = google.indexing({
    version: 'v3',
    auth: jwtClient
  });

  // Read sitemap to get active URLs
  const sitemapPath = path.join(__dirname, '..', '..', 'public', 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('❌ sitemap.xml not found.');
    process.exit(1);
  }

  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const urls = [];
  const locRegex = /<loc>(https:\/\/mohamidigital\.online[^<]+)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(sitemapXml)) !== null) {
    urls.push(match[1]);
  }

  console.log(`Found ${urls.length} URLs in sitemap.`);

  // Support manual CLI URLs: node google-indexing.cjs --urls https://...
  const args = process.argv.slice(2);
  const cliUrlsIndex = args.indexOf('--urls');
  let specificUrls = [];
  if (cliUrlsIndex !== -1 && args[cliUrlsIndex + 1]) {
    specificUrls = args[cliUrlsIndex + 1].split(',').map(u => u.trim());
  }

  // Priority queue: Homepage, core hubs, latest blogs
  const priorityUrls = [
    'https://mohamidigital.online/',
    'https://mohamidigital.online/download.html',
    'https://mohamidigital.online/legal-calculators.html',
    'https://mohamidigital.online/legal-forms.html',
    'https://mohamidigital.online/pillars/',
    'https://mohamidigital.online/blog/',
    'https://mohamidigital.online/legal-radar.html'
  ];

  // Separate blog URLs and reverse them so newest articles are submitted first
  const blogUrls = urls.filter(u => u.includes('/blog/') && u !== 'https://mohamidigital.online/blog/').reverse();
  const otherUrls = urls.filter(u => !u.includes('/blog/'));

  const toSubmit = Array.from(new Set([...specificUrls, ...priorityUrls, ...blogUrls, ...otherUrls])).slice(0, 100);
  console.log(`Submitting ${toSubmit.length} URLs to Google Indexing API (Newest First)...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toSubmit.length; i++) {
    const url = toSubmit[i];
    try {
      await indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_UPDATED'
        }
      });
      console.log(`[${i + 1}/${toSubmit.length}] ✅ Submitted: ${url}`);
      successCount++;
    } catch (err) {
      console.error(`[${i + 1}/${toSubmit.length}] ❌ Failed: ${url} -> ${err.message}`);
      failCount++;
      if (err.message.includes('Permission') || err.message.includes('403')) {
        console.error('⚠️ تأكد من إضافة الإيميل كـ Owner في Google Search Console');
        break;
      }
      if (err.message.includes('Quota exceeded')) {
        console.warn('⚠️ تم الوصول إلى الحد الأقصى اليومي المسموح به من Google (200 طلب/يوم). سيتم استئناف الباقي غداً تلقائياً.');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`=== Finished: ${successCount} succeeded, ${failCount} failed ===`);
}

main().catch(err => {
  console.error('Fatal Error:', err);
});
