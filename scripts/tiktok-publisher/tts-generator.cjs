#!/usr/bin/env node
/**
 * tts-generator.cjs — تحويل النص العربي لصوت (Edge TTS — مجاني)
 *
 * يستخدم 'node-edge-tts' للوصول لخدمة Microsoft Edge TTS.
 * يدعم أصوات عربية مصرية وسعودية. بدون API key.
 *
 * الاستخدام البرمجي:
 *   const { synthesize } = require('./tts-generator.cjs');
 *   const { audioPath, durationSec, subtitles } = await synthesize(
 *     'النص العربي هنا...',
 *     { voice: 'ar-EG-ShakirNeural', outputDir: '...' }
 *   );
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * @param {string} text — النص العربي
 * @param {object} opts
 *   - voice: اسم صوت Edge TTS (افتراضي: ar-EG-ShakirNeural)
 *   - outputDir: مجلد الإخراج
 *   - filename: اسم الملف (افتراضي: tts-{timestamp})
 *   - rate: سرعة الكلام (افتراضي: 'default')
 *   - pitch: طبقة الصوت (افتراضي: 'default')
 *   - volume: مستوى الصوت (افتراضي: 'default')
 * @returns {Promise<{ audioPath: string, durationSec: number, subtitles: array }>}
 */
async function synthesize(text, opts = {}) {
  const voice = opts.voice || process.env.EDGE_TTS_VOICE || 'ar-EG-ShakirNeural';
  const outputDir = opts.outputDir || path.join(__dirname, 'output', 'audio');
  const filename = opts.filename || `tts-${Date.now()}`;
  const rate = opts.rate || 'default';
  const pitch = opts.pitch || 'default';
  const volume = opts.volume || 'default';

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const audioPath = path.join(outputDir, `${filename}.mp3`);

  // تنظيف النص
  const cleanText = String(text)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/…/g, '...')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleanText) throw new Error('النص فارغ');
  console.log(`[tts] جاري توليد الصوت (${cleanText.length} حرف) بصوت ${voice}...`);

  // node-edge-tts
  let EdgeTTS;
  try {
    ({ EdgeTTS } = require('node-edge-tts'));
  } catch (e) {
    throw new Error(`فشل تحميل node-edge-tts: ${e.message}\nنفّذ: npm install node-edge-tts`);
  }

  // النصوص الطويلة تحتاج مهلة أكبر — قابلة للضبط عبر EDGE_TTS_TIMEOUT (بالثانية)
  const timeoutMs = (parseInt(process.env.EDGE_TTS_TIMEOUT, 10) || 120) * 1000;

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) console.log(`[tts] إعادة محاولة (${attempt}/2)...`);
    const tts = new EdgeTTS({
      voice,
      lang: voice.split('-').slice(0, 2).join('-'), // e.g. ar-EG
      rate,
      pitch,
      volume,
      saveSubtitles: true,
      timeout: timeoutMs,
    });
    try {
      await tts.ttsPromise(cleanText, audioPath);
      if (fs.existsSync(audioPath) && fs.statSync(audioPath).size >= 100) {
        lastErr = null;
        break;
      }
      lastErr = new Error('ملف الصوت لم يُنشأ أو حجمه صغير جداً.');
    } catch (e) {
      lastErr = e;
      // ملف جزئي من المحاولة الفاشلة
      try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch { /* تجاهل */ }
    }
  }
  if (lastErr) {
    throw new Error(`فشل توليد الصوت من Edge: ${lastErr.message}`);
  }

  // الترجمة (word timings) — اختيارية
  // ملاحظة: node-edge-tts يلحق .json بالاسم الكامل، فالملف يكون tts-XXX.mp3.json
  let subtitles = [];
  const subtitleFile = `${audioPath}.json`;
  if (fs.existsSync(subtitleFile)) {
    try { subtitles = JSON.parse(fs.readFileSync(subtitleFile, 'utf8')); }
    catch { /* ignore */ }
  }

  const durationSec = await getAudioDuration(audioPath);
  console.log(`[tts] ✓ تم: ${(fs.statSync(audioPath).size / 1024).toFixed(1)} KB — ${durationSec.toFixed(1)} ثانية`);

  return { audioPath, durationSec, subtitles };
}

async function getAudioDuration(audioPath) {
  // ffmpeg-static يأتي بـ ffmpeg.exe فقط (مفيش ffprobe). نستخدم ffmpeg -i لاستخراج المدة.
  const ffmpeg = loadFfmpegStatic();
  if (!ffmpeg) return 0;
  try {
    const out = execFileSync(ffmpeg, ['-i', audioPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const match = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (match) {
      const [, h, m, s] = match;
      return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
    }
  } catch (e) {
    // ffmpeg -i يكتب على stderr ورمز الخروج 1 — نمسك الخطأ ونقرأ stderr
    const stderr = e.stderr?.toString() || '';
    const match = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (match) {
      const [, h, m, s] = match;
      return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
    }
  }
  return 0;
}

function loadFfmpegStatic() {
  try {
    // eslint-disable-next-line global-require
    return require('ffmpeg-static');
  } catch {
    return null;
  }
}

if (require.main === module) {
  const text = process.argv[2];
  const voice = process.argv[3];
  if (!text) {
    console.log('استخدام: node tts-generator.cjs "النص العربي" [voice]');
    process.exit(1);
  }
  synthesize(text, { voice })
    .then(r => console.log('OK:', r))
    .catch(e => { console.error('❌', e.message); process.exit(1); });
}

module.exports = { synthesize };
