#!/usr/bin/env node
/**
 * seo-master.cjs — السكريبت الرئيسي لأتمتة SEO
 *
 * يشغّل كل أدوات SEO في تتابع:
 *   1) keyword-research — توليد 50+ long-tail keywords
 *   2) generate-pillar — توليد pillar content (3,500+ كلمة)
 *   3) internal-linking — ربط 54 مقال ببعض
 *   4) competitor-analysis — تحليل السوق
 *   5) add-article-schema — تأكد كل المقالات بـ schema
 *
 * الاستخدام:
 *   node scripts/seo/seo-master.cjs                    # تشغيل كله
 *   node scripts/seo/seo-master.cjs --only keywords    # جزء واحد
 *   node scripts/seo/seo-master.cjs --skip linking     # تخطّي جزء
 *
 * المهام المجدولة (Windows Task Scheduler):
 *   - يومياً 3 صباحاً: blog-publisher (تنشر 5 مقالات)
 *   - أسبوعياً (الجمعة): seo-master keywords + linking
 *   - شهرياً: seo-master competitor + pillar
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SEO_DIR = __dirname;

function runScript(name, args = []) {
  const script = path.join(SEO_DIR, name);
  const cmd = `node "${script}" ${args.join(' ')}`;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`▶ ${name} ${args.join(' ')}`);
  console.log('═'.repeat(60));
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
    return true;
  } catch (e) {
    console.error(`❌ فشل ${name}: ${e.message?.split('\n')[0]}`);
    return false;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let only = null, skip = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--only' && args[i + 1]) only = args[++i];
    else if (args[i].startsWith('--only=')) only = args[i].split('=')[1];
    else if (args[i] === '--skip' && args[i + 1]) skip = args[++i];
    else if (args[i].startsWith('--skip=')) skip = args[i].split('=')[1];
  }
  return {
    only,
    skip: skip ? skip.split(',') : [],
    dryRun: args.includes('--dry-run'),
  };
}

const JOBS = {
  schema: () => runScript('add-article-schema.cjs'),
  keywords: () => runScript('keyword-research.cjs'),
  pillar: () => {
    // 3 pillars افتراضية
    const pillars = [
      { name: 'law-firm-management', keyword: 'إدارة مكاتب المحاماة في مصر', category: 'إدارة مكاتب' },
      { name: 'labor-law-egypt', keyword: 'قانون العمل المصري 2026', category: 'قانون عمالي' },
      { name: 'contracts-drafting', keyword: 'صياغة العقود القانونية في مصر', category: 'قانون مدني' },
    ];
    for (const p of pillars) {
      runScript('generate-pillar.cjs', [`--name=${p.name}`, `"--keyword=${p.keyword}"`, `"--category=${p.category}"`]);
    }
  },
  linking: () => runScript('internal-linking.cjs', process.argv.includes('--dry-run') ? ['--dry-run'] : []),
  competitors: () => runScript('competitor-analysis.cjs'),
};

async function main() {
  const args = parseArgs();
  console.log('🚀 SEO Master — أتمتة SEO شاملة');
  console.log(`📅 ${new Date().toLocaleString('ar-EG')}\n`);

  if (args.only) {
    if (!JOBS[args.only]) {
      console.error(`❌ مهمة غير معروفة: ${args.only}. المتاح: ${Object.keys(JOBS).join(', ')}`);
      process.exit(1);
    }
    console.log(`🎯 تشغيل مهمة واحدة: ${args.only}\n`);
    JOBS[args.only]();
    return;
  }

  // تشغيل كل المهام (باستثناء المُتخطّاة)
  const order = ['schema', 'keywords', 'pillar', 'linking', 'competitors'];
  const results = {};

  for (const jobName of order) {
    if (args.skip.includes(jobName)) {
      console.log(`⊘ تخطي: ${jobName}`);
      continue;
    }
    const start = Date.now();
    const ok = JOBS[jobName]();
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    results[jobName] = { ok, duration: `${duration}s` };
  }

  // ملخص نهائي
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 ملخص التنفيذ');
  console.log('═'.repeat(60));
  for (const [name, r] of Object.entries(results)) {
    const icon = r.ok ? '✓' : '❌';
    console.log(`  ${icon} ${name.padEnd(15)} ${r.duration}`);
  }

  const allOk = Object.values(results).every(r => r.ok);
  if (allOk) {
    console.log('\n🎉 كل المهام تمت بنجاح!');
  } else {
    console.log('\n⚠️  بعض المهام فشلت — راجع الـ logs');
    process.exit(1);
  }
}

main();
