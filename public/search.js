/*!
 * search.js — محرك بحث الموقع للصفحات الثابتة
 *
 * - يحمّل /search-index.json عند الطلب (Lazy)
 * - يعرض modal بحث بـ Ctrl+K أو من زر البحث
 * - بحث فوري + highlight + keyboard navigation
 *
 * يُستخدم في: blog/*, pillars/*, *.html, legal-library.html
 *
 * الاستخدام: <script src="/search.js" defer></script>
 */
(function () {
  'use strict';

  // === STATE ===
  let indexData = null;
  let indexLoaded = false;
  let indexLoading = null;
  let lastQuery = '';
  let activeIndex = 0;
  let currentResults = [];
  let modalEl = null;
  let inputEl = null;
  let resultsEl = null;
  let triggerEl = null;

  // === ARABIC NORMALIZATION ===
  function normalize(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      // إزالة التشكيل
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
      // تطبيع الألف
      .replace(/[إأآا]/g, 'ا')
      // تطبيع الياء
      .replace(/[ىي]/g, 'ي')
      // تطبيع التاء المربوطة
      .replace(/ة/g, 'ه')
      // إزالة علامات الترقيم
      .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // === SCORING ===
  function scoreItem(item, query) {
    const q = normalize(query);
    if (!q) return 0;
    const titleN = normalize(item.title);
    const descN = normalize(item.description || '');
    const catN = normalize(item.category || '');
    const kwN = normalize(item.keywords || '');
    const snipN = normalize(item.snippet || '');
    const tokens = q.split(/\s+/).filter(Boolean);
    if (!tokens.length) return 0;
    let score = 0;
    for (const t of tokens) {
      if (titleN.includes(t)) score += 20;
      if (descN.includes(t)) score += 8;
      if (catN.includes(t)) score += 5;
      if (kwN.includes(t)) score += 4;
      if (snipN.includes(t)) score += 2;
      // تطابق كامل في العنوان = boost
      if (titleN === q) score += 30;
      // كلمة كاملة في العنوان
      const re = new RegExp('\\b' + t + '\\b', 'i');
      if (re.test(titleN)) score += 5;
    }
    return score;
  }

  function search(query) {
    if (!indexData) return [];
    if (!query || !query.trim()) return [];
    const results = [];
    for (const item of indexData.items) {
      const s = scoreItem(item, query);
      if (s > 0) results.push({ item, score: s });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 12);
  }

  // === HIGHLIGHT ===
  function highlight(text, query) {
    if (!text) return '';
    const q = query.trim();
    if (!q) return escapeHtml(text);
    const tokens = q.split(/\s+/).filter(Boolean);
    let out = escapeHtml(text);
    for (const t of tokens) {
      if (t.length < 2) continue;
      const re = new RegExp('(' + escapeRegex(t) + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    }
    return out;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // === RENDER ===
  function renderResults(results, query) {
    if (!resultsEl) return;
    if (!query.trim()) {
      resultsEl.innerHTML =
        '<div class="ss-empty">' +
        '<div class="ss-empty-icon">🔍</div>' +
        '<div class="ss-empty-text">ابدأ الكتابة للبحث في ' + (indexData ? indexData.count : 0) + ' صفحة</div>' +
        '<div class="ss-empty-hint">مقالات • مراجع شاملة • المكتبة القانونية • صفحات الموقع</div>' +
        '</div>';
      return;
    }
    if (!results.length) {
      resultsEl.innerHTML =
        '<div class="ss-empty">' +
        '<div class="ss-empty-icon">🤷</div>' +
        '<div class="ss-empty-text">لا توجد نتائج لـ "<strong>' + escapeHtml(query) + '</strong>"</div>' +
        '<div class="ss-empty-hint">جرّب كلمات أخرى أو تحقق من الإملاء</div>' +
        '</div>';
      return;
    }
    const html = results
      .map((r, i) => {
        const item = r.item;
        const typeLabel = item.type === 'blog' ? 'مقال' : item.type === 'pillar' ? 'مرجع شامل' : 'صفحة';
        const typeClass = item.type;
        return (
          '<a href="' + escapeHtml(item.url) + '" class="ss-result' + (i === activeIndex ? ' ss-active' : '') + '" data-index="' + i + '">' +
          '<div class="ss-result-icon">' + (item.type === 'blog' ? '📰' : item.type === 'pillar' ? '📖' : '📄') + '</div>' +
          '<div class="ss-result-body">' +
          '<div class="ss-result-title">' + highlight(item.title, query) + '</div>' +
          '<div class="ss-result-snippet">' + highlight(item.description || item.snippet || '', query) + '</div>' +
          '<div class="ss-result-meta">' +
          '<span class="ss-badge ss-badge-' + typeClass + '">' + typeLabel + '</span>' +
          (item.category ? '<span class="ss-result-cat">' + escapeHtml(item.category) + '</span>' : '') +
          '<span class="ss-result-url">' + escapeHtml(item.url.replace('https://mohamidigital.online', '')) + '</span>' +
          '</div>' +
          '</div>' +
          '<div class="ss-result-arrow">←</div>' +
          '</a>'
        );
      })
      .join('');
    resultsEl.innerHTML = html;
  }

  // === INDEX LOADING ===
  function ensureIndex() {
    if (indexLoaded) return Promise.resolve(indexData);
    if (indexLoading) return indexLoading;
    indexLoading = fetch('/search-index.json', { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        indexData = data;
        indexLoaded = true;
        return data;
      })
      .catch(function (e) {
        console.error('[search] فشل تحميل الفهرس:', e);
        throw e;
      });
    return indexLoading;
  }

  // === MODAL ===
  function buildModal() {
    const wrap = document.createElement('div');
    wrap.className = 'ss-overlay';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'بحث في الموقع');
    wrap.style.display = 'none';
    wrap.innerHTML =
      '<div class="ss-modal">' +
      '<div class="ss-modal-bar">' +
      '<span class="ss-modal-icon">🔍</span>' +
      '<input type="text" class="ss-input" id="ss-input" placeholder="ابحث في الموقع (مقالات، قوانين، مراجع)…" autocomplete="off" spellcheck="false" />' +
      '<span class="ss-loading" id="ss-loading"></span>' +
      '<kbd class="ss-kbd">ESC</kbd>' +
      '</div>' +
      '<div class="ss-results" id="ss-results"></div>' +
      '<div class="ss-footer">' +
      '<span><kbd>↑</kbd> <kbd>↓</kbd> للتنقل</span>' +
      '<span><kbd>Enter</kbd> للفتح</span>' +
      '<span><kbd>ESC</kbd> للإغلاق</span>' +
      '<span class="ss-footer-count" id="ss-count"></span>' +
      '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    modalEl = wrap;
    inputEl = wrap.querySelector('#ss-input');
    resultsEl = wrap.querySelector('#ss-results');
    return wrap;
  }

  function openModal() {
    if (!modalEl) buildModal();
    modalEl.style.display = 'flex';
    document.body.classList.add('ss-open');
    inputEl.value = lastQuery;
    inputEl.focus();
    if (lastQuery) {
      runSearch(lastQuery);
    } else {
      renderResults([], '');
    }
    ensureIndex().then(function () {
      updateCount();
      if (lastQuery) runSearch(lastQuery);
    });
  }

  function closeModal() {
    if (modalEl) modalEl.style.display = 'none';
    document.body.classList.remove('ss-open');
    activeIndex = 0;
  }

  function updateCount() {
    const el = modalEl && modalEl.querySelector('#ss-count');
    if (el && indexData) {
      el.textContent = indexData.count + ' صفحة مفهرسة';
    }
  }

  let searchTimer = null;
  function runSearch(q) {
    lastQuery = q;
    if (!indexData) {
      // حمّل أولاً
      const loadingEl = modalEl && modalEl.querySelector('#ss-loading');
      if (loadingEl) loadingEl.textContent = '⏳';
      ensureIndex().then(function () {
        if (loadingEl) loadingEl.textContent = '';
        updateCount();
        const r = search(q);
        currentResults = r;
        activeIndex = 0;
        renderResults(r, q);
      });
      return;
    }
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      const r = search(q);
      currentResults = r;
      activeIndex = 0;
      renderResults(r, q);
    }, 120);
  }

  function setActive(i) {
    if (!currentResults.length) return;
    activeIndex = (i + currentResults.length) % currentResults.length;
    const items = resultsEl.querySelectorAll('.ss-result');
    items.forEach(function (el, idx) {
      el.classList.toggle('ss-active', idx === activeIndex);
      if (idx === activeIndex) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function activateCurrent() {
    if (!currentResults.length) return;
    const item = currentResults[activeIndex];
    if (item) window.location.href = item.item.url;
  }

  // === TRIGGER BUTTON ===
  function injectTrigger() {
    // إضافة زر في nav لو فيه nav-links
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && !document.querySelector('.ss-trigger')) {
      const btn = document.createElement('button');
      btn.className = 'ss-trigger';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'بحث في الموقع');
      btn.innerHTML = '<span class="ss-trigger-icon">🔍</span><span class="ss-trigger-text">بحث</span><kbd class="ss-trigger-kbd">Ctrl K</kbd>';
      btn.addEventListener('click', openModal);
      navLinks.parentNode.insertBefore(btn, navLinks.nextSibling);
      triggerEl = btn;
    }
  }

  // === INIT ===
  function init() {
    // preload الفهرس في الخلفية
    ensureIndex();
    // أضف الـ trigger بعد تحميل الـ DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        injectTrigger();
        bindEvents();
      });
    } else {
      injectTrigger();
      bindEvents();
    }
  }

  function bindEvents() {
    // اختصار Ctrl+K / Cmd+K
    document.addEventListener('keydown', function (e) {
      // Ctrl+Shift+K → site search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openModal();
        return;
      }
      // Ctrl+K → site search (default)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openModal();
        return;
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openModal();
        return;
      }
      // ESC + navigation لما الـ modal مفتوح
      if (modalEl && modalEl.style.display !== 'none') {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeModal();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive(activeIndex + 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive(activeIndex - 1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          activateCurrent();
        }
      }
    });
    // Event delegation للـ input عبر document (يشتغل حتى لو inputEl كان null وقت init)
    document.addEventListener('input', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('ss-input')) {
        runSearch(e.target.value);
      }
    });
    // Click outside للـ overlay (event delegation)
    document.addEventListener('click', function (e) {
      if (modalEl && modalEl.style.display !== 'none' && e.target === modalEl) {
        closeModal();
      }
    });
  }

  // تشغيل
  init();

  // Expose API للـ debugging
  window.__siteSearch = { open: openModal, close: closeModal, search: search, _index: function () { return indexData; } };
})();
