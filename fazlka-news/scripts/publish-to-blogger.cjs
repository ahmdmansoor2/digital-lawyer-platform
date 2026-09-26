/**
 * أداة النشر التلقائي المباشر لبوابة «صوت مصر 24» عبر بريد بلوجر السري
 * Sawt Misr 24 Blogger Auto-Publisher
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const nodemailer = require('nodemailer');

const GMAIL_USER = 'ahmdmansoor2@gmail.com';
const GMAIL_PASS = 'wkawyxsyxssudmpm';
const BLOGGER_EMAIL = process.env.BLOGGER_EMAIL || 'ahmdmansoor2.sawt24@blogger.com';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  }
});

async function sendTelegramLiveNotification(title, category) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const msg = `🎉 *[صوت مصر 24] - تم نشر مقال جديد حياً على الموقع!* 🇪🇬\n━━━━━━━━━━━━━━━━━━\n📌 *العنوان:* ${title}\n📁 *القسم:* #${category.replace(/\s+/g, '_')}\n🌐 *الرابط:* https://fazlkanews.blogspot.com/\n━━━━━━━━━━━━━━━━━━\n⚖️ إشراف: *المستشار أحمد منصور*`;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' })
    });
  } catch(e) {}
}

async function publishArticleFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`الملف غير موجود: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n📤 جاري نشر المقال عبر البريد السري: "${data.title}"...`);

  // وسم التصنيفات في نهاية المقال
  const labelsTag = `<br/><br/><p style="color:#94a3b8; font-size:12px;">التصنيفات: ${data.category}, ${data.tags.join(', ')}</p>`;
  const fullHtml = data.full_blogger_html + labelsTag;

  const mailOptions = {
    from: GMAIL_USER,
    to: BLOGGER_EMAIL,
    subject: data.title,
    html: fullHtml
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error('❌ فشل الإرسال:', error.message);
        reject(error);
      } else {
        console.log('✅ تم إرسال المقال إلى بلوجر بنجاح! معرّف الرسالة:', info.messageId);
        await sendTelegramLiveNotification(data.title, data.category);
        resolve(info);
      }
    });
  });
}

// تشغيل لنشر ملف تجريبي أو دفعة
async function main() {
  const articleFiles = [
    'نيران ترامب تلاحق مسربي «وثائق إيران»_ تهديدات علنية ووعيد ب.json',
    'انكسار الموجة الحارة.. الأرصاد تعلن تراجع درجات الحرارة والق.json',
    'نيران في قلب الممر الاستراتيجي_ استهداف ناقلة نفط بمضيق هرمز.json',
    'بعد مزاعم استهداف مكة المكرمة.. عبدالملك الحوثي يخرج عن صمته.json',
    'ما وراء صفقة «إف 35» للسعودية_ سباق التسلح الإقليمي يفرض قوا.json'
  ];

  const articlesDir = path.join(__dirname, '..', 'output', 'articles', '2026-09-18');
  
  // سننشر أول مقال الآن للتجربة الحية
  const firstFile = path.join(articlesDir, articleFiles[0]);
  await publishArticleFile(firstFile);
}

if (require.main === module) {
  main().catch(err => console.error(err));
}

module.exports = { publishArticleFile };
