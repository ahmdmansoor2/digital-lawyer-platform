#!/usr/bin/env node
/**
 * scripts/telegram-bot/assistant.cjs
 * Antigravity Executive Assistant via Telegram
 * -----------------------------------------------------------
 * - تحكم تنفيذي كامل للمستشار أحمد منصور عبر الهاتف
 * - تنفيذ الأوامر البرمجية الحقيقية (بناء، نشر، فحص صحي، ريلز، جيت)
 * - استشارات قانونية متعمقة بعقل Gemini الذكي
 * - لوحة تحكم بأزرار ثابتة على شاشة الهاتف
 */

'use strict';

const path = require('path');
const { exec } = require('child_process');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

const ROOT = path.join(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!BOT_TOKEN) {
  console.error('[telegram] خطأ: TELEGRAM_BOT_TOKEN غير متوفر في .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

function runCmd(command, cwd = ROOT) {
  return new Promise((resolve) => {
    exec(command, { cwd, maxBuffer: 1024 * 1024 * 10, timeout: 300000 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        code: error ? error.code : 0,
        output: (stdout || '') + (stderr ? '\n' + stderr : '')
      });
    });
  });
}

async function sendTelegram(text, parseMode = 'HTML') {
  if (!CHAT_ID) return false;
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
    return d.ok;
  } catch (err) {
    console.error('[telegram] خطأ إرسال:', err.message);
    return false;
  }
}

async function handleAction(text) {
  const t = text.trim();

  // 1. فحص المنظومة
  if (t === '🚀 فحص المنظومة الحي' || t === '/status' || t === '/health' || t.includes('افحص') || t.includes('حالة الموقع')) {
    await sendTelegram('⏳ <i>جاري تشغيل الفحص الصحي اليومي الشامل للـ 183 مقالاً والسيرفر...</i>');
    const res = await runCmd('node scripts/monitor/health-check.cjs');
    if (res.success) {
      return `✅ <b>اكتمل الفحص بنجاح يا سيادة المستشار:</b>\n\n<pre>${res.output.slice(-800)}</pre>`;
    }
    return `⚠️ <b>نتائج الفحص مع ملاحظات:</b>\n\n<pre>${res.output.slice(-800)}</pre>`;
  }

  // 2. نشر مقال فوري
  if (t === '📰 نشر مقال فوراً' || t === '/publish' || t.includes('انشر مقال')) {
    await sendTelegram('⏳ <i>جاري تشغيل ماكينة النشر التلقائي عبر Gemini وتوليد المقال والصورة...</i>');
    const res = await runCmd('node scripts/blog-publisher/daily-publish.cjs');
    if (res.success) {
      return `🎉 <b>تم نشر المقال بنجاح وإدراجه في الفهرس:</b>\n\n<pre>${res.output.slice(-600)}</pre>`;
    }
    return `⚠️ <b>تعثر النشر:</b>\n\n<pre>${res.output.slice(-600)}</pre>`;
  }

  // 3. توليد ريلز وشورتس
  if (t === '🎬 توليد ريلز وشورتس' || t === '/reels' || t.includes('ريلز') || t.includes('شورتس')) {
    await sendTelegram('⏳ <i>جاري توليد سيناريو الريلز وتشغيل الصوت عبر Edge-TTS ورندر الفيديو...</i>');
    const res = await runCmd('node scripts/facebook-publisher/reel-publisher.cjs');
    return `🎬 <b>نتيجة خط الريلز:</b>\n\n<pre>${res.output.slice(-600)}</pre>`;
  }

  // 4. بناء ورفع للسيرفر (Deploy)
  if (t === '🌐 بناء ورفع للسيرفر' || t === '/deploy' || t.includes('ارفع للسيرفر') || t.includes('deploy')) {
    await sendTelegram('⏳ <i>جاري بناء المشروع (npm run build) ثم الرفع لـ Firebase Hosting...</i>');
    const buildRes = await runCmd('npm run build');
    if (!buildRes.success) {
      return `❌ <b>فشل بناء المشروع:</b>\n\n<pre>${buildRes.output.slice(-500)}</pre>`;
    }
    const deployRes = await runCmd('npx firebase deploy --only hosting:app --project justice-91571');
    if (deployRes.success) {
      return `🚀 <b>تم البناء والنشر بنجاح على السيرفر الحي!</b>\n🌐 https://mohamidigital.online\n\n<pre>${deployRes.output.slice(-500)}</pre>`;
    }
    return `⚠️ <b>فشل الرفع لـ Firebase:</b>\n\n<pre>${deployRes.output.slice(-500)}</pre>`;
  }

  // 5. حالة الكود والمستودع Git
  if (t === '📊 حالة الكود والمستودع' || t === '/git' || t.includes('جيت') || t.includes('مستودع')) {
    const status = await runCmd('git status -s');
    const lastCommit = await runCmd('git log -1 --oneline');
    return `📊 <b>حالة مستودع GitHub:</b>\n\n<b>آخر Commit:</b> <code>${lastCommit.output.trim()}</code>\n\n<b>الملفات المعدلة:</b>\n${status.output.trim() ? `<pre>${status.output.trim()}</pre>` : '✅ المستودع نظيف ومتزامن بالكامل (Clean).'}`;
  }

  // 6. الحاسبات الذكية
  if (t === '🧮 الحاسبات الذكية' || t === '/calc' || t.includes('حاسبة')) {
    return `🧮 <b>بوابة الحاسبات القانونية الذكية 2026:</b>\n\n15 حاسبة تفاعلية متطورة:\n• حاسبة الإيجار القديم 2026 بالقانون 164/2025\n• حاسبة رسوم تسجيل العقارات والشهر العقاري\n• حاسبة المواريث وتوزيع التركات الشرعية\n• حاسبة مواعيد وسقوط الطعون القضائية\n• حاسبة مستحقات نهاية الخدمة والتعويض العمالي\n\n🔗 <b>الرابط:</b> https://mohamidigital.online/legal-calculators.html`;
  }

  // 7. البداية والترحيب
  if (t === '/start') {
    return `🏛️ <b>أهلاً وسهلاً بك يا سيادة المستشار أحمد منصور!</b>\n\nأنا <b>Antigravity</b> بكامل قدراتي الهندسية والتنفيذية بين يديك.\n\nاستخدم <b>لوحة التحكم بالأزرار بالأسفل</b> للتحكم الفوري في المنصة، أو اكتب لي أي استفسار قانوني أو توجيه برمجي وسأنفذه فوراً!`;
  }

  // 8. سؤال عام / استشارة قانونية / توجيه ذكي عبر Gemini 2.5
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `${SYSTEM_PROMPT}\n\nسؤال أو توجيه المستشار أحمد منصور:\n${text}`
    });
    return response.text;
  } catch (err) {
    return `عذراً يا سيادة المستشار، حدث خطأ في معالجة الطلب: ${err.message}`;
  }
}

async function startPolling() {
  console.log('🚀 بدء تشغيل محرك Antigravity الكامل عبر Telegram...');
  console.log(`المشرف العام: المستشار أحمد منصور | المعرّف: ${CHAT_ID}`);

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

            console.log(`[telegram] أمر من ${senderName} (${senderId}): "${text}"`);

            if (String(senderId) !== String(CHAT_ID)) {
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: senderId,
                  text: 'عذراً، هذا البوت تنفيذي وخاص بالمستشار أحمد منصور فقط.'
                })
              });
              continue;
            }

            const reply = await handleAction(text);
            await sendTelegram(reply);
          }
        }
      }
    } catch (err) {
      console.error('[telegram error]', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

module.exports = { sendTelegram, handleAction };

if (require.main === module) {
  startPolling();
}
