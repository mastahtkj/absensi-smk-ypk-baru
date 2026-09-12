import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/attendance_model.dart';
import '../models/user_model.dart';
import '../models/device_model.dart';
import '../core/constants/app_constants.dart';
import '../core/utils/date_formatter.dart';
import 'supabase_service.dart';

class AttendanceService {
  static SupabaseClient get _client => SupabaseService.client;

  /// Ambil presensi hari ini untuk pengguna spesifik
  static Future<AttendanceModel?> getTodayAttendance(UserModel user) async {
    try {
      final todayStr = DateFormatter.formatIsoDate(DateTime.now());
      var query = _client
          .from('absensi')
          .select('*')
          .gte('created_at', '$todayStr 00:00:00')
          .lte('created_at', '$todayStr 23:59:59');

      if (user.uidRfid.isNotEmpty) {
        query = query.or('rfid_uid.eq.${user.uidRfid},nama.ilike.%${user.nama}%');
      } else {
        query = query.ilike('nama', '%${user.nama}%');
      }

      final List<dynamic> data = await query.order('created_at', ascending: false).limit(1);
      if (data.isNotEmpty) {
        return AttendanceModel.fromJson(data.first);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Ambil riwayat presensi pengguna
  static Future<List<AttendanceModel>> getHistory(UserModel user, {int limit = 30}) async {
    try {
      var query = _client.from('absensi').select('*');
      if (user.uidRfid.isNotEmpty) {
        query = query.or('rfid_uid.eq.${user.uidRfid},nama.ilike.%${user.nama}%');
      } else {
        query = query.ilike('nama', '%${user.nama}%');
      }

      final List<dynamic> data = await query.order('created_at', ascending: false).limit(limit);
      return data.map((json) => AttendanceModel.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Presensi Mandiri via GPS Geofencing (Siswa atau Guru)
  static Future<AttendanceModel> recordGeofenceAttendance({
    required UserModel user,
    String? customStatus,
  }) async {
    final now = DateTime.now();

    // Penentuan otomatis status Hadir / Terlambat berdasarkan jam sekolah
    String status = customStatus ?? 'Hadir';
    if (customStatus == null) {
      final hour = now.hour;
      final minute = now.minute;
      if (hour > AppConstants.lateThresholdHour ||
          (hour == AppConstants.lateThresholdHour && minute > AppConstants.lateThresholdMinute)) {
        status = 'Terlambat';
      }
    }

    final newRecord = {
      'rfid_uid': user.uidRfid.isNotEmpty ? user.uidRfid : 'APP_GPS',
      'nama': user.nama,
      'kelas': user.kelas ?? (user.isGuru ? 'Guru / Staff' : 'Siswa'),
      'status': status,
      'created_at': now.toIso8601String(),
      'updated_by': 'Presensi GPS Mobile',
    };

    final inserted = await _client.from('absensi').insert(newRecord).select().single();
    return AttendanceModel.fromJson(inserted);
  }

  /// Ambil seluruh presensi hari ini (Untuk Guru Piket & Admin)
  static Future<List<AttendanceModel>> getAllAttendanceToday({String? kelasFilter, String? tanggal}) async {
    try {
      final targetDate = tanggal ?? DateFormatter.formatIsoDate(DateTime.now());
      var query = _client
          .from('absensi')
          .select('*')
          .gte('created_at', '$targetDate 00:00:00')
          .lte('created_at', '$targetDate 23:59:59');

      if (kelasFilter != null && kelasFilter != 'Semua' && kelasFilter.isNotEmpty) {
        query = query.ilike('kelas', '%$kelasFilter%');
      }

      final List<dynamic> data = await query.order('created_at', ascending: false);
      return data.map((json) => AttendanceModel.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Update manual status presensi oleh Admin / Guru Piket
  static Future<bool> updateStatus({
    required int id,
    required String newStatus,
    required String updatedBy,
    required String namaTarget,
    String? statusLama,
  }) async {
    try {
      final now = DateTime.now().toIso8601String();
      await _client.from('absensi').update({
        'status': newStatus,
        'updated_by': updatedBy,
        'updated_at': now,
      }).eq('id', id);

      // Catat ke audit log presensi
      try {
        await _client.from('audit_log_presensi').insert({
          'diubah_oleh': updatedBy,
          'role_pengubah': 'Admin/Piket',
          'target_nama': namaTarget,
          'status_lama': statusLama ?? 'Hadir',
          'status_baru': newStatus,
          'created_at': now,
        });
      } catch (e) {
        // Abaikan jika audit log opsional
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  /// Stream Realtime untuk Live Scanner di Dashboard Admin (Sinkron dengan mesin tap RFID REMEKE.ino)
  static Stream<List<Map<String, dynamic>>> streamLiveScanner() {
    return _client
        .from('absensi')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .limit(20);
  }

  /// Ambil daftar perangkat login siswa (Admin Tool)
  static Future<List<DeviceModel>> getStudentDevices(dynamic idSiswa) async {
    try {
      final List<dynamic> data = await _client
          .from('tb_siswa_devices')
          .select('*')
          .eq('id_siswa', idSiswa)
          .order('last_login', ascending: false);
      return data.map((json) => DeviceModel.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Reset slot perangkat siswa (Admin Tool: 0/2 Perangkat)
  static Future<bool> resetStudentDevices(dynamic idSiswa, String adminName) async {
    try {
      await _client.from('tb_siswa_devices').delete().eq('id_siswa', idSiswa);
      return true;
    } catch (e) {
      return false;
    }
  }
}
