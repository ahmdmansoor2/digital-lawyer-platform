const fs = require('fs');
const path = require('path');

// Voiceover text from Master Video Prompt
const FULL_VOICEOVER_TEXT = `القضية ليست فقط في المحكمة.
فوراء كل قضية... هناك مواعيد، ومستندات، وموكلون، وتفاصيل لا تنتهي.
لكن، ماذا لو أصبحت كل هذه التفاصيل، في مكان واحد؟

منصة المحامي الرقمية تساعدك على تنظيم قضاياك وموكليك، من التسجيل والمتابعة، إلى الأرشفة وحفظ المستندات وسجل العمل.

وجدول جلسات تفاعلي، يساعدك على متابعة مواعيدك وتنبيهاتك، وطباعة كشوف الجلسات الأسبوعية والشهرية.

وتتابع أوراق المحضرين وإعلانات الجلسات وإجراءات التنفيذ، بخطوات واضحة ومنظمة.

وأدوات قانونية عملية تساعدك على توفير الوقت، من حاسبة رسوم المحاكم المصرية، إلى حاسبة المواريث.

وعندما تحتاج إلى المرجع القانوني، ستجد مكتبة قانونية متخصصة في التشريعات والمراجع المصرية، في مساحة رقمية واحدة.

وتصل إلى عشرات النماذج القانونية، من العقود والدعاوى والمذكرات، مع إمكانية تخصيصها وفق احتياجاتك.

والمنصة لا تتوقف عند جهاز واحد، يمكنك الوصول إلى عملك من المتصفح، وعبر أجهزتك المختلفة.

وتستطيع العمل حتى دون اتصال بالإنترنت، مع حفظ البيانات محلياً، وأدوات للتصدير والاستعادة.

بدلاً من عشرات الملفات، وعدة أدوات منفصلة، اجمع عملك القانوني، في مساحة واحدة.

لأن المحامي يحتاج إلى التقنية التي تخدم عمله، لا التقنية التي تزيد تعقيده.

ولهذا، منصة المحامي الرقمية متاحة حالياً مجاناً بالكامل.

منصة المحامي الرقمية... نظّم مكتبك، وفّر وقتك، واجعل التكنولوجيا تعمل لصالحك.
منصة المحامي الرقمية... مكتبك القانوني، أصبح رقمياً. ابدأ الآن.`;

async function main() {
  console.log('🎙️ Generating Master Promo Voiceover Audio...');
  const ttsModule = require(path.join(__dirname, 'scripts/tiktok-publisher/tts-generator.cjs'));
  
  const publicMediaDir = path.join(__dirname, 'public/media');
  if (!fs.existsSync(publicMediaDir)) fs.mkdirSync(publicMediaDir, { recursive: true });

  const result = await ttsModule.synthesize(FULL_VOICEOVER_TEXT, {
    voice: 'ar-EG-ShakirNeural',
    outputDir: publicMediaDir,
    filename: 'promo_voiceover',
    rate: '-2%',
    pitch: '-1Hz'
  });

  console.log('✅ Master Voiceover Generated Successfully:');
  console.log('Audio file:', result.audioPath);
  console.log('Duration (seconds):', result.durationSec);
  console.log('Subtitles count:', (result.subtitles || []).length);
}

main().catch(err => {
  console.error('❌ Error generating voiceover:', err);
  process.exit(1);
});
