import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isDeviceLimit = false;

  UserModel? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isDeviceLimit => _isDeviceLimit;

  /// Memeriksa sesi tersimpan saat aplikasi pertama kali dibuka
  Future<bool> checkAutoLogin() async {
    _isLoading = true;
    notifyListeners();

    try {
      final savedUser = await AuthService.loadSession();
      if (savedUser != null) {
        _currentUser = savedUser;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      // Abaikan jika error
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  /// Proses Login Multi-Role
  Future<bool> login(String identifier, String password) async {
    _isLoading = true;
    _errorMessage = null;
    _isDeviceLimit = false;
    notifyListeners();

    final result = await AuthService.login(identifier, password);
    _isLoading = false;

    if (result.isSuccess && result.user != null) {
      _currentUser = result.user;
      notifyListeners();
      return true;
    } else {
      _errorMessage = result.message;
      _isDeviceLimit = result.isDeviceLimit;
      notifyListeners();
      return false;
    }
  }

  /// Proses Logout
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    await AuthService.logout();
    _currentUser = null;
    _isLoading = false;
    notifyListeners();
  }

  /// Bersihkan pesan error
  void clearError() {
    _errorMessage = null;
    _isDeviceLimit = false;
    notifyListeners();
  }
}
