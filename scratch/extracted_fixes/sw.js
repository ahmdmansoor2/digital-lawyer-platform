/**
 * sw.js — Service Worker المحدث لمنصة المحامي الرقمية (الإصدار v12 المتوافق مع Googlebot).
 * إصلاح جذري لمشكلة "صفحة بديلة تتضمن علامة أساسية مناسبة" (Alternate page with proper canonical tag):
 *  - لا يعيد أبداً الصفحة الرئيسية ('/') كبديل لصفحات فرعية عند فشل الشبكة.
 *  - يتجاهل اعتراض طلبات البوتات والزواحف تماماً.
 */
'use strict';

const VERSION = 'mohami-v12-seo';
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';

const PRECACHE = [
  '/header.css',
  '/manifest.webmanifest',
  '/icon.svg'
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
    /\.(css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

async function networkFirstNoRootFallback(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && fresh.status === 200) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(RUNTIME_CACHE);
  const fresh = await fetch(request);
  if (fresh && fresh.ok && fresh.status === 200) {
    cache.put(request, fresh.clone());
  }
  return fresh;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const ua = (req.headers.get('user-agent') || '').toLowerCase();
  if (/googlebot|adsbot|mediapartners|bingbot|yandex|duckduckbot|baiduspider|applebot/.test(ua)) {
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(networkFirstNoRootFallback(req));
    return;
  }

  if (url.pathname === '/search-index.json') {
    e.respondWith(networkFirstNoRootFallback(req));
    return;
  }

  if (isStaticAsset(url)) {
    e.respondWith(cacheFirst(req).catch(() => fetch(req)));
  }
});
