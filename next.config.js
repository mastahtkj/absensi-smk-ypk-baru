/** @type {import('next').NextConfig} */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// =============================================================
// 🧱 BUILD ID DETERMINISTIK (CONTENT HASH) — FIX BUG RELOAD LOOP
// =============================================================
// MASALAH LAMA:
//   `Date.now().toString(36)` dihitung SETIAP KALI next.config.js
//   dievaluasi. Next.js 14 mengevaluasi next.config.js secara TERPISAH
//   pada proses worker build CLIENT dan worker build SERVER.
//   Akibatnya BUILD_ID yang di-inline ke bundle CLIENT berbeda dengan
//   BUILD_ID yang dipakai route /api/app-version (SERVER).
//   => data.buildId !== LOCAL_BUILD_ID SELALU -> dialog "Versi Baru
//      Tersedia!" muncul terus-menerus -> reload -> muncul lagi (LOOP).
//
// SOLUSI:
//   BUILD ID dihitung dari HASH ISI SOURCE CODE (content hash).
//   Nilai ini PASTI SAMA untuk semua worker build (client & server)
//   karena semuanya membaca file source yang sama.
//   - Tetap sama: bundle client & server selalu punya BUILD ID sama.
//   - Berubah: source code berubah -> hash berubah -> ID baru ->
//     perangkat otomatis terdeteksi ada versi baru.
//   - Tidak perlu uninstall APK, cukup "Muat Ulang".
// =============================================================
function collectSourceFiles(dir, acc = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return acc;
  }
  // Urutkan agar hash stabil (tidak bergantung urutan filesystem).
  entries.sort((a, b) => a.name.localeCompare(b.name));
  entries.forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) return;
      collectSourceFiles(full, acc);
    } else if (entry.isFile()) {
      acc.push(full);
    }
  });
  return acc;
}

function computeBuildId() {
  // 1. Jika di Vercel, pakai commit SHA yang PASTI SAMA di semua worker & build process
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return String(process.env.VERCEL_GIT_COMMIT_SHA).slice(0, 16);
  }
  if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return String(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA).slice(0, 16);
  }
  // 2. Override manual (opsional) untuk CI/CD.
  if (process.env.SMK_BUILD_ID) return String(process.env.SMK_BUILD_ID);

  const root = __dirname;
  const files = collectSourceFiles(path.join(root, 'app'));
  ['package.json', 'next.config.js', 'public/sw.js', 'public/manifest.json', 'public/apk/version.json']
    .forEach((rel) => {
      const full = path.join(root, rel);
      if (fs.existsSync(full)) files.push(full);
    });

  files.sort();
  const hash = crypto.createHash('sha256');
  files.forEach((file) => {
    hash.update(path.relative(root, file).split(path.sep).join('/'));
    try {
      hash.update(fs.readFileSync(file));
    } catch (e) {
      // Abaikan file yang tidak bisa dibaca (lock file sementara).
    }
  });
  return hash.digest('hex').slice(0, 16);
}

const BUILD_ID = computeBuildId();
const BUILD_TIME = new Date().toISOString();

// 🏷️ IDENTITAS APLIKASI (ditampilkan di dialog pembaruan APK & Desktop)
const APP_VERSION = '2.0.8';
const BUILD_SERVER = 'MASTAH TJKT';

const nextConfig = {
  generateBuildId: async () => BUILD_ID,
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
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_BUILD_SERVER: BUILD_SERVER,
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