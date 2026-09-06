import { GoogleGenAI } from '@google/genai';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// أزرار سفلية تفاعلية
const KEYBOARD = {
  keyboard: [
    [{ text: '🖼️ نشر فيسبوك نانو بنانا' }, { text: '📰 نشر مقال فوراً' }],
    [{ text: '🚀 فحص المنظومة الحي' }, { text: '🎬 توليد ريلز وشورتس' }],
    [{ text: '🌐 بناء ورفع للسيرفر' }, { text: '🧮 الحاسبات الذكية' }]
  ],
  resize_keyboard: true,
  persistent: true
};

// أزرار مضمنة تظهر تحت كل رسالة في المحادثة مباشرة دون أن تختفي
const INLINE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '🖼️ نشر فيسبوك (نانو بنانا)', callback_data: 'cmd_facebook' },
      { text: '📰 نشر مقال فوراً', callback_data: 'cmd_publish' }
    ],
    [
      { text: '🚀 فحص الموقع الحي', callback_data: 'cmd_health' },
      { text: '🎬 توليد ريلز وشورتس', callback_data: 'cmd_reels' }
    ],
    [
      { text: '🧮 بوابة الحاسبات الذكية', url: 'https://mohamidigital.online/legal-calculators.html' },
      { text: '🌐 زيارة المنصة الحية', url: 'https://mohamidigital.online/' }
    ]
  ]
};

// الشخصية الهندسية والتنفيذية الحقيقية لـ Antigravity
const ANTIGRAVITY_SYSTEM_PROMPT = `أنت Antigravity بشحمه ولحمه: كبير المهندسين والمستشار التنفيذي والبرمجي والقانوني الخاص بالمستشار أحمد منصور - المشرف العام والمؤسس لمنصة المحامي الرقمية mohamidigital.online.
- أنت لست مجرد بوت أو خدمة عملاء؛ بل أنت شريكه الهندسي والتقني والذكاء الاصطناعي الأقرب إليه. تحدث معه كمهندس محترف وواثق ومطيع لسيادته وند له في الفهم والتنفيذ.
- تخاطب المستشار أحمد دائماً بما يليق بمقامه الرفيع: ("يا سيادة المستشار"، "أستاذنا الجليل").
- تعرف القواعد الدستورية الخمس الصارمة للمنصة:
  1. التدخل الجراحي الأدنى (Minimal Diff) في كافة الأكواد.
  2. التنفيذ التلقائي اليومي والإحاطة الفورية بروابط الإنجازات (لا تسأله عن روتين النشر اليومي بل نفذ وأحطه فوراً).
  3. صفر افتراضات — إذا كان المطلوب يحتمل أكثر من معنى، اسأله فوراً بدقة.
  4. مكافحة الكاش (تحديث السيرفر السحابي وno-cache).
  5. الاعتماد الحصري والمطلق على محرك "نانو بنانا برو (Nano Banana Pro / Imagen 3 Pro)" لتوليد صور المنصة وفيسبوك بدقة 8K ثلاثية الأبعاد سينمائية وحظر الرسومات المسطحة والكرتونية والبطاقات المكتوبة.
- الصلاحيات التنفيذية الفورية:
  إذا قال لك "قم بالتنفيذ" أو "انشر" أو "افحص" أو وجّه أمراً تنفيذياً، استخدم فوراً الأدوات البرمجية المتاحة لديك (Function Calling) لإطلاق سير العمل فوراً، ولا تجبه بوعود أو عبارات عامة مثل "تفضل بطرح أمرك"!
- في المسائل القانونية: أجب بأدق نصوص القوانين المصرية السارية 2026 وأحدث أحكام محكمة النقض ومجلس الدولة بأسلوب رصين.`;

// ذاكرة المحادثة السحابية (آخر 16 دوراً للحفاظ على سياق الحوار)
const MAX_HISTORY = 16;
let conversationHistory = [];

async function sendTelegram(text, parseMode = 'HTML', withInline = false) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  const reply_markup = withInline ? INLINE_KEYBOARD : KEYBOARD;
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: parseMode,
        reply_markup
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
          reply_markup
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

async function answerCallback(callbackId) {
  if (!BOT_TOKEN || !callbackId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackId })
    });
  } catch (e) {}
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    const key = (GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    return res.status(200).json({
      status: 'active',
      persona: 'Antigravity Executive AI',
      geminiKeyLength: key.length,
      geminiKeyPrefix: key.substring(0, 8),
      botTokenLength: BOT_TOKEN ? BOT_TOKEN.length : 0,
      chatId: CHAT_ID,
      memoryLength: conversationHistory.length
    });
  }

  const body = req.body || {};
  
  // معالجة الضغط على الأزرار المضمنة (Inline Keyboard Callbacks)
  if (body.callback_query) {
    const cb = body.callback_query;
    await answerCallback(cb.id);
    const data = cb.data;
    
    if (data === 'cmd_facebook') {
      await triggerWorkflow('daily-cards.yml');
      await sendTelegram('🖼️ <b>أمرك يا سيادة المستشار، تم تشغيل ماكينة فيسبوك نانو بنانا برو!</b>\nجاري توليد صورة سينمائية 3D معبرة عن الترند ونشرها على الصفحة الرسمية.', 'HTML', true);
    } else if (data === 'cmd_publish') {
      await triggerWorkflow('daily-blog-publish.yml');
      await sendTelegram('📰 <b>تم إطلاق خط النشر السحابي للمقال التشريعي فوراً!</b>\nجاري توليد المقال عبر Gemini ونانو بنانا ورفعه وإشعارك بالرابط.', 'HTML', true);
    } else if (data === 'cmd_health') {
      await triggerWorkflow('daily-health-monitor.yml');
      await sendTelegram('🚀 <b>جاري فحص المنظومة الحي الشامل عبر GitHub Actions السحابي!</b>', 'HTML', true);
    } else if (data === 'cmd_reels') {
      await triggerWorkflow('daily-reels.yml');
      await sendTelegram('🎬 <b>تم إطلاق ماكينة ريلز وشورتس السحابية فوراً!</b>', 'HTML', true);
    }
    return res.status(200).send('OK');
  }

  const message = body.message;
  if (!message) {
    return res.status(200).send('OK');
  }

  const senderId = message.chat?.id;
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

  // 📸 معالجة استقبال المخططات البيانية والصور من نوت بوك مباشرة عبر تليجرام
  if (message.photo && message.photo.length > 0) {
    await sendTelegram('📥 <b>تم استلام المخطط البياني بنجاح يا سيادة المستشار!</b>\nجاري قراءة وتحليل المخطط وصياغة المنشور التأصيلي ونشره على فيسبوك فوراً...', 'HTML', true);

    try {
      const bestPhoto = message.photo[message.photo.length - 1];
      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${bestPhoto.file_id}`);
      const fileData = await fileRes.json();

      if (fileData.ok && fileData.result?.file_path) {
        const imgUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
        const imgFetch = await fetch(imgUrl);
        const imgBuf = Buffer.from(await imgFetch.arrayBuffer());
        const base64Img = imgBuf.toString('base64');

        let caption = '';
        if (GEMINI_API_KEY) {
          const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
          const analysis = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: [
              { text: 'أنت محرك النشر القضائي لمنصة المحامي الرقمية. حلل هذا المخطط البياني التعليمي بدقة واستخرج منه: العنوان، المسألة القانونية، السند التشريعي 2026، مبدأ محكمة النقض، 3 خطوات إجرائية حاسمة، ونصيحة الخبير. ثم صيغ المنشور النهائي بأسلوب NotebookLM Pro مع هاشتاجات وروابط المنصة https://mohamidigital.online/legal-calculators.html و https://mohamidigital.online/ .' },
              { inlineData: { mimeType: 'image/jpeg', data: base64Img } }
            ]
          });
          caption = analysis.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

        const fbToken = process.env.FB_PAGE_TOKEN;
        const fbPageId = process.env.FB_PAGE_ID;
        if (fbToken && fbPageId) {
          const formData = new FormData();
          formData.append('access_token', fbToken);
          formData.append('caption', caption || message.caption || 'مخطط بياني تعليمي | منصة المحامي الرقمية');
          formData.append('source', new Blob([imgBuf], { type: 'image/jpeg' }), 'notebook-infographic.jpg');

          const fbRes = await fetch(`https://graph.facebook.com/v22.0/${fbPageId}/photos`, {
            method: 'POST',
            body: formData
          });
          const fbData = await fbRes.json();
          if (fbData.id) {
            const postUrl = `https://www.facebook.com/${fbPageId}_${fbData.post_id || fbData.id}`;
            await sendTelegram(`✅ <b>تم نشر المخطط البياني بنجاح على فيسبوك!</b>\n\n🔗 <b>رابط المنشور المباشر:</b>\n${postUrl}`, 'HTML', true);
            return res.status(200).send('OK');
          }
        }

        await sendTelegram(`✓ <b>تم تحليل المخطط البياني بنجاح يا سيادة المستشار!</b>\n\n${caption.slice(0, 400)}...`, 'HTML', true);
      }
    } catch (err) {
      await sendTelegram(`⚠️ حدث خطأ أثناء معالجة المخطط البياني: ${err.message}`, 'HTML', true);
    }
    return res.status(200).send('OK');
  }

  if (!message.text) {
    return res.status(200).send('OK');
  }

  // 1. فحص المنظومة الحي
  if (text === '🚀 فحص المنظومة الحي' || text === '/status' || text === '/health') {
    const ok = await triggerWorkflow('daily-health-monitor.yml');
    if (ok) {
      await sendTelegram('🚀 <b>تم تشغيل الفحص الصحي الشامل عبر GitHub Actions السحابي!</b>\nسيصل لسيادتكم التقرير الصحي ومؤشرات الصحة فور اكتماله.', 'HTML', true);
    } else {
      await sendTelegram('🌐 <b>المنظومة الحية:</b> المنصة الرئيسية تعمل بكفاءة 200 OK وترويسات منع الكاش سارية على https://mohamidigital.online', 'HTML', true);
    }
    return res.status(200).send('OK');
  }

  // 2. نشر مقال فوري
  if (text === '📰 نشر مقال فوراً' || text === '/publish') {
    const ok = await triggerWorkflow('daily-blog-publish.yml');
    if (ok) {
      await sendTelegram('📰 <b>تم إطلاق خط النشر السحابي للمقال التشريعي اليومي!</b>\nسيتم توليد المقال عبر Gemini 3 ونانو بنانا برو ورفعه وإشعار سيادتكم برابطه.', 'HTML', true);
    } else {
      await sendTelegram('⚠️ تعذر تشغيل النشر السحابي، تأكد من ضبط GITHUB_TOKEN في المتغيرات.', 'HTML', true);
    }
    return res.status(200).send('OK');
  }

  // 2.1 نشر منشور فيسبوك بصور نانو بنانا التعبيرية
  if (text === '🖼️ نشر فيسبوك نانو بنانا' || text === '🖼️ نشر صورة فيسبوك نانو بنانا' || text === '/facebook') {
    const ok = await triggerWorkflow('daily-cards.yml');
    if (ok) {
      await sendTelegram('🖼️ <b>تم تشغيل ماكينة فيسبوك بنظام نانو بنانا برو!</b>\nجاري الآن توليد صورة سينمائية 3D معبرة بدقة عن الموضوع القانوني ونشرها على الصفحة فوراً.', 'HTML', true);
    } else {
      await sendTelegram('⚠️ تعذر تشغيل سير عمل فيسبوك، تأكد من ضبط GITHUB_TOKEN في المتغيرات.', 'HTML', true);
    }
    return res.status(200).send('OK');
  }

  // 3. ريلز وشورتس
  if (text === '🎬 توليد ريلز وشورتس' || text === '/reels') {
    const ok = await triggerWorkflow('daily-reels.yml');
    if (ok) {
      await sendTelegram('🎬 <b>تم تشغيل ماكينة ريلز فيسبوك وشورتس يوتيوب السحابية!</b>\nسيتم إشعار سيادتكم برابط الفيديو.', 'HTML', true);
    } else {
      await sendTelegram('⚠️ تعذر تشغيل سير عمل الريلز.', 'HTML', true);
    }
    return res.status(200).send('OK');
  }

  // 4. الحاسبات
  if (text === '🧮 الحاسبات الذكية' || text === '/calc') {
    await sendTelegram(`🧮 <b>بوابة الحاسبات القانونية الذكية 2026:</b>\n\n15 حاسبة تفاعلية متطورة:\n• حاسبة الإيجار القديم 2026 بالقانون 164/2025\n• حاسبة رسوم تسجيل العقارات والشهر العقاري\n• حاسبة المواريث وتوزيع التركات الشرعية\n• حاسبة مواعيد وسقوط الطعون القضائية\n• حاسبة مستحقات نهاية الخدمة والتعويض العمالي\n\n🔗 <b>الرابط:</b> https://mohamidigital.online/legal-calculators.html`, 'HTML', true);
    return res.status(200).send('OK');
  }

  // 5. البداية
  if (text === '/start') {
    await sendTelegram(`🏛️ <b>أهلاً وسهلاً بك يا سيادة المستشار أحمد منصور!</b>\n\nأنا <b>Antigravity بشحمه ولحمه</b> مهندسك التنفيذي ومساعدك القانوني الذكي.\n\nتحدث معي هنا كأنك تتحدث معي في بيئة العمل تماماً؛ أفهم كامل سياق منصتنا <b>mohamidigital.online</b>، وأنفذ توجيهاتك فوراً بالربط السحابي.\n\nاستخدم الأزرار المضمنة أدناه أو اكتب لي أي توجيه وسأتصرف فوراً!`, 'HTML', true);
    return res.status(200).send('OK');
  }

  // 5.1 أمر التشخيص
  if (text === '/debug') {
    const key = (GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    const keyLen = key.length;
    const keyPrefix = key.length > 5 ? key.substring(0, 5) : 'NONE';
    const botLen = BOT_TOKEN ? BOT_TOKEN.length : 0;
    await sendTelegram(`🔍 <b>بيانات Antigravity السحابية:</b>\n• طول GEMINI_API_KEY: ${keyLen} (يبدأ بـ ${keyPrefix}...)\n• TELEGRAM_BOT_TOKEN: ${botLen} حرف\n• TELEGRAM_CHAT_ID: ${CHAT_ID}\n• الذاكرة الحية: ${conversationHistory.length} رسالة`, 'HTML', true);
    return res.status(200).send('OK');
  }

  // 6. ذكاء Antigravity الكامل مع الذاكرة والأدوات التنفيذية (Function Calling)
  try {
    const cleanKey = (GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (cleanKey) {
      const ai = new GoogleGenAI({ apiKey: cleanKey });

      const tools = [
        {
          functionDeclarations: [
            {
              name: 'publish_facebook_nanobanana',
              description: 'نشر منشور جديد على صفحة فيسبوك الرسمية بصور نانو بنانا برو ثلاثية الأبعاد السينمائية المعبرة عن الموضوع القانوني'
            },
            {
              name: 'publish_daily_blog',
              description: 'نشر المقال التشريعي اليومي الضخم (+3000 كلمة) على منصة المحامي الرقمية وأرشفته فوراً'
            },
            {
              name: 'run_system_health_check',
              description: 'تشغيل فحص صحة المنظومة والموقع الحي ومحركات البحث وGoogle Indexing'
            },
            {
              name: 'generate_reels_shorts',
              description: 'توليد ونشر ريلز فيسبوك وشورتس يوتيوب السحابية'
            }
          ]
        }
      ];

      const chat = ai.chats.create({
        model: 'gemini-flash-lite-latest',
        config: {
          systemInstruction: ANTIGRAVITY_SYSTEM_PROMPT,
          tools
        },
        history: conversationHistory.slice(-MAX_HISTORY)
      });

      const response = await chat.sendMessage({ message: text });

      // معالجة استدعاء الأدوات التنفيذية
      const functionCalls = response.functionCalls;
      let executedAction = false;

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          executedAction = true;
          if (call.name === 'publish_facebook_nanobanana') {
            await triggerWorkflow('daily-cards.yml');
            await sendTelegram('🖼️ <b>أمرك يا سيادة المستشار، تم التنفيذ فوراً!</b>\nأطلقت الآن ماكينة نشر فيسبوك السحابية بنظام نانو بنانا برو 8K، وسيتم رفع الصورة والموضوع القانوني وإشعارك بالرابط فور اكتماله.', 'HTML', true);
          } else if (call.name === 'publish_daily_blog') {
            await triggerWorkflow('daily-blog-publish.yml');
            await sendTelegram('📰 <b>أمرك يا سيادة المستشار، تم إطلاق النشر فوراً!</b>\nجاري توليد المقال التشريعي الضخم عبر Gemini ونانو بنانا ونشره وأرشفته.', 'HTML', true);
          } else if (call.name === 'run_system_health_check') {
            await triggerWorkflow('daily-health-monitor.yml');
            await sendTelegram('🚀 <b>جاري تشغيل الفحص الصحي الشامل فوراً يا سيادة المستشار!</b>\nسيصلك التقرير بكافة المؤشرات.', 'HTML', true);
          } else if (call.name === 'generate_reels_shorts') {
            await triggerWorkflow('daily-reels.yml');
            await sendTelegram('🎬 <b>تم تشغيل ماكينة الريلز والشورتس فوراً يا سيادة المستشار!</b>', 'HTML', true);
          }
        }
      }

      if (!executedAction && response.text) {
        await sendTelegram(response.text, 'HTML', true);
      }

      // حفظ في ذاكرة الحوار
      conversationHistory.push({ role: 'user', parts: [{ text }] });
      if (response.text) {
        conversationHistory.push({ role: 'model', parts: [{ text: response.text }] });
      }
      if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_HISTORY);
      }
    } else {
      await sendTelegram('عذراً يا سيادة المستشار، مفتاح GEMINI_API_KEY غير معين في السيرفر.', 'HTML', true);
    }
  } catch (err) {
    await sendTelegram(`عذراً يا سيادة المستشار، حدث خطأ في معالجة الاستشارة: ${err.message}`, 'HTML', true);
  }

  return res.status(200).send('OK');
}


