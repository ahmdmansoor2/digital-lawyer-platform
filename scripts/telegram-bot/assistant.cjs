#!/usr/bin/env node
/**
 * scripts/telegram-bot/assistant.cjs
 * المساعد الذكي الخاص بالمستشار أحمد منصور عبر Telegram
 * -----------------------------------------------------------
 * - يستقبل رسائل وتوجيهات سيادته عبر التليجرام
 * - يجيب على أي سؤال قانوني باستناد للمحاكم المصرية وقوانينها عبر Gemini
 * - يفحص حالة المنصة لحظياً ويرد بالتقرير الحي
 * - يرسل إشعارات الورديات والإنذارات الفورية إلى هاتفه
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

const ROOT = path.join(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!BOT_TOKEN) {
  console.error('[telegram] خطأ: TELEGRAM_BOT_TOKEN غير مضبوط في .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const SYSTEM_PROMPT = `أنت المساعد الذكي القانوني والتقني الخاص بالمستشار القانوني المصري أحمد منصور (المشرف العام على منصة المحامي الرقمية mohamidigital.online).
- أجب دائماً باحترام رفيع يليق بمكانته القضائية (مثل: "يا سيادة المستشار"، "أهلاً بحضرتك يا أستاذنا").
- إذا سألك عن مسألة قانونية، أجب بأدق نصوص التشريعات المصرية السارية (2026) مع الإشارة لأحكام محكمة النقض ومجلس الدولة ذات الصلة.
- إذا سألك عن الموقع، ساعده باقتراحات عملية لصدارة المنصة.
- نسق الإجابة بنقاط واضحة وبسيطة يسهل قراءتها على شاشة الهاتف.`;

async function sendTelegramMessage(text, parseMode = 'HTML') {
  if (!CHAT_ID) {
    console.warn('[telegram] CHAT_ID غير معروف');
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: parseMode
      })
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error('[telegram] فشل إرسال الرسالة:', err.message);
    return false;
  }
}

async function handleCommand(cmd, text) {
  if (cmd === '/start') {
    return `🏛️ <b>أهلاً وسهلاً بك يا سيادة المستشار أحمد منصور!</b>\n\nأنا مساعدك الذكي لمنصة المحامي الرقمية (mohamidigital.online).\n\n<b>الأوامر المتاحة:</b>\n📊 /status - فحص حالة الموقع الحية الآن\n🧮 /calc - بوابة الحاسبات القانونية\n📰 /latest - آخر تحديثات المنصة\n\nأو <b>اكتب لي أي سؤال قانوني أو توجيه مباشرة</b> وسأجيبك فوراً!`;
  }

  if (cmd === '/status') {
    try {
      const res = await fetch('https://mohamidigital.online/', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        return `✅ <b>حالة الموقع الحي:</b> ممتاز (200 OK)\n🌐 <b>الرابط:</b> https://mohamidigital.online\n⚡ <b>الاستجابة:</b> سريعة والترويسات مانعة للكاش.\n📊 المنظومة تعمل بكامل طاقتها.`;
      }
      return `⚠️ <b>تنبيه:</b> الموقع أعاد كود استجابة (${res.status}).`;
    } catch (e) {
      return `🔴 <b>إنذار:</b> تعذر الوصول للموقع: ${e.message}`;
    }
  }

  if (cmd === '/calc') {
    return `🧮 <b>بوابة الحاسبات القانونية الذكية 2026:</b>\n\nتضم 15 حاسبة تفاعلية متطورة:\n• حاسبة الإيجار القديم 2026 بالقانون 164/2025\n• حاسبة رسوم تسجيل العقارات والشهر العقاري\n• حاسبة المواريث والتركات الشرعية\n• حاسبة مواعيد وسقوط الطعون القضائية\n• حاسبة مستحقات نهاية الخدمة والتعويض العمالي\n\n🔗 <b>الرابط المباشر:</b>\nhttps://mohamidigital.online/legal-calculators.html`;
  }

  // سؤال قانوني أو عام عبر Gemini
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `${SYSTEM_PROMPT}\n\nسؤال المستشار أحمد منصور:\n${text}`
    });
    return response.text;
  } catch (err) {
    return `عذراً يا سيادة المستشار، حدث خطأ أثناء معالجة السؤال: ${err.message}`;
  }
}

async function startPolling() {
  console.log('🚀 بدء تشغيل مساعد تليجرام لمنصة المحامي الرقمية...');
  console.log(`المشرف: أحمد منصور | المعرّف: ${CHAT_ID}`);

  let offset = 0;
  while (true) {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.message && update.message.text) {
            const senderId = update.message.chat.id;
            const text = update.message.text.trim();
            const senderName = update.message.from?.first_name || '';

            console.log(`[telegram] رسالة واردة من ${senderName} (${senderId}): "${text}"`);

            // التأكد أن الرسالة من المستشار أحمد منصور حصرياً لحماية الخصوصية
            if (String(senderId) !== String(CHAT_ID)) {
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: senderId,
                  text: 'عذراً، هذا البوت خاص واستشاري شخصي للمستشار أحمد منصور فقط.'
                })
              });
              continue;
            }

            const cmd = text.startsWith('/') ? text.split(' ')[0] : '';
            const reply = await handleCommand(cmd, text);
            await sendTelegramMessage(reply, cmd ? 'HTML' : undefined);
          }
        }
      }
    } catch (err) {
      console.error('[telegram polling error]', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

module.exports = { sendTelegramMessage };

if (require.main === module) {
  startPolling();
}
