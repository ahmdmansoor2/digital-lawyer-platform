/**
 * scripts/cinematic-dialogue-engine/dialogue-generator.cjs
 * مولد السيناريوهات والحوارات القانونية السينمائية الواقعية (محامٍ وموكل)
 */

const https = require('https');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function callGemini(promptText) {
  return new Promise((resolve) => {
    if (!GEMINI_API_KEY) return resolve(null);

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 3000 }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: '/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts) {
            resolve(json.candidates[0].content.parts[0].text);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.write(payload);
    req.end();
  });
}

async function generateCinematicDialogue(topic) {
  const prompt = `أنت مؤلف سينمائي ومستشار قانوني مصري كبير.
اكتب سيناريو حوار واقعي جداً ومؤثر بين شخصيتين داخل مكتب محاماة فاخر في القاهرة:
1. الموكل (شاب مصري قلق يبحث عن حل لمشكلة عاجلة تهدد مستقبله).
2. المحامي (المستشار القانوني - رصين، واثق، خبير بالقانون المصري وأحكام محكمة النقض).

موضوع الحلقة: "${topic.title}"
التصنيف القانوني: "${topic.category || 'استشارات قانونية'}"

قواعد الحوار الذهبية:
- لغة الحوار: لهجة مصرية بيضاء مهذبة وفصيحة تجمع بين الواقعية الإنسانية والدقة القانونية المطلقة.
- الهيكل: 5 لقطات متعاقبة (Shot-Reverse-Shot) تبدأ بهوك ناري ومباشر.
- المحامي يذكر السند القانوني الصريح أو حكم النقض أو رقم المادة بأسلوب مريح ومقنع.
- مدة الحوار الإجمالية: من 60 إلى 75 ثانية.

أرجع النتيجة بتنسيق JSON خالص فقط بالهيكل التالي:
{
  "title": "${topic.title}",
  "hook": "الجملة الأولى الافتتاحية للموكل",
  "shots": [
    {
      "shot_id": 1,
      "character": "client",
      "character_name": "الموكل",
      "voice_role": "client",
      "shot_type": "medium_client",
      "visual_prompt": "cinematic over the shoulder shot of a concerned young Egyptian client speaking in a luxury law office in Cairo, bokeh library background, 8k",
      "arabic_text": "يا أستاذ، أنا ماضي على إيصال أمانة على بياض، وصاحب الشغل بيهددني إنه هيرفع بيه جنحة ويحبسني.. أعمل إيه وضعي ضاع؟",
      "on_screen_text": "ماضي على إيصال أمانة على بياض؟",
      "duration_estimate_sec": 10
    },
    {
      "shot_id": 2,
      "character": "lawyer",
      "character_name": "المحامي",
      "voice_role": "lawyer",
      "shot_type": "close_up_lawyer",
      "visual_prompt": "cinematic close up of a 42 year old distinguished Egyptian male lawyer in a navy suit, speaking warmly and reassuringly in his law office, soft cinematic lighting",
      "arabic_text": "أولاً اهدى خالص واطمن. قضاء محكمة النقض المصرية مستقر تماماً: توقيع إيصال الأمانة على بياض بيسقط ركن التسليم، وبكده بتنتفي جريمة خيانة الأمانة وتتحول لنزاع مدني.",
      "on_screen_text": "محكمة النقض: ينتفي ركن التسليم",
      "duration_estimate_sec": 14
    },
    {
      "shot_id": 3,
      "character": "client",
      "character_name": "الموكل",
      "voice_role": "client",
      "shot_type": "medium_client",
      "visual_prompt": "close up of the Egyptian client listening attentively and asking an urgent follow up question, warm law office atmosphere",
      "arabic_text": "طب وإزاي نثبت قدام القاضي في أول جلسة إن الإيصال كان على بياض؟",
      "on_screen_text": "إزاي نثبت البياض أمام القاضي؟",
      "duration_estimate_sec": 8
    },
    {
      "shot_id": 4,
      "character": "lawyer",
      "character_name": "المحامي",
      "voice_role": "lawyer",
      "shot_type": "close_up_lawyer",
      "visual_prompt": "cinematic shot of the Egyptian lawyer explaining legal procedures with hand gestures, confident smile, law books in background",
      "arabic_text": "في أول جلسة بنطلب رسمياً إحالة الإيصال لأبحاث التزييف والتزوير بمصلحة الطب الشرعي للطعن بالصلب؛ والتقرير بيثبت علمياً إن صلب الإيصال اتكتب بتاريخ لاحق للتوقيع، والقاضي بيحكم فوراً بالبراءة!",
      "on_screen_text": "الطعن بالصلب والطب الشرعي = براءة",
      "duration_estimate_sec": 18
    },
    {
      "shot_id": 5,
      "character": "lawyer",
      "character_name": "المحامي",
      "voice_role": "lawyer",
      "shot_type": "master_lawyer_camera",
      "visual_prompt": "cinematic medium shot of the Egyptian lawyer looking into the camera delivering the final legal rule, luxury office, golden lighting",
      "arabic_text": "نصيحتي الذهبية: إياك توقع على بياض، ولو حصل.. القانون دايماً في صف صاحب الحق. تابعنا لتعرف حقك أولاً بأول.",
      "on_screen_text": "اعرف حقك مع منصة المحامي الرقمية",
      "duration_estimate_sec": 12
    }
  ]
}`;

  const aiRes = await callGemini(prompt);
  if (aiRes) {
    try {
      const cleanJson = aiRes.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {}
  }

  // Fallback high-impact default dialogue
  return {
    title: topic.title,
    hook: "ماضي على إيصال أمانة على بياض؟",
    shots: [
      {
        shot_id: 1,
        character: "client",
        character_name: "الموكل",
        voice_role: "client",
        shot_type: "medium_client",
        visual_prompt: "cinematic shot of a concerned young Egyptian client speaking in a luxury law office in Cairo, bokeh library background, 8k",
        arabic_text: "يا أستاذ، أنا ماضي على إيصال أمانة على بياض، وصاحب الشغل بيهددني إنه هيرفع بيه جنحة ويحبسني.. أعمل إيه وضعي ضاع؟",
        on_screen_text: "ماضي على إيصال أمانة على بياض؟",
        duration_estimate_sec: 10
      },
      {
        shot_id: 2,
        character: "lawyer",
        character_name: "المحامي",
        voice_role: "lawyer",
        shot_type: "close_up_lawyer",
        visual_prompt: "cinematic close up of a 42 year old distinguished Egyptian male lawyer in a navy suit, speaking warmly and reassuringly in his law office",
        arabic_text: "أولاً اهدى خالص واطمن. قضاء محكمة النقض المصرية مستقر تماماً: توقيع إيصال الأمانة على بياض بيسقط ركن التسليم، وبكده بتنتفي جريمة خيانة الأمانة وتتحول لنزاع مدني.",
        on_screen_text: "محكمة النقض: ينتفي ركن التسليم",
        duration_estimate_sec: 14
      },
      {
        shot_id: 3,
        character: "client",
        character_name: "الموكل",
        voice_role: "client",
        shot_type: "medium_client",
        visual_prompt: "close up of the Egyptian client listening attentively and asking an urgent follow up question, warm law office atmosphere",
        arabic_text: "طب وإزاي نثبت قدام القاضي في أول جلسة إن الإيصال كان على بياض؟",
        on_screen_text: "إزاي نثبت البياض أمام القاضي؟",
        duration_estimate_sec: 8
      },
      {
        shot_id: 4,
        character: "lawyer",
        character_name: "المحامي",
        voice_role: "lawyer",
        shot_type: "close_up_lawyer",
        visual_prompt: "cinematic shot of the Egyptian lawyer explaining legal procedures with hand gestures, confident smile, law books in background",
        arabic_text: "في أول جلسة بنطلب رسمياً إحالة الإيصال لأبحاث التزييف والتزوير بمصلحة الطب الشرعي للطعن بالصلب؛ والتقرير بيثبت علمياً إن صلب الإيصال اتكتب بتاريخ لاحق للتوقيع، والقاضي بيحكم فوراً بالبراءة!",
        on_screen_text: "الطعن بالصلب والطب الشرعي = براءة",
        duration_estimate_sec: 18
      },
      {
        shot_id: 5,
        character: "lawyer",
        character_name: "المحامي",
        voice_role: "lawyer",
        shot_type: "master_lawyer_camera",
        visual_prompt: "cinematic medium shot of the Egyptian lawyer looking into the camera delivering the final legal rule, luxury office, golden lighting",
        arabic_text: "نصيحتي الذهبية: إياك توقع على بياض، ولو حصل.. القانون دايماً في صف صاحب الحق. تابعنا لتعرف حقك أولاً بأول.",
        on_screen_text: "اعرف حقك مع منصة المحامي الرقمية",
        duration_estimate_sec: 12
      }
    ]
  };
}

module.exports = { generateCinematicDialogue };
