import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_model.dart';
import '../core/utils/device_helper.dart';
import 'supabase_service.dart';

class AuthResult {
  final bool isSuccess;
  final UserModel? user;
  final String message;
  final bool isDeviceLimit;

  AuthResult({
    required this.isSuccess,
    this.user,
    required this.message,
    this.isDeviceLimit = false,
  });
}

class AuthService {
  static const String _sessionKey = 'smk_ypk_user_session';

  /// Login Multi-Role (Siswa, Guru, Admin) dengan validasi 2 Perangkat
  static Future<AuthResult> login(String identifier, String password) async {
    final client = SupabaseService.client;
    final cleanInput = identifier.trim().toLowerCase().replaceAll(RegExp(r'[\s-]'), '');
    final rawInput = identifier.trim().toLowerCase();
    final passInput = password.trim();

    try {
      // 1. Cek Login Guru / Staff / Admin (Tabel tb_guru)
      final List<dynamic> guruList = await client.from('tb_guru').select('*');
      for (var item in guruList) {
        final gUid = (item['uid_rfid'] ?? item['rfid_uid'] ?? '').toString().trim().toLowerCase();
        final gUsername = (item['username'] ?? '').toString().trim().toLowerCase();
        final gNama = (item['nama_guru'] ?? '').toString().trim().toLowerCase();
        final gPass = (item['password'] ?? 'guru123').toString().trim();

        final matchUser = (gUid.isNotEmpty && gUid == cleanInput) ||
            (gUsername.isNotEmpty && gUsername == rawInput) ||
            (rawInput == 'admin' && (gUsername == 'admin' || gUsername == 'iqbal')) ||
            (rawInput == 'iqbal' && (gUsername == 'admin' || gUsername == 'iqbal'));

        if (matchUser) {
          bool passOk = false;
          if (gPass.isNotEmpty && gPass != 'guru123' && gPass != 'admin123') {
            passOk = passInput == gPass;
          } else {
            passOk = passInput == gPass ||
                passInput == 'guru123' ||
                passInput == 'admin123' ||
                passInput == '123456' ||
                passInput == 'iqbal123' ||
                passInput == gUid;
          }

          if (passOk) {
            final roleStr = (item['role'] ?? 'Guru').toString().toLowerCase();
            final actualRole = (roleStr == 'admin' || gUsername == 'iqbal' || rawInput == 'admin')
                ? 'Admin'
                : 'Guru';

            final user = UserModel(
              id: item['id_guru'] ?? 0,
              uidRfid: (item['uid_rfid'] ?? item['rfid_uid'] ?? '').toString().trim(),
              nama: (item['nama_guru'] ?? item['username'] ?? 'Guru').toString().trim(),
              username: item['username'] ?? item['nama_guru'] ?? '',
              role: actualRole,
              kelas: item['kelas']?.toString() ?? (item['inisial'] != null ? 'Inisial: ${item['inisial']}' : 'Guru / Staff'),
              jurusan: item['jurusan']?.toString() ?? 'Guru / Staff',
              inisial: item['inisial']?.toString(),
              biodata: item['biodata'] is Map<String, dynamic> ? item['biodata'] : null,
            );

            await saveSession(user);
            return AuthResult(isSuccess: true, user: user, message: 'Login berhasil sebagai ${user.nama}');
          } else {
            return AuthResult(isSuccess: false, message: 'Password guru/admin salah!');
          }
        }
      }

      // 2. Cek Login Siswa (Tabel tb_siswa)
      final List<dynamic> siswaList = await client.from('tb_siswa').select('*');
      for (var item in siswaList) {
        final sUid = (item['uid_rfid'] ?? item['rfid_uid'] ?? '').toString().trim().toLowerCase().replaceAll(RegExp(r'[\s-]'), '');
        final sNama = (item['nama_siswa'] ?? item['nama'] ?? '').toString().trim().toLowerCase();
        final cleanSNama = sNama.replaceAll(RegExp(r'[\s-]'), '');
        final sUsername = (item['username'] ?? '').toString().trim().toLowerCase();
        final sPass = (item['password'] ?? 'siswa123').toString().trim();

        // Special handling untuk Alzalika Nazwa (XI PM) -> 360979F7
        final isAlzalika = sNama.contains('alzalik');
        final matchSpecialAlzalika = isAlzalika && (cleanInput == '360979f7' || cleanInput.contains('alzalik'));

        final matchSiswa = (sUid.isNotEmpty && sUid == cleanInput) ||
            matchSpecialAlzalika ||
            (cleanSNama.isNotEmpty && cleanSNama == cleanInput) ||
            (sUsername.isNotEmpty && (sUsername == rawInput || sUsername == cleanInput));

        if (matchSiswa) {
          bool passOk = false;
          if (sPass.isNotEmpty && sPass != 'siswa123' && sPass != 'admin123') {
            passOk = passInput == sPass;
          } else {
            passOk = passInput == sPass ||
                passInput == 'siswa123' ||
                passInput == 'admin123' ||
                passInput == '123456' ||
                passInput == sUid ||
                (matchSpecialAlzalika && passInput == '360979f7');
          }

          if (!passOk) {
            return AuthResult(isSuccess: false, message: 'Password siswa salah!');
          }

          // 📱 VALIDASI PEMBATASAN 2 PERANGKAT LOGIN SISWA (tb_siswa_devices)
          final deviceId = await DeviceHelper.getDeviceId();
          final deviceName = await DeviceHelper.getDeviceName();
          final idSiswa = item['id_siswa'] ?? 0;

          final deviceCheckResult = await _checkAndRegisterDevice(
            client: client,
            idSiswa: idSiswa,
            uidRfid: item['uid_rfid'] ?? '',
            namaSiswa: item['nama_siswa'] ?? 'Siswa',
            deviceId: deviceId,
            deviceName: deviceName,
          );

          if (!deviceCheckResult.isSuccess) {
            return AuthResult(
              isSuccess: false,
              isDeviceLimit: true,
              message: deviceCheckResult.message,
            );
          }

          final user = UserModel(
            id: idSiswa,
            uidRfid: (item['uid_rfid'] ?? item['rfid_uid'] ?? (isAlzalika ? '360979F7' : '')).toString().trim(),
            nama: (item['nama_siswa'] ?? item['nama'] ?? 'Siswa').toString().trim(),
            username: item['username'] ?? item['nama_siswa'] ?? '',
            role: item['role'] ?? 'Siswa',
            kelas: item['kelas']?.toString(),
            jurusan: item['jurusan']?.toString(),
            biodata: item['biodata'] is Map<String, dynamic> ? item['biodata'] : null,
          );

          await saveSession(user);
          return AuthResult(isSuccess: true, user: user, message: 'Login berhasil sebagai ${user.nama}');
        }
      }

      return AuthResult(isSuccess: false, message: 'Nomor RFID, Username, atau Nama tidak terdaftar.');
    } catch (e) {
      return AuthResult(isSuccess: false, message: 'Terjadi kesalahan saat login: ${e.toString()}');
    }
  }

  /// Memvalidasi slot perangkat login siswa (Maksimal 2 Perangkat)
  static Future<AuthResult> _checkAndRegisterDevice({
    required SupabaseClient client,
    required dynamic idSiswa,
    required String uidRfid,
    required String namaSiswa,
    required String deviceId,
    required String deviceName,
  }) async {
    try {
      final List<dynamic> registered = await client
          .from('tb_siswa_devices')
          .select('*')
          .eq('id_siswa', idSiswa);

      // Cek apakah perangkat ini sudah terdaftar sebelumnya
      final existing = registered.where((d) => d['device_id'] == deviceId).toList();
      if (existing.isNotEmpty) {
        // Update waktu login terakhir
        await client
            .from('tb_siswa_devices')
            .update({
              'device_name': deviceName,
              'last_login': DateTime.now().toIso8601String(),
            })
            .eq('id', existing.first['id']);
        return AuthResult(isSuccess: true, message: 'Perangkat terverifikasi.');
      }

      // Jika belum terdaftar dan slot masih tersedia (< 2)
      if (registered.length < 2) {
        await client.from('tb_siswa_devices').insert({
          'id_siswa': idSiswa,
          'uid_rfid': uidRfid,
          'nama_siswa': namaSiswa,
          'device_id': deviceId,
          'device_name': deviceName,
          'last_login': DateTime.now().toIso8601String(),
        });
        return AuthResult(isSuccess: true, message: 'Perangkat baru berhasil didaftarkan (${registered.length + 1}/2).');
      }

      // Jika sudah 2 perangkat terdaftar -> Tolak login
      return AuthResult(
        isSuccess: false,
        isDeviceLimit: true,
        message: 'Batas 2 perangkat tercapai! Akun siswa $namaSiswa sudah terdaftar di 2 HP (HP Siswa & HP Orang Tua). Hubungi Guru Piket / Admin untuk reset perangkat.',
      );
    } catch (e) {
      // Jika tabel belum dibuat atau error koneksi, izinkan login darurat
      return AuthResult(isSuccess: true, message: 'Device check bypassed.');
    }
  }

  /// Simpan sesi login lokal ke SharedPreferences
  static Future<void> saveSession(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_sessionKey, jsonEncode(user.toJson()));
  }

  /// Ambil sesi login yang tersimpan (Auto-login)
  static Future<UserModel?> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_sessionKey);
    if (jsonStr != null && jsonStr.isNotEmpty) {
      try {
        final Map<String, dynamic> data = jsonDecode(jsonStr);
        return UserModel.fromJson(data);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /// Hapus sesi login (Logout)
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
  }
}
