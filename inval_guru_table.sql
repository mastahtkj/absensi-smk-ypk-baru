-- ==============================================================
-- 📋 TABEL INVAL GURU (GURU PENGGANTI / GURU PIKET) SMK YPK MEDAN
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.tb_inval_guru (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tanggal DATE DEFAULT CURRENT_DATE,
    id_guru_utama BIGINT,
    nama_guru_utama VARCHAR(255) NOT NULL,
    id_guru_inval BIGINT,
    nama_guru_inval VARCHAR(255) NOT NULL,
    kelas VARCHAR(100) NOT NULL,
    mapel VARCHAR(150),
    jam_ke VARCHAR(100),
    materi_nama VARCHAR(255),
    materi_url TEXT,
    keterangan_tugas TEXT,
    status_inval VARCHAR(50) DEFAULT 'Ditugaskan', -- 'Ditugaskan', 'Sedang Berjalan', 'Selesai'
    assigned_by VARCHAR(100) DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk kecepatan query
CREATE INDEX IF NOT EXISTS idx_inval_tanggal ON public.tb_inval_guru(tanggal);
CREATE INDEX IF NOT EXISTS idx_inval_guru_utama ON public.tb_inval_guru(nama_guru_utama);
CREATE INDEX IF NOT EXISTS idx_inval_guru_inval ON public.tb_inval_guru(nama_guru_inval);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.tb_inval_guru ENABLE ROW LEVEL SECURITY;

-- Berikan izin akses penuh ke anon dan authenticated
GRANT ALL ON public.tb_inval_guru TO anon, authenticated, service_role;

-- Policy universal untuk membaca dan menulis data inval
DROP POLICY IF EXISTS "Universal access for tb_inval_guru" ON public.tb_inval_guru;
CREATE POLICY "Universal access for tb_inval_guru" ON public.tb_inval_guru
    FOR ALL
    USING (true)
    WITH CHECK (true);
