#!/usr/bin/env node
/**
 * scene-generator.cjs — توليد سكريبت + مشاهد بصرية لكل فيديو
 *
 * - يأخذ موضوع + زاوية (angle)
 * - يستخدم Gemini لتوليد سكريبت 60-90 ثانية بالعربية
 * - يقسّمه لمشاهد (5-8) كل مشهد له: نص معروض + prompt صورة
 * - يولّد صورة لكل مشهد عبر Gemini Imagen (مع fallback لـ SVG محلي)
 *
 * الاستخدام البرمجي:
 *   const { planScenes, renderScenes } = require('./scene-generator.cjs');
 *   const plan = await planScenes(topic, { geminiApiKey });
 *   const sceneFiles = await renderScenes(plan, { outputDir });
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY مش متضبوط — توليد السكريبت/الصور مش هيشتغل.');
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const TEXT_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3.5-flash',
];
let textModelIdx = 0;
const currentTextModel = () => TEXT_MODELS[textModelIdx % TEXT_MODELS.length];
function advanceTextModel() {
  textModelIdx = (textModelIdx + 1) % TEXT_MODELS.length;
  console.log(`[scenes] ⚠️  تحويل لنموذج: ${currentTextModel()}`);
  return currentTextModel();
}

const IMAGE_MODEL = 'gemini-2.5-flash-image'; // Nano Banana

// ─── 1) توليد السكريبت ──────────────────────────────────────────────────────
async function generateScript(topic, opts = {}) {
  if (!ai) throw new Error('GEMINI_API_KEY مش متضبوط');

  // لو فيه fullText من مقال مدونة، نضيفه كسياق
  const fullTextContext = opts.fullText
    ? `\n\nالمقال الأصلي (كمرجع للمحتوى القانوني):\n${opts.fullText.substring(0, 2000)}\n\nملخص للمقال في سكريبت TikTok 60-90 ثانية. التزم بمحتوى المقال ولا تخرج عنه.`
    : '';

  const prompt = `أنت خبير قانوني رائد في التشريع المصري، ومذيع إعلامي متخصص باللغة العربية الفصحى الفصيحة الإذاعية. اكتب سكريبت فيديو قصير (60-90 ثانية) بمستوى إذاعي رفيع جداً عن:

العنوان: ${topic.title}
التصنيف: ${topic.category}
الكلمات المفتاحية: ${(topic.keywords || []).join('، ')}${fullTextContext}

قواعد اللغة والنطق والجودة الإذاعية (تُطبَّق بدقة 100٪):
1. اللغة: عربية فصحى مشكولة ومضبوطة نطقياً بالشكل الصحيح للكلمات الملتبسة (ضبط الحركات الأساسية والفتحة والضمة والكسرة عند الحاجة لضمان النطق التام بدون خطأ صوتي).
2. الأسلوب: فصيح، رصين، شجي، بمستوى النشرات الإعلامية القانونية الكبرى. بلا أي كلمة عامية، بلا ألفاظ مبتذلة، وبلا تكرار.
3. الجمل: سريعة التتابع، متماسكة، متسلسلة البناء، وتخاطب المشاهد باحترام وجاذبية بالغة.
4. الدقة القانونية: 100٪ — اذكر رقم المادة والقانون عند اللزوم (مثل "وفقاً للمادة ٣٤٠ من قانون العقوبات المصري").
5. الترقيم: استخدم الفواصل والنقاط بدقة لمساعدة محرك الصوت الآلي على التوقف والتنفس الإذاعي الصحيح.
6. البداية: جملة Hook قوية تشد انتباه المستمع في أول ثانيتين.
7. النهاية: دعوة عملية صريحة (CTA) للاستشارة أو المتابعة.

أرجع JSON فقط بدون أي كلام إضافي:
{
  "hook": "الجملة الأولى الجاذبة (٣ ثوان)",
  "full_text": "النص الكامل للسكريبت مشكول التشكيل النطقي الصحيح",
  "hashtags": ["هاشتاج1", "هاشتاج2", "هاشتاج3", "هاشتاج4", "هاشتاج5"],
  "scenes": [
    {
      "id": 1,
      "duration_sec": 8,
      "narration": "الجملة المنطوقة في هذا المشهد مشكولة",
      "on_screen_text": "عبارة قصيرة فصحى تُعرض على الشاشة (٣-٧ كلمات)",
      "image_prompt": "وصف الصورة بالإنجليزية لـ Imagen: realistic, professional, clean background, related to ${topic.category}"
    }
  ]
}

عدد المشاهد: 5-8. المجموع = 60-90 ثانية.`;

  let lastError;
  for (let i = 0; i < TEXT_MODELS.length; i++) {
    try {
      const model = currentTextModel();
      const resp = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });
      const text = resp.text?.trim();
      if (!text) throw new Error('مفيش رد من Gemini');
      // استخراج JSON من الرد
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('الرد مش JSON صالح');
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      lastError = e;
      console.warn(`[scenes] ⚠️  فشل ${currentTextModel()}: ${e.message?.substring(0, 100)}`);
      advanceTextModel();
    }
  }
  throw new Error(`فشل توليد السكريبت بكل النماذج: ${lastError?.message}`);
}

// ─── 2) توليد الصور للمشاهد ────────────────────────────────────────────────
// ترتيب الأولوية: Pexels → Pollinations (AI مجاني) → Gemini Imagen → SVG
// ملاحظة: Gemini Imagen (Nano Banana) محجوب أحياناً بـ quota 429 — لهذا وضعنا
// Pollinations قبله (مجاني، بلا مفتاح، يولّد صورة 9:16 مخصصة لكل مشهد).
async function generatePollinationsImage(prompt, outputPath) {
  try {
    const cleanPrompt = String(prompt)
      .replace(/9:16|aspect|ratio|vertical|composition/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 350);
    const seed = Math.floor(Date.now() / 1000) % 100000;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1080&height=1920&nologo=true&seed=${seed}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10000) throw new Error('صورة صغيرة/فارغة');
    // إعادة تحجيم إلى 1080x1920 (مقاس TikTok) بجودة عالية
    try {
      // eslint-disable-next-line global-require
      const sharp = require('sharp');
      await sharp(buf).resize(1080, 1920, { fit: 'cover', position: 'centre' }).png().toFile(outputPath);
    } catch {
      fs.writeFileSync(outputPath, buf);
    }
    console.log(`[scenes] ✓ Pollinations: ${outputPath} (${Math.round(buf.length / 1024)} KB)`);
    return true;
  } catch (e) {
    console.warn(`[scenes] Pollinations فشل: ${e.message?.substring(0, 80)}`);
    return false;
  }
}

async function generateImage(prompt, outputPath) {
  // Pexels أولاً (لو فيه API key)
  if (process.env.PEXELS_API_KEY) {
    try {
      // eslint-disable-next-line global-require
      const { searchPhotos, downloadPhoto } = require('./pexels-fetcher.cjs');
      // بنحول الـ prompt لكلمات بحث (نشيل الكلمات الكثيرة)
      const query = String(prompt)
        .replace(/realistic|professional|photo|composition|high quality|9:16|none|watermarks|aspect|ratio/gi, '')
        .split(/[,\s]+/)
        .filter(w => w.length > 3 && w.length < 30)
        .slice(0, 4)
        .join(' ') || 'law office';
      const photos = await searchPhotos(query, { perPage: 1, orientation: 'portrait' });
      if (photos[0]) {
        const result = await downloadPhoto(photos[0], outputPath);
        console.log(`[scenes] ✓ Pexels: ${result.photographer} (${result.width}x${result.height})`);
        return true;
      }
    } catch (e) {
      console.warn(`[scenes] Pexels فشل: ${e.message?.substring(0, 80)}`);
    }
  }

  // Gemini Imagen (fallback)
  if (ai) {
    try {
      const resp = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: prompt,
      });
      // استخراج الصورة من الرد
      const parts = resp.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buf = Buffer.from(part.inlineData.data, 'base64');
          fs.writeFileSync(outputPath, buf);
          return true;
        }
      }
      throw new Error('مفيش صورة في الرد');
    } catch (e) {
      console.warn(`[scenes] Imagen فشل: ${e.message?.substring(0, 100)}`);
    }
  }
  return false;
}

// Fallback: SVG بسيط ملوّن يحوي النص — ثم نُحوّله PNG لأن ffmpeg-static مش بيدعم SVG
async function generateFallbackSvg(prompt, outputPath, text) {
  const colors = ['#1e3a8a', '#0e7490', '#7c2d12', '#581c87', '#365314'];
  const bg = colors[Math.floor(Math.random() * colors.length)];
  const safeText = escapeXml((text || 'منصة المحامي الرقمية').substring(0, 60));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#g)"/>
  <text x="540" y="900" font-family="Tahoma, Arial, sans-serif" font-size="90" font-weight="bold" fill="#fff" text-anchor="middle" direction="rtl">${safeText}</text>
  <text x="540" y="1100" font-family="Tahoma, Arial, sans-serif" font-size="60" fill="#fbbf24" text-anchor="middle">⚖️</text>
  <text x="540" y="1820" font-family="Arial" font-size="36" fill="#cbd5e1" text-anchor="middle" opacity="0.8">منصة المحامي الرقمية</text>
</svg>`;
  const svgPath = outputPath.replace(/\.png$/, '.svg');
  fs.writeFileSync(svgPath, svg);

  // حوّل لـ PNG باستخدام sharp (عشان ffmpeg-static ما عندوش SVG decoder)
  try {
    // eslint-disable-next-line global-require
    const sharp = require('sharp');
    await sharp(Buffer.from(svg), { density: 150 })
      .resize(1080, 1920)
      .png()
      .toFile(outputPath);
    return true;
  } catch (e) {
    console.warn(`[scenes] فشل تحويل SVG→PNG: ${e.message?.substring(0, 100)}`);
    return false;
  }
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function promptToKeywords(prompt) {
  return String(prompt)
    .replace(/realistic|professional|photo|video|cinematic|composition|high quality|9:16|none|watermarks|aspect|ratio|vertical/gi, ' ')
    .split(/[,\s]+/)
    .filter(w => w.length > 3 && w.length < 30)
    .slice(0, 4)
    .join(' ') || 'law office';
}

async function generateSceneImage(scene, outputDir) {
  const idx = String(scene.id).padStart(2, '0');
  const baseImagePath = path.join(outputDir, `scene-${idx}-base.png`);
  const compositedPath = path.join(outputDir, `scene-${idx}.png`);
  const prompt = `professional photo, vertical composition, 9:16 aspect ratio, ${scene.image_prompt || 'legal concept, modern, professional'}, high quality, no text, no watermarks`;

  console.log(`[scenes] مشهد ${scene.id} — توليد صورة بديلة...`);
  let ok = false;
  let imageStatus = 'svg-fallback';
  // 1) Pexels (لو فيه API key)
  if (process.env.PEXELS_API_KEY) ok = await generateImage(prompt, baseImagePath);
  if (ok) imageStatus = 'pexels';
  // 2) Pollinations — ذكاء اصطناعي مجاني
  if (!ok) ok = await generatePollinationsImage(prompt, baseImagePath);
  if (ok && imageStatus === 'svg-fallback') imageStatus = 'pollinations';
  // 3) Gemini Imagen (fallback ثانٍ)
  if (!ok && ai) ok = await generateImage(prompt, baseImagePath);
  if (ok && imageStatus === 'svg-fallback') imageStatus = 'imagen';
  // 4) SVG محلي (fallback أخير — فيه النص مدمج)
  if (!ok) {
    console.log(`[scenes] → fallback للمشهد ${scene.id} (SVG → PNG)`);
    await generateFallbackSvg(scene.image_prompt, baseImagePath, scene.on_screen_text);
  }

  // ─── دمج on_screen_text على الصورة (Arabic shaping صحيح) ────────────
  let finalImagePath = baseImagePath;
  if (scene.on_screen_text && ok) {
    try {
      // eslint-disable-next-line global-require
      const { burnTextOnImage } = require('./text-renderer.cjs');
      const compositedBuffer = await burnTextOnImage(
        baseImagePath,
        {
          text: scene.on_screen_text,
          fontSize: 64,
          color: '#ffffff',
          bgColor: 'rgba(0,0,0,0.75)',
          width: 1100,
          height: 180,
        },
        { x: 0, y: 0 }
      );
      fs.writeFileSync(compositedPath, compositedBuffer);
      finalImagePath = compositedPath;
    } catch (e) {
      console.warn(`[scenes] فشل دمج النص على الصورة: ${e.message?.substring(0, 80)}`);
    }
  }

  return { ...scene, imagePath: finalImagePath, imageStatus };
}

async function renderScenes(plan, opts = {}) {
  const outputDir = opts.outputDir || path.join(__dirname, 'output', 'images', `scene-${Date.now()}`);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const results = [];
  for (const scene of plan.scenes) {
    console.log(`[scenes] مشهد ${scene.id}/${plan.scenes.length} — توليد صورة...`);
    results.push(await generateSceneImage(scene, outputDir));
  }
  return results;
}

/**
 * عرض المشاهد كمقاطع فيديو حقيقية من Pexels (9:16، متحركة فعلية).
 * لو فشل فيديو مشهد معين → يتحول لصورة بديلة (لا يكسر السلسلة).
 */
async function renderVideoScenes(plan, opts = {}) {
  const outputDir = opts.outputDir || path.join(__dirname, 'output', 'videos', `scene-${Date.now()}`);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const { searchVideos, downloadVideo } = require('./pexels-fetcher.cjs');

  const results = [];
  for (const scene of plan.scenes) {
    const idx = String(scene.id).padStart(2, '0');
    const videoPath = path.join(outputDir, `scene-${idx}.mp4`);
    let ok = false;

    if (process.env.PEXELS_API_KEY) {
      try {
        const query = promptToKeywords(scene.image_prompt || '');
        const videos = await searchVideos(query, { perPage: 3, orientation: 'portrait' });
        // بنفضل فيديو مدته >= 5 ثواني عشان التقصير/التمديد يفضل طبيعي
        const vid = (videos || []).find(v => (v.duration || 0) >= 5) || videos[0];
        if (vid) {
          const result = await downloadVideo(vid, videoPath);
          console.log(`[scenes] ✓ مشهد ${scene.id}/${plan.scenes.length} — فيديو Pexels: ${result.width}x${result.height} (${result.duration}ث)`);
          results.push({ ...scene, videoPath, videoStatus: 'pexels-video' });
          ok = true;
        } else {
          throw new Error('لا فيديو مناسب في النتائج');
        }
      } catch (e) {
        console.warn(`[scenes] ⚠️ فيديو Pexels فشل للمشهد ${scene.id}: ${e.message?.substring(0, 80)}`);
      }
    } else {
      console.warn('[scenes] ⚠️ PEXELS_API_KEY غير متوفر — صور بديلة');
    }

    if (!ok) {
      console.log(`[scenes] → صورة بديلة للمشهد ${scene.id} (تعذّر الفيديو)`);
      results.push(await generateSceneImage(scene, outputDir));
    }
  }
  return results;
}

async function planScenes(topic, opts = {}) {
  const plan = await generateScript(topic, opts);
  console.log(`[scenes] ✓ تم توليد سكريبت: ${plan.scenes?.length || 0} مشاهد، ${plan.full_text?.length || 0} حرف`);
  return plan;
}

if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    console.log('استخدام: node scene-generator.cjs <topic.json|-\'json-...\'>');
    process.exit(1);
  }
  (async () => {
    try {
      let topic;
      if (arg.endsWith('.json') && fs.existsSync(arg)) {
        topic = JSON.parse(fs.readFileSync(arg, 'utf8'));
      } else {
        topic = JSON.parse(arg);
      }
      const plan = await planScenes(topic);
      console.log(JSON.stringify(plan, null, 2));
    } catch (e) {
      console.error('❌', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { planScenes, renderScenes, renderVideoScenes, generateScript };
