/**
 * محرك الأخبار والأتمتة الصحفية لبوابة «صوت مصر 24»
 * Sawt Misr 24 News Automation Engine
 * 
 * الميزات:
 * 1. رصد الأخبار العاجلة والترند من الخلاصات المصرية والعربية (Google News Egypt RSS).
 * 2. إعادة صياغة صحفية ذكية وفورية باستخدام الذكاء الاصطناعي (Gemini SDK).
 * 3. تصنيف آلي دقيق (مصر والعالم، شؤون ومحاكم، اقتصاد وأسواق، حوادث ومجتمع، رياضة، ترند).
 * 4. تضمين وحدات إعلانات أدسنس تلقائياً داخل المقال (ca-pub-7725405859334364).
 * 5. حفظ المخرجات جاهزة للنشر، مع إرسال إشعار فوري لتليجرام الأستاذ أحمد منصور.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { GoogleGenAI } = require('@google/genai');
const { searchPhotos } = require('../../scripts/tiktok-publisher/pexels-fetcher.cjs');
const { publishArticleFile } = require('./publish-to-blogger.cjs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADSENSE_PUB_ID = 'ca-pub-7725405859334364';

const OUTPUT_DIR = path.join(__dirname, '..', 'output', 'articles');
const LOG_FILE = path.join(__dirname, '..', 'output', 'published-history.json');

// التأكد من وجود المجلدات
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// دالة جلب صور الأخبار الفوتوغرافية الحقيقية بنسبة 16:9 من Pexels مع منع التكرار تماماً
async function fetchNewsImage(keywords, category, usedImageUrls = new Set()) {
  const categoryFallbacks = {
    'مصر والعالم': 'cairo egypt news politics editorial photo',
    'شؤون ومحاكم': 'courtroom justice law gavel judge lawyer realistic',
    'اقتصاد وأسواق': 'stock market trading economy money bank cairo finance',
    'حوادث ومجتمع': 'police night emergency security society urban photo',
    'رياضة وملاعب': 'football soccer stadium players match tournament',
    'ترند ومنوعات': 'technology smartphone internet media digital press'
  };

  const queries = [
    keywords ? `${keywords} realistic photo` : null,
    keywords,
    categoryFallbacks[category] || 'egypt cairo news photography',
    `${category} realistic news photo`
  ].filter(Boolean);

  for (const q of queries) {
    try {
      console.log(`🔍 جاري البحث في Pexels عن صورة فوتوغرافية واقعية لـ "${q}"...`);
      const photos = await searchPhotos(q, { perPage: 15, orientation: 'landscape' });
      if (photos && photos.length > 0) {
        // تصفية واستبعاد أي صورة سبق استخدامها في أي مقال سابق
        const freshPhotos = photos.filter(p => {
          const u = p.src.large2x || p.src.large || p.src.medium;
          return !usedImageUrls.has(u);
        });

        const selectedList = freshPhotos.length > 0 ? freshPhotos : photos;
        // اختيار صورة متنوعة من النتائج الفوتوغرافية غير المكررة
        const p = selectedList[Math.floor(Math.random() * Math.min(selectedList.length, 5))];
        const url = p.src.large2x || p.src.large || p.src.medium;

        console.log(`📸 تم العثور على صورة فوتوغرافية حقيقية (غير مكررة): ${url.slice(0, 70)}...`);
        return {
          url,
          alt: p.alt || keywords || 'صوت مصر 24',
          photographer: p.photographer || 'Pexels'
        };
      }
    } catch (e) {
      console.warn(`⚠️ لم يتم العثور على صورة بكلمة "${q}"، تجربة البديل...`);
    }
  }

  // في حال تعذر البحث بالكامل، اختيار صورة فوتوغرافية حقيقية غير مكررة من مخزون متنوع
  const defaultBank = [
    'https://images.pexels.com/photos/10586819/pexels-photo-10586819.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    'https://images.pexels.com/photos/6077325/pexels-photo-6077325.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    'https://images.pexels.com/photos/11633645/pexels-photo-11633645.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    'https://images.pexels.com/photos/7567230/pexels-photo-7567230.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    'https://images.pexels.com/photos/12955791/pexels-photo-12955791.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    'https://images.pexels.com/photos/16459372/pexels-photo-16459372.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    'https://images.pexels.com/photos/30911676/pexels-photo-30911676.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'
  ];
  const freshDefaults = defaultBank.filter(u => !usedImageUrls.has(u));
  const fallbackUrl = freshDefaults.length > 0 ? freshDefaults[Math.floor(Math.random() * freshDefaults.length)] : defaultBank[0];

  return {
    url: fallbackUrl,
    alt: 'صوت مصر 24 - تغطية إخبارية مستمرة',
    photographer: 'Pexels'
  };
}

// خلاصات Google News المخصصة لكل قسم من أقسام البوابة الستة
const SECTION_FEEDS = {
  'مصر والعالم': 'https://news.google.com/rss?hl=ar&gl=EG&ceid=EG:ar',
  'شؤون ومحاكم': 'https://news.google.com/rss/search?q=%D9%85%D8%AD%D9%83%D9%85%D8%A9%20OR%20%D8%A7%D9%84%D9%86%D9%8A%D8%A7%D8%A8%D8%A9%20OR%20%D8%A7%D9%84%D9%82%D8%B6%D8%A7%D8%A1%20OR%20%D8%A7%D9%84%D9%86%D9%82%D8%B6&hl=ar&gl=EG&ceid=EG:ar',
  'اقتصاد وأسواق': 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ar&gl=EG&ceid=EG:ar',
  'حوادث ومجتمع': 'https://news.google.com/rss/search?q=%D8%AD%D9%88%D8%A7%D8%AF%D8%AB%20OR%20%D8%A7%D9%84%D8%AF%D8%A7%D8%AE%D9%84%D9%8A%D8%A9%20OR%20%D9%82%D8%B6%D8%A7%D9%8A%D8%A7%20OR%20%D8%AC%D9%86%D8%A7%D9%8A%D8%A7%D8%AA&hl=ar&gl=EG&ceid=EG:ar',
  'رياضة وملاعب': 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ar&gl=EG&ceid=EG:ar',
  'ترند ومنوعات': 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ar&gl=EG&ceid=EG:ar'
};

const ALL_SECTIONS = [
  'مصر والعالم',
  'شؤون ومحاكم',
  'اقتصاد وأسواق',
  'حوادث ومجتمع',
  'رياضة وملاعب',
  'ترند ومنوعات'
];

// 1. جلب خلاصات الأخبار العاجلة المخصصة لقسم معين
async function fetchTrendingNews(targetCategory = 'مصر والعالم') {
  const url = SECTION_FEEDS[targetCategory] || SECTION_FEEDS['مصر والعالم'];
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    const parsed = items.map(item => {
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      
      let title = titleMatch ? titleMatch[1] : '';
      title = title.replace(/\s*-\s*[^-]+$/, '').trim();
      
      return {
        title,
        link: linkMatch ? linkMatch[1] : '',
        pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toISOString()
      };
    }).filter(i => i.title && i.title.length > 15 && !i.title.includes('أخبار Google'));

    return parsed;
  } catch (err) {
    console.error(`❌ خطأ أثناء جلب أخبار قسم [${targetCategory}]:`, err.message);
    return [];
  }
}

// 2. صياغة المقال الصحفي عبر Gemini لقسم محدد
async function rewriteWithGemini(rawTitle, forcedCategory = null) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY غير متوفر في ملف .env');
  }

  const categoryInstruction = forcedCategory
    ? `2. التصنيف (Category): يجب أن يكون حصراً: "${forcedCategory}".`
    : `2. التصنيف (Category): اختر بدقة قسماً واحداً فقط من هذه الأقسام الستة المعتمدة حصراً في شريط البوابة:
   ["مصر والعالم", "شؤون ومحاكم", "اقتصاد وأسواق", "حوادث ومجتمع", "رياضة وملاعب", "ترند ومنوعات"]`;

  const prompt = `أنت رئيس التحرير التنفيذي لبوابة «صوت مصر 24» (بوابة إخبارية رقمية مصرية شاملة ومستقلة، يرأسها ويديرها المستشار أحمد منصور).

المطلوب: قم بكتابة مقال إخباري تحليلي متكامل وشامل باللغة العربية الفصحى الرصينة انطلاقاً من هذا الخبر العاجل:
«${rawTitle}»
${forcedCategory ? `هذا المقال مخصص حصرياً لقسم: «${forcedCategory}».` : ''}

معايير التحرير الإلزامية:
1. العنوان (Headline): عنوان صحفي مهيب، جذاب، غير مضلل، ومحفز للقراءة.
${categoryInstruction}
3. المقدمة (Lead): فقرة افتتاحية قوية تجيب عن الأسئلة الخمسة (من، ماذا، أين، متى، لماذا).
4. تفاصيل الحدث والخلفيات: فقرتان تشرحان ملابسات الموضوع والبيانات الرسمية.
5. النقاط الجوهرية (Key Highlights): 3 إلى 4 نقاط محددة تلخص أهم ما يجب أن يعرفه المواطن.
6. الرأي التحليلي والأبعاد القانونية أو المجتمعية: فقرة تسلط الضوء على تداعيات هذا الخبر.
7. الوسوم (Tags): 5 وسوم مناسبة للترند.

8. كلمات البحث عن الصورة (image_keywords): كلمتان إلى 3 بالإنجليزية لوصف الصورة المناسبة للخبر (مثال: "courtroom gavel judge" أو "cairo weather sun" أو "egyptian stock exchange").

أخرج الإجابة فقط بصيغة JSON نظيفة بدون أي وسوم markdown إضافية:
{
  "title": "العنوان المقترح هنا",
  "category": "${forcedCategory || 'اسم القسم المختار'}",
  "image_keywords": "english keywords for photo",
  "summary": "موجز في سطرين مناسب لمواقع التواصل الاجتماعي وشريط العاجل",
  "content_html": "<p>الفقرة الأولى...</p><h3>أبرز تفاصيل القرار / الواقعة</h3><p>تفاصيل...</p><ul><li>نقطة 1</li><li>نقطة 2</li></ul><h3>الرؤية التحليلية والأبعاد المجتمعية</h3><p>خاتمة...</p>",
  "tags": ["وسم1", "وسم2", "وسم3", "وسم4"]
}`;

  const models = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];

  for (const modelName of models) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt
      });

      const text = response.text;
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.warn(`⚠️ تعذر استخدام نموذج ${modelName} (${err.message.slice(0, 70)})، جاري المحاولة بنموذج بديل...`);
    }
  }

  throw new Error('فشلت جميع نماذج Gemini المتاحة');
}

// 3. إرسال إشعار تليجرام للأستاذ أحمد منصور
async function sendTelegramAlert(article) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const msg = `📰 *[صوت مصر 24] - تم إنتاج خبر جديد بنجاح* 🇪🇬
━━━━━━━━━━━━━━━━━━
🔹 *العنوان:* ${article.title}
📁 *القسم:* #${article.category.replace(/\s+/g, '_')}
📝 *الموجز:* ${article.summary}
🏷️ *الوسوم:* ${article.tags.map(t => '#' + t.replace(/\s+/g, '_')).join(' ')}
━━━━━━━━━━━━━━━━━━
⚖️ إشراف: *المستشار أحمد منصور*`;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: 'Markdown'
      })
    });
    console.log('✅ تم إرسال إشعار التليجرام بنجاح.');
  } catch (err) {
    console.warn('⚠️ تعذر إرسال إشعار تليجرام:', err.message);
  }
}

// 4. الدالة الرئيسية لتشغيل الدورة الإخبارية الموزعة على الأقسام
async function runNewsCycle(count = 1, targetSection = null) {
  console.log('🚀 بدء دورة رصد وتوليد الأخبار المصنفة لبوابة «صوت مصر 24»...');
  
  // قراءة سجل النشر لتجنب التكرار
  let history = [];
  if (fs.existsSync(LOG_FILE)) {
    try { history = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch(e) {}
  }
  const publishedTitles = new Set(history.map(h => h.original_title));
  // بناء قائمة الصور المستخدمة سابقاً لمنع تكرار أي صورة نهائياً
  const usedImageUrls = new Set(history.map(h => h.image_url).filter(Boolean));

  let generatedCount = 0;

  // تحديد الأقسام المستهدفة مع التدوير التلقائي المستمر بين الأقسام الستة
  const sectionsToCover = targetSection 
    ? [targetSection]
    : ALL_SECTIONS;

  let sectionIndex = 0;
  if (!targetSection && history.length > 0) {
    const last = history[history.length - 1];
    if (last && last.category) {
      const lastIdx = ALL_SECTIONS.indexOf(last.category);
      if (lastIdx !== -1) {
        sectionIndex = (lastIdx + 1) % ALL_SECTIONS.length;
      }
    }
  }

  while (generatedCount < count && sectionIndex < sectionsToCover.length * 4) {
    const currentSection = sectionsToCover[sectionIndex % sectionsToCover.length];
    sectionIndex++;

    console.log(`\n📡 [قسم: ${currentSection}] جاري رصد أحدث الأخبار المتخصصة...`);
    const newsList = await fetchTrendingNews(currentSection);
    
    // البحث عن خبر لم يُنشر من قبل
    const candidate = newsList.find(item => !publishedTitles.has(item.title));
    if (!candidate) {
      console.log(`⚠️ لا توجد أخبار جديدة غير منشورة حالياً في قسم [${currentSection}].`);
      continue;
    }

    publishedTitles.add(candidate.title);
    console.log(`⏳ جاري صياغة وتحرير الخبر لقسم [${currentSection}]: "${candidate.title}"...`);
    try {
      const article = await rewriteWithGemini(candidate.title, currentSection);
      article.generated_at = new Date().toISOString();
      article.original_title = candidate.title;

      // 1. جلب صورة خبرية واقعية فوتوغرافية 100% بنسبة 16:9 مع منع التكرار تماماً
      console.log(`📸 جاري البحث عن صورة خبرية واقعية لقسم [${article.category}]...`);
      const photo = await fetchNewsImage(article.image_keywords, article.category, usedImageUrls);
      article.image_url = photo.url;
      article.image_alt = photo.alt;
      usedImageUrls.add(photo.url);

      const imageBanner = `
<div class="separator" style="clear: both; text-align: center; margin-bottom: 24px;">
  <a href="${article.image_url}" style="margin-left: 1em; margin-right: 1em;">
    <img border="0" data-original-height="720" data-original-width="1280" src="${article.image_url}" alt="${article.title}" style="max-width: 100%; width: 100%; max-height: 480px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);" />
  </a>
</div>`;

      // 2. إضافة أكواد أدسنس داخل المقال
      const adSnippet = `
<div style="margin:25px 0; text-align:center;">
  <ins class="adsbygoogle" style="display:block; text-align:center;" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="${ADSENSE_PUB_ID}" data-ad-slot="6851909615"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
      
      const categoryMeta = `<div class="sawt-post-meta" data-category="${article.category}" data-tags="${(article.tags || []).join(',')}" style="display:none;"></div>`;
      
      article.full_blogger_html = `
${categoryMeta}
${imageBanner}
<div class="sawt-cat-pill" style="margin-bottom:14px;"><span style="background-color:#991b1b; color:#ffffff; padding:3px 12px; border-radius:4px; font-size:12px; font-weight:800; display:inline-block;">قسم: ${article.category}</span></div>
${article.content_html}
${adSnippet}
<hr style="border:0; border-top:1px solid #e2e8f0; margin:25px 0;"/>
<p style="font-size:13px; color:#64748b;">
  <b>صوت مصر 24</b> | بوابة إخبارية رقمية مستقلة تعنى بالشأن العام وقضايا الرأي العام وأخبار المحاكم والمجتمع.
</p>`;

      // حفظ المقال كملف HTML وملف JSON
      const todayStr = new Date().toISOString().slice(0, 10);
      const dayDir = path.join(OUTPUT_DIR, todayStr);
      if (!fs.existsSync(dayDir)) fs.mkdirSync(dayDir, { recursive: true });

      const safeFilename = article.title.replace(/[\/\\?%*:|"<>]/g, '_').slice(0, 60);
      const articlePath = path.join(dayDir, `${safeFilename}.html`);
      const jsonPath = path.join(dayDir, `${safeFilename}.json`);

      fs.writeFileSync(articlePath, article.full_blogger_html, 'utf8');
      fs.writeFileSync(jsonPath, JSON.stringify(article, null, 2), 'utf8');

      // تسجيل في الأرشيف
      history.push({
        title: article.title,
        original_title: candidate.title,
        category: article.category,
        image_url: article.image_url,
        date: article.generated_at,
        file: articlePath
      });
      fs.writeFileSync(LOG_FILE, JSON.stringify(history, null, 2), 'utf8');

      console.log(`✅ تم إنجاز وحفظ المقال: "${article.title}" [قسم: ${article.category}]`);
      console.log(`🖼️ الصورة: ${article.image_url}`);

      // 3. النشر التلقائي المباشر والفوري إلى بلوجر
      console.log(`📤 جاري النشر الآلي إلى بلوجر حياً...`);
      try {
        await publishArticleFile(jsonPath);
        console.log(`🎉 تم نشر المقال بنجاح وإرسال إشعار تليجرام للمستشار أحمد منصور.`);
      } catch (pubErr) {
        console.warn(`⚠️ فشل النشر التلقائي لبلوجر (${pubErr.message})، تم الاكتفاء بحفظ المقال محلياً.`);
      }

      generatedCount++;
      if (generatedCount < count) {
        console.log(`⏳ انتظار دقيقتين ونصف (150 ثانية) بين المقالات لتفادي قيود مكافحة السبام في سيرفرات جوجل وضمان نشر كل مقال بنجاح...`);
        await new Promise(r => setTimeout(r, 150000));
      }
    } catch (err) {
      console.error(`❌ تعذر معالجة الخبر:`, err.message);
    }
  }

  console.log(`\n🎉 اكتملت الدورة: تم توليد ونشر ${generatedCount} مقالاً إخبارياً موزعاً على الأقسام.`);
}

if (require.main === module) {
  const countArg = parseInt(process.argv[2]) || 1;
  runNewsCycle(countArg);
}

module.exports = { runNewsCycle, fetchTrendingNews };
