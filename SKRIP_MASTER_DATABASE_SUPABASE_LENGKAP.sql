-- ==============================================================================
-- 🏛️ SISTEM DATABASE MASTER RESMI SMK YPK MEDAN (SUPABASE CLOUD)
-- Project ID: wpyfwkcevgdhkazeesdq
-- Fitur: Presensi Biometrik Wajah AI (128-D) & Manual, Roster KBM, CBT Digital, Inval Guru
-- ==============================================================================
-- PETUNJUK PENGGUNAAN:
-- 1. Buka Supabase Dashboard > Pilih Proyek Anda (wpyfwkcevgdhkazeesdq)
-- 2. Klik menu "SQL Editor" di bilah kiri
-- 3. Klik "+ New query"
-- 4. Tempel seluruh isi skrip ini lalu klik tombol "RUN" (Hijau)
-- ==============================================================================

-- 🗑️ MIGRASI PEMBERSIHAN TOTAL: HAPUS SELURUH FITUR & KOLOM TERKAIT RFID
ALTER TABLE IF EXISTS public.tb_siswa DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE IF EXISTS public.tb_guru DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE IF EXISTS public.absensi DROP COLUMN IF EXISTS rfid_uid;
ALTER TABLE IF EXISTS public.tb_siswa_devices DROP COLUMN IF EXISTS uid_rfid;
DROP TABLE IF EXISTS public.latest_scan CASCADE;

-- 1. TABEL DATA SISWA (tb_siswa)
CREATE TABLE IF NOT EXISTS public.tb_siswa (
    id_siswa BIGSERIAL PRIMARY KEY,
    nis VARCHAR(50),
    nisn VARCHAR(50) UNIQUE,
    nama_siswa VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255) DEFAULT 'siswa123',
    kelas VARCHAR(50) NOT NULL,
    jurusan VARCHAR(50),
    telepon VARCHAR(50),
    telepon_ortu VARCHAR(50),
    alamat TEXT,
    foto_url TEXT,
    face_descriptor JSONB, -- Array 128 Float Vektor Biometrik Wajah dari face-api.js
    biodata JSONB DEFAULT '{}'::jsonb,
    role VARCHAR(50) DEFAULT 'Siswa',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pastikan kolom biometrik wajah tersedia
ALTER TABLE public.tb_siswa ADD COLUMN IF NOT EXISTS face_descriptor JSONB;

CREATE INDEX IF NOT EXISTS idx_tb_siswa_nisn ON public.tb_siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_tb_siswa_nama ON public.tb_siswa(nama_siswa);
CREATE INDEX IF NOT EXISTS idx_tb_siswa_kelas ON public.tb_siswa(kelas);
CREATE INDEX IF NOT EXISTS idx_tb_siswa_username ON public.tb_siswa(username);

-- 2. TABEL DATA GURU & PEGAWAI (tb_guru)
CREATE TABLE IF NOT EXISTS public.tb_guru (
    id_guru BIGSERIAL PRIMARY KEY,
    nip VARCHAR(50),
    nama_guru VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255) DEFAULT 'guru123',
    inisial VARCHAR(20),
    mapel VARCHAR(150),
    telepon VARCHAR(50),
    alamat TEXT,
    foto_url TEXT,
    face_descriptor JSONB, -- Vektor Biometrik Wajah Guru & Pegawai
    biodata JSONB DEFAULT '{}'::jsonb,
    role VARCHAR(50) DEFAULT 'Guru', -- 'Guru', 'Pegawai', 'Staf', 'Admin'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tb_guru ADD COLUMN IF NOT EXISTS face_descriptor JSONB;

CREATE INDEX IF NOT EXISTS idx_tb_guru_nama ON public.tb_guru(nama_guru);
CREATE INDEX IF NOT EXISTS idx_tb_guru_username ON public.tb_guru(username);
CREATE INDEX IF NOT EXISTS idx_tb_guru_role ON public.tb_guru(role);

-- 3. TABEL LOG PRESENSI HARIAN (absensi)
CREATE TABLE IF NOT EXISTS public.absensi (
    id BIGSERIAL PRIMARY KEY,
    id_siswa BIGINT,
    id_guru BIGINT,
    nama VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Siswa', -- 'Siswa', 'Guru', 'Pegawai'
    kelas VARCHAR(50),
    jurusan VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Hadir', -- 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Pulang'
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_masuk TIME NOT NULL DEFAULT CURRENT_TIME,
    jam_pulang TIME,
    metode VARCHAR(50) DEFAULT 'Wajah AI', -- 'Wajah AI', 'Manual'
    foto_url TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_absensi_tanggal ON public.absensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_nama ON public.absensi(nama);
CREATE INDEX IF NOT EXISTS idx_absensi_kelas ON public.absensi(kelas);
CREATE INDEX IF NOT EXISTS idx_absensi_role ON public.absensi(role);

-- 4. TABEL PENGATURAN APLIKASI SEKOLAH (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'school_config',
    school_name TEXT DEFAULT 'SMK YPK MEDAN',
    school_tagline TEXT DEFAULT 'Aplikasi Sekolah Digital Terpadu',
    school_address TEXT DEFAULT 'Jl. Sakti Lubis Gg. Amal No. 25 & Gg. Pegawai No. 8, Medan',
    school_logo_url TEXT DEFAULT '/logo.png',
    school_banner_url TEXT DEFAULT '',
    running_text TEXT DEFAULT 'Selamat Datang di Portal Digital SMK YPK Medan • Disiplin, Cerdas, Berkarakter & Berdaya Saing Global! ⭐',
    entry_time TEXT DEFAULT '07:15',
    late_threshold_time TEXT DEFAULT '07:30',
    departure_time TEXT DEFAULT '14:30',
    friday_departure_time TEXT DEFAULT '11:35',
    school_latitude DOUBLE PRECISION DEFAULT 3.55832,
    school_longitude DOUBLE PRECISION DEFAULT 98.69421,
    geofence_radius_meters DOUBLE PRECISION DEFAULT 200,
    theme_primary_color TEXT DEFAULT '#1e40af',
    theme_accent_color TEXT DEFAULT '#3b82f6',
    teacher_slides JSONB DEFAULT '[]'::jsonb,
    home_banners JSONB DEFAULT '[]'::jsonb,
    school_news JSONB DEFAULT '[]'::jsonb,
    school_agenda JSONB DEFAULT '[]'::jsonb,
    feature_cbt_active BOOLEAN DEFAULT true,
    feature_inval_active BOOLEAN DEFAULT true,
    feature_library_active BOOLEAN DEFAULT true,
    feature_mading_active BOOLEAN DEFAULT true,
    feature_audio_bell_active BOOLEAN DEFAULT true,
    feature_chat_all_active BOOLEAN DEFAULT true,
    updated_by TEXT DEFAULT 'Admin Master',
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.app_settings (id, school_name, school_tagline)
VALUES ('school_config', 'SMK YPK MEDAN', 'Aplikasi Sekolah Digital Terpadu')
ON CONFLICT (id) DO NOTHING;

-- 5. TABEL INVAL GURU (inval_guru / tb_inval_guru)
CREATE TABLE IF NOT EXISTS public.inval_guru (
    id BIGSERIAL PRIMARY KEY,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    nama_guru_tidak_hadir VARCHAR(255) NOT NULL,
    nama_guru_pengganti VARCHAR(255) NOT NULL,
    nama_guru_utama VARCHAR(255),
    nama_guru_inval VARCHAR(255),
    kelas VARCHAR(50) NOT NULL,
    jam_ke VARCHAR(50),
    mata_pelajaran VARCHAR(150),
    mapel VARCHAR(150),
    tugas TEXT,
    materi_nama TEXT,
    materi_url TEXT,
    keterangan_tugas TEXT,
    status_inval VARCHAR(50) DEFAULT 'Ditugaskan', -- 'Ditugaskan', 'Berjalan', 'Selesai'
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inval_guru ADD COLUMN IF NOT EXISTS nama_guru_utama VARCHAR(255);
ALTER TABLE public.inval_guru ADD COLUMN IF NOT EXISTS nama_guru_inval VARCHAR(255);
ALTER TABLE public.inval_guru ADD COLUMN IF NOT EXISTS mapel VARCHAR(150);

-- 6. TABEL MADING & BERITA SEKOLAH (tb_berita)
CREATE TABLE IF NOT EXISTS public.tb_berita (
    id TEXT PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    ringkasan TEXT,
    konten TEXT NOT NULL,
    penulis VARCHAR(100) DEFAULT 'SMK YPK MEDAN',
    kategori VARCHAR(100) DEFAULT 'Penting',
    target_audience VARCHAR(50) DEFAULT 'Semua',
    gambar_url TEXT,
    badge_color VARCHAR(30) DEFAULT '#2563eb',
    send_notification BOOLEAN DEFAULT true,
    tanggal VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABEL PERANGKAT SESI SISWA (tb_siswa_devices)
CREATE TABLE IF NOT EXISTS public.tb_siswa_devices (
    id BIGSERIAL PRIMARY KEY,
    id_siswa BIGINT,
    nama_siswa VARCHAR(255),
    device_id VARCHAR(255) UNIQUE,
    device_name VARCHAR(255),
    device_model VARCHAR(255),
    last_login TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABEL AUDIT LOG PRESENSI (audit_log_presensi)
CREATE TABLE IF NOT EXISTS public.audit_log_presensi (
    id BIGSERIAL PRIMARY KEY,
    diubah_oleh VARCHAR(255),
    role_pengubah VARCHAR(100),
    target_nama VARCHAR(255),
    status_lama VARCHAR(100),
    status_baru VARCHAR(100),
    action VARCHAR(100),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TABEL UJIAN CBT DIGITAL
CREATE TABLE IF NOT EXISTS public.tb_ujian (
    id_ujian BIGSERIAL PRIMARY KEY,
    judul_ujian VARCHAR(255) NOT NULL,
    kelas_target VARCHAR(100),
    tingkat VARCHAR(50),
    jurusan VARCHAR(50),
    mata_pelajaran VARCHAR(150),
    durasi_menit INT DEFAULT 60,
    kkm INT DEFAULT 75,
    token_ujian VARCHAR(50) DEFAULT 'YPK2026',
    password_pengawas VARCHAR(100) DEFAULT 'ypkadmin',
    acak_soal BOOLEAN DEFAULT false,
    tampilkan_nilai BOOLEAN DEFAULT true,
    anti_cheat_enabled BOOLEAN DEFAULT true,
    max_tab_violations INT DEFAULT 3,
    status_ujian VARCHAR(50) DEFAULT 'Aktif',
    dibuat_oleh VARCHAR(150) DEFAULT 'Tim Pengajar SMK YPK',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS tingkat VARCHAR(50);
ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS jurusan VARCHAR(50);
ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS kkm INT DEFAULT 75;
ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS token_ujian VARCHAR(50) DEFAULT 'YPK2026';
ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS password_pengawas VARCHAR(100) DEFAULT 'ypkadmin';
ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS acak_soal BOOLEAN DEFAULT false;
ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS tampilkan_nilai BOOLEAN DEFAULT true;
ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS anti_cheat_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS max_tab_violations INT DEFAULT 3;
ALTER TABLE public.tb_ujian ADD COLUMN IF NOT EXISTS dibuat_oleh VARCHAR(150);

CREATE TABLE IF NOT EXISTS public.tb_soal_ujian (
    id_soal BIGSERIAL PRIMARY KEY,
    id_ujian BIGINT REFERENCES public.tb_ujian(id_ujian) ON DELETE CASCADE,
    nomor_soal INT,
    pertanyaan TEXT NOT NULL,
    gambar_url TEXT,
    tipe_soal VARCHAR(50) DEFAULT 'PG', -- 'PG' | 'Essay'
    opsi_a TEXT,
    opsi_b TEXT,
    opsi_c TEXT,
    opsi_d TEXT,
    opsi_e TEXT,
    kunci_jawaban VARCHAR(20),
    bobot_poin INT DEFAULT 2,
    pedoman_penilaian TEXT
);

ALTER TABLE public.tb_soal_ujian ADD COLUMN IF NOT EXISTS nomor_soal INT;
ALTER TABLE public.tb_soal_ujian ADD COLUMN IF NOT EXISTS gambar_url TEXT;
ALTER TABLE public.tb_soal_ujian ADD COLUMN IF NOT EXISTS opsi_a TEXT;
ALTER TABLE public.tb_soal_ujian ADD COLUMN IF NOT EXISTS opsi_b TEXT;
ALTER TABLE public.tb_soal_ujian ADD COLUMN IF NOT EXISTS opsi_c TEXT;
ALTER TABLE public.tb_soal_ujian ADD COLUMN IF NOT EXISTS opsi_d TEXT;
ALTER TABLE public.tb_soal_ujian ADD COLUMN IF NOT EXISTS opsi_e TEXT;
ALTER TABLE public.tb_soal_ujian ADD COLUMN IF NOT EXISTS bobot_poin INT DEFAULT 2;
ALTER TABLE public.tb_soal_ujian ADD COLUMN IF NOT EXISTS pedoman_penilaian TEXT;

CREATE TABLE IF NOT EXISTS public.tb_jawaban_siswa (
    id_jawaban BIGSERIAL PRIMARY KEY,
    id_ujian BIGINT REFERENCES public.tb_ujian(id_ujian) ON DELETE CASCADE,
    id_siswa BIGINT,
    nama_siswa VARCHAR(255),
    kelas VARCHAR(50),
    jurusan VARCHAR(50),
    nomor_soal INT,
    tipe_soal VARCHAR(50) DEFAULT 'PG',
    jawaban_siswa TEXT,
    is_benar BOOLEAN,
    poin_diperoleh NUMERIC(5,2) DEFAULT 0,
    ragu_ragu BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tb_jawaban_siswa ADD COLUMN IF NOT EXISTS nomor_soal INT;
ALTER TABLE public.tb_jawaban_siswa ADD COLUMN IF NOT EXISTS tipe_soal VARCHAR(50);
ALTER TABLE public.tb_jawaban_siswa ADD COLUMN IF NOT EXISTS jawaban_siswa TEXT;
ALTER TABLE public.tb_jawaban_siswa ADD COLUMN IF NOT EXISTS is_benar BOOLEAN;
ALTER TABLE public.tb_jawaban_siswa ADD COLUMN IF NOT EXISTS poin_diperoleh NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.tb_jawaban_siswa ADD COLUMN IF NOT EXISTS ragu_ragu BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.tb_nilai_ujian (
    id_nilai BIGSERIAL PRIMARY KEY,
    id_ujian BIGINT REFERENCES public.tb_ujian(id_ujian) ON DELETE CASCADE,
    id_siswa BIGINT,
    nama_siswa VARCHAR(255),
    kelas VARCHAR(50),
    jurusan VARCHAR(50),
    nilai_pg INT DEFAULT 0,
    nilai_essay INT DEFAULT 0,
    total_max_pg INT DEFAULT 60,
    skor_akhir NUMERIC(5,2) DEFAULT 0,
    total_pelanggaran INT DEFAULT 0,
    log_pelanggaran JSONB DEFAULT '[]'::jsonb,
    status_ujian_siswa VARCHAR(50) DEFAULT 'Selesai',
    catatan_guru TEXT,
    waktu_mulai TIMESTAMPTZ,
    waktu_selesai TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_ujian_siswa UNIQUE (id_ujian, nama_siswa)
);

ALTER TABLE public.tb_nilai_ujian ADD COLUMN IF NOT EXISTS nilai_pg INT DEFAULT 0;
ALTER TABLE public.tb_nilai_ujian ADD COLUMN IF NOT EXISTS nilai_essay INT DEFAULT 0;
ALTER TABLE public.tb_nilai_ujian ADD COLUMN IF NOT EXISTS total_max_pg INT DEFAULT 60;
ALTER TABLE public.tb_nilai_ujian ADD COLUMN IF NOT EXISTS total_pelanggaran INT DEFAULT 0;
ALTER TABLE public.tb_nilai_ujian ADD COLUMN IF NOT EXISTS log_pelanggaran JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tb_nilai_ujian ADD COLUMN IF NOT EXISTS status_ujian_siswa VARCHAR(50) DEFAULT 'Selesai';
ALTER TABLE public.tb_nilai_ujian ADD COLUMN IF NOT EXISTS waktu_mulai TIMESTAMPTZ;
ALTER TABLE public.tb_nilai_ujian ADD COLUMN IF NOT EXISTS waktu_selesai TIMESTAMPTZ;

-- ==============================================================================
-- 10. MODUL PRESENSI WAJAH AI (TABEL students & attendances REALTIME)
-- ==============================================================================
-- Bersihkan view lama jika sebelumnya dibuat sebagai view agar tidak konflik (ERROR 42809)
DO $$
BEGIN
    BEGIN
        EXECUTE 'DROP VIEW IF EXISTS public.attendances CASCADE';
        EXECUTE 'DROP VIEW IF EXISTS public.students CASCADE';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.attendances CASCADE';
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.students CASCADE';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- Tabel Master Siswa & Guru untuk Presensi Wajah
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    face_descriptor JSONB,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON public.students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);

-- Tabel Log Presensi Wajah Harian Realtime
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    status TEXT NOT NULL DEFAULT 'Hadir',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()),
    CONSTRAINT unique_student_attendance_per_day UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON public.attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON public.attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_class_name ON public.attendances(class_name);
CREATE INDEX IF NOT EXISTS idx_attendances_date_class ON public.attendances(date, class_name);

CREATE OR REPLACE VIEW public.tb_absensi AS SELECT * FROM public.absensi;
CREATE OR REPLACE VIEW public.tb_inval_guru AS SELECT * FROM public.inval_guru;

-- ==============================================================================
-- 11. KEBIJAKAN KEAMANAN TERLINDUNGI (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
ALTER TABLE public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inval_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_berita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_siswa_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_presensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_soal_ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_jawaban_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_nilai_ujian ENABLE ROW LEVEL SECURITY;

-- Kebijakan Baca Terbuka (SELECT) untuk UI Aplikasi
DROP POLICY IF EXISTS "Baca Siswa Publik" ON public.tb_siswa;
CREATE POLICY "Baca Siswa Publik" ON public.tb_siswa FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Baca Guru Publik" ON public.tb_guru;
CREATE POLICY "Baca Guru Publik" ON public.tb_guru FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Baca Absensi Publik" ON public.absensi;
CREATE POLICY "Baca Absensi Publik" ON public.absensi FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Catat Absensi Publik" ON public.absensi;
CREATE POLICY "Catat Absensi Publik" ON public.absensi FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Baca Settings Publik" ON public.app_settings;
CREATE POLICY "Baca Settings Publik" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Baca Inval Publik" ON public.inval_guru;
CREATE POLICY "Baca Inval Publik" ON public.inval_guru FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Baca Berita Publik" ON public.tb_berita;
CREATE POLICY "Baca Berita Publik" ON public.tb_berita FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Baca Ujian Aktif" ON public.tb_ujian;
CREATE POLICY "Baca Ujian Aktif" ON public.tb_ujian FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Baca Soal Ujian" ON public.tb_soal_ujian;
CREATE POLICY "Baca Soal Ujian" ON public.tb_soal_ujian FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Baca Nilai Ujian" ON public.tb_nilai_ujian;
CREATE POLICY "Baca Nilai Ujian" ON public.tb_nilai_ujian FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Baca Jawaban Ujian" ON public.tb_jawaban_siswa;
CREATE POLICY "Baca Jawaban Ujian" ON public.tb_jawaban_siswa FOR SELECT TO anon, authenticated USING (true);

-- Kebijakan Akses Penuh Khusus Service Role Server (Admin Backend)
DROP POLICY IF EXISTS "Service Role Siswa" ON public.tb_siswa;
CREATE POLICY "Service Role Siswa" ON public.tb_siswa FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Guru" ON public.tb_guru;
CREATE POLICY "Service Role Guru" ON public.tb_guru FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Absensi" ON public.absensi;
CREATE POLICY "Service Role Absensi" ON public.absensi FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Settings" ON public.app_settings;
CREATE POLICY "Service Role Settings" ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Ujian" ON public.tb_ujian;
CREATE POLICY "Service Role Ujian" ON public.tb_ujian FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Soal" ON public.tb_soal_ujian;
CREATE POLICY "Service Role Soal" ON public.tb_soal_ujian FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Jawaban" ON public.tb_jawaban_siswa;
CREATE POLICY "Service Role Jawaban" ON public.tb_jawaban_siswa FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Nilai" ON public.tb_nilai_ujian;
CREATE POLICY "Service Role Nilai" ON public.tb_nilai_ujian FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Inval" ON public.inval_guru;
CREATE POLICY "Service Role Inval" ON public.inval_guru FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Berita" ON public.tb_berita;
CREATE POLICY "Service Role Berita" ON public.tb_berita FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Devices" ON public.tb_siswa_devices;
CREATE POLICY "Service Role Devices" ON public.tb_siswa_devices FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Audit" ON public.audit_log_presensi;
CREATE POLICY "Service Role Audit" ON public.audit_log_presensi FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- 12. REALTIME REPLICATION (SINKRONISASI INSTAN PC & HP)
-- ==============================================================================
DO $$ 
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_siswa;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_guru;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.absensi;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inval_guru;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_berita;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ==============================================================================
-- 13. DATA AWAL (SEED MASTER ADMIN & PEGAWAI RESMI)
-- ==============================================================================

-- Akun Master Admin Utama (Bapak Muhammad Iqbal Rangkuti)
INSERT INTO public.tb_guru (
    id_guru,
    username,
    password,
    nama_guru,
    inisial,
    mapel,
    role,
    biodata
)
VALUES (
    4,
    'iqbal',
    '301020',
    'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
    'IR',
    'Teknik Jaringan Komputer Dan Telekomunikasi (TJKT)',
    'Admin',
    '{"username":"iqbal","role":"Admin","isMaster":true,"nama":"MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.","inisial":"IR"}'::jsonb
)
ON CONFLICT (id_guru) DO UPDATE SET
    username = 'iqbal',
    role = 'Admin';

-- ==============================================================================
-- 14. SEED MASTER SISWA RESMI KELAS XII TJKT (30 SISWA RESMI)
-- ==============================================================================
INSERT INTO public.tb_siswa (id_siswa, nama_siswa, username, password, kelas, jurusan, role, biodata)
VALUES
    (338, 'ADAM FAIRUS AL-FAJRI', 'adam.fairus', 'ypk1842', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "adam.fairus", "nama_siswa": "ADAM FAIRUS AL-FAJRI", "password": "ypk1842", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (339, 'ADITYA PUTRA ANANDA', 'aditya.putra', 'ypk2931', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "aditya.putra", "nama_siswa": "ADITYA PUTRA ANANDA", "password": "ypk2931", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (340, 'AFGAN FAIZ KURNIAWAN', 'afgan.faiz', 'ypk3714', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "afgan.faiz", "nama_siswa": "AFGAN FAIZ KURNIAWAN", "password": "ypk3714", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (341, 'AHMAD REYHAN NASUTION', 'reyhan.nasution', 'ypk4825', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "reyhan.nasution", "nama_siswa": "AHMAD REYHAN NASUTION", "password": "ypk4825", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (342, 'AZRIEL RADITYA', 'azriel', 'ypk5196', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "azriel", "nama_siswa": "AZRIEL RADITYA", "password": "ypk5196", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (343, 'DENNY YUDISTIRAH', 'denny', 'ypk6283', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "denny", "nama_siswa": "DENNY YUDISTIRAH", "password": "ypk6283", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (344, 'DESFITA DAINTI', 'desfita', 'ypk7394', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "desfita", "nama_siswa": "DESFITA DAINTI", "password": "ypk7394", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (345, 'DIMAS SURYA PRATAMA', 'dimas.surya', 'ypk8415', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "dimas.surya", "nama_siswa": "DIMAS SURYA PRATAMA", "password": "ypk8415", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (346, 'FAHRI IKHWAN TANJUNG', 'fahri.ikhwan', 'ypk9526', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "fahri.ikhwan", "nama_siswa": "FAHRI IKHWAN TANJUNG", "password": "ypk9526", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (347, 'GILANG IBRAHIM', 'gilang', 'ypk1637', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "gilang", "nama_siswa": "GILANG IBRAHIM", "password": "ypk1637", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (348, 'ISMI PEBIANA BR GINTING', 'ismi', 'ypk2748', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "ismi", "nama_siswa": "ISMI PEBIANA BR GINTING", "password": "ypk2748", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (349, 'JEPRIUS ZEBUA', 'jeprius', 'ypk3859', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "jeprius", "nama_siswa": "JEPRIUS ZEBUA", "password": "ypk3859", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (350, 'M. FACHRI AKBAR LUBIS', 'fachri.akbar', 'ypk4960', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "fachri.akbar", "nama_siswa": "M. FACHRI AKBAR LUBIS", "password": "ypk4960", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (351, 'M. RHEZA ANANDA', 'rheza', 'ypk5171', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "rheza", "nama_siswa": "M. RHEZA ANANDA", "password": "ypk5171", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (352, 'M. TAUFIK HAWARI', 'taufik.hawari', 'ypk6282', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "taufik.hawari", "nama_siswa": "M. TAUFIK HAWARI", "password": "ypk6282", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (353, 'M. ARIF INDRA', 'arif.indra', 'ypk7393', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "arif.indra", "nama_siswa": "M. ARIF INDRA", "password": "ypk7393", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (354, 'M. RIDHO PRATAMA', 'ridho.pratama', 'ypk8414', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "ridho.pratama", "nama_siswa": "M. RIDHO PRATAMA", "password": "ypk8414", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (355, 'MUHAMMAD IKHSAN', 'm.ikhsan', 'ypk9525', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "m.ikhsan", "nama_siswa": "MUHAMMAD IKHSAN", "password": "ypk9525", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (356, 'MUHAMMAD NAZRIEL', 'nazriel', 'ypk1636', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "nazriel", "nama_siswa": "MUHAMMAD NAZRIEL", "password": "ypk1636", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (357, 'RAMADHAN', 'ramadhan', 'ypk2747', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "ramadhan", "nama_siswa": "RAMADHAN", "password": "ypk2747", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (358, 'NAFIDZ ZHARRIF', 'nafidz', 'ypk3858', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "nafidz", "nama_siswa": "NAFIDZ ZHARRIF", "password": "ypk3858", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (359, 'NANDRA FARERA', 'nandra', 'ypk4969', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "nandra", "nama_siswa": "NANDRA FARERA", "password": "ypk4969", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (360, 'NAOVAL AULIA RAMADHAN', 'naoval', 'ypk5170', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "naoval", "nama_siswa": "NAOVAL AULIA RAMADHAN", "password": "ypk5170", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (361, 'NAZLA RAIHANNY AZURA', 'nazla', 'ypk6281', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "nazla", "nama_siswa": "NAZLA RAIHANNY AZURA", "password": "ypk6281", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (362, 'RADIKA ILHAM', 'radika', 'ypk7392', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "radika", "nama_siswa": "RADIKA ILHAM", "password": "ypk7392", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (363, 'RANGGA FATHIAN', 'rangga', 'ypk8413', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "rangga", "nama_siswa": "RANGGA FATHIAN", "password": "ypk8413", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (364, 'REIFAN AR-FIQRI', 'reifan', 'ypk9524', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "reifan", "nama_siswa": "REIFAN AR-FIQRI", "password": "ypk9524", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (365, 'RENDI PRATAMA SARAGIH', 'rendi.pratama', 'ypk1635', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "rendi.pratama", "nama_siswa": "RENDI PRATAMA SARAGIH", "password": "ypk1635", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (366, 'TIRTA FACHRI ARNATA', 'tirta', 'ypk2746', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "tirta", "nama_siswa": "TIRTA FACHRI ARNATA", "password": "ypk2746", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb),
    (367, 'WILLYAN SYAHPUTRA', 'willyan', 'ypk3857', 'XII TJKT', 'TJKT', 'Siswa', '{"username": "willyan", "nama_siswa": "WILLYAN SYAHPUTRA", "password": "ypk3857", "role": "Siswa", "kelas": "XII TJKT", "jurusan": "TJKT"}'::jsonb)
ON CONFLICT (id_siswa) DO UPDATE SET
    nama_siswa = EXCLUDED.nama_siswa,
    username = COALESCE(tb_siswa.username, EXCLUDED.username),
    password = COALESCE(tb_siswa.password, EXCLUDED.password),
    kelas = EXCLUDED.kelas,
    jurusan = EXCLUDED.jurusan,
    role = EXCLUDED.role,
    biodata = EXCLUDED.biodata;

-- ==============================================================================
-- SELESAI. Salin seluruh skrip di atas dan klik RUN di SQL Editor Supabase.
-- ==============================================================================
