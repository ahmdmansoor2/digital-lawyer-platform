/**
 * scripts/cinematic-dialogue-engine/dual-tts-mixer.cjs
 * نظام هندسة الأصوات الحوارية المتعددة (محامٍ وموكل)
 */

const fs = require('fs');
const path = require('path');
const { synthesize } = require('../tiktok-publisher/tts-generator.cjs');

async function synthesizeShotAudio(shot, outputAudioPath, opts = {}) {
  const isLawyer = shot.voice_role === 'lawyer';
  
  // Lawyer: Deep, authoritative, calm
  // Client: Faster, slightly higher pitch, anxious/conversational
  const voiceConfig = isLawyer 
    ? { voice: 'ar-EG-ShakirNeural', pitch: '-2Hz', rate: '-4%' }
    : { voice: opts.femaleClient ? 'ar-EG-SalmaNeural' : 'ar-SA-HamedNeural', pitch: '+4Hz', rate: '+8%' };

  const text = shot.arabic_text;
  const outputDir = path.dirname(outputAudioPath);
  const filename = path.basename(outputAudioPath, '.mp3');

  try {
    const res = await synthesize(text, {
      voice: voiceConfig.voice,
      pitch: voiceConfig.pitch,
      rate: voiceConfig.rate,
      outputDir,
      filename
    });

    return {
      audioPath: res.audioPath,
      durationSec: res.durationSec,
      voice: voiceConfig.voice
    };
  } catch (err) {
    console.error(`❌ خطأ في توليد صوت اللقطة ${shot.shot_id}:`, err.message);
    throw err;
  }
}

async function synthesizeAllShots(shots, outputDir, opts = {}) {
  const enrichedShots = [];
  fs.mkdirSync(outputDir, { recursive: true });

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const shotAudioFile = path.join(outputDir, `shot_${shot.shot_id}_audio.mp3`);
    console.log(`🎙️ [${i + 1}/${shots.length}] توليد صوت ${shot.character_name}: "${shot.arabic_text.substring(0, 40)}..."`);
    
    const audioRes = await synthesizeShotAudio(shot, shotAudioFile, opts);
    enrichedShots.push({
      ...shot,
      audioPath: audioRes.audioPath,
      durationSec: audioRes.durationSec,
      voiceUsed: audioRes.voice
    });
  }

  return enrichedShots;
}

module.exports = { synthesizeAllShots };
