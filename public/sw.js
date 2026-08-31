// 🔔 SERVICE WORKER SMK YPK SUPER APP (PWA & REALTIME PUSH NOTIFICATIONS)
// Mendukung Notifikasi Realtime di Google Chrome HP & Desktop (Mode PWA Terpasang & Mode Tab Web)
const CACHE_NAME = 'smk-ypk-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 📱 1. EVENT MESSAGE: TERIMA PERINTAH NOTIFIKASI DARI FRONTEND (REALTIME PWA & WEB LINK)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag, data } = event.data;
    self.registration.showNotification(title || 'SMK YPK MEDAN', {
      body: body || 'Pemberitahuan baru dari SMK YPK Super App',
      icon: icon || '/logo.png',
      badge: badge || '/logo.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: tag || `notif-${Date.now()}`,
      renotify: true,
      data: data || { url: '/' },
    });
  }
});

// 📩 2. EVENT PUSH: TERIMA WEB PUSH NOTIFIKASI
self.addEventListener('push', (event) => {
  let notifData = {
    title: 'SMK YPK SUPER APP',
    body: 'Pemberitahuan KBM & Presensi Realtime',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: '/' },
  };

  try {
    if (event.data) {
      notifData = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      notifData.body = event.data.text();
    }
  }

  const options = {
    body: notifData.body,
    icon: notifData.icon || '/logo.png',
    badge: notifData.badge || '/logo.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: notifData.tag || 'smk-ypk-push',
    renotify: true,
    data: notifData.data || { url: '/' },
  };

  event.waitUntil(
    self.registration.showNotification(notifData.title || 'SMK YPK SUPER APP', options)
  );
});

// 👆 3. EVENT NOTIFICATION CLICK: BUKA / FOKUS KE HALAMAN UTAMA APLIKASI
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 🌐 4. NETWORK FIRST DENGAN FALLBACK CACHE
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
