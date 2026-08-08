#!/usr/bin/env node
/**
 * keyword-research.cjs — بحث الكلمات المفتاحية (Long-tail) للسوق المصري
 *
 * يستخدم Gemini لتوليد 50+ long-tail keywords في القانون المصري وإدارة
 * مكاتب المحاماة، مصنّفة حسب نية البحث (informational/commercial/transactional).
 *
 * المخرجات:
 *   - keywords.json — الكلمات المفتاحية مع البيانات الوصفية
 *   - keywords-report.md — تقرير مقروء
 *
 * الاستخدام:
 *   node scripts/seo/keyword-research.cjs
 *   node scripts/seo/keyword-research.cjs --count 100
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const OUTPUT_JSON = path.join(__dirname, 'keywords.json');
const OUTPUT_REPORT = path.join(__dirname, 'keywords-report.md');

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

if (!ai) {
  console.error('❌ GEMINI_API_KEY مش متضبوط في .env');
  process.exit(1);
}

const count = parseInt(process.argv.find(a => a.startsWith('--count='))?.split('=')[1] || process.argv[process.argv.indexOf('--count') + 1] || '50', 10);

const TEXT_MODELS = [
  process.env.TEXT_MODEL || 'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
];
let modelIdx = 0;
const currentModel = () => TEXT_MODELS[modelIdx % TEXT_MODELS.length];

async function generateKeywords() {
  const prompt = `أنت خبير SEO متخصص في السوق المصري. ولّد ${count} long-tail keyword في مجال القانون المصري وإدارة مكاتب المحاماة.

قواعد:
- كلمات طويلة (3+ كلمات) — أفضل لـ SEO من الكلمات القصيرة
- كلمات يبحث عنها فعلاً محامون وأصحاب مكاتب في مصر
- مرتبة حسب نية البحث (informational, commercial, transactional)
- تغطي المواضيع: قانون العمل، القانون المدني، قانون الأحوال الشخصية، قانون الشركات، إدارة المكاتب، صياغة العقود، الرسوم القضائية

أرجع JSON فقط بدون أي كلام إضافي:
{
  "keywords": [
    {
      "keyword": "الكلمة المفتاحية بالعربية",
      "intent": "informational|commercial|transactional",
      "category": "قانون عمالي|قانون مدني|إدارة مكاتب|...",
      "estimated_difficulty": "low|medium|high",
      "estimated_volume": "low|medium|high",
      "suggested_content_type": "pillar|article|how-to|faq|comparison",
      "related_articles": ["slug-1", "slug-2"]
    }
  ]
}

وزّع على النوايا:
- 60% informational (معلوماتي)
- 30% commercial (تجاري - بيدور على منتج/خدمة)
- 10% transactional (جاهز للشراء)`;

  let lastError;
  for (let i = 0; i < TEXT_MODELS.length; i++) {
    try {
      const resp = await ai.models.generateContent({
        model: currentModel(),
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.7 },
      });
      const text = resp.text?.trim();
      if (!text) throw new Error('مفيش رد من Gemini');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('رد مش JSON صالح');
      return JSON.parse(match[0]);
    } catch (e) {
      lastError = e;
      console.warn(`⚠️ فشل ${currentModel()}: ${e.message?.substring(0, 100)}`);
      modelIdx++;
    }
  }
  throw new Error(`فشل توليد الكلمات: ${lastError?.message}`);
}

function generateReport(data) {
  const { keywords } = data;
  const byIntent = keywords.reduce((acc, k) => {
    acc[k.intent] = (acc[k.intent] || 0) + 1;
    return acc;
  }, {});

  let md = `# تقرير الكلمات المفتاحية — السوق المصري\n\n`;
  md += `**عدد الكلمات:** ${keywords.length}\n`;
  md += `**تاريخ التوليد:** ${new Date().toLocaleString('ar-EG')}\n\n`;

  md += `## التوزيع حسب نية البحث\n`;
  for (const [intent, c] of Object.entries(byIntent)) {
    md += `- **${intent}**: ${c} كلمة (${((c / keywords.length) * 100).toFixed(1)}%)\n`;
  }
  md += `\n`;

  // تجميع حسب الـ content type
  const byType = keywords.reduce((acc, k) => {
    acc[k.suggested_content_type] = (acc[k.suggested_content_type] || 0) + 1;
    return acc;
  }, {});
  md += `## التوزيع حسب نوع المحتوى المقترح\n`;
  for (const [type, c] of Object.entries(byType)) {
    md += `- **${type}**: ${c}\n`;
  }
  md += `\n`;

  // جدول بالكلمات مرتبة حسب الفئة
  md += `## الكلمات المفتاحية\n\n`;
  md += `| الكلمة | النية | الفئة | الصعوبة | النوع |\n`;
  md += `|---|---|---|---|---|\n`;
  for (const k of keywords) {
    md += `| ${k.keyword} | ${k.intent} | ${k.category} | ${k.estimated_difficulty} | ${k.suggested_content_type} |\n`;
  }
  return md;
}

async function main() {
  console.log(`🔍 توليد ${count} long-tail keyword في القانون المصري...\n`);
  const data = await generateKeywords();
  console.log(`✓ تم توليد ${data.keywords?.length || 0} كلمة`);

  writeJson(OUTPUT_JSON, data);
  console.log(`✓ محفوظ في: ${OUTPUT_JSON}`);

  const report = generateReport(data);
  fs.writeFileSync(OUTPUT_REPORT, report, 'utf8');
  console.log(`✓ التقرير: ${OUTPUT_REPORT}`);

  // عرض أهم 10
  console.log(`\n📊 أهم 10 كلمات مفتاحية:\n`);
  data.keywords?.slice(0, 10).forEach((k, i) => {
    console.log(`  ${i + 1}. ${k.keyword}`);
    console.log(`     [${k.intent}] ${k.category} — ${k.suggested_content_type}`);
  });
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
