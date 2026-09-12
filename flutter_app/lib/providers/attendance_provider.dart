import 'package:flutter/material.dart';
import '../models/attendance_model.dart';
import '../models/user_model.dart';
import '../services/attendance_service.dart';

class AttendanceProvider extends ChangeNotifier {
  AttendanceModel? _todayAttendance;
  List<AttendanceModel> _history = [];
  bool _isLoading = false;
  String? _errorMessage;

  AttendanceModel? get todayAttendance => _todayAttendance;
  List<AttendanceModel> get history => _history;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// Muat data presensi hari ini
  Future<void> loadTodayAttendance(UserModel user) async {
    _isLoading = true;
    notifyListeners();

    try {
      _todayAttendance = await AttendanceService.getTodayAttendance(user);
    } catch (e) {
      _errorMessage = 'Gagal memuat status presensi hari ini.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Muat riwayat presensi
  Future<void> loadHistory(UserModel user) async {
    _isLoading = true;
    notifyListeners();

    try {
      _history = await AttendanceService.getHistory(user);
    } catch (e) {
      _errorMessage = 'Gagal memuat riwayat presensi.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Submit Presensi GPS Geofencing
  Future<bool> submitGeofenceAttendance(UserModel user) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final record = await AttendanceService.recordGeofenceAttendance(user: user);
      _todayAttendance = record;
      _history.insert(0, record);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Gagal melakukan presensi: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
