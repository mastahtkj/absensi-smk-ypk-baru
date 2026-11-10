-- ==============================================================================
-- 🚀 MIGRASI PERMANEN SUPABASE: HAPUS SEMUA KOLOM & TABEL UID RFID
-- SMK YPK MEDAN • FULL FACE RECOGNITION BIOMETRIC SYSTEM
-- ==============================================================================
-- PERHATIAN:
-- Skrip ini menghapus semua kolom UID RFID lama secara permanen dari database
-- Supabase karena sistem kini 100% beralih menggunakan Biometrik Wajah AI.
-- ==============================================================================

-- 1. Hapus kolom uid_rfid dari tabel tb_siswa
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tb_siswa' AND column_name = 'uid_rfid'
    ) THEN
        ALTER TABLE public.tb_siswa DROP COLUMN uid_rfid CASCADE;
        RAISE NOTICE 'Kolom uid_rfid pada tb_siswa berhasil dihapus.';
    ELSE
        RAISE NOTICE 'Kolom uid_rfid pada tb_siswa sudah tidak ada.';
    END IF;
END $$;

-- 2. Hapus kolom uid_rfid dari tabel tb_guru
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tb_guru' AND column_name = 'uid_rfid'
    ) THEN
        ALTER TABLE public.tb_guru DROP COLUMN uid_rfid CASCADE;
        RAISE NOTICE 'Kolom uid_rfid pada tb_guru berhasil dihapus.';
    ELSE
        RAISE NOTICE 'Kolom uid_rfid pada tb_guru sudah tidak ada.';
    END IF;
END $$;

-- 3. Hapus kolom rfid_uid & uid dari tabel absensi
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'absensi' AND column_name = 'rfid_uid'
    ) THEN
        ALTER TABLE public.absensi DROP COLUMN rfid_uid CASCADE;
        RAISE NOTICE 'Kolom rfid_uid pada absensi berhasil dihapus.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'absensi' AND column_name = 'uid'
    ) THEN
        ALTER TABLE public.absensi DROP COLUMN uid CASCADE;
        RAISE NOTICE 'Kolom uid pada absensi berhasil dihapus.';
    END IF;
END $$;

-- 4. Hapus tabel buffer RFID latest_scan (karena sudah menggunakan Face Recognition)
DROP TABLE IF EXISTS public.latest_scan CASCADE;

-- 5. Pastikan kolom biodata (JSONB) tersedia pada tb_siswa dan tb_guru untuk menyimpan biometrik wajah
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS biodata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS biodata JSONB DEFAULT '{}'::jsonb;

-- 6. Verifikasi Struktur Akhir Tabel tb_siswa
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tb_siswa'
ORDER BY ordinal_position;
