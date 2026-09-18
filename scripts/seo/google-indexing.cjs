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

const LOG_PATH = path.join(__dirname, '..', '..', 'scripts', 'seo', 'indexing-google-log.json');
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // لا يُرسل نفس URL خلال 24 ساعة
const MAX_PER_RUN = 20; // غوغل يسمح بحد أقصى 200 طلب/يوم — نتحفظ بـ 20 لكل رن (3 رنات = 60/يوم)

function loadLog() {
  try {
    if (fs.existsSync(LOG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    }
  } catch (e) { /* تجاهل سجلّ تالف */ }
  return {};
}

function saveLog(log) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
  } catch (e) {
    console.warn(`⚠️ تعذر حفظ سجلّ التقديم: ${e.message}`);
  }
}

async function main() {
  console.log('Authenticating with Google Indexing API...');
  await jwtClient.authorize();
  console.log('✅ Authenticated successfully as:', keyData.client_email);

  const indexing = google.indexing({
    version: 'v3',
    auth: jwtClient
  });

  // Support manual CLI URLs: node google-indexing.cjs --urls https://...
  const args = process.argv.slice(2);
  const cliUrlsIndex = args.indexOf('--urls');
  let specificUrls = [];
  if (cliUrlsIndex !== -1 && args[cliUrlsIndex + 1]) {
    specificUrls = args[cliUrlsIndex + 1].split(',').map(u => u.trim());
  }

  // الصفحات المحورية — تُرسل ما دامت لم تُرسل خلال 24 ساعة
  const priorityUrls = [
    'https://mohamidigital.online/',
    'https://mohamidigital.online/download.html',
    'https://mohamidigital.online/legal-calculators.html',
    'https://mohamidigital.online/legal-forms.html',
    'https://mohamidigital.online/pillars/',
    'https://mohamidigital.online/blog/',
    'https://mohamidigital.online/legal-radar.html'
  ];

  // أحدث المقالات من سجلّ النشر المعتمد (تاريخ حقيقي وليس تاريخ التشغيل)
  const blogUrls = [];
  const publishedLogPath = path.join(__dirname, '..', '..', 'scripts', 'published-log.json');
  try {
    if (fs.existsSync(publishedLogPath)) {
      const published = JSON.parse(fs.readFileSync(publishedLogPath, 'utf8'));
      const entries = Array.isArray(published) ? published : (published && published.published) || [];
      const withDate = entries
        .filter(e => e && e.url && e.date)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      for (const e of withDate) blogUrls.push(e.url);
    }
  } catch (e) {
    console.warn(`⚠️ تعذر قراءة published-log.json: ${e.message}`);
  }

  // أولوية: روابط CLI ← الصفحات المحورية ← أحدث المقالات ← بقية sitemap
  const dedupLog = loadLog();
  const now = Date.now();
  const seenAt = {};
  const toSubmit = [];
  const ordered = [...specificUrls, ...priorityUrls, ...blogUrls];

  for (const url of ordered) {
    if (toSubmit.length >= MAX_PER_RUN) break;
    const lastSent = dedupLog[url];
    if (lastSent && (now - new Date(lastSent).getTime()) < DEDUP_WINDOW_MS) continue;
    if (seenAt[url]) continue;
    seenAt[url] = true;
    toSubmit.push(url);
  }

  // ملء الباقي من sitemap لتغطية الصفحات غير المفهرسة
  const sitemapPath = path.join(__dirname, '..', '..', 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath) && toSubmit.length < MAX_PER_RUN) {
    const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
    const locRegex = /<loc>(https:\/\/mohamidigital\.online[^<]+)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(sitemapXml)) !== null && toSubmit.length < MAX_PER_RUN) {
      const u = match[1];
      if (seenAt[u]) continue;
      const lastSent = dedupLog[u];
      if (lastSent && (now - new Date(lastSent).getTime()) < DEDUP_WINDOW_MS) continue;
      seenAt[u] = true;
      toSubmit.push(u);
    }
  }

  if (toSubmit.length === 0) {
    console.log('✅ لا URLs جديدة (كل الروابط أُرسلت خلال آخر 24 ساعة).');
    return;
  }

  console.log(`Submitting ${toSubmit.length} URLs to Google Indexing API (dedup 24h, max ${MAX_PER_RUN}/run)...`);

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
      dedupLog[url] = new Date().toISOString();
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

  saveLog(dedupLog);
  console.log(`=== Finished: ${successCount} succeeded, ${failCount} failed ===`);
}

main().catch(err => {
  console.error('Fatal Error:', err);
});
