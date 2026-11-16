# 📱 SMK YPK SUPER APP — Panduan APK & Auto Update (Revisi 2.0)

## ✅ Status

| Komponen | Status |
|---|---|
| App web (Vercel) | ✅ Live — `https://absensi-smk-ypk-baru.vercel.app` |
| PWA (install via Chrome) | ✅ Aktif — manifest + service worker v41 |
| APK Android (TWA) | ✅ Otomatis update **tanpa uninstall** |
| Presensi | ✅ 100% Face Recognition AI (RFID & Kirimi dihapus) |
| Notifikasi | ✅ Realtime in-app (Supabase Realtime + Service Worker) |

## 📥 Download APK

**URL:** `https://absensi-smk-ypk-baru.vercel.app/apk/SMK_YPK_SUPER_APP.apk`

> Header `/apk/*` sekarang memakai `Cache-Control: no-store`, jadi **unduhan
> ulang SELALU menghasilkan APK terbaru** (dulu bisa jadi APK lama karena
> di-cache browser).

## 🔄 CARA UPDATE (TANPA UNINSTALL) — PERBAIKAN TERBARU

Dulu: "Perubahan tidak efek, harus uninstall APK lama."
Sekarang ada **3 lapis proteksi otomatis**:

1. **Service Worker v41** — network-first mutlak. Tidak ada lagi aset versi
   lama yang di-cache diam-diam. Semua cache lama (v1..v40) otomatis
   dihapus saat SW baru aktif.
2. **BUILD ID (content hash)** — `next.config.js` menghitung hash isi
   source code. Nilai ini **PASTI SAMA** antara build CLIENT & build SERVER
   (dulu `Date.now()` membuat keduanya berbeda → dialog "Muat Ulang"
   muncul terus-menerus). BUILD ID berubah hanya bila source berubah.
   Aplikasi membandingkan BUILD ID perangkat dengan BUILD ID server lewat
   `GET /api/app-version`.
   - Kalau berbeda → muncul notifikasi **"✨ Versi Baru Tersedia!"**
   - Tekan **"🚀 Muat Ulang Sekarang"** → aplikasi reload dalam 1 detik.
   - Tidak perlu uninstall APK, tidak perlu download ulang.
   - **Posisi menu tidak hilang** setelah reload (kembali ke menu yang
     sedang dibuka, bukan ke halaman utama).
3. **Tombol 🔄 (Cek Update)** — ada di header aplikasi (ikon kanan atas).
   Tekan untuk memaksa pemeriksaan versi.

Dialog pembaruan & menu ID Card menampilkan identitas aplikasi resmi:

```
VERSI APLIKASI : 2.0.0
BUILD SERVER : MASTAH TJKT
```

Pemeriksaan versi berjalan otomatis:
- 4 detik setelah aplikasi dibuka
- setiap 60 detik (selagi tab/app terlihat)
- setiap kali app kembali aktif / fokus

### ⚠️ Kalau masih terlihat versi lama

Tutup aplikasi sepenuhnya (swipe dari recent apps) lalu buka lagi.
Service worker baru butuh satu siklus restart untuk aktif sepenuhnya.

### 📦 Kalau ingin build APK baru (ganti ikon/nama/domain)

Jalankan `BUILD-APK.cmd` di root repo.

Script ini otomatis:
1. menaikkan `appVersionCode` (+1) di `twa-manifest.json`
2. build APK via Bubblewrap
3. menyalin ke `public/apk/SMK_YPK_SUPER_APP.apk`
4. menulis `public/apk/version.json` (dipakai API `/api/app-version`)

> **Kenapa nomor versi otomatis naik?**
> Android **menolak** memasang APK dengan `versionCode` yang sama atau lebih
> kecil dari versi yang sudah terpasang. Huruf ini dulu jadi alasan utama
> pengguna harus uninstall APK lama. Sekarang tidak lagi.

Toolchain ada di `%USERPROFILE%\.apk-toolchain` (JDK 17, Android SDK,
Node.js, Bubblewrap) — tidak perlu unduh lagi.

## 🎯 Mode Kiosk / Presensi Wajah

Setelah ter-install, buka link dengan parameter:

```
https://absensi-smk-ypk-baru.vercel.app?terminal=1
```

Parameter lain: `?scanner=1`, `?presensi=1`, `?view=scanner`, `?mode=terminal`

## 🗄️ WAJIB: Jalankan SQL Migrasi (sekali saja)

Buka **Supabase Dashboard → SQL Editor → New query → RUN**:

```
SQL_MIGRASI_FINAL_SMK_YPK.sql
```

Skrip ini memastikan:
- kolom biometrik wajah (`face_descriptor`) ada di `tb_siswa` & `tb_guru`
- kolom foto permanen (`foto_url`, `foto_updated_at`, `biodata`) ada
  → **ini yang membuat foto ID Card tidak hilang**
- kolom presensi (`tipe`, `metode`, `tanggal`, `jam_masuk`, `jam_pulang`) lengkap
- RLS longgar → HP bisa menyimpan foto & biometrik
- Realtime aktif → notifikasi presensi sampai instan ke semua HP
- kolom UID RFID dibersihkan (sistem RFID kartu sudah dihapus)

## 🛠️ Perbaikan yang sudah diterapkan (Revisi 2.0)

### 1. ⛔ "GAGAL MENYIMPAN PRESENSI: invalid input syntax for type time"

**Penyebab:** kolom `jam_masuk` / `jam_pulang` bertipe `TIME` di PostgreSQL,
tapi aplikasi mengirim format `id-ID` yang memakai **TITIK**:
`"23.48.34"`. PostgreSQL hanya menerima **KOLON**: `"23:48:34"`.
Akibatnya **setiap** rekaman presensi wajah gagal disimpan (dan karena itu
notifikasi realtime juga tidak pernah muncul).

**Perbaikan:**
- file baru `app/utils/waktu.js` (sumber tunggal semua format waktu WIB)
  - `formatWibTime()` → `"23:48:34"`
  - `formatWibDate()` → `"2026-11-15"`
  - `normalizeTimeForDb()` → menormalkan `"23.48.34"` → `"23:48:34"`
- dipakai di `app/api/face-attendance`, `app/api/manual-update`,
  `app/components/FaceRecognitionScanner`
- insert sudah "self-healing": kalau database tetap menolak, aplikasi
  otomatis menormalkan format dan mencoba lagi
- uji otomatis: `scripts/test-waktu.mjs`

### 2. 📷 Kamera tidak bisa dibuka dari Desktop

**Penyebab:** kamera hanya diaktifkan kalau `video.play()` benar-benar
resolve. Di Chrome PC, `play()` sering di-reject (autoplay policy) sehingga
`cameraActive` tetap `false` → tampilan "Kamera Belum Aktif".

**Perbaikan (FaceRecognitionScanner + FaceRegisterManagerModal):**
- `video.muted = true` dipaksa set (autoplay policy browser)
- event `onloadedmetadata / onloadeddata / oncanplay / onplaying` semuanya
  memicu aktivasi
- **jaring pengaman 1,2 detik**: stream sudah menempel → kamera tetap
  dianggap aktif walau browser menahan playback
- **auto-retry 3,5 detik** saat modal dibuka
- pesan error jauh lebih informatif (izin ditolak / kamera tidak ada /
  kamera dipakai aplikasi lain / resolusi tidak didukung) + tombol
  **"Coba Lagi"**
- tombol **Ganti Kamera Belakang** sekarang benar-benar membuat ulang stream

### 3. 🧑‍🎓 Pendaftaran wajah siswa gagal tersimpan

**Penyebab:** satu statement `UPDATE` berisi `face_descriptor` + `biodata`.
Kalau salah satu kolom belum ada di database, PostgREST **membatalkan
seluruh statement** → biometrik tidak tersimpan, padahal UI tetap
menyatakan "Berhasil".

**Perbaikan:**
- penyimpanan berjenjang: `face_descriptor+biodata` → `biodata` →
  `face_descriptor`
- deteksi galat "kolom tidak ada" mencakup `PGRST204` **dan** `42703`
  (sebelumnya hanya `42703`, jadi fallback tidak pernah jalan)
- **tidak lagi** bergantung pada hasil `.select()` (kalau RLS menutupi
  SELECT, data sebenarnya tetap tersimpan tapi dianggap gagal)
- UI sekarang **jujur**: kalau gagal ke server, tampilkan pesan error
  beserta alasannya + arahan menjalankan SQL migrasi

### 4. 📸 Foto ID Card selalu hilang

**Penyebab:** sama seperti di atas — satu `UPDATE` berisi banyak kolom.
Kalau `biodata` atau `foto_updated_at` belum ada di database, seluruh
penyimpanan dibatalkan. Error hanya masuk ke console, jadi user tetap
menganggap "berhasil".

**Perbaikan:**
- file baru `app/utils/fotoProfil.js` dengan penyimpanan **progressive
  fallback**: `foto_url + foto_updated_at + biodata` → `foto_url +
  foto_updated_at` → `foto_url + biodata` → `foto_url` → `biodata`
- mencoba identifier berurutan: `id_siswa` → `username` → `nama_siswa`
- **salinan cadangan localStorage** per role+id → foto tetap tampil walau
  server sedang bermasalah
- notifikasi "⚠️ Foto Disimpan di Perangkat Ini Saja" bila server gagal
  (tidak lagi menampilkan sukses palsu)
- `biodata` berupa JSON **string** kini di-parse dulu, sehingga data
  biometrik tidak ikut hilang

### 5. 🔄 APK tidak pernah ter-update (harus uninstall)

**Penyebab:** `appVersionCode` tidak pernah naik → Android menolak
memasang APK dengan versi yang sama; service worker menahan versi lama;
APK di-cache browser.

**Perbaikan:**
- `scripts/bump-apk-version.ps1` → `appVersionCode` naik otomatis (+1)
- `scripts/write-apk-version.ps1` → menulis `public/apk/version.json`
- `next.config.js` → `/apk/*` memakai `no-store`; `sw.js`, `manifest.json`,
  `version.json` juga `no-store`
- `app/api/app-version/route.js` → sumber info versi
- `app/components/AppUpdateManager.js` → deteksi versi baru + prompt reload
- `public/sw.js` v41 → network-first mutlak, hapus cache lama saat activate
- `app/lib/appVersion.js` → sumber tunggal teks versi (APK & Desktop)
- tombol **🔄 Cek Update** di header aplikasi

### 6. 🧹 Sistem RFID & Kirimi dihapus total

- dihapus: `app/api/rfid-tap/`, `app/api/rekap-siswa/`
- dihapus: modal **Registrasi Kartu RFID**, polling `latest_scan`, dan
  USB keyboard-wedge scanner
- dihapus: kolom UID RFID di Master Data, ID Card, dan pencarian
- `effectiveUid` kini memakai **ID Akun internal** (`GURU-xxx` / `SIS-xxx`)
- dihapus: integrasi **Kirimi.id** (WhatsApp gateway) dari
  `inval-guru`, `cron/rekap-guru`, dan `.env.example`
- `/api/resend-wa` kini mengirim notifikasi **realtime in-app**
  (broadcast Supabase + pengumuman `tb_berita`) — bukan WhatsApp
- semua label "Grup WhatsApp" di UI diganti jadi "Notifikasi aplikasi"

### 7. 🔔 Notifikasi realtime presensi wajah

- `postgres_changes` pada tabel `absensi` sekarang **benar-benar bekerja**
  (sebelumnya insert selalu gagal → tidak ada event → tidak ada notifikasi)
- **Admin Master & Guru** kini menerima notifikasi untuk **setiap**
  kehadiran siswa/guru (mode monitoring), ditandai "📢 Monitoring Presensi"
- siswa/guru biasa tetap hanya menerima notifikasi miliknya sendiri
  (tanpa spam)

### 8. ⚡ PWA & metadata

- `manifest.json` → `id`, `display_override`, `categories`, 3 shortcut
  (Rekam Wajah AI / Kartu ID / Presensi)
- service worker tidak lagi memakai cache basi untuk halaman HTML

## 🔐 Build otomatis via GitHub Actions

`.github/workflows/build-apk.yml` — jalan otomatis saat `twa-manifest.json`
berubah, atau manual via tab **Actions → Build Android APK → Run workflow**.

> Workflow ini memakai **keystore yang ada di repo** (`android-keystore/`).
> Repo ini **private**, jadi amannya-layer. Kalau suatu saat repo jadi
> public, pindahkan keystore ke GitHub Secrets.

| Secret | Nilai |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | base64 dari `android-keystore/smk-ypk-superapp.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | `smkypk2026` |
| `ANDROID_KEY_PASSWORD` | `smkypk2026` |

Buat base64 keystore di PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android-keystore\smk-ypk-superapp.jks"))
```

## 📁 Struktur folder

| Path | Isi |
|---|---|
| `app/` | Next.js App Router — **INI yang ter-deploy ke Vercel** |
| `app/utils/waktu.js` | **Sumber tunggal** format waktu WIB (HH:MM:SS) |
| `app/utils/fotoProfil.js` | Penyimpanan foto profil anti-hilang |
| `app/api/app-version/` | API info versi & deteksi update |
| `app/components/AppUpdateManager.js` | Auto-update / prompt muat ulang |
| `android-twa/` | Project Android native (Gradle): Activity, Manifest, ikon, splash |
| `android-keystore/` | Keystore penanda tangan (JKS) |
| `twa-manifest.json` | Konfigurasi TWA (packageId, host, ikon, versi) |
| `manifest.json` | Web app manifest (PWA) |
| `public/apk/` | Hasil build APK + `version.json` |
| `scripts/` | Script build/versi/cek sintaks/uji |
| `SQL_MIGRASI_FINAL_SMK_YPK.sql` | **Wajib** dijalankan di Supabase |

## ⚡ Kenapa TWA, bukan WebView biasa?

TWA (Trusted Web Activity) memakai **engine Chrome asli**, jadi:

- ✅ Kamera `getUserMedia` (face recognition) jalan normal
- ✅ Upload file (`<input type="file">`) jalan normal
- ✅ `window.open()` untuk print form invalid guru → Custom Tab
- ✅ Service worker + notifikasi push jalan
- ✅ APK kecil (~1,3 MB), cepat
- ✅ Konten **selalu versi terbaru** dari Vercel

## 🔑 Digital Asset Links

`app/.well-known/assetlinks.json` berisi fingerprint SHA-256 sertifikat
penanda tangan:

```
F7:BF:55:8C:E9:EC:26:77:C0:28:E7:57:92:02:48:28:C0:12:0C:31:A3:4A:BF:B6:5A:D4:95:85:4B:1A:C9:24
```

File ini yang membuat TWA bisa **fullscreen tanpa address bar**.