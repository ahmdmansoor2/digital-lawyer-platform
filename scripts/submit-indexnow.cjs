#!/usr/bin/env node
/**
 * scripts/submit-indexnow.cjs
 * ──────────────────────────
 * إرسال URLs إلى IndexNow (Bing/Yandex/Naver/Seznam)
 *
 * الاستخدام:
 *   node scripts/submit-indexnow.cjs                              # إرسال كل URLs من sitemap
 *   node scripts/submit-indexnow.cjs --url https://.../page.html  # إرسال URL واحد
 *   node scripts/submit-indexnow.cjs --urls file.txt              # إرسال قائمة من ملف
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const INDEXNOW_KEY = '6daaf32f6d50f31bce2206785645d61f625d724d5e4c861949dca43fafde3dd4';
const HOST = 'mohamidigital.online';
const SITEMAP_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { url: null, urlsFile: null, fromSitemap: true };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) { opts.url = args[++i]; opts.fromSitemap = false; }
    else if (args[i] === '--urls' && args[i + 1]) { opts.urlsFile = args[++i]; opts.fromSitemap = false; }
  }
  return opts;
}

function extractUrlsFromSitemap() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error('❌ sitemap.xml غير موجود:', SITEMAP_PATH);
    return [];
  }
  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const urls = [];
  const regex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function submitToEndpoint(hostname, path, urls) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urls
    });

    const options = {
      hostname: hostname,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload),
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ host: hostname, status: res.statusCode, body: data });
      });
    });

    req.on('error', (err) => {
      resolve({ host: hostname, status: 'ERROR', body: err.message });
    });
    req.setTimeout(25000, () => {
      req.destroy();
      resolve({ host: hostname, status: 'TIMEOUT', body: 'Timeout 25s' });
    });
    req.write(payload);
    req.end();
  });
}

async function submitToIndexNow(urls) {
  const endpoints = [
    { host: 'www.bing.com', path: '/indexnow' },
    { host: 'api.indexnow.org', path: '/indexnow' },
    { host: 'yandex.com', path: '/indexnow' }
  ];

  const results = await Promise.all(endpoints.map(ep => submitToEndpoint(ep.host, ep.path, urls)));
  return results;
}

const LOG_PATH = path.join(__dirname, '..', 'indexnow-log.json');
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // لا يُرسل نفس URL خلال 24 ساعة
const MAX_PER_RUN = 25; // حد آمن لعرض IndexNow المجاني — لا نغرق محركات البحث بكل الموقع كل رن

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
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
  } catch (e) {
    console.warn(`⚠️ تعذر حفظ سجلّ التقديم: ${e.message}`);
  }
}

async function main() {
  const opts = parseArgs();
  let requestedUrls = [];

  if (opts.url) {
    requestedUrls = [opts.url];
  } else if (opts.urlsFile) {
    const content = fs.readFileSync(opts.urlsFile, 'utf8');
    requestedUrls = content.split('\n').map(l => l.trim()).filter(l => l && l.startsWith('http'));
  } else {
    // أحدث المقالات من سجلّ النشر المعتمد أولاً، ثم بقية sitemap
    const publishedLogPath = path.join(__dirname, '..', 'published-log.json');
    try {
      if (fs.existsSync(publishedLogPath)) {
        const published = JSON.parse(fs.readFileSync(publishedLogPath, 'utf8'));
        const entries = Array.isArray(published) ? published : (published && published.published) || [];
        const withDate = entries
          .filter(e => e && e.url && e.date)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)));
        for (const e of withDate) requestedUrls.push(e.url);
      }
    } catch (e) {
      console.warn(`⚠️ تعذر قراءة published-log.json: ${e.message}`);
    }
    requestedUrls = [...requestedUrls, ...extractUrlsFromSitemap()];
  }

  const dedupLog = loadLog();
  const now = Date.now();
  const urls = [];
  const seenAt = {};
  for (const url of requestedUrls) {
    if (urls.length >= MAX_PER_RUN) break;
    if (seenAt[url]) continue;
    const lastSent = dedupLog[url];
    if (lastSent && (now - new Date(lastSent).getTime()) < DEDUP_WINDOW_MS) continue;
    seenAt[url] = true;
    urls.push(url);
  }

  if (urls.length === 0) {
    console.log('✅ لا URLs جديدة (كل الروابط أُرسلت خلال آخر 24 ساعة).');
    return;
  }

  console.log(`\n🔗 إرسال ${urls.length} URL إلى IndexNow (dedup 24h, max ${MAX_PER_RUN}/run)...`);

  try {
    const results = await submitToIndexNow(urls);
    for (const res of results) {
      if (res.status === 200) {
        console.log(`  ✅ [${res.host}] تم الإرسال بنجاح (${res.status})`);
      } else if (res.status === 202) {
        console.log(`  ✅ [${res.host}] تم القبول (${res.status}) — ستُعالج URLs قريباً`);
      } else if (res.status === 429) {
        console.warn(`  ⚠️ [${res.host}] تم الوصول إلى حد IndexNow اليومي (429) — نوقف الإرسال اليوم.`);
      } else {
        console.log(`  ⚠️ [${res.host}] استجابة: ${res.status} — ${String(res.body).substring(0, 150)}`);
      }
    }
  } catch (err) {
    console.error(`  ❌ خطأ: ${err.message}`);
    return;
  }

  for (const url of urls) dedupLog[url] = new Date().toISOString();
  saveLog(dedupLog);
  console.log(`\n🏁 انتهى الإرسال لمحركات Bing (Edge) و IndexNow و Yandex.`);
}

main().catch(console.error);
