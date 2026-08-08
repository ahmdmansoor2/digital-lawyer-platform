#!/usr/bin/env node
/**
 * auto-pillar-publisher.cjs — الناشر الأوتوماتيكي للمراجع القانونية الشاملة (Pillars)
 *
 * يقرأ المواضيع القانونية من scripts/seo/pillar-topics.json
 * يولّد مقال مرجعي شامل (3500+ كلمة) باستخدام Gemini Flash AI
 * يحفظ الملف في public/pillars/<slug>.html
 * يحدّث public/pillars/index.html تلقائياً
 * يُعيد توليد sitemap.xml و sitemap.html
 *
 * الاستخدام:
 *   node scripts/seo/auto-pillar-publisher.cjs           # ينشر موضوعاً واحداً غير منشور
 *   node scripts/seo/auto-pillar-publisher.cjs --count 2  # ينشر موضوعين
 *   node scripts/seo/auto-pillar-publisher.cjs --slug <name>  # ينشر موضوعاً محدداً
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const TOPICS_FILE = path.join(__dirname, 'pillar-topics.json');
const LOG_FILE = path.join(__dirname, 'pillar-published-log.json');
const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');
const INDEX_FILE = path.join(PILLARS_DIR, 'index.html');
const SITEMAP_SCRIPT = path.join(ROOT, 'scripts', 'blog-publisher', 'generate-sitemap.cjs');
const BASE_URL = 'https://mohamidigital.online';

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function parseArgs() {
  const args = { count: 1, slug: null };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--count') args.count = parseInt(process.argv[++i], 10) || 1;
    else if (a === '--slug') args.slug = process.argv[++i];
  }
  return args;
}

function getPublishedSlugs() {
  const log = readJson(LOG_FILE, { entries: [] });
  const published = new Set(log.entries.map(e => e.slug));

  // تحقق أيضاً من الملفات المباشرة في public/pillars
  if (fs.existsSync(PILLARS_DIR)) {
    fs.readdirSync(PILLARS_DIR).forEach(f => {
      if (f.endsWith('.html') && f !== 'index.html') {
        published.add(f.replace('.html', ''));
      }
    });
  }
  return published;
}

function updatePillarsIndex(newPillar) {
  if (!fs.existsSync(INDEX_FILE)) return;
  let html = fs.readFileSync(INDEX_FILE, 'utf8');

  // حساب عدد المراجع الحالية
  const files = fs.readdirSync(PILLARS_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');
  const totalCount = files.length;

  // تحديث العناوين والأوصاف بالعدد الجديد
  html = html.replace(/\d+ مرجعاً/g, `${totalCount} مرجعاً`);

  // إضافة بطاقة جديدة قبل إغلاق <div class="grid">
  const cardHtml = `
      <!-- ${newPillar.title} -->
      <div class="card">
        <div>
          <span class="card-tag" style="background: rgba(99,102,241,0.15); color: #a5b4fc;">${newPillar.category || 'مرجع قانوني'}</span>
          <h2 class="card-title">${newPillar.title}</h2>
          <p class="card-desc">${newPillar.meta_description || newPillar.keyword}</p>
        </div>
        <a href="/pillars/${newPillar.slug}.html" class="card-link">قراءة المرجع الكامل ←</a>
      </div>`;

  if (html.includes('</div>\n  </div>\n\n  <footer>')) {
    html = html.replace('</div>\n  </div>\n\n  <footer>', `${cardHtml}\n    </div>\n  </div>\n\n  <footer>`);
  } else if (html.includes('</div>\n    </div>\n  </div>')) {
    html = html.replace('</div>\n    </div>\n  </div>', `${cardHtml}\n    </div>\n  </div>`);
  }

  fs.writeFileSync(INDEX_FILE, html, 'utf8');
  console.log(`[index] ✓ تم تحديث public/pillars/index.html المراجع الإجمالية: ${totalCount}`);
}

async function publishPillarTopic(topic) {
  console.log(`\n==================================================`);
  console.log(`📚 جاري توليد المرجع القانوني الشامل: ${topic.title}`);
  console.log(`🔑 الكلمة المفتاحية: ${topic.keyword}`);
  console.log(`==================================================`);

  const generateScript = path.join(__dirname, 'generate-pillar.cjs');
  execSync(`node "${generateScript}" --name "${topic.slug}" --keyword "${topic.keyword}" --category "${topic.category}"`, {
    stdio: 'inherit',
    cwd: ROOT,
  });

  const pillarPath = path.join(PILLARS_DIR, `${topic.slug}.html`);
  if (!fs.existsSync(pillarPath)) {
    throw new Error(`تعذر العثور على الملف المولّد: ${pillarPath}`);
  }

  // قراءة الوصف من الملف المولّد لتحديث الفهرس
  const pillarContent = fs.readFileSync(pillarPath, 'utf8');
  const descMatch = pillarContent.match(/<meta name="description" content="([^"]+)"/);
  const metaDesc = descMatch ? descMatch[1] : topic.keyword;

  // 1. تحديث الفهرس
  updatePillarsIndex({
    slug: topic.slug,
    title: topic.title,
    keyword: topic.keyword,
    category: topic.category,
    meta_description: metaDesc,
  });

  // 2. تحديث الخريطة sitemap
  if (fs.existsSync(SITEMAP_SCRIPT)) {
    try {
      execSync(`node "${SITEMAP_SCRIPT}"`, { stdio: 'inherit', cwd: ROOT });
    } catch (e) {
      console.warn(`[sitemap] ⚠️ فشل تحديث السايت ماب: ${e.message}`);
    }
  }

  // 3. تسجيل النشر
  const log = readJson(LOG_FILE, { entries: [] });
  log.entries.push({
    slug: topic.slug,
    title: topic.title,
    keyword: topic.keyword,
    category: topic.category,
    publishedAt: new Date().toISOString(),
  });
  writeJson(LOG_FILE, log);

  console.log(`✅ تم نشر المرجع بنجاح: ${BASE_URL}/pillars/${topic.slug}.html`);
}

async function main() {
  const args = parseArgs();
  const topics = readJson(TOPICS_FILE, []);
  const publishedSlugs = getPublishedSlugs();

  let targetTopics = [];

  if (args.slug) {
    const found = topics.find(t => t.slug === args.slug);
    if (found) targetTopics = [found];
    else {
      console.error(`❌ لم يتم العثور على الموضوع بالـ slug: ${args.slug}`);
      process.exit(1);
    }
  } else {
    // اختيار الموضوعات غير المنشورة
    targetTopics = topics.filter(t => !publishedSlugs.has(t.slug)).slice(0, args.count);
  }

  if (targetTopics.length === 0) {
    console.log('✅ جميع المراجع القانونية في القائمة تم نشرها مسبقاً!');
    return;
  }

  for (const topic of targetTopics) {
    try {
      await publishPillarTopic(topic);
    } catch (err) {
      console.error(`❌ فشل نشر المرجع [${topic.slug}]:`, err.message);
    }
  }
}

main().catch(err => {
  console.error('❌ خطأ غير متوقع:', err.message);
  process.exit(1);
});
