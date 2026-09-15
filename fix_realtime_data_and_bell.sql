-- ==============================================================================
-- 🛠️ SKRIP MIGRASI SUPABASE: SINKRONISASI REALTIME SELURUH DATA & PERIZINAN
-- SMK YPK MEDAN (Presensi & Direktori Digital KBM)
-- ==============================================================================

-- 1. PASTIKAN SELURUH KOLOM PENTING PADA TABEL SISWA (tb_siswa) ADA
ALTER TABLE IF EXISTS public.tb_siswa 
  ADD COLUMN IF NOT EXISTS nama_siswa TEXT,
  ADD COLUMN IF NOT EXISTS kelas TEXT,
  ADD COLUMN IF NOT EXISTS jurusan TEXT,
  ADD COLUMN IF NOT EXISTS uid_rfid TEXT,
  ADD COLUMN IF NOT EXISTS rfid_uid TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Siswa',
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS biodata JSONB,
  ADD COLUMN IF NOT EXISTS telepon TEXT,
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS nisn TEXT;

-- Indexing untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_tb_siswa_uid ON public.tb_siswa(uid_rfid);
CREATE INDEX IF NOT EXISTS idx_tb_siswa_kelas ON public.tb_siswa(kelas);
CREATE INDEX IF NOT EXISTS idx_tb_siswa_nama ON public.tb_siswa(nama_siswa);

-- 2. PASTIKAN SELURUH KOLOM PENTING PADA TABEL GURU (tb_guru) ADA
ALTER TABLE IF EXISTS public.tb_guru 
  ADD COLUMN IF NOT EXISTS nama_guru TEXT,
  ADD COLUMN IF NOT EXISTS inisial TEXT,
  ADD COLUMN IF NOT EXISTS mapel TEXT,
  ADD COLUMN IF NOT EXISTS uid_rfid TEXT,
  ADD COLUMN IF NOT EXISTS rfid_uid TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Guru',
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS biodata JSONB,
  ADD COLUMN IF NOT EXISTS telepon TEXT,
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS nip TEXT,
  ADD COLUMN IF NOT EXISTS nuptk TEXT;

-- Indexing untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_tb_guru_uid ON public.tb_guru(uid_rfid);
CREATE INDEX IF NOT EXISTS idx_tb_guru_nama ON public.tb_guru(nama_guru);

-- 3. PASTIKAN TABEL absensi & tb_berita & app_settings MEMILIKI RLS PERMISSIVE
ALTER TABLE IF EXISTS public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tb_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tb_berita ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings ENABLE ROW LEVEL SECURITY;

-- Buat kebijakan akses terbuka untuk tb_siswa
DROP POLICY IF EXISTS "Akses Penuh Siswa Realtime" ON public.tb_siswa;
CREATE POLICY "Akses Penuh Siswa Realtime" 
ON public.tb_siswa 
FOR ALL 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);

-- Buat kebijakan akses terbuka untuk tb_guru
DROP POLICY IF EXISTS "Akses Penuh Guru Realtime" ON public.tb_guru;
CREATE POLICY "Akses Penuh Guru Realtime" 
ON public.tb_guru 
FOR ALL 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);

-- Buat kebijakan akses terbuka untuk absensi
DROP POLICY IF EXISTS "Akses Penuh Absensi Realtime" ON public.absensi;
CREATE POLICY "Akses Penuh Absensi Realtime" 
ON public.absensi 
FOR ALL 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);

-- 4. DAFTARKAN SEMUA TABEL KE REPLIKASI REALTIME SUPABASE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_siswa;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_guru;
ALTER PUBLICATION supabase_realtime ADD TABLE public.absensi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_berita;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_inval_guru;

-- 5. REPLICA IDENTITY FULL AGAR PAYLOAD OLD/NEW TERKIRIM LENGKAP SAAT UPDATE/DELETE
ALTER TABLE public.tb_siswa REPLICA IDENTITY FULL;
ALTER TABLE public.tb_guru REPLICA IDENTITY FULL;
ALTER TABLE public.absensi REPLICA IDENTITY FULL;
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;
ALTER TABLE public.tb_berita REPLICA IDENTITY FULL;

SELECT 'Migrasi realtime dan perizinan data SMK YPK berhasil dijalankan!' AS status;
