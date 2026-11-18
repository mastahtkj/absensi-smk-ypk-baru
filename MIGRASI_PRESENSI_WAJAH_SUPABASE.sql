-- ==============================================================================
-- 🚀 SKRIP MIGRASI DATABASE SUPABASE: SISTEM ABSENSI WAJAH SISWA REALTIME
-- Proyek: SMK YPK MEDAN - Presensi Biometrik Wajah AI (Client-Side Face-api.js)
-- ==============================================================================
-- Petunjuk:
-- 1. Buka Dashboard Supabase Anda (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Buka menu "SQL Editor" di bilah kiri
-- 3. Paste seluruh isi script SQL ini, lalu klik tombol "RUN" (Ctrl+Enter)
-- ==============================================================================

-- 1. AKTIFKAN EXTENSION UUID (JIKA BELUM AKTIF)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. BERSIHKAN VIEW LAMA (JIKA SEBELUMNYA PERNAH DIBUAT SEBAGAI VIEW)
-- Mengatasi: ERROR 42809: cannot create index on relation "attendances" (not supported for views)
-- ==============================================================================
DROP VIEW IF EXISTS public.attendances CASCADE;
DROP VIEW IF EXISTS public.students CASCADE;

-- ==============================================================================
-- 3. TABEL: students (Data Siswa & Vektor Biometrik Wajah)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    face_descriptor JSONB, -- Array 128 float hasil ekstraksi face-api.js
    photo_url TEXT,         -- Foto snapshot pendaftaran wajah / URL avatar
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

-- Indeks performa pencarian siswa
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON public.students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);

-- Komentar Tabel
COMMENT ON TABLE public.students IS 'Tabel data induk siswa dan vektor 128 float face_descriptor biometrik wajah';
COMMENT ON COLUMN public.students.face_descriptor IS 'Menyimpan array 128 Float32 hasil faceRecognitionNet dari face-api.js dalam format JSON';

-- ==============================================================================
-- 4. TABEL: attendances (Log Presensi Siswa Realtime)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    status TEXT NOT NULL DEFAULT 'Hadir',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()),
    
    -- Constraint pencegah absensi ganda pada hari yang sama untuk siswa yang sama
    CONSTRAINT unique_student_attendance_per_day UNIQUE (student_id, date)
);

-- Indeks performa query log presensi harian
CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON public.attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON public.attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_class_name ON public.attendances(class_name);
CREATE INDEX IF NOT EXISTS idx_attendances_date_class ON public.attendances(date, class_name);

-- Komentar Tabel
COMMENT ON TABLE public.attendances IS 'Tabel catatan presensi kehadiran wajah siswa per hari';

-- ==============================================================================
-- 5. KEAMANAN & ROW LEVEL SECURITY (RLS)
-- Mengizinkan browser sekolah (Client Anon) membaca dan menulis presensi
-- ==============================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Policy untuk tabel students (Bisa diakses anon & authenticated)
DROP POLICY IF EXISTS "Akses Penuh Siswa untuk Publik/Sekolah" ON public.students;
CREATE POLICY "Akses Penuh Siswa untuk Publik/Sekolah"
ON public.students
FOR ALL
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

-- Policy untuk tabel attendances (Bisa dibaca dan dicatat oleh aplikasi presensi)
DROP POLICY IF EXISTS "Akses Penuh Presensi untuk Publik/Sekolah" ON public.attendances;
CREATE POLICY "Akses Penuh Presensi untuk Publik/Sekolah"
ON public.attendances
FOR ALL
TO public, anon, authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 6. AKTIFKAN SUPABASE REALTIME REPLICATION
-- Agar log kehadiran di monitor kelas ter-update otomatis secara seketika (Reactive)
-- ==============================================================================
DO $$
BEGIN
    -- Tambahkan tabel attendances ke publication supabase_realtime
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendances'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendances;
    END IF;

    -- Tambahkan tabel students ke publication supabase_realtime
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'students'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
    END IF;
END $$;

-- Set replica identity penuh agar payload update/delete realtime lengkap
ALTER TABLE public.attendances REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;

-- ==============================================================================
-- 7. OPSIONAL: SINKRONISASI OTOMATIS DARI TABEL tb_siswa (SMK YPK MEDAN)
-- Script berikut akan menyalin seluruh siswa dari tb_siswa yang ada ke tabel students
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tb_siswa') THEN
        INSERT INTO public.students (nisn, name, class_name, photo_url)
        SELECT 
            COALESCE(s.nisn, s.nis, s.id_siswa::text) AS nisn,
            COALESCE(s.nama_siswa, 'Siswa SMK YPK') AS name,
            COALESCE(s.kelas, 'Umum') AS class_name,
            COALESCE(s.foto_url, '/logo.png') AS photo_url
        FROM public.tb_siswa s
        WHERE s.nama_siswa IS NOT NULL
        ON CONFLICT (nisn) DO NOTHING;
    END IF;
END $$;

-- Konfirmasi Selesai
SELECT 
    'BERHASIL: Tabel students & attendances beserta Realtime Supabase siap digunakan!' AS status,
    (SELECT COUNT(*) FROM public.students) AS total_siswa_terdaftar;
