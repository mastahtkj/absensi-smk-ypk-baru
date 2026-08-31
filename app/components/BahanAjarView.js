'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';

// 📚 5 KATEGORI RESMI PERANGKAT AJAR & KURIKULUM MERDEKA SMK YPK MEDAN
export const PERANGKAT_CATEGORIES = [
  { id: 'administrasi', label: 'Administrasi & Perangkat Pembelajaran', icon: '📑', desc: 'Program Tahunan (Prota), Program Semester (Promes), Silabus, & RPP', adminGuruOnly: true },
  { id: 'kalender_jadwal', label: 'Kalender Pendidikan & Jadwal Pelajaran', icon: '📅', desc: 'Kalender Akademik TP 2026/2027 & Distribusi Jam Mengajar Guru', adminGuruOnly: true },
  { id: 'cp_atp', label: 'Capaian Pembelajaran (CP) & Alur Tujuan (ATP)', icon: '🎯', desc: 'Panduan Capaian Pembelajaran Fase E & F serta Matriks ATP Kejuruan', adminGuruOnly: true },
  { id: 'modul_ajar', label: 'Modul Ajar & Integrasi Profil Pelajar Pancasila', icon: '📘', desc: 'Modul Pembelajaran Berdiferensiasi & Modul Proyek P5 (Dapat Diakses Siswa)', adminGuruOnly: false },
  { id: 'asesmen_diagnostik', label: 'Asesmen Awal & Diagnostik Pemetaan Murid', icon: '📊', desc: 'Instrumen Asesmen Diagnostik Kognitif & Non-Kognitif Siswa', adminGuruOnly: true },
];

const INITIAL_DOCUMENTS = [
  {
    id: 'DOC-1',
    kategori: 'modul_ajar',
    judul: 'Modul Ajar AIJ: Konfigurasi Subnetting & Routing Statis Berdiferensiasi',
    mapel: 'Administrasi Infrastruktur Jaringan (AIJ)',
    tingkat: 'XI',
    kelas_target: 'XI TJKT',
    jurusan: 'TJKT',
    semester: 'Ganjil',
    guru_pengunggah: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
    tipe_file: 'PDF',
    file_name: 'Modul_Ajar_AIJ_Routing_Statis_P5.pdf',
    file_url: '',
    ringkasan: 'Modul ajar lengkap memuat materi konsep IP Addressing, Topologi Jaringan, Langkah Kerja Praktikum Mikrotik, Diferensiasi Konten/Proses, dan Asesmen Formatif P5 (Gotong Royong & Mandiri).',
    created_at: new Date().toISOString(),
  },
  {
    id: 'DOC-2',
    kategori: 'modul_ajar',
    judul: 'Modul Ajar Praktikum Akuntansi Lembaga & Neraca Lajur Berbasis Excel',
    mapel: 'Praktikum Akuntansi Perusahaan Jasa & Dagang',
    tingkat: 'XI',
    kelas_target: 'XI AKL',
    jurusan: 'AKL',
    semester: 'Ganjil',
    guru_pengunggah: 'Dra. Hj. Nuraini',
    tipe_file: 'PDF',
    file_name: 'Modul_Akuntansi_Neraca_Lajur_FaseF.pdf',
    file_url: '',
    ringkasan: 'Modul praktikum akuntansi 10 kolom, laporan laba rugi, neraca saldo penyesuaian, dilengkapi lembar kerja siswa dan studi kasus UMKM Kota Medan.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'DOC-3',
    kategori: 'administrasi',
    judul: 'Program Tahunan (Prota) & Program Semester (Promes) TJKT TP 2026/2027',
    mapel: 'Konsentrasi Keahlian TJKT',
    tingkat: 'XI',
    kelas_target: 'XI TJKT',
    jurusan: 'TJKT',
    semester: 'Ganjil & Genap',
    guru_pengunggah: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
    tipe_file: 'PDF',
    file_name: 'Prota_Promes_TJKT_2026_SMKYPK.pdf',
    file_url: '',
    ringkasan: 'Dokumen administrasi guru memuat pemetaan alokasi jam tatap muka, distribusi materi esensial per semester, dan jadwal evaluasi tengah semester.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'DOC-4',
    kategori: 'kalender_jadwal',
    judul: 'Kalender Pendidikan Resmi SMK YPK Medan & Distribusi Jam Efektif 2026',
    mapel: 'Semua Mata Pelajaran',
    tingkat: 'Semua',
    kelas_target: 'Semua Kelas',
    jurusan: 'Semua',
    semester: 'Ganjil 2026',
    guru_pengunggah: 'Wakil Kepala Sekolah Kurikulum',
    tipe_file: 'PDF',
    file_name: 'Kalender_Akademik_SMKYPK_2026_2027.pdf',
    file_url: '',
    ringkasan: 'Kalender akademik resmi SMK YPK Medan memuat agenda PTS, PAS, UKK, Ujian Asesmen Nasional, Libur Nasional, dan Pekan Efektif Belajar.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'DOC-5',
    kategori: 'cp_atp',
    judul: 'Alur Tujuan Pembelajaran (ATP) Konsentrasi Keahlian Bisnis Digital & PM',
    mapel: 'Pemasaran & Bisnis Digital',
    tingkat: 'X',
    kelas_target: 'X PM',
    jurusan: 'PM',
    semester: 'Ganjil',
    guru_pengunggah: 'Ahmad Fauzi, S.E',
    tipe_file: 'PDF',
    file_name: 'ATP_Bisnis_Digital_FaseE_SMKYPK.pdf',
    file_url: '',
    ringkasan: 'Rincian capaian pembelajaran elemen pemasaran digital, copywriting, digital branding, dan alur ketercapaian kompetensi kejuruan fase E.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'DOC-6',
    kategori: 'asesmen_diagnostik',
    judul: 'Instrumen Asesmen Awal / Diagnostik Kognitif Pemetaan Kemampuan Logika Siswa Baru',
    mapel: 'Dasar-Dasar Kejuruan',
    tingkat: 'X',
    kelas_target: 'X TJKT',
    jurusan: 'TJKT',
    semester: 'Ganjil',
    guru_pengunggah: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
    tipe_file: 'PDF',
    file_name: 'Asesmen_Diagnostik_Kognitif_X_TJKT.pdf',
    file_url: '',
    ringkasan: 'Instrumen pemetaan awal kemampuan dasar logika komputasi, pemahaman matematika biner, dan gaya belajar siswa untuk pembelajaran berdiferensiasi.',
    created_at: new Date().toISOString(),
  },
];

const DAFTAR_KELAS_OPTIONS = [
  'Semua Kelas',
  'X TJKT', 'X AKL', 'X MPLB', 'X PM',
  'XI TJKT', 'XI AKL', 'XI MPLB', 'XI PM',
  'XII TJKT', 'XII AKL', 'XII MPLB', 'XII PM'
];

export default function BahanAjarView({
  currentUser,
  isMasterIqbal,
  isSiswaAdmin,
  siswaAdminKelas,
}) {
  const isGuruAccount = Boolean(currentUser?.isGuru && !String(currentUser?.id).startsWith('SISWA-'));
  const isDirectAdmin = Boolean(
    isMasterIqbal ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'master' ||
    (currentUser?.username || '').toLowerCase() === 'admin' ||
    (currentUser?.username || '').toLowerCase() === 'iqbal'
  );

  // 🔒 HAK AKSES GURU & ADMIN MASTER (Bisa melihat semua 5 kategori & Upload/Edit/Hapus)
  const canManagePerangkat = Boolean(isDirectAdmin || isGuruAccount || currentUser?.role === 'guru');

  // Siswa default ke 'modul_ajar', Guru default ke 'administrasi' atau 'modul_ajar'
  const [activeCategory, setActiveCategory] = useState(canManagePerangkat ? 'modul_ajar' : 'modul_ajar');
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua Kelas');
  const [filterJurusan, setFilterJurusan] = useState('Semua');

  // Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isPdfReaderOpen, setIsPdfReaderOpen] = useState(false);
  const [activeReaderDoc, setActiveReaderDoc] = useState(null);

  // Form State
  const [formKategori, setFormKategori] = useState('modul_ajar');
  const [formJudul, setFormJudul] = useState('');
  const [formMapel, setFormMapel] = useState('');
  const [formTingkat, setFormTingkat] = useState('XI');
  const [formKelas, setFormKelas] = useState('XI TJKT');
  const [formJurusan, setFormJurusan] = useState('TJKT');
  const [formSemester, setFormSemester] = useState('Ganjil');
  const [formRingkasan, setFormRingkasan] = useState('');
  const [formFileBase64, setFormFileBase64] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formFileType, setFormFileType] = useState('PDF');
  const [formLinkUrl, setFormLinkUrl] = useState('');

  // Load from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('smk_ypk_perangkat_ajar_docs');
      if (stored) {
        setDocuments(JSON.parse(stored));
      } else {
        setDocuments(INITIAL_DOCUMENTS);
        localStorage.setItem('smk_ypk_perangkat_ajar_docs', JSON.stringify(INITIAL_DOCUMENTS));
      }
    } catch (e) {
      setDocuments(INITIAL_DOCUMENTS);
    }
  }, []);

  // Filter Dokumen Berdasarkan Kategori, Role, dan Search
  const filteredDocs = useMemo(() => {
    const studentKelas = (currentUser?.kelas || siswaAdminKelas || '').toUpperCase().trim();
    const studentJurusan = (currentUser?.jurusan || '').toUpperCase().trim();

    return documents.filter((item) => {
      // 🔒 PROTEKSI KETAT: Siswa HANYA BISA MELIHAT Modul Ajar (kategori: modul_ajar)
      if (!canManagePerangkat && item.kategori !== 'modul_ajar') {
        return false;
      }

      // Filter Kategori Aktif
      if (activeCategory !== 'semua' && item.kategori !== activeCategory) {
        return false;
      }

      // Filter untuk siswa: hanya tampilkan yang sesuai kelas/jurusannya
      if (!canManagePerangkat && studentKelas) {
        const targetKelas = (item.kelas_target || '').toUpperCase().trim();
        const targetJurusan = (item.jurusan || '').toUpperCase().trim();

        const isClassMatch =
          targetKelas === 'SEMUA KELAS' ||
          targetKelas === 'SEMUA' ||
          targetKelas === studentKelas ||
          studentKelas.includes(targetKelas) ||
          targetKelas.includes(studentKelas);

        const isJurusanMatch =
          targetJurusan === 'SEMUA' ||
          targetJurusan === 'SEMUA JURUSAN' ||
          (studentJurusan && targetJurusan === studentJurusan) ||
          (studentKelas && studentKelas.includes(targetJurusan));

        if (!isClassMatch && !isJurusanMatch) return false;
      }

      // Filter Dropdown
      if (filterKelas !== 'Semua Kelas' && item.kelas_target !== filterKelas && item.kelas_target !== 'Semua Kelas') return false;
      if (filterJurusan !== 'Semua' && item.jurusan !== filterJurusan && item.jurusan !== 'Semua') return false;

      // Pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mJudul = (item.judul || '').toLowerCase().includes(q);
        const mMapel = (item.mapel || '').toLowerCase().includes(q);
        const mGuru = (item.guru_pengunggah || '').toLowerCase().includes(q);
        const mRingkasan = (item.ringkasan || '').toLowerCase().includes(q);
        if (!mJudul && !mMapel && !mGuru && !mRingkasan) return false;
      }

      return true;
    });
  }, [documents, activeCategory, canManagePerangkat, filterKelas, filterJurusan, searchQuery, currentUser, siswaAdminKelas]);

  // Handle File Input (PDF / Word)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cek ekstensi file
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      Swal.fire('Format Tidak Didukung', 'Harap upload dokumen dalam format PDF (.pdf) atau Word (.doc, .docx)!', 'warning');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      Swal.fire('Ukuran Terlalu Besar', 'Maksimal ukuran file dokumen adalah 15 MB.', 'warning');
      return;
    }

    setFormFileName(file.name);
    setFormFileType(ext.toUpperCase());

    const reader = new FileReader();
    reader.onload = () => {
      setFormFileBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Simpan Dokumen Perangkat Ajar Baru
  const handleSaveDocument = (e) => {
    e.preventDefault();
    if (!canManagePerangkat) return;

    if (!formJudul.trim() || !formMapel.trim()) {
      Swal.fire('Form Belum Lengkap', 'Harap isi Judul Dokumen dan Mata Pelajaran!', 'warning');
      return;
    }

    const newDoc = {
      id: `PERANGKAT-${Date.now()}`,
      kategori: formKategori,
      judul: formJudul.trim(),
      mapel: formMapel.trim(),
      tingkat: formTingkat,
      kelas_target: formKelas,
      jurusan: formJurusan,
      semester: formSemester,
      guru_pengunggah: currentUser?.nama || 'Guru Pengampu SMK YPK',
      tipe_file: formFileType || 'PDF',
      file_name: formFileName || `${formJudul.replace(/\s+/g, '_')}.${formFileType.toLowerCase()}`,
      file_url: formFileBase64 || formLinkUrl || '',
      ringkasan: formRingkasan.trim() || 'Dokumen perangkat ajar resmi SMK YPK Medan.',
      created_at: new Date().toISOString(),
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    try {
      localStorage.setItem('smk_ypk_perangkat_ajar_docs', JSON.stringify(updated));
    } catch (err) {
      console.warn('Storage limit exceeded, saving locally without heavy base64', err);
    }

    setShowUploadModal(false);
    // Reset Form
    setFormJudul('');
    setFormMapel('');
    setFormRingkasan('');
    setFormFileBase64('');
    setFormFileName('');
    setFormLinkUrl('');

    Swal.fire({
      icon: 'success',
      title: 'Dokumen Berhasil Diterbitkan!',
      text: `Dokumen "${newDoc.judul}" telah aktif di kategori ${PERANGKAT_CATEGORIES.find(c => c.id === formKategori)?.label}.`,
      confirmButtonColor: '#2563eb',
    });
  };

  // Hapus Dokumen
  const handleDeleteDoc = (id, judul) => {
    if (!canManagePerangkat) return;

    Swal.fire({
      title: 'Hapus Dokumen?',
      text: `Apakah Anda yakin ingin menghapus "${judul}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then((res) => {
      if (res.isConfirmed) {
        const updated = documents.filter((d) => d.id !== id);
        setDocuments(updated);
        localStorage.setItem('smk_ypk_perangkat_ajar_docs', JSON.stringify(updated));
        if (selectedDoc?.id === id) setSelectedDoc(null);
        Swal.fire('Terhapus', 'Dokumen berhasil dihapus dari sistem.', 'success');
      }
    });
  };

  // Buka Reader PDF Interaktif
  const handleOpenPdfReader = (doc) => {
    setActiveReaderDoc(doc);
    setIsPdfReaderOpen(true);
  };

  return (
    <div style={{ padding: '4px 0 30px 0' }}>
      {/* 🌟 HERO BANNER: PERANGKAT & MODUL AJAR DIGITAL SMK YPK MEDAN */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%)',
          borderRadius: '18px',
          padding: '20px 24px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.28)',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.8px', backgroundColor: 'rgba(255, 255, 255, 0.22)', padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                  SMK YPK MEDAN • KURIKULUM MERDEKA 2026
                </span>
                {canManagePerangkat ? (
                  <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fef08a', color: '#854d0e', padding: '3px 8px', borderRadius: '12px' }}>
                    👑 Akses Guru &amp; Admin
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px' }}>
                    🎒 Akses Modul Ajar Siswa
                  </span>
                )}
              </div>
              <h1 style={{ margin: '4px 0 6px 0', fontSize: '22px', fontWeight: '900', letterSpacing: '-0.3px' }}>
                Perangkat &amp; Modul Ajar Digital
              </h1>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#e0f2fe', maxWidth: '640px', lineHeight: 1.5 }}>
                {canManagePerangkat
                  ? 'Portal manajemen dokumen pembelajaran resmi SMK YPK Medan: Administrasi Guru, Kalender, CP/ATP, Modul Ajar Berdiferensiasi & P5, serta Asesmen Diagnostik.'
                  : 'Akses resmi Modul Pembelajaran Berdiferensiasi & Integrasi Profil Pelajar Pancasila untuk mendukung kegiatan belajar mandiri siswa.'}
              </p>
            </div>

            {/* Tombol Upload Dokumen (Khusus Guru & Admin) */}
            {canManagePerangkat && (
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1d4ed8',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '11px 20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <span style={{ fontSize: '16px' }}>📤</span>
                <span>Upload Perangkat Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 📑 5 TAB KATEGORI UTAMA PERANGKAT AJAR */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }}>
          {PERANGKAT_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const isLockedForStudent = !canManagePerangkat && cat.adminGuruOnly;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (isLockedForStudent) {
                    Swal.fire({
                      icon: 'info',
                      title: 'Dokumen Khusus Guru',
                      text: 'Kategori ini merupakan dokumen administrasi kurikulum khusus Guru & Admin. Siswa cukup mengakses menu "Modul Ajar".',
                      confirmButtonColor: '#2563eb',
                    });
                    return;
                  }
                  setActiveCategory(cat.id);
                }}
                style={{
                  padding: '9px 15px',
                  borderRadius: '12px',
                  border: isActive ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isActive ? '#eff6ff' : isLockedForStudent ? '#f8fafc' : '#ffffff',
                  color: isActive ? '#1d4ed8' : isLockedForStudent ? '#94a3b8' : '#334155',
                  fontSize: '12px',
                  fontWeight: isActive ? '800' : '600',
                  cursor: isLockedForStudent ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease',
                  opacity: isLockedForStudent ? 0.65 : 1,
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {isLockedForStudent && <span style={{ fontSize: '10px' }}>🔒</span>}
                {isActive && (
                  <span style={{ fontSize: '10px', backgroundColor: '#2563eb', color: '#ffffff', padding: '1px 6px', borderRadius: '10px' }}>
                    {filteredDocs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 🔍 FILTER & SEARCH BAR */}
      <div
        className="stardust-white-card"
        style={{
          borderRadius: '14px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px', color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            placeholder="Cari judul modul, mapel, atau nama guru pengampu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '9px 12px 9px 34px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              backgroundColor: '#ffffff',
              fontWeight: '600',
              color: '#334155',
            }}
          >
            {DAFTAR_KELAS_OPTIONS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>

          <select
            value={filterJurusan}
            onChange={(e) => setFilterJurusan(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              backgroundColor: '#ffffff',
              fontWeight: '600',
              color: '#334155',
            }}
          >
            <option value="Semua">Semua Jurusan</option>
            <option value="TJKT">TJKT</option>
            <option value="AKL">AKL</option>
            <option value="MPLB">MPLB</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>

      {/* 📚 GRID DAFTAR DOKUMEN PERANGKAT AJAR */}
      {filteredDocs.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📂</div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>
            Belum Ada Dokumen Perangkat Ajar
          </h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            {canManagePerangkat
              ? 'Silakan klik tombol "Upload Perangkat Baru" untuk mengunggah Modul, RPP, CP/ATP, atau Asesmen Pembelajaran.'
              : 'Belum ada modul ajar yang diterbitkan untuk kategori atau kelas yang dipilih.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '14px' }}>
          {filteredDocs.map((doc) => {
            const catMeta = PERANGKAT_CATEGORIES.find((c) => c.id === doc.kategori) || PERANGKAT_CATEGORIES[3];

            return (
              <div
                key={doc.id}
                className="stardust-white-card"
                style={{
                  borderRadius: '16px',
                  padding: '18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 22px rgba(37, 99, 235, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.04)';
                }}
              >
                <div>
                  {/* BADGES HEADER */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '800', backgroundColor: '#eff6ff', color: '#2563eb', padding: '3px 9px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      {catMeta.icon} {catMeta.label.split(' ')[0]} {catMeta.label.split(' ')[1] || ''}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '8px' }}>
                      🏷️ {doc.kelas_target} ({doc.jurusan})
                    </span>
                  </div>

                  {/* JUDUL DOKUMEN */}
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '14.5px', fontWeight: '800', color: '#0f172a', lineHeight: 1.35 }}>
                    {doc.judul}
                  </h3>

                  {/* MAPEL & GURU */}
                  <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '10px', lineHeight: 1.4 }}>
                    <div>📖 Mapel: <b>{doc.mapel}</b></div>
                    <div>👨‍🏫 Pengampu: <b>{doc.guru_pengunggah}</b></div>
                  </div>

                  {/* RINGKASAN */}
                  <p style={{ margin: '0 0 14px 0', fontSize: '11.5px', color: '#64748b', lineHeight: 1.45, backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    {doc.ringkasan}
                  </p>
                </div>

                {/* FOOTER ACTIONS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '4px', gap: '8px' }}>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📄 {doc.tipe_file}</span>
                    <span>•</span>
                    <span>Sem. {doc.semester}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {/* Tombol Buka & Baca Dokumen PDF */}
                    <button
                      type="button"
                      onClick={() => handleOpenPdfReader(doc)}
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '11.5px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                      }}
                    >
                      <span>📖</span>
                      <span>Buka Dokumen</span>
                    </button>

                    {/* Tombol Hapus (Khusus Guru/Admin) */}
                    {canManagePerangkat && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id, doc.judul)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                        }}
                        title="Hapus Dokumen"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 📤 MODAL UPLOAD PERANGKAT AJAR BARU (GURU & ADMIN)             */}
      {/* ============================================================== */}
      {showUploadModal && canManagePerangkat && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowUploadModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                  UPLOAD PERANGKAT PEMBELAJARAN
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '17px', color: '#0f172a', fontWeight: 'bold' }}>
                  Terbitkan Dokumen Ajar Resmi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDocument}>
              {/* Kategori Dokumen */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Kategori Perangkat Ajar: *
                </label>
                <select
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 'bold' }}
                >
                  {PERANGKAT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Judul Dokumen */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Judul Dokumen / Modul: *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Modul Ajar AIJ Subnetting & Routing Statis Berdiferensiasi"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>

              {/* Mapel & Tingkat */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Mata Pelajaran: *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Administrasi Infrastruktur Jaringan"
                    value={formMapel}
                    onChange={(e) => setFormMapel(e.target.value)}
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Tingkat Kelas:
                  </label>
                  <select
                    value={formKelas}
                    onChange={(e) => {
                      setFormKelas(e.target.value);
                      const jur = e.target.value.split(' ')[1] || 'Semua';
                      setFormJurusan(jur);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  >
                    {DAFTAR_KELAS_OPTIONS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Semester & Guru */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Semester:
                  </label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                    <option value="Ganjil & Genap">Ganjil &amp; Genap (1 Tahun)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Guru Pengunggah:
                  </label>
                  <input
                    type="text"
                    value={currentUser?.nama || 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.'}
                    disabled
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '12.5px', color: '#64748b', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              {/* Upload File PDF / Word */}
              <div style={{ marginBottom: '12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Lampirkan File Dokumen (PDF / Word):
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  style={{ width: '100%', fontSize: '12px' }}
                />
                {formFileName && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#2563eb', fontWeight: 'bold' }}>
                    📎 File terpilih: {formFileName} ({formFileType})
                  </div>
                )}
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Atau link dokumen (Google Drive / Cloud):</span>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Ringkasan */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Ringkasan / Petunjuk Belajar:
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan poin-poin capaian pembelajaran, diferensiasi proses/konten, dan instruksi bagi siswa..."
                  value={formRingkasan}
                  onChange={(e) => setFormRingkasan(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  Terbitkan Dokumen 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 📖 MODAL INTERACTIVE PDF & DOCUMENT VIEWER                     */}
      {/* ============================================================== */}
      {isPdfReaderOpen && activeReaderDoc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setIsPdfReaderOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '960px',
              width: '100%',
              height: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* VIEWER HEADER */}
            <div
              style={{
                background: 'linear-gradient(90deg, #1e3a8a, #2563eb)',
                color: '#ffffff',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                  {activeReaderDoc.kategori_label || 'DOKUMEN AJAR'}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 'bold', color: '#ffffff' }}>
                  {activeReaderDoc.judul}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#bfdbfe' }}>
                  {activeReaderDoc.mapel} • {activeReaderDoc.kelas_target} • Pengampu: {activeReaderDoc.guru_pengampu}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={activeReaderDoc.file_url}
                  download={activeReaderDoc.file_name || 'Dokumen_Ajar.pdf'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#1e40af',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>📥</span>
                  <span>Unduh Dokumen</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsPdfReaderOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#ffffff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* EMBEDDED PDF IFRAME READER */}
            <div style={{ flex: 1, backgroundColor: '#f1f5f9', position: 'relative' }}>
              {activeReaderDoc.file_url ? (
                <iframe
                  src={`${activeReaderDoc.file_url}#toolbar=1&navpanes=1`}
                  title={activeReaderDoc.judul}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center' }}>
                  <span style={{ fontSize: '42px', marginBottom: '12px' }}>📄</span>
                  <p style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>Pratinjau Dokumen Online</p>
                  <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '400px' }}>
                    Dokumen ini tidak dapat ditampilkan di browser secara langsung. Silakan klik tombol di bawah untuk membuka tautan cloud atau mengunduh dokumen.
                  </p>
                  {activeReaderDoc.link_url && (
                    <a
                      href={activeReaderDoc.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginTop: '12px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                      }}
                    >
                      Buka di Google Drive / Cloud ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* VIEWER FOOTER */}
            <div style={{ padding: '10px 18px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#64748b' }}>
              <span>SMK YPK MEDAN • Portal Perangkat Pembelajaran Digital</span>
              <button
                type="button"
                onClick={() => setIsPdfReaderOpen(false)}
                style={{
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Tutup Pembaca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
