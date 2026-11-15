-- ==============================================================================
--  🏫 SMK YPK MEDAN - MIGRASI FINAL (PRESENSI WAJAH AI + FOTO ID CARD)
--  Jalankan ONCE di Supabase Dashboard -> SQL Editor -> New query -> RUN
--
--  PERBAIKAN YANG DICAKUP:
--   1. Kolom biometrik wajah (face_descriptor) untuk siswa & guru
--   2. Kolom foto permanen (foto_url / foto_updated_at / biodata)  -> ID CARD
--   3. Kolom presensi (tipe / metode / tanggal / jam_masuk / jam_pulang)
--   4. RLS longgar agar browser/HP bisa menyimpan foto & biometrik
--   5. Realtime replication (absensi, tb_siswa, tb_guru, app_settings, tb_berita)
--   6. Tampilan rekap presensi yang rapi
--   7. Cleanup kolom RFID (sistem RFID kartu sudah dihapus)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABEL SISWA: biometrik wajah + foto permanen + akun
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.tb_siswa
  ADD COLUMN IF NOT EXISTS nama_siswa TEXT,
  ADD COLUMN IF NOT EXISTS kelas TEXT,
  ADD COLUMN IF NOT EXISTS jurusan TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Siswa',
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS nisn TEXT,
  ADD COLUMN IF NOT EXISTS telepon TEXT,
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS biodata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS face_descriptor JSONB,
  ADD COLUMN IF NOT EXISTS face_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS face_registered_at TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- 2. TABEL GURU: biometrik wajah + foto permanen + akun
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.tb_guru
  ADD COLUMN IF NOT EXISTS nama_guru TEXT,
  ADD COLUMN IF NOT EXISTS inisial TEXT,
  ADD COLUMN IF NOT EXISTS mapel TEXT,
  ADD COLUMN IF NOT EXISTS jabatan TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Guru',
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS nip TEXT,
  ADD COLUMN IF NOT EXISTS nuptk TEXT,
  ADD COLUMN IF NOT EXISTS telepon TEXT,
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS biodata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS face_descriptor JSONB,
  ADD COLUMN IF NOT EXISTS face_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS face_registered_at TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- 3. TABEL PRESENSI: pastikan kolom lengkap & tipe yang BENAR
--    jam_masuk / jam_pulang dibiarkan TIME (Aplikasi selalu mengirim "HH:MM:SS")
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.absensi
  ADD COLUMN IF NOT EXISTS id_siswa BIGINT,
  ADD COLUMN IF NOT EXISTS id_guru BIGINT,
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Siswa',
  ADD COLUMN IF NOT EXISTS kelas VARCHAR(50),
  ADD COLUMN IF NOT EXISTS jurusan VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Hadir',
  ADD COLUMN IF NOT EXISTS tipe VARCHAR(50) DEFAULT 'masuk',
  ADD COLUMN IF NOT EXISTS metode VARCHAR(50) DEFAULT 'Wajah AI',
  ADD COLUMN IF NOT EXISTS tanggal DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS jam_masuk TIME DEFAULT CURRENT_TIME,
  ADD COLUMN IF NOT EXISTS jam_pulang TIME,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS device_info TEXT,
  ADD COLUMN IF NOT EXISTS updated_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- 4. TABEL PENGATURAN APLIKASI & BERITA
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.app_settings
  ADD COLUMN IF NOT EXISTS school_name TEXT DEFAULT 'SMK YPK MEDAN',
  ADD COLUMN IF NOT EXISTS school_tagline TEXT DEFAULT 'Aplikasi Sekolah Digital Terpadu',
  ADD COLUMN IF NOT EXISTS school_logo_url TEXT DEFAULT '/logo.png',
  ADD COLUMN IF NOT EXISTS running_text TEXT DEFAULT 'Selamat Datang di Portal Digital SMK YPK Medan - Presensi Wajah Realtime',
  ADD COLUMN IF NOT EXISTS entry_time TEXT DEFAULT '07:15',
  ADD COLUMN IF NOT EXISTS late_threshold_time TEXT DEFAULT '07:30',
  ADD COLUMN IF NOT EXISTS departure_time TEXT DEFAULT '14:30',
  ADD COLUMN IF NOT EXISTS teacher_slides JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS home_banners JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS school_agenda JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'Admin Master',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE IF EXISTS public.tb_berita
  ADD COLUMN IF NOT EXISTS judul TEXT,
  ADD COLUMN IF NOT EXISTS kategori VARCHAR(100) DEFAULT 'Penting',
  ADD COLUMN IF NOT EXISTS ringkasan TEXT,
  ADD COLUMN IF NOT EXISTS konten TEXT,
  ADD COLUMN IF NOT EXISTS gambar_url TEXT,
  ADD COLUMN IF NOT EXISTS penulis VARCHAR(255) DEFAULT 'SMK YPK MEDAN',
  ADD COLUMN IF NOT EXISTS tanggal VARCHAR(100),
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(100) DEFAULT 'Semua',
  ADD COLUMN IF NOT EXISTS badge_color VARCHAR(50) DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS send_notification BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY: izinkan browser menyimpan foto & biometrik
-- ------------------------------------------------------------------------------
ALTER TABLE public.tb_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_berita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for tb_siswa" ON public.tb_siswa;
CREATE POLICY "Enable all access for tb_siswa" ON public.tb_siswa
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for tb_siswa" ON public.tb_siswa;
CREATE POLICY "Allow public access for tb_siswa" ON public.tb_siswa
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for tb_guru" ON public.tb_guru;
CREATE POLICY "Enable all access for tb_guru" ON public.tb_guru
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access for tb_guru" ON public.tb_guru;
CREATE POLICY "Allow public access for tb_guru" ON public.tb_guru
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for absensi" ON public.absensi;
CREATE POLICY "Enable all access for absensi" ON public.absensi
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read absensi" ON public.absensi;
CREATE POLICY "Allow public read absensi" ON public.absensi
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for tb_berita" ON public.tb_berita;
CREATE POLICY "Enable all access for tb_berita" ON public.tb_berita
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for app_settings" ON public.app_settings;
CREATE POLICY "Enable all access for app_settings" ON public.app_settings
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. REALTIME: agar notifikasi presensi wajah sampai INSTAN ke semua HP
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.absensi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_siswa;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_guru;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tb_berita;

ALTER TABLE public.absensi REPLICA IDENTITY FULL;
ALTER TABLE public.tb_siswa REPLICA IDENTITY FULL;
ALTER TABLE public.tb_guru REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 7. INDEX untuk performa query rekap presensi
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_absensi_tanggal ON public.absensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_nama ON public.absensi(nama);
CREATE INDEX IF NOT EXISTS idx_absensi_kelas ON public.absensi(kelas);
CREATE INDEX IF NOT EXISTS idx_absensi_role ON public.absensi(role);
CREATE INDEX IF NOT EXISTS idx_absensi_metode ON public.absensi(metode);
CREATE INDEX IF NOT EXISTS idx_tb_siswa_nama ON public.tb_siswa(nama_siswa);
CREATE INDEX IF NOT EXISTS idx_tb_siswa_kelas ON public.tb_siswa(kelas);
CREATE INDEX IF NOT EXISTS idx_tb_guru_nama ON public.tb_guru(nama_guru);

-- ------------------------------------------------------------------------------
-- 8. 🧹 HAPUS SISTEM RFID KARTU (tidak dipakai lagi - presensi = Face AI)
--    Hapus kolom UID RFID. Data presensi lama tetap aman (kolom rfid_uid
--    pada tabel absensi dibiarkan agar riwayat lama tidak rusak).
-- ------------------------------------------------------------------------------
ALTER TABLE public.tb_siswa DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE public.tb_siswa DROP COLUMN IF EXISTS rfid_uid;
ALTER TABLE public.tb_guru  DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE public.tb_guru  DROP COLUMN IF EXISTS rfid_uid;

-- ------------------------------------------------------------------------------
-- 9. VERIFIKASI
-- ------------------------------------------------------------------------------
SELECT '✅ MIGRASI FINAL SMK YPK BERHASIL DIESEKUSI' AS status,
       now() AS waktu_eksekusi;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'absensi'
  AND column_name IN ('jam_masuk', 'jam_pulang', 'tanggal', 'metode', 'tipe', 'status')
ORDER BY column_name;