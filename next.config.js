/** @type {import('next').NextConfig} */

// 🧱 BUILD ID otomatis: setiap `next build` menghasilkan ID baru.
//    Aplikasi membandingkan BUILD ID di perangkat dengan BUILD ID server
//    untuk mendeteksi versi baru -> muat ulang otomatis TANPA uninstall APK.
const BUILD_ID = Date.now().toString(36);
const BUILD_TIME = new Date().toISOString();

const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
    NEXT_PUBLIC_APP_VERSION: '2.0.0',
  },
  images: {
    unoptimized: true,
  },
  // ⚡ PERFORMA: kompresi response lebih kecil -> unduhan lebih cepat di HP
  compress: true,
  // Cache aset statis & vendor (face-api.js, model .bin) jauh lebih lama
  // sehingga buka kedua kali langsung dari cache.
  async headers() {
    return [
      {
        source: '/vendor/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/models/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/apk/:path*',
        headers: [
          // APK harus SELALU terbaru saat diunduh ulang (tanpa uninstall).
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        // Manifest, service worker & info versi: jangan pernah disajikan basi
        source: '/:path(sw.js|manifest.json|version.json)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;