'use strict';
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const KEY_FILE = path.join(__dirname, '..', '..', 'google-service-account.json');
const keyData = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));

const jwtClient = new google.auth.JWT({
  email: keyData.client_email,
  key: keyData.private_key,
  scopes: ['https://www.googleapis.com/auth/indexing']
});

const urlsToPush = [
  'https://mohamidigital.online/pillars/',
  'https://mohamidigital.online/economic-hub.html',
  'https://mohamidigital.online/legal-calculators.html',
  'https://mohamidigital.online/contract-generator.html',
  'https://mohamidigital.online/appeal-deadlines.html',
  'https://mohamidigital.online/calculate-alimony.html',
  'https://mohamidigital.online/real-estate-registration-fees.html',
  'https://mohamidigital.online/uae-legal-hub.html',
  'https://mohamidigital.online/qatar-legal-hub.html',
  'https://mohamidigital.online/saudi-legal-hub.html',
  'https://mohamidigital.online/pillars/law-firm-management-in-egypt.html',
  'https://mohamidigital.online/company-incorporation.html',
  'https://mohamidigital.online/legal-diagnostics.html',
  'https://mohamidigital.online/courts-directory.html',
  'https://mohamidigital.online/court-precedents.html',
  'https://mohamidigital.online/pillars/legal-contract-drafting-egypt.html',
  'https://mohamidigital.online/legal-library.html',
  'https://mohamidigital.online/pillars/egyptian-labor-law-2026-comprehensive-guide.html',
  'https://mohamidigital.online/pillars/personal-status-law-egypt-comprehensive-guide.html',
  'https://mohamidigital.online/law-students-hub.html'
];

async function run() {
  console.log('Authenticating with Google Indexing API...');
  await jwtClient.authorize();
  console.log('Authenticated successfully.\n');

  let success = 0;
  let failed = 0;

  for (const url of urlsToPush) {
    try {
      const response = await google.indexing('v3').urlNotifications.publish({
        auth: jwtClient,
        requestBody: {
          url: url,
          type: 'URL_UPDATED'
        }
      });
      if (response.status === 200) {
        console.log(`✅ [200 OK] Pushed to Google Indexing: ${url}`);
        success++;
      } else {
        console.log(`⚠️ [Status ${response.status}] ${url}`);
      }
    } catch (err) {
      console.error(`❌ Failed ${url}:`, err.message);
      failed++;
    }
    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\nGoogle Indexing Push Complete: ${success} Succeeded, ${failed} Failed.`);
}

run();
