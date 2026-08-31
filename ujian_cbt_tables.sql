-- ==============================================================
-- 📝 SKRIP TABEL UJIAN CBT (COMPUTER BASED TEST) SMK YPK MEDAN
-- ==============================================================

-- 1. Tabel Paket Ujian
CREATE TABLE IF NOT EXISTS tb_ujian (
  id_ujian BIGSERIAL PRIMARY KEY,
  judul_ujian VARCHAR(255) NOT NULL,
  mata_pelajaran VARCHAR(150) NOT NULL,
  tingkat VARCHAR(50) DEFAULT 'Semua Tingkat',
  jurusan VARCHAR(50) DEFAULT 'Semua Jurusan',
  kelas_target VARCHAR(100) DEFAULT 'Semua Kelas',
  durasi_menit INT DEFAULT 90,
  kkm NUMERIC(5,2) DEFAULT 75.00,
  token_ujian VARCHAR(50) DEFAULT '',
  acak_soal BOOLEAN DEFAULT false,
  tampilkan_nilai BOOLEAN DEFAULT true,
  anti_cheat_enabled BOOLEAN DEFAULT true,
  max_tab_violations INT DEFAULT 3,
  status_ujian VARCHAR(30) DEFAULT 'Aktif', -- 'Aktif', 'Selesai', 'Draft'
  dibuat_oleh VARCHAR(150) DEFAULT 'Guru',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Soal Ujian (30 PG + 5 Essay)
CREATE TABLE IF NOT EXISTS tb_soal_ujian (
  id_soal BIGSERIAL PRIMARY KEY,
  id_ujian BIGINT REFERENCES tb_ujian(id_ujian) ON DELETE CASCADE,
  nomor_soal INT NOT NULL,
  tipe_soal VARCHAR(20) NOT NULL DEFAULT 'PG', -- 'PG' atau 'Essay'
  pertanyaan TEXT NOT NULL,
  gambar_url TEXT DEFAULT '',
  opsi_a TEXT DEFAULT '',
  opsi_b TEXT DEFAULT '',
  opsi_c TEXT DEFAULT '',
  opsi_d TEXT DEFAULT '',
  opsi_e TEXT DEFAULT '',
  kunci_jawaban VARCHAR(10) DEFAULT '', -- 'A','B','C','D','E' atau pedoman essay
  bobot_poin NUMERIC(5,2) DEFAULT 2.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Sesi & Jawaban Ujian Siswa (Hasil CBT & Log Anti-Cheat)
CREATE TABLE IF NOT EXISTS tb_jawaban_siswa (
  id_jawaban BIGSERIAL PRIMARY KEY,
  id_ujian BIGINT REFERENCES tb_ujian(id_ujian) ON DELETE CASCADE,
  id_siswa BIGINT,
  nama_siswa VARCHAR(150) NOT NULL,
  kelas VARCHAR(50) NOT NULL,
  jurusan VARCHAR(50) DEFAULT '',
  nomor_soal INT NOT NULL,
  tipe_soal VARCHAR(20) NOT NULL DEFAULT 'PG',
  jawaban_siswa TEXT DEFAULT '',
  ragu_ragu BOOLEAN DEFAULT false,
  skor_didapat NUMERIC(5,2) DEFAULT 0.00,
  status_koreksi VARCHAR(30) DEFAULT 'Otomatis', -- 'Otomatis', 'Dikoreksi', 'Belum'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Rekapitulasi Nilai Ujian Siswa
CREATE TABLE IF NOT EXISTS tb_nilai_ujian (
  id_nilai BIGSERIAL PRIMARY KEY,
  id_ujian BIGINT REFERENCES tb_ujian(id_ujian) ON DELETE CASCADE,
  id_siswa BIGINT,
  nama_siswa VARCHAR(150) NOT NULL,
  kelas VARCHAR(50) NOT NULL,
  jurusan VARCHAR(50) DEFAULT '',
  nilai_pg NUMERIC(5,2) DEFAULT 0.00,
  nilai_essay NUMERIC(5,2) DEFAULT 0.00,
  total_nilai NUMERIC(5,2) DEFAULT 0.00,
  status_lulus VARCHAR(30) DEFAULT 'Belum Koreksi', -- 'Lulus', 'Remedial', 'Menunggu Koreksi Essay'
  total_pelanggaran INT DEFAULT 0,
  log_pelanggaran JSONB DEFAULT '[]'::jsonb,
  waktu_mulai TIMESTAMPTZ DEFAULT NOW(),
  waktu_selesai TIMESTAMPTZ,
  durasi_pengerjaan_detik INT DEFAULT 0,
  status_ujian_siswa VARCHAR(30) DEFAULT 'Selesai', -- 'Sedang Berlangsung', 'Selesai', 'Didiskualifikasi'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Public Access Policy untuk Kemudahan Sync
ALTER TABLE tb_ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_soal_ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_jawaban_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE tb_nilai_ujian ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for tb_ujian" ON tb_ujian FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for tb_soal_ujian" ON tb_soal_ujian FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for tb_jawaban_siswa" ON tb_jawaban_siswa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for tb_nilai_ujian" ON tb_nilai_ujian FOR ALL USING (true) WITH CHECK (true);
