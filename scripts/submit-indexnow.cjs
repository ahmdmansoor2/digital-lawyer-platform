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

function submitToIndexNow(urls) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urls
    });

    const options = {
      hostname: 'api.indexnow.org',
      path: '/indexnow',
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
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

async function main() {
  const opts = parseArgs();
  let urls = [];

  if (opts.url) {
    urls = [opts.url];
  } else if (opts.urlsFile) {
    const content = fs.readFileSync(opts.urlsFile, 'utf8');
    urls = content.split('\n').map(l => l.trim()).filter(l => l && l.startsWith('http'));
  } else {
    urls = extractUrlsFromSitemap();
  }

  if (urls.length === 0) {
    console.log('⚠️ لا توجد URLs لإرسالها');
    return;
  }

  console.log(`\n🔗 إرسال ${urls.length} URL إلى IndexNow...`);

  // IndexNow يدعم حتى 10,000 URL في طلب واحد
  const BATCH_SIZE = 10000;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE);

    console.log(`\n📦 الدفعة ${batchNum}/${totalBatches} (${batch.length} URL)...`);

    try {
      const result = await submitToIndexNow(batch);
      if (result.status === 200) {
        console.log(`  ✅ تم الإرسال بنجاح (${result.status})`);
      } else if (result.status === 202) {
        console.log(`  ✅ تم القبول (${result.status}) — ستُعالج URLs قريباً`);
      } else {
        console.log(`  ⚠️ استجابة: ${result.status} — ${result.body.substring(0, 200)}`);
      }
    } catch (err) {
      console.error(`  ❌ خطأ: ${err.message}`);
    }
  }

  console.log(`\n🏁 انتهى. تأكد من فتح Bing Webmaster Tools → IndexNow للتحقق.`);
}

main().catch(console.error);
