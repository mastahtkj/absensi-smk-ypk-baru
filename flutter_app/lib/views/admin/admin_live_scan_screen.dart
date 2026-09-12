import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/attendance_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/attendance_service.dart';
import 'admin_device_screen.dart';
import '../shared/profile_screen.dart';

class AdminLiveScanScreen extends StatefulWidget {
  const AdminLiveScanScreen({super.key});

  @override
  State<AdminLiveScanScreen> createState() => _AdminLiveScanScreenState();
}

class _AdminLiveScanScreenState extends State<AdminLiveScanScreen> {
  void _editStatusDialog(AttendanceModel item) {
    String selectedStatus = item.status;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Ubah Status: ${item.nama}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Kelas: ${item.kelas ?? "-"} • Jam Tap: ${DateFormatter.formatTime(item.createdAt)}'),
              const SizedBox(height: 16),
              const Text('Pilih Status Kehadiran Baru:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alfa'].map((status) {
                  final isSelected = selectedStatus == status;
                  return ChoiceChip(
                    label: Text(status),
                    selected: isSelected,
                    onSelected: (val) {
                      if (val) setDialogState(() => selectedStatus = status);
                    },
                  );
                }).toList(),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Batal'),
            ),
            ElevatedButton(
              onPressed: () async {
                final adminUser = context.read<AuthProvider>().currentUser;
                await AttendanceService.updateStatus(
                  id: item.id,
                  newStatus: selectedStatus,
                  updatedBy: adminUser?.nama ?? 'Admin',
                  namaTarget: item.nama,
                  statusLama: item.status,
                );
                if (mounted) Navigator.pop(ctx);
              },
              child: const Text('Simpan'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Live Scanner Tap RFID'),
        actions: [
          IconButton(
            tooltip: 'Kelola 2 Perangkat Siswa',
            icon: const Icon(Icons.phonelink_setup_rounded),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AdminDeviceScreen()),
              );
            },
          ),
          IconButton(
            tooltip: 'Profil Admin',
            icon: const Icon(Icons.account_circle_outlined),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
          ),
        ],
      ),
      body: StreamBuilder<List<Map<String, dynamic>>>(
        stream: AttendanceService.streamLiveScanner(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final data = snapshot.data ?? [];
          final items = data.map((json) => AttendanceModel.fromJson(json)).toList();

          return Column(
            children: [
              // Header Status Realtime
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: AppColors.secondary,
                        shape: BoxShape.circle,
                      ),
                    ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                          begin: const Offset(1, 1),
                          end: const Offset(1.6, 1.6),
                          duration: 800.ms,
                        ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'RADAR RFID AKTIF (REALTIME)',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryDark,
                            ),
                          ),
                          Text(
                            'Sinkron langsung saat kartu di-tap pada mesin RFID gerbang',
                            style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${items.length} Masuk',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryLight),
                    ),
                  ],
                ),
              ),

              // Daftar Tap Kartu Realtime
              Expanded(
                child: items.isEmpty
                    ? const Center(
                        child: Text('Belum ada kartu di-tap hari ini.', style: TextStyle(color: AppColors.textMuted)),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, idx) {
                          final item = items[idx];
                          return InkWell(
                            onTap: () => _editStatusDialog(item),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: item.isHadir
                                        ? AppColors.statusHadirBg
                                        : AppColors.statusTelatBg,
                                    child: Icon(
                                      item.isHadir ? Icons.check : Icons.access_time,
                                      color: item.isHadir ? AppColors.statusHadirText : AppColors.statusTelatText,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.nama,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Kelas: ${item.kelas ?? "-"} • UID: ${item.rfidUid ?? "-"}',
                                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: item.isHadir ? AppColors.statusHadirBg : AppColors.statusTelatBg,
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          item.status,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: item.isHadir ? AppColors.statusHadirText : AppColors.statusTelatText,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        DateFormatter.formatTime(item.createdAt),
                                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.1, end: 0);
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
