/**
 * sw.js — Service Worker لمنصة المحامي الرقمية (PWA).
 * سياسة متحفظة:
 *  - التنقلات (HTML): network-first مع سقوط للنسخة المخبأة ثم الصفحة الرئيسية.
 *  - أصول ثابتة (css/js/img/fonts/assets): cache-first.
 *  - search-index.json: network-first دائماً حتى لا يتقادم البحث.
 *  - لا تخزين لأي طلب غير GET أو خارج النطاق.
 */
'use strict';

const VERSION = 'mohami-v2';
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';

const PRECACHE = [
  '/',
  '/header.css',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pillars/',
  '/pillars/index.html',
  '/courts-directory.html',
  '/legal-calculators.html',
  '/court-precedents.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/blog/') === false && /\.(css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  ) || /\.(css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname);
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const shell = await caches.match(fallbackUrl);
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(RUNTIME_CACHE);
  const fresh = await fetch(request);
  if (fresh && fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

function isCodeData(url) {
  return url.pathname.startsWith('/data/codes/') || url.pathname.startsWith('/data/official-codes-pdf/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // صفحات التنقل
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(networkFirst(req, '/'));
    return;
  }

  // الأكواد التشريعية وكتب PDF الرسمية — حفظ دائم للعمل دون إنترنت في المحاكم
  if (isCodeData(url)) {
    e.respondWith(cacheFirst(req).catch(() => Response.error()));
    return;
  }

  // الفهرس يظل طازجاً
  if (url.pathname === '/search-index.json') {
    e.respondWith(networkFirst(req));
    return;
  }

  // الأصول الثابتة
  if (isStaticAsset(url)) {
    e.respondWith(cacheFirst(req).catch(() => Response.error()));
  }
});
