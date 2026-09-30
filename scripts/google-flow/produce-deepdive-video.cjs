/**
 * scripts/google-flow/produce-deepdive-video.cjs
 * إنتاج فيديو قانوني مطول (~40 ثانية) متعدد المشاهد مع كابشن عربي متقدم
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const { synthesize } = require('../tiktok-publisher/tts-generator.cjs');

const DESKTOP = 'C:\\Users\\احمد منصور\\Desktop';
const OUTPUT_FINAL = path.join(DESKTOP, 'فيديو_الإيجار_القديم_المطول_المحامي_الرقمي.mp4');
const WORK_DIR = path.join(__dirname, 'long_video_work');

if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR, { recursive: true });

const APPROVED_ASSETS = path.join(ROOT, 'scripts', 'facebook-publisher', 'assets', 'approved-cards');

// المشاهد الخمسة المترابطة
const SCENES = [
  {
    id: 1,
    title: '⚠️ قنبلة الإيجار القديم',
    subtitle: '3 حالات حاسمة لسقوط العقد فوراً',
    text: 'كثير من الملاك والمستأجرين فاكرين إن عقد الإيجار القديم ملوش نهاية، لكن الحقيقة إن محكمة النقض حددت 3 حالات حاسمة يسقط فيها العقد ويحق للمالك استرداد شقته.',
    // نستخدم الفيديو الحقيقي المولد من Google Veo كخلفية للمشهد الافتتاحي!
    videoBg: path.join(DESKTOP, 'Legal_consultant_sitting_at_desk_20260927094913.mp4'),
    imageBg: null
  },
  {
    id: 2,
    title: '1️⃣ وفاة المستأجر الأصلي',
    subtitle: 'الامتداد لمرة واحدة فقط وبشروط صارمة',
    text: 'الحالة الأولى: وفاة المستأجر الأصلي دون وجود ورثة تنطبق عليهم شروط الإقامة المستقرة لسنة سابقة على الوفاة، فالامتداد يتم لمرة واحدة فقط.',
    videoBg: null,
    imageBg: path.join(APPROVED_ASSETS, 'style7_architectural_royal_deed.jpg')
  },
  {
    id: 3,
    title: '2️⃣ ترك العين أو إغلاقها',
    subtitle: 'الإقامة الفعلية شرط جوهري لاستمرار العقد',
    text: 'الحالة الثانية: ترك الشقة أو إغلاقها نهائياً والهجرة أو امتلاك سكن بديل، فالإقامة الفعلية المستقرة شرط جوهري ومحكمة النقض لا تعتد بالإغلاق.',
    videoBg: null,
    imageBg: path.join(APPROVED_ASSETS, 'style4_split_duality_matrix.jpg')
  },
  {
    id: 4,
    title: '3️⃣ تغيير النشاط أو التأجير من الباطن',
    subtitle: 'طرد فوري بحكم قضائي حاسم مع التعويض',
    text: 'الحالة الثالثة: تغيير النشاط أو التأجير من الباطن دون إذن كتابي صريح من المالك، وهنا يقضي القانون بالإخلاء الفوري مع التعويض.',
    videoBg: null,
    imageBg: path.join(APPROVED_ASSETS, 'style2_court_hero_bg.jpg')
  },
  {
    id: 5,
    title: '⚖️ استشر محاميك أولاً',
    subtitle: 'منصة المحامي الرقمية • المستشار أحمد منصور',
    text: 'احمِ حقوقك دائماً بالاستشارة القانونية الدقيقة. منصة المحامي الرقمية، مستشارك الذكي وموسوعة العدالة.',
    videoBg: null,
    imageBg: path.join(APPROVED_ASSETS, 'style7_real_estate_property.jpg')
  }
];

// دالة توليد بطاقة تراكب SVG شفافة لكل مشهد
async function createSceneOverlay(scene, outputPath) {
  const width = 1080;
  const height = 1920;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topG" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0a1118" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#0a1118" stop-opacity="0.7"/>
      </linearGradient>
      <linearGradient id="goldG" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d4af37"/>
        <stop offset="50%" stop-color="#fff2a8"/>
        <stop offset="100%" stop-color="#d4af37"/>
      </linearGradient>
      <linearGradient id="botG" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0a1118" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#0a1118" stop-opacity="0.95"/>
      </linearGradient>
    </defs>

    <!-- البانر العلوي -->
    <rect x="0" y="0" width="${width}" height="380" fill="url(#topG)"/>
    <rect x="0" y="375" width="${width}" height="5" fill="url(#goldG)"/>

    <text x="540" y="140" font-family="Tahoma, Arial, sans-serif" font-size="46" font-weight="bold" fill="url(#goldG)" text-anchor="middle">
      ${scene.title}
    </text>
    <text x="540" y="240" font-family="Tahoma, Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">
      ${scene.subtitle}
    </text>
    <text x="540" y="320" font-family="Tahoma, Arial, sans-serif" font-size="26" fill="#cbd5e0" text-anchor="middle">
      أحكام محكمة النقض المصرية 2026
    </text>

    <!-- البانر السفلي -->
    <rect x="0" y="1560" width="${width}" height="360" fill="url(#botG)"/>
    <rect x="0" y="1560" width="${width}" height="5" fill="url(#goldG)"/>

    <text x="540" y="1670" font-family="Tahoma, Arial, sans-serif" font-size="32" font-weight="bold" fill="url(#goldG)" text-anchor="middle">
      ⚖️ منصة المحامي الرقمية
    </text>
    <text x="540" y="1740" font-family="Tahoma, Arial, sans-serif" font-size="28" fill="#e2e8f0" text-anchor="middle">
      المستشار أحمد منصور • mohamidigital.online
    </text>
    <text x="540" y="1810" font-family="Tahoma, Arial, sans-serif" font-size="22" fill="#a0aec0" text-anchor="middle">
      احسب مستحقاتك القانونية بدقة وسرعة
    </text>
  </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

async function produceLongVideo() {
  console.log('🚀 [1/3] بدء هندسة الصوتيات للمشاهد الخمسة (بصوت المستشار شاكر المصري)...');
  
  for (const scene of SCENES) {
    const audioFilename = `scene_${scene.id}_audio`;
    console.log(`🎙️ توليد صوت المشهد ${scene.id}...`);
    const tts = await synthesize(scene.text, {
      voice: 'ar-EG-ShakirNeural',
      outputDir: WORK_DIR,
      filename: audioFilename
    });
    scene.audioFile = tts.audioPath;
    scene.duration = tts.durationSec + 0.3; // إضافة 0.3 ثانية راحة انسيابية
    console.log(`✓ المشهد ${scene.id}: المدة ${scene.duration.toFixed(1)} ثانية`);
  }

  console.log('\n🎨 [2/3] رندرة المشاهد السينمائية لقطة بلقطة (1080x1920)...');
  const renderedSegments = [];

  for (const scene of SCENES) {
    const overlayPng = path.join(WORK_DIR, `scene_${scene.id}_overlay.png`);
    await createSceneOverlay(scene, overlayPng);

    const segmentOut = path.join(WORK_DIR, `segment_${scene.id}.mp4`);
    console.log(`🎬 رندرة المقطع ${scene.id}/${SCENES.length}...`);

    let filter;
    let inputs;

    if (scene.videoBg && fs.existsSync(scene.videoBg)) {
      // المشهد الأول: استخدام فيديو Google Veo مع إبطاء انسيابي وتأثير الخلفية
      inputs = [
        '-stream_loop', '-1',
        '-i', scene.videoBg,
        '-i', overlayPng,
        '-i', scene.audioFile
      ];
      filter = [
        '[0:v]split=2[bg_in][fg_in]',
        '[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=30,eq=brightness=-0.15[bg]',
        '[fg_in]scale=1080:608:force_original_aspect_ratio=decrease[fg]',
        '[bg][fg]overlay=0:656[base]',
        '[base][1:v]overlay=0:0[v]'
      ].join(';');
    } else {
      // المشاهد التالية: استخدام الصور ثلاثية الأبعاد المعتمدة مع حركة Ken Burns البطيئة
      inputs = [
        '-loop', '1',
        '-i', scene.imageBg,
        '-i', overlayPng,
        '-i', scene.audioFile
      ];
      const frames = Math.round(scene.duration * 30);
      filter = [
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0006,1.08)':d=${frames}:s=1080x1920:fps=30[base]`,
        '[base][1:v]overlay=0:0[v]'
      ].join(';');
    }

    const args = [
      '-y',
      ...inputs,
      '-filter_complex', filter,
      '-map', '[v]',
      '-map', '2:a',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '19',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', scene.duration.toFixed(2),
      segmentOut
    ];

    execFileSync(ffmpeg, args, { stdio: 'pipe' });
    renderedSegments.push(segmentOut);
    console.log(`✓ اكتمل المقطع ${scene.id}`);
  }

  console.log('\n✂️ [3/3] دمج ومونتاج الفيلم الكامل...');
  const concatTxt = path.join(WORK_DIR, 'concat.txt');
  const fileLines = renderedSegments.map(s => `file '${s.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatTxt, fileLines, 'utf8');

  const concatArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatTxt,
    '-c', 'copy',
    OUTPUT_FINAL
  ];

  execFileSync(ffmpeg, concatArgs, { stdio: 'inherit' });

  const totalDuration = SCENES.reduce((acc, s) => acc + s.duration, 0);
  console.log(`\n🎉 تم بنجاح إنتاج الفيديو المطول بالكامل!`);
  console.log(`⏱️ إجمالي المدة: ${totalDuration.toFixed(1)} ثانية`);
  console.log(`📍 مكان الفيديو النهائي على سطح المكتب: ${OUTPUT_FINAL}`);
}

produceLongVideo().catch(err => {
  console.error('❌ خطأ في الإنتاج:', err);
  process.exit(1);
});
