#!/usr/bin/env node
/**
 * multi-engine-submit.cjs
 * إرسال تلقائي يومي لخرائط الموقع والروابط إلى جميع محركات البحث والمتصفحات العالمية:
 * - Microsoft Bing & Edge (IndexNow + Sitemap Ping)
 * - Yandex (IndexNow)
 * - DuckDuckGo & Yahoo (عبر شبكة IndexNow / Bing)
 * - Seznam.cz & Naver & Yep (عبر IndexNow Hub)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const HOST_DOMAIN = 'mohamidigital.online';
const BASE_URL = `https://${HOST_DOMAIN}`;

const SITEMAPS = [
  `${BASE_URL}/sitemap.xml`,
  `${BASE_URL}/priority-tier1-sitemap.xml`,
  `${BASE_URL}/news-sitemap.xml`,
];

function resolveIndexNowKey() {
  if (process.env.INDEXNOW_API_KEY) {
    return process.env.INDEXNOW_API_KEY.trim();
  }
  const pubDir = path.join(ROOT, 'public');
  if (fs.existsSync(pubDir)) {
    const keyFile = fs.readdirSync(pubDir).find((f) => /^[a-f0-9]{32}\.txt$/i.test(f));
    if (keyFile) {
      return keyFile.replace(/\.txt$/i, '');
    }
  }
  return null;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 15000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, data }));
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy();
        reject(new Error(`Timeout fetching ${url}`));
      });
  });
}

function postJson(host, reqPath, payload) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        method: 'POST',
        host,
        path: reqPath,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', (err) => resolve({ status: 0, body: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, body: 'timeout' });
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  const key = resolveIndexNowKey();
  if (!key) {
    console.error('❌ لم يتم العثور على مفتاح IndexNow في البيئة أو في مجلد public/');
    process.exit(1);
  }
  const keyLocation = `${BASE_URL}/${key}.txt`;

  console.log('🌐 بدء الفهرسة متعددة المحركات (Bing, Edge, Yandex, DuckDuckGo, Seznam, Naver)...');

  // 1. Collect unique URLs from all 3 live sitemaps
  const urlSet = new Set();
  for (const smUrl of SITEMAPS) {
    try {
      const res = await fetchUrl(smUrl);
      if (res.status === 200) {
        const matches = [...res.data.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
        matches.forEach((u) => urlSet.add(u));
        console.log(`  ✓ ${smUrl}: ${matches.length} URL`);
      } else {
        console.warn(`  ⚠️ ${smUrl}: HTTP ${res.status}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ خطأ في قراءة ${smUrl}: ${e.message}`);
    }
  }

  const allUrls = Array.from(urlSet);
  if (allUrls.length === 0) {
    console.error('❌ لم يتم العثور على أي روابط في خرائط الموقع!');
    process.exit(1);
  }
  console.log(`📦 إجمالي الروابط المجمعة الفريدة: ${allUrls.length} رابطاً\n`);

  // 2. Submit to IndexNow endpoints (Hub + Bing + Yandex)
  const endpoints = [
    { name: 'IndexNow Global Hub (DuckDuckGo / Seznam / Naver / Yep)', host: 'api.indexnow.org', path: '/indexnow' },
    { name: 'Microsoft Bing & Edge', host: 'www.bing.com', path: '/indexnow' },
    { name: 'Yandex Search', host: 'yandex.com', path: '/indexnow' },
  ];

  const BATCH = 10000;
  for (const ep of endpoints) {
    for (let i = 0; i < allUrls.length; i += BATCH) {
      const batch = allUrls.slice(i, i + BATCH);
      const res = await postJson(ep.host, ep.path, {
        host: HOST_DOMAIN,
        key,
        keyLocation,
        urlList: batch,
      });
      const ok = res.status === 200 || res.status === 202;
      console.log(
        `${ok ? '✅' : '⚠️'} ${ep.name}: HTTP ${res.status}${ok ? ' (تم القبول والإدراج)' : ' — ' + res.body.slice(0, 120)}`
      );
    }
  }

  console.log('\n✨ اكتملت عملية الفهرسة التلقائية الشاملة لجميع محركات البحث عبر IndexNow!');
}

main().catch((e) => {
  console.error('❌ خطأ غير متوقع:', e.message);
  process.exit(1);
});
