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

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '2.0.54';

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

