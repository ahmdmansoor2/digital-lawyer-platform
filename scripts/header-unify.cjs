/**
 * header-unify.cjs — حقن الشريط العلوي الزجاجي الجديد في كل صفحات الموقع الثابتة
 * (هجرة لمرة واحدة + إعادة ضبط للملفات الملتزمة التي لم تولّدها مولّدات CI بعد).
 *
 * لكل ملف HTML في public/:
 *   1) يستبدل الهيدر القديم <header class="site-header"> إن وُجد.
 *   2) يحقن الهيدر الجديد (.uh-bar) بعد <body> إن لم يوجد.
 *   3) يضيف <link rel="stylesheet" href="/header.css?v=..."> في <head> إن غاب.
 *   4) يزيل بقايا CSS الميتة القديمة (ال NAV / .nav-logo / .nav-links / .header-).
 *
 * الاستخدام: node scripts/header-unify.cjs
 */
const fs = require('fs');
const path = require('path');
const { headerMarkup, HEADER_CSS } = require('./seo/unified-header.cjs');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

/* ── التعابير ───────────────────────────────────────── */
const OLD_HEADER_RE = /<header class="site-header" id="siteHeader">[\s\S]*?<\/header>/;
const OLD_JS_RE = /([ \t]*)<script>\s*\(function\(\)\{\s*var hdr=document\.getElementById\('siteHeader'\);[\s\S]*?<\/script>/g;
const UH_HEADER_FULL_RE = /<header class="uh-bar" id="siteHeader">[\s\S]*?<\/header>(\s*<script>[\s\S]*?<\/script>)?/;
const CSS_LINK_RE = /\/header\.css/;
const HEAD_RE = /(<\/head>)/;

/* بقايا CSS الميتة (قواعد مكسورة بلا أقواس من الهيدر القديم) */
const NAV_COMMENT_RE = /\/\*[^\n]*NAV[^\n]*\*\/\s*\n\s*\.nav-logo:hover\s*\n\s*\.nav-links a:hover,?\s*\n?/g;
const HEADER_MEDIA_RE = /@media\s*\(max-width:\s*1024px\)\s*\{\s*\.header-\s*\n\s*\}\n?/g;

function isDeadNavSelector(sel) {
  const s = sel.trim();
  if (/^nav(?::not\([^)]*\))?(\s*|,)/.test(s)) return true;
  if (/\.header-/.test(s)) return true;
  if (/(^|,\s*)\.nav-/.test(s)) return true;
  if (/(^|,\s*)\.(?:logo-icon|logo-name|logo-sub)(?=\s*(?:,|$))/.test(s)) return true;
  return false;
}

/* يزيل قواعد الهيدر القديم الميتة من كتلة <style> ويُسقط الكتلة إن خلت */
function cleanCssBlock(css) {
  let out = css.replace(/(^|[\r\n])\s*([^{}\r\n@][^{}\r\n]*?)\s*\{[^{}]*\}/g, (m, pre, sel) =>
    isDeadNavSelector(sel) ? '' : m
  );
  out = out.replace(/^[ \t]*\.(?:nav-|header-)[^;\r\n]*$/gm, '');
  out = out.replace(/@media[^{}]*\{\s*\}/g, '');
  return out;
}

function activeFor(rel) {
  const p = rel.replace(/\\/g, '/');
  const one = (key) => key;
  if (p === 'download.html') return one('download');
  if (p === 'legal-calculators.html') return one('calc');
  if (p === 'courts-directory.html') return one('courts');
  if (p === 'court-precedents.html') return one('precedents');
  if (p === 'why-trust-us.html') return one('trust');
  if (p === 'privacy.html') return one('privacy');
  if (p === 'terms.html') return one('terms');
  if (p === 'contact.html') return one('contact');
  if (p === 'legal-radar.html') return one('radar');
  if (p === 'legal-forms.html') return one('forms');
  if (p.startsWith('blog/')) return one('blog');
  if (p.startsWith('pillars/')) return one('pillars');
  if (p.startsWith('legal-forms-docs/')) return one('forms');
  if (p.startsWith('radar-topics/')) return one('radar');
  return 'home';
}

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(full));
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function main() {
  const files = walk(PUBLIC).filter((f) => !/googlec03a96f2162c19b9\.html$/i.test(f));
  let injected = 0;
  let replaced = 0;
  let cssAdded = 0;
  let cleaned = 0;
  let untouched = 0;
  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(PUBLIC, file);
    const active = activeFor(rel);
    const markup = headerMarkup(active);
    let changed = false;

    if (UH_HEADER_FULL_RE.test(html)) {
      html = html.replace(UH_HEADER_FULL_RE, markup);
      replaced++;
      changed = true;
    } else if (OLD_HEADER_RE.test(html)) {
      html = html.replace(OLD_HEADER_RE, markup);
      replaced++;
      changed = true;
    } else {
      const bodyMatch = html.match(/<body[^>]*>/);
      if (bodyMatch) {
        html = html.replace(bodyMatch[0], bodyMatch[0] + '\n' + markup + '\n');
        injected++;
        changed = true;
      }
    }

    // Clean any orphaned old header scripts
    html = html.replace(OLD_JS_RE, '');

    // Ensure CSS link is present with latest version
    if (!CSS_LINK_RE.test(html)) {
      html = html.replace(HEAD_RE, HEADER_CSS + '\n$1');
      cssAdded++;
      changed = true;
    }

    if (NAV_COMMENT_RE.test(html) || HEADER_MEDIA_RE.test(html) || /\.nav-|\.header-|\.logo-(?:icon|name|sub)/.test(html)) {
      html = html.replace(NAV_COMMENT_RE, '');
      html = html.replace(HEADER_MEDIA_RE, '');
      html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (m, body) => {
        const cleaned = cleanCssBlock(body);
        if (!/\{/.test(cleaned)) return '';
        return m.replace(body, cleaned);
      });
      cleaned++;
      changed = true;
    }

    if (changed) fs.writeFileSync(file, html, 'utf8');
    else untouched++;
  }
  console.log(`✓ headers injected: ${injected}`);
  console.log(`✓ old headers replaced: ${replaced}`);
  console.log(`✓ css links added: ${cssAdded}`);
  console.log(`✓ dead css cleaned: ${cleaned}`);
  console.log(`○ untouched: ${untouched}`);
}

main();
