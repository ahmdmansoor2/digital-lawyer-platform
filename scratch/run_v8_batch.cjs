const fs = require('fs');
const path = require('path');

const JS_REDIRECT_PATTERNS = [
  /<script>\s*if\s*\(\s*location\.hostname\s*===\s*["']www\.mohamidigital\.online["']\s*\)\s*location\.replace\([^<]+\)\s*<\/script>\s*(?:<!--\s*www-mohami-guard\s*-->)?/gi
];

const NOINDEX_FILES = new Set(["404.html", "search.html", "action.html", "googlec03a96f2162c19b9.html"]);
const SKIP_EEAT_FILES = new Set(["404.html", "search.html", "action.html", "googlec03a96f2162c19b9.html", "index.html"]);
const ADSENSE_CLIENT = "ca-pub-7725405859334364";
const ADSENSE_META_TAG = `<meta name="google-adsense-account" content="${ADSENSE_CLIENT}" />`;
const ZERO_FOUC_SNIPPET = '<script>(function(){try{var t=localStorage.getItem("mohami_theme_mode");if(t==="light")document.documentElement.classList.add("public-theme-light");var fs=localStorage.getItem("mohami_font_scale");if(fs)document.documentElement.style.fontSize=fs+"%";}catch(e){}})();</script>';

const STRAY_PIPE_REPLACEMENTS = [
  ["| | المحامي الرقمي", "| المحامي الرقمي"],
  ["| | منصة المحامي الرقمية", "| منصة المحامي الرقمية"],
  ["منصة | المحامي الرقمية", "منصة المحامي الرقمية"],
  ["فريق | المحامي الرقمي", "فريق منصة المحامي الرقمية"],
  ["جرّب | المحامي الرقمي", "جرّب منصة المحامي الرقمية"],
  ["جرب | المحامي الرقمي", "جرب منصة المحامي الرقمية"],
  ["⚖️ | المحامي الرقمي", "⚖️ منصة المحامي الرقمية"],
  ["© 2026 | المحامي الرقمي", "© 2026 منصة المحامي الرقمية"],
  ["مميزات | المحامي الرقمي", "مميزات منصة المحامي الرقمية"],
  ["اكتشف قوة | المحامي الرقمي", "اكتشف قوة منصة المحامي الرقمية"],
  ["مؤسس | المحامي الرقمي", "مؤسس منصة المحامي الرقمية"],
  ["انطلقت | المحامي الرقمي", "انطلقت منصة المحامي الرقمية"],
  ["تلتزم | المحامي الرقمي", "تلتزم منصة المحامي الرقمية"],
  ["تستخدم | المحامي الرقمي", "تستخدم منصة المحامي الرقمية"],
  ["تقدم | المحامي الرقمي", "تقدم منصة المحامي الرقمية"],
  ["توفر | المحامي الرقمي", "توفر منصة المحامي الرقمية"],
  ["تتيح | المحامي الرقمي", "تتيح منصة المحامي الرقمية"],
  ["تعد | المحامي الرقمي", "تعد منصة المحامي الرقمية"],
  ["تُعد | المحامي الرقمي", "تُعد منصة المحامي الرقمية"],
  ["إن | المحامي الرقمي", "إن منصة المحامي الرقمية"],
  ["أن | المحامي الرقمي", "أن منصة المحامي الرقمية"],
  ["بأن | المحامي الرقمي", "بأن منصة المحامي الرقمية"],
  ["مع | المحامي الرقمي", "مع منصة المحامي الرقمية"],
  ["من | المحامي الرقمي", "من منصة المحامي الرقمية"],
  ["إلى | المحامي الرقمي", "إلى منصة المحامي الرقمية"],
  ["لدى | المحامي الرقمي", "لدى منصة المحامي الرقمية"],
  ["عبر | المحامي الرقمي", "عبر منصة المحامي الرقمية"],
  ["على | المحامي الرقمي", "على منصة المحامي الرقمية"],
  ["في | المحامي الرقمي", "في منصة المحامي الرقمية"],
  ["داخل | المحامي الرقمي", "داخل منصة المحامي الرقمية"],
  ["موقع | المحامي الرقمي", "موقع منصة المحامي الرقمية"],
  ["بوابة | المحامي الرقمي", "بوابة منصة المحامي الرقمية"],
  ["تطبيق | المحامي الرقمي", "تطبيق منصة المحامي الرقمية"],
  ["نظام | المحامي الرقمي", "نظام منصة المحامي الرقمية"],
  ["خدمات | المحامي الرقمي", "خدمات منصة المحامي الرقمية"],
  ["ما هي | المحامي الرقمي", "ما هي منصة المحامي الرقمية"],
  ["صادر من | المحامي الرقمي", "صادر من منصة المحامي الرقمية"],
  ["، | المحامي الرقمي،", "، منصة المحامي الرقمية،"],
  ["المحافظات | المحامي الرقمي", "المحافظات — منصة المحامي الرقمية"]
];

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

function fixJsPipesInScript(match, attrs, body) {
  if (attrs.toLowerCase().includes('ld+json')) {
    return match;
  }
  let fixedBody = body.replace(/ \| (?![\u0600-\u06FF])/g, ' || ');
  fixedBody = fixedBody.replace(/(<\/div>|<\/pre>)\s*\n\s*<\/body><\/html>'/g, "$1</body></html>'");
  return `<script${attrs}>${fixedBody}</script>`;
}

function fixHtmlFile(filepath) {
  const filename = path.basename(filepath);
  if (filename === 'googlec03a96f2162c19b9.html') return false;

  const original = fs.readFileSync(filepath, 'utf8');
  let content = original;

  // 1. Remove client-side JS redirect script
  for (const pat of JS_REDIRECT_PATTERNS) {
    content = content.replace(pat, '');
  }

  // 2. Fix corrupted single pipe `|` and unescaped newline in script blocks
  content = content.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => fixJsPipesInScript(m, attrs, body));

  // 3. Fix double pipe and corrupted brand names
  for (const [oldS, newS] of STRAY_PIPE_REPLACEMENTS) {
    content = content.split(oldS).join(newS);
  }

  // 4. Strip invalid <a href="...">...</a> tags injected inside <head>...</head>
  content = content.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, (headMatch) => {
    return headMatch.replace(/<a\s+[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  });

  // 5. Fix accidental double quotes at end of meta attributes
  content = content.replace(/content="([^\n\r"]*?)""(\s*\/?>)/g, 'content="$1"$2');

  // 6. Fix missing logo.png in JSON-LD -> logo.svg
  content = content.replace(/https:\/\/mohamidigital\.online\/logo\.png/g, 'https://mohamidigital.online/logo.svg');

  // 7. Ensure proper robots and Google AdSense account
  const hasRobots = /<meta\s+name=["']robots["']/i.test(content);
  if (NOINDEX_FILES.has(filename)) {
    if (hasRobots) {
      content = content.replace(/<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i, '<meta name="robots" content="noindex, follow" />');
    } else if (content.includes('<head>')) {
      content = content.replace('<head>', '<head>\n  <meta name="robots" content="noindex, follow" />');
    }
    content = content.replace(/\s*<script[^>]*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/gi, '');
    content = content.replace(/\s*<meta\s+name=["']google-adsense-account["'][^>]*>/gi, '');
  } else {
    if (!hasRobots && content.includes('<head>')) {
      content = content.replace('<head>', '<head>\n  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />');
    }
    if (!content.includes('google-adsense-account') && content.includes('</head>')) {
      content = content.replace('</head>', `  ${ADSENSE_META_TAG}\n</head>`);
    }
  }

  // 8. Zero-FOUC Theme & Font scale script
  if (!content.includes('mohami_theme_mode') && content.includes('<head>')) {
    content = content.replace('<head>', `<head>\n  ${ZERO_FOUC_SNIPPET}`);
  }

  // 9. Ensure /header.css?v=20261016v8
  if (!content.includes('/header.css') && content.includes('</head>') && filename !== 'action.html') {
    content = content.replace('</head>', '  <link rel="stylesheet" href="/header.css?v=20261016v8" />\n</head>');
  } else if (content.includes('/header.css?v=') && !content.includes('/header.css?v=20261016v8')) {
    content = content.replace(/\/header\.css\?v=[^"'\s]+/g, '/header.css?v=20261016v8');
  }

  // 10. Inject E-E-A-T Legal Verification Card
  if (!SKIP_EEAT_FILES.has(filename) && !content.includes('eeat-verification-box')) {
    if (content.includes('<footer')) {
      content = content.replace('<footer', EEAT_BOX_HTML + '\n  <footer');
    } else if (content.includes('</main>')) {
      content = content.replace('</main>', '</main>\n' + EEAT_BOX_HTML);
    }
  }

  // 11. Unified navigation scripts (updated to v8)
  if (!NOINDEX_FILES.has(filename) && filename !== '404.html') {
    if (!content.includes('/sidebar.js') && content.includes('</body>')) {
      content = content.replace('</body>', '  <script src="/sidebar.js?v=20261016v8" defer></script>\n</body>');
    } else if (content.includes('/sidebar.js?v=') && !content.includes('/sidebar.js?v=20261016v8')) {
      content = content.replace(/\/sidebar\.js\?v=[^"'\s]+/g, '/sidebar.js?v=20261016v8');
    }

    if (!content.includes('/mobile-dock.js') && content.includes('</body>')) {
      content = content.replace('</body>', '  <script src="/mobile-dock.js?v=20261016v8" defer></script>\n</body>');
    } else if (content.includes('/mobile-dock.js?v=') && !content.includes('/mobile-dock.js?v=20261016v8')) {
      content = content.replace(/\/mobile-dock\.js\?v=[^"'\s]+/g, '/mobile-dock.js?v=20261016v8');
    }
  }

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  let count = 0;
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = walkDir(full);
      count += sub.count;
      total += sub.total;
    } else if (e.name.toLowerCase().endsWith('.html')) {
      total++;
      if (fixHtmlFile(full)) {
        count++;
      }
    }
  }
  return { count, total };
}

const target = process.argv[2] || 'public';
console.log(`Starting v8 batch processing on: ${target}`);
const result = walkDir(target);
console.log(`Finished: Inspected ${result.total} HTML files, upgraded ${result.count} files to v8.`);
