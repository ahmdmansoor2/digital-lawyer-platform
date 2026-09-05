const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const KEY_FILE = path.join(__dirname, '..', '..', 'google-service-account.json');

if (!fs.existsSync(KEY_FILE)) {
  console.error('❌ File google-service-account.json not found.');
  process.exit(1);
}

const keyData = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));

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

  const toSubmit = Array.from(new Set([...priorityUrls, ...urls])).slice(0, 100);
  console.log(`Submitting ${toSubmit.length} URLs to Google Indexing API...`);

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
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`=== Finished: ${successCount} succeeded, ${failCount} failed ===`);
}

main().catch(err => {
  console.error('Fatal Error:', err);
});
