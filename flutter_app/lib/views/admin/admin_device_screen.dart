import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/date_formatter.dart';
import '../../models/device_model.dart';
import '../../models/user_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/attendance_service.dart';
import '../../services/supabase_service.dart';

class AdminDeviceScreen extends StatefulWidget {
  const AdminDeviceScreen({super.key});

  @override
  State<AdminDeviceScreen> createState() => _AdminDeviceScreenState();
}

class _AdminDeviceScreenState extends State<AdminDeviceScreen> {
  final _searchController = TextEditingController();
  List<UserModel> _allStudents = [];
  List<UserModel> _filteredStudents = [];
  UserModel? _selectedStudent;
  List<DeviceModel> _devices = [];
  bool _isLoading = true;
  bool _isLoadingDevices = false;

  @override
  void initState() {
    super.initState();
    _loadStudents();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadStudents() async {
    setState(() => _isLoading = true);
    try {
      final List<dynamic> data = await SupabaseService.client
          .from('tb_siswa')
          .select('*')
          .order('nama_siswa', ascending: true);

      final students = data.map((json) => UserModel.fromJson(json)).toList();
      if (mounted) {
        setState(() {
          _allStudents = students;
          _filteredStudents = students;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _filterSearch(String query) {
    if (query.trim().isEmpty) {
      setState(() => _filteredStudents = _allStudents);
    } else {
      final q = query.toLowerCase().trim();
      setState(() {
        _filteredStudents = _allStudents.where((s) {
          return s.nama.toLowerCase().contains(q) ||
              s.uidRfid.toLowerCase().contains(q) ||
              (s.kelas ?? '').toLowerCase().contains(q);
        }).toList();
      });
    }
  }

  Future<void> _selectStudent(UserModel student) async {
    setState(() {
      _selectedStudent = student;
      _isLoadingDevices = true;
    });

    final devices = await AttendanceService.getStudentDevices(student.id);

    if (mounted) {
      setState(() {
        _devices = devices;
        _isLoadingDevices = false;
      });
    }
  }

  Future<void> _resetDevices() async {
    if (_selectedStudent == null) return;

    final adminUser = context.read<AuthProvider>().currentUser;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Reset Perangkat'),
        content: Text('Apakah Anda yakin ingin mereset seluruh perangkat terdaftar untuk ${_selectedStudent!.nama}? Siswa akan dapat login di HP baru (0/2).'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Reset Sekarang'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final success = await AttendanceService.resetStudentDevices(
      _selectedStudent!.id,
      adminUser?.nama ?? 'Admin',
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Seluruh perangkat berhasil direset (0/2).'),
          backgroundColor: AppColors.secondary,
        ),
      );
      _selectStudent(_selectedStudent!);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Gagal mereset perangkat siswa.'),
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
        title: const Text('Kelola 2 Perangkat Siswa'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Kolom Pencarian Siswa
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _filterSearch,
                    decoration: const InputDecoration(
                      hintText: 'Cari Nama Siswa / Kelas / UID...',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                ),

                // Detail Siswa Terpilih & Daftar HP
                if (_selectedStudent != null) ...[
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _selectedStudent!.nama,
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                  ),
                                  Text(
                                    'Kelas: ${_selectedStudent!.kelas ?? "-"} • RFID: ${_selectedStudent!.uidRfid}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: _resetDevices,
                              icon: const Icon(Icons.restart_alt_rounded, size: 18),
                              label: const Text('Reset (0/2)'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.danger,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                minimumSize: const Size(0, 36),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Divider(height: 1),
                        const SizedBox(height: 10),
                        const Text(
                          'Perangkat Terdaftar Saat Ini:',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 6),
                        if (_isLoadingDevices)
                          const Padding(
                            padding: EdgeInsets.all(8),
                            child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                          )
                        else if (_devices.isEmpty)
                          const Text('Belum ada perangkat terdaftar (0/2 slot digunakan).', style: TextStyle(fontSize: 11, color: AppColors.textMuted))
                        else
                          Column(
                            children: _devices.map((d) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  children: [
                                    const Icon(Icons.phone_android_rounded, size: 18, color: AppColors.primaryLight),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        d.deviceName,
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                      ),
                                    ),
                                    Text(
                                      DateFormatter.formatShortDate(d.lastLogin),
                                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // List Siswa
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: _filteredStudents.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, idx) {
                      final s = _filteredStudents[idx];
                      final isSelected = _selectedStudent?.id == s.id;

                      return ListTile(
                        tileColor: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: isSelected ? AppColors.primaryLight : AppColors.border),
                        ),
                        leading: CircleAvatar(
                          backgroundColor: AppColors.primary.withOpacity(0.1),
                          child: Text(
                            s.nama.isNotEmpty ? s.nama[0].toUpperCase() : 'S',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ),
                        title: Text(
                          s.nama,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          'Kelas: ${s.kelas ?? "-"} • RFID: ${s.uidRfid}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                        trailing: const Icon(Icons.chevron_right, size: 20, color: AppColors.textMuted),
                        onTap: () => _selectStudent(s),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
