/**
 * header-unify.cjs — توحيد الشريط العلوي في كل صفحات الموقع الثابتة
 * روابط أساسية + قائمة «المزيد» المنسدلة تعكس المحتوى الفعلي للموقع.
 * يعيد كتابة:
 *   1) كتلة <nav class="header-nav">…</nav> داخل كل ملف HTML
 *   2) سكربت الـ header (scroll + هامبرغر + قائمة المزيد)
 * مع تحديد رابط `active` حسب مسار الملف.
 *
 * الاستخدام: node scripts/header-unify.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

/* ── روابط الشريط الأساسية ─────────────────────────── */
function primaryLinks(a) {
  return [
    `<a href="/" class="nav-item">🏠 الرئيسية</a>`,
    `<a href="/blog/" class="nav-item${a.blog || ''}">📰 المدونة القانونية</a>`,
    `<a href="/legal-library.html" class="nav-item${a.lib || ''}">📚 المكتبة القانونية</a>`,
    `<a href="/pillars/" class="nav-item${a.pillars || ''}">🏛️ المراجع القانونية الشاملة</a>`,
    `<a href="/legal-forms.html" class="nav-item${a.forms || ''}">📝 صيغ العقود والدعاوي</a>`,
    `<a href="/legal-radar.html" class="nav-item${a.radar || ''}">🔍 رصد المحامي</a>`,
  ];
}

/* ── روابط قائمة «المزيد» المنسدلة ─────────────────── */
function moreLinks(a) {
  return [
    `<a href="/about.html" class="nav-more-item${a.about || ''}">⚖️ عن المنصة</a>`,
    `<a href="/features.html" class="nav-more-item${a.features || ''}">⚡ المميزات الكاملة</a>`,
    `<a href="/pricing.html" class="nav-more-item${a.pricing || ''}">🎁 الأسعار — مجاني 100%</a>`,
    `<a href="/why-trust-us.html" class="nav-more-item${a.trust || ''}">🛡️ لماذا تثق بنا</a>`,
    `<a href="/privacy.html" class="nav-more-item${a.privacy || ''}">🔐 سياسة الخصوصية</a>`,
    `<a href="/terms.html" class="nav-more-item${a.terms || ''}">📜 الشروط والأحكام</a>`,
    `<a href="/contact.html" class="nav-more-item${a.contact || ''}">📬 تواصل معنا</a>`,
  ];
}

function buildNav(active) {
  return `<nav class="header-nav" id="headerNav" role="navigation" aria-label="القائمة الرئيسية">
${primaryLinks(active).map((l) => `        ${l}`).join('\n')}
        <div class="nav-more">
          <button class="nav-more-btn" type="button" aria-expanded="false" aria-haspopup="true">
            <span>المزيد</span><span class="nav-more-caret">▾</span>
          </button>
          <div class="nav-more-menu">
${moreLinks(active).map((l) => `            ${l}`).join('\n')}
          </div>
        </div>
      </nav>`;
}

const NEW_JS = `  <script>
    (function(){
      var hdr=document.getElementById('siteHeader');
      var nav=document.getElementById('headerNav');
      if(hdr)window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>20);},{passive:true});
      var toggle=document.querySelector('.header-mobile-toggle');
      var more=document.querySelector('.nav-more');
      var moreBtn=document.querySelector('.nav-more-btn');
      function closeMobile(){
        if(nav)nav.classList.remove('active');
        if(toggle){toggle.setAttribute('aria-expanded','false');toggle.innerHTML='☰';}
      }
      if(toggle){toggle.addEventListener('click',function(){
        var open=nav.classList.toggle('active');
        toggle.setAttribute('aria-expanded',open);
        toggle.innerHTML=open?'✕':'☰';
        if(!open&&more){more.classList.remove('open');}
      });}
      if(moreBtn&&more){
        moreBtn.addEventListener('click',function(e){
          e.stopPropagation();
          var open=more.classList.toggle('open');
          moreBtn.setAttribute('aria-expanded',open);
        });
      }
      document.addEventListener('click',function(e){
        if(more&&more.classList.contains('open')&&!more.contains(e.target)){
          more.classList.remove('open');
          if(moreBtn)moreBtn.setAttribute('aria-expanded','false');
        }
        if(nav&&nav.classList.contains('active')&&toggle&&!nav.contains(e.target)&&!toggle.contains(e.target)){
          closeMobile();
        }
      });
    })();
  </script>`;

const NAV_RE = /([ \t]*)<nav class="header-nav"[^>]*>[\s\S]*?<\/nav>/;
const JS_RE = /([ \t]*)<script>\s*\(function\(\)\{\s*var hdr=document\.getElementById\('siteHeader'\);[\s\S]*?<\/script>/;

function activeFor(rel) {
  const p = rel.replace(/\\/g, '/');
  const one = (key) => {
    const o = {};
    o[key] = ' active';
    return o;
  };
  if (p === 'about.html') return one('about');
  if (p === 'features.html') return one('features');
  if (p === 'pricing.html') return one('pricing');
  if (p === 'why-trust-us.html') return one('trust');
  if (p === 'privacy.html') return one('privacy');
  if (p === 'terms.html') return one('terms');
  if (p === 'contact.html') return one('contact');
  if (p === 'legal-library.html') return one('lib');
  if (p === 'legal-radar.html') return one('radar');
  if (p === 'legal-forms.html') return one('forms');
  if (p.startsWith('blog/')) return one('blog');
  if (p.startsWith('pillars/')) return one('pillars');
  if (p.startsWith('legal-forms-docs/')) return one('forms');
  if (p.startsWith('radar-topics/')) return one('radar');
  return {};
}

function indentBlock(lines, baseIndent) {
  return lines.map((l) => (l.trim() ? baseIndent + l : '')).join('\n');
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
  const files = walk(PUBLIC);
  let updated = 0;
  let skipped = 0;
  let jsUpdated = 0;
  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(PUBLIC, file);
    const active = activeFor(rel);

    const navMatch = html.match(NAV_RE);
    if (!navMatch) {
      skipped++;
      continue;
    }
    const navHtml = indentBlock(buildNav(active).split('\n'), navMatch[1]);
    html = html.replace(NAV_RE, navHtml);

    const jsMatch = html.match(JS_RE);
    if (jsMatch) {
      const jsHtml = indentBlock(NEW_JS.split('\n'), jsMatch[1]);
      html = html.replace(JS_RE, jsHtml);
      jsUpdated++;
    }
    fs.writeFileSync(file, html, 'utf8');
    updated++;
  }
  console.log(`✓ headers updated: ${updated}`);
  console.log(`✓ header JS updated: ${jsUpdated}`);
  console.log(`○ skipped (no header): ${skipped}`);
}

main();
