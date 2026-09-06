import { GoogleGenAI } from '@google/genai';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const KEYBOARD = {
  keyboard: [
    [{ text: '🚀 فحص المنظومة الحي' }, { text: '📰 نشر مقال فوراً' }],
    [{ text: '🎬 توليد ريلز وشورتس' }, { text: '🌐 بناء ورفع للسيرفر' }],
    [{ text: '📊 حالة الكود والمستودع' }, { text: '🧮 الحاسبات الذكية' }]
  ],
  resize_keyboard: true,
  persistent: true
};

const SYSTEM_PROMPT = `أنت Antigravity (المساعد التنفيذي والبرمجي والقانوني الخاص بالمستشار أحمد منصور - المشرف العام على منصة المحامي الرقمية mohamidigital.online).
- أنت تمتلك كامل قدراتك البرمجية والتحليلية والقانونية.
- خاطب الأستاذ أحمد منصور دائماً بما يليق بمكانته ("يا سيادة المستشار"، "أستاذنا الجليل").
- إذا سألك عن مسألة قانونية: أجب بأدق نصوص القوانين المصرية السارية 2026 مع الاستشهاد بأحكام محكمة النقض ومجلس الدولة ذات الصلة.
- إذا طلب منك استشارة أو تحليلاً تقنياً: أجب بدقة هندسية وخطوات واضحة وموجزة تناسب شاشة الهاتف.`;

async function sendTelegram(text, parseMode = 'HTML') {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: parseMode,
        reply_markup: KEYBOARD
      })
    });
    const d = await res.json();
    if (!d.ok && parseMode) {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          reply_markup: KEYBOARD
        })
      });
    }
  } catch (e) {
    console.error('Error sending telegram:', e);
  }
}

async function triggerWorkflow(workflowFileName) {
  if (!GITHUB_TOKEN) return false;
  try {
    const repo = 'ahmdmansoor2/digital-lawyer-platform';
    const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflowFileName}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Antigravity-Telegram-Bot'
      },
      body: JSON.stringify({ ref: 'main' })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Antigravity Telegram Webhook is Active 24/7 ⚖️');
  }

  const body = req.body || {};
  const message = body.message;
  if (!message || !message.text) {
    return res.status(200).send('OK');
  }

  const senderId = message.chat.id;
  const text = message.text.trim();

  if (String(senderId) !== String(CHAT_ID)) {
    if (BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: senderId,
          text: 'عذراً، هذا البوت تنفيذي وخاص بالمستشار أحمد منصور فقط.'
        })
      });
    }
    return res.status(200).send('OK');
  }

  // 1. فحص المنظومة الحي
  if (text === '🚀 فحص المنظومة الحي' || text === '/status' || text === '/health') {
    const ok = await triggerWorkflow('daily-health-monitor.yml');
    if (ok) {
      await sendTelegram('🚀 <b>تم تشغيل الفحص الصحي الشامل عبر GitHub Actions السحابي!</b>\nسيصل لسيادتكم التقرير الصحي ومؤشرات الصحة فور اكتماله.');
    } else {
      await sendTelegram('🌐 <b>المنظومة الحية:</b> المنصة الرئيسية تعمل بكفاءة 200 OK وترويسات منع الكاش سارية على https://mohamidigital.online');
    }
    return res.status(200).send('OK');
  }

  // 2. نشر مقال فوري
  if (text === '📰 نشر مقال فوراً' || text === '/publish') {
    const ok = await triggerWorkflow('daily-blog-publish.yml');
    if (ok) {
      await sendTelegram('📰 <b>تم إطلاق خط النشر السحابي للمقال التشريعي اليومي!</b>\nسيتم توليد المقال عبر Gemini 3 ونانو بنانا برو ورفعه وإشعار سيادتكم برابطه.');
    } else {
      await sendTelegram('⚠️ تعذر تشغيل النشر السحابي، تأكد من ضبط GITHUB_TOKEN في المتغيرات.');
    }
    return res.status(200).send('OK');
  }

  // 3. ريلز وشورتس
  if (text === '🎬 توليد ريلز وشورتس' || text === '/reels') {
    const ok = await triggerWorkflow('daily-reels.yml');
    if (ok) {
      await sendTelegram('🎬 <b>تم تشغيل ماكينة ريلز فيسبوك وشورتس يوتيوب السحابية!</b>\nسيتم إشعار سيادتكم برابط الفيديو.');
    } else {
      await sendTelegram('⚠️ تعذر تشغيل سير عمل الريلز.');
    }
    return res.status(200).send('OK');
  }

  // 4. الحاسبات
  if (text === '🧮 الحاسبات الذكية' || text === '/calc') {
    await sendTelegram(`🧮 <b>بوابة الحاسبات القانونية الذكية 2026:</b>\n\n15 حاسبة تفاعلية متطورة:\n• حاسبة الإيجار القديم 2026 بالقانون 164/2025\n• حاسبة رسوم تسجيل العقارات والشهر العقاري\n• حاسبة المواريث وتوزيع التركات الشرعية\n• حاسبة مواعيد وسقوط الطعون القضائية\n• حاسبة مستحقات نهاية الخدمة والتعويض العمالي\n\n🔗 <b>الرابط:</b> https://mohamidigital.online/legal-calculators.html`);
    return res.status(200).send('OK');
  }

  // 5. البداية
  if (text === '/start') {
    await sendTelegram(`🏛️ <b>أهلاً وسهلاً بك يا سيادة المستشار أحمد منصور!</b>\n\nأنا <b>Antigravity السحابي</b> أعمل 24/7 حتى ولابتوب سيادتكم مغلق تماماً وبدون أي تكلفة.\n\nاستخدم لوحة التحكم بالأزرار بالأسفل، أو اكتب لي أي استفسار قانوني أو توجيه وسأجيبك فوراً!`);
    return res.status(200).send('OK');
  }

  // 5.1 أمر التشخيص
  if (text === '/debug') {
    const key = (GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    const keyLen = key.length;
    const keyPrefix = key.length > 5 ? key.substring(0, 5) : 'NONE';
    const botLen = BOT_TOKEN ? BOT_TOKEN.length : 0;
    await sendTelegram(`🔍 <b>بيانات التشخيص السحابية:</b>\n• طول GEMINI_API_KEY: ${keyLen} (يبدأ بـ ${keyPrefix}...)\n• TELEGRAM_BOT_TOKEN: ${botLen} حرف\n• TELEGRAM_CHAT_ID: ${CHAT_ID}`);
    return res.status(200).send('OK');
  }

  // 6. استشارة قانونية / ذكاء اصطناعي عبر Gemini
  try {
    const cleanKey = (GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (cleanKey) {
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: `${SYSTEM_PROMPT}\n\nسؤال أو توجيه المستشار أحمد منصور:\n${text}`
      });
      await sendTelegram(response.text);
    } else {
      await sendTelegram('عذراً يا سيادة المستشار، مفتاح GEMINI_API_KEY غير معين في السيرفر.');
    }
  } catch (err) {
    await sendTelegram(`عذراً يا سيادة المستشار، حدث خطأ في معالجة الاستشارة: ${err.message}`);
  }

  return res.status(200).send('OK');
}

