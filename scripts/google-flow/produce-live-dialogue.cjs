/**
 * scripts/google-flow/produce-live-dialogue.cjs
 * إنتاج المشهد التمثيلي الحي الواقعي الكامل (حوار الموكل والمحامي)
 * معتمد 100% على فيديوهات Google Veo الحية
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { synthesize } = require('../tiktok-publisher/tts-generator.cjs');

const DESKTOP = 'C:\\Users\\احمد منصور\\Desktop';
const CLIENT_VIDEO = path.join(DESKTOP, 'Client_consulting_lawyer_in_office_20260927101846.mp4');
const LAWYER_VIDEO = path.join(DESKTOP, 'Legal_consultant_sitting_at_desk_20260927094913.mp4');

const OUTPUT_DRAMA_WIDE = path.join(DESKTOP, 'مشهد_استشارة_المحامي_الواقعي_16x9.mp4');
const OUTPUT_DRAMA_REEL = path.join(DESKTOP, 'مشهد_استشارة_المحامي_الواقعي_ريلز_9x16.mp4');

const WORK_DIR = path.join(__dirname, 'dialogue_work');
if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR, { recursive: true });

async function produceLiveDialogue() {
  console.log('🎬 ========================================================');
  console.log('🏛️  إنتاج المشهد التمثيلي الحي الواقعي للاستشارة القانونية');
  console.log('🎬 ========================================================');

  // 1. هندسة الأصوات الحوارية
  console.log('\n🎙️ [1/3] تسجيل أصوات الحوار الدرامي المتبادل...');

  // صوت الموكل الشاب القلق
  const clientText = 'يا أستاذ، صاحب العمارة باعتلي إنذار بالطرد عشان والدي اتوفى.. أعمل إيه في الورطة دي؟';
  console.log('🎙️ تسجيل صوت الموكل...');
  const clientAudio = await synthesize(clientText, {
    voice: 'ar-SA-HamedNeural',
    outputDir: WORK_DIR,
    filename: 'client_voice'
  });

  // صوت المستشار المصري الوقور الهادئ (الجزء الأول: التطمين وحكم النقض)
  const lawyerText1 = 'اهدا خالص يا فندم.. طالما كنت مقيم مع والدك سنة قبل الوفاة، فالامتداد حق ليك لمرة واحدة بحكم النقض، وميقدرش يطردك.';
  console.log('🎙️ تسجيل صوت المستشار (الجزء الأول)...');
  const lawyerAudio1 = await synthesize(lawyerText1, {
    voice: 'ar-EG-ShakirNeural',
    outputDir: WORK_DIR,
    filename: 'lawyer_voice_1'
  });

  // صوت المستشار (الجزء الثاني: النصيحة والإجراء العملي)
  const lawyerText2 = 'كل المطلوب منك إنك تثبت إقامتك المستقرة ببطاقتك وفواتير المرافق، وساعتها أي دعوى طرد هتترفض بقوة القانون.';
  console.log('🎙️ تسجيل صوت المستشار (الجزء الثاني)...');
  const lawyerAudio2 = await synthesize(lawyerText2, {
    voice: 'ar-EG-ShakirNeural',
    outputDir: WORK_DIR,
    filename: 'lawyer_voice_2'
  });

  // دمج صوتي الموكل والمحامي في المقطع الأول
  // المشهد الأول: الموكل يتكلم (4.5 ث) ثم المحامي يرد (5.5 ث) ليطابق مدة الفيديو (10 ثوانٍ)
  console.log('\n🎛️ [2/3] مزج الأصوات المتبادلة للمشهد التمثيلي الأول...');
  const scene1Audio = path.join(WORK_DIR, 'scene1_combined_audio.mp3');
  const concatAudioArgs = [
    '-y',
    '-i', clientAudio.audioPath,
    '-i', lawyerAudio1.audioPath,
    '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[a]',
    '-map', '[a]',
    scene1Audio
  ];
  execFileSync(ffmpeg, concatAudioArgs, { stdio: 'pipe' });

  // 2. رندرة المشهد الأول (فيديو الاستشارة المولد من Google Flow)
  console.log('\n🎥 رندرة المشهد الأول (الموكل والمستشار في المكتب)...');
  const scene1Out = path.join(WORK_DIR, 'scene1_rendered.mp4');

  // كتابة شريط تعريفي قضائي ناعم وشفاف
  const filterScene1 = `scale=1280:720,drawbox=y=ih-110:color=black@0.65:width=iw:height=110:t=fill,drawbox=y=ih-112:color=gold@0.8:width=iw:height=2:t=fill`;
  
  execFileSync(ffmpeg, [
    '-y',
    '-i', CLIENT_VIDEO,
    '-i', scene1Audio,
    '-filter_complex', `[0:v]${filterScene1}[v]`,
    '-map', '[v]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    scene1Out
  ], { stdio: 'pipe' });

  // 3. رندرة المشهد الثاني (المستشار القانوني يوضح النصيحة الحاسمة)
  console.log('🎥 رندرة المشهد الثاني (المستشار يختم بالنصيحة الإجرائية)...');
  const scene2Out = path.join(WORK_DIR, 'scene2_rendered.mp4');
  const filterScene2 = `scale=1280:720,drawbox=y=ih-110:color=black@0.65:width=iw:height=110:t=fill,drawbox=y=ih-112:color=gold@0.8:width=iw:height=2:t=fill`;

  execFileSync(ffmpeg, [
    '-y',
    '-i', LAWYER_VIDEO,
    '-i', lawyerAudio2.audioPath,
    '-filter_complex', `[0:v]${filterScene2}[v]`,
    '-map', '[v]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    scene2Out
  ], { stdio: 'pipe' });

  // 4. دمج المشهدين معاً لإنتاج فيلم تمثيلي حي متكامل (~20 ثانية)
  console.log('\n✂️ [3/3] مونتاج وتجميع المشهدين الحيّين معاً...');
  const listFile = path.join(WORK_DIR, 'concat_list.txt');
  fs.writeFileSync(listFile, `file '${scene1Out.replace(/\\/g, '/')}'\nfile '${scene2Out.replace(/\\/g, '/')}'`, 'utf8');

  execFileSync(ffmpeg, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c', 'copy',
    OUTPUT_DRAMA_WIDE
  ], { stdio: 'pipe' });

  console.log('✅ تم بنجاح إنتاج النسخة الأفقية العريضة (16:9):', OUTPUT_DRAMA_WIDE);

  // 5. إنتاج نسخة ريلز عمودية 9:16 بنفس اللقطات الحية
  console.log('📱 إنتاج نسخة الريلز العمودية (9:16) بالخلفية الضبابية السينمائية...');
  const reelFilter = [
    '[0:v]split=2[bg_in][fg_in]',
    '[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=30,eq=brightness=-0.2[bg]',
    '[fg_in]scale=1080:608:force_original_aspect_ratio=decrease[fg]',
    '[bg][fg]overlay=0:656[v]'
  ].join(';');

  execFileSync(ffmpeg, [
    '-y',
    '-i', OUTPUT_DRAMA_WIDE,
    '-filter_complex', reelFilter,
    '-map', '[v]',
    '-map', '0:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '19',
    '-c:a', 'copy',
    OUTPUT_DRAMA_REEL
  ], { stdio: 'pipe' });

  console.log('✅ تم بنجاح إنتاج نسخة الريلز (9:16):', OUTPUT_DRAMA_REEL);
  console.log('\n🎉 اكتمل إنتاج العمل التمثيلي الحي بالكامل على سطح المكتب!');
}

produceLiveDialogue().catch(e => {
  console.error('❌ خطأ:', e.message);
  process.exit(1);
});
