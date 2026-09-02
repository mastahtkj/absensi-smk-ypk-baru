-- ==============================================================================
-- 📢 TABEL BERITA & PENGUMUMAN SEKOLAH (SMK YPK SUPER APP)
-- Mengatasi sinkronisasi berita agar otomatis muncul di HP & Laptop secara realtime
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tb_berita (
    id VARCHAR(100) PRIMARY KEY,
    judul TEXT NOT NULL,
    kategori VARCHAR(100) DEFAULT 'Penting',
    ringkasan TEXT,
    konten TEXT,
    gambar_url TEXT,
    penulis VARCHAR(255) DEFAULT 'SMK YPK MEDAN',
    tanggal VARCHAR(100),
    target_audience VARCHAR(100) DEFAULT 'Semua',
    badge_color VARCHAR(50) DEFAULT '#2563eb',
    send_notification BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔍 INDEXING UNTUK QUERY CEPAT
CREATE INDEX IF NOT EXISTS idx_berita_created_at ON public.tb_berita(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_berita_target ON public.tb_berita(target_audience);

-- 🛡️ KEAMANAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.tb_berita ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tb_berita TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Enable all access for tb_berita" ON public.tb_berita;
CREATE POLICY "Enable all access for tb_berita" 
ON public.tb_berita FOR ALL 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);

-- 📰 INSERT BERITA AKTIF BIMSIMA SMK YPK MEDAN
INSERT INTO public.tb_berita (
  id,
  judul,
  kategori,
  ringkasan,
  konten,
  gambar_url,
  penulis,
  tanggal,
  target_audience,
  badge_color,
  send_notification
)
VALUES (
  'news-bimsima-2026',
  'SMK YPK MEDAN - BIMSIMA SMK YPK MEDAN (Bimbingan Siswa Mengenal Allah)',
  'Kegiatan Sekolah',
  'Program pembinaan karakter dan bimbingan rohani Islami untuk membentuk kepribadian mulia siswa/i SMK YPK MEDAN.',
  'Program BIMSIMA SMK YPK MEDAN (Bimbingan Siswa Mengenal Allah) merupakan kegiatan rutin pembinaan keagamaan dan karakter religius siswa/i SMK YPK Medan agar senantiasa berakhlak mulia, disiplin, dan berprestasi.',
  '',
  'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.!',
  'Rabu, 2 Sep 2026',
  'Semua',
  '#2563eb',
  true
)
ON CONFLICT (id) DO UPDATE 
SET 
  judul = EXCLUDED.judul,
  kategori = EXCLUDED.kategori,
  ringkasan = EXCLUDED.ringkasan,
  konten = EXCLUDED.konten,
  penulis = EXCLUDED.penulis,
  tanggal = EXCLUDED.tanggal,
  target_audience = EXCLUDED.target_audience;
