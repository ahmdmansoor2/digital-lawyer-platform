#!/usr/bin/env node
/**
 * keywords-from-google.cjs — الكلمات المفتاحية القانونية الأكثر بحثاً على Google
 *
 * المصادر الحقيقية (بدون أدوات مدفوعة):
 *   1) Google Suggest API  — اقتراحات البحث الفعلية للمستخدمين (عربي/مصر)
 *   2) Google Trends RSS   — ترندات Google في مصر (geo=EG)
 *   3) Gemini              — تصفية الاقتراحات + ربطها بمواضيع topics.json + اقتراح موضوعات جديدة
 *
 * المخرجات:
 *   - تحديث "keywords" لكل موضوع evergreen في scripts/blog-publisher/topics.json
 *   - scripts/seo/google-keywords.json (البيانات الخام + ما طُبّق)
 *   - scripts/seo/keywords-from-google-report.md (تقرير مقروء)
 *
 * الاستخدام:
 *   node scripts/seo/keywords-from-google.cjs            # تنفيذ كامل
 *   node scripts/seo/keywords-from-google.cjs --dry-run  # معاينة دون كتابة ملفات
 *   node scripts/seo/keywords-from-google.cjs --skip-trends
 */
'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOPICS_FILE = path.join(ROOT, 'scripts', 'blog-publisher', 'topics.json');
const OUT_JSON = path.join(__dirname, 'google-keywords.json');
const OUT_REPORT = path.join(__dirname, 'keywords-from-google-report.md');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_TRENDS = process.argv.includes('--skip-trends');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const TEXT_MODELS = [
  process.env.TEXT_MODEL || 'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
];

// بذور قانونية عربية — تُستعلم منها اقتراحات Google الحقيقية
const SEED_TERMS = [
  'قانون', 'محامي', 'دعوى', 'دعوى قضائية', 'طلاق', 'خلع', 'نفقة', 'حضانة',
  'ميراث', 'إيجار', 'إخلاء مستأجر', 'شيك بدون رصيد', 'تأسيس شركة', 'عقد عمل',
  'فصل تعسفي', 'تعويض', 'حادث سير', 'تظلم', 'منع السفر', 'ضريبة', 'حبس احتياطي',
  'توكيل رسمي', 'شهر عقاري', 'تقادم', 'رهن عقاري', 'قضية نصب', 'ابتزاز', 'قانون العمل',
  'قانون الأسرة', 'إثبات النسب', 'رؤية الأطفال', 'إعلام الوراثة', 'تقسيم تركة',
  'مسؤولية مدنية', 'شركة مساهمة', 'شيك مرتجع', 'إنذار رسمي', 'حجز تنفيذي',
  'عقد بيع', 'عقد إيجار', 'قسمة تركة', 'إسقاط الحضانة', 'الطلاق للضرر', 'نفقة الأطفال',
];

// كلمات دلالية لتصفية الترندات/الاقتراحات غير القانونية
const LEGAL_MARKERS = [
  'قانون', 'محكمة', 'دعوى', 'قضية', 'عقوب', 'جريمة', 'مخالف', 'حكم', 'عقد', 'إيجار',
  'طلاق', 'خلع', 'نفقة', 'حضانة', 'ميراث', 'تركة', 'ورثة', 'فرائض', 'توكيل', 'شهر',
  'شيك', 'دين', 'تعويض', 'ضريبة', 'تأمين', 'عمل', 'موظف', 'عامل', 'شركة', 'تجار',
  'تقادم', 'حبس', 'سجن', 'محام', 'نزاع', 'تقاضي', 'غرامة', 'استئناف', 'نقض', 'إخلاء',
  'إفلاس', 'رهن', 'بيع', 'عقار', 'نسب', 'جنسية', 'قاصر', 'حاضن', 'صك', 'قسمة',
  'إعسار', 'تفتيش', 'نيابة', 'مجلس الدولة', 'التحكيم', 'الملكية الفكرية', 'علامة تجارية',
  'إرث', 'حضانة الأطفال', 'أجر', 'راتب', 'مستحقات', 'إنهاء خدمة', 'فصل', 'تسريح',
];

function isArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

function isLegalish(k) {
  return LEGAL_MARKERS.some((m) => k.includes(m));
}

async function fetchText(url, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function googleSuggest(seed) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=ar&gl=eg&q=${encodeURIComponent(seed)}`;
  const text = await fetchText(url);
  try {
    const arr = JSON.parse(text);
    return Array.isArray(arr && arr[1]) ? arr[1].map(String).filter(isArabic) : [];
  } catch {
    return [];
  }
}

async function trendsTitles() {
  if (SKIP_TRENDS) return [];
  const xml = await fetchText('https://trends.google.com/trending/rss?geo=EG');
  const titles = Array.from(xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g)).map((m) => m[1].trim());
  return titles.filter((t) => t.length >= 4);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateMapping(existingTopics, suggestions) {
  const prompt = `أنت خبير SEO متخصص في القانون المصري. أمامك قائمة عبارات حقيقية جمعتُها من اقتراحات Google Suggest وترندات Google داخل مصر — أي أنها كلمات يبحث عنها الناس فعلاً.

القائمة الحقيقية:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

المواضيع الحالية في مدونة منصة المحامي الرقمية (slug | العنوان | التصنيف):
${existingTopics.map((t) => `${t.slug} | ${t.title} | ${t.category}`).join('\n')}

المطلوب:
1) لكل موضوع موجود في القائمة، اختر أفضل 5 إلى 7 كلمات مفتاحية من القائمة الحقيقية أعلاه فقط (لا تختلق كلمات من عندك) تناسب محتوى الموضوع وتعكس أكثر ما يبحث عنه المصريون. إن لم تجد في القائمة ما يناسب موضوعاً ما، اترك keywords مصفوفة فارغة.
2) حدّد العبارات القوية في القائمة الحقيقية التي لا يوجد لها موضوع مطابق، واقترح لها موضوعات جديدة على نمط مواضيع المدونة (بحد أقصى 5 موضوعات).

أرجع JSON فقط بدون أي كلام إضافي:
{
  "topics": [
    { "slug": "existing-slug-بالإنجليزية", "keywords": ["كلمة1", "كلمة2", "كلمة3"] }
  ],
  "new_topics": [
    { "slug": "english-kebab-slug", "title": "عنوان الموضوع", "category": "التصنيف", "keywords": ["كلمة1", "كلمة2", "كلمة3"] }
  ]
}`;

  let lastError;
  for (let i = 0; i < TEXT_MODELS.length; i++) {
    const model = TEXT_MODELS[i % TEXT_MODELS.length];
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.4 },
      });
      const text = (resp.text && resp.text.trim && resp.text.trim()) || '';
      if (!text) throw new Error('لا يوجد رد');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('الرد ليس JSON');
      return JSON.parse(match[0]);
    } catch (e) {
      lastError = e;
      console.warn(`  ⚠️ فشل ${model}: ${(e.message || '').substring(0, 110)}`);
    }
  }
  throw new Error(`فشل Gemini في الربط: ${(lastError && lastError.message) || 'غير معروف'}`);
}

function normalizeKeyword(k) {
  return String(k || '')
    .trim()
    .replace(/[.#؟?]+$/g, '')
    .trim();
}

function applyKeywords(existing, mapping) {
  const bySlug = new Map(existing.map((t) => [t.slug, t]));
  const updated = [];
  const skipped = [];

  for (const m of mapping.topics || []) {
    const topic = bySlug.get(m.slug);
    if (!topic) {
      skipped.push({ slug: m.slug, reason: 'slug غير موجود' });
      continue;
    }
    const kws = (m.keywords || [])
      .map(normalizeKeyword)
      .filter((k) => k.length >= 3 && isArabic(k));
    const uniq = Array.from(new Set(kws)).slice(0, 8);
    if (!uniq.length) {
      skipped.push({ slug: m.slug, reason: 'لا كلمات صالحة من القائمة' });
      continue;
    }
    topic.keywords = uniq;
    updated.push({ slug: m.slug, keywords: uniq });
  }
  return { updated, skipped };
}

function buildReport(sources, suggestions, trends, updated, newTopics, applied) {
  let md = `# تقرير الكلمات المفتاحية من Google — السوق المصري\n\n`;
  md += `**تاريخ التوليد:** ${new Date().toLocaleString('ar-EG')}\n`;
  md += `**المصادر:** Google Suggest (${sources.suggest}) + Google Trends مصر (${sources.trends})\n`;
  md += `**إجمالي العبارات الفريدة المجمعة:** ${suggestions.length}\n`;
  md += `**المواضيع المحدّثة:** ${updated.length}\n`;
  md += `**المواضيع الجديدة المقترحة:** ${newTopics.length}\n\n`;

  if (updated.length) {
    md += `## المواضيع المحدّثة بكلمات حقيقية\n\n`;
    for (const u of updated) {
      md += `- **${u.slug}**: ${u.keywords.join('، ')}\n`;
    }
    md += `\n`;
  }

  if (newTopics.length) {
    md += `## مواضيع جديدة مقترحة\n\n`;
    for (const n of newTopics) {
      md += `- **${n.title}** (${n.category}) — ${(n.keywords || []).join('، ')}\n`;
    }
    md += `\n`;
  }

  if (trends.length) {
    md += `## ترندات مصر (بعد التصفية القانونية)\n\n`;
    for (const t of trends.slice(0, 40)) {
      md += `- ${t}\n`;
    }
    md += `\n`;
  }

  if (applied) {
    md += `## حالة التطبيق\n\n${applied}\n`;
  }

  md += `## أهم العبارات الحقيقية المجمعة\n\n`;
  for (const s of suggestions.slice(0, 120)) {
    md += `- ${s}\n`;
  }
  return md;
}

async function main() {
  console.log('🔍 جلب الكلمات المفتاحية القانونية الأكثر بحثاً على Google...\n');

  const topicsData = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
  const existing = Array.isArray(topicsData.evergreen) ? topicsData.evergreen : [];
  const existingTopics = existing.map((t) => ({ slug: t.slug, title: t.title, category: t.category }));

  // 1) Google Suggest
  console.log(`• Google Suggest — ${SEED_TERMS.length} بذرة...`);
  const suggestSet = new Set();
  for (let i = 0; i < SEED_TERMS.length; i++) {
    try {
      const list = await googleSuggest(SEED_TERMS[i]);
      for (const s of list) {
        const k = normalizeKeyword(s);
        if (k.length >= 3) suggestSet.add(k);
      }
    } catch (e) {
      console.warn(`  ⚠️ فشل بذرة "${SEED_TERMS[i]}": ${(e.message || '').substring(0, 60)}`);
    }
    await sleep(140);
  }
  console.log(`  ✓ ${suggestSet.size} اقتراحاً فريداً`);

  // 2) Trends مصر
  let trendSet = new Set();
  try {
    console.log('• Google Trends مصر...');
    const titles = await trendsTitles();
    for (const t of titles) {
      const k = normalizeKeyword(t);
      if (k.length >= 5 && isLegalish(k)) trendSet.add(k);
    }
    console.log(`  ✓ ${trendSet.size} ترنداً قانونياً`);
  } catch (e) {
    console.warn(`  ⚠️ فشل Trends: ${(e.message || '').substring(0, 60)}`);
  }

  // الدمج: الأولوية للاقتراحات ثم الترندات — بحد أقصى 220
  const combined = Array.from(new Set([...suggestSet, ...trendSet])).slice(0, 220);
  console.log(`\n• إجمالي العبارات للربط: ${combined.length}`);

  const sources = { suggest: suggestSet.size, trends: trendSet.size };

  let updated = [];
  let newTopics = [];
  let skipped = [];
  let appliedNote = '';

  if (ai && combined.length) {
    try {
      console.log('• ربط المواضيع عبر Gemini...');
      const mapping = await generateMapping(existingTopics, combined);
      const res = applyKeywords(existing, mapping);
      updated = res.updated;
      skipped = res.skipped;
      newTopics = (mapping.new_topics || [])
        .filter((n) => n && n.slug && /^[a-z0-9-]+$/.test(n.slug) && n.title && Array.isArray(n.keywords) && n.keywords.length >= 3)
        .slice(0, 5);

      if (!DRY_RUN) {
        // إلحاق المواضيع الجديدة (مع تجنب تكرار slug)
        const existingSlugs = new Set(existing.map((t) => t.slug));
        for (const n of newTopics) {
          if (existingSlugs.has(n.slug)) continue;
          existingSlugs.add(n.slug);
          existing.push({
            slug: n.slug,
            title: n.title.trim(),
            keywords: Array.from(new Set(n.keywords.map(normalizeKeyword).filter((k) => k.length >= 3))).slice(0, 8),
            category: (n.category || 'قانون').trim(),
            icon: '⚖️',
            coverClass: 'indigo',
          });
        }
        fs.writeFileSync(TOPICS_FILE, JSON.stringify(topicsData, null, 2) + '\n', 'utf8');
        console.log(`  ✓ topics.json محدّث (${updated.length} موضوعاً + ${newTopics.length} جديداً)`);
      } else {
        console.log(`  [dry-run] سيُحدَّث ${updated.length} موضوعاً + ${newTopics.length} جديداً (بدون كتابة)`);
      }
    } catch (e) {
      appliedNote = `⚠️ فشل ربط Gemini: ${e.message}. حُفظت البيانات الخام فقط.`;
      console.warn(`\n${appliedNote}`);
    }
  } else {
    appliedNote = ai ? 'لا توجد عبارات للربط.' : 'GEMINI_API_KEY غير موجود — حُفظت البيانات الخام فقط.';
    console.warn(`\n• ${appliedNote}`);
  }

  // المخرجات
  const out = {
    generated_at: new Date().toISOString(),
    sources: { google_suggest: sources.suggest, trends_egypt: sources.trends },
    total_unique: combined.length,
    topics_updated: updated,
    topics_skipped: skipped,
    new_topics: newTopics,
    raw_suggestions: Array.from(suggestSet),
    raw_trends: Array.from(trendSet),
  };

  if (!DRY_RUN) {
    fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), 'utf8');
    const report = buildReport(sources, combined, Array.from(trendSet), updated, newTopics, appliedNote);
    fs.writeFileSync(OUT_REPORT, report, 'utf8');
    console.log(`\n✓ ${OUT_JSON}`);
    console.log(`✓ ${OUT_REPORT}`);
  } else {
    console.log(`\n[dry-run] لم تُكتب أي ملفات.`);
  }

  console.log(`\n📊 ملخص: ${updated.length} موضوعاً حُدّثت • ${newTopics.length} موضوعاً جديداً • ${skipped.length} تخطّياً`);
  if (skipped.length) {
    console.log('\nالتخطّي:');
    skipped.slice(0, 10).forEach((s) => console.log(`  - ${s.slug} (${s.reason})`));
  }
}

main().catch((e) => {
  console.error('\n❌', e.message);
  process.exit(1);
});
