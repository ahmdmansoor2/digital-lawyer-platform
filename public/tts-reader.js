/**
 * tts-reader.js — قارئ صوتي للمقالات (SpeechSynthesis — مجاني بالكامل).
 * يظهر كشريط صغير أسفل منتصف الشاشة في صفحات /blog/ بعد تمرير 250px.
 * أصوات عربية تلقائياً عند توفرها · سرعات متعددة · تشغيل/إيقاف/إيقاف مؤقت.
 */
(function () {
  'use strict';
  if (!/^\/blog\/.+\.html$/.test(location.pathname)) return;
  if (!('speechSynthesis' in window)) return;

  var synth = window.speechSynthesis;
  var state = { playing: false, chunks: [], idx: 0, rate: 1 };

  function buildText() {
    var root = document.querySelector('main') || document.body;
    var clone = root.cloneNode(true);
    clone.querySelectorAll('script,style,nav,footer,aside,ins,.ad-slot,.uh-bar,[data-related],[data-tts-ui]').forEach(function (n) { n.remove(); });
    var t = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    return t;
  }
  function chunk(t) {
    var out = [], buf = '';
    t.split(/(?<=[.!؟؟…])\s+/).forEach(function (s) {
      if ((buf + ' ' + s).length > 220) { if (buf) out.push(buf.trim()); buf = s; }
      else buf += ' ' + s;
    });
    if (buf.trim()) out.push(buf.trim());
    return out.length ? out : [t.slice(0, 400)];
  }
  function pickVoice() {
    var vs = synth.getVoices() || [];
    return vs.find(function (v) { return /^ar/i.test(v.lang); }) || null;
  }
  function speakNext() {
    if (!state.playing || state.idx >= state.chunks.length) { stop(); return; }
    var u = new SpeechSynthesisUtterance(state.chunks[state.idx++]);
    u.lang = 'ar-EG';
    u.rate = state.rate;
    var v = pickVoice();
    if (v) u.voice = v;
    u.onend = function () { speakNext(); };
    u.onerror = function () { stop(); };
    synth.speak(u);
  }
  function start() {
    if (!state.chunks.length) {
      var txt = buildText();
      if (txt.length < 40) return;
      state.chunks = chunk(txt);
      state.idx = 0;
    }
    state.playing = true;
    synth.cancel();
    speakNext();
    updateUI();
  }
  function pauseResume() {
    if (synth.paused && state.playing) { synth.resume(); btn.textContent = '⏸'; }
    else if (state.playing) { synth.pause(); btn.textContent = '▶'; }
  }
  function stop() {
    state.playing = false; state.idx = 0; state.chunks = [];
    synth.cancel();
    if (bar) bar.style.display = 'none';
    scrolled = false;
  }

  // ── UI ──
  var bar, btn, sel;
  function buildUI() {
    bar = document.createElement('div');
    bar.setAttribute('data-tts-ui', '1');
    bar.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:9895;display:none;' +
      'align-items:center;gap:8px;padding:8px 12px;border-radius:999px;font-family:Cairo,sans-serif;' +
      'background:rgba(15,23,42,.94);border:1px solid rgba(99,102,241,.4);box-shadow:0 8px 26px rgba(0,0,0,.5);backdrop-filter:blur(10px)';
    bar.innerHTML =
      '<span style="font-size:12px;font-weight:900;color:#a5b4fc">🎧 استماع</span>' +
      '<button data-a="toggle" style="w-32px;width:34px;height:34px;border-radius:50%;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:13px;cursor:pointer">▶</button>' +
      '<button data-a="stop" title="إيقاف" style="width:30px;height:30px;border-radius:50%;border:1px solid rgba(148,163,184,.3);background:transparent;color:#94a3b8;font-size:11px;cursor:pointer">✕</button>' +
      '<select data-a="rate" style="background:#1e293b;color:#e2e8f0;border:1px solid rgba(148,163,184,.25);border-radius:8px;font-size:11px;padding:4px 6px;font-family:inherit">' +
      '<option value="0.9">٠٫٩×</option><option value="1" selected>١×</option><option value="1.2">١٫٢×</option><option value="1.5">١٫٥×</option></select>';
    document.body.appendChild(bar);
    btn = bar.querySelector('[data-a="toggle"]');
    sel = bar.querySelector('[data-a="rate"]');

    btn.addEventListener('click', function () {
      if (!state.playing) start();
      else pauseResume();
    });
    bar.querySelector('[data-a="stop"]').addEventListener('click', stop);
    sel.addEventListener('change', function () {
      state.rate = parseFloat(sel.value);
      if (state.playing) { synth.cancel(); speakNext(); }
    });
  }

  var scrolled = false;
  window.addEventListener('scroll', function () {
    if (scrolled) return;
    if (window.scrollY > 250) {
      scrolled = true;
      if (!bar) buildUI();
      bar.style.display = 'flex';
    }
  }, { passive: true });

  // تحميل الأصوات مبكراً
  synth.onvoiceschanged = function () {};
})();
