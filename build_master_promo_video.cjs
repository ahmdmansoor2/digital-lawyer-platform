const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const audioPath = path.join(__dirname, 'public/media/promo_voiceover.mp3');
const outputVideoPath = path.join(__dirname, 'public/media/promo_video.mp4');

// Scenes featuring the dignified lawyer presenter speaking & explaining
const scenes = [
  { img: 'presenter_talk.jpg', duration: 12 },
  { img: 'scene_chaos.jpg', duration: 8 },
  { img: 'presenter_explain.jpg', duration: 14 },
  { img: 'scene_digital.jpg', duration: 24 },
  { img: 'presenter_talk.jpg', duration: 28 },
  { img: 'scene_court_walk.jpg', duration: 18 },
  { img: 'presenter_explain.jpg', duration: 24 }
];

async function generatePromoVideo() {
  console.log('🎬 Starting Presenter MP4 Video Compilation using FFmpeg...');
  console.log('FFmpeg binary:', ffmpegPath);

  const promoImagesDir = path.join(__dirname, 'public/images/promo');
  const tempConcatList = path.join(__dirname, 'temp_video_concat.txt');

  let concatContent = '';
  scenes.forEach(s => {
    const fullImgPath = path.join(promoImagesDir, s.img).replace(/\\/g, '/');
    concatContent += `file '${fullImgPath}'\nduration ${s.duration}\n`;
  });
  const lastImg = path.join(promoImagesDir, scenes[scenes.length - 1].img).replace(/\\/g, '/');
  concatContent += `file '${lastImg}'\n`;

  fs.writeFileSync(tempConcatList, concatContent, 'utf8');

  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', tempConcatList,
    '-i', audioPath,
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '19',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    outputVideoPath
  ];

  console.log('Running FFmpeg with Lawyer Presenter...');
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, args, (err, stdout, stderr) => {
      if (fs.existsSync(tempConcatList)) fs.unlinkSync(tempConcatList);
      if (err) {
        console.error('FFmpeg error:', stderr);
        return reject(err);
      }
      console.log('✅ Presenter Video created successfully:', outputVideoPath);
      const stat = fs.statSync(outputVideoPath);
      console.log(`Video size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
      resolve(outputVideoPath);
    });
  });
}

generatePromoVideo().catch(err => {
  console.error('Failed to compile presenter video:', err);
  process.exit(1);
});
