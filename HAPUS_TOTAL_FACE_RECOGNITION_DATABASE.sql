-- =================================================================================
-- 🗑️ HAPUS TOTAL SELURUH DATA & KOLOM BIOMETRIK WAJAH / FACE RECOGNITION (SUPABASE)
-- SMK YPK MEDAN - SISTEM INFORMASI AKADEMIK & PRESENSI DIGITAL
-- =================================================================================

-- 1. Hapus kolom face_descriptor dan biometrik dari tabel tb_siswa
ALTER TABLE IF EXISTS public.tb_siswa DROP COLUMN IF EXISTS face_descriptor CASCADE;
ALTER TABLE IF EXISTS public.tb_siswa DROP COLUMN IF EXISTS face_legacy_descriptor CASCADE;
ALTER TABLE IF EXISTS public.tb_siswa DROP COLUMN IF EXISTS face_photo_url CASCADE;
ALTER TABLE IF EXISTS public.tb_siswa DROP COLUMN IF EXISTS face_registered_at CASCADE;

-- 2. Hapus kolom face_descriptor dan biometrik dari tabel tb_guru
ALTER TABLE IF EXISTS public.tb_guru DROP COLUMN IF EXISTS face_descriptor CASCADE;
ALTER TABLE IF EXISTS public.tb_guru DROP COLUMN IF EXISTS face_legacy_descriptor CASCADE;
ALTER TABLE IF EXISTS public.tb_guru DROP COLUMN IF EXISTS face_photo_url CASCADE;
ALTER TABLE IF EXISTS public.tb_guru DROP COLUMN IF EXISTS face_registered_at CASCADE;

-- 3. Hapus kolom dari tabel students (jika ada)
ALTER TABLE IF EXISTS public.students DROP COLUMN IF EXISTS face_descriptor CASCADE;
ALTER TABLE IF EXISTS public.students DROP COLUMN IF EXISTS face_legacy_descriptor CASCADE;
ALTER TABLE IF EXISTS public.students DROP COLUMN IF EXISTS face_photo_url CASCADE;
ALTER TABLE IF EXISTS public.students DROP COLUMN IF EXISTS face_registered_at CASCADE;

-- 4. Bersihkan field biodata JSON di tb_siswa & tb_guru dari atribut wajah
UPDATE public.tb_siswa
SET biodata = (biodata - 'face_descriptor' - 'face_legacy_descriptor' - 'face_photo_url' - 'face_snapshot' - 'face_registered_at' - 'registered_via')
WHERE biodata IS NOT NULL;

UPDATE public.tb_guru
SET biodata = (biodata - 'face_descriptor' - 'face_legacy_descriptor' - 'face_photo_url' - 'face_snapshot' - 'face_registered_at' - 'registered_via')
WHERE biodata IS NOT NULL;

-- 5. Konfirmasi Selesai
SELECT 'Seluruh kolom dan data biometrik wajah berhasil dihapus total dari database Supabase SMK YPK!' AS status;
