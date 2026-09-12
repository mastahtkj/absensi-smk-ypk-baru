import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/news_model.dart';
import '../models/inval_model.dart';
import 'supabase_service.dart';

class NewsService {
  static SupabaseClient get _client => SupabaseService.client;

  /// Ambil berita dan pengumuman sekolah (tb_berita)
  static Future<List<NewsModel>> getSchoolNews() async {
    try {
      final List<dynamic> data = await _client
          .from('tb_berita')
          .select('*')
          .order('created_at', ascending: false)
          .limit(10);
      return data.map((json) => NewsModel.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Ambil jadwal guru pengganti / inval (tb_inval_guru)
  static Future<List<InvalModel>> getInvalSchedule() async {
    try {
      final List<dynamic> data = await _client
          .from('tb_inval_guru')
          .select('*')
          .order('tanggal', ascending: false)
          .limit(20);
      return data.map((json) => InvalModel.fromJson(json)).toList();
    } catch (e) {
      return [];
    }
  }
}
