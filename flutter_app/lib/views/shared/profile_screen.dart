import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/device_helper.dart';
import '../../providers/auth_provider.dart';
import '../../services/supabase_service.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _currentDevice = 'Memuat...';

  @override
  void initState() {
    super.initState();
    _loadDeviceInfo();
  }

  Future<void> _loadDeviceInfo() async {
    final dev = await DeviceHelper.getDeviceName();
    if (mounted) setState(() => _currentDevice = dev);
  }

  void _handleChangePassword() {
    final passCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Ubah Password', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: passCtrl,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Password Baru',
            hintText: 'Minimal 6 karakter',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            onPressed: () async {
              final newPass = passCtrl.text.trim();
              if (newPass.length < 5) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Password minimal 5 karakter.')),
                );
                return;
              }

              final user = context.read<AuthProvider>().currentUser;
              if (user == null) return;

              try {
                if (user.isGuru || user.isAdmin) {
                  await SupabaseService.client
                      .from('tb_guru')
                      .update({'password': newPass})
                      .eq('id_guru', user.id);
                } else {
                  await SupabaseService.client
                      .from('tb_siswa')
                      .update({'password': newPass})
                      .eq('id_siswa', user.id);
                }

                if (mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Password berhasil diperbarui!'),
                      backgroundColor: AppColors.secondary,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Gagal mengubah password: ${e.toString()}')),
                  );
                }
              }
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  void _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Keluar dari Akun'),
        content: const Text('Apakah Anda yakin ingin keluar dari aplikasi SMK YPK Medan?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    if (!mounted) return;
    await context.read<AuthProvider>().logout();

    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profil Saya'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Card Profil Utama
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppColors.primary.withOpacity(0.12),
                    child: Text(
                      user?.nama.isNotEmpty == true ? user!.nama[0].toUpperCase() : 'U',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.nama ?? 'Pengguna',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Peran: ${user?.role ?? "Pengguna"} • ${user?.kelas ?? "SMK YPK"}',
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'UID RFID: ${user?.uidRfid.isNotEmpty == true ? user!.uidRfid : "-"}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Card Pengaturan Akun & Perangkat
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.phone_android_rounded, color: AppColors.primaryLight),
                    title: const Text('Perangkat HP Saat Ini', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: Text(_currentDevice, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.lock_reset_rounded, color: AppColors.warning),
                    title: const Text('Ubah Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: const Text('Perbarui kata sandi akun Anda', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                    trailing: const Icon(Icons.chevron_right, size: 20, color: AppColors.textMuted),
                    onTap: _handleChangePassword,
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.info_outline, color: AppColors.textSecondary),
                    title: const Text('Versi Aplikasi', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: const Text('SMK YPK Super App v${AppConstants.appVersion}', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Tombol Logout
            ElevatedButton.icon(
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: const Text('Keluar dari Akun'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.danger,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
