/* firebase-messaging-sw.js — معالج إشعارات الخلفية (يُفعَّل فقط بعد إضافة VAPID من الكونسول) */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCYzLif-sT3dFqezeHJnRvK0o52ENBMzu4',
  authDomain: 'justice-91571.firebaseapp.com',
  projectId: 'justice-91571',
  storageBucket: 'justice-91571.firebasestorage.app',
  messagingSenderId: '540483767278',
  appId: '1:540483767278:web:c5fe425e086a3303761cff',
});

try {
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    self.registration.showNotification(n.title || 'منصة المحامي الرقمية', {
      body: n.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: (payload.data && payload.data.url) || '/' },
    });
  });
} catch (e) {
  /* الإشعارات غير مفعلة بعد */
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({ type: 'window' }).then((list) => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow(url);
  }));
});
