import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../models/inval_model.dart';
import '../../services/news_service.dart';

class TeacherInvalScreen extends StatefulWidget {
  const TeacherInvalScreen({super.key});

  @override
  State<TeacherInvalScreen> createState() => _TeacherInvalScreenState();
}

class _TeacherInvalScreenState extends State<TeacherInvalScreen> {
  List<InvalModel> _invalList = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final list = await NewsService.getInvalSchedule();
    if (mounted) {
      setState(() {
        _invalList = list;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Penugasan Guru Inval'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _invalList.isEmpty
                ? const Center(
                    child: Text('Belum ada penugasan guru pengganti.', style: TextStyle(color: AppColors.textMuted)),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _invalList.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, idx) {
                      final item = _invalList[idx];
                      return Container(
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
                                Text(
                                  item.kelas,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFDCFCE7),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    item.statusInval ?? 'Ditugaskan',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF15803D),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '👨‍🏫 Guru Utama: ${item.namaGuruUtama}',
                              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '🔄 Guru Pengganti: ${item.namaGuruInval}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primaryLight,
                              ),
                            ),
                            if (item.mapel != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                '📚 Mapel: ${item.mapel} (${item.jamKe ?? "-"})',
                                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                              ),
                            ],
                            if (item.materiNama != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                '📝 Materi: ${item.materiNama}',
                                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
