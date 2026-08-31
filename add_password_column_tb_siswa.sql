-- ==============================================================================
-- 🔐 TAMBAH KOLOM PASSWORD KE TABEL tb_siswa (JIKA BELUM ADA DI SUPABASE)
-- ==============================================================================
-- Jalankan query ini di menu 'SQL Editor' pada dashboard Supabase
-- agar kolom password tersinkronisasi di database schema cache.

ALTER TABLE public.tb_siswa
ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'siswa123';
