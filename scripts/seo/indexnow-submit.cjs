#!/usr/bin/env node
/**
 * indexnow-submit.cjs — إرسال URLs لـ IndexNow API (Microsoft)
 *
 * IndexNow بيبعت URLs لـ Bing + Yandex + DuckDuckGo فوراً
 * بدون حد يومي (محدود بـ 10,000 URLs/يوم للـ API key)
 *
 * الاستخدام:
 *   1) أول مرة: أنشئ API key من https://www.bing.com/indexnow
 *      أو ولّد key تلقائياً
 *   2) node scripts/seo/indexnow-submit.cjs --all
 *      (بيلتقط URLs من sitemap.xml ويرسلهم)
 *   3) node scripts/seo/indexnow-submit.cjs --urls "url1,url2,url3"
 *      (يرسل URLs محددة)
 *
 * المتطلبات (في .env):
 *   INDEXNOW_API_KEY=abc123...  (32 حرف hex)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const HOST = 'api.indexnow.org';
const KEY = process.env.INDEXNOW_API_KEY || generateKey();
const BASE_URL = 'https://mohamidigital.online';
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const KEY_LOCATION = `${BASE_URL}/${KEY}.txt`;

// ─── أدوات ──────────────────────────────────────────────────────────
function generateKey() {
  return require('crypto').randomBytes(16).toString('hex');
}

function postToIndexNow(urls) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      host: 'mohamidigital.online',
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls,
    });
    const req = https.request({
      method: 'POST',
      host: HOST,
      path: '/indexnow',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function loadUrlsFromSitemap() {
  return new Promise((resolve, reject) => {
    https.get(SITEMAP_URL, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Sitemap returned ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const urls = [...data.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
        resolve(urls);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function saveKeyFile() {
  // إنشاء ملف verification لـ IndexNow
  const keyFile = path.join(ROOT, 'public', `${KEY}.txt`);
  fs.writeFileSync(keyFile, KEY, 'utf8');
  console.log(`✓ تم إنشاء ملف المفتاح: ${KEY}.txt`);
}

// ─── main ──────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const sendAll = args.includes('--all');
  const sendUrls = args.find(a => a.startsWith('--urls='))?.split('=')[1]?.split(',') || [];

  if (!KEY) {
    console.log('⚠️  INDEXNOW_API_KEY مش متضبوط. هولّد واحد تلقائياً.');
    const newKey = generateKey();
    console.log(`   المفتاح الجديد: ${newKey}`);
    console.log('   أضفه في .env:');
    console.log(`   INDEXNOW_API_KEY=${newKey}`);
    // أنشئ ملف المفتاح
    const keyFile = path.join(ROOT, 'public', `${newKey}.txt`);
    fs.writeFileSync(keyFile, newKey, 'utf8');
    console.log(`\n✓ تم حفظ المفتاح في: public/${newKey}.txt`);
    console.log('\n⏭️  شغّل deploy ثم اعد التشغيل:');
    console.log('   npm run build && npx firebase deploy --only hosting');
    console.log(`   node scripts/seo/indexnow-submit.cjs --all`);
    return;
  }

  // تأكد من وجود ملف المفتاح
  const keyFile = path.join(ROOT, 'public', `${KEY}.txt`);
  if (!fs.existsSync(keyFile)) {
    console.log(`⚠️  ملف المفتاح مش موجود: ${KEY}.txt`);
    saveKeyFile();
    console.log('\n⏭️  شغّل deploy قبل المتابعة.');
    return;
  }

  let urls = [];
  if (sendAll) {
    console.log('📥 قراءة URLs من sitemap.xml...');
    urls = await loadUrlsFromSitemap();
    console.log(`   ✓ وجدت ${urls.length} URLs`);
  } else if (sendUrls.length) {
    urls = sendUrls;
    console.log(`📤 إرسال ${urls.length} URL محدد...`);
  } else {
    console.log('استخدام:');
    console.log('  node scripts/seo/indexnow-submit.cjs --all');
    console.log('  node scripts/seo/indexnow-submit.cjs --urls="url1,url2,url3"');
    return;
  }

  // IndexNow بيقبل حد أقصى 10,000 URL في الـ request
  const BATCH = 10000;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    console.log(`\n📡 إرسال ${batch.length} URLs لـ IndexNow (Batch ${Math.floor(i / BATCH) + 1})...`);
    try {
      const result = await postToIndexNow(batch);
      if (result.status === 200) {
        console.log(`   ✓ تم الإرسال بنجاح (Status 200)`);
      } else if (result.status === 202) {
        console.log(`   ✓ مقبول (Status 202) — IndexNow هيتحقق بعدين`);
      } else {
        console.log(`   ❌ فشل: ${result.status} — ${result.body}`);
      }
    } catch (e) {
      console.error(`   ❌ خطأ: ${e.message}`);
    }
  }

  console.log('\n📊 المتابعة في:');
  console.log('   - Bing Webmaster: https://www.bing.com/webmasters');
  console.log('   - Yandex Webmaster: https://webmaster.yandex.com');
  console.log('   - DuckDuckGo: عبر Bing');
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
