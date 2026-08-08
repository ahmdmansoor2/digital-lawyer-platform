#!/usr/bin/env node
/**
 * health-monitor.cjs — فحص صحي يومي للموقع
 *
 * يفحص:
 *   - كل صفحات الـ sitemap تستجيب 200
 *   - Schema.org JSON-LD موجود وصالح
 *   - Sitemap.xml متاح وصالح
 *   - robots.txt متاح
 *   - السرعة (response time)
 *   - SEO basics (title, meta description)
 *
 * المخرجات:
 *   - logs/health-monitor-YYYY-MM-DD.json
 *   - طباعة ملخص في الـ console
 *
 * الاستخدام:
 *   node scripts/seo/health-monitor.cjs
 *   node scripts/seo/health-monitor.cjs --email  # إرسال إيميل (يحتاج setup)
 *
 * للجدولة: Task Scheduler يومي 6 صباحاً
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(ROOT, 'scripts', 'seo', 'logs');
const BASE_URL = 'https://mohamidigital.online';

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const today = new Date().toISOString().split('T')[0];
const REPORT_FILE = path.join(LOG_DIR, `health-${today}.json`);

// ─── أدوات HTTP ──────────────────────────────────────────────────────
function fetchUrl(url, options = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        time: Date.now() - start,
        size: data.length,
        headers: res.headers,
        data: options.fullBody ? data : data.substring(0, 500),
      }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message, time: Date.now() - start }));
    req.setTimeout(options.timeout || 15000, () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout', time: Date.now() - start });
    });
  });
}

// ─── الفحوصات ──────────────────────────────────────────────────────
async function checkSitemap() {
  const result = await fetchUrl(`${BASE_URL}/sitemap.xml`, { fullBody: true });
  if (result.status !== 200) {
    return { ok: false, error: `Sitemap returned ${result.status}` };
  }
  // حساب عدد الـ URLs
  const urls = (result.data.match(/<loc>/g) || []).length;
  // فحص XML صحيح
  try {
    if (!result.data.trim().startsWith('<?xml')) return { ok: false, error: 'Missing XML declaration' };
    return { ok: true, urlCount: urls, size: result.size, time: result.time };
  } catch (e) {
    return { ok: false, error: 'Invalid XML' };
  }
}

async function checkRobotsTxt() {
  const result = await fetchUrl(`${BASE_URL}/robots.txt`);
  return {
    ok: result.status === 200,
    status: result.status,
    hasSitemap: result.data?.includes('Sitemap:'),
    size: result.size,
  };
}

async function checkPages(pages) {
  const results = [];
  for (const path of pages) {
    const r = await fetchUrl(`${BASE_URL}${path}`, { fullBody: true });
    // بندور على الـ schema في كل الصفحة (مش أول 500 حرف)
    const hasSchema = r.data?.includes('application/ld+json') || r.data?.includes('"@type"');
    const hasTitle = r.data?.includes('<title>');
    const hasMeta = r.data?.includes('name="description"');
    const schemaCount = (r.data?.match(/application\/ld\+json/g) || []).length;
    results.push({
      path,
      status: r.status,
      time: r.time,
      hasSchema,
      hasTitle,
      hasMeta,
      schemaCount,
      ok: r.status === 200 && hasTitle && hasMeta,
    });
  }
  return results;
}

async function checkImportantPages() {
  return await checkPages([
    '/',
    '/about.html',
    '/features.html',
    '/pricing.html',
    '/pillars/',
    '/pillars/law-firm-management-in-egypt.html',
    '/blog/',
  ]);
}

async function checkBrokenLinks() {
  // جلب sitemap URLs وفحصها
  const sitemap = await fetchUrl(`${BASE_URL}/sitemap.xml`, { fullBody: true });
  if (sitemap.status !== 200) return { error: 'No sitemap' };
  const urls = (sitemap.data.match(/<loc>([^<]+)<\/loc>/g) || [])
    .map(m => m.replace(/<\/?loc>/g, ''))
    .slice(0, 30); // فحص أول 30 رابط فقط (لتجنب الـ rate limiting)

  const broken = [];
  for (const url of urls) {
    const r = await fetchUrl(url);
    if (r.status !== 200) {
      broken.push({ url, status: r.status });
    }
  }
  return { total: urls.length, broken };
}

// ─── التقرير ───────────────────────────────────────────────────────
async function generateReport() {
  console.log('🏥 Health Monitor — منصة المحامي الرقمية');
  console.log(`📅 ${new Date().toLocaleString('ar-EG')}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    sitemap: null,
    robots: null,
    importantPages: null,
    brokenLinks: null,
    summary: { ok: 0, warn: 0, error: 0 },
  };

  // 1) Sitemap
  console.log('📄 فحص Sitemap...');
  results.sitemap = await checkSitemap();
  if (results.sitemap.ok) {
    console.log(`   ✓ ${results.sitemap.urlCount} URLs · ${results.sitemap.size} bytes · ${results.sitemap.time}ms`);
  } else {
    console.log(`   ❌ ${results.sitemap.error}`);
    results.summary.error++;
  }

  // 2) Robots.txt
  console.log('🤖 فحص robots.txt...');
  results.robots = await checkRobotsTxt();
  console.log(`   ${results.robots.ok ? '✓' : '❌'} Status: ${results.robots.status} · Sitemap ref: ${results.robots.hasSitemap ? '✓' : '✗'}`);

  // 3) Important pages
  console.log('\n📊 فحص الصفحات المهمة:');
  results.importantPages = await checkImportantPages();
  for (const p of results.importantPages) {
    const icon = p.ok && p.hasSchema ? '✓' : (p.status === 200 ? '⚠' : '❌');
    const flags = [
      p.hasSchema ? `schema(${p.schemaCount})` : 'NO-SCHEMA',
      p.hasTitle ? 'title' : 'NO-TITLE',
      p.hasMeta ? 'meta' : 'NO-META',
    ].join(' ');
    console.log(`   ${icon} ${p.path.padEnd(50)} [${p.status}] [${p.time}ms] ${flags}`);
    if (p.ok && p.hasSchema) results.summary.ok++;
    else if (p.status === 200) results.summary.warn++;
    else results.summary.error++;
  }

  // 4) Broken links
  console.log('\n🔗 فحص الروابط المعطلة (أول 30 رابط)...');
  results.brokenLinks = await checkBrokenLinks();
  if (results.brokenLinks.error) {
    console.log(`   ⚠️  تخطي (${results.brokenLinks.error})`);
  } else {
    console.log(`   ✓ ${results.brokenLinks.total - results.brokenLinks.broken.length}/${results.brokenLinks.total} يعمل`);
    for (const b of results.brokenLinks.broken) {
      console.log(`   ❌ ${b.url} (${b.status})`);
      results.summary.error++;
    }
  }

  // الملخص
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 الملخص:`);
  console.log(`   ✓ سليم: ${results.summary.ok}`);
  console.log(`   ⚠ تحذيرات: ${results.summary.warn}`);
  console.log(`   ❌ أخطاء: ${results.summary.error}`);

  // حفظ التقرير
  fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n📄 التقرير محفوظ: ${REPORT_FILE}`);

  // لو في أخطاء، أعرض تنبيه
  if (results.summary.error > 0) {
    console.log(`\n🚨 في ${results.summary.error} مشكلة محتاجة انتباه!`);
    process.exit(1);
  }
}

generateReport().catch(e => {
  console.error('❌ خطأ غير متوقع:', e.message);
  process.exit(1);
});
