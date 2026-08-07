// fix-og-images.cjs — يضمن وجود وسوم og:image والصور المرفقة لـ Facebook
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = 'd:\\قانوني 7';
const BLOG_DIR = path.join(BASE, 'public', 'blog');
const AUTO_PUB = path.join(BASE, 'scripts', 'auto-publisher.cjs');
const FB_PUB = path.join(BASE, 'scripts', 'blog-publisher', 'facebook-publish.cjs');

console.log('🖼️  جاري إضافة وسوم og:image وتفعيل معاينة الصور على Facebook...');

// 1. تحديث auto-publisher.cjs
let autoCode = fs.readFileSync(AUTO_PUB, 'utf8');
if (!autoCode.includes('og:image')) {
  const targetStr = '<meta property="og:site_name" content="منصة المحامي الرقمية" />';
  const replacementStr = `<meta property="og:image" content="https://mohamidigital.online\${getImageForTopic(topic)}" />\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n  <meta property="og:site_name" content="منصة المحامي الرقمية" />`;
  autoCode = autoCode.replace(targetStr, replacementStr);
  fs.writeFileSync(AUTO_PUB, autoCode, 'utf8');
  console.log('✅ تم إدراج og:image في scripts/auto-publisher.cjs');
}

// 2. تحديث facebook-publish.cjs لنقل رابط الصورة والصورة البارزة في منشورات Graph API
let fbCode = fs.readFileSync(FB_PUB, 'utf8');

function getImageForSlug(slug) {
  if (slug.includes('inheritance') || slug.includes('miraath')) return '/blog/assets/inheritance.jpg';
  if (slug.includes('divorce') || slug.includes('khul') || slug.includes('family')) return '/blog/assets/family-law.jpg';
  if (slug.includes('real-estate') || slug.includes('tenant') || slug.includes('building')) return '/blog/assets/real-estate.jpg';
  if (slug.includes('consumer') || slug.includes('labor') || slug.includes('debt') || slug.includes('termination')) return '/blog/assets/consumer-protection.jpg';
  if (slug.includes('compensation') || slug.includes('traffic') || slug.includes('criminal') || slug.includes('grievance')) return '/blog/assets/civil-compensation.jpg';
  return '/blog/assets/company.jpg';
}

// التأكد من إرفاق رابط الصورة (picture) والرابط الأصلي (link) عند النشر على Facebook
if (!fbCode.includes('params.set("link"')) {
  const oldPostFunc = `async function postToFacebook(message, pageId, token, isPart, partInfo) {
  const url = \`https://graph.facebook.com/v19.0/\${pageId}/feed\`;
  const body = new URLSearchParams({ message, access_token: token });`;

  const newPostFunc = `async function postToFacebook(message, pageId, token, isPart, partInfo, articleUrl, imageUrl) {
  const url = \`https://graph.facebook.com/v19.0/\${pageId}/feed\`;
  const bodyParams = { message, access_token: token };
  if (articleUrl) bodyParams.link = articleUrl;
  if (imageUrl) bodyParams.picture = imageUrl;
  const body = new URLSearchParams(bodyParams);`;

  fbCode = fbCode.replace(oldPostFunc, newPostFunc);

  // تحديث استدعاء postToFacebook في publishArticleToFacebook
  fbCode = fbCode.replace(
    'const id = await postToFacebook(header, pageId, token, partCount > 1, { i: i + 1, total: partCount });',
    'const imageUrl = `https://mohamidigital.online${getImageForSlug(slug)}`;\n      const id = await postToFacebook(header, pageId, token, partCount > 1, { i: i + 1, total: partCount }, url, imageUrl);'
  );

  fs.writeFileSync(FB_PUB, fbCode, 'utf8');
  console.log('✅ تم تحديث scripts/blog-publisher/facebook-publish.cjs لتمرير رابط الصورة البارزة لـ Facebook!');
}

// 3. تحديث كافة ملفات HTML المنشورة في public/blog لإضافة og:image
const htmlFiles = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');
let htmlUpdated = 0;

for (const file of htmlFiles) {
  const filePath = path.join(BLOG_DIR, file);
  let html = fs.readFileSync(filePath, 'utf8');
  if (!html.includes('og:image')) {
    const slug = file.replace('.html', '');
    const imgPath = getImageForSlug(slug);
    const ogTags = `<meta property="og:image" content="https://mohamidigital.online${imgPath}" />\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n  <meta property="og:site_name"`;
    html = html.replace('<meta property="og:site_name"', ogTags);
    fs.writeFileSync(filePath, html, 'utf8');
    htmlUpdated++;
  }
}

console.log(`✅ تم تحديث ${htmlUpdated} ملفات HTML بوسوم og:image!`);

// 4. البناء والنشر على Firebase
console.log('🔨 جاري إعادة البناء والتطبيق...');
execSync('npm run build', { cwd: BASE, stdio: 'inherit' });

console.log('🚀 جاري النشر على Firebase...');
execSync('npx -y firebase-tools deploy --only hosting', { cwd: BASE, stdio: 'inherit' });

console.log('🎉 اكتمل تفعيل معاينة الصور لجميع المنشورات!');
