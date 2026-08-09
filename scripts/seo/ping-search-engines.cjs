const fs = require('fs');
const path = require('path');
const https = require('https');

const SITEMAP_URL = 'https://mohamidigital.online/sitemap.xml';

console.log('🚀 بدء إرسال إشعارات الأرشفة وتوليد قائمة الصفحات...\n');

// 1. قراءة الروابط من sitemap.xml
const xmlPath = 'd:/قانوني 7/public/sitemap.xml';
if (!fs.existsSync(xmlPath)) {
  console.error('❌ ملف sitemap.xml غير موجود!');
  process.exit(1);
}

const xml = fs.readFileSync(xmlPath, 'utf8');
const urls = xml.match(/<loc>(.*?)<\/loc>/g).map(u => u.replace(/<\/?loc>/g, ''));

const mains = urls.filter(u => !u.includes('/pillars/') && !u.includes('/blog/'));
const pillars = urls.filter(u => u.includes('/pillars/'));
const blogs = urls.filter(u => u.includes('/blog/'));

// 2. تصدير قائمة الروابط في ملف نصي مرتب للنسخ المباشر
const reportContent = `=====================================================
 قائمة روابط منصة المحامي الرقمية لإرسالها في Google Search Console
 إجمالي الروابط: ${urls.length} رابطاً
 التحديث: ${new Date().toLocaleString('ar-EG')}
=====================================================

1️⃣ الصفحات الرئيسية والخدمية (${mains.length} رابطاً):
${mains.join('\n')}

2️⃣ المراجع القانونية الشاملة Pillars (${pillars.length} رابطاً):
${pillars.join('\n')}

3️⃣ مقالات المدونة القانونية Blog (${blogs.length} رابطاً):
${blogs.join('\n')}
`;

const outputPath = 'd:/قانوني 7/public/urls_for_indexing.txt';
fs.writeFileSync(outputPath, reportContent, 'utf8');
console.log(`✅ تم إنشاء قائمة الروابط في: ${outputPath}`);

// 3. إرسال Ping لـ Google و Bing
function ping(serviceName, pingUrl) {
  return new Promise((resolve) => {
    https.get(pingUrl, (res) => {
      console.log(`📡 Ping ${serviceName}: HTTP ${res.statusCode}`);
      resolve();
    }).on('error', (err) => {
      console.log(`⚠️ Ping ${serviceName} فشل: ${err.message}`);
      resolve();
    });
  });
}

async function runPings() {
  console.log('\n📡 جاري إشعارات الفحص لمحركات البحث...');
  await ping('Google Sitemap', `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
  await ping('Bing Sitemap', `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`);
  console.log('\n✨ اكتمل الإشعار بنجاح!');
}

runPings();
