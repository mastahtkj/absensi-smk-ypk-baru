-- ==============================================================================
-- 👑 UPDATE ROLE SISWA ADMIN (SEPERTI INDIRA PUTRI) DI TABEL tb_siswa SUPABASE
-- ==============================================================================
-- Siswa yang dijadikan Admin Kelas / Siswa Admin:
-- 1. NUR AINI (XI AKL)
-- 2. ALZALIKHA NAZWA / ALZALIKA NAZWA (XI PM)
-- 3. CUT RAZKI ANDHIRA (XI MPLB)
-- 4. AISHA NURUL ATHAYA (X TJKT)
--
-- Jalankan query di bawah ini pada Menu 'SQL Editor' di dashboard Supabase.
-- ==============================================================================

-- 1. Jadikan IRA ULANDARI (XI AKL) sebagai Admin
UPDATE public.tb_siswa
SET role = 'Admin'
WHERE (nama_siswa ILIKE '%IRA%ULANDARI%' OR nama_siswa ILIKE '%IRA%WULANDARI%')
  AND (kelas ILIKE '%XI%AKL%' OR jurusan ILIKE '%AKL%');

-- 2. Jadikan NUR AINI (XI AKL) sebagai Admin
UPDATE public.tb_siswa
SET role = 'Admin'
WHERE (nama_siswa ILIKE '%NUR%AINI%' OR nama_siswa ILIKE '%NURAINI%')
  AND (kelas ILIKE '%XI%AKL%' OR jurusan ILIKE '%AKL%');

-- 3. Jadikan ALZALIKHA NAZWA (XI PM) sebagai Admin
UPDATE public.tb_siswa
SET role = 'Admin'
WHERE (nama_siswa ILIKE '%ALZALIK%NAZWA%' OR nama_siswa ILIKE '%ALZALIKA%')
  AND (kelas ILIKE '%XI%PM%' OR jurusan ILIKE '%PM%');

-- 4. Jadikan CUT RAZKI ANDHIRA (XI MPLB) sebagai Admin
UPDATE public.tb_siswa
SET role = 'Admin'
WHERE (nama_siswa ILIKE '%CUT%RAZKI%ANDHIRA%' OR nama_siswa ILIKE '%CUT%RAZKI%')
  AND (kelas ILIKE '%XI%MPLB%' OR jurusan ILIKE '%MPLB%');

-- 5. Jadikan AISHA NURUL ATHAYA sebagai Admin
UPDATE public.tb_siswa
SET role = 'Admin'
WHERE nama_siswa ILIKE '%AISHA%NURUL%ATHAYA%';

-- 6. Kembalikan FIRA WULANDARI (XI AKL) sebagai Siswa biasa
UPDATE public.tb_siswa
SET role = 'Siswa'
WHERE nama_siswa ILIKE '%FIRA%WULANDARI%';

-- ==============================================================================
-- 🔍 CEK & VERIFIKASI DAFTAR SISWA DENGAN ROLE ADMIN
-- ==============================================================================
SELECT 
    id_siswa,
    uid_rfid,
    nama_siswa,
    kelas,
    jurusan,
    role
FROM public.tb_siswa
WHERE role ILIKE '%Admin%'
ORDER BY kelas ASC, nama_siswa ASC;
