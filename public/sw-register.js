/**
 * sw-register.js — تسجيل Service Worker المستقر وتنظيف كاشات الثيم
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
    navigator.serviceWorker.register('/sw.js?v=20261016clean', { scope: '/' }).then(function (reg) {
      if (reg) {
        reg.update();
        if (window.caches) {
          caches.keys().then(function (names) {
            names.forEach(function (name) {
              if (name.includes('mohami-v8') || name.includes('mohami-v9')) caches.delete(name);
            });
          });
        }
      }
    }).catch(function () {});
  });
})();
