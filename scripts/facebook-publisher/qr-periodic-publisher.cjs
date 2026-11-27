#!/usr/bin/env node
/**
 * qr-periodic-publisher.cjs
 * الناشر الدوري الذكي لباركود بوابة رول الجلسات وباركود منصة المحامي الرقمية
 * على صفحة فيسبوك (العدالة القانونية) وقناة تيليجرام.
 *
 * الاستخدام:
 *   node scripts/facebook-publisher/qr-periodic-publisher.cjs --type=rolls
 *   node scripts/facebook-publisher/qr-periodic-publisher.cjs --type=site
 *   node scripts/facebook-publisher/qr-periodic-publisher.cjs --auto
 *   node scripts/facebook-publisher/qr-periodic-publisher.cjs --auto --dry-run
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
try {
  require('dotenv').config({ path: path.join(ROOT, '.env') });
} catch (_) {
  // In GitHub Actions, env vars come directly from secrets
}

const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TG_PUBLIC_CHANNEL = process.env.TELEGRAM_PUBLIC_CHANNEL_ID || '@MohamiDigital';

const ASSETS_DIR = path.join(__dirname, 'assets', 'qr');
const ROLLS_QR_PATH = path.join(ASSETS_DIR, 'qr-courts-rolls.png');
const SITE_QR_PATH = path.join(ASSETS_DIR, 'qr-mohami-site.png');

const ROLLS_CAPTIONS = [
  [
    '📱 قبل نزولك المحكمة الصبح.. كل رول جلسات مصر في جيبك! ⚖️',
    '',
    'وجّه كاميرا هاتفك نحو الباركود للدخول مباشرة إلى البوابة الوطنية الموحدة لرول وأجندة جلسات محاكم ونيابات مصر (241 محكمة وبوابة):',
    '✅ روابط مباشرة لمجلدات Google Drive وقنوات Telegram الرسمية.',
    '✅ صفر إعلانات وصفر صفحات وسيطة.',
    '✅ تغطية كاملة لـ 27 محافظة مصرية.',
    '',
    '🔗 الرابط المباشر:',
    'https://mohamidigital.online/courts-session-rolls.html',
    '',
    '#المحامي_الرقمي #رول_الجلسات #محاكم_مصر #العدالة_القانونية #محامين_مصر'
  ].join('\n'),

  [
    '👨‍👩‍👧‍👦 تبحث عن أجندة جلسات محاكم ونيابات الأسرة؟ ⚖️',
    '',
    'بمسحة واحدة للباركود، ادخل فوراً إلى أكثر من 92 محكمة ونيابة أسرة مصنفة ومفهرسة بالمحافظة والمركز (القاهرة، الجيزة، الإسكندرية، المحافظات):',
    '✅ أجندات جلسات الأسرة على تليجرام وجوجل درايف مباشرة.',
    '✅ البحث اللحظي باسم المحكمة أو النيابة في ثوانٍ.',
    '',
    '🔗 افتح قسم محاكم الأسرة مباشرة:',
    'https://mohamidigital.online/courts-session-rolls.html',
    '',
    '#محاكم_الأسرة #أجندة_الجلسات #رول_الجلسات #المحامي_الرقمي #العدالة_القانونية'
  ].join('\n'),

  [
    '🏛️ تغطية شاملة لمحاكم القاهرة والجيزة والإسكندرية والأقاليم! ⚖️',
    '',
    'وفر وقتك أمام لوحات الإعلانات؛ امسح باركود بوابة رول الجلسات للوصول الفوري إلى:',
    '🔹 دوائر الجنح والجنح المستأنفة والمدني والجنايات.',
    '🔹 محاكم الدلتا والصعيد والقناة والمحافظات الحدودية (27 محافظة).',
    '🔹 روابط مباشرة سريعة تعمل من أي هاتف محمول.',
    '',
    '🔗 تصفح البوابة الآن:',
    'https://mohamidigital.online/courts-session-rolls.html',
    '',
    '#محاكم_مصر #رول_الجلسات #باركود_المحاكم #المحامي_الرقمي #العدالة_القانونية'
  ].join('\n'),

  [
    '⚡ جديد: البوابات السيادية الرسمية لرول الجلسات في مكان واحد! ⚖️',
    '',
    'امسح الباركود أو اضغط على الرابط للوصول الموحد إلى:',
    '🔹 بوابة وزارة العدل (الاستعلام الموحد لجميع درجات المحاكم).',
    '🔹 محكمة النقض المصرية.',
    '🔹 مجلس الدولة (القضاء الإداري والإدارية العليا والتأديبية).',
    '🔹 المحاكم الاقتصادية والنيابة العامة.',
    '',
    '🔗 ادخل الآن مجاناً:',
    'https://mohamidigital.online/courts-session-rolls.html',
    '',
    '#مجلس_الدولة #محكمة_النقض #وزارة_العدل #المحامي_الرقمي #العدالة_القانونية'
  ].join('\n'),

  [
    '📷 معك صورة باركود لجلسة على فيسبوك أو واتساب ومش عارف تفتحها؟ 💡',
    '',
    'داخل «بوابة رول الجلسات» أداة ذكية مدمجة لفك شفرة صور الباركود مباشرة من الهاتف أو الكمبيوتر بدون تطبيقات خارجية!',
    'ارفع لقطة الشاشة وسينقلك النظام فوراً إلى رول المحكمة المختصة.',
    '',
    '🔗 جرب ماسح الباركود والبوابة الآن (241 محكمة وبوابة):',
    'https://mohamidigital.online/courts-session-rolls.html',
    '',
    '#ماسح_الباركود #رول_الجلسات #المحامي_الرقمي #محامين_مصر #العدالة_القانونية'
  ].join('\n'),

  [
    '📂 وداعاً للروابط المزعجة والإعلانات عند البحث عن رول جلستك! ⚖️',
    '',
    'منصة المحامي الرقمية تجمع لك 241 رابطاً مباشراً لرول وأجندة جلسات محاكم مصر عبر Google Drive وTelegram مباشرةً دون أي وسطاء.',
    'احتفظ بهذا الباركود في مفضلتك أو امسحه بكاميرا الهاتف الآن:',
    '',
    '🔗 https://mohamidigital.online/courts-session-rolls.html',
    '',
    '#المحامي_الرقمي #رول_الجلسات #أجندة_المحاكم #العدالة_القانونية'
  ].join('\n'),
];

const SITE_CAPTIONS = [
  [
    '⚖️ كل أدوات المحامي المصري في منصة واحدة مجاناً 100% 🚀',
    '',
    'امسح الباركود أو ادخل عبر الرابط لاستخدام منصة المحامي الرقمية:',
    '🔹 بوابة باركود ورول جلسات محاكم ونيابات مصر (241 محكمة وبوابة).',
    '🔹 15 حاسبة قانونية وشرعية (المواريث، النفقة، نهاية الخدمة وفق قانون العمل 14 لسنة 2025، الشهر العقاري).',
    '🔹 المولّد الذكي للعقود والدعاوى (+2,750 صيغة بالملء الآلي).',
    '🔹 بنك أحكام محكمة النقض ودليل المحاكم المطور.',
    '',
    '🌐 تصفح المنصة الآن:',
    'https://mohamidigital.online',
    '',
    '#المحامي_الرقمي #منصة_المحامي_الرقمية #القانون_المصري #العدالة_القانونية'
  ].join('\n'),

  [
    '🧮 احسب مستحقاتك القانونية بدقة خلال ثوانٍ وفق أحدث التشريعات! ⚖️',
    '',
    'امسح باركود منصة المحامي الرقمية لتصل فوراً إلى 15 حاسبة قانونية متخصصة:',
    '✅ حاسبة مكافأة نهاية الخدمة (محدثة لقانون العمل الجديد رقم 14 لسنة 2025).',
    '✅ حاسبة المواريث الشرعية والنفقة ومواعيد الطعون ورسوم المحاكم والشهر العقاري.',
    '',
    '🌐 https://mohamidigital.online/legal-calculators.html',
    '',
    '#حاسبات_قانونية #قانون_العمل_2025 #المواريث #المحامي_الرقمي #العدالة_القانونية'
  ].join('\n'),

  [
    '📝 صُغ عقدك أو صحيفة دعواك في دقائق بأعلى معايير الصياغة القضائية! ⚖️',
    '',
    'امسح الباركود للدخول إلى المولّد الذكي للعقود والدعاوى والتوكيلات (+2,750 نموذجاً بالملء الآلي والطباعة المباشرة وفحص الثغرات قبل التوقيع).',
    '',
    '🔗 جربه مجاناً عبر المنصة:',
    'https://mohamidigital.online/contract-generator.html',
    '',
    '#صياغة_العقود #مولد_العقود #المحامي_الرقمي #محامين_مصر #العدالة_القانونية'
  ].join('\n'),

  [
    '🏛️ دليل المحاكم والشهر العقاري وبنك مبادئ محكمة النقض بين يديك! ⚖️',
    '',
    'امسح باركود منصة المحامي الرقمية وتصفح عناوين المحاكم وفروع الشهر العقاري المسائية والمولات، ومبادئ محكمة النقض المصرية جاهزة للنسخ في المذكرات.',
    '',
    '🌐 https://mohamidigital.online',
    '',
    '#محكمة_النقض #دليل_المحاكم #الشهر_العقاري #المحامي_الرقمي #العدالة_القانونية'
  ].join('\n'),
];

function getWeekRotationIndex(len) {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % len;
}

function resolveType(args) {
  const typeArg = args.find((a) => a.startsWith('--type='));
  if (typeArg) return typeArg.split('=')[1];
  // Auto mode based on UTC day: Monday (1) -> site, Saturday (6) or Wednesday (3) -> rolls
  const utcDay = new Date().getUTCDay();
  if (utcDay === 1) return 'site';
  return 'rolls';
}

async function publishToFacebook(imagePath, caption) {
  if (!FB_PAGE_ID || !FB_PAGE_TOKEN) {
    throw new Error('FB_PAGE_ID و FB_PAGE_TOKEN غير مضبوطين');
  }
  const buf = fs.readFileSync(imagePath);
  const blob = new Blob([buf], { type: 'image/png' });
  const form = new FormData();
  form.append('source', blob, path.basename(imagePath));
  form.append('caption', caption);
  form.append('published', 'true');
  form.append('access_token', FB_PAGE_TOKEN);

  const resp = await fetch(`https://graph.facebook.com/v20.0/${FB_PAGE_ID}/photos`, {
    method: 'POST',
    body: form,
  });
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(`Facebook Graph API error: ${JSON.stringify(data)}`);
  }
  return data;
}

async function sendToTelegram(imagePath, caption) {
  if (!TG_TOKEN) {
    console.log('ℹ️ Telegram Token غير مضبوط — سيتم تخطي إرسال تيليجرام.');
    return null;
  }

  let publicResult = null;
  if (TG_PUBLIC_CHANNEL) {
    const buf = fs.readFileSync(imagePath);
    const blob = new Blob([buf], { type: 'image/png' });
    const form = new FormData();
    form.append('chat_id', TG_PUBLIC_CHANNEL);
    form.append('photo', blob, path.basename(imagePath));
    form.append('caption', caption.slice(0, 1020));

    const resp = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      console.warn('⚠️ Telegram Channel warning:', JSON.stringify(data));
    } else {
      publicResult = data.result;
    }
  }

  if (TG_CHAT_ID && String(TG_CHAT_ID) !== String(TG_PUBLIC_CHANNEL)) {
    const notifyText = `✅ تم النشر الدوري التلقائي بنجاح على صفحة فيسبوك (العدالة القانونية) وقناة ${TG_PUBLIC_CHANNEL}.`;
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text: notifyText }),
    }).catch(() => {});
  }

  return publicResult;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetType = resolveType(args);

  const isRolls = targetType !== 'site';
  const imagePath = isRolls ? ROLLS_QR_PATH : SITE_QR_PATH;
  const pool = isRolls ? ROLLS_CAPTIONS : SITE_CAPTIONS;
  const idx = getWeekRotationIndex(pool.length);
  const caption = pool[idx];

  if (!fs.existsSync(imagePath)) {
    throw new Error(`ملف الباركود غير موجود: ${imagePath}`);
  }

  console.log(`📢 نوع النشر الدوري: ${isRolls ? 'باركود رول الجلسات' : 'باركود المنصة الرئيسية'} (صيغة #${idx + 1}/${pool.length})`);
  console.log(`🖼️ الصورة: ${path.basename(imagePath)}`);

  if (dryRun) {
    console.log('\n[DRY RUN] النص المختار:\n' + caption);
    console.log('\n✅ اختبار المحاكاة نجح تماماً.');
    return;
  }

  const fbResult = await publishToFacebook(imagePath, caption);
  console.log(`✅ تم النشر على صفحة العدالة القانونية (فيسبوك): ${fbResult.post_id || fbResult.id}`);

  const tgResult = await sendToTelegram(imagePath, caption);
  if (tgResult) {
    console.log(`✅ تم الإرسال إلى تيليجرام بنجاح (message_id: ${tgResult.message_id})`);
  }
}

main().catch((err) => {
  console.error('❌ فشل النشر الدوري:', err.message);
  process.exit(1);
});
