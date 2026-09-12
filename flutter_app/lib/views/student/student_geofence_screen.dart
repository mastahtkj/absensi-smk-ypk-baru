import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_constants.dart';
import '../../providers/auth_provider.dart';
import '../../providers/attendance_provider.dart';
import '../../services/location_service.dart';

class StudentGeofenceScreen extends StatefulWidget {
  const StudentGeofenceScreen({super.key});

  @override
  State<StudentGeofenceScreen> createState() => _StudentGeofenceScreenState();
}

class _StudentGeofenceScreenState extends State<StudentGeofenceScreen> {
  bool _isCheckingLocation = false;
  bool _isSubmitting = false;
  LocationResult? _locationResult;

  @override
  void initState() {
    super.initState();
    _checkLocation();
  }

  Future<void> _checkLocation() async {
    setState(() {
      _isCheckingLocation = true;
    });

    final result = await LocationService.verifySchoolLocation();

    if (mounted) {
      setState(() {
        _locationResult = result;
        _isCheckingLocation = false;
      });
    }
  }

  Future<void> _submitAttendance() async {
    if (_locationResult == null || !_locationResult!.isWithinSchool) return;

    final user = context.read<AuthProvider>().currentUser;
    if (user == null) return;

    setState(() => _isSubmitting = true);
    final attProvider = context.read<AttendanceProvider>();
    final success = await attProvider.submitGeofenceAttendance(user);
    setState(() => _isSubmitting = false);

    if (!mounted) return;

    if (success) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: AppColors.secondary, size: 28),
              SizedBox(width: 8),
              Text('Presensi Berhasil!', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text(
            'Kehadiran Anda atas nama ${user.nama} berhasil dicatat di sistem SMK YPK Medan.',
            style: const TextStyle(fontSize: 13, height: 1.4),
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context);
              },
              child: const Text('Kembali ke Beranda'),
            ),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(attProvider.errorMessage ?? 'Gagal melakukan presensi.'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Presensi GPS Mandiri'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Radar Icon & Radius Information
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      color: (_locationResult?.isWithinSchool ?? false)
                          ? AppColors.secondary.withOpacity(0.12)
                          : AppColors.primary.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.my_location_rounded,
                      size: 46,
                      color: (_locationResult?.isWithinSchool ?? false)
                          ? AppColors.secondary
                          : AppColors.primary,
                    ),
                  ),

                  const SizedBox(height: 16),

                  const Text(
                    'Verifikasi Lokasi Sekolah',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),

                  const SizedBox(height: 6),

                  Text(
                    'Pusat Radius: ${AppConstants.appName}\n${AppConstants.schoolAddress}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.4),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 20),

                  if (_isCheckingLocation)
                    const Column(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        ),
                        SizedBox(height: 10),
                        Text(
                          'Mendeteksi satelit GPS HP Anda...',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    )
                  else if (_locationResult != null)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: _locationResult!.isWithinSchool
                            ? AppColors.statusHadirBg
                            : AppColors.statusAlfaBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                _locationResult!.isWithinSchool
                                    ? Icons.check_circle_outline
                                    : Icons.cancel_outlined,
                                color: _locationResult!.isWithinSchool
                                    ? AppColors.statusHadirText
                                    : AppColors.statusAlfaText,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                _locationResult!.isWithinSchool
                                    ? 'DI DALAM AREA SEKOLAH'
                                    : 'DI LUAR AREA SEKOLAH',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: _locationResult!.isWithinSchool
                                      ? AppColors.statusHadirText
                                      : AppColors.statusAlfaText,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _locationResult!.message,
                            style: TextStyle(
                              fontSize: 11,
                              color: _locationResult!.isWithinSchool
                                  ? AppColors.statusHadirText
                                  : AppColors.statusAlfaText,
                              height: 1.3,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 16),

                  OutlinedButton.icon(
                    onPressed: _isCheckingLocation ? null : _checkLocation,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Perbarui Lokasi GPS'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primaryLight),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Tombol Kirim Presensi
            ElevatedButton(
              onPressed: (_locationResult?.isWithinSchool == true && !_isSubmitting)
                  ? _submitAttendance
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                disabledBackgroundColor: AppColors.border,
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Kirim Kehadiran Sekarang',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
            ),

            const SizedBox(height: 16),

            const Text(
              'Catatan: Presensi mandiri hanya dapat dilakukan jika Anda berada dalam radius maksimal 200 meter dari gerbang SMK YPK Medan.',
              style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.4),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
