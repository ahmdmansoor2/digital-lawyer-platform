/**
 * scripts/google-flow/render-reels-9x16.cjs
 * تحويل الفيديو الأفقي إلى ريلز عمودي احترافي 9:16 (1080x1920)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const sharp = require('sharp');

const DESKTOP = 'C:\\Users\\احمد منصور\\Desktop';
const INPUT_VIDEO = path.join(DESKTOP, 'فيديو_الإيجار_القديم_ماستر_جوجل_فلو.mp4');
const OUTPUT_REELS = path.join(DESKTOP, 'ريلز_الإيجار_القديم_فيسبوك_ويوتيوب.mp4');
const OVERLAY_PNG = path.join(__dirname, 'reels-overlay.png');

async function createOverlay() {
  console.log('🎨 جارٍ تصميم البانرات والطبقات الرسومية للريلز...');
  
  const width = 1080;
  const height = 1920;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <!-- خلفية تدرجية علوية -->
    <defs>
      <linearGradient id="topGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0a1118" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#0a1118" stop-opacity="0.8"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d4af37"/>
        <stop offset="50%" stop-color="#fff2a8"/>
        <stop offset="100%" stop-color="#d4af37"/>
      </linearGradient>
      <linearGradient id="bottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0a1118" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#0a1118" stop-opacity="0.95"/>
      </linearGradient>
    </defs>

    <!-- البانر العلوي -->
    <rect x="0" y="0" width="${width}" height="420" fill="url(#topGrad)"/>
    <rect x="0" y="415" width="${width}" height="5" fill="url(#goldGrad)"/>

    <!-- وسام أحمر تحذيري -->
    <rect x="360" y="80" width="360" height="60" rx="30" fill="#b31b1b"/>
    <text x="540" y="122" font-family="Tahoma, Arial, sans-serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">
      ⚠️ حكم قضائي حاسم
    </text>

    <!-- العنوان الرئيسي العلوي -->
    <text x="540" y="220" font-family="Tahoma, Arial, sans-serif" font-size="52" font-weight="bold" fill="url(#goldGrad)" text-anchor="middle">
      قنبلة الإيجار القديم
    </text>
    <text x="540" y="300" font-family="Tahoma, Arial, sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle">
      متى يسقط العقد ويُطرد الورثة؟
    </text>
    <text x="540" y="365" font-family="Tahoma, Arial, sans-serif" font-size="28" fill="#a0aec0" text-anchor="middle">
      وفق أحدث مبادئ محكمة النقض 2026
    </text>

    <!-- البانر السفلي -->
    <rect x="0" y="1500" width="${width}" height="420" fill="url(#bottomGrad)"/>
    <rect x="0" y="1500" width="${width}" height="5" fill="url(#goldGrad)"/>

    <!-- نص التوعية السفلي -->
    <rect x="140" y="1560" width="800" height="90" rx="16" fill="rgba(212, 175, 55, 0.15)" stroke="#d4af37" stroke-width="2"/>
    <text x="540" y="1618" font-family="Tahoma, Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">
      الامتداد لمرة واحدة فقط.. وحظر تام للتوريث!
    </text>

    <!-- هوية المنصة -->
    <text x="540" y="1740" font-family="Tahoma, Arial, sans-serif" font-size="32" font-weight="bold" fill="url(#goldGrad)" text-anchor="middle">
      ⚖️ منصة المحامي الرقمية
    </text>
    <text x="540" y="1790" font-family="Tahoma, Arial, sans-serif" font-size="26" fill="#cbd5e0" text-anchor="middle">
      المستشار أحمد منصور • mohamidigital.online
    </text>
  </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(OVERLAY_PNG);

  console.log('✅ تم إنشاء البانر الشفاف بنجاح:', OVERLAY_PNG);
}

async function renderReels() {
  await createOverlay();

  console.log('🎬 جارٍ تركيب فيديو الريلز العمودي 9:16 (1080x1920)...');

  const filter = [
    '[0:v]split=2[bg_in][fg_in]',
    '[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=30,eq=brightness=-0.15:contrast=1.1[bg]',
    '[fg_in]scale=1080:608:force_original_aspect_ratio=decrease[fg]',
    '[bg][fg]overlay=0:656[base]',
    '[base][1:v]overlay=0:0[v]'
  ].join(';');

  const args = [
    '-y',
    '-i', INPUT_VIDEO,
    '-i', OVERLAY_PNG,
    '-filter_complex', filter,
    '-map', '[v]',
    '-map', '0:a',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-shortest',
    OUTPUT_REELS
  ];

  try {
    execFileSync(ffmpeg, args, { stdio: 'inherit' });
    console.log('🎉 تم بنجاح إنتاج فيديو الريلز العمودي:', OUTPUT_REELS);
  } catch (err) {
    console.error('❌ خطأ في تحويل الريلز:', err.message);
    process.exit(1);
  }
}

renderReels();
