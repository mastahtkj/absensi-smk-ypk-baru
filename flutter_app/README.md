# 📱 Aplikasi Mobile SMK YPK Medan (Full Native Flutter)

Aplikasi mobile native presensi dan super app untuk **SMK YPK MEDAN**, terhubung langsung dengan backend **Supabase** dan tersinkronisasi secara realtime dengan alat mesin tap RFID sekolah (`REMEKE.ino`).

---

## 🌟 Fitur Utama

1. **Autentikasi Multi-Role & Sesi Aman**
   - Mendukung login untuk **Siswa**, **Guru/Pendidik**, dan **Admin / Guru Piket**.
   - Login menggunakan Nomor Kartu RFID (UID), Username, atau Nama Lengkap.
   - Sesi tersimpan offline dengan `SharedPreferences`.

2. **Pembatasan Maksimal 2 Perangkat Siswa (`tb_siswa_devices`)**
   - Menjamin 1 akun siswa hanya aktif di maksimal 2 perangkat (HP Siswa & HP Orang Tua).
   - Validasi ID perangkat keras secara native.
   - Menu Admin untuk mereset kuota perangkat siswa jika berganti HP baru (0/2).

3. **Presensi Mandiri Berbasis GPS Geofencing**
   - Validasi jarak radius otomatis menggunakan GPS HP (`geolocator`).
   - Siswa & Guru hanya dapat presensi jika berada dalam radius SMK YPK Medan (maksimal 200 meter).
   - Otomatis menentukan status **Hadir** (sebelum 07.30 WIB) atau **Terlambat** (setelah 07.30 WIB).

4. **Live Scanner Tap RFID (Realtime Stream)**
   - Dashboard Admin / Guru Piket yang memantau tap kartu RFID secara langsung tanpa refresh layar.
   - Setiap kartu yang di-tap pada alat gerbang (`REMEKE.ino`) langsung muncul dalam hitungan milidetik.
   - Admin dapat melakukan koreksi manual status (Hadir, Sakit, Izin, Alfa).

5. **ID Card Pelajar Digital Resmi**
   - Kartu identitas siswa digital dengan foto, nomor RFID, status aktif, dan QR Code dinamis (`qr_flutter`).
   - Dapat di-scan langsung di gerbang jika siswa lupa membawa kartu fisik.

6. **Mading & Pengumuman Sekolah (`tb_berita`)**
   - Akses informasi dan pengumuman resmi sekolah langsung di beranda aplikasi.

---

## 🚀 Cara Menjalankan & Membangun (Build)

### 1. Prasyarat
Pastikan Anda sudah menginstal:
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (versi 3.0.0 atau lebih baru)
- Android Studio / VS Code dengan ekstensi Flutter & Dart

### 2. Mengambil Dependensi
Buka terminal dan masuk ke folder `flutter_app`:
```bash
cd flutter_app
flutter pub get
```

### 3. Menjalankan di Perangkat / Emulator
Hubungkan HP Android dengan kabel data (aktifkan USB Debugging) atau jalankan Android Emulator:
```bash
flutter run
```

### 4. Membangun File APK Release untuk Dibagikan ke Siswa & Guru
Untuk membuat file APK siap instal:
```bash
flutter build apk --release
```
File APK akan tersimpan di:
`flutter_app/build/app/outputs/flutter-apk/app-release.apk`

---

## 🗂️ Struktur Direktori Proyek

```text
flutter_app/
├── android/                            # Konfigurasi native Android (Izin GPS, Internet, Kamera)
├── lib/
│   ├── main.dart                       # Entry point aplikasi & Provider setup
│   ├── core/
│   │   ├── constants/
│   │   │   ├── app_colors.dart         # Warna resmi SMK YPK (Navy, Emerald, Slate)
│   │   │   ├── app_constants.dart      # Jam operasional & koordinat GPS sekolah
│   │   │   └── supabase_config.dart    # URL & Anon Key Supabase
│   │   ├── theme/
│   │   │   └── app_theme.dart          # Tema Material 3 modern
│   │   └── utils/
│   │       ├── date_formatter.dart     # Format tanggal & jam Indonesia (WIB)
│   │       └── device_helper.dart      # Deteksi hardware HP untuk batas 2 perangkat
│   ├── models/
│   │   ├── user_model.dart             # Model Siswa, Guru, dan Admin
│   │   ├── attendance_model.dart       # Model tabel absensi
│   │   ├── news_model.dart             # Model tabel tb_berita
│   │   ├── inval_model.dart            # Model tabel tb_inval_guru
│   │   └── device_model.dart           # Model tabel tb_siswa_devices
│   ├── services/
│   │   ├── supabase_service.dart       # Inisialisasi client Supabase
│   │   ├── auth_service.dart           # Autentikasi multi-role & limit perangkat
│   │   ├── attendance_service.dart     # Query presensi, insert GPS, stream realtime
│   │   ├── location_service.dart       # Perhitungan jarak GPS Geofencing
│   │   └── news_service.dart           # Query berita & jadwal inval
│   ├── providers/
│   │   ├── auth_provider.dart          # State login & session
│   │   └── attendance_provider.dart    # State presensi hari ini & riwayat
│   └── views/
│       ├── splash/splash_screen.dart   # Animasi splash & auto-login check
│       ├── auth/login_screen.dart      # Halaman login modern
│       ├── student/                    # Layar khusus Siswa
│       │   ├── student_home_screen.dart
│       │   ├── student_id_card_screen.dart
│       │   └── student_geofence_screen.dart
│       ├── teacher/                    # Layar khusus Guru
│       │   ├── teacher_home_screen.dart
│       │   └── teacher_inval_screen.dart
│       ├── admin/                      # Layar khusus Admin / Piket
│       │   ├── admin_live_scan_screen.dart
│       │   └── admin_device_screen.dart
│       └── shared/                     # Layar bersama
│           ├── news_detail_screen.dart
│           └── profile_screen.dart
└── pubspec.yaml                        # Dependensi proyek
```
