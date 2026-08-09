#!/usr/bin/env node
/**
 * generate-radar.cjs — توليد/تحديث صفحة «رصد المحامي» (legal-radar.html)
 *
 * آلية العمل اليومية:
 *   1. يجلب أهم ترندات Google لمصر (geo=EG) وللعالم (RSS بلا geo).
 *   2. يستخدم Gemini لاختيار «موضوعات اليوم» (عنوان + ملخص لكل موضوع).
 *   3. يولّد لكل موضوع مقالاً متعمقاً كاملاً (لا يقل عن 3000 كلمة) بواسطة
 *      بنداء منفصل لكل موضوع (مع استدعاء تمديد تلقائي لو نقص العدد).
 *   4. ينشر البطاقات (الملخص ظاهر، الموضوع الكامل يظهر عند فتح البطاقة)
 *      مع أرشيف آخر الأيام.
 *
 * ملاحظات:
 *   - الموضوعات تُولَّد مرة واحدة يومياً فقط (تُخزَّن في public/radar-archive.json
 *     ويُتجاهل لو اليوم موجود بالفعل) حتى لا تُستنزف حصة Gemini في الرنات
 *     المتكررة (الـ workflow يعمل حتى 5 مرات يومياً).
 *   - بدون GEMINI_API_KEY تتحول الصفحة لوضع عرض الترندات فقط (بدون موضوعات).
 *   - تُشغَّل تلقائياً في daily-blog-post.yml بعد الناشر الذكي.
 *
 * الاستخدام:
 *   GEMINI_API_KEY=... node scripts/seo/generate-radar.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
try {
  // eslint-disable-next-line global-require
  require('dotenv').config({ path: path.join(ROOT, '.env') });
} catch {}

const OUT_FILE = path.join(ROOT, 'public', 'legal-radar.html');
const ARCHIVE_FILE = path.join(ROOT, 'public', 'radar-archive.json');
const BASE_URL = 'https://mohamidigital.online';
const EG_FEED = 'https://trends.google.com/trending/rss?geo=EG';
const WORLD_FEED = 'https://trends.google.com/trending/rss';
const MAX_TRENDS = 10;
const MAX_TOPICS = 3;
const MIN_TOPIC_WORDS = 3000;
const MAX_ARCHIVE = 12;
const MAX_ARCHIVE_SHOWN = 7;
const AD_CLIENT = 'ca-pub-7725405859334364';
const AD_SLOT = '2168039898';
const MODELS = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.0-flash'];

let log = console.log;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cairoNow() {
  const d = new Date(Date.now() + 120 * 60000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function todayStr() {
  return new Date(Date.now() + 120 * 60000).toISOString().slice(0, 10);
}

// ─── جلب الترندات ───

async function fetchFeed(url, region) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; mohamidigital-radar/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const items = (text.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, MAX_TRENDS);
    const trends = items
      .map((item) => {
        const title = (item.match(/<title>(.*?)<\/title>/) || [])[1]?.trim();
        const traffic = (item.match(/ht_approx_traffic>([^<]+)</) || [])[1]?.trim();
        if (!title) return null;
        return { title, traffic, region };
      })
      .filter(Boolean);
    log(`[radar] ✅ ${region}: ${trends.length} ترنداً`);
    return trends;
  } catch (e) {
    log(`[radar] ⚠️ فشل جلب ترندات ${region}: ${e.message}`);
    return [];
  }
}

async function fetchTrends() {
  const [eg, world] = await Promise.all([fetchFeed(EG_FEED, 'مصر'), fetchFeed(WORLD_FEED, 'عالمي')]);
  const seen = new Set();
  const all = [...eg, ...world].filter((t) => {
    if (seen.has(t.title)) return false;
    seen.add(t.title);
    return true;
  });
  if (all.length) return all;

  // احتياط: بيانات الناشر الذكي
  try {
    const tf = path.join(ROOT, 'scripts', 'trending-topics.json');
    if (fs.existsSync(tf)) {
      const data = JSON.parse(fs.readFileSync(tf, 'utf8'));
      if (Array.isArray(data.topics)) {
        return data.topics.map((t) => ({ title: t.title || '', traffic: '', region: 'مصر' })).slice(0, MAX_TRENDS);
      }
    }
  } catch {}
  return [];
}

// ─── Gemini: اختيار موضوعات اليوم + توليد الموضوعات الكاملة ───

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractJson(text) {
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('لا يوجد JSON في رد Gemini');
  return JSON.parse(s.slice(start, end + 1));
}

function getAi() {
  try {
    // eslint-disable-next-line global-require
    const { GoogleGenAI } = require('@google/genai');
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    log('[radar] ⚠️ @google/genai غير متاح');
    return null;
  }
}

function isQuotaError(e) {
  const msg = String((e && e.message) || e);
  return e?.status === 429 || msg.includes('429') || msg.includes('Quota') || msg.includes('quota');
}

function buildTrendsList(trends) {
  return trends
    .map((t, i) => `${i + 1}. [${t.region}] ${t.title}${t.traffic ? ` (${t.traffic} بحث)` : ''}`)
    .join('\n');
}

function buildTopicsPrompt(trends) {
  const list = buildTrendsList(trends);
  return `أنت محرر نشرة «رصد المحامي» لموقع «منصة المحامي الرقمية» (مصري).

أهم الترندات الفعلية على Google اليوم (مصر + العالم):
${list}

اختر ${MAX_TOPICS} موضوعات هي الأهم بينها (الأكثر تأثيراً على المواطن المصري والمحامي، أو الأقرب للشأن القانوني والاقتصادي والاجتماعي) دون اختلاق صلة قانونية حين لا توجد.
لكل موضوع:
- slug: معرّف إنجليزي قصير بلا فراغات.
- title: عنوان جذاب يعكس الخبر/الموضوع.
- summary: ملخص للخبر في 2-3 جمل (60-90 كلمة) يلخص الحدث ولماذا يهم القارئ.
أعد الناتج JSON فقط بهذا الشكل الصارم:
{"topics":[{"slug":"...","title":"...","summary":"..."}]}`;
}

function buildTopicArticlePrompt(topic, trends) {
  const list = buildTrendsList(trends);
  return `أنت كاتب تحليلي قانوني مصري خبير، تكتب موضوعاً متعمقاً لصفحة «رصد المحامي».

الموضوع: ${topic.title}
ملخصه: ${topic.summary}
ترندات اليوم كسياق:
${list}

اكتب موضوعاً شاملاً عميقاً لا يقل عن ${MIN_TOPIC_WORDS} كلمة عربية (عدّ الكلمات بنفسك)، مرتّباً في 5-7 أقسام، كل قسم بعنوان فرعي قصير.
المطلوب في المحتوى:
- تغطية الخبر/الظاهرة من كل زاوية: الوقائع، السياق، الانعكاس القانوني (إن وُجد مع ذكر القانون والمادة بحذر ودون اختلاق أرقام)، الانعكاس الاقتصادي/الاجتماعي، آراء الخبراء، الأسئلة الشائعة، والتوقعات.
- كل قسم: 3-5 فقرات قصيرة (70-120 كلمة) سهلة القراءة، مع عدم كتابة قسم "الخلاصة" النهائية.
- أسلوب صحفي مهني محايد، عربي فصيح، بلا Markdown، بلا ترويسات.
أعد الناتج JSON فقط بهذا الشكل الصارم:
{"sections":[{"heading":"...","body":"..."}]}`;
}

function buildContinuePrompt(topic, currentWords) {
  return `موضوعك عن «${topic.title}» بلغ ${currentWords} كلمة ونحن بحاجة إلى ما لا يقل عن ${MIN_TOPIC_WORDS} كلمة.
أكمل التوسّع بإضافة أقسام وفقرات جديدة (زوايا وأمثلة وتفاصيل جديدة) دون تكرار ما سبق، ولا تكتب خاتمة نهائية.
أعد JSON فقط: {"sections":[{"heading":"...","body":"..."}]}`;
}

async function runGenText(ai, model, prompt, isQuota) {
  const result = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0.7, maxOutputTokens: 8192 },
  });
  const text = result?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text) throw new Error('رد فارغ');
  return text;
}

async function generateTopics(ai, trends) {
  const prompt = buildTopicsPrompt(trends);
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      log(`[radar] ✍️ اختيار موضوعات اليوم عبر Gemini (${model})...`);
      const text = await runGenText(ai, model, prompt);
      const data = extractJson(text);
      const topics = (data.topics || [])
        .slice(0, MAX_TOPICS)
        .map((t) => ({ slug: String(t.slug || '').replace(/[^\w-]/g, '-'), title: String(t.title || '').trim(), summary: String(t.summary || '').trim() }))
        .filter((t) => t.title);
      if (!topics.length) throw new Error('لا موضوعات في الرد');
      log(`[radar] ✅ اختير ${topics.length} موضوعات: ${topics.map((t) => t.title).join(' | ')}`);
      return topics;
    } catch (e) {
      log(`[radar] ⚠️ محاولة ${model} فشلت: ${e.message}`);
      if (isQuotaError(e)) await sleep(15000);
    }
  }
  return [];
}

function countTopicWords(sections) {
  return (sections || []).reduce((n, s) => n + String(s.body || '').trim().split(/\s+/).filter(Boolean).length, 0);
}

async function extendTopicArticle(ai, topic, currentWords) {
  const prompt = buildContinuePrompt(topic, currentWords);
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      const text = await runGenText(ai, model, prompt);
      const data = extractJson(text);
      if (Array.isArray(data.sections)) return data.sections;
    } catch (e) {
      log(`[radar] ⚠️ تمديد ${model} فشل: ${e.message}`);
      if (isQuotaError(e)) await sleep(15000);
    }
  }
  return null;
}

async function generateTopicArticle(ai, topic, trends) {
  const prompt = buildTopicArticlePrompt(topic, trends);
  let sections = [];
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      log(`[radar] ✍️ توليد موضوع «${topic.title}» عبر Gemini (${model})...`);
      const text = await runGenText(ai, model, prompt);
      const data = extractJson(text);
      if (Array.isArray(data.sections) && data.sections.length) {
        sections = data.sections;
        break;
      }
      throw new Error('بنية موضوع غير صالحة');
    } catch (e) {
      log(`[radar] ⚠️ محاولة ${model} فشلت: ${e.message}`);
      if (isQuotaError(e)) await sleep(15000);
    }
  }
  if (!sections.length) return null;
  let words = countTopicWords(sections);
  log(`[radar] ℹ️ «${topic.title}»: ${sections.length} قسم / ${words} كلمة`);
  if (words < MIN_TOPIC_WORDS) {
    log(`[radar] ✍️ تمديد «${topic.title}» للوصول إلى ${MIN_TOPIC_WORDS}+ كلمة...`);
    const extra = await extendTopicArticle(ai, topic, words);
    if (Array.isArray(extra) && extra.length) sections = sections.concat(extra);
    words = countTopicWords(sections);
  }
  log(`[radar] ✅ «${topic.title}»: ${sections.length} قسم / ${words} كلمة`);
  return { sections };
}

// ─── توليد صور البطاقات ───
// ترتيب المصادر: Pexels (صور ويب حقيقية بحقوق محفوظة) → Nano Banana → Pollinations → Unsplash.
// «اقتباس من الويب مع الحفاظ على حقوق النشر»: Pexels يمنح ترخيصاً مجانياً للاستخدام،
// ونُضيف دائماً سطر نسبة (photographer) على الصورة.

const IMAGE_MODEL = 'gemini-2.5-flash-image'; // Nano Banana
const RADAR_IMAGES_DIR = path.join(ROOT, 'public', 'radar-images');
const IMG_FALLBACK = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&h=675&q=80';

// خريطة كلمات عربية → كلمات بحث إنجليزية (Pexels + السياق البصري لـ AI)
const KEYWORD_MAP = [
  { terms: ['تصالح', 'تقنين', 'ترخيص', 'بناء', 'عقار', 'إعمار', 'مخالفات', 'وحدات سكنية', 'عقاري', 'أراضي', 'أبنية'], en: 'construction site building crane engineers blueprint' },
  { terms: ['محاكمة', 'جناية', 'مدان', 'حكم', 'قضائي', 'مستأنف', 'نيابة', 'توقيف', 'حبس', 'سجن', 'محكمة', 'قضايا'], en: 'courtroom gavel scales of justice trial' },
  { terms: ['إلكتروني', 'رقمي', 'حكومي', 'تطبيقات', 'إنترنت', 'تكنولوجيا', 'ذكاء اصطناعي', 'رقمنة', 'خدمات', 'تحول رقمي'], en: 'smartphone online services digital technology' },
  { terms: ['اقتصاد', 'أسعار', 'تضخم', 'بورصة', 'عملة', 'دولار', 'جنيه', 'مالية', 'ميزانية', 'ضرائب', 'ضريبة', 'بنك'], en: 'stock market finance charts banking money' },
  { terms: ['صحة', 'دواء', 'مستشفى', 'علاج', 'طبي', 'لقاح', 'تأمين صحي'], en: 'doctor hospital healthcare medicine' },
  { terms: ['تعليم', 'مدرسة', 'جامعة', 'طلاب', 'امتحانات', 'دراسة'], en: 'university students classroom education' },
  { terms: ['طاقة', 'نفط', 'غاز', 'كهرباء', 'بترول', 'طاقة متجددة', 'وقود'], en: 'power plant electricity solar panels energy' },
  { terms: ['سياحة', 'سفر', 'آثار', 'فنادق'], en: 'egypt pyramids tourism travel' },
  { terms: ['زراعة', 'غذاء', 'محاصيل', 'قمح', 'تموين'], en: 'wheat field agriculture farming' },
  { terms: ['نقل', 'طرق', 'مواصلات', 'قطار', 'مترو', 'كبري', 'أنفاق'], en: 'railway metro train highway transport' },
  { terms: ['أمن', 'جريمة', 'شرطة', 'إرهاب', 'أمن قومي'], en: 'police security officer patrol' },
  { terms: ['عدالة', 'حقوق', 'دستور', 'قانون', 'تشريع', 'لائحة'], en: 'law books justice scales legislation' },
  { terms: ['عمل', 'وظائف', 'توظيف', 'مرتبات', 'عمالة', 'بطالة'], en: 'office employees work meeting jobs' },
  { terms: ['أسرة', 'زواج', 'طلاق', 'حضانة', 'ميراث', 'ولاية'], en: 'egyptian family home' },
  { terms: ['تجارة', 'أعمال', 'استثمار', 'شركات', 'مشاريع', 'صناعة'], en: 'business skyscrapers investment industry' },
  { terms: ['سيارات', 'مركبات', 'توك توك', 'نقل بري'], en: 'cars highway traffic vehicles' },
  { terms: ['بيئة', 'مناخ', 'تلوث', 'مياه', 'ري', 'نهر النيل'], en: 'nile river water environment nature' },
  { terms: ['رياضة', 'كرة', 'أولمبياد', 'دوري', 'كأس'], en: 'football stadium soccer match' },
  { terms: ['فن', 'سينما', 'مسلسلات', 'ثقافة', 'موسيقى'], en: 'cinema theater culture arts' },
  { terms: ['فضاء', 'أقمار', 'صاروخ', 'وكالة فضاء'], en: 'space rocket satellite astronomy' },
];

function topicSearchKeywords(topic) {
  const text = `${topic.title || ''} ${topic.summary || ''}`;
  let best = 'newspaper newsroom reporter office';
  let bestScore = 0;
  for (const r of KEYWORD_MAP) {
    let score = 0;
    for (const t of r.terms) if (text.includes(t)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = r.en;
    }
  }
  return best;
}

// مشهد تفصيلي (بالعربية) لكل سياق — لصورة AI معبّرة عن جوهر الموضوع
const SCENE_MAP = {
  'construction site building crane engineers blueprint': 'موقع بناء مصري بأبراج سكنية ورافعات، مهندسون يفحصون مخططات وملفات ترخيص وبناء حديث، إضاءة شفقية دافئة',
  'courtroom gavel scales of justice trial': 'قاعة محكمة رسمية بميزان العدالة ومطرقة خشبية، طاولة قاضٍ ومنصة دفاع وملفات قضايا، إضاءة سينمائية',
  'smartphone online services digital technology': 'مواطن يستخدم تطبيقاً حكومياً على هاتف ذكي، شاشات بيانات رقمية وأيقونات خدمات حكومية، مكتب عصري بإضاءة زرقاء',
  'stock market finance charts banking money': 'مباني بنوك وبورصة، رسوم بيانية مالية على شاشات، عملات وصناديق استثمار، أجواء أعمال حديثة',
  'doctor hospital healthcare medicine': 'مستشفى حديث، طبيب بمعطف أبيض وتقارير طبية، أدوات طبية، ألوان هادئة',
  'university students classroom education': 'جامعة وقاعة محاضرات، طلاب ومراجع قانونية، مكتبة جامعية',
  'power plant electricity solar panels energy': 'محطات طاقة وأبراج كهرباء وتوربينات، ألواح شمسية، حقول نفط وغاز',
  'egypt pyramids tourism travel': 'معالم مصرية وأهرامات، سائحون وفنادق، أجواء رحلة سياحية',
  'wheat field agriculture farming': 'حقول قمح ومحاصيل خضراء، معدات زراعية، صوامع تموين',
  'railway metro train highway transport': 'قطار ومترو وجسور وطرق سريعة حديثة، حركة نقل',
  'police security officer patrol': 'ضباط شرطة ودورية أمنية، أضواء تحذيرية، مفاهيم حماية وأمان',
  'law books justice scales legislation': 'كتب قانون ودستور، ميزان عدالة وقلم، أوراق رسمية وتشريعات',
  'office employees work meeting jobs': 'مكاتب عمل حديثة، موظفون في اجتماع، عقود توظيف وحواسيب',
  'egyptian family home': 'أسرة مصرية في أجواء هادئة، أوراق رسمية ومحكمة أسرة، مفهوم الأسرة والقانون',
  'business skyscrapers investment industry': 'أبراج أعمال ومصانع، صفقات استثمارية، حافلات شحن وتجارة',
  'cars highway traffic vehicles': 'سيارات حديثة وطرق ومواقف، إشارات مرور',
  'nile river water environment nature': 'مياه نهر النيل وطبيعة خضراء، بيئة نظيفة ومفاهيم تغير مناخي',
  'football stadium soccer match': 'ملعب كرة قدم وترتيبات مباراة، جماهير',
  'cinema theater culture arts': 'مسرح وسينما وفنون، أضواء استعراضية',
  'space rocket satellite astronomy': 'فضاء وصواريخ وأقمار صناعية، مشاهد نجوم',
  'newspaper newsroom reporter office': 'مكتب أخبار حديث، جريدة وشاشات تقارير، إضاءة مكتبية',
};

function buildImagePrompt(topic) {
  const kw = topicSearchKeywords(topic);
  const scene = SCENE_MAP[kw] || SCENE_MAP['newspaper newsroom reporter office'];
  return `صورة تحريرية احترافية (editorial photography) واقعية عالية الجودة 4K تعبّر بدقة عن هذا الموضوع المصري:
العنوان: ${topic.title}
الملخص: ${topic.summary}
المشهد المطلوب: ${scene}
السياق البصري: ${kw}
الأسلوب: ألوان داكنة أنيقة (كحلي/رمادي) مع لمسات إضاءة سينمائية، تفاصيل دقيقة، بلا أي نصوص أو حروف أو شعارات أو علامات مائية في الصورة.`;
}

async function downloadImage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10000) throw new Error('صورة صغيرة/فارغة');
  return buf;
}

// 1) Pexels — بحث بالكلمات الإنجليزية عن صورة حقيقية مطابقة للموضوع (ترخيص مجاني + نسبة للمصوّر)
async function fetchPexels(topic) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;
  try {
    const query = topicSearchKeywords(topic);
    const params = new URLSearchParams({ query, per_page: '5', orientation: 'landscape', size: 'medium' });
    const resp = await fetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: apiKey } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const photo = (data.photos || [])[0];
    if (!photo?.src) throw new Error('لا نتائج');
    const url = photo.src.large2x || photo.src.landscape || photo.src.large;
    if (!url) throw new Error('بلا src');
    const buf = await downloadImage(url);
    log(`[radar] 🖼️ Pexels: «${query}» ← ${photo.photographer || 'Pexels'} (${Math.round(buf.length / 1024)} KB)`);
    return { buf, credit: `📷 ${photo.photographer || 'Pexels'} — Pexels` };
  } catch (e) {
    log(`[radar] ⚠️ Pexels فشل: ${String((e && e.message) || e).slice(0, 70)}`);
    return null;
  }
}

async function generateTopicImage(ai, topic) {
  // 1) Nano Banana — صورة مخصصة أصلية (بلا حقوق نشر) بمشهد تفصيلي يعبّر عن الموضوع تحديداً
  if (ai) {
    try {
      const imagePrompt = buildImagePrompt(topic);
      const resp = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ text: imagePrompt }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: { aspectRatio: '16:9', imageSize: '1K' },
        },
      });
      const parts = resp.candidates?.[0]?.content?.parts || [];
      const img = parts.find((p) => p.inlineData && p.inlineData.data);
      if (img) {
        const buf = Buffer.from(img.inlineData.data, 'base64');
        if (buf.length >= 5000) {
          log(`[radar] 🖼️ Nano Banana: صورة مخصصة لـ«${topic.title}»`);
          return { buf, credit: null };
        }
      }
      log('[radar] ⚠️ Nano Banana لم يرجِع صورة — ننتقل للبدائل');
    } catch (e) {
      log(`[radar] ⚠️ ${IMAGE_MODEL} فشل: ${String((e && e.message) || e).slice(0, 90)}`);
    }
  }
  // 2) Pexels — صور ويب حقيقية (ترخيص مجاني + نسبة للمصوّر)
  const pexels = await fetchPexels(topic);
  if (pexels) return pexels;
  // 3) Pollinations (ذكاء مجاني)
  try {
    const enPrompt = `${topic.title}. ${topic.summary}. Egyptian legal topic, professional editorial photography, high quality, sharp, no text, no words, no letters`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enPrompt)}?width=1200&height=675&nologo=true&seed=${Date.now() % 100000}`;
    return { buf: await downloadImage(url), credit: null };
  } catch (e) {
    log(`[radar] ⚠️ Pollinations فشل: ${String((e && e.message) || e).slice(0, 70)}`);
  }
  // 4) Unsplash عام (قانون) — حل أخير
  try {
    return { buf: await downloadImage(IMG_FALLBACK), credit: null };
  } catch (e) {
    log(`[radar] ⚠️ Unsplash فشل: ${String((e && e.message) || e).slice(0, 70)}`);
  }
  return null;
}

async function saveTopicImage(buf, topic, date) {
  if (!buf) return null;
  try {
    const dir = path.join(RADAR_IMAGES_DIR, date);
    fs.mkdirSync(dir, { recursive: true });
    const slug = (topic.slug || topic.title || 'topic').replace(/[^\w-]/g, '-');
    // eslint-disable-next-line global-require
    const sharp = require('sharp');
    const out = await sharp(buf).resize(1200, 675, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const file = path.join(dir, `${slug}.jpg`);
    fs.writeFileSync(file, out);
    // ?v=hash يجبر المتصفح/CDN على جلب الصورة الجديدة عند تغيّر محتواها (كسر الكاش)
    const v = require('crypto').createHash('sha1').update(out).digest('hex').slice(0, 10);
    const url = `/radar-images/${date}/${slug}.jpg?v=${v}`;
    log(`[radar] 🖼️ صورة «${topic.title}»: ${url} (${Math.round(out.length / 1024)} KB)`);
    return url;
  } catch (e) {
    log(`[radar] ⚠️ حفظ الصورة فشل: ${String((e && e.message) || e).slice(0, 70)}`);
    return null;
  }
}

// ─── الأرشيف ───

function loadArchive() {
  try {
    if (fs.existsSync(ARCHIVE_FILE)) {
      const data = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
      if (Array.isArray(data.articles)) return data.articles;
    }
  } catch (e) {
    log(`[radar] ⚠️ أرشيف تالف — نبدأ من جديد: ${e.message}`);
  }
  return [];
}

function saveArchive(articles) {
  const data = {
    baseUrl: BASE_URL,
    updatedAt: cairoNow(),
    articles: articles.slice(0, MAX_ARCHIVE),
  };
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── البناء ───

function buildTopicCard(t, i) {
  const sections = t.sections || [];
  const full = sections.length
    ? sections
        .map(
          (s) => `<div class="full-sec">
        <h4>${esc(s.heading)}</h4>
        ${String(s.body || '')
          .split(/\n+/)
          .map((p) => `<p>${esc(p.trim())}</p>`)
          .join('\n        ')}
      </div>`
        )
        .join('\n    ')
    : '<div class="full-sec full-empty"><p>🕐 المحتوى الكامل لهذا الموضوع قيد التوليد — سيظهر تلقائياً في التحديث القادم.</p></div>';
  const words = countTopicWords(sections);
  const img = t.image
    ? `<img class="topic-img" src="${esc(t.image)}" alt="${esc(t.title)}" loading="lazy" width="1200" height="675" />`
    : '';
  const credit = t.imageCredit ? `<span class="img-credit">${esc(t.imageCredit)}</span>` : '';
  const hint = words > 0
    ? `📖 اضغط لعرض الموضوع الكامل (${words.toLocaleString('ar-EG')} كلمة)`
    : '📖 اضغط لعرض الموضوع الكامل';
  return `<details class="topic-card" id="topic-${i + 1}">
    <summary class="topic-summary">
      ${img}
      ${credit}
      <div class="topic-head">
        <span class="topic-num">${String(i + 1).padStart(2, '0')}</span>
        <div class="topic-body">
          <h3>${esc(t.title)}</h3>
          <p>${esc(t.summary || '')}</p>
          <span class="topic-hint">${hint}</span>
        </div>
      </div>
    </summary>
    <div class="topic-full">
      ${full}
    </div>
  </details>`;
}

function buildToday(topics, date) {
  if (!topics || !topics.length) return '';
  const cards = topics.map(buildTopicCard).join('\n    ');
  return `<div class="section">
    <div class="section-title"><span class="dot"></span> موضوعات اليوم (${esc(date)})</div>
    <div class="topic-grid">
    ${cards}
    </div>
  </div>`;
}

function normalizeEntryTopics(e) {
  if (Array.isArray(e?.topics) && e.topics.length) return e.topics;
  if (e?.article) {
    return [
      {
        title: e.article.title || 'مقال اليوم',
        summary: e.article.intro || '',
        sections: e.article.sections || [],
        image: null,
      },
    ];
  }
  return [];
}

function buildArchive(entries) {
  if (!entries.length) return '';
  const details = entries
    .map((e) => {
      const topics = normalizeEntryTopics(e);
      const inner = topics
        .map((t, i) => buildTopicCard({ ...t }, i))
        .join('\n    ');
      return `<details class="arch-item">
    <summary>${esc(e.date)} — ${esc((e.topics?.[0]?.title) || (e.article?.title) || 'موضوعات اليوم')}</summary>
    <div class="arch-body">
      ${inner}
    </div>
  </details>`;
    })
    .join('\n  ');
  return `<div class="archive">
    <div class="section-title"><span class="dot dot-cyan"></span> أرشيف الأيام الأخيرة</div>
    <p class="section-sub">موضوعات رصد المحامي السابقة — اضغط على أي يوم ثم على أي بطاقة لقراءة موضوعه كاملاً.</p>
    ${details}
  </div>`;
}

function buildPage(todayTopics, archiveEntries, generatedAt) {
  const todayHtml = buildToday(todayTopics, todayStr());
  const archiveHtml = buildArchive(archiveEntries);
  const nowISO = new Date(Date.now() + 120 * 60000).toISOString();
  const headline = todayTopics?.[0]?.title || 'رصد المحامي — موضوعات اليوم';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>رصد المحامي</title>
  <meta name="description" content="رصد المحامي — نشرة يومية تحليلية لأهم الترندات المصرية والعالمية على Google، بصياغة تحليلية عملية للمواطن والمحامي المصري." />
  <meta name="keywords" content="رصد المحامي, ترندات مصر, أخبار مصر اليوم, الأكثر بحثاً, ترند جوجل مصر, أخبار عربية, أخبار عالمية, تحليل ترندات" />
  <meta name="author" content="منصة المحامي الرقمية" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${BASE_URL}/legal-radar.html" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="رصد المحامي" />
  <meta property="og:description" content="نشرة يومية تحليلية لأهم الترندات المصرية والعالمية على Google." />
  <meta property="og:url" content="${BASE_URL}/legal-radar.html" />
  <meta property="og:site_name" content="منصة المحامي الرقمية" />
  <meta property="og:locale" content="ar_EG" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}" crossorigin="anonymous"></script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}","logo":"${BASE_URL}/logo.png"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"${esc(headline)}","datePublished":"${nowISO}","dateModified":"${nowISO}","inLanguage":"ar-EG","author":{"@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"publisher":{"@type":"Organization","name":"منصة المحامي الرقمية","url":"${BASE_URL}"},"mainEntityOfPage":"${BASE_URL}/legal-radar.html"}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"الرئيسية","item":"${BASE_URL}"},{"@type":"ListItem","position":2,"name":"رصد المحامي","item":"${BASE_URL}/legal-radar.html"}]}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f172a;
      --border: rgba(148,163,184,0.12);
      --indigo: #6366f1;
      --purple: #7c3aed;
      --emerald: #10b981;
      --rose: #f43f5e;
      --cyan: #06b6d4;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --card-bg: rgba(15,23,42,0.7);
    }
    html { scroll-behavior: smooth; scroll-padding-top: 90px; }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.8;
      background-image:
        radial-gradient(ellipse at 30% 0%, rgba(124,58,237,0.18) 0%, transparent 55%),
        radial-gradient(ellipse at 90% 70%, rgba(16,185,129,0.1) 0%, transparent 50%);
    }

    nav { position: sticky; top: 0; z-index: 100; background: rgba(15,23,42,0.82); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .logo-icon { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, var(--indigo), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 20px rgba(99,102,241,0.35); }
    .logo-name { font-size: 15px; font-weight: 900; color: #fff; line-height: 1.2; }
    .logo-sub { font-size: 10px; color: var(--emerald); font-weight: 700; }
    .nav-links { display: flex; align-items: center; gap: 28px; }
    .nav-links a { font-size: 13px; font-weight: 700; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--indigo); }
    .nav-cta { padding: 9px 22px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), var(--purple)); color: #fff; font-size: 12px; font-weight: 900; text-decoration: none; box-shadow: 0 4px 16px rgba(99,102,241,0.3); }

    .breadcrumbs { max-width: 1200px; margin: 0 auto; padding: 14px 24px 0; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .breadcrumbs a { color: var(--muted); text-decoration: none; transition: color 0.2s; font-weight: 700; }
    .breadcrumbs a:hover { color: var(--indigo); }
    .breadcrumbs .current { color: var(--text); font-weight: 800; }
    .breadcrumbs .sep { color: var(--muted); opacity: 0.4; font-size: 10px; }

    .hero { max-width: 860px; margin: 0 auto; padding: 50px 24px 28px; text-align: center; }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; border-radius: 999px; background: rgba(244,63,94,0.12); border: 1px solid rgba(244,63,94,0.3); color: #fda4af; font-size: 11px; font-weight: 800; margin-bottom: 20px; }
    .hero h1 { font-size: clamp(1.9rem, 5vw, 3.1rem); font-weight: 900; line-height: 1.25; margin-bottom: 16px; background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 50%, #fda4af 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 16px; color: var(--muted); max-width: 640px; margin: 0 auto; font-weight: 600; }
    .updated { display: inline-block; margin-top: 16px; padding: 6px 16px; border-radius: 999px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #6ee7b7; font-size: 11px; font-weight: 800; }

    .section { max-width: 900px; margin: 0 auto; padding: 0 24px 40px; }
    .section-title { font-size: 20px; font-weight: 900; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 10px; }
    .section-title .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--rose); box-shadow: 0 0 14px rgba(244,63,94,0.7); animation: pulse 2s infinite; }
    .section-title .dot-cyan { background: var(--cyan); box-shadow: 0 0 14px rgba(6,182,212,0.7); }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.35)} }
    .section-sub { font-size: 13px; color: var(--muted); margin-bottom: 22px; }

    .article { max-width: 900px; margin: 0 auto; padding: 0 24px 40px; }

    .topic-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 48px; align-items: stretch; }
    .topic-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 22px; overflow: hidden; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s; display: flex; flex-direction: column; }
    .topic-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.4); box-shadow: 0 16px 48px rgba(0,0,0,0.25); }
    .topic-card[open] { border-color: rgba(99,102,241,0.5); }
    .topic-summary { list-style: none; cursor: pointer; display: flex; flex-direction: column; flex: 1; }
    .topic-summary::-webkit-details-marker { display: none; }
    .topic-img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .img-credit { display: block; font-size: 10px; color: rgba(148,163,184,0.55); padding: 6px 20px 0; }
    .topic-head { display: flex; flex-direction: column; padding: 16px 20px 18px; flex: 1; }
    .topic-num { font-size: 11px; font-weight: 800; color: var(--indigo); margin-bottom: 8px; letter-spacing: 0.5px; }
    .topic-body h3 { font-size: 15.5px; font-weight: 900; color: #fff; line-height: 1.5; margin-bottom: 8px; }
    .topic-body p { font-size: 12.5px; color: var(--muted); line-height: 1.7; margin-bottom: 14px; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .topic-hint { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; color: var(--indigo); }
    .topic-card[open] .topic-hint::after { content: " ▲"; font-size: 9px; }
    .topic-card:not([open]) .topic-hint::after { content: " ▼"; font-size: 9px; }
    .topic-full { padding: 8px 22px 22px; border-top: 1px dashed var(--border); margin-top: 4px; }
    .full-sec { padding: 16px 0 4px; }
    .full-sec h4 { font-size: 16px; font-weight: 900; color: #fda4af; margin-bottom: 10px; }
    .full-sec p { font-size: 14.5px; color: #e2e8f0; margin-bottom: 12px; line-height: 1.9; }
    .full-empty { border-top: none !important; text-align: center; }
    .full-empty p { color: var(--muted); font-size: 13px; margin: 8px 0; }

    .archive { max-width: 900px; margin: 0 auto; padding: 0 24px 56px; }
    .arch-item { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
    .arch-item summary { cursor: pointer; padding: 15px 20px; font-size: 14px; font-weight: 800; color: #e2e8f0; list-style: none; display: flex; align-items: center; gap: 10px; transition: color 0.2s; }
    .arch-item summary:hover { color: #a5b4fc; }
    .arch-item summary::before { content: "◀"; font-size: 10px; color: var(--cyan); transition: transform 0.2s; }
    .arch-item[open] summary::before { transform: rotate(-90deg); }
    .arch-body { padding: 0 22px 18px; font-size: 14px; color: #cbd5e1; border-top: 1px dashed var(--border); padding-top: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; }
    .arch-body > p { margin-bottom: 10px; }
    .arch-sec { margin-top: 14px; }
    .arch-sec h4 { font-size: 14px; font-weight: 900; color: #fda4af; margin-bottom: 6px; }

    .ad-slot { margin: 28px auto; max-width: 100%; text-align: center; min-height: 90px; }
    .ad-label { display: block; font-size: 10px; color: var(--muted); text-align: center; margin-bottom: 6px; letter-spacing: 0.5px; font-weight: 700; }

    .cta-section { text-align: center; padding: 0 24px 64px; }
    .cta-btn { display: inline-flex; align-items: center; gap: 10px; padding: 15px 44px; border-radius: 14px; background: linear-gradient(135deg, var(--emerald), #0891b2, var(--indigo)); color: #fff; font-size: 14px; font-weight: 900; text-decoration: none; box-shadow: 0 8px 32px rgba(16,185,129,0.25); }

    footer { border-top: 1px solid var(--border); background: rgba(15,23,42,0.95); padding: 56px 24px 32px; }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 36px; }
    .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .footer-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .footer-logo-name { font-size: 15px; font-weight: 900; color: #fff; }
    .footer-desc { font-size: 12px; color: var(--muted); line-height: 1.8; max-width: 280px; }
    .footer-email { font-size: 12px; color: var(--indigo); margin-top: 10px; font-weight: 700; }
    .footer-email a { color: var(--indigo); text-decoration: none; }
    .footer-col h4 { font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 14px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
    .footer-col ul a { font-size: 12px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .footer-col ul a:hover { color: var(--indigo); }
    .footer-bottom { border-top: 1px solid rgba(148,163,184,0.08); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(148,163,184,0.5); }

    @media (max-width: 980px) { .topic-grid { grid-template-columns: 1fr 1fr; } .arch-body { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 620px) { .topic-grid { grid-template-columns: 1fr; } .arch-body { grid-template-columns: 1fr; } .topic-img { height: 190px; } }
    @media (max-width: 760px) { .footer-grid { grid-template-columns: 1fr; gap: 28px; } .nav-links { display: none; } }
  </style>
</head>
<body>
  <nav>
    <div class="nav-inner">
      <a href="/" class="nav-logo">
        <div class="logo-icon">⚖️</div>
        <div>
          <div class="logo-name">منصة المحامي الرقمية</div>
          <div class="logo-sub">مجاني 100% • نظام إدارة مكاتب المحاماة</div>
        </div>
      </a>
      <div class="nav-links">
        <a href="/">الرئيسية</a>
        <a href="/features.html">المميزات</a>
        <a href="/blog/">المدونة</a>
        <a href="/legal-forms.html">صيغ العقود والدعاوي</a>
        <a href="/contact.html">تواصل معنا</a>
      </div>
      <a href="/" class="nav-cta">دخول المنصة مجاناً 🚀</a>
    </div>
  </nav>
  <nav class="breadcrumbs" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span class="sep">›</span><span class="current">رصد المحامي</span></nav>

  <div class="hero">
    <div class="badge">📡 نشرة يومية — ترندات مصر والعالم</div>
    <h1>رصد المحامي</h1>
    <p>نشرة يومية تُصاغ بالذكاء الاصطناعي عن أهم الترندات المصرية والعالمية على Google، بتحليل عملي للمواطن والمحامي.</p>
    <span class="updated">آخر تحديث: ${esc(generatedAt)} بتوقيت القاهرة</span>
  </div>

  ${todayHtml}

  <!-- TOP AD -->
  <div class="ad-slot" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  ${archiveHtml}

  <div class="cta-section">
    <a href="/" class="cta-btn">جرّب منصة المحامي الرقمية مجاناً 🚀</a>
  </div>

  <footer>
    <div class="footer-inner">
      <div class="footer-grid">
        <div>
          <div class="footer-logo">
            <div class="footer-logo-icon">⚖️</div>
            <span class="footer-logo-name">منصة المحامي الرقمية</span>
          </div>
          <p class="footer-desc">النظام البرمجي المتكامل والمجاني لإدارة مكاتب المحاماة في جمهورية مصر العربية.</p>
          <p class="footer-email">التواصل: <a href="mailto:ahmdmansoor222@gmail.com">ahmdmansoor222@gmail.com</a></p>
        </div>
        <div class="footer-col">
          <h4>أقسام المنصة</h4>
          <ul>
            <li><a href="/">الرئيسية</a></li>
            <li><a href="/about.html">عن المنصة</a></li>
            <li><a href="/features.html">المميزات</a></li>
            <li><a href="/blog/">المدونة القانونية</a></li>
            <li><a href="/pillars/">المراجع القانونية</a></li>
            <li><a href="/legal-forms.html">صيغ العقود والدعاوي</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>السياسات والتواصل</h4>
          <ul>
            <li><a href="/legal-radar.html">رصد المحامي</a></li>
            <li><a href="/privacy.html">سياسة الخصوصية</a></li>
            <li><a href="/terms.html">شروط الاستخدام</a></li>
            <li><a href="/contact.html">تواصل معنا</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 منصة المحامي الرقمية — جميع الحقوق محفوظة</span>
        <span>محتوى تحليلي استرشادي — يُراجع مع مختص قبل الاعتماد عليه</span>
      </div>
    </div>
  </footer>

  <script>
    (function() {
      try {
        var p = new URLSearchParams(window.location.search);
        if (p.get('from') === 'app') {
          var cta = document.querySelector('.nav-cta');
          if (cta) { cta.innerHTML = '← العودة إلى لوحة التحكم'; cta.setAttribute('href', '/'); }
        }
      } catch(e) {}
    })();
  </script>
</body>
</html>
`;
}

// ─── المدخل الرئيسي ───

async function main() {
  const generatedAt = cairoNow();
  const today = todayStr();

  // 1) جلب الترندات
  const freshTrends = await fetchTrends();
  if (!freshTrends.length) {
    log('[radar] ⚠️ لا توجد بيانات ترندات متاحة — لن تُحدَّث الصفحة.');
    process.exit(0);
  }

  // 2) الأرشيف
  const articles = loadArchive();
  let todayEntry = articles.find((e) => e.date === today);

  // 2.5) تحديث صور اليوم فقط (بلا إعادة توليد النصوص) — لاستبدال الصور المولّدة بصور ويب حقيقية من Pexels
  const refreshImages = process.argv.includes('--refresh-images') || process.env.REFRESH_IMAGES === '1';
  if (refreshImages && todayEntry?.topics?.length) {
    const ai = getAi();
    for (const t of todayEntry.topics) {
      const img = await generateTopicImage(ai, t);
      const imgUrl = await saveTopicImage(img?.buf, t, today);
      if (imgUrl) {
        t.image = imgUrl;
        t.imageCredit = img?.credit || null;
      }
      await sleep(1500);
    }
    saveArchive(articles);
    log('[radar] 🖼️ --refresh-images: تم تحديث صور بطاقات اليوم (Pexels أولاً)');
  }

  // 3) موضوعات اليوم (مرة واحدة فقط في اليوم) — مقال كامل + صورة لكل بطاقة
  if (!todayEntry && process.env.GEMINI_API_KEY) {
    const ai = getAi();
    if (ai) {
      const topics = await generateTopics(ai, freshTrends);
      if (topics.length) {
        const full = [];
        for (const t of topics) {
          const article = await generateTopicArticle(ai, t, freshTrends);
          const img = await generateTopicImage(ai, t);
          const imgUrl = await saveTopicImage(img?.buf, t, today);
          full.push({ ...t, sections: article ? article.sections : [], image: imgUrl, imageCredit: img?.credit || null });
          await sleep(2000);
        }
        if (full.length) {
          todayEntry = { date: today, generatedAt, topics: full, trends: freshTrends };
          articles.unshift(todayEntry);
          saveArchive(articles);
        }
      }
    }
  }

  const archiveEntries = articles.filter((e) => e.date !== today).slice(0, MAX_ARCHIVE_SHOWN);

  // 4) بناء الصفحة
  const html = buildPage(todayEntry?.topics || [], archiveEntries, generatedAt);
  fs.writeFileSync(OUT_FILE, html, 'utf8');

  const topicStatus = todayEntry?.topics?.length
    ? `${todayEntry.topics.length} بطاقات (${todayEntry.topics.map((t) => t.title).join(' | ')})`
    : process.env.GEMINI_API_KEY
      ? 'لا موضوعات (فشل التوليد)'
      : 'بدون GEMINI_API_KEY';
  log(`[radar] ✅ تم توليد ${OUT_FILE} (${topicStatus} | أرشيف ${archiveEntries.length} يوم)`);
}

main().catch((e) => {
  console.error('[radar] ❌ خطأ:', e.message);
  process.exit(0);
});
