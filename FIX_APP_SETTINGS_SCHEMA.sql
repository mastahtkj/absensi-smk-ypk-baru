-- ==============================================================================
-- 🚀 SUPABASE SQL MIGRATION: FIX APP_SETTINGS SCHEMA & POSTGREST CACHE
-- Mengatasi Error: "Could not find the 'school_banner_url' column of 'app_settings' in the schema cache"
-- ==============================================================================

-- 1. Pastikan tabel app_settings sudah ada
CREATE TABLE IF NOT EXISTS public.app_settings (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'school_config',
    school_name VARCHAR(255) DEFAULT 'SMK YPK MEDAN',
    school_tagline VARCHAR(255) DEFAULT 'Aplikasi Sekolah Digital Terpadu',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tambahkan semua kolom yang diperlukan jika belum ada
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS school_name VARCHAR(255) DEFAULT 'SMK YPK MEDAN',
  ADD COLUMN IF NOT EXISTS school_tagline VARCHAR(255) DEFAULT 'Aplikasi Sekolah Digital Terpadu',
  ADD COLUMN IF NOT EXISTS school_address TEXT DEFAULT 'Jl. Sakti Lubis Gg. Amal No. 25 & Gg. Pegawai No. 8, Medan',
  ADD COLUMN IF NOT EXISTS school_logo_url TEXT DEFAULT '/logo.png',
  ADD COLUMN IF NOT EXISTS school_banner_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS school_contact_phone VARCHAR(50) DEFAULT '0812-6000-0000',
  ADD COLUMN IF NOT EXISTS running_text TEXT DEFAULT 'Selamat datang di Aplikasi Sekolah Digital Terpadu SMK YPK Medan • Disiplin, Cerdas, Berkarakter & Berdaya Saing Global! ⭐',
  ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(50) DEFAULT 'royal_blue',
  ADD COLUMN IF NOT EXISTS theme_primary_color VARCHAR(50) DEFAULT '#1e40af',
  ADD COLUMN IF NOT EXISTS theme_accent_color VARCHAR(50) DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS dark_mode_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS entry_time VARCHAR(10) DEFAULT '07:15',
  ADD COLUMN IF NOT EXISTS late_threshold_time VARCHAR(10) DEFAULT '07:30',
  ADD COLUMN IF NOT EXISTS departure_time VARCHAR(10) DEFAULT '14:30',
  ADD COLUMN IF NOT EXISTS friday_departure_time VARCHAR(10) DEFAULT '11:35',
  ADD COLUMN IF NOT EXISTS school_latitude DOUBLE PRECISION DEFAULT 3.55832,
  ADD COLUMN IF NOT EXISTS school_longitude DOUBLE PRECISION DEFAULT 98.69421,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters DOUBLE PRECISION DEFAULT 200.0,
  ADD COLUMN IF NOT EXISTS feature_cbt_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_inval_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_library_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_mading_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_audio_bell_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_chat_all_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS teacher_slides JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS home_banners JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS school_agenda JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS school_news JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS teacher_deleted_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS max_student_devices INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100) DEFAULT 'Admin Master',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Pastikan baris konfigurasi default 'school_config' ada
INSERT INTO public.app_settings (id, school_name, school_tagline)
VALUES ('school_config', 'SMK YPK MEDAN', 'Aplikasi Sekolah Digital Terpadu')
ON CONFLICT (id) DO NOTHING;

-- 4. Pastikan RLS diaktifkan & diberikan akses penuh
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Enable all access for app_settings" ON public.app_settings;
CREATE POLICY "Enable all access for app_settings"
ON public.app_settings FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 5. Aktifkan Realtime Replication untuk sinkronisasi antar HP & Web
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'app_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
    END IF;
END $$;

-- 6. Muat ulang schema cache PostgREST agar kolom baru langsung dikenali oleh Supabase API
NOTIFY pgrst, 'reload schema';
