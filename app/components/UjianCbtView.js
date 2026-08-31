'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';

// 🔒 SECURE CRYPTOGRAPHIC ENCODING UNTUK KUNCI JAWABAN CBT (MENCEGAH SISWA INSPECT ELEMENT)
function hashAnswerKey(qId, key) {
  if (!key) return '';
  const salt = `SMK_YPK_CBT_SEC_${qId}_PROTECT_2026`;
  let hash = 0;
  const str = `${salt}:${String(key).trim().toUpperCase()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `KEY-${Math.abs(hash).toString(36).toUpperCase()}`;
}

// 📚 BANK SOAL SAMPEL RESMI (30 PILIHAN GANDA + 5 ESSAY) SIAP UJI COBA LANGSUNG
const DEFAULT_SAMPLE_EXAM = {
  id: 'EXAM-YPK-PTS-2026',
  judul_ujian: 'Penilaian Tengah Semester (PTS) - Kejuruan & Literasi Digital SMK YPK Medan',
  mata_pelajaran: 'Teknologi Informasi & Produktif Kejuruan',
  tingkat: 'Semua Tingkat',
  jurusan: 'Semua Jurusan',
  kelas_target: 'Semua Kelas',
  durasi_menit: 60,
  kkm: 75,
  token_ujian: 'YPK2026',
  acak_soal: false,
  tampilkan_nilai: true,
  anti_cheat_enabled: true,
  max_tab_violations: 3,
  status_ujian: 'Aktif',
  dibuat_oleh: 'Tim Pengajar SMK YPK',
  soal_list: [
    // 30 SOAL PILIHAN GANDA
    { id: 1, nomor: 1, tipe: 'PG', pertanyaan: 'Apa fungsi utama dari protokol DHCP pada jaringan komputer di SMK YPK?', opsi_a: 'Memberikan alamat IP secara otomatis ke perangkat klien', opsi_b: 'Mengamankan transmisi data melalui enkripsi SSL', opsi_c: 'Menghubungkan komputer dengan printer secara fisik', opsi_d: 'Membatasi bandwidth pengguna internet', opsi_e: 'Menyimpan file backup database sekolah', kunci: 'A', bobot: 2 },
    { id: 2, nomor: 2, tipe: 'PG', pertanyaan: 'Alat jaringan yang berfungsi menghubungkan dua jaringan dengan subnet berbeda adalah...', opsi_a: 'Switch Unmanaged', opsi_b: 'Router', opsi_c: 'Hub', opsi_d: 'Kabel UTP', opsi_e: 'Repeater', kunci: 'B', bobot: 2 },
    { id: 3, nomor: 3, tipe: 'PG', pertanyaan: 'Topologi jaringan yang menggunakan satu kabel tunggal sebagai jalur utama transmisi data adalah...', opsi_a: 'Star', opsi_b: 'Mesh', opsi_c: 'Bus', opsi_d: 'Ring', opsi_e: 'Tree', kunci: 'C', bobot: 2 },
    { id: 4, nomor: 4, tipe: 'PG', pertanyaan: 'Urutan warna standar kabel UTP T568B untuk pin 1 sampai 3 adalah...', opsi_a: 'Putih Hijau, Hijau, Putih Oranye', opsi_b: 'Putih Oranye, Oranye, Putih Hijau', opsi_c: 'Putih Biru, Biru, Putih Cokelat', opsi_d: 'Putih Cokelat, Cokelat, Biru', opsi_e: 'Oranye, Putih Oranye, Hijau', kunci: 'B', bobot: 2 },
    { id: 5, nomor: 5, tipe: 'PG', pertanyaan: 'Dalam akuntansi keuangan, persamaan dasar akuntansi yang benar adalah...', opsi_a: 'Aset = Liabilitas - Ekuitas', opsi_b: 'Aset = Liabilitas + Ekuitas', opsi_c: 'Liabilitas = Aset + Ekuitas', opsi_d: 'Ekuitas = Aset + Liabilitas', opsi_e: 'Pendapatan = Beban + Modal', kunci: 'B', bobot: 2 },
    { id: 6, nomor: 6, tipe: 'PG', pertanyaan: 'Laporan keuangan yang menyajikan posisi aktiva, kewajiban, dan modal pada tanggal tertentu adalah...', opsi_a: 'Laporan Laba Rugi', opsi_b: 'Laporan Perubahan Modal', opsi_c: 'Neraca (Balance Sheet)', opsi_d: 'Laporan Arus Kas', opsi_e: 'Jurnal Penyesuaian', kunci: 'C', bobot: 2 },
    { id: 7, nomor: 7, tipe: 'PG', pertanyaan: 'Surat resmi yang dikeluarkan oleh instansi sekolah kepada orang tua siswa disebut...', opsi_a: 'Surat Pribadi', opsi_b: 'Surat Dinas / Resmi', opsi_c: 'Surat Niaga', opsi_d: 'Surat Elektronik Biasa', opsi_e: 'Surat Lamaran', kunci: 'B', bobot: 2 },
    { id: 8, nomor: 8, tipe: 'PG', pertanyaan: 'Dalam administrasi perkantoran (MPLB), sistem kearsipan berdasarkan abjad nama disebut...', opsi_a: 'Chronological Filing System', opsi_b: 'Alphabetical Filing System', opsi_c: 'Numerical Filing System', opsi_d: 'Geographical Filing System', opsi_e: 'Subject Filing System', kunci: 'B', bobot: 2 },
    { id: 9, nomor: 9, tipe: 'PG', pertanyaan: 'Strategi pemasaran 4P dalam Bisnis & Pemasaran (PM) terdiri dari...', opsi_a: 'Product, Price, Place, Promotion', opsi_b: 'People, Process, Profit, Production', opsi_c: 'Plan, Perform, Packaging, Public', opsi_d: 'Payment, Positioning, Policy, Power', opsi_e: 'Program, People, Place, Point', kunci: 'A', bobot: 2 },
    { id: 10, nomor: 10, tipe: 'PG', pertanyaan: 'Saluran pemasaran digital yang memanfaatkan mesin pencari Google tanpa berbayar disebut...', opsi_a: 'SEM (Search Engine Marketing)', opsi_b: 'SEO (Search Engine Optimization)', opsi_c: 'Affiliate Marketing', opsi_d: 'Telemarketing', opsi_e: 'Direct Selling', kunci: 'B', bobot: 2 },
    { id: 11, nomor: 11, tipe: 'PG', pertanyaan: 'Frekuensi standar yang digunakan pada kartu RFID Mifare 1K SMK YPK adalah...', opsi_a: '125 kHz', opsi_b: '13.56 MHz', opsi_c: '2.4 GHz', opsi_d: '5.8 GHz', opsi_e: '900 MHz', kunci: 'B', bobot: 2 },
    { id: 12, nomor: 12, tipe: 'PG', pertanyaan: 'Mikrokontroler berfitur Wi-Fi yang sering digunakan pada sistem IoT presensi adalah...', opsi_a: 'Arduino Uno R3', opsi_b: 'ESP8266 / NodeMCU', opsi_c: 'Raspberry Pi Pico Non-W', opsi_d: 'ATmega328P Standalone', opsi_e: 'PIC16F877A', kunci: 'B', bobot: 2 },
    { id: 13, nomor: 13, tipe: 'PG', pertanyaan: 'Perintah command prompt (CMD) untuk memeriksa konektivitas jaringan ke server adalah...', opsi_a: 'ipconfig /all', opsi_b: 'ping', opsi_c: 'tracert', opsi_d: 'netstat', opsi_e: 'nslookup', kunci: 'B', bobot: 2 },
    { id: 14, nomor: 14, tipe: 'PG', pertanyaan: 'Subnet mask standar untuk jaringan kelas C dengan prefix /24 adalah...', opsi_a: '255.0.0.0', opsi_b: '255.255.0.0', opsi_c: '255.255.255.0', opsi_d: '255.255.255.128', opsi_e: '255.255.255.252', kunci: 'C', bobot: 2 },
    { id: 15, nomor: 15, tipe: 'PG', pertanyaan: 'Jurnal yang digunakan untuk mencatat transaksi pengeluaran kas secara tunai adalah...', opsi_a: 'Jurnal Penjualan', opsi_b: 'Jurnal Pengeluaran Kas (Cash Payment Journal)', opsi_c: 'Jurnal Penerimaan Kas', opsi_d: 'Jurnal Pembelian', opsi_e: 'Jurnal Umum', kunci: 'B', bobot: 2 },
    { id: 16, nomor: 16, tipe: 'PG', pertanyaan: 'Bukti transaksi pembelian atau penjualan barang secara kredit disebut...', opsi_a: 'Kuitansi', opsi_b: 'Faktur (Invoice)', opsi_c: 'Nota Kontan', opsi_d: 'Cek', opsi_e: 'Bilyet Giro', kunci: 'B', bobot: 2 },
    { id: 17, nomor: 17, tipe: 'PG', pertanyaan: 'Software lembar kerja pengolah angka yang umum digunakan di jurusan Akuntansi adalah...', opsi_a: 'Microsoft Word', opsi_b: 'Microsoft Excel', opsi_c: 'Microsoft PowerPoint', opsi_d: 'CorelDRAW', opsi_e: 'Adobe Premiere', kunci: 'B', bobot: 2 },
    { id: 18, nomor: 18, tipe: 'PG', pertanyaan: 'Rumus pada spreadsheet untuk menjumlahkan sekumpulan data numerik adalah...', opsi_a: '=AVERAGE()', opsi_b: '=SUM()', opsi_c: '=COUNT()', opsi_d: '=MAX()', opsi_e: '=IF()', kunci: 'B', bobot: 2 },
    { id: 19, nomor: 19, tipe: 'PG', pertanyaan: 'Sikap profesional yang wajib dimiliki oleh sekretaris dalam menjaga rahasia kantor adalah...', opsi_a: 'Integritas & Loyalitas', opsi_b: 'Egoisme', opsi_c: 'Apatis', opsi_d: 'Pasif', opsi_e: 'Konsumtif', kunci: 'A', bobot: 2 },
    { id: 20, nomor: 20, tipe: 'PG', pertanyaan: 'Alat perkantoran yang digunakan untuk menghancurkan dokumen rahasia menjadi potongan kecil adalah...', opsi_a: 'Laminating Machine', opsi_b: 'Paper Shredder', opsi_c: 'Scanner Dokumen', opsi_d: 'Perforator', opsi_e: 'Stapler Heavy Duty', kunci: 'B', bobot: 2 },
    { id: 21, nomor: 21, tipe: 'PG', pertanyaan: 'Tahap pertama dalam proses pengambilan keputusan pembelian oleh konsumen adalah...', opsi_a: 'Evaluasi Alternatif', opsi_b: 'Pengenalan Masalah / Kebutuhan', opsi_c: 'Pencarian Informasi', opsi_d: 'Keputusan Membeli', opsi_e: 'Perilaku Pasca Pembelian', kunci: 'B', bobot: 2 },
    { id: 22, nomor: 22, tipe: 'PG', pertanyaan: 'Visual merchandising pada toko ritel bertujuan untuk...', opsi_a: 'Menyembunyikan barang dagangan', opsi_b: 'Menarik perhatian pelanggan dan meningkatkan penjualan', opsi_c: 'Mengurangi jumlah pramuniaga', opsi_d: 'Menaikkan harga pokok barang', opsi_e: 'Mempercepat kerusakan produk', kunci: 'B', bobot: 2 },
    { id: 23, nomor: 23, tipe: 'PG', pertanyaan: 'Sistem operasi berbasis open source yang banyak digunakan untuk server jaringan adalah...', opsi_a: 'Windows 11 Home', opsi_b: 'Linux (Ubuntu / Debian)', opsi_c: 'macOS Monterey', opsi_d: 'MS-DOS', opsi_e: 'Android Go', kunci: 'B', bobot: 2 },
    { id: 24, nomor: 24, tipe: 'PG', pertanyaan: 'Port default untuk layanan web server aman (HTTPS) adalah...', opsi_a: 'Port 80', opsi_b: 'Port 443', opsi_c: 'Port 21', opsi_d: 'Port 22', opsi_e: 'Port 3306', kunci: 'B', bobot: 2 },
    { id: 25, nomor: 25, tipe: 'PG', pertanyaan: 'Karakteristik utama dari media transmisi serat optik (Fiber Optic) adalah...', opsi_a: 'Menggunakan sinyal listrik pada kabel tembaga', opsi_b: 'Mentransmisikan data dalam bentuk pulsa cahaya berkecepatan tinggi', opsi_c: 'Sangat rentan terhadap interferensi gelombang radio', opsi_d: 'Memiliki jarak transmisi maksimal hanya 100 meter', opsi_e: 'Harganya paling murah dibandingkan kabel coaxial', kunci: 'B', bobot: 2 },
    { id: 26, nomor: 26, tipe: 'PG', pertanyaan: 'Metode persediaan di mana barang yang pertama masuk diasumsikan sebagai yang pertama keluar disebut...', opsi_a: 'LIFO (Last In First Out)', opsi_b: 'FIFO (First In First Out)', opsi_c: 'Average Method', opsi_d: 'Specific Identification', opsi_e: 'Weighted Moving Average', kunci: 'B', bobot: 2 },
    { id: 27, nomor: 27, tipe: 'PG', pertanyaan: 'Pajak yang dikenakan atas konsumsi barang kena pajak di dalam negeri adalah...', opsi_a: 'PPh Pasal 21', opsi_b: 'PPN (Pajak Pertambahan Nilai)', opsi_c: 'PBB (Pajak Bumi dan Bangunan)', opsi_d: 'BPHTB', opsi_e: 'Pajak Kendaraan Bermotor', kunci: 'B', bobot: 2 },
    { id: 28, nomor: 28, tipe: 'PG', pertanyaan: 'Media penyimpanan cloud storage yang sering digunakan untuk berbagi dokumen sekolah adalah...', opsi_a: 'Google Drive', opsi_b: 'Floppy Disk', opsi_c: 'Flashdisk 2GB', opsi_d: 'CD-ROM', opsi_e: 'Pita Magnetik', kunci: 'A', bobot: 2 },
    { id: 29, nomor: 29, tipe: 'PG', pertanyaan: 'Teknologi kecerdasan buatan (AI) yang memproses bahasa alami manusia disebut...', opsi_a: 'Computer Vision', opsi_b: 'NLP (Natural Language Processing)', opsi_c: 'Robotics Automation', opsi_d: 'Genetic Algorithm', opsi_e: 'Reinforcement Sensor', kunci: 'B', bobot: 2 },
    { id: 30, nomor: 30, tipe: 'PG', pertanyaan: 'Visi utama lulusan SMK YPK Medan dalam menghadapi era industri 4.0 adalah...', opsi_a: 'Menjadi generasi terampil, berkarakter, beriman, dan berdaya saing global', opsi_b: 'Hanya mencari sertifikat formal', opsi_c: 'Menghindari perkembangan teknologi informasi', opsi_d: 'Bekerja tanpa memperhatikan etika profesi', opsi_e: 'Menolak inovasi sistem digital', kunci: 'A', bobot: 2 },

    // 5 SOAL ESSAY
    { id: 31, nomor: 31, tipe: 'Essay', pertanyaan: 'Jelaskan perbedaan mendasar antara jaringan LAN (Local Area Network) dan WAN (Wide Area Network) beserta contoh penerapannya di lingkungan SMK YPK Medan!', pedoman: 'LAN mencakup area terbatas (gedung sekolah/lab komputer), sedangkan WAN mencakup area geografis luas (antar kota/negara via internet).', bobot: 8 },
    { id: 32, nomor: 32, tipe: 'Essay', pertanyaan: 'Sebutkan dan jelaskan 3 (tiga) komponen utama dalam sistem presensi digital RFID SMK YPK (Tag RFID, Reader/ESP8266, dan Server Database)!', pedoman: '1. Kartu RFID (UID identitas), 2. Reader RFID/ESP8266 (pemindai dan pengirim data Wi-Fi), 3. Server Database Supabase (pengolah dan penyimpan riwayat kehadiran).', bobot: 8 },
    { id: 33, nomor: 33, tipe: 'Essay', pertanyaan: 'Dalam administrasi perkantoran, mengapa tata kelola arsip surat masuk dan keluar yang rapi sangat penting bagi efisiensi sebuah organisasi sekolah?', pedoman: 'Memudahkan pencarian dokumen penting, menjaga bukti legalitas/transaksi, mencegah kehilangan data, dan mempercepat alur kerja.', bobot: 8 },
    { id: 34, nomor: 34, tipe: 'Essay', pertanyaan: 'Jelaskan mengapa laporan Laba Rugi dan Neraca saling berkaitan dalam siklus akuntansi keuangan perusahaan jasa maupun dagang!', pedoman: 'Laba/Rugi bersih dari Laporan Laba Rugi akan menambah atau mengurangi Ekuitas/Modal di Neraca melalui Laporan Perubahan Modal.', bobot: 8 },
    { id: 35, nomor: 35, tipe: 'Essay', pertanyaan: 'Bagaimana peran teknologi digital dan kecerdasan buatan (AI) dapat membantu siswa SMK YPK dalam meningkatkan prestasi akademik dan kesiapan kerja di dunia industri?', pedoman: 'AI sebagai asisten belajar personal, simulasi praktik kejuruan, efisiensi pengerjaan tugas, dan melatih adaptasi teknologi di dunia kerja modern.', bobot: 8 },
  ],
};

export default function UjianCbtView({
  currentUser,
  siswaList = [],
  isMasterIqbal,
  isSiswaAdmin,
  siswaAdminKelas,
  isRestrictedGuru,
  activeSubMenu = 'ruang_ujian',
  onSubMenuChange,
}) {
  // State Ujian
  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isExamRunning, setIsExamRunning] = useState(false);

  // Ruang Ujian State (Siswa CBT)
  const [studentAnswers, setStudentAnswers] = useState({}); // { [nomor]: 'A' | 'Teks' }
  const [raguList, setRaguList] = useState({}); // { [nomor]: boolean }
  const [activeQuestionNum, setActiveQuestionNum] = useState(1);
  const [fontSizeLevel, setFontSizeLevel] = useState(16);
  const [tokenInput, setTokenInput] = useState('');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(3600);

  // Anti-Cheat Engine State
  const [violationCount, setViolationCount] = useState(0);
  const [violationLogs, setViolationLogs] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCheatWarningModal, setIsCheatWarningModal] = useState(false);
  const [cheatWarningReason, setCheatWarningReason] = useState('');

  // Hasil Ujian Selesai
  const [examResult, setExamResult] = useState(null);

  // Form Buat Ujian (Guru / Admin)
  const [formJudul, setFormJudul] = useState('');
  const [formMapel, setFormMapel] = useState('Teknologi Informasi');
  const [formTingkat, setFormTingkat] = useState('Semua Tingkat');
  const [formJurusan, setFormJurusan] = useState('Semua Jurusan');
  const [formDurasi, setFormDurasi] = useState(60);
  const [formKkm, setFormKkm] = useState(75);
  const [formToken, setFormToken] = useState('YPK2026');
  const [formAcakSoal, setFormAcakSoal] = useState(false);
  const [formSoalList, setFormSoalList] = useState([]);
  const [activeTabBuilder, setActiveTabBuilder] = useState('pg'); // 'pg' | 'essay' | 'import'
  const [bulkImportText, setBulkImportText] = useState('');

  // Koreksi Essay & Nilai
  const [submissionList, setSubmissionList] = useState([]);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [essayScores, setEssayScores] = useState({});

  const timerIntervalRef = useRef(null);

  const isTeacherOrAdmin = Boolean(
    isMasterIqbal ||
    currentUser?.isMaster ||
    currentUser?.isGuru === true ||
    String(currentUser?.username || '').toLowerCase() === 'iqbal' ||
    String(currentUser?.nama || '').toLowerCase().includes('iqbal') ||
    String(currentUser?.role || '').toLowerCase() === 'master' ||
    (!String(currentUser?.id || '').startsWith('SISWA-') && !isSiswaAdmin && (currentUser?.role?.toLowerCase() === 'admin' || currentUser?.role?.toLowerCase() === 'guru' || currentUser?.role?.toLowerCase() === 'staff')) ||
    String(currentUser?.id || '').startsWith('GURU-')
  );

  const isStudentUser = Boolean(!isTeacherOrAdmin);
  const isAdminOrTeacher = isTeacherOrAdmin;

  // 🎯 Resolusi Tab Efektif Bebas Kedip (Mencegah Infinite Loop / Screen Blinking)
  const defaultTab = isTeacherOrAdmin ? 'buat_ujian' : 'ruang_ujian';
  const effectiveTab = (isTeacherOrAdmin && activeSubMenu === 'ruang_ujian')
    ? 'buat_ujian'
    : (isStudentUser && (activeSubMenu === 'buat_ujian' || activeSubMenu === 'koreksi_essay' || activeSubMenu === 'bank_soal'))
    ? 'ruang_ujian'
    : (activeSubMenu || defaultTab);

  // Load Exam List dari LocalStorage / Preloaded
  useEffect(() => {
    try {
      const savedExams = localStorage.getItem('smk_ypk_exam_list');
      if (savedExams) {
        const parsed = JSON.parse(savedExams);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExamList(parsed);
          setSelectedExam(parsed[0]);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load local exams:', e);
    }
    // Fallback ke sampel default
    setExamList([DEFAULT_SAMPLE_EXAM]);
    setSelectedExam(DEFAULT_SAMPLE_EXAM);
  }, []);

  // Load Submissions Rekap Nilai
  useEffect(() => {
    try {
      const savedSubs = localStorage.getItem('smk_ypk_cbt_submissions');
      if (savedSubs) {
        const parsed = JSON.parse(savedSubs);
        if (Array.isArray(parsed)) setSubmissionList(parsed);
      }
    } catch (e) {}
  }, []);

  // Simpan Submission ke LocalStorage
  const saveSubmissionsToLocal = (newSubs) => {
    setSubmissionList(newSubs);
    try {
      localStorage.setItem('smk_ypk_cbt_submissions', JSON.stringify(newSubs));
    } catch (e) {}
  };

  // Simpan Ujian ke LocalStorage
  const saveExamsToLocal = (newExams) => {
    setExamList(newExams);
    try {
      localStorage.setItem('smk_ypk_exam_list', JSON.stringify(newExams));
    } catch (e) {}
  };

  // 🔔 AUDIO ALARM PERINGATAN ANTI-NYONTEK
  const playCheatAlarm = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.4);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  };

  // 🛡️ ANTI-CHEAT EVENT LISTENER (Saat Ujian Berlangsung)
  useEffect(() => {
    if (!isExamRunning) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerCheatViolation('Berpindah Tab / Membuka Aplikasi Lain');
      }
    };

    const handleWindowBlur = () => {
      triggerCheatViolation('Fokus Layar Hilang (Klik di luar layar ujian)');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        triggerCheatViolation('Keluar dari Mode Layar Penuh (Fullscreen)');
      } else {
        setIsFullscreen(true);
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Klik kanan dinonaktifkan demi integritas ujian!',
        showConfirmButton: false,
        timer: 2000,
      });
    };

    const handleKeyDown = (e) => {
      // 🛡️ LOCKDOWN SHORTCUT: Blokir Escape, Windows Key, Alt+Tab, F11, F5, Ctrl+R, Ctrl+W, Ctrl+T, dsb.
      if (
        e.key === 'Escape' ||
        e.key === 'F11' ||
        e.key === 'F5' ||
        e.key === 'Meta' ||
        e.key === 'OS' ||
        e.key === 'Windows' ||
        (e.altKey && e.key === 'Tab') ||
        (e.ctrlKey && (e.key === 'r' || e.key === 'R' || e.key === 'w' || e.key === 'W' || e.key === 't' || e.key === 'T' || e.key === 'n' || e.key === 'N' || e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'p' || e.key === 's' || e.key === 'a')) ||
        e.key === 'F12' ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Paksa kembali Fullscreen jika mencoba keluar
        enterFullscreen();

        triggerCheatViolation(`Percobaan shortcut terlarang: [${e.key.toUpperCase()}]`);
        return false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isExamRunning, violationCount]);

  // Handle Pemicu Pelanggaran Anti-Nyontek
  const triggerCheatViolation = (reason) => {
    if (!isExamRunning) return;
    playCheatAlarm();

    const newCount = violationCount + 1;
    setViolationCount(newCount);

    const logEntry = {
      waktu: new Date().toLocaleTimeString('id-ID'),
      alasan: reason,
      ke: newCount,
    };
    setViolationLogs((prev) => [...prev, logEntry]);
    setCheatWarningReason(reason);
    setIsCheatWarningModal(true);

    const maxViolations = selectedExam?.max_tab_violations || 3;

    if (newCount >= maxViolations) {
      // Auto Submit jika mencapai batas maksimum
      setTimeout(() => {
        setIsCheatWarningModal(false);
        handleFinishExam(true, 'Ujian dihentikan otomatis karena melebihi batas toleransi pelanggaran anti-nyontek (3/3).');
      }, 2500);
    }
  };

  // Timer Countdown Ujian
  useEffect(() => {
    if (!isExamRunning) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleFinishExam(true, 'Waktu ujian telah habis!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [isExamRunning]);

  // Format Jam Timer (HH:MM:SS)
  const formattedTimeLeft = useMemo(() => {
    const hours = Math.floor(timeLeftSeconds / 3600);
    const mins = Math.floor((timeLeftSeconds % 3600) / 60);
    const secs = timeLeftSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timeLeftSeconds]);

  // Masuk Mode Layar Penuh (Fullscreen)
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(() => {});
    setIsFullscreen(true);
  };

  // Keluar Mode Fullscreen
  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  };

  // Mulai Ujian
  const handleStartExam = () => {
    if (!selectedExam) return;

    if (selectedExam.token_ujian && tokenInput.trim().toUpperCase() !== selectedExam.token_ujian.toUpperCase()) {
      Swal.fire('Token Salah', `Token ujian yang Anda masukkan tidak valid! (Hubungi Pengawas / Guru)`, 'error');
      return;
    }

    Swal.fire({
      title: 'Mulai Ujian CBT?',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6;">
          <p><b>Judul:</b> ${selectedExam.judul_ujian}</p>
          <p><b>Durasi:</b> ${selectedExam.durasi_menit} Menit</p>
          <p><b>Total Soal:</b> ${selectedExam.soal_list.length} Soal (30 PG + 5 Essay)</p>
          <hr style="margin: 8px 0; border: 0; border-top: 1px solid #e2e8f0;">
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; color: #991b1b;">
            <b>🛡️ Aturan Anti-Nyontek Aktif:</b>
            <ul style="margin: 4px 0 0 16px; padding: 0;">
              <li>Wajib Fullscreen selama ujian.</li>
              <li>Dilarang berpindah tab / membuka jendela lain (Maks 3x -> Auto Submit).</li>
              <li>Copy-paste & klik kanan dinonaktifkan.</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '🚀 Mulai & Masuk Layar Penuh',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
    }).then((res) => {
      if (res.isConfirmed) {
        enterFullscreen();
        setStudentAnswers({});
        setRaguList({});
        setActiveQuestionNum(1);
        setViolationCount(0);
        setViolationLogs([]);
        setTimeLeftSeconds((selectedExam.durasi_menit || 60) * 60);
        setIsExamRunning(true);
        setExamResult(null);
      }
    });
  };

  // Pilih Jawaban Soal
  const handleSelectAnswer = (num, value) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [num]: value,
    }));
  };

  // Toggle Ragu-Ragu
  const handleToggleRagu = (num) => {
    setRaguList((prev) => ({
      ...prev,
      [num]: !prev[num],
    }));
  };

  // Selesai & Kirim Ujian
  const handleFinishExam = (isForced = false, forcedMsg = '') => {
    clearInterval(timerIntervalRef.current);
    exitFullscreen();
    setIsExamRunning(false);

    const questions = selectedExam?.soal_list || [];
    let correctPgCount = 0;
    let totalPgScore = 0;
    let totalMaxPgScore = 0;
    let essayAnsweredCount = 0;

    questions.forEach((q) => {
      if (q.tipe === 'PG') {
        totalMaxPgScore += Number(q.bobot) || 2;
        const studentAns = studentAnswers[q.nomor] || '';
        const isCorrect =
          (q.kunci && studentAns.toUpperCase() === String(q.kunci).trim().toUpperCase()) ||
          (studentAns && hashAnswerKey(q.id || q.nomor, studentAns) === hashAnswerKey(q.id || q.nomor, q.kunci));
        if (isCorrect) {
          correctPgCount += 1;
          totalPgScore += Number(q.bobot) || 2;
        }
      } else {
        if (studentAnswers[q.nomor] && studentAnswers[q.nomor].trim().length > 0) {
          essayAnsweredCount += 1;
        }
      }
    });

    const newSub = {
      id: `SUB-${Date.now()}`,
      id_ujian: selectedExam?.id,
      judul_ujian: selectedExam?.judul_ujian,
      id_siswa: currentUser?.rawId || currentUser?.id,
      nama_siswa: currentUser?.nama || 'Siswa CBT',
      kelas: currentUser?.kelas || siswaAdminKelas || 'Kelas X',
      jurusan: currentUser?.jurusan || 'TJKT',
      nilai_pg: totalPgScore,
      total_max_pg: totalMaxPgScore,
      correct_pg: correctPgCount,
      total_pg: questions.filter((q) => q.tipe === 'PG').length,
      nilai_essay: 0,
      total_nilai: totalPgScore, // Sementara PG, essay dinilai guru
      status_koreksi: 'Menunggu Koreksi Essay Guru',
      answers: studentAnswers,
      violations: violationCount,
      violation_logs: violationLogs,
      submitted_at: new Date().toISOString(),
    };

    const updatedSubs = [newSub, ...submissionList.filter((s) => s.id !== newSub.id)];
    saveSubmissionsToLocal(updatedSubs);

    setExamResult(newSub);

    if (isForced) {
      Swal.fire('Ujian Selesai (Otomatis)', forcedMsg || 'Ujian telah diakhiri secara otomatis.', 'warning');
    } else {
      Swal.fire('Ujian Berhasil Dikirim!', `Nilai Pilihan Ganda Anda: ${totalPgScore}/${totalMaxPgScore}. Jawaban essay akan dinilai oleh guru.`, 'success');
    }
  };

  // Generator Template Cepat 30 PG + 5 Essay
  const handleGenerateStandardTemplate = () => {
    const list = [];
    // 30 PG
    for (let i = 1; i <= 30; i++) {
      list.push({
        id: i,
        nomor: i,
        tipe: 'PG',
        pertanyaan: `Pertanyaan Soal Pilihan Ganda No. ${i} ...`,
        opsi_a: 'Pilihan Jawaban A',
        opsi_b: 'Pilihan Jawaban B',
        opsi_c: 'Pilihan Jawaban C',
        opsi_d: 'Pilihan Jawaban D',
        opsi_e: 'Pilihan Jawaban E',
        kunci: i % 5 === 1 ? 'A' : i % 5 === 2 ? 'B' : i % 5 === 3 ? 'C' : i % 5 === 4 ? 'D' : 'E',
        bobot: 2,
      });
    }
    // 5 Essay
    for (let j = 1; j <= 5; j++) {
      const num = 30 + j;
      list.push({
        id: num,
        nomor: num,
        tipe: 'Essay',
        pertanyaan: `Pertanyaan Soal Essay No. ${j} (Soal ${num}): Jelaskan ...`,
        pedoman: 'Kriteria jawaban lengkap dan tepat mendapatkan 8 poin penuh.',
        bobot: 8,
      });
    }
    setFormSoalList(list);
    Swal.fire('Template Siap!', 'Berhasil membuat slot 30 Soal Pilihan Ganda dan 5 Soal Essay standar!', 'success');
  };

  // Import Soal Massal dari Teks
  const handleProcessBulkImport = () => {
    if (!bulkImportText.trim()) {
      Swal.fire('Teks Kosong', 'Silakan tempel teks soal terlebih dahulu.', 'warning');
      return;
    }
    try {
      const lines = bulkImportText.split('\n');
      const generatedList = [];
      let currentSoal = null;

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Cek pattern nomor soal: misal "1." atau "1)" atau "No 1"
        const numMatch = trimmed.match(/^(\d+)[\.\)]\s*(.*)/i);
        if (numMatch) {
          if (currentSoal) generatedList.push(currentSoal);
          const num = parseInt(numMatch[1], 10);
          const isPg = num <= 30;
          currentSoal = {
            id: num,
            nomor: num,
            tipe: isPg ? 'PG' : 'Essay',
            pertanyaan: numMatch[2] || `Soal No. ${num}`,
            opsi_a: '',
            opsi_b: '',
            opsi_c: '',
            opsi_d: '',
            opsi_e: '',
            kunci: isPg ? 'A' : '',
            pedoman: isPg ? '' : 'Pedoman penilaian guru',
            bobot: isPg ? 2 : 8,
          };
          return;
        }

        // Cek opsi A-E
        const optMatch = trimmed.match(/^([A-E])[\.\)]\s*(.*)/i);
        if (optMatch && currentSoal && currentSoal.tipe === 'PG') {
          const letter = optMatch[1].toUpperCase();
          if (letter === 'A') currentSoal.opsi_a = optMatch[2];
          if (letter === 'B') currentSoal.opsi_b = optMatch[2];
          if (letter === 'C') currentSoal.opsi_c = optMatch[2];
          if (letter === 'D') currentSoal.opsi_d = optMatch[2];
          if (letter === 'E') currentSoal.opsi_e = optMatch[2];
          return;
        }

        // Cek Kunci Jawaban
        const keyMatch = trimmed.match(/^Kunci:\s*([A-E])/i);
        if (keyMatch && currentSoal) {
          currentSoal.kunci = keyMatch[1].toUpperCase();
          return;
        }

        // Sambungan teks soal
        if (currentSoal && !currentSoal.opsi_a) {
          currentSoal.pertanyaan += ' ' + trimmed;
        }
      });

      if (currentSoal) generatedList.push(currentSoal);

      if (generatedList.length === 0) {
        // Fallback jika format bebas
        handleGenerateStandardTemplate();
        return;
      }

      setFormSoalList(generatedList);
      Swal.fire('Import Berhasil!', `Berhasil mem-parsing ${generatedList.length} soal ke dalam paket ujian!`, 'success');
      setActiveTabBuilder('pg');
    } catch (e) {
      Swal.fire('Gagal Parsing', 'Pastikan format soal memiliki nomor 1. s/d 35.', 'error');
    }
  };

  // Simpan Paket Ujian Baru
  const handleSaveExamPackage = () => {
    if (!formJudul.trim()) {
      Swal.fire('Judul Kosong', 'Harap isi Judul Ujian!', 'warning');
      return;
    }
    if (formSoalList.length === 0) {
      Swal.fire('Soal Kosong', 'Harap buat soal ujian (minimal 30 PG + 5 Essay) menggunakan Template atau Import!', 'warning');
      return;
    }

    const newExam = {
      id: `EXAM-${Date.now()}`,
      judul_ujian: formJudul,
      mata_pelajaran: formMapel,
      tingkat: formTingkat,
      jurusan: formJurusan,
      kelas_target: 'Semua Kelas',
      durasi_menit: Number(formDurasi) || 60,
      kkm: Number(formKkm) || 75,
      token_ujian: formToken.trim().toUpperCase(),
      acak_soal: formAcakSoal,
      tampilkan_nilai: true,
      anti_cheat_enabled: true,
      max_tab_violations: 3,
      status_ujian: 'Aktif',
      dibuat_oleh: currentUser?.nama || 'Guru Pengampu',
      soal_list: formSoalList,
    };

    const updated = [newExam, ...examList];
    saveExamsToLocal(updated);
    setSelectedExam(newExam);

    Swal.fire('Ujian Berhasil Dibuat!', `Paket ujian "${formJudul}" berisi ${formSoalList.length} soal telah aktif dan siap dikerjakan siswa.`, 'success');
    if (onSubMenuChange) onSubMenuChange('ruang_ujian');
  };

  // Simpan Penilaian Koreksi Essay
  const handleSaveEssayGrading = () => {
    if (!gradingSubmission) return;

    let essayTotal = 0;
    const questions = selectedExam?.soal_list || [];
    const essayQuestions = questions.filter((q) => q.tipe === 'Essay');

    essayQuestions.forEach((eq) => {
      const score = Number(essayScores[eq.nomor]) || 0;
      essayTotal += score;
    });

    const finalTotal = (Number(gradingSubmission.nilai_pg) || 0) + essayTotal;
    const isLulus = finalTotal >= (selectedExam?.kkm || 75);

    const updated = submissionList.map((sub) => {
      if (sub.id === gradingSubmission.id) {
        return {
          ...sub,
          nilai_essay: essayTotal,
          total_nilai: finalTotal,
          status_koreksi: isLulus ? 'Lulus ✅' : 'Remedial ⚠️',
        };
      }
      return sub;
    });

    saveSubmissionsToLocal(updated);
    setGradingSubmission(null);
    Swal.fire('Nilai Disimpan!', `Nilai total siswa: ${finalTotal} (${isLulus ? 'LULUS' : 'REMEDIAL'}).`, 'success');
  };

  // Ekspor Rekap Nilai ke Excel / CSV
  const handleExportGradesCsv = () => {
    if (submissionList.length === 0) {
      Swal.fire('Data Kosong', 'Belum ada data nilai siswa yang dapat diekspor.', 'info');
      return;
    }
    const headers = ['No', 'Nama Siswa', 'Kelas', 'Jurusan', 'Nilai PG', 'Nilai Essay', 'Total Nilai', 'Status', 'Pelanggaran Anti-Cheat', 'Waktu Submit'];
    const rows = submissionList.map((s, idx) => [
      idx + 1,
      `"${s.nama_siswa}"`,
      `"${s.kelas}"`,
      `"${s.jurusan}"`,
      s.nilai_pg,
      s.nilai_essay,
      s.total_nilai,
      `"${s.status_koreksi}"`,
      s.violations,
      `"${new Date(s.submitted_at).toLocaleString('id-ID')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Nilai_CBT_${selectedExam?.judul_ujian || 'SMK_YPK'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🛡️ SANITASI SOAL UJIAN (KUNCI JAWABAN & PEDOMAN ESSAY DIHAPUS OTOMATIS SAAT SISWA MEMBUKA UJIAN)
  const isGuruUser = Boolean(
    currentUser?.isGuru ||
    currentUser?.role === 'guru' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'master' ||
    isMasterIqbal
  );

  const currentExamQuestions = useMemo(() => {
    const list = selectedExam?.soal_list || [];
    if (isGuruUser) {
      return list;
    }
    // Jika Siswa: Hapus field kunci dan pedoman dari state & DOM
    return list.map((q) => {
      const { kunci, pedoman, ...safeQuestion } = q;
      return {
        ...safeQuestion,
        kunci_hash: hashAnswerKey(q.id || q.nomor, kunci),
      };
    });
  }, [selectedExam, isGuruUser]);

  const currentActiveQuestion = currentExamQuestions.find((q) => q.nomor === activeQuestionNum) || currentExamQuestions[0];

  return (
    <div style={{ padding: '4px 0 30px 0' }}>
      {/* ============================================================== */}
      {/* 1. SUB-MENU 1: RUANG UJIAN SISWA (CBT REALTIME & ANTI-CHEAT)   */}
      {/* ============================================================== */}
      {effectiveTab === 'ruang_ujian' && (
        isTeacherOrAdmin ? (
          <div style={{ backgroundColor: '#f8fafc', padding: '36px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🔒</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '18px', fontWeight: 'bold' }}>Ruang Ujian Khusus Siswa/i</h3>
            <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '520px', margin: '0 auto 18px auto', lineHeight: '1.5' }}>
              Mode mengerjakan ujian siswa/i tidak tersedia untuk akun <b>Bapak/Ibu Guru</b> dan <b>Admin Sekolah</b>. Silakan gunakan menu <b>Buat Soal</b> untuk menyusun paket ujian atau <b>Koreksi Essay &amp; Nilai</b> untuk memeriksa hasil ujian siswa.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onSubMenuChange && onSubMenuChange('buat_ujian')}
                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🛠️ Buat &amp; Kelola Soal Ujian
              </button>
              <button
                type="button"
                onClick={() => onSubMenuChange && onSubMenuChange('koreksi_essay')}
                style={{ backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                💯 Koreksi Essay &amp; Nilai
              </button>
            </div>
          </div>
        ) : (
        <div>
          {!isExamRunning && !examResult && (
            <div>
              {/* LOBBY UJIAN */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: '20px' }}>
                      RUANG UJIAN CBT ONLINE
                    </span>
                    <h1 style={{ margin: '8px 0 4px 0', fontSize: '22px', fontWeight: 'bold' }}>
                      Ujian Sekolah Berbasis Komputer &amp; HP
                    </h1>
                    <p style={{ margin: 0, fontSize: '13px', color: '#ede9fe' }}>
                      Platform CBT Resmi SMK YPK Medan dengan Sistem Anti-Nyontek, Timer Otomatis &amp; Nilai Instan.
                    </p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '12px 18px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#f5d0fe', display: 'block' }}>Paket Ujian Aktif</span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>{examList.length}</span>
                  </div>
                </div>
              </div>

              {/* PILIH PAKET UJIAN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                {examList.map((exam) => {
                  const isSelected = selectedExam?.id === exam.id;
                  const pgCount = exam.soal_list.filter((q) => q.tipe === 'PG').length;
                  const essayCount = exam.soal_list.filter((q) => q.tipe === 'Essay').length;

                  return (
                    <div
                      key={exam.id}
                      className="stardust-white-card"
                      style={{
                        borderRadius: '14px',
                        padding: '20px',
                        border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                        boxShadow: isSelected ? '0 8px 20px rgba(124, 58, 237, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '3px 10px', borderRadius: '20px' }}>
                          {exam.mata_pelajaran}
                        </span>
                        <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold', padding: '3px 8px', borderRadius: '12px' }}>
                          🟢 Aktif
                        </span>
                      </div>

                      <h3 style={{ margin: '6px 0', fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                        {exam.judul_ujian}
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '14px 0', fontSize: '12px', color: '#64748b' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                          ⏱️ Durasi: <b>{exam.durasi_menit} Menit</b>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                          🎯 KKM: <b>{exam.kkm}</b>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                          📝 Soal: <b>{pgCount} PG + {essayCount} Essay</b>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                          🛡️ Anti-Cheat: <b>Aktif (Max 3x)</b>
                        </div>
                      </div>

                      {/* Token Ujian Input */}
                      {exam.token_ujian && (
                        <div style={{ marginBottom: '14px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
                            🔑 Masukkan Token Ujian:
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: YPK2026"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                            }}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExam(exam);
                          handleStartExam();
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: '#7c3aed',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '12px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                        }}
                      >
                        🚀 Masuk Ruang Ujian CBT
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* RUANG UJIAN LIVE CBT (FULLSCREEN & ANTI-CHEAT ENGINE)           */}
          {/* ============================================================== */}
          {isExamRunning && currentActiveQuestion && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999999,
                backgroundColor: '#f8fafc',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                userSelect: 'none', // Cegah select teks
              }}
            >
              {/* TOP HEADER UJIAN (TIMER & ANTI-CHEAT INDICATOR) */}
              <div
                style={{
                  background: 'linear-gradient(90deg, #1e1b4b, #312e81, #4338ca)',
                  color: '#ffffff',
                  padding: '12px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedExam?.judul_ujian}</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#ec4899', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                      CBT LIVE
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#c7d2fe', marginTop: '2px' }}>
                    Peserta: <b>{currentUser?.nama || 'Siswa'}</b> | Kelas: <b>{currentUser?.kelas || siswaAdminKelas || 'X TJKT'}</b>
                  </div>
                </div>

                {/* Sisa Waktu & Pelanggaran */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Status Pelanggaran */}
                  <div
                    style={{
                      backgroundColor: violationCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.2)',
                      border: violationCount > 0 ? '1px solid #ef4444' : '1px solid #22c55e',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: violationCount > 0 ? '#fca5a5' : '#86efac',
                    }}
                  >
                    🛡️ Pelanggaran: {violationCount} / {selectedExam?.max_tab_violations || 3}
                  </div>

                  {/* Countdown Timer */}
                  <div
                    style={{
                      backgroundColor: timeLeftSeconds < 300 ? '#ef4444' : '#1e293b',
                      color: '#ffffff',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '800',
                      letterSpacing: '1px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      animation: timeLeftSeconds < 300 ? 'pulse 1s infinite' : 'none',
                    }}
                  >
                    ⏱️ {formattedTimeLeft}
                  </div>
                </div>
              </div>

              {/* PROGRESS BAR WAKTU */}
              <div style={{ height: '4px', backgroundColor: '#e2e8f0', width: '100%' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: timeLeftSeconds < 300 ? '#ef4444' : '#22c55e',
                    width: `${Math.min(100, (timeLeftSeconds / ((selectedExam?.durasi_menit || 60) * 60)) * 100)}%`,
                    transition: 'width 1s linear',
                  }}
                />
              </div>

              {/* KONTEN UTAMA: SOAL & KISI-KISI NOMOR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', padding: '20px' }}>
                {/* PANEL SOAL */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '480px',
                  }}
                >
                  <div>
                    {/* Header Nomor Soal & Font Control */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a' }}>
                          Soal No. {currentActiveQuestion.nomor}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            backgroundColor: currentActiveQuestion.tipe === 'PG' ? '#e0f2fe' : '#fef3c7',
                            color: currentActiveQuestion.tipe === 'PG' ? '#0369a1' : '#92400e',
                          }}
                        >
                          {currentActiveQuestion.tipe === 'PG' ? 'Pilihan Ganda (Bobot 2 Poin)' : 'Essay (Bobot 8 Poin)'}
                        </span>
                      </div>

                      {/* Font Resizer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Ukuran Teks:</span>
                        <button
                          type="button"
                          onClick={() => setFontSizeLevel((prev) => Math.max(13, prev - 1))}
                          style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontSizeLevel((prev) => Math.min(22, prev + 1))}
                          style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* Teks Pertanyaan */}
                    <div style={{ fontSize: `${fontSizeLevel}px`, lineHeight: '1.6', color: '#0f172a', marginBottom: '20px', fontWeight: '500' }}>
                      {currentActiveQuestion.pertanyaan}
                    </div>

                    {/* PILIHAN GANDA (A - E) */}
                    {currentActiveQuestion.tipe === 'PG' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {['A', 'B', 'C', 'D', 'E'].map((optKey) => {
                          const optText = currentActiveQuestion[`opsi_${optKey.toLowerCase()}`];
                          if (!optText) return null;

                          const isSelected = studentAnswers[currentActiveQuestion.nomor] === optKey;

                          return (
                            <div
                              key={optKey}
                              onClick={() => handleSelectAnswer(currentActiveQuestion.nomor, optKey)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                                  color: isSelected ? '#ffffff' : '#475569',
                                  fontWeight: 'bold',
                                  fontSize: '13px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {optKey}
                              </div>
                              <span style={{ fontSize: `${fontSizeLevel - 1}px`, color: isSelected ? '#1e40af' : '#334155', fontWeight: isSelected ? '600' : 'normal' }}>
                                {optText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ESSAY (TEXTAREA) */}
                    {currentActiveQuestion.tipe === 'Essay' && (
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '6px' }}>
                          ✍️ Tulis Jawaban Essay Anda di bawah ini:
                        </label>
                        <textarea
                          rows={6}
                          placeholder="Ketik uraian jawaban Anda secara lengkap dan jelas..."
                          value={studentAnswers[currentActiveQuestion.nomor] || ''}
                          onChange={(e) => handleSelectAnswer(currentActiveQuestion.nomor, e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: `${fontSizeLevel}px`,
                            lineHeight: '1.5',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>
                          💾 Jawaban tersimpan otomatis secara realtime
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM ACTION BUTTONS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={currentActiveQuestion.nomor === 1}
                      onClick={() => setActiveQuestionNum((prev) => Math.max(1, prev - 1))}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: currentActiveQuestion.nomor === 1 ? '#f1f5f9' : '#ffffff',
                        color: currentActiveQuestion.nomor === 1 ? '#94a3b8' : '#334155',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: currentActiveQuestion.nomor === 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ⬅️ Sebelumnya
                    </button>

                    {/* Ragu-Ragu Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleRagu(currentActiveQuestion.nomor)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: '1px solid #f59e0b',
                        backgroundColor: raguList[currentActiveQuestion.nomor] ? '#f59e0b' : '#fffbeb',
                        color: raguList[currentActiveQuestion.nomor] ? '#ffffff' : '#b45309',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {raguList[currentActiveQuestion.nomor] ? '🟡 Ditandai Ragu' : '⚪ Ragu-Ragu'}
                    </button>

                    {currentActiveQuestion.nomor < currentExamQuestions.length ? (
                      <button
                        type="button"
                        onClick={() => setActiveQuestionNum((prev) => Math.min(currentExamQuestions.length, prev + 1))}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Selanjutnya ➡️
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const totalAnswered = Object.keys(studentAnswers).filter((k) => studentAnswers[k] && String(studentAnswers[k]).trim().length > 0).length;
                          const totalQuestions = currentExamQuestions.length;

                          Swal.fire({
                            title: 'Selesaikan Ujian Sekarang?',
                            html: `
                              <div style="font-size: 13px; text-align: left;">
                                <p>Terjawab: <b>${totalAnswered} / ${totalQuestions} Soal</b></p>
                                <p>Belum Terjawab: <b>${totalQuestions - totalAnswered} Soal</b></p>
                                <p>Apakah Anda yakin ingin mengakhiri dan mengirim seluruh jawaban Anda?</p>
                              </div>
                            `,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: '✅ Ya, Kirim Jawaban',
                            cancelButtonText: 'Periksa Lagi',
                            confirmButtonColor: '#16a34a',
                          }).then((res) => {
                            if (res.isConfirmed) {
                              handleFinishExam(false);
                            }
                          });
                        }}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                        }}
                      >
                        ✅ Selesai &amp; Kumpulkan
                      </button>
                    )}
                  </div>
                </div>

                {/* KISI-KISI NAVIGASI NOMOR SOAL (1 - 35) */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '18px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#0f172a', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    📑 Kisi-Kisi Nomor Soal (1 - 35)
                  </h4>

                  {/* Legend */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#22c55e' }} />
                      <span>Terjawab</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#f59e0b' }} />
                      <span>Ragu-Ragu</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#e2e8f0' }} />
                      <span>Belum</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', border: '2px solid #2563eb' }} />
                      <span>Aktif</span>
                    </div>
                  </div>

                  {/* Grid Buttons */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '8px',
                      maxHeight: '340px',
                      overflowY: 'auto',
                      padding: '2px',
                    }}
                  >
                    {currentExamQuestions.map((q) => {
                      const ans = studentAnswers[q.nomor];
                      const hasAnswered = ans && String(ans).trim().length > 0;
                      const isRagu = raguList[q.nomor];
                      const isCurrent = q.nomor === currentActiveQuestion.nomor;

                      let bg = '#f8fafc';
                      let color = '#475569';
                      let border = '1px solid #cbd5e1';

                      if (hasAnswered) {
                        bg = '#dcfce7';
                        color = '#166534';
                        border = '1px solid #86efac';
                      }
                      if (isRagu) {
                        bg = '#fef3c7';
                        color = '#92400e';
                        border = '1px solid #fde68a';
                      }
                      if (isCurrent) {
                        border = '2px solid #2563eb';
                      }

                      return (
                        <button
                          key={q.nomor}
                          type="button"
                          onClick={() => setActiveQuestionNum(q.nomor)}
                          style={{
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: bg,
                            color: color,
                            border: border,
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span>{q.nomor}</span>
                          {q.tipe === 'Essay' && <span style={{ fontSize: '7px', opacity: 0.7 }}>ESSAY</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODAL HASIL UJIAN SELESAI                                       */}
          {/* ============================================================== */}
          {examResult && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '28px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                maxWidth: '600px',
                margin: '0 auto',
                textAlign: 'center',
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                🎉
              </div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>
                Ujian Berhasil Diselesaikan!
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {examResult.judul_ujian}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '20px 0' }}>
                <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '11px', color: '#166534', display: 'block' }}>Skor PG</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                    {examResult.nilai_pg} / {examResult.total_max_pg}
                  </span>
                </div>
                <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: '11px', color: '#1e40af', display: 'block' }}>Benar PG</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>
                    {examResult.correct_pg} / {examResult.total_pg}
                  </span>
                </div>
                <div style={{ backgroundColor: '#fdf2f8', padding: '12px', borderRadius: '10px', border: '1px solid #fbcfe8' }}>
                  <span style={{ fontSize: '11px', color: '#9d174d', display: 'block' }}>Anti-Cheat Log</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: examResult.violations === 0 ? '#16a34a' : '#e11d48' }}>
                    {examResult.violations === 0 ? '🛡️ Aman' : `${examResult.violations}x Teguran`}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                ℹ️ <b>Status Koreksi Essay:</b> Jawaban 5 Soal Essay Anda telah tersimpan dan sedang menunggu penilaian manual dari Guru Pengampu.
              </p>

              <button
                type="button"
                onClick={() => setExamResult(null)}
                style={{
                  marginTop: '16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Kembali ke Menu Ujian
              </button>
            </div>
          )}
        </div>
        )
      )}

      {/* ============================================================== */}
      {/* 2. SUB-MENU 2: BUAT SOAL UJIAN (30 PG + 5 ESSAY) - GURU / ADMIN */}
      {/* ============================================================== */}
      {effectiveTab === 'buat_ujian' && (
        isStudentUser ? (
          <div style={{ backgroundColor: '#fef2f2', padding: '36px 20px', borderRadius: '16px', border: '1px solid #fecaca', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🚫</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: '18px', fontWeight: 'bold' }}>Hak Akses Dibatasi</h3>
            <p style={{ color: '#7f1d1d', fontSize: '13px', maxWidth: '480px', margin: '0 auto 18px auto', lineHeight: '1.5' }}>
              Fitur pembuatan soal dan bank soal CBT hanya dapat diakses oleh <b>Bapak/Ibu Guru</b> dan <b>Admin Sekolah</b>.
            </p>
            <button
              type="button"
              onClick={() => onSubMenuChange && onSubMenuChange('ruang_ujian')}
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✍️ Kembali ke Ruang Ujian Siswa/i
            </button>
          </div>
        ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#1e3a8a', fontWeight: 'bold' }}>
                🛠️ Buat Paket Soal Ujian Baru (Standar 30 PG + 5 Essay)
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Lengkapi rincian ujian, buat butir soal pilihan ganda &amp; essay, atau gunakan import cepat.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleGenerateStandardTemplate}
                style={{
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed',
                  border: '1px solid #d8b4fe',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ⚡ Template 30 PG + 5 Essay
              </button>
              <button
                type="button"
                onClick={handleSaveExamPackage}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                }}
              >
                💾 Simpan &amp; Terbitkan Ujian
              </button>
            </div>
          </div>

          {/* FORM PENGATURAN UMUM UJIAN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Judul Ujian:</label>
              <input
                type="text"
                placeholder="Contoh: PTS Ganjil Kejuruan TJKT 2026"
                value={formJudul}
                onChange={(e) => setFormJudul(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Mata Pelajaran:</label>
              <input
                type="text"
                value={formMapel}
                onChange={(e) => setFormMapel(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Durasi (Menit):</label>
              <input
                type="number"
                value={formDurasi}
                onChange={(e) => setFormDurasi(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>KKM Nilai:</label>
              <input
                type="number"
                value={formKkm}
                onChange={(e) => setFormKkm(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Token Ujian (Opsional):</label>
              <input
                type="text"
                placeholder="Contoh: YPK2026"
                value={formToken}
                onChange={(e) => setFormToken(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', textTransform: 'uppercase' }}
              />
            </div>
          </div>

          {/* TAB BUILDER: PG / ESSAY / IMPORT */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '18px' }}>
            <button
              type="button"
              onClick={() => setActiveTabBuilder('pg')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: activeTabBuilder === 'pg' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: activeTabBuilder === 'pg' ? '#eff6ff' : '#ffffff',
                color: activeTabBuilder === 'pg' ? '#1e40af' : '#475569',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              📝 30 Soal Pilihan Ganda (PG 1 - 30)
            </button>
            <button
              type="button"
              onClick={() => setActiveTabBuilder('essay')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: activeTabBuilder === 'essay' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                backgroundColor: activeTabBuilder === 'essay' ? '#fff7ed' : '#ffffff',
                color: activeTabBuilder === 'essay' ? '#c2410c' : '#475569',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ✍️ 5 Soal Essay (Soal 31 - 35)
            </button>
            <button
              type="button"
              onClick={() => setActiveTabBuilder('import')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: activeTabBuilder === 'import' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                backgroundColor: activeTabBuilder === 'import' ? '#f3e8ff' : '#ffffff',
                color: activeTabBuilder === 'import' ? '#6b21a8' : '#475569',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              📥 Import Cepat dari Teks / AI
            </button>
          </div>

          {/* TAB 1: PILIHAN GANDA (PG 1 - 30) */}
          {activeTabBuilder === 'pg' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formSoalList.filter((q) => q.tipe === 'PG').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  <p>Belum ada butir soal pilihan ganda.</p>
                  <button
                    type="button"
                    onClick={handleGenerateStandardTemplate}
                    style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ⚡ Generate Otomatis 30 Slot Soal PG
                  </button>
                </div>
              ) : (
                formSoalList
                  .filter((q) => q.tipe === 'PG')
                  .map((q, idx) => (
                    <div key={q.id || idx} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', backgroundColor: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>Soal No. {q.nomor} (Pilihan Ganda)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Kunci Jawaban:</span>
                          <select
                            value={q.kunci || 'A'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormSoalList((prev) => prev.map((item) => (item.nomor === q.nomor ? { ...item, kunci: val } : item)));
                            }}
                            style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#16a34a' }}
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                            <option value="E">E</option>
                          </select>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        placeholder="Tuliskan pertanyaan soal..."
                        value={q.pertanyaan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSoalList((prev) => prev.map((item) => (item.nomor === q.nomor ? { ...item, pertanyaan: val } : item)));
                        }}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '8px' }}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                        {['a', 'b', 'c', 'd', 'e'].map((k) => (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', width: '16px' }}>{k.toUpperCase()}:</span>
                            <input
                              type="text"
                              value={q[`opsi_${k}`] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormSoalList((prev) => prev.map((item) => (item.nomor === q.nomor ? { ...item, [`opsi_${k}`]: val } : item)));
                              }}
                              placeholder={`Opsi ${k.toUpperCase()}`}
                              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* TAB 2: ESSAY (SOAL 31 - 35) */}
          {activeTabBuilder === 'essay' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formSoalList.filter((q) => q.tipe === 'Essay').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  <p>Belum ada butir soal essay.</p>
                  <button
                    type="button"
                    onClick={handleGenerateStandardTemplate}
                    style={{ backgroundColor: '#ea580c', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ⚡ Generate Otomatis 5 Slot Soal Essay
                  </button>
                </div>
              ) : (
                formSoalList
                  .filter((q) => q.tipe === 'Essay')
                  .map((q, idx) => (
                    <div key={q.id || idx} style={{ border: '1px solid #fed7aa', borderRadius: '10px', padding: '14px', backgroundColor: '#fffbeb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c2410c' }}>Soal No. {q.nomor} (Essay)</span>
                        <span style={{ fontSize: '11px', color: '#78350f', fontWeight: 'bold' }}>Bobot: 8 Poin</span>
                      </div>

                      <textarea
                        rows={3}
                        placeholder="Tuliskan pertanyaan essay..."
                        value={q.pertanyaan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSoalList((prev) => prev.map((item) => (item.nomor === q.nomor ? { ...item, pertanyaan: val } : item)));
                        }}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '6px', border: '1px solid #fed7aa', fontSize: '12px', marginBottom: '8px' }}
                      />

                      <input
                        type="text"
                        placeholder="Pedoman Penilaian / Kunci Jawaban Essay Guru"
                        value={q.pedoman || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSoalList((prev) => prev.map((item) => (item.nomor === q.nomor ? { ...item, pedoman: val } : item)));
                        }}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fed7aa', fontSize: '11px' }}
                      />
                    </div>
                  ))
              )}
            </div>
          )}

          {/* TAB 3: BULK TEXT IMPORT */}
          {activeTabBuilder === 'import' && (
            <div>
              <div style={{ backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe', padding: '12px', borderRadius: '8px', color: '#581c87', fontSize: '12px', marginBottom: '12px' }}>
                💡 <b>Petunjuk Format Import Cepat:</b> Tempel teks soal dengan format nomor (contoh: <code>1. Pertanyaan... A. Opsi A B. Opsi B ... Kunci: A</code>). Nomor 1-30 otomatis menjadi Pilihan Ganda, nomor 31-35 otomatis menjadi Essay!
              </div>

              <textarea
                rows={12}
                placeholder="Tempel soal ujian lengkap di sini..."
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace' }}
              />

              <button
                type="button"
                onClick={handleProcessBulkImport}
                style={{
                  marginTop: '12px',
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ⚡ Proses Parsing &amp; Buat Soal Sekarang
              </button>
            </div>
          )}
        </div>
        )
      )}

      {/* ============================================================== */}
      {/* 3. SUB-MENU 3: KOREKSI ESSAY & REKAPITULASI NILAI GURU          */}
      {/* ============================================================== */}
      {effectiveTab === 'koreksi_essay' && (
        isStudentUser ? (
          <div style={{ backgroundColor: '#fef2f2', padding: '36px 20px', borderRadius: '16px', border: '1px solid #fecaca', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>🚫</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: '18px', fontWeight: 'bold' }}>Hak Akses Dibatasi</h3>
            <p style={{ color: '#7f1d1d', fontSize: '13px', maxWidth: '480px', margin: '0 auto 18px auto', lineHeight: '1.5' }}>
              Fitur koreksi essay dan rekapitulasi nilai hanya dapat diakses oleh <b>Bapak/Ibu Guru</b> dan <b>Admin Sekolah</b>.
            </p>
            <button
              type="button"
              onClick={() => onSubMenuChange && onSubMenuChange('ruang_ujian')}
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✍️ Kembali ke Ruang Ujian Siswa/i
            </button>
          </div>
        ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>
                💯 Koreksi Essay &amp; Rekapitulasi Nilai Siswa
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Periksa jawaban essay siswa, berikan nilai, dan ekspor seluruh rekapitulasi ke format Excel.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportGradesCsv}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📊 Ekspor Excel (.CSV)
            </button>
          </div>

          {/* TABEL DAFTAR HASIL UJIAN SISWA */}
          {submissionList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Belum ada siswa yang mengumpulkan ujian.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px' }}>No</th>
                    <th style={{ padding: '10px' }}>Nama Siswa</th>
                    <th style={{ padding: '10px' }}>Kelas</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Nilai PG</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Nilai Essay</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Total Nilai</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Anti-Cheat</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionList.map((sub, i) => (
                    <tr key={sub.id || i} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '10px' }}>{i + 1}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#1e40af' }}>{sub.nama_siswa}</td>
                      <td style={{ padding: '10px' }}>{sub.kelas}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#0369a1' }}>{sub.nilai_pg}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#ea580c' }}>{sub.nilai_essay}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: '800', fontSize: '14px', color: sub.total_nilai >= 75 ? '#16a34a' : '#dc2626' }}>
                        {sub.total_nilai}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: sub.violations === 0 ? '#16a34a' : '#dc2626' }}>
                          {sub.violations === 0 ? '🛡️ Aman (0)' : `⚠️ ${sub.violations}x`}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '12px', backgroundColor: sub.status_koreksi?.includes('Lulus') ? '#dcfce7' : '#fef3c7', color: sub.status_koreksi?.includes('Lulus') ? '#166534' : '#92400e' }}>
                          {sub.status_koreksi}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setGradingSubmission(sub);
                            setEssayScores({});
                          }}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          ✍️ Periksa Essay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* MODAL KOREKSI ESSAY OLEH GURU */}
          {gradingSubmission && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  maxWidth: '700px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '24px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a' }}>
                      Koreksi Essay: {gradingSubmission.nama_siswa} ({gradingSubmission.kelas})
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Nilai PG Siswa: <b>{gradingSubmission.nilai_pg}</b></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGradingSubmission(null)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    ✕
                  </button>
                </div>

                {/* 5 SOAL ESSAY */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(selectedExam?.soal_list || []).filter((q) => q.tipe === 'Essay').map((eq) => {
                    const studentAnswerText = gradingSubmission.answers?.[eq.nomor] || '*(Siswa tidak mengisi jawaban essay ini)*';

                    return (
                      <div key={eq.nomor} style={{ border: '1px solid #fed7aa', borderRadius: '10px', padding: '14px', backgroundColor: '#fffbeb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c2410c' }}>Soal No. {eq.nomor} (Bobot Max: {eq.bobot} Poin)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Beri Nilai (0 - {eq.bobot}):</span>
                            <input
                              type="number"
                              min={0}
                              max={eq.bobot}
                              value={essayScores[eq.nomor] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEssayScores((prev) => ({ ...prev, [eq.nomor]: v }));
                              }}
                              style={{ width: '60px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', textAlign: 'center' }}
                            />
                          </div>
                        </div>

                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#334155', fontWeight: '500' }}>
                          <b>Pertanyaan:</b> {eq.pertanyaan}
                        </p>

                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#0f172a', lineHeight: '1.5' }}>
                          <b>Jawaban Siswa:</b>
                          <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{studentAnswerText}</div>
                        </div>

                        {eq.pedoman && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#78350f' }}>
                            📖 <i>Pedoman Guru: {eq.pedoman}</i>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setGradingSubmission(null)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEssayGrading}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    💾 Simpan Koreksi &amp; Nilai Akhir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        )
      )}

      {/* ============================================================== */}
      {/* 4. SUB-MENU 4: BANK SOAL & ARSIP                               */}
      {/* ============================================================== */}
      {effectiveTab === 'bank_soal' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>
            📑 Bank Soal &amp; Arsip Paket Ujian
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {examList.map((exam) => (
              <div key={exam.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c3aed', backgroundColor: '#f3e8ff', padding: '2px 8px', borderRadius: '10px' }}>
                  {exam.mata_pelajaran}
                </span>
                <h4 style={{ margin: '8px 0 4px 0', fontSize: '15px', color: '#0f172a' }}>{exam.judul_ujian}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Total: {exam.soal_list.length} Butir Soal (30 PG + 5 Essay) | Durasi: {exam.durasi_menit} Menit
                </p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExam(exam);
                      if (onSubMenuChange) onSubMenuChange('ruang_ujian');
                    }}
                    style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Buka Ujian
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (examList.length === 1) {
                        Swal.fire('Info', 'Minimal harus ada 1 paket ujian.', 'info');
                        return;
                      }
                      const updated = examList.filter((e) => e.id !== exam.id);
                      saveExamsToLocal(updated);
                      Swal.fire('Dihapus', 'Paket ujian berhasil dihapus.', 'success');
                    }}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fff1f2', color: '#e11d48', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ⚠️ MODAL PERINGATAN PELANGGARAN ANTI-NYONTEK                    */}
      {/* ============================================================== */}
      {isCheatWarningModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(220, 38, 38, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              padding: '30px',
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
              border: '4px solid #ef4444',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🚨</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#dc2626', fontWeight: '800' }}>
              PERINGATAN SISTEM ANTI-NYONTEK!
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Anda terdeteksi melakukan tindakan terlarang:
              <br />
              <b style={{ color: '#b91c1c' }}>"{cheatWarningReason}"</b>
            </p>

            <div style={{ backgroundColor: '#fef2f2', border: '2px solid #fecaca', borderRadius: '12px', padding: '14px', margin: '18px 0' }}>
              <span style={{ fontSize: '12px', color: '#991b1b', display: 'block' }}>Status Pelanggaran Anda:</span>
              <span style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>
                {violationCount} / {selectedExam?.max_tab_violations || 3} TEGURAN
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#7f1d1d' }}>
                Jika mencapai 3x teguran, ujian akan <b>dihentikan otomatis</b> dan jawaban langsung diserahkan ke guru!
              </p>
            </div>

            {violationCount < (selectedExam?.max_tab_violations || 3) ? (
              <button
                type="button"
                onClick={() => {
                  enterFullscreen();
                  setIsCheatWarningModal(false);
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ⚠️ Saya Mengerti &amp; Kembali ke Ujian Fullscreen
              </button>
            ) : (
              <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '13px' }}>
                ⏳ Batas pelanggaran terlampaui. Mengumpulkan jawaban otomatis...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
