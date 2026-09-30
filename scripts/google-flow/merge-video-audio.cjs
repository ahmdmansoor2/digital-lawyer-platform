const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// مسار ffmpeg
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  ffmpegPath = 'ffmpeg';
}

const DOWNLOADS_DIR = 'C:\\Users\\احمد منصور\\Downloads';
const DESKTOP_DIR = 'C:\\Users\\احمد منصور\\Desktop';
const AUDIO_PATH = path.resolve(__dirname, 'voiceover-sample.mp3');
const OUTPUT_FILE = path.join(DESKTOP_DIR, 'فيديو_الإيجار_القديم_المحامي_الرقمي.mp4');

function findLatestVideo(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mov'))
    .map(f => ({
      name: f,
      fullPath: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0] : null;
}

async function merge() {
  console.log('🔍 جارٍ البحث عن الفيديو المُنزل حديثاً...');
  const latestVideo = findLatestVideo(DOWNLOADS_DIR);

  if (!latestVideo) {
    console.error('❌ لم يتم العثور على أي ملف فيديو في مجلد Downloads!');
    process.exit(1);
  }

  // التأكد من أن الملف نزل حديثاً (خلال آخر 15 دقيقة)
  const now = Date.now();
  const ageMinutes = (now - latestVideo.mtime) / (1000 * 60);
  console.log(`📹 أحدث فيديو وُجد: ${latestVideo.name} (منذ ${ageMinutes.toFixed(1)} دقيقة)`);

  if (!fs.existsSync(AUDIO_PATH)) {
    console.error('❌ ملف الصوت غير موجود:', AUDIO_PATH);
    process.exit(1);
  }

  console.log('🎬 جارٍ دمج الفيديو والصوت عبر FFmpeg...');

  // أمر FFmpeg:
  // -stream_loop -1 لتكرار الفيديو بنعومة إذا كانت مدة الصوت (14.4 ثانية) أطول من مدة لقطة Veo
  // -c:v libx264 -preset fast -pix_fmt yuv420p
  // -c:a aac -b:a 192k
  // -shortest لإنهاء الفيديو فور انتهاء الصوت
  const args = [
    '-y',
    '-stream_loop', '-1',
    '-i', latestVideo.fullPath,
    '-i', AUDIO_PATH,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-tune', 'stillimage',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    OUTPUT_FILE
  ];

  try {
    execFileSync(ffmpegPath, args, { stdio: 'inherit' });
    console.log('✅ تم دمج الفيديو والصوت بنجاح تام!');
    console.log('📍 مسار الفيديو النهائي على سطح المكتب:', OUTPUT_FILE);
  } catch (err) {
    console.error('❌ خطأ أثناء دمج الفيديو:', err.message);
  }
}

merge();
