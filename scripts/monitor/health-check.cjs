#!/usr/bin/env node
/**
 * health-check.cjs — الفحص الصحي اليومي الشامل لمنصة المحامي الرقمية
 * ------------------------------------------------------------------
 * يعمل تلقائياً كل يوم عبر GitHub Actions (daily-health-monitor.yml)
 * أو يدوياً: node scripts/monitor/health-check.cjs
 *
 * يفحص:
 *   1. الموقع (Firebase Hosting): الصفحة الرئيسية + أصول JS/CSS + المدونة
 *   2. سلامة النشر: كل مقالات المدونة حية + صورها سليمة (JPG/PNG وليست SVG فقط)
 *   3. فيسبوك: منشورات اليوم + وجود صور + مطابقة مقالات اليوم المنشورة
 *   4. الريلز: فيديوهات اليوم على الصفحة
 *   5. الاستضافة: sitemap + تطابق سجلّات النشر مع المحتوى الحي
 *   6. GitHub: نتائج تشغيل الـ workflows اليومية
 *
 * الإخراج:
 *   - reports/health/<التاريخ>.md  (تقرير مفصل)
 *   - reports/health/latest.json   (ملخص آلي)
 *   - لو وُجدت أخطاء و GITHUB_TOKEN مضبوط → فتح/تحديث GitHub Issue تلقائياً
 */
'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
let dotenv = null;
try {
  dotenv = require('dotenv');
  dotenv.config({ path: path.join(ROOT, '.env') });
} catch { /* في CI لا يوجد .env — كل شيء من env */ }

const BASE_URL = process.env.MONITOR_BASE_URL || 'https://justice-91571.web.app';
const FB_PAGE_ID = process.env.FB_PAGE_ID || process.env.MONITOR_FB_PAGE_ID || '';
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN || process.env.MONITOR_FB_TOKEN || '';
const GH_TOKEN = process.env.GITHUB_TOKEN || '';
const GH_REPO = process.env.GITHUB_REPOSITORY || 'ahmdmansoor2/digital-lawyer-platform';
const CAIRO_OFFSET = 120;
const REPORT_DIR = path.join(ROOT, 'reports', 'health');
const CONCURRENCY = 6;
const REQUEST_TIMEOUT = 20000;

function cairoDate() {
  return new Date(Date.now() + CAIRO_OFFSET * 60000).toISOString().slice(0, 10);
}

function nowCairoLabel() {
  return new Date(Date.now() + CAIRO_OFFSET * 60000).toISOString().replace('T', ' ').slice(0, 19) + ' (Cairo)';
}

// ── أدوات HTTP ────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, opts = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT), ...opts });
  return res;
}

async function getText(url, headers = {}) {
  const res = await fetchWithTimeout(url, { headers, redirect: 'follow' });
  return { status: res.status, text: await res.text() };
}

async function getJson(url, headers = {}) {
  const res = await fetchWithTimeout(url, { headers });
  let data = {};
  try { data = await res.json(); } catch { /* تجاهل */ }
  return { status: res.status, data };
}

function countReplacementChars(text) {
  // U+FFFD = الناتج عن تلف ترميز (CP1256 round-trip) — مؤشر قوي على ملفات مكسورة
  return (text.match(/\uFFFD/g) || []).length;
}

function countArabic(text) {
  return (text.match(/[\u0600-\u06FF]/g) || []).length;
}

function extractArticleSlugs(html) {
  const set = new Set();
  const re = /href="(\/blog\/[a-z0-9-]+\.html)"/g;
  let m;
  while ((m = re.exec(html))) set.add(m[1]);
  return [...set];
}

function extractImageRefs(html, base) {
  const refs = new Set();
  const re = /(?:src|content)="(\/blog\/images\/[^"#?]+)"/g;
  let m;
  while ((m = re.exec(html))) refs.add(m[1]);
  // روابط og:image المطلقة
  const re2 = new RegExp(`"(${base.replace(/[.]/g, '\\.')}/blog/images/[^"#?]+)"`, 'g');
  while ((m = re2.exec(html))) refs.add(m[1].replace(base, ''));
  return [...refs];
}

function extractAssets(html) {
  const set = new Set();
  const re = /(?:src|href)="(\.?\/?(?:assets|src)\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    let p = m[1];
    if (p.startsWith('./')) p = p.slice(1);
    if (p.startsWith('/')) set.add(p);
  }
  return [...set];
}

// ── سجلّ النتائج ──────────────────────────────────────────────────────────
const checks = [];
function addCheck(name, label) {
  const c = { name, label, status: 'ok', findings: [] };
  checks.push(c);
  return c;
}
function find(c, level, message, url) {
  c.findings.push({ level, message, url });
  if (level === 'error' && c.status === 'ok') c.status = 'error';
  if (level === 'warn' && c.status === 'ok') c.status = 'warn';
}

// ── مجمّع الطلبات المتوازية (بحد أقصى) ────────────────────────────────────
async function runPool(items, worker) {
  const results = new Array(items.length);
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i], i);
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, items.length); i++) workers.push(next());
  await Promise.all(workers);
  return results;
}

// ══ 1) الصفحة الرئيسية + أصول التطبيق ═════════════════════════════════════
async function checkSiteRoot() {
  const c = addCheck('site_root', 'الموقع: الصفحة الرئيسية وأصول التطبيق');
  try {
    const { status, text } = await getText(BASE_URL + '/');
    if (status !== 200) {
      find(c, 'error', `الصفحة الرئيسية أعادت HTTP ${status} بدلاً من 200`, BASE_URL + '/');
      return;
    }
    if (!/منصة المحامي الرقمية/.test(text)) find(c, 'error', 'لا يوجد عنوان «منصة المحامي الرقمية» في الصفحة الرئيسية', BASE_URL + '/');
    const bad = countReplacementChars(text);
    if (bad > 0) find(c, 'error', `وجد ${bad} رمز ترميز تالف (U+FFFD) في الصفحة الرئيسية`, BASE_URL + '/');
    const ar = countArabic(text);
    if (ar < 100) find(c, 'warn', `محتوى عربي قليل في الصفحة الرئيسية (${ar} حرفاً)`);

    // أصول التطبيق (حزم JS/CSS) يجب أن تكون حية — تدل على سلامة الـ build المنشور
    const assets = extractAssets(text);
    if (assets.length === 0) {
      find(c, 'warn', 'لم يتم العثور على أصول JS/CSS في الصفحة الرئيسية');
    } else {
      const dead = [];
      await runPool(assets, async (a) => {
        try {
          const r = await fetchWithTimeout(BASE_URL + a, { method: 'HEAD' });
          if (r.status !== 200 && r.status !== 304) dead.push(`${a} → ${r.status}`);
        } catch (e) {
          dead.push(`${a} → ${e.message}`);
        }
      });
      if (dead.length) find(c, 'error', `أصول مكسورة (${dead.length}): ${dead.slice(0, 3).join('، ')}`, BASE_URL + '/');
    }
    c.summary = `الصفحة الرئيسية 200 + ${assets.length} أصل (JS/CSS)`;
  } catch (e) {
    find(c, 'error', `تعذّر الوصول للصفحة الرئيسية: ${e.message}`, BASE_URL + '/');
  }
}

// ══ 2) فهرس المدونة ═══════════════════════════════════════════════════════
async function checkBlogIndex() {
  const c = addCheck('blog_index', 'المدونة: الفهرس والروابط');
  try {
    const { status, text } = await getText(BASE_URL + '/blog/');
    if (status !== 200) {
      find(c, 'error', `فهرس المدونة أعاد HTTP ${status}`, BASE_URL + '/blog/');
      return null;
    }
    const slugs = extractArticleSlugs(text);
    if (slugs.length === 0) {
      find(c, 'error', 'لم يتم العثور على أي روابط مقالات في فهرس المدونة', BASE_URL + '/blog/');
    }
    const bad = countReplacementChars(text);
    if (bad > 0) find(c, 'error', `${bad} رمز ترميز تالف في فهرس المدونة`, BASE_URL + '/blog/');
    c.summary = `${slugs.length} مقالاً في الفهرس`;
    return slugs;
  } catch (e) {
    find(c, 'error', `تعذّر الوصول لفهرس المدونة: ${e.message}`, BASE_URL + '/blog/');
    return null;
  }
}

// ══ 3) سلامة مقالات المدونة + صورها ═══════════════════════════════════════
async function checkArticles(slugs) {
  const c = addCheck('articles', 'المدونة: سلامة المقالات والصور (og:image)');
  if (!slugs || !slugs.length) {
    find(c, 'warn', 'لا مقالات لفحصها');
    return;
  }
  const problems = { http: [], mojibake: [], missingMeta: [], imageDead: [], imageSvg: [] };
  let checked = 0;

  await runPool(slugs, async (rel) => {
    const articleUrl = BASE_URL + rel;
    try {
      const { status, text } = await getText(articleUrl);
      if (status !== 200) { problems.http.push(`${rel} → ${status}`); return; }
      checked++;
      const bad = countReplacementChars(text);
      if (bad > 0) problems.mojibake.push(`${rel} (${bad})`);
      const ogImage = (text.match(/property="og:image" content="([^"]+)/) || [])[1];
      const ogTitle = /property="og:title" content="[^"]+/.test(text);
      if (!ogImage || !ogTitle) problems.missingMeta.push(rel);
      if (countArabic(text) < 500) problems.missingMeta.push(`${rel} (محتوى عربي قليل)`);

      // فحص صور المقال (og:image + الصور المضمّنة)
      const refs = extractImageRefs(text, BASE_URL);
      const unique = [...new Set(refs)];
      await runPool(unique, async (imgRel) => {
        const imgUrl = BASE_URL + imgRel;
        try {
          const r = await fetchWithTimeout(imgUrl, { method: 'HEAD' });
          if (r.status !== 200) { problems.imageDead.push(`${imgRel} → ${r.status}`); return; }
          const ct = (r.headers.get('content-type') || '');
          if (/svg/i.test(ct)) {
            // SVG لا يُعرض في معاينة فيسبوك — المقال سينشر بلا صورة هناك
            problems.imageSvg.push(imgRel);
          }
        } catch (e) {
          problems.imageDead.push(`${imgRel} → ${e.message}`);
        }
      });
    } catch (e) {
      problems.http.push(`${rel} → ${e.message}`);
    }
  });

  if (problems.http.length) find(c, 'error', `مقالات تالفة HTTP (${problems.http.length}): ${problems.http.slice(0, 3).join('، ')}`);
  if (problems.mojibake.length) find(c, 'error', `مقالات بترميز تالف (${problems.mojibake.length}): ${problems.mojibake.slice(0, 3).join('، ')}`);
  if (problems.missingMeta.length) find(c, 'error', `مقالات تنقصها وسوم og أو المحتوى (${problems.missingMeta.length}): ${problems.missingMeta.slice(0, 3).join('، ')}`);
  if (problems.imageDead.length) find(c, 'error', `صور مكسورة (${problems.imageDead.length}): ${problems.imageDead.slice(0, 3).join('، ')}`);
  if (problems.imageSvg.length) find(c, 'warn', `أغلفة SVG فقط — فيسبوك لن يعرضها كصورة (${problems.imageSvg.length}): ${problems.imageSvg.slice(0, 3).join('، ')}`);

  c.summary = `فحص ${checked}/${slugs.length} مقالاً — صور: ${problems.imageDead.length} مكسورة، ${problems.imageSvg.length} SVG`;
}

// ══ 4) خريطة الموقع ═══════════════════════════════════════════════════════
async function checkSitemap(articleCount) {
  const c = addCheck('sitemap', 'الاستضافة: خريطة الموقع sitemap.xml');
  try {
    const { status, text } = await getText(BASE_URL + '/sitemap.xml');
    if (status !== 200) { find(c, 'error', `sitemap.xml أعاد HTTP ${status}`); return; }
    const locs = (text.match(/<loc>([^<]+)<\/loc>/g) || []).length;
    if (locs === 0) { find(c, 'warn', 'sitemap.xml لا يحتوي على روابط'); return; }
    if (articleCount && Math.abs(locs - articleCount) > 3) {
      find(c, 'warn', `عدد روابط sitemap (${locs}) لا يطابق عدد مقالات الفهرس (${articleCount})`);
    }
    c.summary = `${locs} رابطاً في sitemap`;
  } catch (e) {
    find(c, 'error', `تعذّر قراءة sitemap.xml: ${e.message}`);
  }
}

// ══ 5) فيسبوك: منشورات اليوم + الصور + المطابقة ═══════════════════════════
async function checkFacebook(todayArticles) {
  const c = addCheck('facebook', 'فيسبوك: منشورات اليوم والصور والريلز');
  if (!FB_PAGE_ID || !FB_PAGE_TOKEN) {
    find(c, 'warn', 'FB_PAGE_ID / FB_PAGE_TOKEN غير مضبوطين — تخطي فحص فيسبوك');
    return;
  }
  const today = cairoDate();
  const headers = { Authorization: `Bearer ${FB_PAGE_TOKEN}` };

  // 5.1 المنشورات
  let posts = [];
  try {
    const { status, data } = await getJson(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/posts?fields=id,message,created_time,full_picture&limit=100`, headers);
    if (status !== 200) {
      find(c, 'error', `أعطى Graph API خطأ: ${(data.error && data.error.message) || status}`);
    } else {
      posts = (data.data || []).filter(p => (p.created_time || '').slice(0, 10) === today);
      const noImg = posts.filter(p => !p.full_picture);
      if (posts.length === 0) {
        find(c, 'warn', `لا منشورات اليوم (${today}) على الصفحة`);
      } else {
        if (noImg.length) find(c, 'warn', `${noImg.length}/${posts.length} منشورات اليوم بلا صورة`);
      }
    }
  } catch (e) {
    find(c, 'error', `تعذّر الاستعلام عن منشورات فيسبوك: ${e.message}`);
  }

  // 5.2 مطابقة مقالات اليوم المنشورة على المدونة مع فيسبوك
  if (todayArticles && todayArticles.length) {
    const fbCount = posts.length;
    const expectedParts = todayArticles.reduce((s, a) => s + (a.parts || Math.max(1, Math.ceil(a.words / 1200))), 0);
    if (fbCount === 0) {
      find(c, 'error', `نُشر ${todayArticles.length} مقالاً اليوم على المدونة لكن لا توجد أي منشورات فيسبوك لها`);
    } else if (fbCount < todayArticles.length) {
      find(c, 'warn', `مقالات اليوم على المدونة (${todayArticles.length}) أكثر من منشورات فيسبوك (${fbCount})`);
    }
  }

  // 5.3 الريلز (فيديوهات اليوم)
  try {
    const { status, data } = await getJson(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/videos?fields=id,created_time,length&limit=10`, headers);
    if (status !== 200) {
      find(c, 'warn', `فشل فحص الريلز: ${(data.error && data.error.message) || status}`);
    } else {
      const todayVids = (data.data || []).filter(v => (v.created_time || '').slice(0, 10) === today);
      c.reelsToday = todayVids.length;
      if (todayVids.length === 0) {
        find(c, 'warn', `لا ريلز منشورة اليوم (${today})`);
      } else {
        const badLen = todayVids.filter(v => !v.length || Number(v.length) < 3);
        if (badLen.length) find(c, 'warn', `${badLen.length} ريلز بطول غير طبيعي اليوم`);
      }
    }
  } catch (e) {
    find(c, 'warn', `تعذّر فحص الريلز: ${e.message}`);
  }

  c.summary = `${posts.length} منشوراً اليوم + ${c.reelsToday || 0} ريلز`;
  c.fbPosts = posts.length;
  c.reelsToday = c.reelsToday || 0;
}

// ══ 6) GitHub: نتائج تشغيل الـ workflows ═══════════════════════════════════
async function checkGithubRuns() {
  const c = addCheck('github_runs', 'GitHub: نتائج تشغيل الـ workflows اليومية');
  const today = cairoDate();
  try {
    const headers = GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {};
    const { status, data } = await getJson(`https://api.github.com/repos/${GH_REPO}/actions/runs?per_page=25`, headers);
    if (status !== 200) {
      find(c, 'warn', `لا يمكن الوصول لسجل GitHub Actions (${status}) — يلزم GITHUB_TOKEN`);
      return;
    }
    const runs = (data.workflow_runs || [])
      .filter(r => (r.created_at || '').slice(0, 10) === today)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (runs.length === 0) {
      find(c, 'warn', `لا تشغيلات workflows اليوم (${today})`);
      c.summary = '0 تشغيلات اليوم';
      return;
    }
    const byWorkflow = new Map();
    for (const r of runs) {
      const k = r.name || r.path;
      if (!byWorkflow.has(k)) byWorkflow.set(k, []);
      byWorkflow.get(k).push({ status: r.status, conclusion: r.conclusion, head: r.head_sha && r.head_sha.slice(0, 7) });
    }
    const failed = [];
    for (const [name, rs] of byWorkflow) {
      const bad = rs.filter(r => r.conclusion === 'failure' || r.conclusion === 'cancelled' || r.conclusion === 'timed_out');
      if (bad.length) failed.push(`${name} (${bad.length} فشل من ${rs.length})`);
    }
    if (failed.length) find(c, 'error', `Workflows فاشلة اليوم: ${failed.join('، ')}`);
    c.runs = Object.fromEntries([...byWorkflow].map(([k, v]) => [k, v.length]));
    c.summary = `${runs.length} تشغيلاً اليوم${failed.length ? ` — ${failed.length} فشل` : ''}`;
  } catch (e) {
    find(c, 'warn', `تعذّر فحص GitHub: ${e.message}`);
  }
}

// ══ 7) مطابقة سجلّ النشر مع الموقع الحي ═══════════════════════════════════
async function checkLogVsLive(slugs) {
  const c = addCheck('log_vs_live', 'الاستضافة: تطابق سجلّ النشر مع المحتوى الحي');
  let logArticles = [];
  try {
    const log = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'blog-publisher', 'published-log.json'), 'utf8'));
    logArticles = log.published || [];
  } catch (e) {
    find(c, 'warn', `لا يمكن قراءة published-log.json: ${e.message}`);
  }
  if (logArticles.length && slugs && slugs.length) {
    const logSlugs = new Set(logArticles.map(a => a.slug));
    const liveMissing = [...logSlugs].filter(s => !slugs.some(x => x.includes(s)));
    if (liveMissing.length) {
      find(c, 'warn', `${liveMissing.length} مقالات في السجلّ غير موجودة في الفهرس الحي: ${liveMissing.slice(0, 3).join('، ')}`);
    }
  }
  // مقالات اليوم يجب أن تكون حية
  const today = cairoDate();
  const todayLog = logArticles.filter(a => a.date === today);
  if (todayLog.length) {
    const dead = [];
    await runPool(todayLog, async (a) => {
      try {
        const r = await fetchWithTimeout(`${BASE_URL}/blog/${a.slug}.html`, { method: 'HEAD' });
        if (r.status !== 200) dead.push(`${a.slug} → ${r.status}`);
      } catch (e) { dead.push(`${a.slug} → ${e.message}`); }
    });
    if (dead.length) find(c, 'error', `مقالات اليوم المعلن عنها غير حية: ${dead.join('، ')}`);
  }
  c.summary = `${logArticles.length} مقالاً في السجلّ، ${todayLog.length} منها اليوم`;
}

// ══ التقرير ═══════════════════════════════════════════════════════════════
function severityBadge(s) {
  return s === 'error' ? '🔴' : s === 'warn' ? '🟡' : '✅';
}

function buildReport(summary) {
  const date = cairoDate();
  const lines = [];
  lines.push(`# تقرير الفحص الصحي اليومي — ${date}\n`);
  lines.push(`> وقت الفحص: ${nowCairoLabel()} | الحالة الكلية: **${summary.status === 'error' ? '🔴 أخطاء' : summary.status === 'warn' ? '🟡 تحذيرات' : '✅ سليم'}**\n`);
  lines.push('## ملخص\n');
  lines.push(`| المؤشر | القيمة |`);
  lines.push(`|---|---|`);
  lines.push(`| مقالات في فهرس المدونة | ${summary.blogArticles || '—'} |`);
  lines.push(`| منشورات فيسبوك اليوم | ${summary.fbPosts ?? '—'} |`);
  lines.push(`| ريلز اليوم | ${summary.reels ?? '—'} |`);
  lines.push(`| تشغيلات GitHub اليوم | ${summary.ghRuns ?? '—'} |`);
  lines.push('');
  lines.push('## تفاصيل الفحوصات\n');
  for (const c of checks) {
    lines.push(`### ${severityBadge(c.status)} ${c.label} — ${c.status}\n`);
    if (c.summary) lines.push(`> ${c.summary}\n`);
    for (const f of c.findings) {
      const icon = f.level === 'error' ? '🔴' : f.level === 'warn' ? '🟡' : '🔵';
      lines.push(`- ${icon} **${f.level === 'error' ? 'خطأ' : 'تحذير'}:** ${f.message}${f.url ? ` — ${f.url}` : ''}`);
    }
    if (!c.findings.length) lines.push('- لا توجد مشكلات. ✅');
    lines.push('');
  }
  lines.push('---');
  lines.push('*أُنشئ تلقائياً بواسطة نظام المراقبة اليومي.*');
  return lines.join('\n');
}

function overallStatus() {
  if (checks.some(c => c.status === 'error')) return 'error';
  if (checks.some(c => c.status === 'warn')) return 'warn';
  return 'ok';
}

// ══ فتح / تحديث GitHub Issue عند وجود أخطاء ═══════════════════════════════
async function openAlertIssue(mdReport, summary) {
  if (!GH_TOKEN || summary.status !== 'error') return;
  const date = cairoDate();
  const title = `[فحص صحي] 🔴 أخطاء اليوم ${date}`;
  try {
    const headers = { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' };
    const search = await getJson(`https://api.github.com/search/issues?q=repo:${GH_REPO}+type:issue+state:open+in:title+%22${encodeURIComponent(`[فحص صحي] 🔴 أخطاء اليوم ${date}`)}%22`, headers);
    const existing = (search.data.items || [])[0];
    const body = mdReport.split('---')[0] + '\n\n---\n*تحديث تلقائي من نظام المراقبة.*';
    if (existing) {
      const r = await fetch(`https://api.github.com/repos/${GH_REPO}/issues/${existing.number}`, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      console.log(`[issue] تحديث التقرير في issue #${existing.number}`);
    } else {
      const r = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      if (r.status === 201) console.log('[issue] فُتح issue جديد للأخطاء');
      else console.log(`[issue] فشل فتح issue (${r.status})`);
    }
  } catch (e) {
    console.log(`[issue] تعذّر إنشاء issue: ${e.message}`);
  }
}

// ══ MAIN ═══════════════════════════════════════════════════════════════════
(async () => {
  console.log('=== الفحص الصحي اليومي الشامل ===');
  console.log(`التاريخ: ${cairoDate()} | الموقع: ${BASE_URL}`);

  await checkSiteRoot();
  const slugs = await checkBlogIndex();
  await checkArticles(slugs);

  // مقالات اليوم من السجلّ المحلي (للفحص التقاطعي)
  let todayLog = [];
  try {
    const log = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'blog-publisher', 'published-log.json'), 'utf8'));
    todayLog = (log.published || []).filter(a => a.date === cairoDate());
  } catch { /* لا يوجد سجلّ — الفحص التقاطعي لفيسبوك سيُتخطى */ }

  await checkSitemap(slugs && slugs.length);
  await checkFacebook(todayLog);
  await checkGithubRuns();
  await checkLogVsLive(slugs);

  const summary = {
    date: cairoDate(),
    generatedAt: new Date().toISOString(),
    status: overallStatus(),
    blogArticles: slugs ? slugs.length : null,
    fbPosts: (() => { const c = checks.find(x => x.name === 'facebook'); return c.fbPosts !== undefined ? c.fbPosts : null; })(),
    reels: (() => { const c = checks.find(x => x.name === 'facebook'); return c.reelsToday !== undefined ? c.reelsToday : null; })(),
    ghRuns: (() => { const c = checks.find(x => x.name === 'github_runs'); return c.runs ? Object.values(c.runs).reduce((s, n) => s + n, 0) : null; })(),
    checks: checks.map(c => ({ name: c.name, label: c.label, status: c.status, findings: c.findings.length })),
  };

  const md = buildReport(summary);
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, `${cairoDate()}.md`), md, 'utf8');
  fs.writeFileSync(path.join(REPORT_DIR, 'latest.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\nالحالة الكلية: ${summary.status.toUpperCase()}`);
  for (const c of checks) console.log(`  ${severityBadge(c.status)} ${c.label} (${c.findings.length} ملاحظة)`);
  console.log(`\nالتقرير: reports/health/${cairoDate()}.md`);

  await openAlertIssue(md, summary);
})().catch(e => {
  console.error('فشل غير متوقع:', e);
  process.exit(1);
});
