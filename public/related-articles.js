/**
 * related-articles.js — بلوك «مقالات ذات صلة» لصفحات المدونة.
 * يعمل وقت التشغيل على فهرس الموقع الموحد (search-index.json):
 * لا يحتاج إعادة توليد المقالات، ويغطي القديم والجديد تلقائياً.
 * يُحقن قبل </body> فقط في صفحات /blog/.
 */
(function () {
  'use strict';
  if (!/^\/blog\/.+\.html$/.test(location.pathname)) return;

  var META_VER = '20260826';

  function norm(s) {
    return (s || '').toLowerCase()
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
      .replace(/[إأآٱا]/g, 'ا')
      .replace(/[ىي]/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function tokens(s) {
    return norm(s).split(' ').filter(function (t) { return t.length > 2; });
  }

  var metaKw = (document.querySelector('meta[name="keywords"]') || {}).content || '';
  var metaDesc = (document.querySelector('meta[name="description"]') || {}).content || '';
  var metaTitle = (document.querySelector('h1') || {}).textContent ||
                  (document.querySelector('title') || {}).textContent || '';
  var curUrl = location.origin + location.pathname;
  var curTokens = {};
  tokens(metaTitle + ' ' + metaKw + ' ' + metaDesc).forEach(function (t) { curTokens[t] = true; });
  var curCat = norm(metaKw.split('،')[0] || '');

  fetch('/search-index.json', { headers: { 'X-Mohami-Rel': META_VER } })
    .then(function (r) { return r.json(); })
    .then(function (idx) {
      // ترشيح IDF خفيف: تجاهل الكلمات الواردة في كلمات مفتاحية لأكثر من 20% من العناصر
      var df = {};
      idx.items.forEach(function (it) {
        var seen = {};
        tokens(it.keywords).forEach(function (t) { if (!seen[t]) { df[t] = (df[t] || 0) + 1; seen[t] = 1; } });
      });
      var threshold = Math.max(8, idx.items.length * 0.2);

      var scored = [];
      for (var i = 0; i < idx.items.length; i++) {
        var it = idx.items[i];
        if (it.url === curUrl) continue;
        if (!(it.type === 'blog' || it.type === 'pillar')) continue;
        var s = 0;
        tokens(it.keywords).forEach(function (t) {
          if (curTokens[t] && (df[t] || 0) <= threshold) s += 4;
        });
        tokens(it.title).forEach(function (t) {
          if (curTokens[t] && (df[t] || 0) <= threshold) s += 3;
        });
        if (curCat && norm(it.category) === curCat) s += 6;
        s += Math.min(1, (it.wordCount || 0) / 5000);
        if (s >= 6) scored.push({ it: it, s: s });
      }
      scored.sort(function (a, b) { return b.s - a.s; });

      // تعبئة احتياطية بأحدث المدونات إن لم تكفِ النتائج المطابقة
      if (scored.length < 4) {
        var seen = {}; scored.forEach(function (x) { seen[x.it.id] = 1; });
        for (var n = idx.items.length - 1; n >= 0 && scored.length < 4; n--) {
          var cand = idx.items[n];
          if (cand.type === 'blog' && cand.url !== curUrl && !seen[cand.id]) {
            scored.push({ it: cand, s: 0 }); seen[cand.id] = 1;
          }
        }
      }
      render(scored.slice(0, 4));
    })
    .catch(function () { /* صامت */ });

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render(items) {
    if (!items.length) return;
    var sec = document.createElement('section');
    sec.setAttribute('data-related', '1');
    sec.style.cssText = 'max-width:800px;margin:40px auto 8px;padding:0 20px;font-family:inherit;';
    var html =
      '<style>' +
      '.mrel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:14px}' +
      '.mrel-card{display:flex;flex-direction:column;gap:6px;padding:16px;border-radius:14px;text-decoration:none;' +
      'background:rgba(15,23,42,.72);border:1px solid rgba(99,102,241,.22);transition:.2s}' +
      '.mrel-card:hover{transform:translateY(-3px);border-color:rgba(99,102,241,.55)}' +
      '.mrel-chip{align-self:flex-start;font-size:10px;font-weight:800;padding:2px 9px;border-radius:999px;' +
      'background:rgba(99,102,241,.15);color:#a5b4fc}' +
      '.mrel-title{font-size:13.5px;font-weight:800;color:#f1f5f9;line-height:1.6}' +
      '.mrel-desc{font-size:11.5px;color:#94a3b8;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
      '</style>' +
      '<h2 style="font-size:18px;font-weight:900;color:#fff;margin:0">📚 مقالات ومصادر ذات صلة</h2><div class="mrel-grid">';
    items.forEach(function (x) {
      var label = x.it.type === 'pillar' ? 'مرجع شامل' : 'مقال';
      html +=
        '<a class="mrel-card" href="' + esc(x.it.url) + '" target="_blank" rel="noopener">' +
        '<span class="mrel-chip">' + esc(label) + '</span>' +
        '<span class="mrel-title">' + esc(x.it.title) + '</span>' +
        '<span class="mrel-desc">' + esc(x.it.description || x.it.snippet || '') + '</span>' +
        '</a>';
    });
    html += '</div>';

    sec.innerHTML = html;
    // الأفضلية: بعد نهاية محتوى المقال وقبل الإعلان السفلي، وإلا قبل الفوتر
    var anchor =
      document.querySelector('.ad-slot--bottom') ||
      document.querySelector('footer');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor);
    else document.body.appendChild(sec);
  }
})();
