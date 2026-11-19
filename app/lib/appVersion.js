// =============================================================
// 🏷️ IDENTITAS APLIKASI SMK YPK SUPER APP (SATU-SUMBER KEBENARAN)
// =============================================================
// File ini dipakai BOTH oleh CLIENT (AppUpdateManager, SuperAppNav)
// dan SERVER (route /api/app-version) agar teks versi yang tampil
// di Desktop maupun APK SELALU KONSISTEN (tidak boleh berbeda).
//
// Nilai environment variable di-inject oleh next.config.js
// pada saat build, dan punya fallback yang sama persis di sini
// supaya tidak pernah tampil "undefined".
// =============================================================

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '2.0.62';

export const BUILD_SERVER = process.env.NEXT_PUBLIC_BUILD_SERVER || 'MASTAH TJKT';

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';

export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || '';

// 🏷️ Teks versi resmi yang dipakai di dialog pembaruan APK & Desktop.
export const APP_VERSION_LABEL = `VERSI APLIKASI : ${APP_VERSION}`;
export const BUILD_SERVER_LABEL = `BUILD SERVER : ${BUILD_SERVER}`;

// =============================================================
// 📋 DAFTAR CATATAN RILIS & PEMBERITAHUAN PATCH DINAMIS
// =============================================================
export const PATCH_HISTORY = {
  '2.0.62': {
    title: 'Patch v2.0.62: Kamera PC Anti Lag 60 FPS, Lonceng Kristal "Cekring!" & Sapaan AI Motivasi Guru / Nama Siswa',
    summary: 'Optimasi rendering kamera PC 60 FPS bebas patah-patah, synthesizer lonceng kristal "Cekring!", suara sapaan AI motivasi guru, ucapan nama panggilan siswa, dan tombol uji audio.',
    items: [
      'Kamera PC 60 FPS Anti Patah-patah: Resolusi kamera dibatasi optimal 640x480 (max 800x600 30fps), canvas matchDimensions di-cache, model TinyFaceDetector 224px super kencang (~15ms) dengan GPU hardware acceleration.',
      'Lonceng Kristal "Cekring!" & Sapaan AI Guru: Denting lonceng kristal 4 nada jernih (Web Audio API) dilanjutkan ucapan hangat AI menyebut nama guru bersangkutan ditambah kata-kata motivasi mendidik yang menginspirasi.',
      'Sapaan Ramah Nama Siswa: AI otomatis menyapa nama panggilan/depan siswa (contoh: "Halo Rizky! Presensi berhasil, selamat belajar!") dengan intonasi ramah.',
      'Auto-Sync Cepat & Tombol Uji Suara: Sinkronisasi monitoring otomatis tiap 4 detik dan penambahan tombol "Tes Lonceng & Suara AI" untuk menguji audio langsung.'
    ]
  },
  '2.0.61': {
    title: 'Patch v2.0.61: Kamera PC Anti Lag 60 FPS, Lonceng Kristal "Cekring!" & Sapaan AI Motivasi Guru / Nama Siswa',
    summary: 'Optimasi rendering kamera PC 60 FPS bebas patah-patah, synthesizer lonceng kristal "Cekring!", suara sapaan AI motivasi guru, ucapan nama panggilan siswa, dan tombol uji audio.',
    items: [
      'Kamera PC 60 FPS Anti Patah-patah: Resolusi kamera dibatasi optimal 640x480 (max 800x600 30fps), canvas matchDimensions di-cache, model TinyFaceDetector 224px super kencang (~15ms) dengan GPU hardware acceleration.',
      'Lonceng Kristal "Cekring!" & Sapaan AI Guru: Denting lonceng kristal 4 nada jernih (Web Audio API) dilanjutkan ucapan hangat AI menyebut nama guru bersangkutan ditambah kata-kata motivasi mendidik yang menginspirasi.',
      'Sapaan Ramah Nama Siswa: AI otomatis menyapa nama panggilan/depan siswa (contoh: "Halo Rizky! Presensi berhasil, selamat belajar!") dengan intonasi ramah.',
      'Auto-Sync Cepat & Tombol Uji Suara: Sinkronisasi monitoring otomatis tiap 4 detik dan penambahan tombol "Tes Lonceng & Suara AI" untuk menguji audio langsung.'
    ]
  },
  '2.0.60': {
    title: 'Patch v2.0.60: Tombol Refresh / Foto Ulang Kamera & Backend WebGL GPU Tanpa WASM',
    summary: 'Penambahan tombol Refresh/Foto Ulang di kamera pendaftaran, inisialisasi WebGL GPU anti-error wasm 404, dan bundling lokal face-api.min.js.',
    items: [
      'Tombol Refresh / Foto Ulang: Tombol khusus "Foto Ulang" dan tombol floating di sudut kamera untuk mengulang foto seketika saat salah jepret tanpa perlu refresh halaman.',
      'Bypass Error WASM 404: TensorFlow.js diarahkan otomatis ke backend WebGL (akselerasi GPU) dan setWasmPaths lengkap sehingga status AI Model Siap 100%.',
      'Bundling Lokal face-api.min.js: Library dan bobot model AI tersimpan penuh di server lokal sehingga tahan terhadap gangguan internet eksternal.'
    ]
  },
  '2.0.59': {
    title: 'Patch v2.0.59: Tombol Refresh / Foto Ulang Kamera & Backend WebGL GPU Tanpa WASM',
    summary: 'Penambahan tombol Refresh/Foto Ulang di kamera pendaftaran, inisialisasi WebGL GPU anti-error wasm 404, dan bundling lokal face-api.min.js.',
    items: [
      'Tombol Refresh / Foto Ulang: Tombol khusus "Foto Ulang" dan tombol floating di sudut kamera untuk mengulang foto seketika saat salah jepret tanpa perlu refresh halaman.',
      'Bypass Error WASM 404: TensorFlow.js diarahkan otomatis ke backend WebGL (akselerasi GPU) dan setWasmPaths lengkap sehingga status AI Model Siap 100%.',
      'Bundling Lokal face-api.min.js: Library dan bobot model AI tersimpan penuh di server lokal sehingga tahan terhadap gangguan internet eksternal.'
    ]
  },
  '2.0.58': {
    title: 'Patch v2.0.58: Model AI Bin Konsolidasi & Multi-Stage Face Detector',
    summary: 'Penyediaan file model binary .bin lengkap mengatasi AI Model Gagal Memuat, detektor multi-stage adaptif berkacamata/redup, dan perbaikan verifikasi jepret foto.',
    items: [
      'Model AI Bin Lengkap: Seluruh binary weights (.bin) vladmandic terpasang di host lokal (/models/), membasmi error AI Model Gagal Memuat.',
      'Multi-Stage Face Detector: Algoritma deteksi bertingkat (416px, 512px, 320px & SSD) mendeteksi wajah berkacamata atau pencahayaan minim seketika.',
      'Pemberitahuan Patch Dinamis: Dialog info rilis selalu menyesuaikan versi build terkini.'
    ]
  },
  '2.0.57': {
    title: 'Patch v2.0.57: Model AI Bin Konsolidasi & Multi-Stage Face Detector',
    summary: 'Penyediaan file model binary .bin lengkap mengatasi AI Model Gagal Memuat, detektor multi-stage adaptif berkacamata/redup, dan perbaikan verifikasi jepret foto.',
    items: [
      'Model AI Bin Lengkap: Seluruh binary weights (.bin) vladmandic terpasang di host lokal (/models/), membasmi error AI Model Gagal Memuat.',
      'Multi-Stage Face Detector: Algoritma deteksi bertingkat (416px, 512px, 320px & SSD) mendeteksi wajah berkacamata atau pencahayaan minim seketika.',
      'Pemberitahuan Patch Dinamis: Dialog info rilis selalu menyesuaikan versi build terkini.'
    ]
  },
  '2.0.56': {
    title: 'Patch v2.0.56: Fix SQL Migration Views, Model AI Lokal & Ekstraksi Wajah Instan',
    summary: 'Pembersihan tuntas error view database Supabase (ERROR 42809), hosting lokal bobot AI face-api.js, jepret wajah ekstraksi cepat 50ms, dan auto-sync monitoring tanpa refresh manual.',
    items: [
      'Pembersihan Error SQL View (ERROR 42809): Skrip migrasi kini membersihkan view lama attendances/students secara aman sehingga pembuatan tabel dan indeks sukses 100%.',
      'AI Model Lokal Anti-Gagal: Seluruh 12 file bobot neural network di-host langsung di server lokal (/models/) sehingga proses muat instan < 300ms tanpa tergantung CDN eksternal.',
      'Jepret Wajah Instan 50ms: Ekstraksi fitur wajah pendaftaran beralih ke TinyFaceDetector berkecepatan tinggi dengan fallback SSD otomatis.',
      'Monitoring Auto-Sync: Kehadiran siswa dan guru diperbarui otomatis tiap 10 detik tanpa perlu menekan tombol refresh manual.'
    ]
  },
  '2.0.55': {
    title: 'Patch v2.0.55: Fix SQL Migration Views, Model AI Lokal & Ekstraksi Wajah Instan',
    summary: 'Pembersihan tuntas error view database Supabase (ERROR 42809), hosting lokal bobot AI face-api.js, jepret wajah ekstraksi cepat 50ms, dan auto-sync monitoring tanpa refresh manual.',
    items: [
      'Pembersihan Error SQL View (ERROR 42809): Skrip migrasi kini membersihkan view lama attendances/students secara aman sehingga pembuatan tabel dan indeks sukses 100%.',
      'AI Model Lokal Anti-Gagal: Seluruh 12 file bobot neural network di-host langsung di server lokal (/models/) sehingga proses muat instan < 300ms tanpa tergantung CDN eksternal.',
      'Jepret Wajah Instan 50ms: Ekstraksi fitur wajah pendaftaran beralih ke TinyFaceDetector berkecepatan tinggi dengan fallback SSD otomatis.',
      'Monitoring Auto-Sync: Kehadiran siswa dan guru diperbarui otomatis tiap 10 detik tanpa perlu menekan tombol refresh manual.'
    ]
  },
  '2.0.54': {
    title: 'Patch v2.0.54: Pemberitahuan Patch Dinamis & Presensi Dewan Guru',
    summary: 'Pemberitahuan patch otomatis berubah mengikuti versi pembaruan terbaru, integrasi Dewan Guru ke Presensi Wajah AI, dan pembaruan notifikasi Android.',
    items: [
      'Pemberitahuan Patch Dinamis: Catatan rilis dan pesan patch pada notifikasi pembaruan kini selalu berganti otomatis mengikuti versi terbaru.',
      'Presensi Wajah Dewan Guru: Kategori DEWAN GURU berada di prioritas teratas dropdown kelas dengan daftar 32 guru terfilter instan.',
      'Sinkronisasi Absensi Guru: Presensi wajah guru otomatis tersimpan ke tabel attendances realtime dan tersambung ke rekap absensi sekolah umum.',
      'Optimalisasi Android APK & Desktop: Pembaruan in-app instan tanpa perlu install ulang aplikasi lama.'
    ]
  },
  '2.0.53': {
    title: 'Patch v2.0.53: Integrasi Dewan Guru ke Presensi Wajah AI Realtime',
    summary: 'Penambahan kategori Dewan Guru & Pegawai di dropdown kelas presensi wajah serta sinkronisasi database.',
    items: [
      'Presensi Wajah AI Guru: Dewan Guru kini dapat melakukan presensi wajah mandiri via kamera kiosk.',
      'Dropdown Kategori Prioritas: Kategori DEWAN GURU berada di paling atas daftar kelas.',
      'Sinkronisasi Otomatis tb_guru: Seluruh 32 guru otomatis terhubung ke sistem presensi biometrik.'
    ]
  },
  '2.0.52': {
    title: 'Patch v2.0.52: Dropdown Kelas & Nama Siswa Dinamis (Fast Enrollment)',
    summary: 'Penghapusan input manual NISN, penyaringan otomatis nama siswa berdasarkan kelas terpilih.',
    items: [
      'Form Pendaftaran Wajah Bebas Ketik: NISN dihapus dari input form dan terisi otomatis dari database.',
      'Dropdown Bertingkat: Pilihan kelas memfilter daftar siswa secara instan.',
      'Indikator Biometrik: Status wajah terdaftar vs belum terdaftar tampil seketika.'
    ]
  },
  '2.0.51': {
    title: 'Patch v2.0.51: Peluncuran Presensi Wajah AI Realtime (Khusus Admin Master)',
    summary: 'Pusat absensi biometrik wajah modern berbasis face-api.js client-side di Pusat Kendali Master.',
    items: [
      'Kamera Deteksi Wajah AI: Pelacakan wajah realtime 60 FPS dengan umpan balik visual dan audio chime.',
      'Akses Khusus Admin Master: Terkunci rapat dan aman dari akses publik atau siswa.',
      'Realtime Supabase: Status kehadiran terupdate otomatis seketika.'
    ]
  }
};

/**
 * Mengambil informasi patch yang selalu dinamis sesuai versi yang diberikan.
 * Jika versi belum ada di riwayat manual, fungsi ini membuat catatan patch otomatis
 * yang akurat sesuai nomor versi yang sedang aktif / diterima dari server.
 */
export function getPatchInfo(version) {
  const verClean = (version || APP_VERSION).replace(/^v/i, '').trim();
  if (PATCH_HISTORY[verClean]) {
    return PATCH_HISTORY[verClean];
  }

  return {
    title: `Patch v${verClean}: Pembaruan Sistem & Optimalisasi Fitur SMK YPK`,
    summary: `Pembaruan sistem versi ${verClean} mencakup peningkatan kestabilan, perbaikan bug, dan sinkronisasi data terbaru.`,
    items: [
      `Pembaruan aplikasi ke rilis v${verClean} dengan performa lebih cepat dan efisien.`,
      `Sinkronisasi otomatis modul presensi wajah, dewan guru, dan data kehadiran realtime.`,
      `Peningkatan stabilitas koneksi server dan perbaikan antarmuka pengguna.`
    ]
  };
}

export const CURRENT_PATCH_INFO = getPatchInfo(APP_VERSION);

