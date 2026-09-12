class AppConstants {
  // Profil Sekolah
  static const String appName = 'SMK YPK MEDAN';
  static const String appTagline = 'Sistem Informasi & Presensi Digital';
  static const String schoolAddress = 'Jl. Sakti Lubis Gg. Bali No. 12, Medan';
  static const String appVersion = '1.0.0';

  // Jam Operasional & Aturan Presensi
  static const int entryHour = 7;
  static const int entryMinute = 15; // 07.15 WIB

  static const int lateThresholdHour = 7;
  static const int lateThresholdMinute = 30; // Batas tepat waktu 07.30 WIB

  static const int departureHour = 14;
  static const int departureMinute = 30; // Pulang 14.30 WIB

  // Batas Maksimal Perangkat Login Siswa
  static const int maxStudentDevices = 2;

  // Koordinat GPS Geofencing SMK YPK Medan
  // Siswa/Guru hanya dapat presensi mandiri jika berada dalam radius sekolah
  static const double schoolLatitude = 3.55832;
  static const double schoolLongitude = 98.69421;
  static const double allowedRadiusMeters = 200.0; // Toleransi radius 200 meter

  // Role Names
  static const String roleSiswa = 'Siswa';
  static const String roleGuru = 'Guru';
  static const String roleAdmin = 'Admin';
}
