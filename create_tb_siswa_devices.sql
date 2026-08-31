-- ==============================================================================
-- 🚀 SUPABASE SQL MIGRATION: TABEL PEMBATASAN 2 PERANGKAT LOGIN SISWA
-- ==============================================================================

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

-- Indeks performa tinggi
CREATE INDEX IF NOT EXISTS idx_siswa_devices_id_siswa ON public.tb_siswa_devices (id_siswa);
CREATE INDEX IF NOT EXISTS idx_siswa_devices_uid_rfid ON public.tb_siswa_devices (uid_rfid);
CREATE INDEX IF NOT EXISTS idx_siswa_devices_device_id ON public.tb_siswa_devices (device_id);

-- RLS (Row Level Security) - Izinkan baca & tulis untuk anon / service
ALTER TABLE public.tb_siswa_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access for tb_siswa_devices" ON public.tb_siswa_devices;
CREATE POLICY "Allow public access for tb_siswa_devices" 
ON public.tb_siswa_devices FOR ALL 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);
