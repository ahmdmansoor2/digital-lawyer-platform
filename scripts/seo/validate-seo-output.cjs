#!/usr/bin/env node
/**
 * validate-seo-output.cjs
 * صمام الأمان الوقائي قبل النشر لمنصة المحامي الرقمية (mohamidigital.online)
 *
 * يفحص آلياً:
 * 1. سلامة ملفات خرائط الموقع (sitemap.xml, priority-tier1-sitemap.xml, news-sitemap.xml) وعدم تكرار الروابط.
 * 2. وجود ملفات التحقق الأساسية (ads.txt, robots.txt, IndexNow key).
 * 3. وجود وسم <link rel="canonical"> وصحة كتل JSON-LD Schema في صفحات HTML داخل public/.
 *
 * الاستخدام:
 *   node scripts/seo/validate-seo-output.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

const SITEMAPS = [
  'sitemap.xml',
  'priority-tier1-sitemap.xml',
  'news-sitemap.xml',
];

const JSON_LD_RE = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const CANONICAL_RE = /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i;
const NOINDEX_RE = /<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i;

function walkHtml(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtml(full, results);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function validateSitemaps(errors, warnings) {
  console.log('1️⃣  فحص خرائط الموقع (Sitemaps)...');
  for (const smName of SITEMAPS) {
    const smPath = path.join(PUBLIC_DIR, smName);
    if (!fs.existsSync(smPath)) {
      errors.push(`خريطة الموقع مفقودة: public/${smName}`);
      continue;
    }
    const xml = fs.readFileSync(smPath, 'utf8');
    if (!xml.includes('<urlset') && !xml.includes('<sitemapindex')) {
      errors.push(`بنية XML غير صالحة في public/${smName}`);
      continue;
    }

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    if (locs.length === 0) {
      errors.push(`خريطة الموقع فارغة (0 روابط): public/${smName}`);
      continue;
    }

    const seen = new Set();
    let dupCount = 0;
    for (const u of locs) {
      if (seen.has(u)) dupCount++;
      seen.add(u);
      if (!u.startsWith('https://mohamidigital.online')) {
        warnings.push(`رابط بنطاق مختلف داخل ${smName}: ${u}`);
      }
    }

    if (dupCount > 0) {
      warnings.push(`يوجد ${dupCount} رابط مكرر داخل ${smName}`);
    }
    console.log(`   ✅ ${smName}: صالحة (${locs.length} رابط، الفريدة: ${seen.size})`);
  }
}

function validateCoreConfig(errors) {
  console.log('\n2️⃣  فحص ملفات التحقق الأساسية (ads.txt, robots.txt, IndexNow)...');

  const adsPath = path.join(PUBLIC_DIR, 'ads.txt');
  if (!fs.existsSync(adsPath)) {
    errors.push('ملف public/ads.txt غير موجود');
  } else {
    const ads = fs.readFileSync(adsPath, 'utf8');
    if (!ads.includes('pub-7725405859334364')) {
      errors.push('معرف الناشر pub-7725405859334364 غير موجود في public/ads.txt');
    } else {
      console.log('   ✅ ads.txt: سليم ويحمل معرف الناشر الصحيح');
    }
  }

  const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    errors.push('ملف public/robots.txt غير موجود');
  } else {
    const robots = fs.readFileSync(robotsPath, 'utf8');
    if (!robots.includes('sitemap.xml')) {
      errors.push('ملف public/robots.txt لا يشير إلى sitemap.xml');
    } else {
      console.log('   ✅ robots.txt: سليم ومرتبط بخرائط الموقع');
    }
  }

  const indexNowFiles = fs
    .readdirSync(PUBLIC_DIR)
    .filter((f) => /^[a-f0-9]{32}\.txt$/i.test(f));
  if (indexNowFiles.length === 0) {
    errors.push('ملف مفتاح IndexNow غير موجود في public/');
  } else {
    console.log(`   ✅ IndexNow Key: موجود (${indexNowFiles[0]})`);
  }
}

function validateHtmlPages(errors, warnings) {
  console.log('\n3️⃣  فحص صفحات HTML ووسوم Canonical وJSON-LD Schema...');
  const htmlFiles = walkHtml(PUBLIC_DIR);
  let validJsonLdBlocks = 0;
  let missingCanonical = 0;
  let noindexCount = 0;

  for (const file of htmlFiles) {
    const rel = path.relative(PUBLIC_DIR, file).replace(/\\/g, '/');
    // Skip Google Search Console verification file & 404 page
    if (/^google[a-f0-9]+\.html$/i.test(rel) || rel === '404.html') continue;

    const content = fs.readFileSync(file, 'utf8');

    if (NOINDEX_RE.test(content)) {
      noindexCount++;
    }

    const canMatch = CANONICAL_RE.exec(content);
    if (!canMatch) {
      missingCanonical++;
      warnings.push(`صفحة بدون وسم canonical: ${rel}`);
    } else if (!canMatch[1].startsWith('https://mohamidigital.online')) {
      warnings.push(`وسم canonical بنطاق مختلف في ${rel}: ${canMatch[1]}`);
    }

    let match;
    let blockIdx = 0;
    JSON_LD_RE.lastIndex = 0;
    while ((match = JSON_LD_RE.exec(content)) !== null) {
      blockIdx++;
      const rawJson = match[1].trim();
      try {
        const parsed = JSON.parse(rawJson);
        if (!parsed['@context']) {
          errors.push(`${rel}: كتلة JSON-LD #${blockIdx} تفتقد @context`);
        } else {
          validJsonLdBlocks++;
        }
      } catch (e) {
        errors.push(`${rel}: خطأ صياغة JSON-LD في الكتلة #${blockIdx} — ${e.message}`);
      }
    }
  }

  console.log(`   ✅ تم فحص ${htmlFiles.length} صفحة HTML`);
  console.log(`   ✅ كتل JSON-LD Schema السليمة: ${validJsonLdBlocks}`);
  if (missingCanonical > 0) {
    console.log(`   ⚠️  صفحات بدون canonical: ${missingCanonical}`);
  }
  if (noindexCount > 0) {
    console.log(`   ℹ️  صفحات تحمل noindex: ${noindexCount}`);
  }
}

function main() {
  const errors = [];
  const warnings = [];

  console.log('🛡️  بدء الفحص الوقائي للـ SEO والـ Schema (mohamidigital.online)\n');

  validateSitemaps(errors, warnings);
  validateCoreConfig(errors);
  validateHtmlPages(errors, warnings);

  console.log('\n══════════════════════════════════════════════════');
  if (warnings.length > 0) {
    console.log(`⚠️  التنبيهات (${warnings.length}):`);
    warnings.slice(0, 15).forEach((w) => console.log(`   - ${w}`));
    if (warnings.length > 15) {
      console.log(`   ... و ${warnings.length - 15} تنبيهات أخرى.`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n❌ فشل الفحص الوقائي بوجود ${errors.length} خطأ حرج:`);
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log('✨ اجتاز الموقع الفحص الوقائي بنجاح تام (0 أخطاء حرجة)!');
}

main();
