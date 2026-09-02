const fs = require('fs');
const path = require('path');

function updateOrInsertMeta(html, propertyOrName, value, isProperty = true) {
  const attr = isProperty ? 'property' : 'name';
  const regex = new RegExp(`<meta\\s+${attr}=["']${propertyOrName}["'][^>]*>`, 'i');
  const newTag = `  <meta ${attr}="${propertyOrName}" content="${value}" />`;

  if (regex.test(html)) {
    return html.replace(regex, newTag);
  } else {
    // Insert after canonical or viewport
    if (html.includes('<link rel="canonical"')) {
      return html.replace('<link rel="canonical"', newTag + '\n  <link rel="canonical"');
    }
    return html.replace('<head>', '<head>\n' + newTag);
  }
}

// 1. Legal Calculators Hub
let calcPath = path.join('public', 'legal-calculators.html');
let calc = fs.readFileSync(calcPath, 'utf8');
calc = updateOrInsertMeta(calc, 'og:title', '🧮 15 حاسبة قانونية وشرعية تفاعلية 2026 | منصة المحامي الرقمية', true);
calc = updateOrInsertMeta(calc, 'og:description', 'احسب فوراً على هاتفك: المواريث والتركات، النفقات الشرعية، رسوم الشهر العقاري، مواعيد وسقوط الطعون، ومكافأة نهاية الخدمة وفق أحدث القوانين المصرية 2026 مجاناً 100%.', true);
calc = updateOrInsertMeta(calc, 'og:image', 'https://mohamidigital.online/images/og-legal-calculators.jpg', true);
calc = updateOrInsertMeta(calc, 'og:image:width', '1200', true);
calc = updateOrInsertMeta(calc, 'og:image:height', '630', true);
calc = updateOrInsertMeta(calc, 'og:image:type', 'image/jpeg', true);
calc = updateOrInsertMeta(calc, 'twitter:card', 'summary_large_image', false);
calc = updateOrInsertMeta(calc, 'twitter:title', '🧮 15 حاسبة قانونية وشرعية تفاعلية 2026', false);
calc = updateOrInsertMeta(calc, 'twitter:description', 'احسب فوراً: المواريث، النفقات، رسوم الشهر العقاري، مواعيد الطعون، ومكافأة نهاية الخدمة.', false);
calc = updateOrInsertMeta(calc, 'twitter:image', 'https://mohamidigital.online/images/og-legal-calculators.jpg', false);
fs.writeFileSync(calcPath, calc, 'utf8');
console.log('✓ Updated public/legal-calculators.html Open Graph tags');

// 2. Contract Generator Hub
let contractPath = path.join('public', 'contract-generator.html');
let contract = fs.readFileSync(contractPath, 'utf8');
contract = updateOrInsertMeta(contract, 'og:title', '📝 المولّد الذكي للعقود والدعاوى والتوكيلات الرسمية 2026 | منصة المحامي الرقمية', true);
contract = updateOrInsertMeta(contract, 'og:description', 'صياغة وتوليد +2,750 صيغة عقد، توكيل رسمي، وعريضة دعوى قضائية بالملء الآلي والطباعة المباشرة مجاناً 100%.', true);
contract = updateOrInsertMeta(contract, 'og:image', 'https://mohamidigital.online/images/og-contract-generator.jpg', true);
contract = updateOrInsertMeta(contract, 'og:image:width', '1200', true);
contract = updateOrInsertMeta(contract, 'og:image:height', '630', true);
contract = updateOrInsertMeta(contract, 'og:image:type', 'image/jpeg', true);
contract = updateOrInsertMeta(contract, 'twitter:card', 'summary_large_image', false);
contract = updateOrInsertMeta(contract, 'twitter:title', '📝 المولّد الذكي للعقود والدعاوى والتوكيلات 2026', false);
contract = updateOrInsertMeta(contract, 'twitter:image', 'https://mohamidigital.online/images/og-contract-generator.jpg', false);
fs.writeFileSync(contractPath, contract, 'utf8');
console.log('✓ Updated public/contract-generator.html Open Graph tags');

// 3. Lawyers Directory Hub
let lawyersPath = path.join('public', 'lawyers-directory.html');
let lawyers = fs.readFileSync(lawyersPath, 'utf8');
lawyers = updateOrInsertMeta(lawyers, 'og:title', '⚖️ دليل المحامين المشتغلين المعتمد في مصر 2026 | منصة المحامي الرقمية', true);
lawyers = updateOrInsertMeta(lawyers, 'og:description', 'ابحث عن أفضل محامٍ معتمد ومقيد بالنقض في محافظتك حسب التخصص وتواصل مباشرة عبر الهاتف والواتساب مجاناً.', true);
lawyers = updateOrInsertMeta(lawyers, 'og:image', 'https://mohamidigital.online/images/og-lawyers-directory.jpg', true);
lawyers = updateOrInsertMeta(lawyers, 'og:image:width', '1200', true);
lawyers = updateOrInsertMeta(lawyers, 'og:image:height', '630', true);
lawyers = updateOrInsertMeta(lawyers, 'og:image:type', 'image/jpeg', true);
lawyers = updateOrInsertMeta(lawyers, 'twitter:card', 'summary_large_image', false);
lawyers = updateOrInsertMeta(lawyers, 'twitter:title', '⚖️ دليل المحامين المشتغلين المعتمد في مصر 2026', false);
lawyers = updateOrInsertMeta(lawyers, 'twitter:image', 'https://mohamidigital.online/images/og-lawyers-directory.jpg', false);
fs.writeFileSync(lawyersPath, lawyers, 'utf8');
console.log('✓ Updated public/lawyers-directory.html Open Graph tags');

// 4. Blog Index
let blogIndexPath = path.join('public', 'blog', 'index.html');
let blogIndex = fs.readFileSync(blogIndexPath, 'utf8');
blogIndex = updateOrInsertMeta(blogIndex, 'og:title', '📰 المدونة القانونية الرسمية — منصة المحامي الرقمية', true);
blogIndex = updateOrInsertMeta(blogIndex, 'og:description', 'مقالات ودراسات قانونية معمقة في القوانين المصرية، أحدث أحكام محكمة النقض، وصيغ الدعاوى والعقود تحت إشراف المستشار أحمد منصور.', true);
blogIndex = updateOrInsertMeta(blogIndex, 'og:image', 'https://mohamidigital.online/images/og-blog-main.jpg', true);
blogIndex = updateOrInsertMeta(blogIndex, 'og:image:width', '1200', true);
blogIndex = updateOrInsertMeta(blogIndex, 'og:image:height', '630', true);
blogIndex = updateOrInsertMeta(blogIndex, 'twitter:card', 'summary_large_image', false);
blogIndex = updateOrInsertMeta(blogIndex, 'twitter:image', 'https://mohamidigital.online/images/og-blog-main.jpg', false);
fs.writeFileSync(blogIndexPath, blogIndex, 'utf8');
console.log('✓ Updated public/blog/index.html Open Graph tags');

// 5. All Blog Articles
const blogDir = path.join('public', 'blog');
const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.html') && f !== 'index.html');
let updatedArticles = 0;

for (let file of blogFiles) {
  const filePath = path.join(blogDir, file);
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Ensure og:image
  let currentOgImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (!currentOgImage) {
    const slug = file.replace('.html', '');
    const candidateJpg = `https://mohamidigital.online/blog/images/${slug}.jpg`;
    html = updateOrInsertMeta(html, 'og:image', candidateJpg, true);
    changed = true;
  }

  // Ensure twitter:card
  if (!html.includes('twitter:card')) {
    html = updateOrInsertMeta(html, 'twitter:card', 'summary_large_image', false);
    changed = true;
  }

  // Ensure twitter:image
  if (!html.includes('twitter:image')) {
    const imgM = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (imgM) {
      html = updateOrInsertMeta(html, 'twitter:image', imgM[1], false);
      changed = true;
    }
  }

  // Ensure og:image:width and og:image:height
  if (!html.includes('og:image:width')) {
    html = updateOrInsertMeta(html, 'og:image:width', '1200', true);
    html = updateOrInsertMeta(html, 'og:image:height', '630', true);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, html, 'utf8');
    updatedArticles++;
  }
}

console.log(`✓ Audited and updated ${updatedArticles} blog articles with Twitter cards and 1200x630 dimensions!`);
