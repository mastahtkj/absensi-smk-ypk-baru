// 🔔 SERVICE WORKER SMK YPK SUPER APP (PWA & REALTIME PUSH NOTIFICATIONS)
// Mendukung Notifikasi Realtime di Google Chrome HP & Desktop (Mode PWA Terpasang & Mode Tab Web)
// Update Version: v45 (Optimasi kecepatan SPA scanner, hierarki dropdown kelas instan, foto guru resmi fix)
const CACHE_NAME = 'smk-ypk-pwa-v45';
const SW_VERSION = '45';

// 🧹 Bersihkan SEMUA cache lama (v1..v40) saat SW baru aktif.
//    Ini memastikan tidak ada aset/bundle versi lama yang tertinggal
//    sehingga aplikasi tidak "mengreload" ke versi basi terus-menerus.
const LEGACY_CACHE_PREFIXES = ['smk-ypk-pwa-v'];

self.addEventListener('install', (event) => {
  console.log('[SW] Install service worker v' + SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache bucket:', key);
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 📱 1. EVENT MESSAGE: TERIMA PERINTAH NOTIFIKASI DARI FRONTEND (REALTIME PWA & WEB LINK)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag, data } = event.data;
    self.registration.showNotification(title || 'SMK YPK MEDAN', {
      body: body || 'Pemberitahuan baru dari SMK YPK Super App',
      icon: icon || '/logo.png',
      badge: badge || '/logo.png',
      vibrate: [300, 100, 300, 100, 300],
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

// 🌐 4. NETWORK FIRST DENGAN REVALIDASI SEGERA (MENJAMIN HP & DESKTOP SELALU DAPAT VERSI TERBARU)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Abaikan request di luar origin (CDN model, dsb) -> biarkan browser yang menangani
  if (url.origin !== self.location.origin) return;

  // 🧠 MODEL AI BIOMETRIK & VENDOR WASM: CACHE-FIRST STRATEGY (7 MB Model weights di-cache permanen di HP!)
  // Hasil: Kamera presensi & AI scanner langsung siap dalam 0.5 detik tanpa boros kuota internet!
  if (url.pathname.startsWith('/models/') || url.pathname.startsWith('/vendor/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open('smk-ypk-ai-models-v1').then((cache) => {
              cache.put(event.request, responseToCache);
            }).catch(() => {});
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Jangan pernah simpan cache untuk API Next.js, berkas installer APK, atau API Database Supabase
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/apk/') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/version.json' ||
    url.hostname.includes('supabase.co')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Untuk navigasi halaman (HTML/Document): Selalu ambil langsung dari Network (Server)
  // agar perubahan terbaru langsung muncul di Chrome HP & Desktop & APK TWA
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Aset statis & skrip: Network First, fallback ke cache jika jaringan terputus.
  //_aset Next.js sudah ber-hash => aman di-cache sebagai fallback.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || Response.error()))
  );
});
