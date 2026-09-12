import 'package:geolocator/geolocator.dart';
import '../core/constants/app_constants.dart';

class LocationResult {
  final bool isSuccess;
  final bool isWithinSchool;
  final double distanceMeters;
  final Position? position;
  final String message;

  LocationResult({
    required this.isSuccess,
    required this.isWithinSchool,
    required this.distanceMeters,
    this.position,
    required this.message,
  });
}

class LocationService {
  /// Memeriksa izin GPS dan status aktivasi layanan lokasi
  static Future<bool> handleLocationPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  /// Memvalidasi apakah posisi HP pengguna berada dalam radius SMK YPK Medan
  static Future<LocationResult> verifySchoolLocation() async {
    final hasPermission = await handleLocationPermission();
    if (!hasPermission) {
      return LocationResult(
        isSuccess: false,
        isWithinSchool: false,
        distanceMeters: -1,
        message: 'Izin GPS belum diberikan atau layanan lokasi (GPS) sedang dinonaktifkan.',
      );
    }

    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      // Hitung jarak garis lurus (meter) antara posisi HP dengan koordinat SMK YPK Medan
      double distanceInMeters = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        AppConstants.schoolLatitude,
        AppConstants.schoolLongitude,
      );

      bool withinRadius = distanceInMeters <= AppConstants.allowedRadiusMeters;

      if (withinRadius) {
        return LocationResult(
          isSuccess: true,
          isWithinSchool: true,
          distanceMeters: distanceInMeters,
          position: position,
          message: 'Lokasi Anda terverifikasi berada di area SMK YPK Medan (${distanceInMeters.toStringAsFixed(1)} m).',
        );
      } else {
        return LocationResult(
          isSuccess: true,
          isWithinSchool: false,
          distanceMeters: distanceInMeters,
          position: position,
          message: 'Anda berada di luar area sekolah (${distanceInMeters.toStringAsFixed(0)} m dari SMK YPK Medan). Maksimal radius yang diizinkan adalah ${AppConstants.allowedRadiusMeters.toInt()} m.',
        );
      }
    } catch (e) {
      return LocationResult(
        isSuccess: false,
        isWithinSchool: false,
        distanceMeters: -1,
        message: 'Gagal mendeteksi koordinat GPS: ${e.toString()}',
      );
    }
  }
}
