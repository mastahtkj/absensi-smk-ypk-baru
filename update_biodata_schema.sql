-- ==============================================================================
-- 🚀 SKRIP SQL SUPABASE: TAMBAHKAN KOLOM BIODATA DI TB_SISWA & TB_GURU
-- Jalankan di SQL Editor Supabase Dashboard Anda
-- ==============================================================================

-- 1. Tambah kolom biodata JSONB pada tabel tb_siswa
ALTER TABLE public.tb_siswa 
ADD COLUMN IF NOT EXISTS biodata JSONB;

-- 2. Tambah kolom biodata JSONB pada tabel tb_guru
ALTER TABLE public.tb_guru 
ADD COLUMN IF NOT EXISTS biodata JSONB;

-- 3. Pastikan Row Level Security (RLS) mengizinkan SELECT dan UPDATE data
ALTER TABLE public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_guru ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for tb_siswa" ON public.tb_siswa;
CREATE POLICY "Enable all access for tb_siswa" ON public.tb_siswa FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for tb_guru" ON public.tb_guru;
CREATE POLICY "Enable all access for tb_guru" ON public.tb_guru FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
