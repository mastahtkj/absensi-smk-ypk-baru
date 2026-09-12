import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DeviceHelper {
  static const String _prefDeviceIdKey = 'smk_ypk_device_unique_id';

  /// Mendapatkan Device ID unik yang stabil untuk pembatasan 2 perangkat siswa
  static Future<String> getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? storedId = prefs.getString(_prefDeviceIdKey);

    if (storedId != null && storedId.isNotEmpty) {
      return storedId;
    }

    final deviceInfo = DeviceInfoPlugin();
    String newId = '';

    try {
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        newId = 'AND_${androidInfo.id}_${androidInfo.model}'.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_');
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        newId = 'IOS_${iosInfo.identifierForVendor ?? iosInfo.model}'.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_');
      } else {
        newId = 'DEV_${DateTime.now().millisecondsSinceEpoch}';
      }
    } catch (e) {
      newId = 'DEV_FALLBACK_${DateTime.now().millisecondsSinceEpoch}';
    }

    await prefs.setString(_prefDeviceIdKey, newId);
    return newId;
  }

  /// Mendapatkan nama ramah perangkat (misal: "Samsung Galaxy A52" atau "Xiaomi Redmi 10")
  static Future<String> getDeviceName() async {
    final deviceInfo = DeviceInfoPlugin();
    try {
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        final brand = androidInfo.brand.toUpperCase();
        final model = androidInfo.model;
        return '$brand $model'.trim();
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        return iosInfo.name.isNotEmpty ? iosInfo.name : 'Apple iPhone';
      }
    } catch (e) {
      // Fallback
    }
    return 'Smartphone Mobile';
  }
}
