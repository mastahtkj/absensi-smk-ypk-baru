-- =========================================================================
-- UPDATE HAK AKSES ADMIN MASTER (SUPER ADMIN) SMK YPK MEDAN
-- Memberikan role Admin / Master setara Iqbal kepada 7 Guru:
-- 1. Hendrawan, ST (id: 3, username: hendrawan, rfid: BADFD805)
-- 2. Ahmad Fauzi, S.Kom., Gr. (id: 27, username: fauzi, rfid: 990BD705)
-- 3. Y E N N I, SE (id: 4, username: yenni, rfid: DB1FD705)
-- 4. Hartati Patiwael, S.Si (id: 2, username: hartati, rfid: B9D9D805)
-- 5. Dede Dermawan Lenar, S.Pd., Gr. (id: 9, username: dede, rfid: D916D905)
-- 6. Drs. Jafar Ismail (id: 5, username: jafar, rfid: AA1BDB05)
-- 7. T. Savina, A.Md.AK (id: 32, username: savina, rfid: 99ACD805)
-- Serta Muhammad Iqbal Rangkuti, S.Kom., Gr. (id: 29, username: iqbal, rfid: 92006F96)
-- =========================================================================

-- 1. Update kolom role di tabel public.tb_guru menjadi 'Admin'
UPDATE public.tb_guru
SET role = 'Admin'
WHERE username IN ('iqbal', 'hendrawan', 'fauzi', 'yenni', 'hartati', 'dede', 'jafar', 'savina')
   OR id_guru IN (2, 3, 4, 5, 9, 27, 29, 32)
   OR uid_rfid IN ('92006F96', 'BADFD805', '990BD705', 'DB1FD705', 'B9D9D805', 'D916D905', 'AA1BDB05', '99ACD805');

-- 2. Verifikasi hasil pembaruan akun 8 Admin Master
SELECT id_guru, username, nama_guru, inisial, uid_rfid, role
FROM public.tb_guru
WHERE id_guru IN (2, 3, 4, 5, 9, 27, 29, 32)
ORDER BY id_guru ASC;
