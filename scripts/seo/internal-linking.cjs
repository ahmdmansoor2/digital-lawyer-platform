#!/usr/bin/env node
/**
 * internal-linking.cjs — إضافة Internal Links ذكية لمقالات المدونة
 *
 * الاستراتيجية:
 *   1) Gemini يحدد أفضل ربط بين المقالات (نظرة شاملة)
 *   2) نضيف 2-3 روابط داخلية في كل مقال (anchor text وصفي)
 *   3) نضيف backlinks من المقالات المُحسّنة
 *
 * المخرجات:
 *   - blog/<slug>.html — معدّل بـ internal links
 *   - linking-report.md — تقرير بالتغييرات
 *
 * الاستخدام:
 *   node scripts/seo/internal-linking.cjs
 *   node scripts/seo/internal-linking.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

const ROOT = path.resolve(__dirname, '..', '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
dotenv.config({ path: path.join(ROOT, '.env') });

const REPORT_FILE = path.join(__dirname, 'linking-report.md');

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

const dryRun = process.argv.includes('--dry-run');

/**
 * يقرأ كل المقالات ويستخرج العنوان والـ meta
 */
function loadArticles() {
  const files = fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html');
  return files.map(f => {
    const html = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
    const slug = path.basename(f, '.html');
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    return {
      slug,
      file: f,
      title: titleMatch ? titleMatch[1].trim().replace(/\s*-\s*منصة.*$/, '').replace(/\s*\|\s*.*$/, '') : slug,
      description: descMatch ? descMatch[1] : '',
      html,
    };
  });
}

/**
 * Gemini يحلل كل المقالات ويعيد map للربط
 */
async function buildLinkingMap(articles) {
  const articlesList = articles.map(a => `- ${a.slug}: ${a.title} (${a.description.substring(0, 100)}...)`).join('\n');

  const prompt = `أنت خبير SEO. عندك ${articles.length} مقال قانوني. اقترح أفضل ربط داخلي بين كل مقال و 2-3 مقالات أخرى (كل مقال يرتبط بـ 2-3 مقالات).

قواعد:
- الربط بين مقالات متعلقة في الموضوع
- لا تربط مقال بنفسه
- الـ anchor text يكون وصفي (2-5 كلمات من عنوان المقال الآخر)

أرجع JSON فقط:
{
  "links": {
    "slug-1": [
      {"target": "slug-2", "anchor": "نص الرابط الوصفي"},
      {"target": "slug-3", "anchor": "..."}
    ],
    "slug-2": [...]
  }
}

المقالات:
${articlesList}`;

  for (let i = 0; i < TEXT_MODELS.length; i++) {
    try {
      const resp = await ai.models.generateContent({
        model: currentModel(),
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.3 },
      });
      const text = resp.text?.trim();
      if (!text) throw new Error('مفيش رد');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('رد مش JSON');
      return JSON.parse(match[0]).links || {};
    } catch (e) {
      console.warn(`⚠️ فشل: ${e.message?.substring(0, 100)}`);
      modelIdx++;
    }
  }
  throw new Error('فشل بناء linking map');
}

/**
 * يضيف رابط داخلي في HTML — يبحث عن anchor text في النص
 * لو مش لاقيها، يضيف رابط في أول فقرة مناسبة
 */
function insertInternalLink(html, targetSlug, anchor) {
  const targetUrl = `/blog/${targetSlug}.html`;

  // لو الرابط موجود بالفعل، اتخطى
  if (html.includes(targetUrl)) return { html, inserted: false, reason: 'already-exists' };

  // 1) حاول تلاقي الـ anchor text في النص
  const escapedAnchor = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // ابحث عن الـ anchor ككلمة كاملة (مع تجاهل الـ tags)
  const regex = new RegExp(`(${escapedAnchor})(?![^<]*</a>)`, 'i');
  const match = html.match(regex);
  if (match) {
    const newLink = `<a href="${targetUrl}">${anchor}</a>`;
    const newHtml = html.replace(regex, newLink);
    return { html: newHtml, inserted: true, reason: 'anchor-found' };
  }

  // 2) Fallback: أضف قسم "مقالات ذات صلة" في نهاية المقالة
  return { html, inserted: false, reason: 'anchor-not-found' };
}

/**
 * التنفيذ الرئيسي
 */
async function main() {
  console.log(`🔍 تحليل ${dryRun ? '(معاينة فقط)' : 'وتعديل'} internal links...\n`);

  const articles = loadArticles();
  console.log(`📰 عدد المقالات: ${articles.length}\n`);

  console.log('🤖 بناء linking map (Gemini)...');
  const linkingMap = await buildLinkingMap(articles);
  console.log(`✓ تم اقتراح ${Object.keys(linkingMap).length} مجموعة روابط\n`);

  // تجميع التغييرات
  const changes = [];
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const article of articles) {
    const links = linkingMap[article.slug] || [];
    if (!links.length) continue;

    let html = article.html;
    let insertedCount = 0;

    for (const link of links) {
      // تأكد الـ target موجود
      if (!articles.find(a => a.slug === link.target)) continue;

      const result = insertInternalLink(html, link.target, link.anchor);
      if (result.inserted) {
        html = result.html;
        insertedCount++;
        changes.push({
          source: article.slug,
          target: link.target,
          anchor: link.anchor,
          status: '✓ inserted',
        });
      } else {
        totalSkipped++;
        changes.push({
          source: article.slug,
          target: link.target,
          anchor: link.anchor,
          status: `⊘ skipped (${result.reason})`,
        });
      }
    }

    if (insertedCount > 0 && !dryRun) {
      fs.writeFileSync(path.join(BLOG_DIR, article.file), html, 'utf8');
      totalInserted += insertedCount;
      console.log(`  ✓ ${article.slug}: أُضيف ${insertedCount} روابط`);
    } else if (insertedCount > 0 && dryRun) {
      console.log(`  [DRY] ${article.slug}: كان سيُضاف ${insertedCount} روابط`);
    }
  }

  // التقرير
  let report = `# تقرير Internal Linking\n\n`;
  report += `**التاريخ:** ${new Date().toLocaleString('ar-EG')}\n`;
  report += `**المقالات المعالجة:** ${articles.length}\n`;
  report += `**إجمالي الروابط المُضافة:** ${totalInserted}\n`;
  report += `**المتخطّاة (anchor غير موجود):** ${totalSkipped}\n\n`;

  report += `## التفاصيل\n\n`;
  for (const c of changes) {
    report += `- ${c.status} **${c.source}** → \`${c.target}\` (anchor: "${c.anchor}")\n`;
  }

  fs.writeFileSync(REPORT_FILE, report, 'utf8');

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ تم: ${totalInserted} روابط أُضيفت`);
  console.log(`⊘  تم التخطي: ${totalSkipped} (anchor غير موجود في النص)`);
  console.log(`📄 التقرير: ${REPORT_FILE}`);

  if (dryRun) {
    console.log(`\n⚠️  هذا معاينة فقط. شغّل بدون --dry-run للتطبيق الفعلي.`);
  }
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
