#!/usr/bin/env node
/**
 * competitor-analysis.cjs — تحليل المنافسين في السوق المصري
 *
 * يحدد أهم المواقع المنافسة في القانون المصري، يستخرج نقاط القوة والضعف،
 * ويقدم توصيات للتفوق عليها.
 *
 * المخرجات:
 *   - competitor-report.md — تقرير شامل
 *
 * الاستخدام:
 *   node scripts/seo/competitor-analysis.cjs
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_FILE = path.join(__dirname, 'competitor-report.md');
dotenv.config({ path: path.join(ROOT, '.env') });

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

if (!ai) {
  console.error('❌ GEMINI_API_KEY مش متضبوط');
  process.exit(1);
}

const TEXT_MODELS = [
  process.env.TEXT_MODEL || 'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
];
let modelIdx = 0;
const currentModel = () => TEXT_MODELS[modelIdx % TEXT_MODELS.length];

async function analyze() {
  const prompt = `أنت خبير SEO في السوق المصري. حلل المنافسين في مجال القانون المصري وإدارة مكاتب المحاماة لـ "منصة المحامي الرقمية" (منصة SaaS للمحامين).

أعطني:

1) **أهم 7 منافسين** في السوق المصري في:
   - المدونات القانونية (مثل: مستشارك القانوني، قانوني نت)
   - مواقع مكاتب المحاماة الكبرى
   - منصات SaaS للمحامين (عربية)

2) **نقاط قوتهم** (اللي بيقدموه كويس)
3) **نقاط ضعفهم** (الفرص اللي ممكن نستغلها)
4) **استراتيجية التفوق** علينا (خطوات عملية)

أرجع JSON:
{
  "competitors": [
    {
      "name": "اسم الموقع",
      "url": "https://...",
      "type": "blog|firm-finder|saas|directory",
      "strengths": ["نقطة 1", "نقطة 2"],
      "weaknesses": ["نقطة 1", "نقطة 2"],
      "estimated_da": "low|medium|high"
    }
  ],
  "strategy": {
    "quick_wins": ["خطوة 1", "خطوة 2"],
    "medium_term": ["..."],
    "long_term": ["..."]
  }
}`;

  for (let i = 0; i < TEXT_MODELS.length; i++) {
    try {
      const resp = await ai.models.generateContent({
        model: currentModel(),
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.5 },
      });
      const text = resp.text?.trim();
      if (!text) throw new Error('مفيش رد');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('رد مش JSON');
      return JSON.parse(match[0]);
    } catch (e) {
      console.warn(`⚠️ فشل: ${e.message?.substring(0, 100)}`);
      modelIdx++;
    }
  }
  throw new Error('فشل التحليل');
}

function buildReport(data) {
  let md = `# تحليل المنافسين — السوق المصري\n\n`;
  md += `**التاريخ:** ${new Date().toLocaleString('ar-EG')}\n`;
  md += `**الموقع:** منصة المحامي الرقمية (منصة SaaS للمحامين)\n\n`;

  md += `## 🏢 المنافسون الرئيسيون\n\n`;
  md += `| الاسم | النوع | القوة المقدّرة | نقاط القوة | نقاط الضعف |\n`;
  md += `|---|---|---|---|---|\n`;
  for (const c of data.competitors || []) {
    md += `| **${c.name}** | ${c.type} | ${c.estimated_da} | ${(c.strengths || []).slice(0, 2).join('، ')} | ${(c.weaknesses || []).slice(0, 2).join('، ')} |\n`;
  }

  md += `\n## 📊 تفاصيل كل منافس\n\n`;
  for (const c of data.competitors || []) {
    md += `### ${c.name}\n`;
    md += `**الرابط:** ${c.url}\n\n`;
    md += `**النوع:** ${c.type}\n\n`;
    md += `**💪 نقاط القوة:**\n`;
    for (const s of c.strengths || []) md += `- ${s}\n`;
    md += `\n**⚠️ نقاط الضعف (الفرص لنا):**\n`;
    for (const w of c.weaknesses || []) md += `- ${w}\n`;
    md += `\n`;
  }

  md += `## 🎯 استراتيجية التفوق\n\n`;
  if (data.strategy) {
    md += `### ⚡ خطوات سريعة (شهر 1)\n`;
    for (const w of data.strategy.quick_wins || []) md += `- ${w}\n`;
    md += `\n### 📅 متوسطة المدى (شهر 2-3)\n`;
    for (const w of data.strategy.medium_term || []) md += `- ${w}\n`;
    md += `\n### 🎯 طويلة المدى (شهر 4-6)\n`;
    for (const w of data.strategy.long_term || []) md += `- ${w}\n`;
  }
  return md;
}

async function main() {
  console.log('🔍 تحليل المنافسين في السوق المصري...\n');
  const data = await analyze();
  console.log(`✓ تم تحديد ${data.competitors?.length || 0} منافسين\n`);

  const report = buildReport(data);
  fs.writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`📄 التقرير: ${REPORT_FILE}\n`);

  console.log('🏢 أهم 5 منافسين:\n');
  for (const c of (data.competitors || []).slice(0, 5)) {
    console.log(`  • ${c.name} (${c.type})`);
  }
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
