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

## 🛠️ Kalau perlu build ulang APK (mis. ganti ikon/nama/domain)

Jalankan `BUILD-APK.cmd` di root repo.

Script ini memakai toolchain di `%USERPROFILE%\.apk-toolchain` (JDK 17, Android SDK, Node.js, Bubblewrap — semua terpasang, **tidak perlu unduh lagi**).

Output: `public/apk/SMK_YPK_SUPER_APP.apk`

## 🔐 Build otomatis via GitHub Actions

`.github/workflows/build-apk.yml` — jalan otomatis saat `twa-manifest.json` berubah, atau manual via tab **Actions → Build Android APK → Run workflow**.

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