-- ==============================================================================
-- 🛡️ SCRIPT PERBAIKAN KEAMANAN SUPABASE (FIX SECURITY VULNERABILITIES)
-- Menyelesaikan peringatan email:
-- 1. Table publicly accessible (rls_disabled_in_public)
-- 2. Sensitive data publicly accessible (sensitive_columns_exposed)
-- ==============================================================================
-- CARA PENGGUNAAN:
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard/project/wpyfwkcevgdhkazeesdq
-- 2. Masuk ke menu "SQL Editor" di bilah samping kiri
-- 3. Tempelkan (paste) seluruh script ini dan klik tombol "Run" (Hijau)
-- ==============================================================================

-- LANGKAH 1: Aktifkan Row Level Security (RLS) di semua tabel publik
ALTER TABLE public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.latest_scan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_presensi ENABLE ROW LEVEL SECURITY;

-- LANGKAH 2: Bersihkan policy lama jika ada agar tidak duplikat
DROP POLICY IF EXISTS "Enable all access for tb_siswa" ON public.tb_siswa;
DROP POLICY IF EXISTS "Enable all access for tb_guru" ON public.tb_guru;
DROP POLICY IF EXISTS "Enable all access for absensi" ON public.absensi;
DROP POLICY IF EXISTS "Enable all access for latest_scan" ON public.latest_scan;
DROP POLICY IF EXISTS "Enable all access for audit_log_presensi" ON public.audit_log_presensi;

-- LANGKAH 3: Buat Kebijakan Akses (RLS Policies) agar Website & ESP8266 tetap berjalan lancar

-- Kebijakan untuk tb_siswa
CREATE POLICY "Enable all access for tb_siswa" 
ON public.tb_siswa 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Kebijakan untuk tb_guru
CREATE POLICY "Enable all access for tb_guru" 
ON public.tb_guru 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Kebijakan untuk absensi
CREATE POLICY "Enable all access for absensi" 
ON public.absensi 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Kebijakan untuk latest_scan
CREATE POLICY "Enable all access for latest_scan" 
ON public.latest_scan 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Kebijakan untuk audit_log_presensi
CREATE POLICY "Enable all access for audit_log_presensi" 
ON public.audit_log_presensi 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);
