-- ==============================================================================
-- 🏛️ SISTEM DATABASE MASTER RESMI SMK YPK MEDAN (SUPABASE CLOUD)
-- Project ID: wpyfwkcevgdhkazeesdq
-- Fitur: Face Recognition AI (128-D), Presensi Siswa/Guru/Pegawai, Roster, CBT, Inval
-- ==============================================================================
-- PETUNJUK PENGGUNAAN:
-- 1. Buka Supabase Dashboard > Pilih Proyek Anda (wpyfwkcevgdhkazeesdq)
-- 2. Klik menu "SQL Editor" di bilah kiri
-- 3. Klik "+ New query"
-- 4. Tempel seluruh isi skrip ini lalu klik tombol "RUN" (Hijau)
-- ==============================================================================

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

-- Pastikan kolom RFID dihapus permanen karena beralih 100% ke Face Recognition Biometrik
ALTER TABLE public.tb_siswa DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE public.tb_siswa DROP COLUMN IF EXISTS rfid_uid;

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
    face_descriptor JSONB, -- Array 128 Float Vektor Biometrik Wajah Guru & Pegawai
    biodata JSONB DEFAULT '{}'::jsonb,
    role VARCHAR(50) DEFAULT 'Guru', -- 'Guru', 'Pegawai', 'Staf', 'Admin'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pastikan kolom RFID guru dihapus permanen
ALTER TABLE public.tb_guru DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE public.tb_guru DROP COLUMN IF EXISTS rfid_uid;

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
    status VARCHAR(50) NOT NULL DEFAULT 'Hadir', -- 'Hadir', 'Terlambat', 'Izin', 'Sakit'
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_masuk TIME NOT NULL DEFAULT CURRENT_TIME,
    jam_pulang TIME,
    metode VARCHAR(50) DEFAULT 'Wajah AI', -- 'Wajah AI', 'Manual', 'RFID'
    foto_url TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
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
    running_text TEXT DEFAULT 'Selamat Datang di Portal Digital SMK YPK Medan - Presensi Wajah Realtime',
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
    feature_cbt_active BOOLEAN DEFAULT true,
    feature_inval_active BOOLEAN DEFAULT true,
    feature_library_active BOOLEAN DEFAULT true,
    feature_mading_active BOOLEAN DEFAULT true,
    feature_audio_bell_active BOOLEAN DEFAULT true,
    feature_chat_all_active BOOLEAN DEFAULT true,
    updated_by TEXT DEFAULT 'Admin Master',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inisialisasi baris konfigurasi jika belum ada
INSERT INTO public.app_settings (id, school_name, school_tagline)
VALUES ('school_config', 'SMK YPK MEDAN', 'Aplikasi Sekolah Digital Terpadu')
ON CONFLICT (id) DO NOTHING;

-- 5. TABEL INVAL GURU (inval_guru)
CREATE TABLE IF NOT EXISTS public.inval_guru (
    id BIGSERIAL PRIMARY KEY,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    nama_guru_tidak_hadir VARCHAR(255) NOT NULL,
    nama_guru_pengganti VARCHAR(255) NOT NULL,
    kelas VARCHAR(50) NOT NULL,
    jam_ke VARCHAR(50),
    mata_pelajaran VARCHAR(150),
    tugas TEXT,
    status_inval VARCHAR(50) DEFAULT 'Menunggu', -- 'Menunggu', 'Berjalan', 'Selesai'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABEL MADING & BERITA SEKOLAH (tb_berita)
CREATE TABLE IF NOT EXISTS public.tb_berita (
    id BIGSERIAL PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    konten TEXT NOT NULL,
    penulis VARCHAR(100) DEFAULT 'Admin SMK YPK',
    kategori VARCHAR(100) DEFAULT 'Pengumuman',
    gambar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABEL PERANGKAT SESI SISWA (tb_siswa_devices)
CREATE TABLE IF NOT EXISTS public.tb_siswa_devices (
    id BIGSERIAL PRIMARY KEY,
    id_siswa BIGINT,
    nama_siswa VARCHAR(255),
    device_id VARCHAR(255) UNIQUE,
    device_model VARCHAR(255),
    last_active TIMESTAMPTZ DEFAULT now()
);

-- 8. TABEL AUDIT LOG PRESENSI (audit_log_presensi)
CREATE TABLE IF NOT EXISTS public.audit_log_presensi (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    user_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TABEL SCANNER RFID / HARDWARE REALTIME (latest_scan)
CREATE TABLE IF NOT EXISTS public.latest_scan (
    id INT PRIMARY KEY DEFAULT 1,
    uid VARCHAR(100) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.latest_scan (id, uid) VALUES (1, '')
ON CONFLICT (id) DO NOTHING;

-- 10. TABEL UJIAN CBT DIGITAL
CREATE TABLE IF NOT EXISTS public.tb_ujian (
    id_ujian BIGSERIAL PRIMARY KEY,
    judul_ujian VARCHAR(255) NOT NULL,
    kelas_target VARCHAR(100),
    mata_pelajaran VARCHAR(150),
    durasi_menit INT DEFAULT 60,
    status_ujian VARCHAR(50) DEFAULT 'Draft',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tb_soal_ujian (
    id_soal BIGSERIAL PRIMARY KEY,
    id_ujian BIGINT REFERENCES public.tb_ujian(id_ujian) ON DELETE CASCADE,
    nomor_urut INT,
    pertanyaan TEXT NOT NULL,
    tipe_soal VARCHAR(50) DEFAULT 'pilihan_ganda', -- 'pilihan_ganda' | 'essay'
    pilihan_a TEXT,
    pilihan_b TEXT,
    pilihan_c TEXT,
    pilihan_d TEXT,
    pilihan_e TEXT,
    kunci_jawaban VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS public.tb_jawaban_siswa (
    id_jawaban BIGSERIAL PRIMARY KEY,
    id_ujian BIGINT REFERENCES public.tb_ujian(id_ujian) ON DELETE CASCADE,
    id_siswa BIGINT,
    nama_siswa VARCHAR(255),
    jawaban JSONB,
    nilai_pg INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tb_nilai_ujian (
    id_nilai BIGSERIAL PRIMARY KEY,
    id_ujian BIGINT REFERENCES public.tb_ujian(id_ujian) ON DELETE CASCADE,
    id_siswa BIGINT,
    nama_siswa VARCHAR(255),
    kelas VARCHAR(50),
    skor_akhir NUMERIC(5,2) DEFAULT 0,
    catatan_guru TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 11. VIEW KOMPATIBILITAS (UNTUK INTEGRASI TEMPLATE & KODE LAMA)
-- ==============================================================================
CREATE OR REPLACE VIEW public.students AS 
SELECT 
    id_siswa::text as id,
    nisn,
    nama_siswa as name,
    kelas as class_name,
    face_descriptor,
    foto_url as photo_url,
    created_at
FROM public.tb_siswa;

CREATE OR REPLACE VIEW public.attendances AS 
SELECT 
    id::text as id,
    id_siswa::text as student_id,
    kelas as class_name,
    tanggal as date,
    jam_masuk as time,
    status,
    created_at
FROM public.absensi;

CREATE OR REPLACE VIEW public.tb_absensi AS SELECT * FROM public.absensi;
CREATE OR REPLACE VIEW public.tb_inval_guru AS SELECT * FROM public.inval_guru;

-- ==============================================================================
-- 12. KEBIJAKAN KEAMANAN (ROW LEVEL SECURITY - RLS)
-- Mengizinkan akses penuh bagi browser sekolah (anon & authenticated)
-- ==============================================================================
ALTER TABLE public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inval_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_berita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_siswa_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_presensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.latest_scan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_soal_ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_jawaban_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_nilai_ujian ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses Penuh Siswa" ON public.tb_siswa;
CREATE POLICY "Akses Penuh Siswa" ON public.tb_siswa FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Guru" ON public.tb_guru;
CREATE POLICY "Akses Penuh Guru" ON public.tb_guru FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Absensi" ON public.absensi;
CREATE POLICY "Akses Penuh Absensi" ON public.absensi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Settings" ON public.app_settings;
CREATE POLICY "Akses Penuh Settings" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Inval" ON public.inval_guru;
CREATE POLICY "Akses Penuh Inval" ON public.inval_guru FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Berita" ON public.tb_berita;
CREATE POLICY "Akses Penuh Berita" ON public.tb_berita FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Devices" ON public.tb_siswa_devices;
CREATE POLICY "Akses Penuh Devices" ON public.tb_siswa_devices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Audit" ON public.audit_log_presensi;
CREATE POLICY "Akses Penuh Audit" ON public.audit_log_presensi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Scan" ON public.latest_scan;
CREATE POLICY "Akses Penuh Scan" ON public.latest_scan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh CBT Ujian" ON public.tb_ujian;
CREATE POLICY "Akses Penuh CBT Ujian" ON public.tb_ujian FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh CBT Soal" ON public.tb_soal_ujian;
CREATE POLICY "Akses Penuh CBT Soal" ON public.tb_soal_ujian FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh CBT Jawaban" ON public.tb_jawaban_siswa;
CREATE POLICY "Akses Penuh CBT Jawaban" ON public.tb_jawaban_siswa FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh CBT Nilai" ON public.tb_nilai_ujian;
CREATE POLICY "Akses Penuh CBT Nilai" ON public.tb_nilai_ujian FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 13. REALTIME REPLICATION (SINKRONISASI INSTAN PC & HP)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_siswa;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_guru;
ALTER PUBLICATION supabase_realtime ADD TABLE public.absensi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inval_guru;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_berita;
ALTER PUBLICATION supabase_realtime ADD TABLE public.latest_scan;

-- ==============================================================================
-- 14. DATA AWAL (SEED MASTER ADMIN & PEGAWAI CONTOH)
-- ==============================================================================

-- Akun Master Admin Utama (Bapak Muhammad Iqbal)
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
    29,
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
    password = '301020',
    role = 'Admin';

-- Akun Contoh Guru & Pegawai Sekolah
INSERT INTO public.tb_guru (username, password, nama_guru, inisial, mapel, role, biodata)
VALUES 
    ('guru_tkj', 'guru123', 'Ahmad Surya, S.Kom', 'AS', 'Produktif TJKT', 'Guru', '{"role":"Guru"}'::jsonb),
    ('guru_akl', 'guru123', 'Nurul Hikmah, S.Pd', 'NH', 'Akuntansi Keuangan Lembaga', 'Guru', '{"role":"Guru"}'::jsonb),
    ('pegawai_tu', 'pegawai123', 'Rudi Hermawan', 'RH', 'Kepala Tata Usaha', 'Pegawai', '{"role":"Pegawai"}'::jsonb),
    ('satpam', 'satpam123', 'Bambang Sudrajat', 'BS', 'Keamanan & Pos Piket', 'Pegawai', '{"role":"Pegawai"}'::jsonb)
ON CONFLICT (username) DO NOTHING;

-- Pesan Berita Awal di Mading
INSERT INTO public.tb_berita (judul, konten, penulis, kategori)
VALUES (
    'Selamat Datang di Sistem Presensi Wajah Realtime SMK YPK Medan',
    'Sistem digitalisasi sekolah SMK YPK Medan telah diperbaharui dengan Face Recognition AI Realtime. Presensi dapat dilakukan langsung melalui kamera HP dan layar monitor sekolah secara otomatis.',
    'Admin Master SMK YPK',
    'Pengumuman'
);

-- ==============================================================================
-- SELESAI. Salin seluruh skrip di atas dan klik RUN di SQL Editor Supabase.
-- ==============================================================================
