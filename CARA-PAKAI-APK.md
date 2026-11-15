# 📱 SMK YPK SUPER APP — Panduan APK Android

## ✅ Status

| Komponen | Status |
|---|---|
| App web (Vercel) | ✅ Live — `https://absensi-smk-ypk-baru.vercel.app` |
| PWA (install via Chrome) | ✅ Sudah aktif — manifest + service worker |
| APK Android (TWA) | ✅ Dibuat dari wrapper TWA ke domain Vercel |
| Update web → otomatis | ✅ Push ke GitHub → Vercel auto-deploy → APK ikut ter-update |

## 📥 Download APK

**URL:** `https://absensi-smk-ypk-baru.vercel.app/apk/SMK_YPK_SUPER_APP.apk`

Atau dari repo: folder `public/apk/`

> APK **tidak perlu di-install ulang** setiap kali aplikasi web diperbarui.
> APK ini cuma "cangkang" (TWA) yang membuka URL Vercel — jadi begitu
> Vercel auto-deploy versi baru, **isi aplikasi di HP langsung ter-update**.

## 📲 Cara install di HP

1. Buka link APK di **Chrome** (HP)
2. Chrome mengunduh file `.apk`
3. Buka file dari notifikasi download → izinkan **"Install unknown apps"** untuk Chrome
4. Tekan **Install**
5. Aplikasi **"SMK YPK"** muncul di layar utama

> ⚠️ Android 8+ menampilkan peringatan "app ini dari sumber tidak dikenal" — normal untuk APK sideload.

## 🎯 Mode Kiosk / Presensi Wajah

Setelah ter-install, buka link dengan parameter:

```
https://absensi-smk-ypk-baru.vercel.app?terminal=1
```

Langsung membuka modal **scanner wajah** (terminal/kiosk mode).

Parameter lain: `?scanner=1`, `?presensi=1`, `?view=scanner`, `?mode=terminal`

## 🔄 Cara update (paling sering dipakai)

Karena APK ini **membungkus URL Vercel**, update aplikasi web **tidak perlu build APK lagi**:

1. Ubah kode di folder `app/` (atau `src/app/`)
2. Commit + push ke branch `main`
3. Vercel auto-deploy → APK di HP **langsung** dapat versi baru
4. Buka ulang app (tarik ke bawah untuk refresh)

👉 **Cukup mengetik "perbaiki X" di chat — saya yang edit, push, dan deploy.**

Atau mau само menjalankan di laptop sendiri:

```cmd
UPDATE-APP.cmd
```

Script itu otomatis: build APK → salin ke `public/apk/` → commit → push
(Vercel langsung auto-deploy).

## 🛠️ Kalau perlu build ulang APK (mis. ganti ikon/nama/domain)

Jalankan `BUILD-APK.cmd` di root repo.

Script ini memakai toolchain di `%USERPROFILE%\.apk-toolchain` (JDK 17, Android SDK, Node.js, Bubblewrap — semua terpasang, **tidak perlu unduh lagi**).

Output: `public/apk/SMK_YPK_SUPER_APP.apk`

## 🔐 Build otomatis via GitHub Actions

`.github/workflows/build-apk.yml` — jalan otomatis saat `twa-manifest.json` berubah, atau manual via tab **Actions → Build Android APK → Run workflow**.

> Workflow ini memakai **keystore yang ada di repo** (`android-keystore/`).
> Repo ini private, jadi amannya-layer. Kalau suatu saat repo jadi public,
> pindahkan keystore ke GitHub Secrets (panduan di bawah).

Repo ini **private**, jadi keystore disimpan langsung di `android-keystore/` — tidak perlu setup secret, workflow langsung jalan.

Kalau nanti mau pakai GitHub Secrets (mis. untuk repo public), isi:

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
| `src/app/` | Duplikat (sinkron dengan `app/`) |
| `android-twa/` | Project Android native (Gradle): Activity, Manifest, ikon, splash |
| `android-keystore/` | Keystore penanda tangan (JKS) |
| `twa-manifest.json` | Konfigurasi TWA (packageId, host, ikon) |
| `manifest.json` | Web app manifest (PWA) |
| `public/apk/` | Hasil build APK (di-host Vercel) |
| `BUILD-APK.cmd` | Script build lokal |

## 🛠️ Perbaikan yang sudah diterapkan

### 1. Error 500 pada rekap presensi

Penyebabnya: query ke tabel `absensi` memakai filter `.gte('created_at', ...)`
di beberapa endpoint, padahal sebagian instalasi database **tidak memiliki
kolom `created_at`** → PostgREST membalas error → seluruh rekap jadi 500.

Sekarang semua query absensi memakai helper `app/lib/absensiQuery.js`:

- ambil data dengan `select('*')` (tidak pernah gagal karena nama kolom)
- filter tanggal dilakukan di sisi server
- kolom `created_at` **dan** `tanggal` + `jam_masuk` sama-sama didukung
- fallback berjenjang bila query pertama gagal

Endpoint yang kini normal: `/api/rekap-siswa`, `/api/rfid-tap`,
`/api/face-attendance`, `/api/manual-update`, `/api/cron/rekap-guru`.

### 2. Ruang Chat All tidak menemukan data

`ChatAllModal` memakai project Supabase yang **berbeda** dari aplikasi utama,
sehingga percakapan tidak pernah terbaca. Sekarang semua modul memakai
`app/lib/supabaseConfig.js` (satu sumber konfigurasi).

### 3. Aplikasi lambat ("lelet")

Sebab: semua view berat (Ujian CBT 251 KB, Master Control 238 KB, Bahan Ajar
100 KB, dll.) di-*import* secara statis → semuanya ikut termuat saat app dibuka.

Sekarang semuanya pakai `next/dynamic` (lazy-load saat menu dibuka):

| Metrik | Sebelum | Sesudah |
|---|---|---|
| First Load JS | ~1,2 MB | **312 kB** |
| Shared JS | — | 87 kB |

Selain itu: polling config 5 detik → 30 detik, polling cek lesson 5 detik →
20 detik, dan keduanya **berhenti saat tab tidak terlihat** (hemat baterai HP).

### 4. Duplikat file yang bikin perubahan "tidak efek"

Previously ada 4 salinan kode: `app/`, `src/app/`, `components/`+`data/`+`utils/`
di root, dan `page.js`/`route.js` di root. Yang ter-deploy hanya `app/`, jadi
perubahan di `src/app/` **tidak pernah muncul** di aplikasi.

Sekarang: **hanya ada satu sumber kebenaran** (`app/`), duplikatnya dihapus.

### 5. Tampilan & Face Recognition

- **Kotak wajah meleset saat mode cermin**: video di-`scaleX(-1)` tapi canvas
  tidak, sehingga kotak berada di sisi sebaliknya. Sekarang koordinat kotak
  dibalik otomatis (teks nama tetap terbaca normal).
- **Wajah terlalu kecil di HP**: rasio video 16/9 → otomatis 4/3 di layar HP.
- Deteksi wajah tetap memakai 3-tier fallback (tiny → landmark → basic)
  dengan ambang jarak 0,58.

## ⚡ Kenapa TWA, bukan WebView biasa?

TWA (Trusted Web Activity) memakai **engine Chrome asli**, jadi:

- ✅ Kamera `getUserMedia` (face recognition) jalan normal
- ✅ Upload file (`<input type="file">`) jalan normal
- ✅ `window.open()` untuk print form invalid guru → Custom Tab
- ✅ Service worker + notifikasi push jalan
- ✅ APK kecil (~2–5 MB), cepat
- ✅ Konten **selalu versi terbaru** dari Vercel

## 🔑 Digital Asset Links

`app/.well-known/assetlinks.json` dan `src/app/.well-known/assetlinks.json`
berisi fingerprint SHA-256 sertifikat penanda tangan:

```
F7:BF:55:8C:E9:EC:26:77:C0:28:E7:57:92:02:48:28:C0:12:0C:31:A3:4A:BF:B6:5A:D4:95:85:4B:1A:C9:24
```

File ini yang membuat TWA bisa **fullscreen tanpa address bar**.