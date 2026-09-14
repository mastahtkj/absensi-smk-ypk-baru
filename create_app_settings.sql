-- ==============================================================================
-- 🚀 SUPABASE SQL MIGRATION: TABEL KONFIGURASI DINAMIS & TAMPILAN SEKOLAH (SMK YPK)
-- Sinkronisasi 100% Real-Time Antara Website Desktop & HP (Mobile / PWA)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'school_config',
    
    -- 🏫 Profil & Branding Sekolah
    school_name VARCHAR(255) DEFAULT 'SMK YPK MEDAN',
    school_tagline VARCHAR(255) DEFAULT 'Aplikasi Sekolah Digital Terpadu',
    school_address TEXT DEFAULT 'Jl. Sakti Lubis Gg. Amal No. 25 & Gg. Pegawai No. 8, Medan',
    school_logo_url TEXT DEFAULT '/logo.png',
    school_banner_url TEXT DEFAULT '',
    school_contact_phone VARCHAR(50) DEFAULT '0812-6000-0000',
    running_text TEXT DEFAULT 'Selamat datang di Aplikasi Sekolah Digital Terpadu SMK YPK Medan • Disiplin, Cerdas, Berkarakter & Berdaya Saing Global! ⭐',
    
    -- 🎨 Tema & Warna Tampilan (Website & HP)
    theme_preset VARCHAR(50) DEFAULT 'royal_blue',
    theme_primary_color VARCHAR(50) DEFAULT '#1e40af',
    theme_accent_color VARCHAR(50) DEFAULT '#3b82f6',
    dark_mode_enabled BOOLEAN DEFAULT false,
    
    -- ⏰ Jam Operasional & Aturan Presensi
    entry_time VARCHAR(10) DEFAULT '07:15',
    late_threshold_time VARCHAR(10) DEFAULT '07:30',
    departure_time VARCHAR(10) DEFAULT '14:30',
    friday_departure_time VARCHAR(10) DEFAULT '11:35',
    
    -- 📍 Titik Koordinat GPS & Radius Geofencing (Presensi HP Siswa/Guru)
    school_latitude DOUBLE PRECISION DEFAULT 3.55832,
    school_longitude DOUBLE PRECISION DEFAULT 98.69421,
    geofence_radius_meters DOUBLE PRECISION DEFAULT 200.0,
    
    -- 🧩 Saklar Fitur (On / Off Modul Sekolah)
    feature_cbt_active BOOLEAN DEFAULT true,
    feature_inval_active BOOLEAN DEFAULT true,
    feature_library_active BOOLEAN DEFAULT true,
    feature_mading_active BOOLEAN DEFAULT true,
    feature_audio_bell_active BOOLEAN DEFAULT true,
    feature_chat_all_active BOOLEAN DEFAULT true,
    
    -- 📸 5 Slide Foto & Profil Dewan Guru Beranda
    teacher_slides JSONB DEFAULT '[]'::jsonb,
    
    -- 📱 Keamanan & Batas Perangkat Siswa
    max_student_devices INT DEFAULT 2,
    
    -- ⏱️ Metadata Audit
    updated_by VARCHAR(100) DEFAULT 'Admin Master',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom teacher_slides ada jika tabel sudah pernah dibuat sebelumnya
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS teacher_slides JSONB DEFAULT '[]'::jsonb;

-- Masukkan data konfigurasi default jika belum ada
INSERT INTO public.app_settings (
    id, school_name, school_tagline, school_address, school_logo_url, 
    theme_preset, theme_primary_color, theme_accent_color,
    entry_time, late_threshold_time, departure_time, friday_departure_time,
    school_latitude, school_longitude, geofence_radius_meters,
    feature_cbt_active, feature_inval_active, feature_library_active, feature_mading_active, feature_audio_bell_active,
    max_student_devices, updated_by
) VALUES (
    'school_config', 'SMK YPK MEDAN', 'Aplikasi Sekolah Digital Terpadu', 'Jl. Sakti Lubis Gg. Amal No. 25 & Gg. Pegawai No. 8, Medan', '/logo.png',
    'royal_blue', '#1e40af', '#3b82f6',
    '07:15', '07:30', '14:30', '11:35',
    3.55832, 98.69421, 200.0,
    true, true, true, true, true,
    2, 'Admin Master'
) ON CONFLICT (id) DO NOTHING;

-- Kebijakan Keamanan RLS (Row Level Security)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
CREATE POLICY "Allow all access to app_settings"
ON public.app_settings FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- Aktifkan Realtime Replication untuk app_settings agar perubahan di Web/HP langsung sinkron seketika
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
