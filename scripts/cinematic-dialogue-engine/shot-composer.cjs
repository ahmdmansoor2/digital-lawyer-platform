/**
 * scripts/cinematic-dialogue-engine/shot-composer.cjs
 * مركب اللقطات السينمائية للحوار الواقعي (محامٍ وموكل)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// Fetch high-fidelity character/scene visual via Pollinations AI or local assets
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
        return true;
      }
    }
  } catch (e) {
    console.warn(`⚠️ فشل جلب صورة اللقطة عبر AI: ${e.message}`);
  }

  // Fallback to high-res Pexels background
  const pexelsStock = path.join(__dirname, '..', 'facebook-publisher', 'output', 'stock_bg.jpg');
  if (fs.existsSync(pexelsStock)) {
    fs.copyFileSync(pexelsStock, outputPath);
    return true;
  }

  return false;
}

// Escape text for ASS subtitles
function escapeAss(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/"/g, '');
}

function buildAssSubtitle(shot, durationSec) {
  const charLabel = shot.character === 'lawyer' ? '⚖️ المستشار القانوني' : '👤 الموكل';
  const headerColor = shot.character === 'lawyer' ? '&H00E0B020' : '&H00FFFFFF'; // Golden for lawyer, white for client
  const bannerText = escapeAss(shot.on_screen_text || '');
  const dialogueText = escapeAss(shot.arabic_text || '');

  return `[Script Info]
Title: Cinematic Legal Dialogue
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CharacterTag,Cairo,46,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,3,4,4,8,40,40,240,1
Style: BannerTitle,Cairo,58,&H0020E0FF,&H000000FF,&H00000000,&HA0000000,-1,0,0,0,100,100,0,0,3,4,4,8,40,40,320,1
Style: DialogueBox,Cairo,52,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,-1,0,0,0,100,100,0,0,3,5,6,2,60,60,260,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:0${Math.floor(durationSec / 60)}:${(durationSec % 60).toFixed(2).padStart(5, '0')},CharacterTag,,0,0,0,,{\\c${headerColor}}${charLabel}
Dialogue: 0,0:00:00.00,0:0${Math.floor(durationSec / 60)}:${(durationSec % 60).toFixed(2).padStart(5, '0')},BannerTitle,,0,0,0,,${bannerText}
Dialogue: 0,0:00:00.00,0:0${Math.floor(durationSec / 60)}:${(durationSec % 60).toFixed(2).padStart(5, '0')},DialogueBox,,0,0,0,,${dialogueText}
`;
}

async function renderSingleShotVideo(shot, outputVideoPath, workDir) {
  const shotImg = path.join(workDir, `shot_${shot.shot_id}_visual.png`);
  await generateShotVisual(shot, shotImg);

  const durationSec = shot.durationSec + 0.8; // Small breath gap
  const assFilename = `shot_${shot.shot_id}_subs.ass`;
  const assPath = path.join(workDir, assFilename);
  fs.writeFileSync(assPath, buildAssSubtitle(shot, durationSec), 'utf8');

  // Slow subtle cinematic zoom in/out
  const zoomDirection = shot.shot_id % 2 === 0 ? 'in' : 'out';
  const zoomFilter = zoomDirection === 'in'
    ? `zoompan=z='min(zoom+0.0015,1.25)':d=${Math.round(durationSec * 30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`
    : `zoompan=z='max(1.2-0.0015*on,1.0)':d=${Math.round(durationSec * 30)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`;

  const complexFilter = `[0:v]${zoomFilter},format=yuv420p,subtitles=${assFilename}[v]`;

  const args = [
    '-y',
    '-loop', '1',
    '-i', `shot_${shot.shot_id}_visual.png`,
    '-i', `shot_${shot.shot_id}_audio.mp3`,
    '-filter_complex', complexFilter,
    '-map', '[v]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', durationSec.toFixed(2),
    outputVideoPath
  ];

  execFileSync(ffmpegPath, args, { cwd: workDir, stdio: 'pipe' });
  return outputVideoPath;
}

module.exports = { renderSingleShotVideo };
