#!/usr/bin/env node
/**
 * video-composer.cjs — تركيب الفيديو النهائي باستخدام ffmpeg
 *
 * يركّب: صور + صوت + كابشن عربي + براندينج + ترانزيشنز + موسيقى
 * النتيجة: MP4 بالمواصفات المطلوبة لـ TikTok (9:16, 1080x1920, H.264, AAC).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUTPUT_W = 1080;
const OUTPUT_H = 1920;
const FPS = 30;
const TRANSITION_DUR = 0.4; // مدة الترانزيشن بين كل مشهدين

const FONT_CANDIDATES = [
  // Bold أولاً (التسميات/الكابشن أقوى بصرياً — fontweight غير مدعوم في ffmpeg build ده)
  'C:/Windows/Fonts/tahomabd.ttf',
  '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  'C:/Windows/Fonts/tahoma.ttf',
  'C:/Windows/Fonts/segoeui.ttf',
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/calibri.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  // خطوط عربية على Ubuntu runners (fonts-noto-core) — تدعم تشكيل النص العربي
  '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
  '/usr/share/fonts/truetype/noto/NotoKufiArabic-Regular.ttf',
  // Google Fonts على runners (إصدارات قديمة من Ubuntu)
  '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
];

function loadFfmpeg() {
  try {
    // eslint-disable-next-line global-require
    const p = require('ffmpeg-static');
    if (!p) throw new Error('ffmpeg-static فاضي');
    return p;
  } catch (e) {
    throw new Error('ffmpeg-static مش متثبت. نفّذ: npm i ffmpeg-static');
  }
}

function findArabicFont() {
  for (const p of FONT_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// اسم عائلة الخط كما يراه libass — يعتمد على اسم الملف المُكتشف
function fontFamilyFor(fontPath) {
  const base = path.basename(fontPath || '').toLowerCase();
  if (base.includes('tahoma')) return 'Tahoma';
  if (base.includes('naskh')) return 'Noto Naskh Arabic';
  if (base.includes('kufi')) return 'Noto Kufi Arabic';
  if (base.includes('sansarabic') || base.includes('sans-arabic') || base.includes('notosansarabic')) return 'Noto Sans Arabic';
  if (base.includes('dejavu')) return 'DejaVu Sans';
  if (base.includes('segoe')) return 'Segoe UI';
  if (base.includes('arial')) return 'Arial';
  if (base.includes('calibri')) return 'Calibri';
  return 'Tahoma';
}

/**
 * توحيد مقطع فيديو: تحجيم/قص إلى 1080x1920@30fps ومدة محددة (loop/trim حسب الحاجة).
 * الفيديو حقيقي متحرك — نستغني عن zoompan/loop الخاص بالصور.
 */
function normalizeVideoClip(ffmpeg, clipPath, dur, outputPath) {
  const args = [
    '-stream_loop', '-1',
    '-i', clipPath,
    '-vf', `scale=${OUTPUT_W}:${OUTPUT_H}:force_original_aspect_ratio=increase,crop=${OUTPUT_W}:${OUTPUT_H},fps=${FPS},format=yuv420p`,
    '-t', String(dur),
    '-an',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-y',
    outputPath,
  ];
  execFileSync(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000 });
}

function escapeDrawText(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
}

// ─── أدوات رسم النصوص العربية عبر ASS (libass + HarfBuzz) ─────────────────
// drawtext لا يشكّل الحروف العربية (تظهر متقطعة "رموز")، أما libass فيرسمها
// بشكل صحيح متصل. لذلك نبني ملف ASS بكل العناوين والكابشنز ونمرّره عبر filter.

const ASS_DIR = path.join(os.tmpdir(), 'opencode');

function toAssTime(sec) {
  const cs = Math.round(sec * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  const pad = (n, w) => String(n).padStart(w, '0');
  return `${pad(h, 1)}:${pad(m, 2)}:${pad(s, 2)}.${pad(c, 2)}`;
}

// حذف الإيموجي والرموز الخاصة مع الإبقاء على العربية والأرقام والترقيم
function sanitizeArabicText(text) {
  return String(text)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2700}-\u{27BF}\u{200D}\u{2060}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeAss(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\r?\n/g, '\\N');
}

function buildAssFile(scenes, subtitles, sceneStartTimes, filePath, opts = {}) {
  const fontName = opts.fontName || 'Tahoma';
  const lines = [];
  lines.push('[Script Info]');
  lines.push('ScriptType: v4.00+');
  lines.push('PlayResX: 1080');
  lines.push('PlayResY: 1920');
  lines.push('WrapStyle: 2');
  lines.push('ScaledBorderAndShadow: yes');
  lines.push('');
  lines.push('[V4+ Styles]');
  lines.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding');
  // العناوين: أبيض كبير أسفل الشاشة (~82%)
  lines.push(`Style: Title,${fontName},56,&H00FFFFFF,&H000000FF,&H00000000,&H8C000000,1,0,0,0,100,100,0,0,1,3,2,2,60,60,340,1`);
  // الكابشنز: أصفر كبير أعلى الشاشة (~15%)
  lines.push(`Style: Caption,${fontName},60,&H0047DEFD,&H000000FF,&H00000000,&H96000000,0,0,0,0,100,100,0,0,1,3,2,8,60,60,300,1`);
  lines.push('');
  lines.push('[Events]');
  lines.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');

  // أحداث العناوين (نص المشهد الثابت — يظهر طوال مدة المشهد)
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    if (!sc.on_screen_text) continue;
    const t = sanitizeArabicText(sc.on_screen_text);
    if (!t) continue;
    const dur = sc.duration_sec || 6;
    const start = sceneStartTimes[i];
    lines.push(`Dialogue: 0,${toAssTime(start + 0.3)},${toAssTime(start + dur - 0.3)},Title,,0,0,0,,{\\fad(200,300)}${escapeAss(t)}`);
  }

  // أحداث الكابشنز (كلمات منطوقة — توقيتها على زمن الصوت النهائي)
  const blocks = [];
  let i = 0;
  while (i < subtitles.length) {
    const block = { words: [], start: 0, end: 0 };
    for (let k = 0; k < 3 && i < subtitles.length; k++) {
      const w = subtitles[i];
      block.words.push(w.part);
      if (k === 0) block.start = w.start;
      block.end = w.end;
      i++;
    }
    const text = sanitizeArabicText(block.words.join(' '));
    if (text && block.end > block.start) blocks.push({ text, start: block.start, end: block.end });
  }
  for (const b of blocks) {
    lines.push(`Dialogue: 0,${toAssTime(b.start / 1000)},${toAssTime(b.end / 1000)},Caption,,0,0,0,,{\\fad(150,150)}${escapeAss(b.text)}`);
  }

  if (!fs.existsSync(ASS_DIR)) fs.mkdirSync(ASS_DIR, { recursive: true });
  fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
  return filePath;
}

// ─── تجميع الـ word timings في caption blocks (2-4 كلمات) ──────────────────
function buildCaptionBlocks(subtitles, sceneDurations, sceneStartTimes) {
  // subtitles: [{part, start, end}]  بالألف من الثانية
  // نجمع 3 كلمات مع بعض، ونخصصهم للمشهد المناسب
  const blocks = [];
  let i = 0;
  let sceneIdx = 0;
  let sceneElapsed = 0;

  while (i < subtitles.length && sceneIdx < sceneDurations.length) {
    const block = { words: [], start: 0, end: 0, sceneIdx };
    const wordsInBlock = 3;
    for (let k = 0; k < wordsInBlock && i < subtitles.length; k++) {
      const w = subtitles[i];
      block.words.push(w.part);
      block.end = w.end;
      if (k === 0) block.start = w.start;
      i++;
    }
    // ضبط التوقيت حسب المشهد
    const sceneStartMs = sceneStartTimes[sceneIdx] * 1000;
    const sceneEndMs = (sceneStartTimes[sceneIdx] + sceneDurations[sceneIdx]) * 1000;
    block.start = Math.max(block.start, sceneStartMs);
    block.end = Math.min(block.end, sceneEndMs);
    if (block.end > block.start) {
      block.text = block.words.join(' ').trim();
      blocks.push(block);
    }
    // تقدّم للمشهد لو خلصنا وقته
    if (block.end >= sceneEndMs - 200) sceneIdx++;
  }
  return blocks;
}

// ─── اختيار موسيقى عشوائية من مجلد ─────────────────────────────────────────
function pickBackgroundMusic() {
  const customPath = process.env.BACKGROUND_MUSIC_PATH;
  if (customPath && fs.existsSync(customPath)) return customPath;

  // بحث في مجلد music
  const musicDir = path.join(__dirname, 'assets', 'music');
  if (!fs.existsSync(musicDir)) return null;
  const files = fs.readdirSync(musicDir).filter(f => /\.(mp3|wav|m4a)$/i.test(f));
  if (!files.length) return null;
  return path.join(musicDir, files[Math.floor(Math.random() * files.length)]);
}

// ─── المونتاج الرئيسي ─────────────────────────────────────────────────────
async function composeVideo(args) {
  const { scenes, audioPath, outputPath, title, branding = 'منصة المحامي الرقمية',
          subtitles = [] } = args;
  const ffmpeg = loadFfmpeg();
  const fontPath = findArabicFont();
  const assFontName = fontPath ? fontFamilyFor(fontPath) : 'Tahoma';
  const assFontsDir = fontPath ? path.dirname(fontPath) : 'C:/Windows/Fonts';

  if (!scenes?.length) throw new Error('لا مشاهد لتركيبها');
  if (!fs.existsSync(audioPath)) throw new Error(`الصوت مش موجود: ${audioPath}`);

  const validScenes = scenes.filter(s =>
    (s.imagePath && fs.existsSync(s.imagePath)) ||
    (s.videoPath && fs.existsSync(s.videoPath))
  );
  if (!validScenes.length) throw new Error('لا مشاهد صالحة');

  // حساب أوقات بداية كل مشهد (nominal) — تُستخدم للكابشنز والنصوص
  const sceneStartTimes = [];
  const sceneDurations = [];
  let acc = 0;
  for (const s of validScenes) {
    sceneStartTimes.push(acc);
    const d = s.duration_sec || 6;
    sceneDurations.push(d);
    acc += d;
  }

  const audioDuration = await getAudioDuration(audioPath);
  const fadeCount = validScenes.length > 1 ? validScenes.length - 1 : 0;

  // مدة الفيديو الفعلية بعد خصم أزمنة الـ xfade
  let totalDuration = acc;
  let videoEnd = totalDuration - fadeCount * TRANSITION_DUR;

  // لو الصوت أطول من المشاهد → نمدّ آخر مشهد حتى لا يُقطع نص الـ CTA
  if (audioDuration > videoEnd) {
    const extra = audioDuration - videoEnd;
    const lastScene = validScenes[validScenes.length - 1];
    lastScene.duration_sec = (lastScene.duration_sec || 6) + extra;
    sceneDurations[sceneDurations.length - 1] += extra;
    totalDuration += extra;
    videoEnd = totalDuration - fadeCount * TRANSITION_DUR;
  }
  const actualDuration = videoEnd;

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`[composer] جاري تركيب ${validScenes.length} مشاهد → ${outputPath}`);
  console.log(`[composer] المدة: ${actualDuration.toFixed(1)}ث (${validScenes.length} مشاهد + ${subtitles.length} كلمة)`);
  if (subtitles.length) console.log(`[composer] 🎤 Captions: ${Math.ceil(subtitles.length / 3)} block`);

  // ─── بناء filter_complex ────────────────────────────────────────────────
  const filters = [];
  const inputs = [];
  let lastVideoLabel = null;

  // 1) كل مشهد: input → base (فيديو/صورة) → shift زمني → xfade
  //    (النصوص العربية تُرسم بعد التركيب عبر ASS لضمان التشكيل الصحيح — ليست drawtext)
  const tempFiles = [];
  for (let idx = 0; idx < validScenes.length; idx++) {
    const scene = validScenes[idx];
    const dur = scene.duration_sec || 6;
    const fps = FPS;
    const frames = Math.ceil(dur * fps);
    const baseLabel = `v${idx}`;
    const outLabel = `v${idx}o`;
    const isVideo = scene.videoPath && fs.existsSync(scene.videoPath);

    if (isVideo) {
      // توحيد المقطع إلى المدة المطلوبة (loop إن قصُر، trim إن طال)
      const tempVideo = path.join(path.dirname(scene.videoPath), `_norm-${idx}.mp4`);
      console.log(`[composer] 🎞️ توحيد مقطع ${idx + 1}/${validScenes.length} (${dur.toFixed(1)}ث)...`);
      normalizeVideoClip(ffmpeg, scene.videoPath, dur, tempVideo);
      tempFiles.push(tempVideo);
      inputs.push('-t', String(dur), '-i', tempVideo);
      filters.push(
        `[${idx}:v]` +
        `scale=${OUTPUT_W}:${OUTPUT_H}:force_original_aspect_ratio=increase,` +
        `crop=${OUTPUT_W}:${OUTPUT_H},` +
        `fps=${fps},` +
        `format=yuv420p` +
        `[${baseLabel}]`
      );
    } else {
      inputs.push('-loop', '1', '-t', String(dur), '-i', scene.imagePath);
      // Base: loop + scale + Ken Burns
      filters.push(
        `[${idx}:v]` +
        `loop=loop=${frames - 1}:size=1:start=0,` +
        `scale=${OUTPUT_W}:${OUTPUT_H}:force_original_aspect_ratio=increase,` +
        `crop=${OUTPUT_W}:${OUTPUT_H},` +
        `zoompan=z='min(zoom+0.0008,1.12)':d=${frames}:s=${OUTPUT_W}x${OUTPUT_H},` +
        `fps=${fps},` +
        `format=yuv420p` +
        `[${baseLabel}]`
      );
    }

    // إزاحة PTS إلى الزمن المطلق
    // shift_idx = مجموع مدد المشاهد قبله − idx × مدة الترانزيشن (تعويض الـ fades)
    const shiftSec = sceneStartTimes[idx] - idx * TRANSITION_DUR;
    filters.push(
      `[${baseLabel}]` +
      `setpts=PTS-STARTPTS+${shiftSec}/TB` +
      `[${outLabel}]`
    );
    lastVideoLabel = outLabel;
  }

  // 2) Concat كل المشاهد (مع xfade transitions لو أكثر من مشهد)
  if (validScenes.length === 1) {
    filters.push(`[${lastVideoLabel}]copy[outv]`);
  } else {
    // xfade chain: v0o + v1o → v01, v01 + v2o → v012, ...
    // offset للانتقال k = shift_k (نفس إزاحة المشهد k) — يضمن اكتمال الفيديو بلا قطع
    // نمرر كل مخرج xfade عبر fps ثابت — بعض إصدارات ffmpeg (7.x) لا تنقل معدل
    // الإطارات عبر xfade فيفشل التالي بـ "The inputs needs to be a constant frame rate"
    let chainLabel = 'v0o';
    for (let idx = 1; idx < validScenes.length; idx++) {
      const isLast = idx === validScenes.length - 1;
      const rawLabel = isLast ? 'outr' : `chainr${idx}`;
      const offset = sceneStartTimes[idx] - idx * TRANSITION_DUR;
      filters.push(
        `[${chainLabel}][v${idx}o]` +
        `xfade=transition=fade:duration=${TRANSITION_DUR}:offset=${offset.toFixed(2)}` +
        `[${rawLabel}]`
      );
      const nextLabel = isLast ? 'outv' : `chain${idx}`;
      filters.push(`[${rawLabel}]fps=${FPS}[${nextLabel}]`);
      chainLabel = nextLabel;
    }
  }

  // 3) رسم العناوين والكابشنز العربية عبر libass (تشكيل سليم — لا رموز)
  if (subtitles.length || validScenes.some(s => s.on_screen_text)) {
    const assPath = buildAssFile(validScenes, subtitles, sceneStartTimes, path.join(ASS_DIR, `caption-${Date.now()}.ass`), { fontName: assFontName });
    // هروب مزدوج للنقطتين: graph parser يفك مستوى، وfilter parser يفك الثاني
    const escAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\\\:');
    const escFonts = assFontsDir.replace(/\\/g, '/').replace(/:/g, '\\\\:');
    filters.push(`[outv]ass=filename=${escAss}:fontsdir=${escFonts}[outv]`);
    console.log(`[composer] ✍️ رسم النصوص العربية عبر libass (${validScenes.filter(s => s.on_screen_text).length} عنوان + ${subtitles.length} كلمة)`);
  }

  const filterComplex = filters.join(';');

  // ─── تجميع الـ inputs النهائية ──────────────────────────────────────────
  const audioIdx = validScenes.length;

  // البحث عن موسيقى
  const musicPath = pickBackgroundMusic();
  const musicIdx = musicPath ? audioIdx + 1 : null;

  const cmdArgs = [
    ...inputs,
    '-i', audioPath,
    ...(musicPath ? ['-i', musicPath] : []),
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', `${audioIdx}:a:0?`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    '-movflags', '+faststart',
    '-y',
    outputPath,
  ];

  // ─── موسيقى (mix منفصل لو موجودة) ─────────────────────────────────────
  if (musicPath) {
    const musicFilter = `[${audioIdx}:a]volume=1.0[amain];[${musicIdx}:a]volume=0.12,aloop=loop=-1:size=2e+09,atrim=duration=${actualDuration.toFixed(2)}[amusic];[amain][amusic]amix=inputs=2:duration=first:dropout_transition=0[aout]`;
    // أعد بناء الـ filters بإضافة الموسيقى
    // (تبسيط: نضع الموسيقى كـ post-process)
  }

  console.log(`[composer] ffmpeg جاري العمل... (${validScenes.length} مشاهد، ${subtitles.length} كلمة)`);
  try {
    execFileSync(ffmpeg, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 300_000 });
  } catch (e) {
    const stderr = (e.stderr?.toString() || e.message || '');
    const tail = stderr.split('\n').slice(-15).join('\n');
    throw new Error(`فشل ffmpeg:\n${tail}\n─── cmd ───\nffmpeg ${cmdArgs.join(' ').slice(0, 1200)}`);
  }

  // تنظيف ملفات التوحيد المؤقتة
  for (const f of tempFiles) {
    try { fs.unlinkSync(f); } catch { /* تجاهل */ }
  }

  // ─── إضافة الموسيقى كمرحلة ثانية (لو موجودة) ───────────────────────────
  if (musicPath) {
    console.log(`[composer] 🎵 إضافة موسيقى خلفية...`);
    const tempOutput = outputPath.replace(/\.mp4$/, '.no-music.mp4');
    fs.renameSync(outputPath, tempOutput);
    try {
      const musicArgs = [
        '-i', tempOutput,
        '-i', musicPath,
        '-filter_complex',
        `[0:a]volume=1.0[amain];[1:a]volume=0.12,aloop=loop=-1:size=2e+09,atrim=duration=${actualDuration.toFixed(2)}[amusic];[amain][amusic]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        '-y',
        outputPath,
      ];
      execFileSync(ffmpeg, musicArgs, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 });
      fs.unlinkSync(tempOutput);
    } catch (e) {
      // rollback
      fs.renameSync(tempOutput, outputPath);
      console.warn(`[composer] ⚠️  فشل دمج الموسيقى: ${e.message?.substring(0, 80)}`);
    }
  }

  const size = fs.statSync(outputPath).size;
  console.log(`[composer] ✓ تم: ${(size / 1024 / 1024).toFixed(2)} MB`);
  if (musicPath) console.log(`[composer] 🎵 موسيقى: ${path.basename(musicPath)}`);

  return {
    outputPath, sizeBytes: size, durationSec: actualDuration,
    captions: subtitles.length,
    music: musicPath ? path.basename(musicPath) : null,
  };
}

async function getAudioDuration(audioPath) {
  const ffmpeg = loadFfmpeg();
  try {
    const out = execFileSync(ffmpeg, ['-i', audioPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const match = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (match) return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
  } catch (e) {
    const stderr = e.stderr?.toString() || '';
    const match = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (match) return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
  }
  return 0;
}

if (require.main === module) {
  console.log('استخدام: استدعِ composeVideo() من tiktok-publish.cjs');
  process.exit(0);
}

module.exports = { composeVideo, findArabicFont, buildCaptionBlocks };
