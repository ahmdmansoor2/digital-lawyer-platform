const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, 'public');

const JS_REDIRECT_PATTERNS = [
  /<script>\s*if\s*\(\s*location\.hostname\s*===\s*["']www\.mohamidigital\.online["']\s*\)\s*location\.replace\([^<]+\)\s*<\/script>\s*(?:<!--\s*www-mohami-guard\s*-->)?/gi
];

const NOINDEX_FILES = new Set(['404.html', 'search.html', 'action.html', 'googlec03a96f2162c19b9.html']);
const SKIP_EEAT_FILES = new Set(['404.html', 'search.html', 'action.html', 'googlec03a96f2162c19b9.html', 'index.html']);

const EEAT_BOX_HTML = `
  <!-- E-E-A-T Legal Verification & Editorial Review Card -->
  <aside class="eeat-verification-box no-print" aria-label="بطاقة التدقيق والمراجعة القانونية" style="max-width:1160px; margin:28px auto; padding:20px 24px; background:linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.85)); border:1px solid rgba(16,185,129,0.35); border-right:4px solid #10b981; border-radius:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; font-family:'Cairo',sans-serif; direction:rtl;">
    <div style="display:flex; align-items:center; gap:14px; flex:1; min-width:260px;">
      <div style="width:48px; height:48px; border-radius:14px; background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.4); display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0;">⚖️</div>
      <div>
        <div style="font-size:0.95rem; font-weight:900; color:#fff; margin-bottom:3px;">تمت المراجعة والتدقيق القانوني بواسطة: المستشار أحمد منصور</div>
        <div style="font-size:0.8rem; color:#94a3b8; line-height:1.6;">محامٍ مقيد أمام محكمة النقض والمحكمة الإدارية العليا والدستورية العليا (قيد نقابة المحامين رقم 184920) · مطابق لأحدث التشريعات المصرية وأحكام النقض حتى أكتوبر 2026.</div>
      </div>
    </div>
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <a href="/editorial-policy.html" style="padding:8px 14px; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#e2e8f0; font-size:0.78rem; font-weight:700; text-decoration:none;">📋 السياسة التحريرية</a>
      <a href="/about.html" style="padding:8px 14px; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#e2e8f0; font-size:0.78rem; font-weight:700; text-decoration:none;">👨‍⚖️ السيرة المهنية</a>
      <a href="/legal-consultations.html" style="padding:8px 14px; border-radius:10px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-size:0.78rem; font-weight:800; text-decoration:none;">💬 اطلب استشارة مباشرة</a>
    </div>
  </aside>
`;

function fixJsPipesInScript(fullMatch, attrs, body) {
  if (/ld\+json/i.test(attrs)) return fullMatch;
  // 1. Fix corrupted single pipe
  let fixed = body.replace(/ \| (?![\u0600-\u06FF])/g, ' || ');
  // 2. Fix accidental newline before </body></html>'
  fixed = fixed.replace(/(<\/div>|<\/pre>)\s*\n\s*<\/body><\/html>'/g, '$1</body></html>\'');
  return `<script${attrs}>${fixed}</script>`;
}

function fixHtmlFile(filepath) {
  const filename = path.basename(filepath);
  if (filename === 'googlec03a96f2162c19b9.html') return false;

  let original = fs.readFileSync(filepath, 'utf8');
  let content = original;

  // 1. Remove JS redirect
  for (const pat of JS_REDIRECT_PATTERNS) {
    content = content.replace(pat, '');
  }

  // 2. Fix JS pipes and newlines
  content = content.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, fixJsPipesInScript);

  // 3. Fix double pipe and corrupted brand name
  content = content.replace(/\|\s*\|\s*المحامي الرقمي/g, '| المحامي الرقمي');
  content = content.replace(/\|\s*\|\s*منصة المحامي الرقمية/g, '| منصة المحامي الرقمية');
  content = content.replace(/منصة \| المحامي الرقمية/g, 'منصة المحامي الرقمية');
  content = content.replace(/عبر \| المحامي الرقمي/g, 'عبر منصة المحامي الرقمية');
  content = content.replace(/على \| المحامي الرقمي/g, 'على منصة المحامي الرقمية');
  content = content.replace(/في \| المحامي الرقمي/g, 'في منصة المحامي الرقمية');
  content = content.replace(/ما هي \| المحامي الرقمي/g, 'ما هي منصة المحامي الرقمية');
  content = content.replace(/صادر من \| المحامي الرقمي/g, 'صادر من منصة المحامي الرقمية');

  // 4. Strip invalid <a> tags from <head>
  content = content.replace(/<head\b[^>]*>([\s\S]*?)<\/head>/gi, (match) => {
    return match.replace(/<a\s+[^>]*>(.*?)<\/a>/gi, '$1');
  });

  // 5. Fix double quotes at end of og:title or meta content
  content = content.replace(/content="([^\n\r"]*?)""(\s*\/?>)/g, 'content="$1"$2');

  // 6. Fix missing logo.png in JSON-LD -> logo.svg
  content = content.replace(/https:\/\/mohamidigital\.online\/logo\.png/g, 'https://mohamidigital.online/logo.svg');

  // 7. Meta robots
  const hasRobots = /<meta\s+name=["']robots["']/i.test(content);
  if (NOINDEX_FILES.has(filename)) {
    if (hasRobots) {
      content = content.replace(/<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/gi, '<meta name="robots" content="noindex, follow" />');
    } else if (content.includes('<head>')) {
      content = content.replace('<head>', '<head>\n  <meta name="robots" content="noindex, follow" />');
    }
  } else {
    if (!hasRobots && content.includes('<head>')) {
      content = content.replace('<head>', '<head>\n  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />');
    }
  }

  // 8. Inject EEAT verification card
  if (!SKIP_EEAT_FILES.has(filename) && !content.includes('eeat-verification-box')) {
    if (content.includes('<footer')) {
      content = content.replace('<footer', EEAT_BOX_HTML + '\n  <footer');
    } else if (content.includes('</main>')) {
      content = content.replace('</main>', '</main>\n' + EEAT_BOX_HTML);
    }
  }

  // 9. Sidebar and Mobile-dock
  if (!NOINDEX_FILES.has(filename)) {
    if (!content.includes('/sidebar.js') && content.includes('</body>')) {
      content = content.replace('</body>', '  <script src="/sidebar.js?v=20261016" defer></script>\n</body>');
    }
    if (!content.includes('/mobile-dock.js') && content.includes('</body>')) {
      content = content.replace('</body>', '  <script src="/mobile-dock.js?v=20261016" defer></script>\n</body>');
    }
  }

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    return true;
  }
  return false;
}

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      files = files.concat(walk(p));
    } else if (item.endsWith('.html')) {
      files.push(p);
    }
  }
  return files;
}

const allHtml = walk(TARGET_DIR);
let updated = 0;
for (const f of allHtml) {
  if (fixHtmlFile(f)) updated++;
}

console.log(`Scan completed: ${allHtml.length} HTML files scanned, ${updated} files updated.`);
