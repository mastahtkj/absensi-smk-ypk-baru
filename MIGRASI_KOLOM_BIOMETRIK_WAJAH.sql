-- ==============================================================================
-- 🏛️ SKRIP MIGRASI BIOMETRIK WAJAH RESMI SMK YPK MEDAN (SUPABASE CLOUD)
-- Project ID: wpyfwkcevgdhkazeesdq
-- Tujuan: Menjamin Penyimpanan 128-D Face Descriptor Permanen Anti-Hilang
-- ==============================================================================
-- PETUNJUK MENJALANKAN:
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard/project/wpyfwkcevgdhkazeesdq
-- 2. Klik menu "SQL Editor" di bilah menu sebelah kiri (ikon terminal/kueri)
-- 3. Klik tombol "+ New query" di kanan atas
-- 4. Salin (Copy) dan Tempel (Paste) SELURUH isi skrip di bawah ini ke editor
-- 5. Klik tombol "RUN" (Hijau) di pojok kanan bawah editor
-- 6. Selesai! Pesan "Success. No rows returned" akan muncul menandakan database siap 100%.
-- ==============================================================================

-- 1. PASTIKAN KOLOM BIOMETRIK WAJAH & BIODATA TERSEDIA DI TABEL SISWA (tb_siswa)
ALTER TABLE IF EXISTS public.tb_siswa 
  ADD COLUMN IF NOT EXISTS face_descriptor JSONB,
  ADD COLUMN IF NOT EXISTS biodata JSONB DEFAULT '{}'::jsonb;

-- 2. PASTIKAN KOLOM BIOMETRIK WAJAH & BIODATA TERSEDIA DI TABEL GURU (tb_guru)
ALTER TABLE IF EXISTS public.tb_guru 
  ADD COLUMN IF NOT EXISTS face_descriptor JSONB,
  ADD COLUMN IF NOT EXISTS biodata JSONB DEFAULT '{}'::jsonb;

-- 3. PASTIKAN TABEL PRESENSI (absensi) MEMILIKI KOLOM METODE WAJAH
ALTER TABLE IF EXISTS public.absensi 
  ADD COLUMN IF NOT EXISTS metode VARCHAR(50) DEFAULT 'Wajah AI',
  ADD COLUMN IF NOT EXISTS device_info TEXT;

-- 4. BUKA HAK AKSES RLS (ROW LEVEL SECURITY) AGAR BROWSER DAPAT MENYIMPAN BIOMETRIK
-- Mengizinkan pembacaan data publik
ALTER TABLE public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;

-- Policy untuk tb_siswa
DROP POLICY IF EXISTS "Allow public read tb_siswa" ON public.tb_siswa;
CREATE POLICY "Allow public read tb_siswa" ON public.tb_siswa FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update tb_siswa" ON public.tb_siswa;
CREATE POLICY "Allow public update tb_siswa" ON public.tb_siswa FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert tb_siswa" ON public.tb_siswa;
CREATE POLICY "Allow public insert tb_siswa" ON public.tb_siswa FOR INSERT WITH CHECK (true);

-- Policy untuk tb_guru
DROP POLICY IF EXISTS "Allow public read tb_guru" ON public.tb_guru;
CREATE POLICY "Allow public read tb_guru" ON public.tb_guru FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update tb_guru" ON public.tb_guru;
CREATE POLICY "Allow public update tb_guru" ON public.tb_guru FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert tb_guru" ON public.tb_guru;
CREATE POLICY "Allow public insert tb_guru" ON public.tb_guru FOR INSERT WITH CHECK (true);

-- Policy untuk absensi
DROP POLICY IF EXISTS "Allow public read absensi" ON public.absensi;
CREATE POLICY "Allow public read absensi" ON public.absensi FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert absensi" ON public.absensi;
CREATE POLICY "Allow public insert absensi" ON public.absensi FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update absensi" ON public.absensi;
CREATE POLICY "Allow public update absensi" ON public.absensi FOR UPDATE USING (true) WITH CHECK (true);

-- 5. AKTIFKAN SUPABASE REALTIME REPLICATION UNTUK AUTO-SYNC MULTI-PERANGKAT (HP & PC)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tb_siswa'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_siswa;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tb_guru'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_guru;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'absensi'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.absensi;
  END IF;
END $$;

-- Verifikasi akhir
SELECT 'Sistem Database Biometrik Wajah SMK YPK Medan Berhasil Dimigrasi 100%!' as status;
