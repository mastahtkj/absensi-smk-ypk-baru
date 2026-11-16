-- ==============================================================================
-- 🧹 SMK YPK MEDAN - HAPUS & RESET SEMUA BIOMETRIK WAJAH TEREKAM
-- Hapus biometrik wajah guru, siswa, dan pegawai agar dapat didaftarkan ulang
-- secara rapi, bergender presisi, dan mandiri oleh masing-masing pengguna.
-- ==============================================================================
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> New Query -> RUN.

-- 1. Kosongkan biometrik wajah & foto wajah pada tabel Siswa
UPDATE public.tb_siswa
SET 
  face_descriptor = NULL,
  face_photo_url = NULL,
  face_registered_at = NULL,
  biodata = CASE 
    WHEN biodata IS NOT NULL THEN (biodata - 'face_descriptor' - 'face_photo_url' - 'face_snapshot' - 'face_registered_at' - 'face_legacy_descriptor')
    ELSE '{}'::jsonb
  END;

-- 2. Kosongkan biometrik wajah & foto wajah pada tabel Guru & Pegawai
UPDATE public.tb_guru
SET 
  face_descriptor = NULL,
  face_photo_url = NULL,
  face_registered_at = NULL,
  biodata = CASE 
    WHEN biodata IS NOT NULL THEN (biodata - 'face_descriptor' - 'face_photo_url' - 'face_snapshot' - 'face_registered_at' - 'face_legacy_descriptor')
    ELSE '{}'::jsonb
  END;

-- 3. Bersihkan log scan scan sementara agar terminal kembali bersih
TRUNCATE TABLE public.latest_scan RESTART IDENTITY CASCADE;

-- 4. Verifikasi hasil pembersihan (Kedua tabel harus menghasilkan 0 wajah terdaftar)
SELECT 'Wajah Siswa Terdaftar' AS komponen, COUNT(*) AS sisa_wajah 
FROM public.tb_siswa 
WHERE face_descriptor IS NOT NULL OR (biodata->>'face_descriptor') IS NOT NULL
UNION ALL
SELECT 'Wajah Guru/Pegawai Terdaftar', COUNT(*) 
FROM public.tb_guru 
WHERE face_descriptor IS NOT NULL OR (biodata->>'face_descriptor') IS NOT NULL;
