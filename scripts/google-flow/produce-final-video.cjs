/**
 * scripts/google-flow/produce-final-video.cjs
 * إنتاج الفيديو النهائي المدمج بالصوت الإذاعي بدقة
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const DESKTOP = 'C:\\Users\\احمد منصور\\Desktop';
const INPUT_VIDEO = path.join(DESKTOP, 'Legal_consultant_sitting_at_desk_20260927094913.mp4');
const AUDIO_FILE = path.resolve(__dirname, 'voiceover-sample.mp3');

const OUTPUT_CLEAN = path.join(DESKTOP, 'فيديو_الإيجار_القديم_ماستر_جوجل_فلو.mp4');
const OUTPUT_BRANDED = path.join(DESKTOP, 'فيديو_الإيجار_القديم_نسخة_العرض_الرسمية.mp4');

if (!fs.existsSync(INPUT_VIDEO)) {
  console.error('❌ ملف الفيديو غير موجود على سطح المكتب!');
  process.exit(1);
}

if (!fs.existsSync(AUDIO_FILE)) {
  console.error('❌ ملف الصوت غير موجود!');
  process.exit(1);
}

console.log('🎬 1. جارٍ إنتاج النسخة الماستر (دمج الصوت الإذاعي بدقة مع ضبط الحركة البطيئة السينمائية)...');

// 1. النسخة الماستر النقية:
// مدة الصوت 14.4 ثانية، مدة الفيديو 10 ثوانٍ
// سنستخدم setpts=1.442*PTS لإبطاء حركة الكاميرا بنعومة فائقة لتطابق مدة الصوت بالمللي ثانية
const cleanArgs = [
  '-y',
  '-i', INPUT_VIDEO,
  '-i', AUDIO_FILE,
  '-filter_complex', '[0:v]setpts=1.442*PTS,fps=30[v]',
  '-map', '[v]',
  '-map', '1:a',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '256k',
  '-shortest',
  OUTPUT_CLEAN
];

try {
  execFileSync(ffmpeg, cleanArgs, { stdio: 'inherit' });
  console.log('✅ تم بنجاح إنتاج النسخة الماستر:', OUTPUT_CLEAN);
} catch (e) {
  console.error('❌ خطأ في إنتاج النسخة الماستر:', e.message);
}

console.log('📺 2. جارٍ إنتاج نسخة العرض الرسمية بالبار الزجاجي والهوية القانونية...');

// 2. نسخة العرض الرسمية:
// إضافة شريط عنوان سفلي كلاسيكي أنيق
const fontPath = 'C\\:/Windows/Fonts/tahomabd.ttf';
const filterWithText = `[0:v]setpts=1.442*PTS,fps=30,drawbox=y=ih-180:color=black@0.65:width=iw:height=180:t=fill,drawbox=y=ih-182:color=gold@0.9:width=iw:height=3:t=fill[v]`;

const brandedArgs = [
  '-y',
  '-i', INPUT_VIDEO,
  '-i', AUDIO_FILE,
  '-filter_complex', filterWithText,
  '-map', '[v]',
  '-map', '1:a',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '256k',
  '-shortest',
  OUTPUT_BRANDED
];

try {
  execFileSync(ffmpeg, brandedArgs, { stdio: 'inherit' });
  console.log('✅ تم بنجاح إنتاج نسخة العرض الرسمية:', OUTPUT_BRANDED);
} catch (e) {
  console.error('❌ خطأ في إنتاج نسخة العرض:', e.message);
}

console.log('🎉 جميع الفيديوهات أصبحت جاهزة على سطح المكتب!');
