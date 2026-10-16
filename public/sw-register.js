/**
 * sw-register.js — تسجيل Service Worker مع كسر الكاش التلقائي
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js?v=20261016v8', { scope: '/' }).then(function (reg) {
      if (reg) {
        reg.update();
        reg.addEventListener('updatefound', function () {
          var installing = reg.installing;
          if (installing) {
            installing.addEventListener('statechange', function () {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                if (window.caches) {
                  caches.keys().then(function (names) {
                    names.forEach(function (name) {
                      if (!name.includes('mohami-v8')) caches.delete(name);
                    });
                  });
                }
              }
            });
          }
        });
      }
    }).catch(function () {});
  });
})();
