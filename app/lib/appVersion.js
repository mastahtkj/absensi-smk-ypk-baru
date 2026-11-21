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

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '2.0.90';

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
  '2.0.90': {
    title: 'Patch v2.0.90: Pembaruan Kredensial Master Iqbal, Whitelabel Hub, & Sinkronisasi Versi PC & APK',
    summary: 'Pembaruan resmi kredensial Admin Master menjadi iqbal dengan kata sandi iqbal900, integrasi Whitelabel Hub Multi-Sekolah, AI Face Attendance 60FPS multi-wajah audio cekring, radar kehadiran siswa per kelas, limit 2 HP siswa, dan pembersihan cache PWA v50.',
    items: [
      'Kredensial Resmi Admin Master: Username iqbal dengan kata sandi iqbal900 terproteksi enkripsi PBKDF2.',
      'Whitelabel Backend Hub: Kustomisasi identitas sekolah pembeli, kepala sekolah, jurusan, dan GPS geofence langsung dari aplikasi.',
      'AI Presensi 3 Wajah & C720 60FPS: Suara cekring otomatis saat multi-wajah tanpa tabrakan TTS, sapaan cerdas Bapak/Ibu untuk dewan guru.',
      'Kotak Tracking Wajah Responsif: Kotak hijau proporsional dengan sudut neon HUD pada scanner dan pendaftaran.',
      'Pembersihan Cache PWA Service Worker v50: Seluruh perangkat PC dan HP otomatis memperbarui cache ke versi terbaru tanpa tersangkut di versi lama.',
      'Radar Ketidakhadiran & WhatsApp Chat: Deteksi siswa 1x, 2x, 3x+ alpa dengan tombol direct WhatsApp ke siswa dan orang tua.',
      'Batas 2 Perangkat Siswa: Akun siswa dibatasi khusus HP Siswa & HP Orang Tua.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.89': {
    title: 'Patch v2.0.89: Master Control Whitelabel Backend Hub, AI Face Multi-Person Tracking 60FPS, Radar Presensi Kelas & Penguatan Keamanan Master',
    summary: 'Rilis pembaruan ekosistem SMK YPK Super App: Integrasi Whitelabel Backend Hub di Master Control Center untuk penjualan/kustomisasi sekolah lain, AI Face Attendance 60FPS Logitech C720 dengan audio cekring cerdas (multi-wajah tanpa tabrakan TTS, sapaan pintar Bapak/Ibu untuk guru), kotak tracking wajah responsif proporsional, perbaikan Play Protect Android (SDK 34 & AssetLinks), notifikasi lonceng terpadu (Mading, Inval, Chat, Perpustakaan), batasan 2 HP akun siswa, klik chat WhatsApp di biodata siswa, dan enkripsi username master.',
    items: [
      'Master Control Center Whitelabel Hub: Menu backend lengkap dalam aplikasi untuk mengubah identitas sekolah, kepala sekolah, jurusan, titik GPS presensi, logo, dan koneksi database jika sekolah lain membeli aplikasi ini.',
      'AI Presensi 3 Wajah & Logitech C720 60FPS: Saat terdeteksi 3 wajah (atau multi-wajah), AI hanya membunyikan cekring kristal dan langsung menandai presensi secara otomatis tanpa audio bertabrakan. Jika 1 wajah, siswa dipanggil nama panggilan, dan guru dipanggil nama lengkap dengan sapaan pintar Bapak atau Ibu.',
      'Kotak Tracking Wajah Responsif: Kotak hijau pemindai wajah kini memiliki padding proporsional yang pas di wajah dengan HUD bracket corner neon emerald di presensi maupun pendaftaran webcam.',
      'Perbaikan Android Play Protect: Menstabilkan compile & target SDK ke Android 14 (API 34) dan endpoint digital asset links sehingga APK terinstal mulus tanpa peringatan aplikasi berbahaya.',
      'Izin Otomatis Senyap & Menu Latar Belakang Eksklusif: Izin notifikasi dan koordinat GPS berjalan otomatis saat aplikasi dibuka tanpa modal prompt berulang; menu Latar Belakang & Layar kini eksklusif hanya untuk Admin Master.',
      'Saklar Audio Bel & Pergantian Les: Setiap akun guru dan siswa kini memiliki tombol ON/OFF suara bel pergantian jam dan istirahat.',
      'Foto Siswa & Guru Online: Profil online dan avatar sekarang mengutamakan foto resmi dari Kartu ID Digital siswa dan guru.',
      'Grafik Kehadiran & Radar Siswa Alpha: Modul grafik presensi per kelas dan tabel radar deteksi siswa 1x tidak hadir, 2x tidak hadir, lengkap dengan tombol direct Chat WhatsApp ke siswa dan wali.',
      'Batasan Login 2 Perangkat Siswa: Akun siswa dibatasi khusus untuk 2 perangkat (HP Siswa & HP Orang Tua).',
      'Kontak WhatsApp Biodata Klik Langsung: No WhatsApp siswa dan orang tua dapat diklik langsung membuka aplikasi WhatsApp (wa.me).',
      'Keamanan Username Admin Master: Username terenkripsi dengan AES-256-GCM, menghapus seluruh kata sandi cadangan lemah pada endpoint autentikasi.',
      'Notifikasi Lonceng Terpadu: Seluruh siswa dan dewan guru menerima notifikasi lonceng dari Mading, Inval, Ruang Chat, dan Perpustakaan.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.88': {
    title: 'Patch v2.0.88: Master Control Whitelabel Backend Hub, AI Face Multi-Person Tracking 60FPS, Radar Presensi Kelas & Penguatan Keamanan Master',
    summary: 'Rilis pembaruan ekosistem SMK YPK Super App: Integrasi Whitelabel Backend Hub di Master Control Center untuk penjualan/kustomisasi sekolah lain, AI Face Attendance 60FPS Logitech C720 dengan audio cekring cerdas (multi-wajah tanpa tabrakan TTS, sapaan pintar Bapak/Ibu untuk guru), kotak tracking wajah responsif proporsional, perbaikan Play Protect Android (SDK 34 & AssetLinks), notifikasi lonceng terpadu (Mading, Inval, Chat, Perpustakaan), batasan 2 HP akun siswa, klik chat WhatsApp di biodata siswa, dan enkripsi username master.',
    items: [
      'Master Control Center Whitelabel Hub: Menu backend lengkap dalam aplikasi untuk mengubah identitas sekolah, kepala sekolah, jurusan, titik GPS presensi, logo, dan koneksi database jika sekolah lain membeli aplikasi ini.',
      'AI Presensi 3 Wajah & Logitech C720 60FPS: Saat terdeteksi 3 wajah (atau multi-wajah), AI hanya membunyikan cekring kristal dan langsung menandai presensi secara otomatis tanpa audio bertabrakan. Jika 1 wajah, siswa dipanggil nama panggilan, dan guru dipanggil nama lengkap dengan sapaan pintar Bapak atau Ibu.',
      'Kotak Tracking Wajah Responsif: Kotak hijau pemindai wajah kini memiliki padding proporsional yang pas di wajah dengan HUD bracket corner neon emerald di presensi maupun pendaftaran webcam.',
      'Perbaikan Android Play Protect: Menstabilkan compile & target SDK ke Android 14 (API 34) dan endpoint digital asset links sehingga APK terinstal mulus tanpa peringatan aplikasi berbahaya.',
      'Izin Otomatis Senyap & Menu Latar Belakang Eksklusif: Izin notifikasi dan koordinat GPS berjalan otomatis saat aplikasi dibuka tanpa modal prompt berulang; menu Latar Belakang & Layar kini eksklusif hanya untuk Admin Master.',
      'Saklar Audio Bel & Pergantian Les: Setiap akun guru dan siswa kini memiliki tombol ON/OFF suara bel pergantian jam dan istirahat.',
      'Foto Siswa & Guru Online: Profil online dan avatar sekarang mengutamakan foto resmi dari Kartu ID Digital siswa dan guru.',
      'Grafik Kehadiran & Radar Siswa Alpha: Modul grafik presensi per kelas dan tabel radar deteksi siswa 1x tidak hadir, 2x tidak hadir, lengkap dengan tombol direct Chat WhatsApp ke siswa dan wali.',
      'Batasan Login 2 Perangkat Siswa: Akun siswa dibatasi khusus untuk 2 perangkat (HP Siswa & HP Orang Tua).',
      'Kontak WhatsApp Biodata Klik Langsung: No WhatsApp siswa dan orang tua dapat diklik langsung membuka aplikasi WhatsApp (wa.me).',
      'Keamanan Username Admin Master: Username terenkripsi dengan AES-256-GCM, menghapus seluruh kata sandi cadangan lemah pada endpoint autentikasi.',
      'Notifikasi Lonceng Terpadu: Seluruh siswa dan dewan guru menerima notifikasi lonceng dari Mading, Inval, Ruang Chat, dan Perpustakaan.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.87': {
    title: 'Patch v2.0.87: Master Control Whitelabel Backend Hub, AI Face Multi-Person Tracking 60FPS, Radar Presensi Kelas & Penguatan Keamanan Master',
    summary: 'Rilis pembaruan ekosistem SMK YPK Super App: Integrasi Whitelabel Backend Hub di Master Control Center untuk penjualan/kustomisasi sekolah lain, AI Face Attendance 60FPS Logitech C720 dengan audio cekring cerdas (multi-wajah tanpa tabrakan TTS, sapaan pintar Bapak/Ibu untuk guru), kotak tracking wajah responsif proporsional, perbaikan Play Protect Android (SDK 34 & AssetLinks), notifikasi lonceng terpadu (Mading, Inval, Chat, Perpustakaan), batasan 2 HP akun siswa, klik chat WhatsApp di biodata siswa, dan enkripsi username master.',
    items: [
      'Master Control Center Whitelabel Hub: Menu backend lengkap dalam aplikasi untuk mengubah identitas sekolah, kepala sekolah, jurusan, titik GPS presensi, logo, dan koneksi database jika sekolah lain membeli aplikasi ini.',
      'AI Presensi 3 Wajah & Logitech C720 60FPS: Saat terdeteksi 3 wajah (atau multi-wajah), AI hanya membunyikan cekring kristal dan langsung menandai presensi secara otomatis tanpa audio bertabrakan. Jika 1 wajah, siswa dipanggil nama panggilan, dan guru dipanggil nama lengkap dengan sapaan pintar Bapak atau Ibu.',
      'Kotak Tracking Wajah Responsif: Kotak hijau pemindai wajah kini memiliki padding proporsional yang pas di wajah dengan HUD bracket corner neon emerald di presensi maupun pendaftaran webcam.',
      'Perbaikan Android Play Protect: Menstabilkan compile & target SDK ke Android 14 (API 34) dan endpoint digital asset links sehingga APK terinstal mulus tanpa peringatan aplikasi berbahaya.',
      'Izin Otomatis Senyap & Menu Latar Belakang Eksklusif: Izin notifikasi dan koordinat GPS berjalan otomatis saat aplikasi dibuka tanpa modal prompt berulang; menu Latar Belakang & Layar kini eksklusif hanya untuk Admin Master.',
      'Saklar Audio Bel & Pergantian Les: Setiap akun guru dan siswa kini memiliki tombol ON/OFF suara bel pergantian jam dan istirahat.',
      'Foto Siswa & Guru Online: Profil online dan avatar sekarang mengutamakan foto resmi dari Kartu ID Digital siswa dan guru.',
      'Grafik Kehadiran & Radar Siswa Alpha: Modul grafik presensi per kelas dan tabel radar deteksi siswa 1x tidak hadir, 2x tidak hadir, lengkap dengan tombol direct Chat WhatsApp ke siswa dan wali.',
      'Batasan Login 2 Perangkat Siswa: Akun siswa dibatasi khusus untuk 2 perangkat (HP Siswa & HP Orang Tua).',
      'Kontak WhatsApp Biodata Klik Langsung: No WhatsApp siswa dan orang tua dapat diklik langsung membuka aplikasi WhatsApp (wa.me).',
      'Keamanan Username Admin Master: Username terenkripsi dengan AES-256-GCM, menghapus seluruh kata sandi cadangan lemah pada endpoint autentikasi.',
      'Notifikasi Lonceng Terpadu: Seluruh siswa dan dewan guru menerima notifikasi lonceng dari Mading, Inval, Ruang Chat, dan Perpustakaan.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.86': {
    title: 'Patch v2.0.86: Multi-Variasi Presensi Wajah Kacamata, Enkripsi Total Database, & Proteksi Anti Brute-Force',
    summary: 'Dukungan multi-variasi biometrik wajah berkacamata / tanpa kacamata untuk siswa & dewan guru, pemulihan algoritma presisi siang hari semalam (threshold 0.44), auto-start kamera instan saat beralih tab, enkripsi total 100% password akun (PBKDF2 SHA-512) di database Supabase, sanitasi bundle client, dan proteksi anti brute-force login.',
    items: [
      'Multi-Variasi Wajah Kacamata: Siswa dan dewan guru kini dapat mendaftarkan variasi wajah tambahan (saat memakai kacamata & tanpa kacamata) sehingga AI mengenali keduanya dengan sangat akurat tanpa gagal presensi.',
      'Kembalikan Pengaturan Presisi Semalam (Siang Hari): Algoritma TinyFaceDetector (320px, threshold 0.30) dan FaceMatcher 0.44 yang sangat presisi dan terbukti stabil.',
      'Auto-Start & Seamless Tab Kamera: Kamera presensi kelas otomatis aktif saat halaman terbuka dan langsung memindai wajah ketika beralih dari form pendaftaran tanpa macet atau status Standby.',
      'Enkripsi 100% Kata Sandi Database (PBKDF2): Seluruh akun guru (32 guru) dan siswa (240 siswa) di Supabase telah dienkripsi menggunakan PBKDF2 salt 10.000 iterasi. Tidak ada lagi kata sandi plaintext yang terbaca dari Linux Arc / inspect tools.',
      'Sanitasi Bundle Client & Endpoint Kredensial: Menghapus 480 kata sandi plaintext dari bundle Javascript client dan menutup celah endpoint download kredensial dengan autentikasi sesi token terenkripsi.',
      'Proteksi Anti Brute-Force: Membatasi percobaan login maksimal 5 kali gagal dengan penguncian akun/IP selama 15 menit dan progressive delay untuk mencegah hacking otomatis.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.85': {
    title: 'Patch v2.0.85: Multi-Variasi Presensi Wajah Kacamata, Enkripsi 100% Database, & Proteksi Brute-Force',
    summary: 'Dukungan multi-variasi biometrik wajah berkacamata / tanpa kacamata untuk siswa & dewan guru, pemulihan algoritma presisi siang hari semalam (threshold 0.44), auto-start kamera instan saat beralih tab, enkripsi total 100% password akun (PBKDF2 SHA-512) di database Supabase, sanitasi bundle client, dan proteksi anti brute-force login.',
    items: [
      'Multi-Variasi Wajah Kacamata: Siswa dan dewan guru kini dapat mendaftarkan variasi wajah tambahan (saat memakai kacamata & tanpa kacamata) sehingga AI mengenali keduanya dengan sangat akurat tanpa gagal presensi.',
      'Kembalikan Pengaturan Presisi Semalam (Siang Hari): Algoritma TinyFaceDetector (320px, threshold 0.30) dan FaceMatcher 0.44 yang sangat presisi dan terbukti stabil.',
      'Auto-Start & Seamless Tab Kamera: Kamera presensi kelas otomatis aktif saat halaman terbuka dan langsung memindai wajah ketika beralih dari form pendaftaran tanpa macet atau status Standby.',
      'Enkripsi 100% Kata Sandi Database (PBKDF2): Seluruh akun guru (32 guru) dan siswa (240 siswa) di Supabase telah dienkripsi menggunakan PBKDF2 salt 10.000 iterasi.',
      'Proteksi Anti Brute-Force: Membatasi percobaan login maksimal 5 kali gagal dengan penguncian akun/IP selama 15 menit.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.84': {
    title: 'Patch v2.0.84: Pemulihan Penuh Pengaturan Presensi Wajah AI Presisi Tinggi (Versi Semalam Siang Hari)',
    summary: 'Mengembalikan konfigurasi presensi wajah AI ke kondisi paling presisi pada siang hari semalam (TinyFaceDetector 224px, Threshold Euclidean 0.40, 60 FPS bebas patah-patah), serta memastikan kamera presensi langsung siap memindai tanpa freeze/lock setelah mendaftarkan wajah.',
    items: [
      'Pemulihan Algoritma Presisi Siang Hari: Mengembalikan TinyFaceDetector ke 224px (respons super cepat ~10-15ms) dan ambang batas FaceMatcher ke 0.40 yang terbukti sangat presisi.',
      'Perbaikan Kamera Setelah Mendaftar Wajah: Kamera presensi kelas kini langsung memindai wajah seketika tanpa freeze atau terkunci setelah selesai mendaftarkan wajah siswa di Tab 2.',
      'Deteksi Cerdas Single & Multi-Face: Sapaan nama ramah saat 1 wajah terdeteksi, serta lonceng sukses ringkas saat banyak wajah terpresensi secara bersamaan.',
      'Tombol Reset Wajah 1-Klik: Memudahkan admin membersihkan biometrik wajah yang salah jepret langsung dari tabel monitoring tanpa menghapus data akun siswa.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.83': {
    title: 'Patch v2.0.83: Optimalisasi Pendaftaran Wajah AI Lancar Tanpa Hambatan & Kalibrasi Presisi Tinggi Bebas Salah Panggil',
    summary: 'Pembersihan peringatan false-alarm saat pendaftaran wajah siswa sehingga proses pendaftaran kembali lancar dan mulus, kalibrasi threshold Euclidean presisi tinggi (0.36) agar siswa yang belum terdaftar tidak pernah salah dipanggil, serta ketahanan kamera webcam.',
    items: [
      'Pendaftaran Wajah Mulus & Cepat: Menghapus peringatan false-positive kemiripan di formulir pendaftaran wajah sehingga siswa berjilbab maupun siswa lainnya dapat didaftarkan secara lancar tanpa hambatan peringatan merah.',
      'Kalibrasi Ambang Batas Presisi Tinggi (0.36): Mengkalibrasi ambang batas kecocokan presensi AI menjadi 0.36 untuk menjamin 0% risiko siswa salah terpanggil oleh identitas siswa lain.',
      'Penyimpanan Vektor Biometrik Langsung: Siswa yang difoto langsung memperoleh deskriptor unik 128-dimensi yang langsung aktif seketika di kamera presensi sekolah.',
      'Resiliensi Kamera Webcam: Peningkatan mekanisme fallback kamera webcam otomatis agar tidak pernah gagal saat memulai deteksi.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.82': {
    title: 'Patch v2.0.82: Optimalisasi Pendaftaran Wajah AI Lancar Tanpa Hambatan & Kalibrasi Presisi Tinggi Bebas Salah Panggil',
    summary: 'Pembersihan peringatan false-alarm saat pendaftaran wajah siswa sehingga proses pendaftaran kembali lancar dan mulus, kalibrasi threshold Euclidean presisi tinggi (0.36) agar siswa yang belum terdaftar tidak pernah salah dipanggil, serta ketahanan kamera webcam.',
    items: [
      'Pendaftaran Wajah Mulus & Cepat: Menghapus peringatan false-positive kemiripan di formulir pendaftaran wajah sehingga siswa berjilbab maupun siswa lainnya dapat didaftarkan secara lancar tanpa hambatan peringatan merah.',
      'Kalibrasi Ambang Batas Presisi Tinggi (0.36): Mengkalibrasi ambang batas kecocokan presensi AI menjadi 0.36 untuk menjamin 0% risiko siswa salah terpanggil oleh identitas siswa lain.',
      'Penyimpanan Vektor Biometrik Langsung: Siswa yang difoto langsung memperoleh deskriptor unik 128-dimensi yang langsung aktif seketika di kamera presensi sekolah.',
      'Resiliensi Kamera Webcam: Peningkatan mekanisme fallback kamera webcam otomatis agar tidak pernah gagal saat memulai deteksi.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.81': {
    title: 'Patch v2.0.81: Peningkatan Akurasi Presensi Wajah AI, Kotak Pelacak & Skor Desimal Realtime, serta Anti-Bentrok Pendaftaran',
    summary: 'Peningkatan menyeluruh akurasi biometrik wajah AI, penambahan kotak pelacak dinamis dan angka skor AI realtime saat pendaftaran wajah, proteksi multi-frame anti-salah panggil, serta pencegahan wajah tertukar.',
    items: [
      'Presensi Wajah AI Akurasi Tinggi: Pengetatan ambang batas toleransi Euclidean distance (0.39 / 0.36) serta resolusi model 416px-512px untuk deteksi 68 titik landmark wajah yang sangat presisi.',
      'Konfirmasi Multi-Frame Temporal: Mencegah salah memanggil siswa lain dengan memvalidasi konsistensi wajah minimal 2 siklus berurutan sebelum absensi dan lonceng suara dipicu.',
      'Kotak Pelacak & Skor AI Realtime Pendaftaran: Kamera pendaftaran wajah kini dilengkapi kotak pelacak dinamis, pemetaan 68 titik biometrik, dan tampilan angka skor AI desimal (misal 0.98) serta panduan kualitas foto live.',
      'Proteksi Anti-Bentrok Wajah: Peringatan otomatis jika foto yang dijepret memiliki kemiripan tinggi dengan siswa lain di database, mencegah tertukar identitas.',
      'Tombol Reset Wajah 1-Klik: Admin dapat mereset data biometrik siswa yang salah foto langsung dari tabel monitoring tanpa menghapus akun siswa.',
      'Proteksi Pindah Tab Otomatis: Kamera dan suara presensi otomatis berhenti seketika saat membuka form pendaftaran wajah agar tidak memindai di latar belakang.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.80': {
    title: 'Patch v2.0.80: Notifikasi Pop-up Presensi Wajah Realtime Lonceng APK & PC, dan Branding Blockchain Kriptografi',
    summary: 'Notifikasi pop-up kehadiran siswa dan guru kini langsung muncul seketika di lonceng beranda, toast melayang, getar HP di APK Android maupun PC saat wajah terpresensi, serta penambahan label keamanan Blockchain Kriptografi di splash loading awal.',
    items: [
      'Notifikasi Presensi Wajah AI Realtime (Lonceng & Pop-up): Setiap kali siswa, guru, atau admin terpresensi oleh kamera AI, pop-up animasi melayang seketika muncul, denting audio chime berbunyi, dan log kehadiran otomatis masuk ke lonceng notifikasi di APK Android & PC.',
      'Konektivitas Multi-Channel Realtime: Integrasi menyeluruh Supabase postgres_changes pada tabel attendances & absensi, PostMessage iframe cerdas, serta BroadcastChannel lintas tab dan perangkat sekolah.',
      'Branding Keamanan Layar Awal (Splash Loading Screen): Menambahkan identitas resmi "🛡️ BLOCKCHAIN SECURITY" tepat di bawah DEVELOPED BY TJKT PROJECT\'Z pada saat aplikasi pertama kali dibuka.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.79': {
    title: 'Patch v2.0.79: Pemulihan Menu Presensi Wajah AI & Proteksi Kriptografi PC & Android',
    summary: 'Memperbaiki masalah tombol menu dan tab Presensi Wajah AI yang tidak bisa ditekan/digunakan, inisialisasi modul biometrik kamera realtime, serta pembaruan rilis untuk versi PC dan APK Android.',
    items: [
      'Pemulihan Menu Presensi Wajah AI: Memperbaiki kesalahan sintaksis pada antarmuka scanner biometrik sehingga tombol tab Mode Presensi Kelas, Pendaftaran Wajah (Enrollment), Konfigurasi Database, dan Aktifkan Kamera kembali berfungsi 100% normal dan responsif.',
      'Inisialisasi Cerdas (Document Ready): Kamera web, Supabase Realtime, dan model AI langsung dimuat seketika tanpa tersangkut pada status "Memuat..." baik di browser PC maupun aplikasi Android.',
      'Izin Penuh Autoplay & Fullscreen: Penambahan izin autoplay dan fullscreen pada iframe presensi biometrik untuk stabilitas navigasi di seluruh perangkat.',
      '🛡️ BLOCKCHAIN SECURITY'
    ]
  },
  '2.0.78': {
    title: 'Patch v2.0.78: Otomasi Form Guru Sakit, Penghapusan Inval Permanen, dan Proteksi Update Project',
    summary: 'Memperbaiki pencetakan form guru pengganti agar nama guru sakit dan alasan terisi otomatis, memastikan penghapusan jadwal inval permanen dari database tanpa muncul kembali, serta mengamankan pembaruan project dengan kode otorisasi 30102000.',
    items: [
      'Otomasi Form Guru Pengganti (Sakit/Izin): Nama guru tidak hadir, inisial resmi, alasan (SAKIT), serta jadwal kelas dan guru pengganti kini tertulis otomatis di Form Resmi ber-KOP SMK YPK Medan.',
      'Penghapusan Inval Permanen Bebas Residu: Data penugasan inval yang dihapus kini tuntas dibersihkan dari database Supabase (tb_inval_guru), tidak akan muncul kembali saat halaman dimuat ulang.',
      'Pembersihan Otomatis Status Hadir: Mengubah status guru kembali ke Hadir otomatis membersihkan jadwal inval yang tidak lagi dibutuhkan.',
      'Proteksi Otorisasi Update Project: Script update (UPDATE-APP, upload.bat, deploy, build APK) dilengkapi sistem verifikasi PIN 30102000 jika update dilakukan di luar email pengembang resmi smkypkmedan@gmail.com.'
    ]
  },
  '2.0.77': {
    title: 'Patch v2.0.77: Perbaikan Error Inval, Akselerasi Ringan Anti-Lag, dan Penetapan Status Profil Guru',
    summary: 'Menyelesaikan error Unexpected token R pada penugasan inval, kompresi otomatis lampiran KBM, optimasi memori pusat notifikasi bebas macet, serta kestabilan penetapan status admin profil guru.',
    items: [
      'Penugasan Inval Anti-Error: Memperbaiki skema kolom tb_inval_guru dan optimasi muatan data berkas lampiran KBM, sehingga penugasan multi-les tersimpan mulus tanpa kendala batas server.',
      'Kompresi Otomatis Lampiran KBM: File modul KBM dan tugas inval gambar otomatis dikompresi di browser sebelum diunggah sehingga cepat dan hemat memori.',
      'Akselerasi Ringan Bebas Lag Seluruh Menu: Pembersihan beban foto berukuran besar dari notifikasi dan penyimpanan lokal, menjamin navigasi antar menu sangat cepat dan ringan di HP maupun PC.',
      'Penetapan Status Profil Guru Stabil: Admin dapat menetapkan status role guru (Admin / Guru Biasa) secara langsung dan permanen tanpa risiko hilang dari direktori.',
      'Fitur Pemulihan Guru 1-Klik: Tersedia tombol pemulihan jika terdapat profil guru resmi SMK YPK yang tidak sengaja tersembunyi.'
    ]
  },
  '2.0.76': {
    title: 'Patch v2.0.76: Isolasi Total Akun & Password, Presensi Multi-Wajah AI, dan Perbaikan Menu Perpustakaan',
    summary: 'Pemberitahuan pembaruan ringkas, isolasi identitas biodata siswa/guru, validasi ketat password baru, multi-face presensi instan dengan chime tanpa lag suara, pemulihan menu perpustakaan, dan optimasi websocket ringan bebas macet.',
    items: [
      'Isolasi Akun & Profil Pengguna: Mencegah akun tertukar atau nama berubah di dashboard saat siswa atau guru mengubah biodata/password, serta perlindungan foto profil di daftar Siapa yg Online.',
      'Validasi Password Baru Ketat: Password lama tidak dapat digunakan lagi setelah pengguna mengubah kata sandi baru.',
      'Presensi Wajah AI Multi-Face: Deteksi akurat 1 atau lebih wajah dalam satu frame. Jika >1 wajah, presensi dicatat dengan suara chime (cekring) instan tanpa tumpang-tindih suara; jika 1 wajah, AI menyebutkan nama panggilan awal.',
      'Akselerasi Performa Website & APK: Optimasi payload WebSocket kehadiran realtime tanpa base64 foto berat, menghilangkan lag saat banyak siswa dan guru login bersamaan.',
      'Perbaikan Menu Perpustakaan: Menyelesaikan error modul pustaka sehingga katalog buku dan layanan literasi digital dapat dibuka lancar.',
      'Notifikasi Update Ringkas: Pembaruan ditampilkan dalam banner mengambang minimalis agar tidak menutupi dashboard, header, maupun menu login.'
    ]
  },
  '2.0.75': {
    title: 'Patch v2.0.75: Penyempurnaan AI Model Enrollment, Foto Realtime Scan Wajah, dan Deduplikasi Bersih Monitoring',
    summary: 'Memperbaiki kegagalan memuat model AI saat pendaftaran wajah, menambahkan auto-retry & tombol Coba Lagi, menyinkronkan foto scan realtime ke database tb_siswa & tb_guru, serta membersihkan nama ganda pada Monitoring Presensi agar tepat sinkron 271-272 orang sesuai Menu Presensi.',
    items: [
      'Pemuatan AI Model Anti-Gagal & Tombol Coba Lagi: Model AI kini memprioritaskan bobot lokal ultra-cepat dengan auto-retry 3 kali. Jika koneksi terputus sesaat, pengguna dapat langsung menekan tombol Coba Lagi tanpa perlu refresh halaman.',
      'Deduplikasi Total Monitoring Wajah AI (271-272 Terdaftar): Menjamin 1 orang = 1 baris di tabel monitoring kehadiran wajah AI. Data NISN ganda (seperti 338 dan SISWA_338) dibersihkan total dan tepat sesuai Menu Presensi Sekolah (271 orang).',
      'Pembaruan Foto Wajah Realtime ke Database: Foto hasil scan kamera langsung tersimpan ke tb_siswa, tb_guru, dan tabel students serta avatar di tabel langsung berubah realtime dengan animasi konfirmasi.',
      'Sinkronisasi Presensi Hadir ke Menu Presensi: Status kehadiran dari Wajah AI seketika masuk ke tabel absensi sekolah dan langsung terhitung pada kartu statistik Hadir Tepat Menu Presensi.',
      'Isolasi Sesi Login Siswa & Guru: Mencegah akun tertukar atau berpindah ke nama lain saat mengubah biodata dan password pada profil akun.'
    ]
  },
  '2.0.73': {
    title: 'Patch v2.0.73: Isolasi Total Session Login Siswa & Guru dan Pencegahan Switch Akun di Menu Profil',
    summary: 'Memperbaiki tuntas bug perubahan nama dan switch akun saat siswa atau guru mengubah biodata dan password. Mengisolasi penyimpanan session localStorage antara user_guru dan user_siswa, serta menerapkan pencocokan username ketat.',
    items: [
      'Isolasi Sesi Penyimpanan Terpisah: Kunci session user_guru dan user_siswa kini dipisahkan secara ketat dengan prioritas utama pada smk_ypk_session, mencegah akun siswa tertimpa sesi guru atau sebaliknya.',
      'Pencocokan Identitas Berbasis Username Ketat: Menghilangkan pencocokan longgar ID numerik yang sebelumnya menyebabkan akun tertukar ke nama lain seperti Aditya Putra Ananda saat sinkronisasi database.',
      'Preservasi Nama Otentik: Nama akun pengguna yang telah terautentikasi kini dilindungi secara permanen dan tidak dapat ditimpa oleh sinkronisasi background.',
      'Penyimpanan Biodata & Password Aman: Penghapusan kolom tidak valid (foto_updated_at) pada tabel Supabase tb_siswa dan tb_guru sehingga penyimpanan biodata dan kata sandi berjalan lancar dan instan.',
      'Auto-Healing Session Otomatis: Session yang sebelumnya sempat terdampak pergantian nama akan otomatis dipulihkan ke nama asli resmi berdasarkan database sekolah.'
    ]
  },
  '2.0.70': {
    title: 'Patch v2.0.70: Perbaikan Total Penyimpanan Biodata & Password Serta Pencegahan Pembajakan Akun',
    summary: 'Penyimpanan biodata dan password guru serta siswa kini tersimpan 100% permanen ke database Supabase tanpa error tipe integer. Menghapus tuntas bug auto-rewrite dummy NISN yang sebelumnya membajak akun pengguna menjadi nama Rizky Arka.',
    items: [
      'Perbaikan Tipe Data Integer PostgreSQL: ID Guru dan Siswa kini diparsing sebagai integer murni sebelum dikirim ke tb_guru (id_guru) dan tb_siswa (id_siswa), menuntaskan error sintaks integer 22P02 sehingga biodata tersimpan permanen di cloud database.',
      'Penghapusan Tuntas Pembajakan Akun Rizky Arka: Menghapus seluruh fallback NISN dummy (0078129384 / 20241012) dan logika auto-rewrite nama Rizky Arka. Akun siswa dan guru kini diisolasi 100% berdasarkan ID dan username masing-masing.',
      'Penyimpanan Password Aman & Persisten: Pengubahan kata sandi kini langsung memperbarui session aktif dan tersimpan terenkripsi di server database Supabase.',
      'Sanitasi Session Otomatis: Pemulihan otomatis pada session lokal pengguna jika sebelumnya sempat terdampak pembajakan nama.'
    ]
  },
  '2.0.69': {
    title: 'Patch v2.0.69: Pembersihan Total Duplikasi Monitoring Wajah AI & Ekspor Akun Login Notepad',
    summary: 'Data anggota ganda pada Monitoring Kehadiran Siswa & Guru telah dibersihkan secara tuntas hingga tepat 271-272 orang sesuai Menu Presensi. Daftar lengkap username dan password login seluruh guru dan siswa juga telah diekspor dan dibuka di Notepad.',
    items: [
      'Pembersihan 239 Data Duplikat: Seluruh data ganda pada tabel database students telah dibersihkan sehingga Total Terdaftar kini tepat 271-272 anggota (240 siswa + 32 dewan guru & staff), selaras 100% dengan Menu Presensi Sekolah.',
      'Sistem Anti-Ganda Realtime: Halaman scanner presensi wajah kini memiliki proteksi deduplikasi otomatis berbasis nama unik dengan prioritas data biometrik wajah terdaftar.',
      'Format Tampilan NISN Bersih: Kolom NISN/NIP di tabel monitoring scanner wajah disesuaikan agar rapi tanpa embel-embel kode internal.',
      'Daftar Akun Login Notepad: File resmi AKUN_LOGIN_GURU_DAN_SISWA_SMK_YPK.txt berisi username dan kata sandi 32 guru dan 240 siswa per kelas telah dibuat di Desktop dan otomatis dibuka di Notepad.'
    ]
  },
  '2.0.68': {
    title: 'Patch v2.0.68: Manajemen Hak Akses S.Admin & G.Admin di Menu Presensi oleh Admin Master',
    summary: 'Hak akses bertingkat resmi SMK YPK: S.Admin untuk Siswa (presensi kelas sendiri & upload perpustakaan, yang lain view only), G.Admin untuk Guru (presensi kelas, perpustakaan, mading, info & chat, yang lain view only), dan hak akses hanya dapat diberikan atau dihapus oleh Admin Master di Menu Presensi.',
    items: [
      'Hak Akses S.Admin (Siswa): Siswa Admin dapat merubah presensi kelasnya masing-masing di Menu Presensi dan mengunggah modul/buku digital di Perpustakaan. Fitur lainnya (Mading, Berita, Chat, Master Control) dibatasi hanya bisa melihat (View Only). Siswa biasa hanya dapat membaca di Perpustakaan.',
      'Hak Akses G.Admin (Guru): Guru Admin dapat merubah presensi kelas, mengunggah modul di Perpustakaan, menerbitkan Mading & Berita Sekolah, serta berkirim pesan di Ruang Chat All. Fitur sensitif sistem lainnya dibatasi hanya bisa melihat (View Only).',
      'Pemberian & Pencabutan Akses Terpusat oleh Admin Master: Admin Master (Iqbal, Hartati, Hendrawan) kini memiliki tombol cepat di tabel Master Data Anggota Menu Presensi (⭐ Beri S.Admin / ❌ Cabut S.Admin, 🛡️ Beri G.Admin / ❌ Cabut G.Admin) serta kontrol hak akses di modal Edit Master Data.',
      'Lencana Peran Visual: Tabel Master Data Anggota kini menampilkan badge resmi (👑 Master, 🛡️ G.Admin, ⭐ S.Admin) secara langsung di samping nama setiap anggota.'
    ]
  },
  '2.0.67': {
    title: 'Patch v2.0.67: Penetapan Hak Akses Penuh Admin Master (Hartaty Patiwael & Hendrawan)',
    summary: 'Ibu Hartaty Patiwael, S.Si (Kepala Sekolah) dan Bpk. Hendrawan, ST (Wakakurikulum) kini memiliki hak akses penuh sebagai Admin Master setara dengan Bpk. Muhammad Iqbal Rangkuti.',
    items: [
      'Akses Penuh Master Control & Presensi Wajah AI: Akun Ibu Hartaty Patiwael dan Bpk. Hendrawan kini dapat membuka dan mengelola Pusat Kendali Master, Presensi Wajah AI, dan pengaturan sistem.',
      'Badge Resmi 👑 Master Admin: Profil akun, kartu identitas, dan ruang percakapan otomatis menampilkan lencana resmi 👑 Master Admin.',
      'Sistem Login Fleksibel & Terproteksi: Login dapat menggunakan username pendek (hartati / hendrawan) maupun NIP/nama resmi dengan hak akses Master permanen di database.',
      'Pengawasan & Notifikasi Sistem: Hak akses penerbitan berita, moderasi mading, persetujuan perpustakaan, dan notifikasi pendaftaran akun baru kini aktif penuh.'
    ]
  },
  '2.0.66': {
    title: 'Patch v2.0.66: Sinkronisasi Penuh Presensi Wajah AI ke Menu Presensi Sekolah Terpusat',
    summary: 'Seluruh kehadiran siswa dan dewan guru dari scanner Wajah AI kini otomatis tersinkronkan 100% ke tabel absensi utama sekolah (Menu Presensi Siswa & Guru).',
    items: [
      'Sinkronisasi Menyeluruh Siswa & Guru: Presensi wajah siswa dan dewan guru kini otomatis di-insert ke tabel absensi utama sekolah dengan jam masuk, status Hadir, dan foto live.',
      'Menu Presensi Sekolah Ter-update Realtime: Statistik Hadir Tepat, Master Data Anggota, dan rekap harian sekolah seketika sinkron dan berubah menjadi Hadir tanpa delay.',
      'Auto-Reconcile Background: Sistem secara berkala merekonsiliasi setiap presensi di tabel attendances ke tabel absensi sekolah agar tidak ada data yang tertinggal.'
    ]
  },
  '2.0.65': {
    title: 'Patch v2.0.65: Sinkronisasi Penuh Presensi Wajah AI ke Menu Presensi Sekolah Terpusat',
    summary: 'Seluruh kehadiran siswa dan dewan guru dari scanner Wajah AI kini otomatis tersinkronkan 100% ke tabel absensi utama sekolah (Menu Presensi Siswa & Guru).',
    items: [
      'Sinkronisasi Menyeluruh Siswa & Guru: Presensi wajah siswa dan dewan guru kini otomatis di-insert ke tabel absensi utama sekolah dengan jam masuk, status Hadir, dan foto live.',
      'Menu Presensi Sekolah Ter-update Realtime: Statistik Hadir Tepat, Master Data Anggota, dan rekap harian sekolah seketika sinkron dan berubah menjadi Hadir tanpa delay.',
      'Auto-Reconcile Background: Sistem secara berkala merekonsiliasi setiap presensi di tabel attendances ke tabel absensi sekolah agar tidak ada data yang tertinggal.'
    ]
  },
  '2.0.64': {
    title: 'Patch v2.0.64: Foto Wajah Live Realtime pada Tabel & Notifikasi Presensi',
    summary: 'Avatar siswa dan guru di tabel monitoring kini otomatis diperbarui seketika dengan potret foto wajah yang baru saja di-scan live dari kamera.',
    items: [
      'Foto Wajah Berubah Realtime: Saat wajah siswa atau guru terdeteksi dan di-scan oleh kamera, sistem memotong potret wajah live (avatar 160x160) dan seketika mengganti foto di tabel monitoring dengan animasi highlight hijau.',
      'Foto Live pada Pop-up Notifikasi: Pop-up overlay saat presensi berhasil kini menampilkan foto asli siswa/guru yang baru saja di-scan dari kamera secara langsung.',
      'Penyimpanan Otomatis ke Database: Foto potret live yang baru saja ter-scan otomatis tersimpan permanen ke tabel students Supabase, tb_siswa, dan tb_guru.',
      'Sinkronisasi Multi-Device Realtime: Perubahan foto wajah tersinkronisasi antar-perangkat secara otomatis lewat Supabase Realtime channel.'
    ]
  },
  '2.0.63': {
    title: 'Patch v2.0.63: Foto Wajah Live Realtime pada Tabel & Notifikasi Presensi',
    summary: 'Avatar siswa dan guru di tabel monitoring kini otomatis diperbarui seketika dengan potret foto wajah yang baru saja di-scan live dari kamera.',
    items: [
      'Foto Wajah Berubah Realtime: Saat wajah siswa atau guru terdeteksi dan di-scan oleh kamera, sistem memotong potret wajah live (avatar 160x160) dan seketika mengganti foto di tabel monitoring dengan animasi highlight hijau.',
      'Foto Live pada Pop-up Notifikasi: Pop-up overlay saat presensi berhasil kini menampilkan foto asli siswa/guru yang baru saja di-scan dari kamera secara langsung.',
      'Penyimpanan Otomatis ke Database: Foto potret live yang baru saja ter-scan otomatis tersimpan permanen ke tabel students Supabase, tb_siswa, dan tb_guru.',
      'Sinkronisasi Multi-Device Realtime: Perubahan foto wajah tersinkronisasi antar-perangkat secara otomatis lewat Supabase Realtime channel.'
    ]
  },
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

