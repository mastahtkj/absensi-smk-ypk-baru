-- ==============================================================================
-- 🚀 SUPABASE SQL MIGRATION: SISTEM PRESENSI DIGITAL SMK YPK MEDAN
-- ==============================================================================

-- 1. Tambahkan kolom pendukung di tabel absensi jika belum ada
-- Status tipe: 'masuk' (Tap 1), 'sudah_presensi' (Tap 2: Info Anda Sudah Presensi), 'pulang_selesai' (Tap 3: Pulang)
ALTER TABLE public.absensi 
ADD COLUMN IF NOT EXISTS tipe character varying DEFAULT 'masuk',
ADD COLUMN IF NOT EXISTS jam_masuk character varying,
ADD COLUMN IF NOT EXISTS jam_pulang character varying,
ADD COLUMN IF NOT EXISTS durasi_menit integer,
ADD COLUMN IF NOT EXISTS no_wa_tujuan character varying,
ADD COLUMN IF NOT EXISTS alasan text,
ADD COLUMN IF NOT EXISTS surat_nama character varying,
ADD COLUMN IF NOT EXISTS surat_url text,
ADD COLUMN IF NOT EXISTS materi_nama character varying,
ADD COLUMN IF NOT EXISTS materi_url text,
ADD COLUMN IF NOT EXISTS keterangan_materi text;

-- 2. Pastikan Data Guru Yenni dan Dede Dermawan memiliki format UID & Nama yang bersih
UPDATE public.tb_guru 
SET nama_guru = 'YENNI, SE', inisial = 'YN', uid_rfid = 'DB1FD705'
WHERE id_guru = 4 OR LOWER(username) = 'yenni' OR uid_rfid ILIKE '%DB1FD705%';

UPDATE public.tb_guru 
SET nama_guru = 'DEDE DERMAWAN LENAR, S.PD., Gr.', inisial = 'DD', uid_rfid = 'D916D905'
WHERE id_guru = 9 OR LOWER(username) = 'dede' OR uid_rfid ILIKE '%D916D905%';

-- 3. Indeks untuk mempercepat pencarian UID dan Waktu (Optimalisasi Kecepatan Server & 60 FPS)
CREATE INDEX IF NOT EXISTS idx_absensi_created_at ON public.absensi (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_absensi_rfid_uid ON public.absensi (rfid_uid);
CREATE INDEX IF NOT EXISTS idx_siswa_uid ON public.tb_siswa (uid_rfid);
CREATE INDEX IF NOT EXISTS idx_guru_uid ON public.tb_guru (uid_rfid);

-- 4. Tabel Pembatasan 2 Perangkat Login Akun Siswa (HP Siswa & HP Orang Tua)
CREATE TABLE IF NOT EXISTS public.tb_siswa_devices (
    id bigserial PRIMARY KEY,
    id_siswa integer,
    uid_rfid character varying,
    nama_siswa character varying,
    device_id character varying NOT NULL,
    device_name character varying,
    last_login timestamptz DEFAULT timezone('Asia/Jakarta'::text, now()),
    created_at timestamptz DEFAULT timezone('Asia/Jakarta'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_siswa_devices_id_siswa ON public.tb_siswa_devices (id_siswa);
CREATE INDEX IF NOT EXISTS idx_siswa_devices_uid_rfid ON public.tb_siswa_devices (uid_rfid);
CREATE INDEX IF NOT EXISTS idx_siswa_devices_device_id ON public.tb_siswa_devices (device_id);

ALTER TABLE public.tb_siswa_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for tb_siswa_devices" ON public.tb_siswa_devices;
CREATE POLICY "Allow public access for tb_siswa_devices" 
ON public.tb_siswa_devices FOR ALL 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);

