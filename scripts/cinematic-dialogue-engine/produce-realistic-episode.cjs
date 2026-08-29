/**
 * scripts/cinematic-dialogue-engine/produce-realistic-episode.cjs
 * محرك إنتاج الفيديو الحواري الواقعي لقطة بلقطة (مشهد تمثيلي كامل)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { synthesize } = require('../tiktok-publisher/tts-generator.cjs');

// السيناريو الحرفي المحدد بدقة
const SCENARIO_SHOTS = [
  {
    id: 1,
    type: 'master',
    character: 'both',
    name: 'المشهد الافتتاحي',
    voice: null,
    text: '',
    onScreen: 'مكتب محاماة بالقاهرة — استشارة قانونية عاجلة',
    visualPrompt: 'cinematic establishing shot of a modern luxury law office in Cairo, 42-year-old Egyptian male lawyer in dark suit sitting behind mahogany desk, 35-year-old client sitting opposite holding documents, warm ambient lighting, 8k realistic tv drama',
    durationSec: 4.0
  },
  {
    id: 2,
    type: 'client_close',
    character: 'client',
    name: 'الموكل',
    voice: 'ar-SA-HamedNeural', // نبرة صوت الموكل المتسائل
    text: 'يا أستاذ، أنا استلمت إنذار من المحكمة ومش عارف أعمل إيه.',
    onScreen: 'الموكل: استلمت إنذار من المحكمة ومش عارف أعمل إيه',
    visualPrompt: 'close up shot of a 35-year-old Egyptian man in a clean shirt looking worried and speaking to his lawyer, natural facial expression, cinematic shallow depth of field, law office background',
    durationSec: 0
  },
  {
    id: 3,
    type: 'lawyer_close',
    character: 'lawyer',
    name: 'المحامي',
    voice: 'ar-EG-ShakirNeural', // صوت المحامي المصري الوقور
    text: 'مبدئياً متقلقش، لكن لازم نعرف الأول مضمون الإنذار وميعاد استلامه.',
    onScreen: 'المستشار: مبدئياً متقلقش.. لازم نعرف مضمون الإنذار وميعاد استلامه',
    visualPrompt: 'cinematic close up shot of a 42-year-old distinguished Egyptian male lawyer in dark navy suit, speaking calmly and reassuringly, professional law firm atmosphere, warm office lighting',
    durationSec: 0
  },
  {
    id: 4,
    type: 'client_action',
    character: 'client',
    name: 'الموكل',
    voice: 'ar-SA-HamedNeural',
    text: 'أنا استلمته من يومين، وجبت معايا صورة منه.',
    onScreen: 'الموكل: استلمته من يومين وجبت معايا صورة منه',
    visualPrompt: 'medium shot of Egyptian client taking legal court document from folder and placing it on mahogany desk, hands visible, natural lighting, realistic drama scene',
    durationSec: 0
  },
  {
    id: 5,
    type: 'lawyer_action',
    character: 'lawyer',
    name: 'المحامي',
    voice: 'ar-EG-ShakirNeural',
    text: 'ممتاز. خليني أشوفه، وبعدها نحدد موقفك القانوني والإجراء المناسب.',
    onScreen: 'المستشار: خليني أشوفه ونحدد موقفك القانوني والإجراء المناسب',
    visualPrompt: 'close up shot of Egyptian lawyer taking court notice paper and carefully reading it, focused professional expression, luxury office interior',
    durationSec: 0
  },
  {
    id: 6,
    type: 'client_close',
    character: 'client',
    name: 'الموكل',
    voice: 'ar-SA-HamedNeural',
    text: 'يعني ممكن الموضوع يتحل من غير ما نوصل للمحكمة؟',
    onScreen: 'الموكل: ممكن الموضوع يتحل من غير ما نوصل للمحكمة؟',
    visualPrompt: 'close up of Egyptian client leaning forward asking hopeful question, genuine facial expression, cinematic lighting',
    durationSec: 0
  },
  {
    id: 7,
    type: 'lawyer_close',
    character: 'lawyer',
    name: 'المحامي',
    voice: 'ar-EG-ShakirNeural',
    text: 'ده يعتمد على تفاصيل الموضوع والمستندات. بعد ما أراجع الأوراق أقدر أوضح لك الخيارات المتاحة.',
    onScreen: 'المستشار: ده يعتمد على تفاصيل الموضوع ومراجعة الأوراق',
    visualPrompt: 'cinematic medium shot of Egyptian lawyer in suit explaining clearly with natural hand gestures, authoritative confident smile, law books in background',
    durationSec: 0
  },
  {
    id: 8,
    type: 'outro',
    character: 'both',
    name: 'الخاتمة',
    voice: 'ar-EG-ShakirNeural',
    text: 'اعرف حقك القانوني واحمِ نفسك دائماً. منصة المحامي الرقمية.',
    onScreen: '⚖️ منصة المحامي الرقمية — استشارات قانونية متخصصة',
    visualPrompt: 'cinematic wide shot of Egyptian lawyer shaking hands with client in luxury law office, warm daylight from window, premium tv series cinematography',
    durationSec: 0
  }
];

// دالة توليد الصورة بجودة واقعية جداً عبر Pollinations
async function fetchPhotorealisticShot(prompt, outputPath, seedOffset = 0) {
  const enhancedPrompt = `${prompt}, photorealistic, 8k resolution, cinematic lighting, sharp focus, natural skin texture, masterpiece film still`;
  const cleanUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1080&height=1920&nologo=true&seed=${1000 + seedOffset}`;

  try {
    const res = await fetch(cleanUrl, { signal: AbortSignal.timeout(45000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 20000) {
        fs.writeFileSync(outputPath, buf);
        return true;
      }
    }
  } catch (e) {
    console.warn(`⚠️ تعذر جلب الصورة ${seedOffset}:`, e.message);
  }

  // fallback image
  return false;
}

// دالة كتابة ملف ترجمة ASS احترافي لكل لقطة
function writeShotSubtitle(shot, durationSec, assPath) {
  const isLawyer = shot.character === 'lawyer';
  const tagText = isLawyer ? '⚖️ الأستاذ (المستشار القانوني)' : (shot.character === 'client' ? '👤 الموكل' : '🏛️ استشارة قانونية');
  const tagColor = isLawyer ? '&H0020E0FF' : '&H00FFFFFF';
  const text = shot.onScreen || shot.text;

  const content = `[Script Info]
Title: Realistic Dialogue Shot ${shot.id}
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: SpeakerTag,Cairo,44,${tagColor},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,3,4,4,8,50,50,220,1
Style: SubtitleText,Cairo,54,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,3,5,6,2,60,60,260,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:0${Math.floor(durationSec / 60)}:${(durationSec % 60).toFixed(2).padStart(5, '0')},SpeakerTag,,0,0,0,,${tagText}
Dialogue: 0,0:00:00.00,0:0${Math.floor(durationSec / 60)}:${(durationSec % 60).toFixed(2).padStart(5, '0')},SubtitleText,,0,0,0,,${text}
`;

  fs.writeFileSync(assPath, content, 'utf8');
}

async function produceRealisticEpisode() {
  console.log('🎬 ========================================================');
  console.log('🏛️  استوديو الدراما القانونية — إنتاج المشهد التمثيلي الواقعي');
  console.log('🎬 ========================================================');

  const workDir = path.join(__dirname, 'output', 'realistic_shots');
  const outputDir = path.join(__dirname, 'output');
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  // 1. توليد الصوتيات بدقة
  console.log('\n🎙️ [1/3] هندسة الأصوات الحوارية الواقعية لكل شخصية...');
  for (let i = 0; i < SCENARIO_SHOTS.length; i++) {
    const shot = SCENARIO_SHOTS[i];
    const audioPath = path.join(workDir, `shot_${shot.id}_audio.mp3`);

    if (shot.text && shot.voice) {
      console.log(`🎙️ توليد صوت [${shot.name}]: "${shot.text}"`);
      const ttsRes = await synthesize(shot.text, {
        voice: shot.voice,
        outputDir: workDir,
        filename: `shot_${shot.id}_audio`
      });
      shot.audioFile = ttsRes.audioPath;
      shot.durationSec = ttsRes.durationSec + 0.4;
    } else {
      // مشهد بدون كلام (صمت / موسيقى)
      const silencePath = path.join(workDir, `shot_${shot.id}_silence.mp3`);
      const silenceArgs = ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', String(shot.durationSec), silencePath];
      execFileSync(ffmpegPath, silenceArgs, { stdio: 'pipe' });
      shot.audioFile = silencePath;
    }
  }

  // 2. توليد الصور المرجعية والرندرة السينمائية لقطة بلقطة
  console.log('\n🎥 [2/3] رندرة اللقطات السينمائية المتبادلة (Shot-Reverse-Shot)...');
  const renderedVideos = [];

  for (let i = 0; i < SCENARIO_SHOTS.length; i++) {
    const shot = SCENARIO_SHOTS[i];
    const shotImg = path.join(workDir, `shot_${shot.id}_img.png`);
    const shotSubAss = path.join(workDir, `shot_${shot.id}_sub.ass`);
    const shotOutMp4 = path.join(workDir, `rendered_shot_${shot.id}.mp4`);

    console.log(`🖼️ توليد كادر اللقطة ${shot.id}/${SCENARIO_SHOTS.length}: [${shot.name}]...`);
    await fetchPhotorealisticShot(shot.visualPrompt, shotImg, shot.id * 17);

    // كتابة الترجمة
    writeShotSubtitle(shot, shot.durationSec, shotSubAss);

    // حركة كاميرا ديناميكية متبادلة (Slow Pan / Subtle Zoom)
    const zoomExp = shot.id % 2 === 0 
      ? `zoompan=z='min(zoom+0.0006,1.08)':d=${Math.round(shot.durationSec * 30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`
      : `zoompan=z='max(1.08-0.0006*on,1.0)':d=${Math.round(shot.durationSec * 30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`;

    const complexFilter = `[0:v]${zoomExp},format=yuv420p,subtitles=shot_${shot.id}_sub.ass[v]`;

    const args = [
      '-y',
      '-loop', '1',
      '-i', `shot_${shot.id}_img.png`,
      '-i', path.basename(shot.audioFile),
      '-filter_complex', complexFilter,
      '-map', '[v]',
      '-map', '1:a',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '19',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', shot.durationSec.toFixed(2),
      shotOutMp4
    ];

    console.log(`🎬 رندرة اللقطة ${shot.id} (المدة: ${shot.durationSec.toFixed(1)}ث)...`);
    execFileSync(ffmpegPath, args, { cwd: workDir, stdio: 'pipe' });
    renderedVideos.push(shotOutMp4);
  }

  // 3. المونتاج ودمج المشاهد بالكامل
  console.log('\n✂️ [3/3] تجميع الفيلم الحواري النهائي...');
  const concatList = path.join(workDir, 'final_concat.txt');
  const concatData = renderedVideos.map(v => `file '${v.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatList, concatData, 'utf8');

  const finalVideo = path.join(outputDir, 'realistic_lawyer_scene_final.mp4');
  const concatArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatList,
    '-c', 'copy',
    finalVideo
  ];
  execFileSync(ffmpegPath, concatArgs, { stdio: 'pipe' });

  console.log(`\n🌟 تم إنتاج المشهد التمثيلي الواقعي بنجاح تام!`);
  console.log(`📁 مسار الفيديو النهائي: ${finalVideo}`);

  // نسخ مباشر إلى سطح المكتب
  const desktopFile = 'C:\\Users\\احمد منصور\\Desktop\\مشهد_مكتب_المحامي_الواقعي.mp4';
  try {
    fs.copyFileSync(finalVideo, desktopFile);
    console.log(`🖥️ تم نقل النسخة النهائية إلى سطح المكتب: ${desktopFile}`);
  } catch (e) {
    console.warn('⚠️ تعذر النسخ لسطح المكتب:', e.message);
  }
}

produceRealisticEpisode().catch(err => {
  console.error('❌ خطأ في إنتاج المشهد الواقعي:', err);
  process.exit(1);
});
