#!/usr/bin/env node
/**
 * telegram-channel-publisher.cjs
 * الناشر اليومي الآلي لقناة تيليجرام الرسمية (@MohamiDigital)
 *
 * الأوضاع (--mode):
 *   --mode=precedent  (10:30 ص بتوقيت القاهرة) — مبدأ قضائي / قاعدة قانونية
 *   --mode=article    (03:00 ع بتوقيت القاهرة) — أحدث مقال تشريعي من المدونة
 *   --mode=tool       (08:00 م الثلاثاء والخميس) — أداة / حاسبة الأسبوع
 *   --auto            (يختار الوضع تلقائياً حسب الساعة بتوقيت القاهرة)
 *   --dry-run         (معاينة بدون إرسال فعلي)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
try {
  require('dotenv').config({ path: path.join(ROOT, '.env') });
} catch (_) {}

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_PUBLIC_CHANNEL = process.env.TELEGRAM_PUBLIC_CHANNEL_ID || '@MohamiDigital';
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const LOG_PATH = path.join(__dirname, 'telegram-channel-log.json');
const BASE_URL = 'https://mohamidigital.online';

const FOOTER = `\n\n📲 اشترك وشارك زملاءك: @MohamiDigital\n🌐 الموقع الرسمي: ${BASE_URL}`;

const LEGAL_PRINCIPLES_POOL = [
  {
    title: '⚖️ مبدأ في التفرقة بين دعوى صحة التوقيع وصحة ونفاذ العقد',
    body: 'دعوى صحة التوقيع دعوى تحفظية لا تمس أصل الحق أو الملكية، بل تقتصر على إثبات صدور التوقيع من المنسوب إليه؛ أما نقل الملكية القضائي فيستلزم دعوى صحة ونفاذ مستوفية لأركان التسجيل.',
    url: `${BASE_URL}/court-precedents.html`
  },
  {
    title: '⚖️ الشرط الفاسخ الصريح في العقود المدنية',
    body: 'لكي يُنتج الشرط الفاسخ الصريح أثره التلقائي دون تدخل تقديري من القاضي، يجب النص صراحةً على اعتبار العقد مفسوخاً «من تلقاء نفسه دون حاجة إلى تنبيه أو إنذار أو حكم قضائي» عند الإخلال.',
    url: `${BASE_URL}/contract-generator.html`
  },
  {
    title: '⚖️ مستحقات العامل عند الفصل التعسفي (قانون العمل 14 لسنة 2025)',
    body: 'تنص المادة (165) من قانون العمل المصري الجديد رقم 14 لسنة 2025 على أن التعويض عن الإنهاء غير المشروع للعقد غير محدد المدة لا يقل عن أجر شهرين عن كل سنة من سنوات الخدمة، بخلاف رصيد الإجازات ومهلة الإخطار.',
    url: `${BASE_URL}/calculate-end-of-service.html`
  },
  {
    title: '⚖️ قاعدة السنة الماضية في دعوى النفقة الزوجية',
    body: 'وفقاً للمادة (1) من القانون رقم 25 لسنة 1920 المعدل بالقانون 100 لسنة 1985، تُعد النفقة ديناً في ذمة الزوج من تاريخ امتناعه عن الإنفاق، ولا تُسمع دعوى النفقة عن مدة ماضية تزيد على سنة نهايتها تاريخ رفع الدعوى.',
    url: `${BASE_URL}/calculate-alimony.html`
  },
  {
    title: '⚖️ توقيع كافة صفحات العقد لحمايته من الطعن',
    body: 'الاكتفاء بالتوقيع على الورقة الأخيرة من العقد قد يفتح باب المنازعة حول استبدال الصفحات الوسطى؛ يُنصح دائماً بتوقيع الطرفين والشهود على كل صفحة من صفحات المحرر العرفي.',
    url: `${BASE_URL}/contract-generator.html`
  },
  {
    title: '⚖️ الميزة الأفضل للعامل هي الواجبة التطبيق',
    body: 'الأحكام الواردة في قانون العمل تمثل الحد الأدنى لحقوق العامل؛ فإذا تضمن عقد العمل أو اللائحة الداخلية للمنشأة مكافأة أو إجازة أو ميزة أعلى، وجب تطبيق الأصلح للعامل.',
    url: `${BASE_URL}/calculate-end-of-service.html`
  }
];

const TOOLS_POOL = [
  {
    title: '🧮 حاسبة مكافأة نهاية الخدمة 2026 (وفق قانون العمل الجديد 14 لسنة 2025)',
    body: 'احسب بدقة مكافأة نهاية الخدمة، مقابل رصيد الإجازات، وبدل مهلة الإخطار، وتعويض الفصل التعسفي بالجنيه المصري وفق المواد (154، 165، 172، 241) من قانون العمل الجديد.',
    url: `${BASE_URL}/calculate-end-of-service.html`
  },
  {
    title: '📱 بوابة رول وباركود جلسات محاكم ونيابات مصر (241 محكمة وبوابة)',
    body: 'ادخل مباشرة على مجلدات Google Drive وقنوات Telegram الرسمية لرول الجلسات اليومية بجميع محافظات مصر الـ 27 + البوابات السيادية لوزارة العدل ومجلس الدولة والنقض بدون إعلانات.',
    url: `${BASE_URL}/courts-session-rolls.html`
  },
  {
    title: '📝 المولّد الذكي للعقود والدعاوى والتوكيلات (+2,750 نموذجاً)',
    body: 'صُغ عقد بيع، إيجار، عمل، شراكة، أو صحيفة دعوى بالملء الآلي والطباعة المباشرة A4، مع أداة فحص الثغرات القانونية قبل التوقيع مجاناً 100%.',
    url: `${BASE_URL}/contract-generator.html`
  },
  {
    title: '🕌 حاسبة المواريث والتركات الشرعية الدقيقة',
    body: 'حساب فوري لأنصبة الورثة الشرعيين والفروض والتعصيب والرد والعول مع عرض السند الشرعي والقانوني لكل وارث وإمكانية الطباعة وحفظ PDF.',
    url: `${BASE_URL}/calculate-inheritance.html`
  },
  {
    title: '🏠 حاسبة رسوم الشهر العقاري 2026 ودليل الفروع المطور',
    body: 'تعرف على رسوم التسجيل العقاري والتوثيق وأقرب مأمورية أو فرع شهر عقاري مسائي أو سيارة توثيق متنقلة في محافظتك.',
    url: `${BASE_URL}/real-estate-registration-fees.html`
  }
];

function readState() {
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  } catch {
    return { sentArticles: [], principleIdx: 0, toolIdx: 0 };
  }
}

function writeState(state) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function resolveMode(args) {
  const m = args.find((a) => a.startsWith('--mode='));
  if (m) return m.split('=')[1];
  // Auto based on Cairo hour (UTC+2)
  const cairoHour = (new Date().getUTCHours() + 2) % 24;
  if (cairoHour < 12) return 'precedent';
  if (cairoHour < 17) return 'article';
  return 'tool';
}

function pickNextArticle(state) {
  const sentSet = new Set(state.sentArticles || []);
  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({
      file: f,
      mtime: fs.statSync(path.join(BLOG_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const entry of files) {
    const slug = entry.file.replace(/\.html$/, '');
    if (sentSet.has(slug)) continue;

    const html = fs.readFileSync(path.join(BLOG_DIR, entry.file), 'utf8');
    if (/content=["'][^"']*noindex/i.test(html)) continue;

    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\|.*$/, '').trim() : slug;
    const desc = descMatch ? descMatch[1].trim() : '';

    return {
      slug,
      title,
      desc,
      url: `${BASE_URL}/blog/${entry.file}`
    };
  }
  return null;
}

async function sendTelegramMessage(text) {
  if (!TG_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN غير مضبوط');
  }
  const resp = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TG_PUBLIC_CHANNEL,
      text,
      disable_web_page_preview: false
    })
  });
  const data = await resp.json();
  if (!resp.ok || !data.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const mode = resolveMode(args);
  const state = readState();

  let messageText = '';

  if (mode === 'precedent') {
    const idx = (state.principleIdx || 0) % LEGAL_PRINCIPLES_POOL.length;
    const item = LEGAL_PRINCIPLES_POOL[idx];
    messageText = `${item.title}\n\n${item.body}\n\n🔗 طالع المزيد عبر المنصة:\n${item.url}${FOOTER}`;
    state.principleIdx = idx + 1;
  } else if (mode === 'tool') {
    const idx = (state.toolIdx || 0) % TOOLS_POOL.length;
    const item = TOOLS_POOL[idx];
    messageText = `${item.title}\n\n${item.body}\n\n🔗 استخدم الأداة مجاناً الآن:\n${item.url}${FOOTER}`;
    state.toolIdx = idx + 1;
  } else {
    const art = pickNextArticle(state);
    if (!art) {
      console.log('ℹ️ تم نشر جميع المقالات المتاحة بالفعل.');
      return;
    }
    messageText = `📰 ${art.title}\n\n${art.desc}\n\n🔗 اقرأ الدليل القانوني كاملاً:\n${art.url}${FOOTER}`;
    state.sentArticles = state.sentArticles || [];
    state.sentArticles.push(art.slug);
  }

  console.log(`📢 Telegram Channel Mode: ${mode} | Target: ${TG_PUBLIC_CHANNEL}`);
  if (dryRun) {
    console.log('\n[DRY RUN] الرسالة:\n' + messageText);
    return;
  }

  const res = await sendTelegramMessage(messageText);
  writeState(state);
  console.log(`✅ تم النشر في قناة ${TG_PUBLIC_CHANNEL} بنجاح (message_id: ${res.message_id})`);
}

main().catch((err) => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
