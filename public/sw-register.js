/**
 * sw-register.js — تسجيل Service Worker مع التفريغ التلقائي للكاش القديم (Cache-Busting)
 */
(function () {
  try {
    localStorage.removeItem('mohami_theme_mode');
    localStorage.removeItem('mohami_font_scale');
    document.documentElement.classList.remove('public-theme-light');
  } catch (e) {}

  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js?v=20261031v18', { scope: '/' }).then(function (reg) {
      if (reg) {
        reg.update();
        if (window.caches) {
          caches.keys().then(function (names) {
            names.forEach(function (name) {
              if (!name.includes('mohami-v18-cinematic-spotlight-20261031')) {
                caches.delete(name);
              }
            });
          });
        }
      }
    }).catch(function () {});
  });
})();
