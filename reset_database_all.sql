-- ==============================================================================
-- 🗑️ SQL SCRIPT: KOSONGKAN & RESET SELURUH DATA SUPABASE UNTUK PENDAFTARAN BARU
-- PROYEK: Absensi SMK YPK Medan (ID: wpyfwkcevgdhkazeesdq)
-- ==============================================================================
-- PETUNJUK PENGGUNAAN:
-- 1. Buka browser: https://supabase.com/dashboard/project/wpyfwkcevgdhkazeesdq
-- 2. Di bilah samping kiri, klik ikon "SQL Editor"
-- 3. Klik "+ New query"
-- 4. Salin seluruh isi teks file ini, tempelkan ke SQL Editor
-- 5. Klik tombol "Run" (Warna Hijau) di pojok kanan bawah editor
-- ==============================================================================

-- 1. Pastikan kolom username, password, biodata, foto_url tersedia di tb_siswa & tb_guru
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'siswa123';
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS biodata JSONB;
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS telepon VARCHAR(50);
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS nisn VARCHAR(50);

ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'guru123';
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS biodata JSONB;
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS telepon VARCHAR(50);
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS mapel VARCHAR(100);
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS inisial VARCHAR(10);
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS nip VARCHAR(50);

-- 2. Hapus riwayat log presensi dan scan scanner RFID/AI lama
TRUNCATE TABLE public.absensi CASCADE;
TRUNCATE TABLE public.latest_scan CASCADE;
TRUNCATE TABLE public.audit_log_presensi CASCADE;

-- 3. Hapus seluruh data siswa & guru lama dan reset nomor urut ID
TRUNCATE TABLE public.tb_siswa RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tb_guru RESTART IDENTITY CASCADE;

-- ==============================================================================
-- 🟢 SELESAI! Seluruh tabel kini bersih dan siap menerima pendaftaran akun baru
-- dengan Username, Kata Sandi, dan Biometrik Wajah AI dari formulir aplikasi.
-- ==============================================================================
