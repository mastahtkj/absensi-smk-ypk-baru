class SupabaseConfig {
  // URL Proyek Supabase
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://vubetdnbvyvwykffteoc.supabase.co',
  );

  // Anon Key Proyek Supabase (Public Client)
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1YmV0ZG5idnl2d3lrZmZ0ZW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5NTM5MTcsImV4cCI6MjA2MjUyOTkxN30.8Vv8n3aXjY-X6wR_0V7Xo6z_yQ5Z9U8T1-4Q6X7X9Y0',
  );
}
