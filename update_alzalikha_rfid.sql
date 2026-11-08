-- ==============================================================================
-- 🏷️ UPDATE UID KARTU RFID ALZALIKHA NAZWA (XI PM)
-- ==============================================================================
UPDATE public.tb_siswa
SET uid_rfid = '360979F7',
    rfid_uid = '360979F7',
    role = 'Admin'
WHERE (nama_siswa ILIKE '%ALZALIK%NAZWA%' OR nama_siswa ILIKE '%ALZALIKA%')
  AND (kelas ILIKE '%XI%PM%' OR jurusan ILIKE '%PM%');
