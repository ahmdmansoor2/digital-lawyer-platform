/**
 * sw-register.js — تسجيل Service Worker بشكل آمن وصامت.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {
      /* التسجيل اختياري — تجاهل أي فشل */
    });
  });
})();
