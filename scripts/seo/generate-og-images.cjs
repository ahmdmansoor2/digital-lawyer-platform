const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join('public', 'images');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

async function createOgImage({ filename, title, subtitle, badges, footer }) {
  const width = 1200;
  const height = 630;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16" />
        <stop offset="50%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#fbbf24" />
      </linearGradient>
      <linearGradient id="cyan" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#06b6d4" />
        <stop offset="100%" stop-color="#3b82f6" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="30" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bg)" />

    <!-- Ambient Glows -->
    <circle cx="200" cy="150" r="180" fill="#4f46e5" opacity="0.25" filter="url(#glow)" />
    <circle cx="1050" cy="500" r="220" fill="#059669" opacity="0.2" filter="url(#glow)" />
    <circle cx="600" cy="300" r="150" fill="#f59e0b" opacity="0.1" filter="url(#glow)" />

    <!-- Border Glow -->
    <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="rgba(99,102,241,0.3)" stroke-width="2" />
    <rect x="28" y="28" width="1144" height="574" rx="24" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />

    <!-- Top Badge -->
    <g transform="translate(600, 110)">
      <rect x="-220" y="-22" width="440" height="44" rx="22" fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.5)" stroke-width="1.5" />
      <text x="0" y="7" font-family="Cairo, sans-serif" font-size="20" font-weight="800" fill="#c7d2fe" text-anchor="middle">
        ⚖️ منصة المحامي الرقمية · صرح العدالة الأول بمصر
      </text>
    </g>

    <!-- Main Title -->
    <text x="600" y="220" font-family="Cairo, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle">
      ${title}
    </text>

    <!-- Subtitle -->
    <text x="600" y="280" font-family="Cairo, sans-serif" font-size="24" font-weight="700" fill="#94a3b8" text-anchor="middle">
      ${subtitle}
    </text>

    <!-- Badges Row -->
    <g transform="translate(600, 370)">
      <rect x="-480" y="-35" width="960" height="70" rx="20" fill="rgba(30,41,59,0.7)" stroke="rgba(148,163,184,0.2)" stroke-width="1" />
      <text x="0" y="10" font-family="Cairo, sans-serif" font-size="22" font-weight="800" fill="#fde047" text-anchor="middle">
        ${badges}
      </text>
    </g>

    <!-- Highlights Features -->
    <g transform="translate(600, 480)">
      <text x="0" y="0" font-family="Cairo, sans-serif" font-size="20" font-weight="700" fill="#38bdf8" text-anchor="middle">
        ⚡ حسابات دقيقة وفق القوانين المصرية 2026 · متوافق مع الموبايل · مجاناً 100%
      </text>
    </g>

    <!-- Footer Bar -->
    <g transform="translate(600, 545)">
      <line x1="-500" y1="-20" x2="500" y2="-20" stroke="rgba(148,163,184,0.15)" stroke-width="1" />
      <text x="0" y="10" font-family="Cairo, sans-serif" font-size="18" font-weight="700" fill="#64748b" text-anchor="middle">
        🌐 mohamidigital.online · إشراف المستشار أحمد منصور محامٍ بالنقض
      </text>
    </g>
  </svg>
  `;

  const outputPath = path.join(IMAGES_DIR, filename);
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 92 })
    .toFile(outputPath);
  console.log(`✓ Generated ${outputPath} (${width}x${height})`);
}

async function main() {
  // 1. Legal Calculators OG Image
  await createOgImage({
    filename: 'og-legal-calculators.jpg',
    title: 'بوابة الحاسبات القانونية والشرعية الذكية 2026',
    subtitle: '15 حاسبة تفاعلية متكاملة للمحامين والمواطنين في مصر',
    badges: '🕌 المواريث والتركات · 👨‍👩‍👧 النفقات · 🏠 الشهر العقاري · ⚖️ مواعيد الطعون · 💼 نهاية الخدمة'
  });

  // 2. Contract Generator OG Image
  await createOgImage({
    filename: 'og-contract-generator.jpg',
    title: 'المولّد الذكي للعقود والدعاوى والتوكيلات الرسمية',
    subtitle: 'أضخم منظومة قانونية لتوليد وصياغة الصيغ القضائية والعقود بمصر',
    badges: '📝 +2,750 صيغة جاهزة · 🏛️ عرائض دعاوى · 📜 توكيلات رسمية · 🖨️ طباعة وملء فوري'
  });

  // 3. Lawyers Directory OG Image
  await createOgImage({
    filename: 'og-lawyers-directory.jpg',
    title: 'دليل المحامين المشتغلين المعتمد في مصر 2026',
    subtitle: 'ابحث عن أفضل محامٍ معتمد ومقيد بالنقض في كافة المحافظات المصرية',
    badges: '⚖️ جنائي · 🏢 شركات واستثمار · 👨‍👩‍👧 أسرة وأحوال شخصية · 🏛️ مجلس دولة · 🏘️ عقارات'
  });

  // 4. Blog Main OG Image
  await createOgImage({
    filename: 'og-blog-main.jpg',
    title: 'المدونة القانونية الرسمية — منصة المحامي الرقمية',
    subtitle: 'مرجع الثقافة والتشريع القضائي الأول للمحامي والمواطن المصري',
    badges: '📚 شروح تشريعية · ⚖️ أحدث مبادئ محكمة النقض · 💡 حلول النزاعات العملية 2026'
  });
}

main().catch(console.error);
