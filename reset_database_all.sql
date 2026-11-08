-- ==============================================================================
-- 🗑️ SQL SCRIPT RESMI: RESET & SINKRONISASI DATABASE SUPABASE SMK YPK MEDAN
-- Project ID: wpyfwkcevgdhkazeesdq (Absensi SMK YPK)
-- ==============================================================================
-- PETUNJUK PENGGUNAAN:
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard/project/wpyfwkcevgdhkazeesdq
-- 2. Di bilah menu sebelah kiri, klik "SQL Editor"
-- 3. Klik tombol "+ New query"
-- 4. Hapus tulisan yang ada, lalu salin & tempelkan seluruh isi file ini
-- 5. Klik tombol "Run" (Warna Hijau) di pojok kanan bawah
-- ==============================================================================

-- 1. PASTIKAN STRUKTUR KOLOM TABEL tb_siswa SESUAI PERSIS DENGAN FORMULIR PENDAFTARAN
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'siswa123';
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS kelas VARCHAR(50);
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS jurusan VARCHAR(50);
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS nisn VARCHAR(50);
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS telepon VARCHAR(50);
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS telepon_ortu VARCHAR(50);
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS biodata JSONB;
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Siswa';
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS uid_rfid VARCHAR(100);

-- 2. PASTIKAN STRUKTUR KOLOM TABEL tb_guru SESUAI DENGAN FORMULIR GURU
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'guru123';
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS inisial VARCHAR(10);
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS mapel VARCHAR(100);
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS nip VARCHAR(50);
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS telepon VARCHAR(50);
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS biodata JSONB;
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Guru';
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS uid_rfid VARCHAR(100);

-- 3. BERSIHKAN / KOSONGKAN DATA LAMA
TRUNCATE TABLE public.absensi CASCADE;
TRUNCATE TABLE public.latest_scan CASCADE;
TRUNCATE TABLE public.audit_log_presensi CASCADE;
TRUNCATE TABLE public.tb_siswa RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tb_guru RESTART IDENTITY CASCADE;

-- 4. KUNCI AKSES KEBIJAKAN (RLS POLICIES) AGAR APLIKASI WEB & HP DAPAT TERHUBUNG TANPA BLOKIR
ALTER TABLE public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.latest_scan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for tb_siswa" ON public.tb_siswa;
CREATE POLICY "Enable all access for tb_siswa" ON public.tb_siswa FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for tb_guru" ON public.tb_guru;
CREATE POLICY "Enable all access for tb_guru" ON public.tb_guru FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for absensi" ON public.absensi;
CREATE POLICY "Enable all access for absensi" ON public.absensi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for latest_scan" ON public.latest_scan;
CREATE POLICY "Enable all access for latest_scan" ON public.latest_scan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. DAFTARKAN KEMBALI AKUN MASTER ADMIN UTAMA (BAPAK MUHAMMAD IQBAL)
-- Username: iqbal | Password: 301020
INSERT INTO public.tb_guru (
  id_guru,
  username,
  password,
  nama_guru,
  inisial,
  mapel,
  role,
  uid_rfid,
  biodata
)
VALUES (
  29,
  'iqbal',
  '301020',
  'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
  'IR',
  'Teknik Jaringan Komputer & Telekomunikasi (TJKT)',
  'Admin',
  '92006F96',
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
-- 🟢 BERHASIL: Database Supabase telah bersih, struktur kolom siap 100%,
-- Izin akses publik aktif, dan Akun Master Iqbal siap digunakan untuk login.
-- ==============================================================================
