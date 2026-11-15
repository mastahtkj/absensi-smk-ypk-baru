-- ==============================================================================
--  🏫 SMK YPK MEDAN - MIGRASI FINAL (PRESENSI WAJAH AI + FOTO ID CARD)
--  Jalankan di Supabase Dashboard -> SQL Editor -> New query -> RUN
--
--  ⚠️ SKRIP INI IDEMPOTENT = AMAN DIJALANKAN BERULANG KALI.
--     (Versi lama error: "relation absensi is already member of publication
--      supabase_realtime" -> sekarang dicek dulu sebelum ditambahkan.)
--
--  PERBAIKAN YANG DICAKUP:
--   1. Kolom biometrik wajah (face_descriptor) untuk siswa & guru
--   2. Kolom foto permanen (foto_url / foto_updated_at / biodata) -> ID CARD
--   3. Kolom presensi (tipe / metode / tanggal / jam_masuk / jam_pulang)
--   4. RLS longgar agar browser/HP bisa menyimpan foto & biometrik
--   5. Realtime replication (dilewati otomatis bila sudah ada)
--   6. Index untuk performa rekap presensi
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
-- 3. TABEL PRESENSI: pastikan kolom lengkap
--    jam_masuk / jam_pulang dibiarkan TIME (Aplikasi mengirim "HH:MM:SS")
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
-- 5. ROW LEVEL SECURITY + POLICY PERMISSIVE
--    (DO block: aman walau tabel tidak ada / policy sudah ada)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  pol text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tb_siswa','tb_guru','absensi','tb_berita','app_settings']
  LOOP
    -- Cek tabel benar-benar ada
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind IN ('r','p')
    ) THEN
      RAISE NOTICE 'Tabel public.% tidak ada -> dilewati', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Buang hanya policy milik kita (nama lama); policy lain tetap utuh
    FOREACH pol IN ARRAY ARRAY[
      'Enable all access for ' || t,
      'Allow public access for ' || t,
      'Allow public read ' || t,
      'Allow public insert ' || t,
      'Allow public update ' || t,
      'Akses Penuh Siswa Realtime',
      'Akses Penuh Guru Realtime',
      'Akses Penuh Absensi Realtime'
    ]
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    END LOOP;

    -- Policy permisif (policy lain tetap ada & digabung dengan OR)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true)',
      'smk_ypk_full_access_' || t, t
    );

    RAISE NOTICE 'RLS + policy permisif siap untuk public.%', t;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 6. REALTIME: agar notifikasi presensi wajah sampai INSTAN ke semua HP
--    ⭐ DIJALANKAN HANYA JIKA TABEL BELUM TERDAFTAR di publication.
--       (Inilah yang menyebabkan error "relation absensi is already member of
--        publication supabase_realtime" pada versi skrip sebelumnya.)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Publication supabase_realtime dibuat';
  END IF;
END $$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['absensi','tb_siswa','tb_guru','app_settings','tb_berita','tb_inval_guru']
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind IN ('r','p')
    ) THEN
      RAISE NOTICE 'Realtime: tabel public.% tidak ada -> dilewati', t;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      RAISE NOTICE 'Realtime: public.% sudah terdaftar -> dilewati', t;
    ELSE
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      RAISE NOTICE 'Realtime: public.% ditambahkan', t;
    END IF;

    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $$;

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
--    Data presensi lama tetap aman (kolom rfid_uid pada tabel absensi
--    dibiarkan agar riwayat lama tidak rusak).
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.tb_siswa DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE IF EXISTS public.tb_siswa DROP COLUMN IF EXISTS rfid_uid;
ALTER TABLE IF EXISTS public.tb_guru  DROP COLUMN IF EXISTS uid_rfid;
ALTER TABLE IF EXISTS public.tb_guru  DROP COLUMN IF EXISTS rfid_uid;

-- ------------------------------------------------------------------------------
-- 9. VERIFIKASI (wajib dicek hasilnya)
-- ------------------------------------------------------------------------------
SELECT '✅ MIGRASI FINAL SMK YPK BERHASIL DIESEKUSI' AS status,
       now() AS waktu_eksekusi;

-- 9a. Struktur kolom tabel presensi (jam_masuk & jam_pulang harus = time)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'absensi'
  AND column_name IN ('jam_masuk','jam_pulang','tanggal','metode','tipe','status','role','kelas')
ORDER BY column_name;

-- 9b. Kolom biometrik & foto (harus ada: face_descriptor, foto_url, biodata)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('tb_siswa','tb_guru')
  AND column_name IN ('face_descriptor','face_photo_url','foto_url','foto_updated_at','biodata')
ORDER BY table_name, column_name;

-- 9c. Tabel yang sudah aktif di realtime
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 9d. Policy RLS yang aktif
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('tb_siswa','tb_guru','absensi','tb_berita','app_settings')
ORDER BY tablename, policyname;

-- 9e. Sisa kolom RFID (harus kosong / 0 baris)
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('tb_siswa','tb_guru')
  AND column_name IN ('uid_rfid','rfid_uid');