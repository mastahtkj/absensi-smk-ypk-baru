-- =========================================================================
-- 🧹 SKRIP SUPABASE: BERSIHKAN SEMUA DATA SISWA & GURU (KECUALI MASTER IQBAL)
-- SMK YPK MEDAN - PRESENSI WAJAH & DIGITALISASI SEKOLAH
-- =========================================================================
-- Jalankan skrip ini langsung di Supabase SQL Editor.

-- 1. Kosongkan seluruh log presensi, aktivitas, dan perangkat login siswa
TRUNCATE TABLE public.absensi RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.audit_log_presensi RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.latest_scan RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tb_siswa_devices RESTART IDENTITY CASCADE;

-- 2. Kosongkan seluruh data siswa di public.tb_siswa
TRUNCATE TABLE public.tb_siswa RESTART IDENTITY CASCADE;

-- 3. Hapus seluruh akun guru di public.tb_guru KECUALI Admin Master Muhammad Iqbal Rangkuti
DELETE FROM public.tb_guru 
WHERE LOWER(COALESCE(username, '')) NOT IN ('iqbal', 'admin') 
  AND LOWER(COALESCE(nama_guru, '')) NOT LIKE '%iqbal%'
  AND id_guru != 29;

-- 4. Pastikan Akun Admin Master Muhammad Iqbal Rangkuti tetap ada, utuh, dan aktif
INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, role, foto_url, biodata)
VALUES (
  29,
  'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
  'iqbal',
  '301020',
  'IR',
  'Teknik Jaringan Komputer & Telekomunikasi (TJKT)',
  'admin',
  '/logo.png',
  '{"role": "admin", "username": "iqbal", "nama": "MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.", "inisial": "IR"}'::jsonb
)
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
  username = 'iqbal',
  password = '301020',
  role = 'admin',
  inisial = 'IR';

-- 5. Periksa hasil pembersihan
SELECT 'tb_siswa (Harus 0)' AS tabel, COUNT(*) AS jumlah_data FROM public.tb_siswa
UNION ALL
SELECT 'tb_guru (Hanya Master Iqbal)', COUNT(*) FROM public.tb_guru
UNION ALL
SELECT 'absensi (Harus 0)', COUNT(*) FROM public.absensi;
