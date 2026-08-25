/**
 * gam.js — Google Ad Manager (GPT) محمّل كسول ومشروط:
 *  - لا يفعل شيئاً حتى يوضع networkCode في /gam-config.json
 *  - عند التفعيل: يحمّل gpt.js، ينشئ ثلاث حاويات تلقائياً داخل المقال
 *    (بعد سطر التاريخ/الكاتب — منتصف المقال — قبل الإعلان السفلي)
 *  - Lazy load + collapse empty + SafeFrame (إعدادات جوجل الموصى بها)
 */
(function () {
  'use strict';
  if (!/^\/blog\/.+\.html$/.test(location.pathname)) return;
  if (window.__mohamiGam) return;
  window.__mohamiGam = true;

  fetch('/gam-config.json', { headers: { 'X-Mohami-Gam': '1' } })
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (!cfg || !cfg.networkCode || String(cfg.networkCode).trim() === '') return;
      init(String(cfg.networkCode).trim(), cfg.adUnits || {});
    })
    .catch(function () {});

  function loadGpt(cb) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function makeSlotContainer(anchor, id) {
    var d = document.createElement('div');
    d.id = id;
    d.setAttribute('data-gam-slot', '1');
    d.style.cssText = 'margin:26px auto;text-align:center;max-width:100%;min-height:90px;';
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(d, anchor);
    else document.body.appendChild(d);
    return d;
  }

  function init(code, units) {
    loadGpt(function () {
      window.googletag = window.googletag || { cmd: [] };
      googletag.cmd.push(function () {
        var anchors = {
          top: document.querySelector('.article-meta') ||
               (document.querySelector('h1') && document.querySelector('h1').parentNode),
          inArticle: document.querySelector('[data-related]') ||
                     document.querySelector('.ad-slot--bottom'),
          bottom: document.querySelector('footer')
        };

        var mapping = googletag.sizeMapping()
          .addSize([1024, 0], [[970, 90], [728, 90], [468, 60]])
          .addSize([768, 0], [[728, 90], [468, 60]])
          .addSize([0, 0], [[320, 100], [320, 50]])
          .build();

        var defs = [];
        Object.keys(units).forEach(function (key) {
          if (!anchors[key]) return;
          var el = makeSlotContainer(anchors[key] === document.body ? null : anchors[key], 'div-gpt-mohami-' + key);
          var slot = googletag
            .defineSlot('/' + code + '/' + units[key], [[970, 90], [728, 90], [320, 100], [468, 60]], el.id)
            .defineSizeMapping(mapping)
            .setCollapseEmptyDiv(true, true)
            .addService(googletag.pubads());
          defs.push(slot);
        });

        if (!defs.length) return;

        googletag.pubads().enableSingleRequest();
        googletag.pubads().enableLazyLoad({ fetchMarginPercent: 200, renderMarginPercent: 120 });
        googletag.pubads().disableInitialLoad();
        googletag.enableServices();

        defs.forEach(function (slot) { googletag.display(slot.getSlotElementId()); });
        // جلب أول عرض بعد lazy-load setup
        googletag.pubads().refresh(defs);
      });
    });
  }
})();
