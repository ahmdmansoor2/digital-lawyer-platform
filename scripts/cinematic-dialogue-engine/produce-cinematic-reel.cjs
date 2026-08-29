/**
 * scripts/cinematic-dialogue-engine/produce-cinematic-reel.cjs
 * المنتج الرئيسي لسلسلة "حوار في مكتب المحامي" السينمائية الواقعية
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const { generateCinematicDialogue } = require('./dialogue-generator.cjs');
const { synthesizeAllShots } = require('./dual-tts-mixer.cjs');
const { composeVideo } = require('../tiktok-publisher/video-composer.cjs');

// Generate or fetch character/scene visual
async function generateShotVisual(shot, outputPath) {
  let prompt = shot.visual_prompt || 'luxury modern law office in Cairo, cinematic warm lighting, 8k photorealistic';
  const cleanPrompt = encodeURIComponent(prompt.substring(0, 300));
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1080&height=1920&nologo=true&seed=${seed}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 15000) {
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      }
    }
  } catch (e) {
    console.warn(`⚠️ فشل جلب صورة اللقطة عبر AI: ${e.message}`);
  }

  // Fallback
  const pexelsStock = path.join(__dirname, '..', 'facebook-publisher', 'output', 'stock_bg.jpg');
  if (fs.existsSync(pexelsStock)) {
    fs.copyFileSync(pexelsStock, outputPath);
    return outputPath;
  }
  return outputPath;
}

async function main() {
  console.log('🎬 ========================================================');
  console.log('🏛️  استوديو الإنتاج السينمائي — سلسلة حوار في مكتب المحامي');
  console.log('🎬 ========================================================');

  const workDir = path.join(__dirname, 'output', 'temp_shots');
  const outputDir = path.join(__dirname, 'output');
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const targetTopic = {
    title: "خطورة إيصال الأمانة على بياض وكيف تثبت براءتك أمام المحكمة",
    category: "قانون جنائي وعقوبات"
  };

  console.log(`📝 [1/4] توليد السيناريو السينمائي (5 لقطات): "${targetTopic.title}"...`);
  const dialoguePlan = await generateCinematicDialogue(targetTopic);
  console.log(`✅ تم اعتماد السيناريو — الهوك: "${dialoguePlan.hook}"`);

  console.log('\n🎙️ [2/4] هندسة الأصوات الحوارية (صوت المحامي الوقور + صوت الموكل)...');
  const enrichedShots = await synthesizeAllShots(dialoguePlan.shots, workDir);
  console.log(`✅ تم توليد كافة المسارات الصوتية بنجاح (${enrichedShots.length} لقطات).`);

  console.log('\n🎞️ [3/4] دمج الصوت الكامل وتجهيز اللقطات البصرية...');
  // Concatenate all shot audios into master audio
  const audioListFile = path.join(workDir, 'audio_list.txt');
  const audioListContent = enrichedShots.map(s => `file '${s.audioPath.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(audioListFile, audioListContent, 'utf8');

  const masterAudioFile = path.join(workDir, 'master_dialogue_audio.mp3');
  const concatAudioArgs = ['-y', '-f', 'concat', '-safe', '0', '-i', audioListFile, '-c', 'copy', masterAudioFile];
  execFileSync(ffmpegPath, concatAudioArgs, { stdio: 'pipe' });

  // Prepare scenes for composeVideo
  const scenes = [];
  for (let i = 0; i < enrichedShots.length; i++) {
    const shot = enrichedShots[i];
    const shotImg = path.join(workDir, `shot_${shot.shot_id}_visual.png`);
    console.log(`🎨 تجهيز كادر اللقطة ${shot.shot_id}/5 (${shot.character_name})...`);
    await generateShotVisual(shot, shotImg);

    const charPrefix = shot.character === 'lawyer' ? '⚖️ المستشار: ' : '👤 الموكل: ';
    scenes.push({
      id: shot.shot_id,
      imagePath: shotImg,
      duration_sec: shot.durationSec + 0.3,
      on_screen_text: charPrefix + shot.on_screen_text,
      narration: shot.arabic_text
    });
  }

  console.log('\n✂️ [4/4] إنتاج ومونتاج الفيديو النهائي مع الكابشنز والمؤثرات...');
  const finalOutputFile = path.join(outputDir, 'cinematic_dialogue_episode_1.mp4');
  
  await composeVideo({
    scenes,
    audioPath: masterAudioFile,
    outputPath: finalOutputFile,
    title: targetTopic.title,
    branding: 'منصة المحامي الرقمية ⚖️'
  });

  console.log(`\n🎉 تم إنتاج الحلقة الحوارية الأولى بنجاح فائق!`);
  console.log(`📁 مسار الفيديو: ${finalOutputFile}`);

  // Copy directly to Desktop
  const desktopDest = 'C:\\Users\\احمد منصور\\Desktop\\حوار_مكتب_المحامي_الحلقة_1.mp4';
  try {
    fs.copyFileSync(finalOutputFile, desktopDest);
    console.log(`🖥️ تم نقل نسخة مباشرة إلى سطح المكتب: ${desktopDest}`);
  } catch (e) {
    console.warn('⚠️ تعذر النسخ لسطح المكتب:', e.message);
  }
}

main().catch(err => {
  console.error('❌ خطأ في الإنتاج السينمائي:', err);
  process.exit(1);
});
