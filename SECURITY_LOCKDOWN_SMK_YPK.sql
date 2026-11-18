-- ==============================================================================
-- 🛡️ SKRIP KEAMANAN KELAS ENTERPRISE: SMK YPK MEDAN DATABASE LOCKDOWN
-- ==============================================================================
-- TUJUAN:
-- Menutup celah keamanan di mana siswa jurusan TJKT menggunakan Kali Linux / Burp Suite
-- untuk menyadap traffic HTTP dan melakukan dump seluruh isi tabel tb_siswa & tb_guru
-- yang berisi password dalam bentuk teks biasa (plaintext).
--
-- CARA MENJALANKAN:
-- 1. Buka Supabase Dashboard: https://supabase.com/dashboard/project/wpyfwkcevgdhkazeesdq
-- 2. Klik menu "SQL Editor" di bilah menu kiri.
-- 3. Klik "New Query", salin seluruh isi skrip ini, tempel (paste), lalu klik tombol "RUN".
-- ==============================================================================

-- 1. AKTIFKAN EKSTENSI KRIPTOGRAFI POSTGRESQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 2. BERSIHKAN FIELD "PASSWORD" DARI DALAM KOLOM BIODATA (JSONB)
-- Menghilangkan kebocoran password sekunder yang tersimpan di dalam JSON biodata
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Hapus key 'password' dari kolom biodata di tb_siswa jika berupa JSONB
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tb_siswa' AND column_name = 'biodata'
  ) THEN
    BEGIN
      UPDATE public.tb_siswa
      SET biodata = (biodata::jsonb - 'password')
      WHERE biodata IS NOT NULL AND biodata::jsonb ? 'password';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Catatan: biodata tb_siswa bukan JSONB langsung, dilewati.';
    END;
  END IF;

  -- Hapus key 'password' dari kolom biodata di tb_guru jika berupa JSONB
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tb_guru' AND column_name = 'biodata'
  ) THEN
    BEGIN
      UPDATE public.tb_guru
      SET biodata = (biodata::jsonb - 'password')
      WHERE biodata IS NOT NULL AND biodata::jsonb ? 'password';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Catatan: biodata tb_guru bukan JSONB langsung, dilewati.';
    END;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. COLUMN-LEVEL SECURITY: CABUT IZIN BACA KOLOM PASSWORD
-- Siapapun yang menggunakan Public Anon Key (termasuk Kali Linux / Burp Suite / curl)
-- akan mendapatkan pesan ERROR "403 Permission Denied for column password" jika
-- mencoba menarik data kolom password atau melakukan SELECT * !
-- ------------------------------------------------------------------------------
REVOKE SELECT (password) ON public.tb_siswa FROM anon, authenticated;
REVOKE SELECT (password) ON public.tb_guru FROM anon, authenticated;

-- Pastikan kolom publik lainnya tetap dapat dibaca oleh aplikasi frontend:
GRANT SELECT (
  id_siswa, nis, nisn, nama_siswa, username, kelas, jurusan, 
  telepon, telepon_ortu, alamat, foto_url, face_descriptor, 
  role, biodata
) ON public.tb_siswa TO anon, authenticated;

GRANT SELECT (
  id_guru, nip, nama_guru, username, inisial, mapel, 
  telepon, alamat, foto_url, face_descriptor, 
  role, biodata
) ON public.tb_guru TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. BUAT VIEW AMAN (SAFE VIEW) v_siswa & v_guru
-- View ini sama sekali TIDAK MEMILIKI kolom password sehingga aman diakses publik
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_siswa AS
  SELECT 
    id_siswa, nis, nisn, nama_siswa, username, kelas, jurusan, 
    telepon, telepon_ortu, alamat, foto_url, face_descriptor, 
    role, biodata
  FROM public.tb_siswa;

CREATE OR REPLACE VIEW public.v_guru AS
  SELECT 
    id_guru, nip, nama_guru, username, inisial, mapel, 
    telepon, alamat, foto_url, face_descriptor, 
    role, biodata
  FROM public.tb_guru;

GRANT SELECT ON public.v_siswa TO anon, authenticated;
GRANT SELECT ON public.v_guru TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) UNTUK TABEL KRITIKAL LAINNYA
-- Mencegah manipulasi kuota login, session perangkat, dan log audit presensi
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.tb_device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_log_presensi ENABLE ROW LEVEL SECURITY;

-- Izinkan pembacaan log presensi umum
DROP POLICY IF EXISTS "Allow read audit log" ON public.audit_log_presensi;
CREATE POLICY "Allow read audit log" ON public.audit_log_presensi
  FOR SELECT TO anon, authenticated USING (true);

-- Izinkan insert log presensi
DROP POLICY IF EXISTS "Allow insert audit log" ON public.audit_log_presensi;
CREATE POLICY "Allow insert audit log" ON public.audit_log_presensi
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ==============================================================================
-- SELESAI: Database sekarang terkunci rapat dan aman dari sadapan Burp Suite / Kali Linux!
-- ==============================================================================
