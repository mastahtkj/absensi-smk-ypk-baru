-- ==============================================================================
-- 🏫 SMK YPK MEDAN - GENERATE SEMUA AKUN SISWA & GURU + RESET WAJAH BIOMETRIK
-- ==============================================================================
-- Skrip ini:
-- 1. Menghapus / mengosongkan semua data wajah lama di guru & siswa (agar bersih)
-- 2. Memastikan seluruh 31 Guru & Pegawai memiliki akun login (username & password)
--    - Master Iqbal: username: 'iqbal', password: '301020', role: 'admin'
--    - Guru lain   : password default: 'guru123', role: 'Guru' (ditentukan oleh Master Iqbal)
--    - Gender resmi sudah dipetakan akurat (Bapak vs Ibu)
-- 3. Memastikan seluruh Siswa memiliki akun login (username & password default: 'siswa123')
-- 4. Pengguna dapat langsung login mandiri, merekam / upload foto wajah, dan ganti sandi!
-- ==============================================================================

-- 1. Kosongkan biometrik wajah lama
UPDATE public.tb_siswa
SET 
  face_descriptor = NULL,
  face_photo_url = NULL,
  face_registered_at = NULL,
  biodata = CASE 
    WHEN biodata IS NOT NULL THEN (biodata - 'face_descriptor' - 'face_photo_url' - 'face_snapshot' - 'face_registered_at')
    ELSE '{}'::jsonb
  END;

UPDATE public.tb_guru
SET 
  face_descriptor = NULL,
  face_photo_url = NULL,
  face_registered_at = NULL,
  biodata = CASE 
    WHEN biodata IS NOT NULL THEN (biodata - 'face_descriptor' - 'face_photo_url' - 'face_snapshot' - 'face_registered_at')
    ELSE '{}'::jsonb
  END;

-- 2. Pastikan kolom gender & akun ada di tabel
ALTER TABLE IF EXISTS public.tb_guru 
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'guru123';

ALTER TABLE IF EXISTS public.tb_siswa 
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'siswa123';

-- 3. Masukkan / Sinkronkan Seluruh 31 Guru Resmi SMK YPK Medan

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (1, 'Hartati Patiwael, S.Si', 'hp', 'guru123', 'HP', 'Kepemimpinan & Manajemen Sekolah', 'Kepala Sekolah', 'admin', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (2, 'Hendrawan, ST', 'hr', 'guru123', 'HR', 'Kurikulum & Kejuruan', 'Wakakurikulum', 'admin', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (3, 'Yenni, SE', 'yn', 'guru123', 'YN', 'Produktif Pemasaran, KKPI', 'Wakasek Bid. Kesiswaan', 'admin', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (4, 'Muhammad Iqbal Rangkuti, S.Kom., Gr.', 'iqbal', '301020', 'IR', 'Teknik Jaringan Komputer & Telekomunikasi (TJKT)', 'Ketua Jurusan TJKT & Kepala Laboratorium', 'admin', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (5, 'Tengku Shavina, A.Md', 'ts', 'guru123', 'TS', 'Tata Usaha & Dapodik', 'KTU / Operator', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (6, 'Indah Febriana Tampubolon, A.Md', 'if', 'guru123', 'IF', 'Keuangan & Pengelolaan BOS', 'Bendahara Dana BOS', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (7, 'M.Soleh', 'ms', 'guru123', 'MS', 'Administrasi Sekolah', 'Tata Usaha', 'Guru', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (8, 'Rukiati', 'rk', 'guru123', 'RK', 'Administrasi & Kearsipan', 'Tata Usaha', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (9, 'Ahmad Fauzi, S.Kom', 'af', 'guru123', 'AF', 'Produktif TJKT, Informatika Komputer', 'Guru Produktif TJKT & Informatika Komputer', 'Guru', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (10, 'Eliwati, S.Pd.', 'ew', 'guru123', 'EW', 'Akuntansi Keuangan & Lembaga (AKL)', 'Guru Produktif Akuntansi', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (11, 'Gusniati Tanjung, S.Pd, M.Pd.', 'gt', 'guru123', 'GT', 'Praktikum Akuntansi Perusahaan', 'Guru Produktif Akuntansi', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (12, 'Junaidi, SE', 'jn', 'guru123', 'JN', 'Produksi Akuntansi & Perpajakan', 'Guru Bidang Studi Produksi Akuntansi', 'Guru', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (13, 'Erlinawati Tambunan, S.Pd.', 'et', 'guru123', 'ET', 'Bisnis Digital & Pemasaran (PM)', 'Guru Produktif Pemasaran', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (14, 'Azizah Simanjuntak, S.Pd.', 'as', 'guru123', 'AS', 'Manajemen Perkantoran & Layanan Bisnis (MPLB)', 'Guru Produktif MPLB', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (15, 'Drs. Ja''far Ismail', 'ji', 'guru123', 'JI', 'Dasar Dasar MPLB', 'Guru SMK YPK - Jurusan MPLB', 'Guru', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (16, 'Juraidah Hasibuan, S.Pd.', 'jh', 'guru123', 'JH', 'Konsentrasi Keahlian MPLB', 'Guru SMK | Jurusan MPLB', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (17, 'Drs. Mauli Simamora', 'ms', 'guru123', 'MS', 'Tata Kelola Sarana & Prasarana', 'Guru Produktif MPLB', 'Guru', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (18, 'Aminah Nasution, S.E', 'an', 'guru123', 'AN', 'Produk Kreatif & Kewirausahaan (PKK)', 'Guru Produk Kreatif dan Kewirausahaan', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (19, 'Elvi Rahimah Dalimunthe, S.Pd.', 'er', 'guru123', 'ER', 'Keterampilan Komputer & Pengelolaan Informasi (KKPI)', 'Guru KKPI', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (20, 'Dede Dermawan Lenar, S.Pd., Gr.', 'dd', 'guru123', 'DD', 'Bimbingan & Konseling (BK)', 'Guru Bimbingan dan Konseling', 'Guru', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (21, 'Dra. Zubaidah', 'zb', 'guru123', 'ZB', 'Pendidikan Agama Islam', 'Guru Bidang Studi Agama', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (22, 'Arman Efendi Parinduri S.Ag, M.Si', 'ap', 'guru123', 'AP', 'Pendidikan Agama Islam & PPKn', 'Guru Bidang Studi Agama & PKn', 'Guru', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (23, 'Neneng Gustanti, S.Pd.', 'ng', 'guru123', 'NG', 'Bahasa Indonesia', 'Guru Bahasa Indonesia', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (24, 'Miss. Tri Herdina Atika S.Pd', 'th', 'guru123', 'TH', 'Bahasa Inggris', 'Guru Bahasa Inggris', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (25, 'Dra. Roslin Panjaitan', 'rp', 'guru123', 'RP', 'English for Workplace Communication', 'English Teacher', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (26, 'Rumaidin Sikumbang, S.Pd, M.Pd', 'rs', 'guru123', 'RS', 'Bahasa Inggris', 'Guru Mapel Bahasa Inggris', 'Guru', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (27, 'Ir. Sofia Indriani Lubis, S.Pd., M.Pd.', 'sl', 'guru123', 'SL', 'Matematika', 'Guru Matematika', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (28, 'Solawati Nainggolan SPd M.Pd', 'sn', 'guru123', 'SN', 'Matematika', 'Guru Mata Pelajaran Matematika', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (29, 'Ricardo A. Sirait, ST, M.Si', 'iqbal', '301020', 'RA', 'Matematika & IPAS', 'Guru Mata Pelajaran Matematika & IPAS', 'admin', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (30, 'Fahrul Lubis', 'fl', 'guru123', 'FL', 'PJOK (Pendidikan Jasmani, Olahraga, dan Kesehatan)', 'Guru Mata Pelajaran PJOK', 'Guru', 'laki-laki')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

INSERT INTO public.tb_guru (id_guru, nama_guru, username, password, inisial, mapel, jabatan, role, gender)
VALUES (31, 'Masdalifah Zahara Siregar, S.Pd.', 'mz', 'guru123', 'MZ', 'Seni Budaya', 'Guru Seni Budaya', 'Guru', 'perempuan')
ON CONFLICT (id_guru) DO UPDATE SET
  nama_guru = EXCLUDED.nama_guru,
  username = COALESCE(tb_guru.username, EXCLUDED.username),
  password = COALESCE(tb_guru.password, EXCLUDED.password),
  inisial = EXCLUDED.inisial,
  mapel = EXCLUDED.mapel,
  jabatan = EXCLUDED.jabatan,
  gender = EXCLUDED.gender;

-- 4. Masukkan / Sinkronkan Seluruh Siswa Resmi SMK YPK Medan

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (9, 'ADIMAS NUGROHO', 'adimasnugroho', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (10, 'ADITYA RAMADHAN LUBIS', 'adityaramadhanlubis', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (11, 'AFGAN FAHRIZI', 'afganfahrizi', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (12, 'ANNISA OKTAVIANI', 'annisaoktaviani', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (13, 'AUREL KHAIRA SAFA TANJUNG', 'aurelkhairasafatanjung', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (14, 'BATARA FEBRIAN PARSAULIAN SITOMPUL', 'batarafebrianparsauliansitompul', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (15, 'CHELSEA AGUSTIANI', 'chelseaagustiani', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (16, 'CHELSY DESRIWANA', 'chelsydesriwana', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (17, 'HAFIZH AZIZI PELAWI', 'hafizhazizipelawi', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (18, 'INDIRA PUTRI', 'indiraputri', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (19, 'MHD ASBI WARDANA', 'mhdasbiwardana', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (20, 'MHD RIVIANSYAH HUTAMA', 'mhdriviansyahhutama', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (21, 'MUHAMMAD AL FAHTIR', 'muhammadalfahtir', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (22, 'MUHAMMAD BUKHARI AGWIN', 'muhammadbukhariagwin', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (23, 'MUHAMMAD FADHLI', 'muhammadfadhli', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (24, 'MUHAMMAD FERDI', 'muhammadferdi', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (25, 'QEYLA RIZKY HRP', 'qeylarizkyhrp', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (26, 'RADINSYAH', 'radinsyah', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (27, 'RADITYA SYAPUTRA', 'radityasyaputra', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (28, 'RICO BAYAKUTA SIDABUTAR', 'ricobayakutasidabutar', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (29, 'RIDHO AHMADI PRATAMA', 'ridhoahmadipratama', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (30, 'RIDHO ALJAILANI', 'ridhoaljailani', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (31, 'RIDOH PRATAMA', 'ridohpratama', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (32, 'RIZKY ARKA', 'rizkyarka', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (33, 'SATRIA BAGUS HANDOKO', 'satriabagushandoko', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (34, 'VANIA RAISSA LUBIS', 'vaniaraissalubis', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (35, 'WISNU PRADANA', 'wisnupradana', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (63, 'ADITYA PRATAMA', 'adityapratama', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (64, 'AHDA SABILA', 'ahdasabila', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (65, 'AHMAD MADANI HTAPEA', 'ahmadmadanihtapea', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (66, 'AHMAD MUZANNI NASUTION', 'ahmadmuzanninasution', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (67, 'AISHA NURUL ATHAYA', 'aishanurulathaya', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (68, 'AKHYAR DAULAY', 'akhyardaulay', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (69, 'ANDIKA SAPUTRA', 'andikasaputra', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (70, 'ANDINI NASUTION', 'andininasution', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (71, 'ANUGRAH PUTRA PRATAMA', 'anugrahputrapratama', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (72, 'AZRA ALMER IZDHINAR', 'azraalmerizdhinar', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (73, 'DIWA ARDINATA', 'diwaardinata', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (74, 'FACHRI ARDIANSYAH', 'fachriardiansyah', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (75, 'GILEN ABI GAEL.S', 'gilenabigaels', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (76, 'HABIB ATAYA ZALVA', 'habibatayazalva', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (77, 'HUMAIROH CHAIRUNNIZA', 'humairohchairunniza', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (78, 'IBRAHIM AZWAR', 'ibrahimazwar', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (79, 'KHAIRIN NIZAM', 'khairinnizam', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (80, 'LUTFHI SIRAJ', 'lutfhisiraj', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (81, 'M, FARIZ MAULANA AZAM', 'mfarizmaulanaazam', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (82, 'M.ZIKKRY MARDIUS CHANIAGO', 'mzikkrymardiuschaniago', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (83, 'MHAD RIZKY RAMADHAN', 'mhadrizkyramadhan', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (84, 'MHD.KHOIRUL DAFFA', 'mhdkhoiruldaffa', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (85, 'MHD.REZA NANDA', 'mhdrezananda', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (86, 'MUHAMMAD AZZAM KIANU', 'muhammadazzamkianu', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (87, 'MUHAMMAD HAFIZH RAMADHAN', 'muhammadhafizhramadhan', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (88, 'MUHAMMAD HANAFI', 'muhammadhanafi', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (89, 'MUHAMMAD RAKA ALFINAS HSB', 'muhammadrakaalfinashsb', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (90, 'MUHAMMAD TAJIE ADMAJA', 'muhammadtajieadmaja', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (91, 'MUHAMMAD ZAIDAN LUBIS', 'muhammadzaidanlubis', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (92, 'RAFI', 'rafi', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (93, 'RADITYA HARIYADI', 'radityahariyadi', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (94, 'RAFI SYAPUTRA', 'rafisyaputra', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (95, 'RANDY HABIBIL SYAHPUTR', 'randyhabibilsyahputr', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (96, 'RASTI WULANDARI NASUTION', 'rastiwulandarinasution', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (97, 'SATRIA RIFAT HANAFI', 'satriarifathanafi', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (98, 'WISNU CHARIY FADILAH NASUTION', 'wisnuchariyfadilahnasution', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (99, 'PEDRO PEDROSA', 'pedropedrosa', 'siswa123', 'X TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (100, 'MUHAMMAD RAFA AL-BUCHARI', 'muhammadrafaalbuchari', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (102, 'SYAWAL AZMI', 'syawalazmi', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (103, 'AHMAD FAIZ AZMI', 'ahmadfaizazmi', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (104, 'PRATAMA', 'pratama', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (105, 'MIRZA PRATAMA', 'mirzapratama', 'siswa123', 'XI TJKT', 'TJKT', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (202, 'AFIS CAHAYA', 'afiscahaya', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (203, 'AHMAD RIZQI ARAFAH', 'ahmadrizqiarafah', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (204, 'ANGGUN WARDANA', 'anggunwardana', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (205, 'ANNISA FEBRIANI', 'annisafebriani', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (206, 'DINDA KIRANA', 'dindakirana', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (207, 'DEA AZIRA', 'deaazira', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (208, 'EGA IKBAL PRATAMA', 'egaikbalpratama', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (209, 'KAESYA RAFADILLA', 'kaesyarafadilla', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (210, 'MUTIARA', 'mutiara', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (211, 'NABILA AURELIA', 'nabilaaurelia', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (212, 'NADIA PUTRI ADILA', 'nadiaputriadila', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (213, 'NURISKA FADHILA', 'nuriskafadhila', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (214, 'NURUL AIN', 'nurulain', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (215, 'RIDHO SYAPUTRA', 'ridhosyaputra', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (216, 'RISKY NURFRIYANI', 'riskynurfriyani', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (217, 'SAIF AL HAFIZ', 'saifalhafiz', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (218, 'SAKIA APRILIA', 'sakiaaprilia', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (219, 'SITI ZAHARA RAMBE', 'sitizahararambe', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (220, 'TITA AULIA', 'titaaulia', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (221, 'TEGUH ARIEF PERMANA', 'teguhariefpermana', 'siswa123', 'X AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (222, 'ADELIA LARASATI', 'adelialarasati', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (223, 'AMALIA RIZKI', 'amaliarizki', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (224, 'AYU QAIRINA', 'ayuqairina', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (225, 'CINTA ADITA LAKSAMANA', 'cintaaditalaksamana', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (226, 'CINTA AISYAH', 'cintaaisyah', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (227, 'KANAYA AIRANASYA', 'kanayaairanasya', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (228, 'LAYYA ELIMIRA', 'layyaelimira', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (229, 'MAISYA CAHAY PUTRI', 'maisyacahayputri', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (230, 'MARISA SARTIKA', 'marisasartika', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (231, 'NADILA NUR SAFITRI', 'nadilanursafitri', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (232, 'NAILA ATANTRI ANUGRAH SIR', 'nailaatantrianugrahsir', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (233, 'NAILAH NUR HAFIZHAH', 'nailahnurhafizhah', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (234, 'NAZWA AFRIYANTI', 'nazwaafriyanti', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (235, 'NAZWA SYAFARA AKHYAR', 'nazwasyafaraakhyar', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (236, 'NINDY PRATIWIE', 'nindypratiwie', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (237, 'RINATA AURORA', 'rinataaurora', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (238, 'SELVIA AULIA BR MUNTHE', 'selviaauliabrmunthe', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (239, 'SITI FAZIRAH', 'sitifazirah', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (240, 'SUCI RAHMADANI', 'sucirahmadani', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (241, 'SYAHRINI RIZKINI PURBA', 'syahrinirizkinipurba', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (242, 'SYAKIRA HANIN', 'syakirahanin', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (243, 'SYIFA AZURA', 'syifaazura', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (244, 'TASYA SAHFANI', 'tasyasahfani', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (245, 'VINATA LAURA FELOVEXIA', 'vinatalaurafelovexia', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (246, 'YOSI ARUMI', 'yosiarumi', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (247, 'ZAHARA TANJUNG', 'zaharatanjung', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (248, 'ZAHRA SYIFA NOVIYANTI', 'zahrasyifanoviyanti', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (249, 'CHIKA FEBRYANTI', 'chikafebryanti', 'siswa123', 'X MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (250, 'ADELLA WIDYA DHANA', 'adellawidyadhana', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (251, 'AIRA NUR SYAH WARDANI', 'airanursyahwardani', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (252, 'AIRI NUR SYAH WARDANI', 'airinursyahwardani', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (253, 'ASMI PUSPITA', 'asmipuspita', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (254, 'BIDI BALKIS AYUNDA', 'bidibalkisayunda', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (255, 'BUNGA WULANDARI', 'bungawulandari', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (256, 'CELLI OKTAVIANI', 'cellioktaviani', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (257, 'ELMA DIFIKA AMANIAR', 'elmadifikaamaniar', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (258, 'GILANG SAMUDERA', 'gilangsamudera', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (259, 'HATTA WIRANATA', 'hattawiranata', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (260, 'IZRA ZAKIA', 'izrazakia', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (261, 'JENNI SHAFIRA', 'jennishafira', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (262, 'KEISHA AVRILLAHASIBUAN', 'keishaavrillahasibuan', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (263, 'KHAYANA AYUDHIA MULIA', 'khayanaayudhiamulia', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (264, 'LISA NURHALIMAH DAULAY', 'lisanurhalimahdaulay', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (265, 'NADA MUNTAZA', 'nadamuntaza', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (266, 'RAMAH SAMIRA', 'ramahsamira', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (267, 'RIZQINA MARDHIAH', 'rizqinamardhiah', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (268, 'TIWI DWI ADITYA', 'tiwidwiaditya', 'siswa123', 'X PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (270, 'ADE BENING AULIA', 'adebeningaulia', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (271, 'AKILA REGINA PUTRI', 'akilareginaputri', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (272, 'AZ-ZAHRA ZUYYINANISA', 'azzahrazuyyinanisa', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (273, 'CHEISYA NABILA PUTRI', 'cheisyanabilaputri', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (274, 'CHINDY AULIANI', 'chindyauliani', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (275, 'FIRA WULANDARI', 'firawulandari', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (276, 'IRA ULANDARI', 'iraulandari', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (277, 'KAMILA REGINA PUTRI', 'kamilareginaputri', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (278, 'MARWAH NATASHA', 'marwahnatasha', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (279, 'NADIYYA AMELIA', 'nadiyyaamelia', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (280, 'NESSY AYUNA', 'nessyayuna', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (281, 'NUR AINI', 'nuraini', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (282, 'RAHMA CHAIRUNISA', 'rahmachairunisa', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (283, 'SAFA NATASHA', 'safanatasha', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (284, 'SAFIRA ADELIA', 'safiraadelia', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (285, 'TITIN YANALIAH', 'titinyanaliah', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (286, 'UNZILLA RISKI', 'unzillariski', 'siswa123', 'XI AKL', 'AKL', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (287, 'AMALIA ANDINI PERTIWI', 'amaliaandinipertiwi', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (288, 'ANGELINA SEPTIYANURI', 'angelinaseptiyanuri', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (289, 'ANNISA JASMINE', 'annisajasmine', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (290, 'ARTIKA AMELIA', 'artikaamelia', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (291, 'ASYIFA ZUYYINANISA', 'asyifazuyyinanisa', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (292, 'AULIA PUTRI', 'auliaputri', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (293, 'AYU KIRANA', 'ayukirana', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (294, 'CHILLA AL ZIANSYAH', 'chillaalziansyah', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (295, 'CUT RAZKI ANDHIRA', 'cutrazkiandhira', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (296, 'CUT IZZATUL JANNAH', 'cutizzatuljannah', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (297, 'DESI BRIYANA CAHYA', 'desibriyanacahya', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (298, 'FANI PUSPITASARI', 'fanipuspitasari', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (299, 'NADYA AURA', 'nadyaaura', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (300, 'NAFIA MAUZA', 'nafiamauza', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (301, 'NAZHIFA FADHILAH', 'nazhifafadhilah', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (302, 'NAZWA AULIA', 'nazwaaulia', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (303, 'NAZWA SALSABILA', 'nazwasalsabila', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (304, 'NAZWA ZULFA', 'nazwazulfa', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (305, 'NURKHAFRANI PULUNGAN', 'nurkhafranipulungan', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (306, 'POPPY MARIA', 'poppymaria', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (307, 'PUTRI AMALIYAH', 'putriamaliyah', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (308, 'REYSHA NACITA PUTRI', 'reyshanacitaputri', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (309, 'SITI SAHFIRA', 'sitisahfira', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (310, 'ZAHRA KARTIKA SYAKIRA', 'zahrakartikasyakira', 'siswa123', 'XI MPLB', 'MPLB', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (311, 'ADE SINTIA', 'adesintia', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (312, 'AHMADIZED', 'ahmadized', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (313, 'AIRA VIASTRI', 'airaviastri', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (314, 'ALZALIKHA NAZWA', 'alzalikhanazwa', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (315, 'AZSICIA OLIVIA', 'azsiciaolivia', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (316, 'BIMA SYAH', 'bimasyah', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (317, 'DINA AULIA', 'dinaaulia', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (318, 'DINDA AULIA', 'dindaaulia', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (319, 'DINDA SYAHRA', 'dindasyahra', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (320, 'EGA REVILIANA', 'egareviliana', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (321, 'FATIMAH AZZAHRA', 'fatimahazzahra', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (322, 'FITRA AISYAH', 'fitraaisyah', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (323, 'ICARISSA SEBY', 'icarissaseby', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (324, 'KHANSAA FITRIA', 'khansaafitria', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (325, 'LILI SYAPUTRI', 'lilisyaputri', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (326, 'NABILA SYAFRANI', 'nabilasyafrani', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (327, 'NADIN AISYAH', 'nadinaisyah', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (328, 'NAILA AULIA', 'nailaaulia', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (329, 'RINA AULIA', 'rinaaulia', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (330, 'RIZA AFANDI', 'rizaafandi', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (331, 'ROSMAINI', 'rosmaini', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (332, 'SUDARWATI', 'sudarwati', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (333, 'SYAPIRA MUTIA', 'syapiramutia', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (334, 'SYIFA AULIA', 'syifaaulia', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (335, 'QUEENSHA KAYLANI', 'queenshakaylani', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (336, 'TIARA TRI HAPSARI', 'tiaratrihapsari', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role)
VALUES (337, 'M. SYUKRON ZIDAN', 'msyukronzidan', 'siswa123', 'XI PM', 'PM', 'Siswa')
ON CONFLICT (id_siswa) DO UPDATE SET
  nama_siswa = EXCLUDED.nama_siswa,
  username = COALESCE(tb_siswa.username, EXCLUDED.username),
  password = COALESCE(tb_siswa.password, EXCLUDED.password),
  kelas = EXCLUDED.kelas,
  jurusan = EXCLUDED.jurusan;

-- 5. Periksa Status Data
SELECT 'Total Guru' AS kategori, COUNT(*) FROM public.tb_guru
UNION ALL
SELECT 'Total Siswa', COUNT(*) FROM public.tb_siswa
UNION ALL
SELECT 'Wajah Siswa Terdaftar (Harus 0)', COUNT(*) FROM public.tb_siswa WHERE face_descriptor IS NOT NULL
UNION ALL
SELECT 'Wajah Guru Terdaftar (Harus 0)', COUNT(*) FROM public.tb_guru WHERE face_descriptor IS NOT NULL;
