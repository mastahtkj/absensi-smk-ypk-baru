-- ==============================================================
-- 🔄 RESET SEMUA NOMOR RFID KHUSUS SISWA KELAS XI AKL
-- Siswa kelas lain dan guru TIDAK AKAN terhapus/terpengaruh.
-- ==============================================================

-- 1. Reset nomor RFID siswa XI AKL
UPDATE tb_siswa
SET uid_rfid = NULL
WHERE kelas = 'XI AKL' 
   OR kelas ILIKE 'XI AKL%' 
   OR (kelas ILIKE '%XI%' AND jurusan = 'AKL');

-- 2. Bersihkan buffer scan sementara (gunakan '' karena kolom uid NOT NULL)
UPDATE latest_scan 
SET uid = '' 
WHERE id = 1;

-- 3. Cek hasil verifikasi data XI AKL (Sudah bersih dari UID dan berurutan A-Z)
SELECT id_siswa, nama_siswa, kelas, jurusan, uid_rfid 
FROM tb_siswa 
WHERE kelas ILIKE '%XI%AKL%' OR (kelas ILIKE '%XI%' AND jurusan = 'AKL')
ORDER BY nama_siswa ASC;
