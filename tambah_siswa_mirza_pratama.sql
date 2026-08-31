-- ==============================================================================
-- 📋 TAMBAH DATA SISWA: MIRZA PRATAMA (XI TJKT) KE TABEL tb_siswa SUPABASE
-- ==============================================================================

INSERT INTO public.tb_siswa (nama_siswa, kelas, jurusan, role) 
VALUES ('MIRZA PRATAMA', 'XI TJKT', 'TJKT', 'Siswa');

-- Cek verifikasi data yang baru ditambahkan
SELECT id_siswa, uid_rfid, nama_siswa, kelas, jurusan, role 
FROM public.tb_siswa 
WHERE nama_siswa ILIKE '%MIRZA%PRATAMA%';
