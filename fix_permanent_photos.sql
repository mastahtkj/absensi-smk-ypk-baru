-- ==============================================================================
-- 🚀 SKRIP SQL SUPABASE: PENYIMPANAN PERMANEN & REALTIME FOTO PROFIL, MADING & SLIDE
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda (sekali saja)
-- ==============================================================================

-- 1. FOTO PROFIL: Tambah kolom foto_url & foto_updated_at pada tabel tb_siswa dan tb_guru
ALTER TABLE public.tb_siswa 
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS foto_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS biodata JSONB;

ALTER TABLE public.tb_guru 
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS foto_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS biodata JSONB;

-- 2. MADING: Pastikan tabel tb_berita memiliki kolom gambar_url dan struktur lengkap
CREATE TABLE IF NOT EXISTS public.tb_berita (
    id VARCHAR(100) PRIMARY KEY,
    judul TEXT NOT NULL,
    kategori VARCHAR(100) DEFAULT 'Penting',
    ringkasan TEXT,
    konten TEXT,
    gambar_url TEXT,
    penulis VARCHAR(255) DEFAULT 'SMK YPK MEDAN',
    tanggal VARCHAR(100),
    target_audience VARCHAR(100) DEFAULT 'Semua',
    badge_color VARCHAR(50) DEFAULT '#2563eb',
    send_notification BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom gambar_url ada jika tb_berita sudah pernah dibuat sebelumnya
ALTER TABLE public.tb_berita 
ADD COLUMN IF NOT EXISTS gambar_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. SLIDE & AGENDA: Pastikan tabel app_settings memiliki kolom slide dan agenda
CREATE TABLE IF NOT EXISTS public.app_settings (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'school_config',
    school_name VARCHAR(255) DEFAULT 'SMK YPK MEDAN',
    school_tagline VARCHAR(255) DEFAULT 'Aplikasi Sekolah Digital Terpadu',
    school_address TEXT DEFAULT 'Jl. Sakti Lubis Gg. Amal No. 25 & Gg. Pegawai No. 8, Medan',
    school_logo_url TEXT DEFAULT '/logo.png',
    school_banner_url TEXT DEFAULT '',
    running_text TEXT DEFAULT 'Selamat datang di Aplikasi Sekolah Digital Terpadu SMK YPK Medan • Disiplin, Cerdas, Berkarakter & Berdaya Saing Global! ⭐',
    theme_preset VARCHAR(50) DEFAULT 'royal_blue',
    theme_primary_color VARCHAR(50) DEFAULT '#1e40af',
    theme_accent_color VARCHAR(50) DEFAULT '#3b82f6',
    teacher_slides JSONB DEFAULT '[]'::jsonb,
    home_banners JSONB DEFAULT '[]'::jsonb,
    school_agenda JSONB DEFAULT '[]'::jsonb,
    updated_by VARCHAR(100) DEFAULT 'Admin Master',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS teacher_slides JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS home_banners JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS school_agenda JSONB DEFAULT '[]'::jsonb;

-- 4. KEBIJAKAN ROW LEVEL SECURITY (RLS) AGAR TIDAK DITOLAK SAAT MENYIMPAN FOTO
ALTER TABLE public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_berita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access for tb_siswa" ON public.tb_siswa;
DROP POLICY IF EXISTS "Enable all access for tb_siswa" ON public.tb_siswa;
CREATE POLICY "Enable all access for tb_siswa" ON public.tb_siswa FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for tb_guru" ON public.tb_guru;
DROP POLICY IF EXISTS "Enable all access for tb_guru" ON public.tb_guru;
CREATE POLICY "Enable all access for tb_guru" ON public.tb_guru FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for tb_berita" ON public.tb_berita;
DROP POLICY IF EXISTS "Enable all access for tb_berita" ON public.tb_berita;
CREATE POLICY "Enable all access for tb_berita" ON public.tb_berita FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Enable all access for app_settings" ON public.app_settings;
CREATE POLICY "Enable all access for app_settings" ON public.app_settings FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- 5. AKTIFKAN REPLIKASI REALTIME SUPABASE UNTUK SELURUH TABEL INI
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tb_siswa') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_siswa;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tb_guru') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_guru;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tb_berita') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_berita;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_settings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
    END IF;
END $$;
