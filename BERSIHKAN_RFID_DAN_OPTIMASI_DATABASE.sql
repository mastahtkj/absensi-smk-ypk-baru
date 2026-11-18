-- ==============================================================================
-- 🚀 SCRIPT SQL SUPABASE: BERSIHKAN SEMUA UID RFID & OPTIMASI DATABASE ABSENSI WAJAH AI
-- Project ID: wpyfwkcevgdhkazeesdq (Absensi SMK YPK)
-- ==============================================================================
-- CARA PENGGUNAAN (CUKUP 1 MENIT):
-- 1. Buka dashboard Supabase Anda: https://supabase.com/dashboard/project/wpyfwkcevgdhkazeesdq
-- 2. Di menu bilah kiri, klik "SQL Editor" (ikon terminal `>_`)
-- 3. Klik tombol "+ New query" di atas
-- 4. Hapus tulisan yang ada, lalu salin (copy) & tempel (paste) seluruh teks SQL di bawah ini
-- 5. Klik tombol "Run" (warna hijau di pojok kanan bawah)
-- ==============================================================================

-- 1. 🗑️ HAPUS TOTAL SELURUH KOLOM RFID DARI DATABASE
ALTER TABLE IF EXISTS public.tb_siswa DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE IF EXISTS public.tb_guru DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE IF EXISTS public.absensi DROP COLUMN IF EXISTS rfid_uid;
ALTER TABLE IF EXISTS public.absensi DROP COLUMN IF EXISTS uid;
ALTER TABLE IF EXISTS public.tb_siswa_devices DROP COLUMN IF EXISTS uid_rfid;
DROP TABLE IF EXISTS public.latest_scan CASCADE;

-- 3. 🛡️ PASTIKAN STRUKTUR KOLOM TABEL tb_siswa SIAP UNTUK BIOMETRIK WAJAH & AKUN ADMIN
ALTER TABLE public.tb_siswa 
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS biodata JSONB,
  ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'siswa123',
  ADD COLUMN IF NOT EXISTS telepon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS telepon_ortu VARCHAR(50),
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS nisn VARCHAR(50),
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Siswa';

-- 4. 🛡️ PASTIKAN STRUKTUR KOLOM TABEL tb_guru LENGKAP
ALTER TABLE public.tb_guru 
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS biodata JSONB,
  ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'guru123',
  ADD COLUMN IF NOT EXISTS mapel VARCHAR(150),
  ADD COLUMN IF NOT EXISTS inisial VARCHAR(10),
  ADD COLUMN IF NOT EXISTS nip VARCHAR(50),
  ADD COLUMN IF NOT EXISTS telepon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Guru';

-- 5. 🛡️ PASTIKAN TABEL ABSENSI MEMILIKI KOLOM WAKTU, TIPE, DAN BUKTI SCAN WAJAH
ALTER TABLE public.absensi
  ADD COLUMN IF NOT EXISTS tipe VARCHAR(50) DEFAULT 'masuk',
  ADD COLUMN IF NOT EXISTS jam_masuk VARCHAR(50),
  ADD COLUMN IF NOT EXISTS jam_pulang VARCHAR(50),
  ADD COLUMN IF NOT EXISTS foto_scan TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Hadir';

-- 6. 🔓 PASTIKAN KEBIJAKAN KEAMANAN (ROW LEVEL SECURITY / RLS) MENGIZINKAN CHROME HP & DESKTOP
-- Mengatasi masalah Chrome HP beda data atau gagal terhubung ke database
ALTER TABLE public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for tb_siswa" ON public.tb_siswa;
CREATE POLICY "Enable all access for tb_siswa" ON public.tb_siswa FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for tb_guru" ON public.tb_guru;
CREATE POLICY "Enable all access for tb_guru" ON public.tb_guru FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for absensi" ON public.absensi;
CREATE POLICY "Enable all access for absensi" ON public.absensi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. 👑 PASTIKAN AKUN MASTER ADMIN UTAMA (BAPAK MUHAMMAD IQBAL) SELALU TERSEDIA
INSERT INTO public.tb_guru (
  id_guru,
  username,
  password,
  nama_guru,
  inisial,
  mapel,
  role,
  biodata
)
VALUES (
  29,
  'iqbal',
  '301020',
  'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
  'IR',
  'Teknik Jaringan Komputer Dan Telekomunikasi (TJKT)',
  'Admin',
  '{
    "username": "iqbal",
    "password": "301020",
    "role": "Admin",
    "isMaster": true,
    "nama": "MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.",
    "inisial": "IR"
  }'::jsonb
)
ON CONFLICT (id_guru) DO UPDATE SET
  username = 'iqbal',
  password = '301020',
  role = 'Admin';

-- ==============================================================================
-- 🟢 SELESAI: SELURUH UID RFID TELAH BERHASIL DIHAPUS DAN DATABASE SIAP 100% UNTUK
-- TERMINAL ABSENSI WAJAH AI (FACE RECOGNITION TERMINAL)!
-- ==============================================================================
