import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/constants/supabase_config.dart';

class SupabaseService {
  static SupabaseClient get client => Supabase.instance.client;

  /// Inisialisasi SDK Supabase sebelum aplikasi dijalankan
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: SupabaseConfig.supabaseUrl,
      anonKey: SupabaseConfig.supabaseAnonKey,
      realtimeClientOptions: const RealtimeClientOptions(
        eventsPerSecond: 10,
      ),
    );
  }
}
