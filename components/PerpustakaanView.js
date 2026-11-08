'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function PerpustakaanView({ currentUser }) {
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchBook, setSearchBook] = useState('');
  const [readingBook, setReadingBook] = useState(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [readerFontSize, setReaderFontSize] = useState(14); // 13, 14, 16, 18

  // 🔒 HAK AKSES UPLOAD: ADMIN MASTER, ADMIN GURU, DAN SELURUH GURU
  const isSiswaAdminUser = Boolean(
    String(currentUser?.role || '').toLowerCase().includes('siswa_admin') ||
    (String(currentUser?.id).startsWith('SISWA-') && String(currentUser?.role || '').toLowerCase().includes('admin'))
  );
  const isSiswa = Boolean(!currentUser?.isGuru || String(currentUser?.id).startsWith('SISWA-') || isSiswaAdminUser);
  const isMasterIqbalUser = Boolean(
    currentUser?.username?.toLowerCase() === 'iqbal' ||
    currentUser?.nama?.toLowerCase()?.includes('iqbal') ||
    currentUser?.role?.toLowerCase() === 'master'
  );
  const canManageLibrary = !isSiswa || isMasterIqbalUser;

  // 📚 KOLEKSI BUKU JURUSAN TERBARU LENGKAP OLEH AI (KURIKULUM MERDEKA 2026)
  const DEFAULT_BOOKS = [
    // 🌐 TJKT (Teknik Jaringan Komputer & Telekomunikasi)
    {
      id: 'B-TJKT-1',
      judul: 'Dasar-Dasar Teknik Jaringan Komputer & Telekomunikasi (TJKT 2026)',
      penulis: 'Kementerian Pendidikan & Kebudayaan RI',
      kategori: 'TJKT',
      halaman: 284,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
      ringkasan: 'Buku teks kurikulum merdeka terkini memuat konsep arsitektur jaringan komputer, model referensi OSI & TCP/IP 7 Layer, pengalamatan IPv4/IPv6 VLSM, media transmisi fiber optic, instalasi perangkat keras jaringan, dan standardisasi K3LH bengkel telekomunikasi.',
      babList: [
        {
          bab: 'BAB I: Proses Bisnis di Bidang TJKT & Standardisasi Industri',
          konten: `Capaian Pembelajaran:\nMemahami alur perencanaan, instalasi, dan pemeliharaan infrastruktur jaringan komputer pada skala enterprise dan telekomunikasi industri modern.\n\nMateri Inti:\n1. Perkembangan teknologi telekomunikasi dari era 4G LTE menuju 5G, FTTH (Fiber to the Home), dan IoT (Internet of Things).\n2. Standar keselamatan dan kesehatan kerja (K3LH) dalam penarikan kabel udara dan instalasi server rack.\n3. Peran engineer TJKT dalam mendukung infrastruktur smart city dan data center modern.`,
        },
        {
          bab: 'BAB II: Konsep Jaringan Komputer & Model OSI vs TCP/IP',
          konten: `Penjelasan Detail:\nModel referensi OSI 7 Layer (Physical, Data Link, Network, Transport, Session, Presentation, Application) dibandingkan dengan protokol TCP/IP Suite.\n\nSub-Materi:\n• Physical Layer: Media transmisi twisted pair (UTP/STP Cat6), Coaxial, dan Fiber Optic (Single mode vs Multi mode).\n• Data Link Layer: Addressing MAC Address, Switching mechanism, dan framing Ethernet 802.3.\n• Network Layer: Routing IPv4 Classless (CIDR & VLSM) serta transisi implementasi IPv6 Hexadecimal.`,
        },
        {
          bab: 'BAB III: Praktikum Konfigurasi Switching, Routing & Subnetting',
          konten: `Langkah Kerja Praktik Laboratorium:\n1. Perhitungan Subnetting VLSM untuk alokasi IP departemen di sekolah/perusahaan.\n2. Konfigurasi VLAN (Virtual LAN) dan Inter-VLAN Routing pada switch manageable.\n3. Implementasi DHCP Server dan NAT (Network Address Translation) untuk distribusi koneksi internet client.\n4. Troubleshooting konektivitas menggunakan utility ping, traceroute, nslookup, dan Wireshark packet capture.`,
        },
        {
          bab: 'BAB IV: Evaluasi Mandiri & Proyek Jaringan Sekolah',
          konten: `Tugas Proyek Mandiri:\nRancanglah topologi jaringan gedung sekolah 3 lantai dengan pembagian VLAN Administrasi, Laboratorium Komputer, dan Hotspot Guru/Siswa. Buat analisis kebutuhan bandwidth dan anggaran perangkat hardware!`,
        },
      ],
    },
    {
      id: 'B-TJKT-2',
      judul: 'Administrasi Sistem Jaringan & Cloud Server (Debian 12 & Linux Enterprise)',
      penulis: 'M. Iqbal Rangkuti, S.Kom., Gr.',
      kategori: 'TJKT',
      halaman: 260,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)',
      ringkasan: 'Buku panduan praktis konfigurasi Linux Server enterprise: DNS Bind9, Web Server Nginx/Apache, Database MySQL/MariaDB, FTP Server, SSL Let\'s Encrypt, Containerization Docker, dan Cloud Virtualization.',
      babList: [
        {
          bab: 'BAB I: Instalasi & Manajemen Dasar Server Linux Debian 12',
          konten: `Pengantar Sistem Operasi Jaringan:\nInstalasi Debian Server mode CLI (Headless), manajemen paket APT repository, pengelolaan user privilege (sudoers), permission file (chmod/chown), dan konfigurasi static IP interfaces Netplan/Networking.`,
        },
        {
          bab: 'BAB II: Konfigurasi Layanan Server Utama (DNS, Web & Database)',
          konten: `Langkah Konfigurasi Server:\n1. DNS Server (Bind9): Konfigurasi Forwarding Zone & Reverse Zone untuk domain lokal sekolah.\n2. Web Server (Nginx & PHP-FPM): Virtual Host server block, optimasi caching HTTP/2, dan instalasi sertifikat SSL/TLS HTTPS.\n3. Database Server: MySQL/MariaDB secure installation, user permission, dan remote connection setup.`,
        },
        {
          bab: 'BAB III: Containerization Docker & Cloud Hosting VPS',
          konten: `Teknologi Server Modern:\nDeploy aplikasi web sekolah menggunakan Docker Container, Dockerfile, Docker-Compose, serta teknik backup otomatis database harian ke cloud storage berbasis cronjob.`,
        },
      ],
    },
    {
      id: 'B-TJKT-3',
      judul: 'Teknologi Jaringan Kabel & Nirkabel (Fiber Optic & Mikrotik MTCNA)',
      penulis: 'Tim Guru Kejuruan TJKT SMK YPK',
      kategori: 'TJKT',
      halaman: 245,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
      ringkasan: 'Materi lengkap teknik penyambungan kabel serat optik (Fusion Splicer & OTDR), topologi FTTH, konfigurasi RouterOS Mikrotik (Firewall, Bandwidth Queue, Hotspot Billing, VPN Tunneling).',
      babList: [
        {
          bab: 'BAB I: Dasar Fiber Optic & Prosedur Splicing K3LH',
          konten: `Prinsip transmisi cahaya pada kabel Fiber Optic. Penggunaan alat kerja presisi: Miller Stripper, Fiber Cleaver, Fusion Splicer, OPM (Optical Power Meter), dan VFL (Visual Fault Locator) laser.`,
        },
        {
          bab: 'BAB II: Konfigurasi Routing & Firewall RouterOS Mikrotik',
          konten: `Konfigurasi Router Gateway, Static & Dynamic Routing (OSPF), Firewall Filter Rules (Input, Forward, Output), Mangle packet marking, dan proteksi serangan DDoS/Port Scanning.`,
        },
        {
          bab: 'BAB III: Manajemen Bandwidth Simple Queue & User Manager Hotspot',
          konten: `Implementasi Queue Tree & PCQ (Per Connection Queue) untuk pembagian bandwidth adil, serta setup Hotspot Server dengan voucher login terintegrasi Radius Server.`,
        },
      ],
    },
    {
      id: 'B-TJKT-4',
      judul: 'Keamanan Jaringan & Cyber Security Awareness SMK',
      penulis: 'Pusat Keamanan Siber Komputer',
      kategori: 'TJKT',
      halaman: 215,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
      ringkasan: 'Panduan pertahanan siber dasar: identifikasi vulnerability, penetration testing dasar, hardening server, enkripsi kriptografi, keamanan Wi-Fi WPA3, dan mitigasi social engineering.',
      babList: [
        {
          bab: 'BAB I: Pengenalan Ancaman Siber & Prinsip CIA Triad',
          konten: `Memahami pilar keamanan informasi: Confidentiality (Kerahasiaan), Integrity (Keutuhan), dan Availability (Ketersediaan). Mengenal vektor serangan umum seperti Malware, Phishing, Ransomware, dan MITM Attack.`,
        },
        {
          bab: 'BAB II: Network Vulnerability Assessment & Hardening Server',
          konten: `Teknik pemindaian port menggunakan Nmap, analisis log server, penutupan port rentan, pengamanan SSH dengan Public Key Authentication & Fail2ban, serta implementasi WAF (Web Application Firewall).`,
        },
      ],
    },

    // 📊 AKL (Akuntansi & Keuangan Lembaga)
    {
      id: 'B-AKL-1',
      judul: 'Praktikum Akuntansi Lembaga & Instansi Pemerintah',
      penulis: 'Drs. Supriyanto, M.M',
      kategori: 'AKL',
      halaman: 210,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
      ringkasan: 'Pembahasan standar akuntansi pemerintahan (SAP), penyusunan neraca SKPD, jurnal anggaran & finansial, laporan realisasi anggaran (LRA), laporan operasional (LO), dan neraca saldo pemerintah daerah.',
      babList: [
        {
          bab: 'BAB I: Kerangka Konseptual Akuntansi Sektor Publik',
          konten: `Memahami karakteristik keuangan daerah, regulasi SAP berbasis akrual, struktur APBD (Pendapatan Daerah, Belanja Daerah, dan Pembiayaan Daerah), serta siklus pengelolaan keuangan SKPD.`,
        },
        {
          bab: 'BAB II: Persamaan Dasar & Jurnal Transaksi Keuangan SKPD',
          konten: `Praktik penjurnalan ganda (Dual Entry System): Jurnal Finansial (LO) dan Jurnal Pelaksanaan Anggaran (LRA) untuk transaksi pendapatan pajak, belanja modal, belanja gaji, dan penerimaan kas bendahara.`,
        },
        {
          bab: 'BAB III: Penyusunan Laporan Keuangan Pemerintah Lengkap',
          konten: `Langkah penyusunan Neraca Saldo Setelah Penutupan, Laporan Realisasi Anggaran (LRA), Laporan Perubahan Saldo Anggaran Lebih (LPSAL), Laporan Operasional (LO), dan Catatan atas Laporan Keuangan (CaLK).`,
        },
      ],
    },
    {
      id: 'B-AKL-2',
      judul: 'Komputer Akuntansi Terapan: MYOB & Spreadsheet Excel v2026',
      penulis: 'Tim Guru Akuntansi Kejuruan SMK YPK',
      kategori: 'AKL',
      halaman: 230,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
      ringkasan: 'Panduan langkah demi langkah komputer akuntansi: pembuatan data perusahaan baru, setup bagan akun (Chart of Accounts), kartu piutang/utang, persediaan perpetual FIFO, dan pencetakan laporan audit.',
      babList: [
        {
          bab: 'BAB I: Pengaturan Awal Database Perusahaan Dagang & Jasa',
          konten: `Setup Company Information, penentuan periode akuntansi 13 bulan, import daftar akun dari file Excel, pengaturan Tax Code PPN 11%, dan pembuatan kartu Linked Accounts.`,
        },
        {
          bab: 'BAB II: Entri Transaksi Pembelian, Penjualan & Kas Bank',
          konten: `Pencatatan faktur pembelian kredit/tunai, retur pembelian, faktur penjualan, pelunasan piutang dengan termin potongan diskon, rekonsiliasi bank, dan transaksi kas kecil sistem dana tetap.`,
        },
        {
          bab: 'BAB III: Jurnal Penyesuaian Akhir Periode & Analisis Laporan',
          konten: `Input jurnal penyesuaian (Adjusting Entries): beban penyusutan aktiva tetap, beban perlengkapan terpakai, cadangan kerugian piutang, serta pencetakan Neraca dan Laba Rugi audited.`,
        },
      ],
    },
    {
      id: 'B-AKL-3',
      judul: 'Akuntansi Keuangan & Perbankan Syariah SMK',
      penulis: 'Nurul Hidayati, S.E., M.Ak',
      kategori: 'AKL',
      halaman: 195,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
      ringkasan: 'Materi akuntansi keuangan instrumen perbankan syariah: akad Mudharabah, Musyarakah, Murabahah, Ijarah, serta tata kelola pencatatan titipan simpanan wadiah.',
      babList: [
        {
          bab: 'BAB I: Prinsip Dasar Muamalah & Perbankan Syariah',
          konten: `Memahami larangan Riba, Gharar, dan Maysir dalam transaksi keuangan. Mengenal jenis-jenis akad bagi hasil dan akad jual beli pembiayaan syariah.`,
        },
        {
          bab: 'BAB II: Akuntansi Pembiayaan Murabahah & Bagi Hasil',
          konten: `Pencatatan jurnal penerimaan margin murabahah, pengakuan keuntungan bertahap, dan perhitungan bagi hasil deposito mudharabah nasabah.`,
        },
      ],
    },
    {
      id: 'B-AKL-4',
      judul: 'Perpajakan Indonesia & Praktik SPT Elektronik (e-Faktur & e-Bupot)',
      penulis: 'Tim Vokasi Pajak & Audit',
      kategori: 'AKL',
      halaman: 220,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
      ringkasan: 'Perhitungan PPh Pasal 21 terbaru dengan tarif efektif rata-rata (TER), PPh Pasal 23, PPh Final UMKM, PPN 11%, dan simulasi pengisian SPT Masa/Tahunan secara daring pada portal DJP Online.',
      babList: [
        {
          bab: 'BAB I: Dasar Hukum Perpajakan & Perhitungan PPh 21 TER',
          konten: `Kategori PTKP (Penghasilan Tidak Kena Pajak), tarif progresif Pasal 17 UU HPP, dan simulasi penghitungan potongan pajak gaji karyawan tetap maupun honorer bulanan.`,
        },
        {
          bab: 'BAB II: Praktik e-Faktur PPN & Pelaporan SPT Masa',
          konten: `Pembuatan faktur pajak elektronik, nota retur, rekonsiliasi pajak masukan vs pajak keluaran, dan pengiriman bukti penerimaan elektronik (BPE).`,
        },
      ],
    },

    // 📂 MPLB (Manajemen Perkantoran & Layanan Bisnis)
    {
      id: 'B-MPLB-1',
      judul: 'Manajemen Perkantoran & Layanan Bisnis Modern (MPLB Digital)',
      penulis: 'Dra. Endang Sri Rahayu',
      kategori: 'MPLB',
      halaman: 196,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #701a75 0%, #d946ef 100%)',
      ringkasan: 'Buku panduan tata kelola administrasi perkantoran digital, standardisasi etika komunikasi publik & grooming profesional, korespondensi resmi bahasa Indonesia/Inggris, dan otomatisasi cloud office.',
      babList: [
        {
          bab: 'BAB I: Ruang Lingkup Manajemen Perkantoran Modern',
          konten: `Evolusi ruang kantor konvensional menuju Paperless Office dan Virtual Workplace. Peran sekretaris eksekutif dalam koordinasi jadwal pimpinan, rapat online, dan penyusunan notula digital.`,
        },
        {
          bab: 'BAB II: Pelayanan Prima (Customer Excellence) & Etika Bisnis',
          konten: `Penerapan konsep 3A (Attitude, Attention, Action), standar hospitality penerimaan tamu VIP, komunikasi via telepon profesional, dan penanganan keluhan (handling complaint) pelanggan.`,
        },
        {
          bab: 'BAB III: Tata Persuratan & Korespondensi Bisnis Resmi',
          konten: `Format surat dinas resmi: surat penawaran, surat pesanan, surat perjanjian kerja (MoU), memo internal pimpinan, dan pengelolaan email bisnis terstruktur.`,
        },
      ],
    },
    {
      id: 'B-MPLB-2',
      judul: 'Otomatisasi Tata Kelola Kearsipan Digital & Cloud Office 365',
      penulis: 'Tim MPLB Vokasi SMK YPK',
      kategori: 'MPLB',
      halaman: 210,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #86198f 0%, #a21caf 100%)',
      ringkasan: 'Metode pengarsipan modern: sistem abjad, subjek, nomor, wilayah, dan kronologis. Digitalisasi dokumen fisik melalui scanning OCR, indexing metadata, dan penyimpanan aman Google Workspace & OneDrive.',
      babList: [
        {
          bab: 'BAB I: Sistem Pengelolaan Arsip Konvensional & Digital',
          konten: `Daur hidup arsip (Penciptaan, Penggunaan, Pemeliharaan, dan Penyusutan). Perancangan jadwal retensi arsip (JRA) dan keamanan arsip rahasia perusahaan.`,
        },
        {
          bab: 'BAB II: Kolaborasi Dokumen Cloud & Integrasi Spreadsheet',
          konten: `Manajemen formulir digital, otomatisasi template surat massal (Mail Merge), dan pengelolaan dashboard agenda kegiatan kantor berbasis Google Sheets & Forms.`,
        },
      ],
    },
    {
      id: 'B-MPLB-3',
      judul: 'Komunikasi Bisnis, Public Relations & Pelayanan Perkantoran',
      penulis: 'Rina Marlina, S.Pd., M.Si',
      kategori: 'MPLB',
      halaman: 185,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #581c87 0%, #9333ea 100%)',
      ringkasan: 'Teknik public speaking, presentasi bisnis interaktif dengan Canva & PowerPoint, penyelenggaraan konferensi pers, serta penyusunan press release perusahaan.',
      babList: [
        {
          bab: 'BAB I: Keterampilan Komunikasi Interpersonal & Public Speaking',
          konten: `Teknik olah vokal, artikulasi, kontak mata, bahasa tubuh (body language), dan mengatasi demam panggung saat menjadi MC atau presenter acara resmi kantor.`,
        },
        {
          bab: 'BAB II: Pengorganisasian Acara Rapat & Protokoler',
          konten: `Penyusunan susunan acara (rundown), layout tata letak meja rapat (U-Shape, Classroom, Boardroom), catering arrangement, dan penyusunan laporan pertanggungjawaban.`,
        },
      ],
    },

    // 🛍️ PM (Pemasaran / Bisnis Digital)
    {
      id: 'B-PM-1',
      judul: 'Pemasaran Digital (Digital Marketing, SEO & E-Commerce) SMK',
      penulis: 'Rahmat Hidayat, S.E., M.Kom',
      kategori: 'PM',
      halaman: 240,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #9a3412 0%, #f97316 100%)',
      ringkasan: 'Buku pegangan strategi pemasaran produk digital: copywriting persuasi formula AIDA, Search Engine Optimization (SEO), onboarding seller marketplace Shopee/Tokopedia, dan optimasi iklan Meta Ads & TikTok Ads.',
      babList: [
        {
          bab: 'BAB I: Pengantar Ekosistem Digital Marketing & Customer Persona',
          konten: `Perbedaan pemasaran konvensional vs digital. Identifikasi target pasar, perumusan Unique Selling Proposition (USP), dan pemetaan Customer Buying Journey.`,
        },
        {
          bab: 'BAB II: Copywriting Penjualan & Konten Kreatif Media Sosial',
          konten: `Formula copywriting AIDA (Attention, Interest, Desire, Action), teknik hook video viral, perancangan kalender konten Instagram & TikTok, dan storytelling produk.`,
        },
        {
          bab: 'BAB III: Pengelolaan Toko Marketplace & Analitik Penjualan',
          konten: `Optimalisasi judul produk berbasis kata kunci pencarian, foto katalog produk menarik, strategi bundling promosi flash sale, dan pembacaan metrik ROAS iklan.`,
        },
      ],
    },
    {
      id: 'B-PM-2',
      judul: 'Perencanaan Bisnis Ritel Modern & Supply Chain Management',
      penulis: 'Budi Santoso, S.E',
      kategori: 'PM',
      halaman: 205,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
      ringkasan: 'Tata kelola toko ritel modern (minimarket & supermarket): visual merchandising, planogram penataan barang di rak gondola, pengendalian stok FIFO, dan analisis margin keuntungan.',
      babList: [
        {
          bab: 'BAB I: Strategi Penataan Produk (Visual Merchandising)',
          konten: `Prinsip penataan barang: Eye Level is Buy Level, pengelompokan produk komplementer (cross-merchandising), penataan display etalase depan, dan sign board promosi.`,
        },
        {
          bab: 'BAB II: Manajemen Persediaan Barang & Stock Opname',
          konten: `Pengendalian inventory menggunakan kartu stok, perhitungan minimum stock & reorder point (ROP), serta prosedur stock opname berkala meminimalisir shrinkage/kehilangan.`,
        },
      ],
    },
    {
      id: 'B-PM-3',
      judul: 'Administrasi Transaksi & Operasional Kasir POS (Point of Sales)',
      penulis: 'Tim Bisnis Daring & Pemasaran SMK YPK',
      kategori: 'PM',
      halaman: 175,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
      ringkasan: 'Operasional mesin kasir POS, validasi keaslian uang tunai 3D (Dilihat, Diraba, Diterawang), transaksi non-tunai QRIS & EDC Bank, rekonsiliasi kas harian, dan pencegahan fraud.',
      babList: [
        {
          bab: 'BAB I: Standar Operasional Prosedur Kasir Ritel',
          konten: `Prosedur opening register kasir, modal kas awal, pemindaian barcode barang, input diskon promosi, dan penghitungan kembalian dengan senyum dan ramah tamah.`,
        },
        {
          bab: 'BAB II: Pengoperasian Sistem Pembayaran Digital & Closing Kasir',
          konten: `Pemrosesan transaksi QRIS, kartu debit/kredit pada mesin EDC, penanganan transaksi void/refund, dan penutupan kasir (closing register) dengan berita acara serah terima.`,
        },
      ],
    },

    // 📖 UMUM (Mata Pelajaran Wajib)
    {
      id: 'B-UMUM-1',
      judul: 'Pendidikan Pancasila & Kewarganegaraan (Fase E & F Kurikulum Merdeka)',
      penulis: 'Tim Guru PKn SMK YPK Medan',
      kategori: 'Umum',
      halaman: 180,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
      ringkasan: 'Buku pedoman penguatan profil pelajar pancasila, wawasan kebangsaan, penegakan hak asasi manusia, integrasi nasional Bhinneka Tunggal Ika, dan etika berdemokrasi era digital.',
      babList: [
        {
          bab: 'BAB I: Menggali Nilai-Nilai Pancasila dalam Kehidupan Berbangsa',
          konten: `Refleksi sejarah lahirnya Pancasila, pengamalan sila ke-1 hingga ke-5 dalam kehidupan sehari-hari, toleransi antarumat beragama, dan penguatan persatuan di lingkungan sekolah.`,
        },
        {
          bab: 'BAB II: Norma, Hak dan Kewajiban Warga Negara Sesuai UUD 1945',
          konten: `Kedudukan warga negara di hadapan hukum, hak atas pendidikan dan pekerjaan layak, serta kewajiban bela negara dan kepatuhan hukum berlalu lintas.`,
        },
      ],
    },
    {
      id: 'B-UMUM-2',
      judul: 'English for Vocational School (Communication at Workplace & TOEIC)',
      penulis: 'Sarah Jenkins & M. Syarif',
      kategori: 'Umum',
      halaman: 165,
      bahasa: 'English / ID',
      coverBg: 'linear-gradient(135deg, #3730a3 0%, #6366f1 100%)',
      ringkasan: 'Buku percakapan bahasa Inggris profesional: simulasi job interview, presentasi proyek teknologi & bisnis, korespondensi email bisnis global, dan strategi persiapan tes TOEIC.',
      babList: [
        {
          bab: 'Unit 1: Professional Self-Introduction & Job Interview Mastery',
          konten: `Key Vocabulary: Skills, Strengths, Achievements, Professional Background.\nUseful Expressions:\n• "I specialize in computer networking and server maintenance..."\n• "My greatest strength is problem-solving under pressure..."\n• "I graduated from SMK YPK with strong technical certification."`,
        },
        {
          bab: 'Unit 2: Business Email Writing & Technical Telephoning',
          konten: `Format of Formal Business Inquiries, Request for Quotation, Scheduling Meetings, and Professional Confirmation Emails.`,
        },
      ],
    },
    {
      id: 'B-UMUM-3',
      judul: 'Matematika Terapan & Statistika Bisnis Kejuruan SMK',
      penulis: 'Drs. H. Suryadi, M.Pd',
      kategori: 'Umum',
      halaman: 215,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
      ringkasan: 'Matematika terapan vokasi: Barisan & Deret Keuangan, Program Linier Optimasi Produksi, Trigonometri, Statistika Deskriptif (Mean, Median, Modus, Deviasi Standar), dan Peluang.',
      babList: [
        {
          bab: 'BAB I: Bunga Tunggal, Bunga Majemuk & Anuitas Pinjaman',
          konten: `Perhitungan modal akhir dengan bunga majemuk, tabel pelunasan anuitas angsuran kredit bank, dan analisis nilai waktu uang (Time Value of Money).`,
        },
        {
          bab: 'BAB II: Penyajian Data & Analisis Statistika Bisnis',
          konten: `Pembuatan histogram, diagram batang, poligon frekuensi, serta interpretasi tren grafik pertumbuhan penjualan dan efisiensi data jaringan.`,
        },
      ],
    },
    {
      id: 'B-UMUM-4',
      judul: 'Projek IPAS (Ilmu Pengetahuan Alam & Sosial) SMK Terpadu',
      penulis: 'Tim Sains Terapan Vokasi SMK YPK',
      kategori: 'Umum',
      halaman: 190,
      bahasa: 'Indonesia',
      coverBg: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
      ringkasan: 'Integrasi sains dan sosial: Energi & Perubahannya, Mitigasi Bencana Alam & K3LH, Ekosistem Lingkungan Hidup, Pengolahan Limbah Elektronik & Daur Ulang Industri.',
      babList: [
        {
          bab: 'BAB I: Energi Terbarukan & Efisiensi Daya Perangkat Elektronik',
          konten: `Pemanfaatan panel surya (Solar Cell), efisiensi energi UPS di data center, dan prinsip konversi energi listrik ke mekanik/cahaya.`,
        },
        {
          bab: 'BAB II: Pengelolaan Limbah B3 & Keselamatan Lingkungan Kerja',
          konten: `Prosedur pembuangan limbah elektronik (E-Waste), bahaya radiasi timbal/merkuri, dan penanganan kebakaran bengkel dengan APAR (Alat Pemadam Api Ringan).`,
        },
      ],
    },
  ];

  // 💾 STATE KOLEKSI BUKU (DARI LOCALSTORAGE JIKA ADA PERUBAHAN OLEH GURU)
  const [bookList, setBookList] = useState(DEFAULT_BOOKS);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('smk_ypk_digital_library_books');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBookList(parsed);
          }
        }
      } catch (e) {}
    }
  }, []);

  const saveBooksToStorage = (newList) => {
    setBookList(newList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('smk_ypk_digital_library_books', JSON.stringify(newList));
      } catch (e) {}
    }
  };

  // 📝 STATE MODAL UPLOAD / EDIT BUKU (ADMIN & GURU)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formJudul, setFormJudul] = useState('');
  const [formPenulis, setFormPenulis] = useState('');
  const [formKategori, setFormKategori] = useState('TJKT');
  const [formHalaman, setFormHalaman] = useState('150');
  const [formRingkasan, setFormRingkasan] = useState('');
  const [formBab1, setFormBab1] = useState('');
  const [formBab2, setFormBab2] = useState('');
  const [formBab3, setFormBab3] = useState('');
  const [formThemeColor, setFormThemeColor] = useState('#2563eb');
  const [formPdfBase64, setFormPdfBase64] = useState('');
  const [formPdfName, setFormPdfName] = useState('');
  const [formPdfUrl, setFormPdfUrl] = useState('');

  const [readerMode, setReaderMode] = useState('pdf'); // 'pdf' | 'text'

  const openAddBookModal = () => {
    setEditingBook(null);
    setFormJudul('');
    setFormPenulis(currentUser?.nama || 'Guru SMK YPK');
    setFormKategori(activeCategory === 'Semua' ? 'TJKT' : activeCategory);
    setFormHalaman('150');
    setFormRingkasan('');
    setFormBab1('');
    setFormBab2('');
    setFormBab3('');
    setFormThemeColor('#2563eb');
    setFormPdfBase64('');
    setFormPdfName('');
    setFormPdfUrl('');
    setShowUploadModal(true);
  };

  const openEditBookModal = (b) => {
    setEditingBook(b);
    setFormJudul(b.judul || '');
    setFormPenulis(b.penulis || '');
    setFormKategori(b.kategori || 'TJKT');
    setFormHalaman(String(b.halaman || '150'));
    setFormRingkasan(b.ringkasan || '');
    setFormBab1(b.babList?.[0]?.konten || '');
    setFormBab2(b.babList?.[1]?.konten || '');
    setFormBab3(b.babList?.[2]?.konten || '');
    setFormThemeColor(b.themeColor || '#2563eb');
    setFormPdfBase64(b.pdfUrl || '');
    setFormPdfName(b.pdfName || '');
    setFormPdfUrl(b.pdfLink || '');
    setShowUploadModal(true);
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      Swal.fire('Format Harus PDF', 'Harap upload file buku dalam format PDF (.pdf).', 'warning');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal ukuran file PDF buku adalah 25 MB.', 'warning');
      return;
    }

    setFormPdfName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFormPdfBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBook = (e) => {
    e.preventDefault();
    if (!formJudul.trim() || !formPenulis.trim() || !formRingkasan.trim()) {
      Swal.fire('Form Belum Lengkap', 'Silakan lengkapi Judul, Penulis/Penerbit, dan Ringkasan buku.', 'warning');
      return;
    }

    const babList = [
      {
        bab: 'BAB I: Pengantar & Capaian Pembelajaran',
        konten: formBab1.trim() || `Modul pembelajaran resmi mata pelajaran ${formJudul} untuk kompetensi keahlian ${formKategori} SMK YPK Medan. Disusun untuk mendukung ketercapaian capaian pembelajaran Kurikulum Merdeka.`,
      },
      {
        bab: 'BAB II: Teori Inti & Konsep Kejuruan',
        konten: formBab2.trim() || `Pembahasan materi pokok dan konsep teoritis mendalam mengenai ${formJudul}. Diharapkan peserta didik dapat memahami materi ini secara komprehensif.`,
      },
      {
        bab: 'BAB III: Praktikum, Studi Kasus & Evaluasi Mandiri',
        konten: formBab3.trim() || `Langkah kerja praktikum mandiri dan panduan lembar kerja peserta didik (LKPD). Kerjakan latihan pemahaman di akhir bab untuk mengukur kompetensi keahlian!`,
      },
    ];

    // Warna gradient cover otomatis berdasarkan kategori & pilihan
    let coverBg = 'linear-gradient(135deg, #1e3a8a, #2563eb)';
    if (formKategori === 'AKL') coverBg = 'linear-gradient(135deg, #065f46, #10b981)';
    else if (formKategori === 'MPLB') coverBg = 'linear-gradient(135deg, #701a75, #d946ef)';
    else if (formKategori === 'PM') coverBg = 'linear-gradient(135deg, #9a3412, #f97316)';
    else if (formKategori === 'Umum') coverBg = 'linear-gradient(135deg, #991b1b, #ef4444)';

    const effectivePdf = formPdfBase64 || formPdfUrl || '';

    if (editingBook) {
      // Update Buku
      const updated = bookList.map((item) => {
        if (item.id === editingBook.id) {
          return {
            ...item,
            judul: formJudul.trim(),
            penulis: formPenulis.trim(),
            kategori: formKategori,
            halaman: parseInt(formHalaman, 10) || 150,
            ringkasan: formRingkasan.trim(),
            coverBg: coverBg,
            themeColor: formThemeColor,
            pdfUrl: effectivePdf,
            pdfName: formPdfName || item.pdfName || '',
            babList: babList,
          };
        }
        return item;
      });
      saveBooksToStorage(updated);
      setShowUploadModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Buku Diperbarui!',
        text: `Buku "${formJudul}" berhasil diupdate.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      // Tambah Buku Baru
      const newBook = {
        id: `B-${formKategori}-${Date.now()}`,
        judul: formJudul.trim(),
        penulis: formPenulis.trim(),
        kategori: formKategori,
        halaman: parseInt(formHalaman, 10) || 150,
        bahasa: 'Indonesia',
        coverBg: coverBg,
        themeColor: formThemeColor,
        ringkasan: formRingkasan.trim(),
        pdfUrl: effectivePdf,
        pdfName: formPdfName || `${formJudul}.pdf`,
        babList: babList,
      };
      const updated = [newBook, ...bookList];
      saveBooksToStorage(updated);
      setShowUploadModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Buku PDF Berhasil Diterbitkan!',
        text: `Buku "${formJudul}" telah ditambahkan ke koleksi ${formKategori} dan siap dibaca oleh seluruh siswa secara online.`,
        timer: 1800,
        showConfirmButton: false,
      });
    }
  };

  const handleDeleteBook = async (book) => {
    if (!canManageLibrary) return;

    const result = await Swal.fire({
      title: 'Hapus Buku Perpustakaan?',
      html: `<p>Buku <b>"${book.judul}"</b> (${book.kategori}) akan dihapus dari koleksi E-Library.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Buku',
      cancelButtonText: 'Batal',
    });

    if (result.isConfirmed) {
      const updated = bookList.filter((b) => b.id !== book.id);
      saveBooksToStorage(updated);
      if (readingBook?.id === book.id) setReadingBook(null);
      Swal.fire({
        icon: 'success',
        title: 'Buku Dihapus!',
        text: 'Buku telah dihapus dari perpustakaan.',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  // 🔍 FILTERING BUKU BERDASARKAN JURUSAN & KATA KUNCI PENCARIAN
  const filteredBooks = bookList.filter((b) => {
    const matchCat = activeCategory === 'Semua' || b.kategori === activeCategory;
    const matchSearch =
      b.judul.toLowerCase().includes(searchBook.toLowerCase()) ||
      b.penulis.toLowerCase().includes(searchBook.toLowerCase()) ||
      b.kategori.toLowerCase().includes(searchBook.toLowerCase()) ||
      b.ringkasan.toLowerCase().includes(searchBook.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ padding: '4px 0 30px 0', maxWidth: '1150px', margin: '0 auto' }}>
      {/* 🌟 BANNER PERPUSTAKAAN DIGITAL SMK YPK MEDAN */}
      <div
        style={{
          background: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
          borderRadius: '18px',
          padding: '22px 20px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(217, 119, 6, 0.25)',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '2px 8px', borderRadius: '12px' }}>
                📖 E-LIBRARY SMK YPK MEDAN
              </span>
              <span style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                ⭐ Kurikulum Merdeka 2026
              </span>
            </div>
            <h1 style={{ margin: '4px 0', fontSize: '20px', fontWeight: '800' }}>
              Perpustakaan Digital &amp; Buku Pegangan Siswa
            </h1>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#fef3c7', lineHeight: 1.4 }}>
              {canManageLibrary
                ? 'Pusat repositori e-book kejuruan, modul ajar interaktif, dan panduan praktikum industri untuk semua jurusan.'
                : 'Akses ribuan halaman e-book kejuruan & umum terlengkap secara gratis untuk seluruh siswa SMK YPK Medan.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* ➕ TOMBOL UPLOAD BUKU (HANYA GURU & ADMIN MASTER) */}
            {canManageLibrary && (
              <button
                type="button"
                onClick={openAddBookModal}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#b45309',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>➕</span>
                <span>Upload / Tambah Buku</span>
              </button>
            )}

            <div style={{ backgroundColor: 'rgba(255,255,255,0.18)', padding: '8px 16px', borderRadius: '10px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: '10.5px', color: '#fef08a', display: 'block', fontWeight: '600' }}>Total Koleksi</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff' }}>{bookList.length} Judul</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🏷️ FILTER KATEGORI JURUSAN & SEARCH BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'Semua', label: '📚 Semua Koleksi', count: bookList.length },
            { key: 'TJKT', label: '🌐 TJKT', count: bookList.filter((b) => b.kategori === 'TJKT').length },
            { key: 'AKL', label: '📊 AKL', count: bookList.filter((b) => b.kategori === 'AKL').length },
            { key: 'MPLB', label: '📂 MPLB', count: bookList.filter((b) => b.kategori === 'MPLB').length },
            { key: 'PM', label: '🛍️ PM', count: bookList.filter((b) => b.kategori === 'PM').length },
            { key: 'Umum', label: '📖 Umum', count: bookList.filter((b) => b.kategori === 'Umum').length },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '6px 13px',
                borderRadius: '20px',
                border: activeCategory === cat.key ? '2px solid #d97706' : '1px solid #cbd5e1',
                backgroundColor: activeCategory === cat.key ? '#d97706' : '#ffffff',
                color: activeCategory === cat.key ? '#ffffff' : '#475569',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: activeCategory === cat.key ? '0 2px 6px rgba(217, 119, 6, 0.25)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{cat.label}</span>
              <span style={{ fontSize: '10px', opacity: 0.85, backgroundColor: activeCategory === cat.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9', padding: '1px 5px', borderRadius: '10px' }}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="🔍 Cari judul, materi, atau penulis..."
          value={searchBook}
          onChange={(e) => setSearchBook(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1.5px solid #cbd5e1',
            fontSize: '12.5px',
            width: '260px',
            outline: 'none',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        />
      </div>

      {/* 📚 GRID DAFTAR BUKU PELAJARAN LENGKAP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
        {filteredBooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', gridColumn: '1 / -1', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
            <h4 style={{ margin: '0 0 4px 0', color: '#475569', fontSize: '15px' }}>Buku Tidak Ditemukan</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              Coba cari dengan kata kunci lain atau pilih kategori jurusan yang berbeda.
            </p>
          </div>
        ) : (
          filteredBooks.map((book) => (
            <div
              key={book.id}
              className="stardust-white-card"
              style={{
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}
            >
              {/* COVER BUKU ELEGAN */}
              <div
                style={{
                  background: book.coverBg,
                  padding: '20px 18px',
                  color: '#ffffff',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {book.kategori === 'Umum' ? 'Mata Pelajaran Umum' : `Jurusan ${book.kategori}`}
                  </span>
                  <span style={{ fontSize: '10px', color: '#fef3c7', fontWeight: '700' }}>
                    📄 {book.halaman} Hal
                  </span>
                </div>
                <h3 style={{ margin: '6px 0 4px 0', fontSize: '14.5px', fontWeight: '800', lineHeight: '1.35', color: '#ffffff' }}>
                  {book.judul}
                </h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.9)' }}>
                  ✍️ {book.penulis}
                </p>
              </div>

              {/* DETAIL & SARI MATERI BUKU */}
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#475569', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {book.ringkasan}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', flexWrap: 'wrap', gap: '6px' }}>
                  {/* TOMBOL EDIT / HAPUS BUKU KHUSUS GURU & ADMIN */}
                  {canManageLibrary ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        type="button"
                        onClick={() => openEditBookModal(book)}
                        style={{
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                        title="Edit Buku"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBook(book)}
                        style={{
                          backgroundColor: '#fef2f2',
                          color: '#ef4444',
                          border: '1px solid #fca5a5',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                        title="Hapus Buku"
                      >
                        🗑️
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                      🟢 Siap Dibaca
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setReadingBook(book);
                      setActiveChapterIndex(0);
                    }}
                    style={{
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
                    }}
                  >
                    <span>📖</span>
                    <span>Baca Online</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 📝 MODAL UPLOAD / EDIT BUKU (ADMIN & GURU) */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px',
          }}
          onClick={() => setShowUploadModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              padding: '22px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  {editingBook ? '✏️ Edit Buku Perpustakaan' : '➕ Upload / Tambah Buku Baru'}
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Guru bebas menentukan target jurusan atau untuk semua jurusan
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBook}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  📚 Judul Buku Pelajaran / E-Book:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Administrasi Sistem Jaringan Komputer"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    ✍️ Penulis / Pengarang / Tim:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Guru / Pengarang"
                    value={formPenulis}
                    onChange={(e) => setFormPenulis(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    🎯 Target Jurusan:
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: '8px', border: '1.5px solid #2563eb', fontSize: '12.5px', fontWeight: 'bold' }}
                  >
                    <option value="TJKT">🌐 TJKT (Teknik Jaringan Komputer)</option>
                    <option value="AKL">📊 AKL (Akuntansi & Keuangan)</option>
                    <option value="MPLB">📂 MPLB (Manajemen Perkantoran)</option>
                    <option value="PM">🛍️ PM (Pemasaran & Bisnis Digital)</option>
                    <option value="Umum">📖 Mata Pelajaran Umum (Semua Jurusan)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  📄 Estimasi Tebal Halaman:
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 180"
                  value={formHalaman}
                  onChange={(e) => setFormHalaman(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  📝 Ringkasan &amp; Sinopsis Buku:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jelaskan ringkasan materi dan tujuan pembelajaran buku ini..."
                  value={formRingkasan}
                  onChange={(e) => setFormRingkasan(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>

              {/* 📤 UPLOAD FILE PDF BUKU MANDIRI (GURU BISA UPLOAD PDF SENDIRI) */}
              <div style={{ marginBottom: '14px', backgroundColor: '#eff6ff', border: '1.5px dashed #3b82f6', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px' }}>📄</span>
                  <label style={{ fontSize: '12.5px', fontWeight: '800', color: '#1e40af' }}>
                    Upload File Buku PDF Mandiri (Bisa Dibaca Langsung oleh Siswa):
                  </label>
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  style={{ width: '100%', fontSize: '12px', marginBottom: '6px' }}
                />
                {formPdfName && (
                  <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: 'bold', backgroundColor: '#dcfce7', padding: '4px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                    ✅ File PDF Terpilih: {formPdfName}
                  </div>
                )}
                <div style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Atau masukkan URL / Link E-Book PDF Cloud:</span>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... atau link PDF langsung"
                    value={formPdfUrl}
                    onChange={(e) => setFormPdfUrl(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '4px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* MATERI BAB BUKU (OPSIONAL / JIKA TIDAK MEMAKAI PDF) */}
              <div style={{ marginBottom: '12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  📖 Rangkuman Bab Pembelajaran (Opsional / Pelengkap PDF):
                </span>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    BAB I: Capaian &amp; Pengantar
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Uraikan materi Bab 1..."
                    value={formBab1}
                    onChange={(e) => setFormBab1(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    BAB II: Teori &amp; Konsep Kejuruan
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Uraikan materi Bab 2..."
                    value={formBab2}
                    onChange={(e) => setFormBab2(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                    BAB III: Praktikum &amp; Langkah Kerja
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Uraikan langkah praktikum Bab 3..."
                    value={formBab3}
                    onChange={(e) => setFormBab3(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  💾 Terbitkan Buku PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📖 MODAL E-READER ONLINE LENGKAP DENGAN PDF VIEWER & NAVIGASI BAB */}
      {readingBook && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setReadingBook(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '960px',
              width: '100%',
              height: '92vh',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER E-READER */}
            <div style={{ background: 'linear-gradient(90deg, #92400e, #d97706)', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '10.5px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.22)', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                  {readingBook.kategori === 'Umum' ? 'Mata Pelajaran Umum' : `Jurusan ${readingBook.kategori}`}
                </span>
                <h2 style={{ margin: '4px 0 2px 0', fontSize: '17px', fontWeight: '800', color: '#ffffff', lineHeight: 1.35 }}>
                  {readingBook.judul}
                </h2>
                <div style={{ fontSize: '11.5px', color: '#fef3c7' }}>
                  ✍️ Penulis/Guru: <b>{readingBook.penulis}</b> • 📄 {readingBook.halaman} Halaman
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* TOGGLE ANTARA PDF VIEWER & BAB */}
                {readingBook.pdfUrl && (
                  <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setReaderMode('pdf')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: readerMode === 'pdf' ? '#ffffff' : 'transparent',
                        color: readerMode === 'pdf' ? '#92400e' : '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      📄 File PDF Asli
                    </button>
                    <button
                      type="button"
                      onClick={() => setReaderMode('text')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: readerMode === 'text' ? '#ffffff' : 'transparent',
                        color: readerMode === 'text' ? '#92400e' : '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      📖 Teks Bab
                    </button>
                  </div>
                )}

                {/* UKURAN FONT BACA (JIKA MODE TEKS) */}
                {readerMode === 'text' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setReaderFontSize((prev) => Math.max(12, prev - 1))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: '#ffffff' }}
                      title="Kecilkan Teks"
                    >
                      A-
                    </button>
                    <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 'bold' }}>{readerFontSize}px</span>
                    <button
                      type="button"
                      onClick={() => setReaderFontSize((prev) => Math.min(20, prev + 1))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: '#ffffff' }}
                      title="Besarkan Teks"
                    >
                      A+
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setReadingBook(null)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: '#ffffff',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* AREA BACAAN: PDF IFRAME ATAU TEXT READER */}
            <div style={{ flex: 1, backgroundColor: '#f1f5f9', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {readingBook.pdfUrl && readerMode === 'pdf' ? (
                <iframe
                  src={readingBook.pdfUrl}
                  title={readingBook.judul}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                  {/* NAVIGASI PILIHAN BAB (TABS) */}
                  {readingBook.babList && readingBook.babList.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
                      {readingBook.babList.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveChapterIndex(idx)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: activeChapterIndex === idx ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                            backgroundColor: activeChapterIndex === idx ? '#fef3c7' : '#ffffff',
                            color: activeChapterIndex === idx ? '#b45309' : '#475569',
                            fontSize: '11.5px',
                            fontWeight: activeChapterIndex === idx ? '800' : '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.bab.split(':')[0]}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* AREA MEMBACA TEKS LENGKAP */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '24px',
                      lineHeight: '1.75',
                      color: '#1e293b',
                      fontSize: `${readerFontSize}px`,
                      whiteSpace: 'pre-line',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}
                  >
                    {readingBook.babList && readingBook.babList[activeChapterIndex] ? (
                      <div>
                        <h3 style={{ margin: '0 0 12px 0', color: '#b45309', fontSize: `${readerFontSize + 2}px`, borderBottom: '1.5px solid #fef3c7', paddingBottom: '8px' }}>
                          {readingBook.babList[activeChapterIndex].bab}
                        </h3>
                        <p style={{ margin: 0 }}>
                          {readingBook.babList[activeChapterIndex].konten}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#b45309' }}>PENDAHULUAN &amp; SARI MATERI</h3>
                        <p>{readingBook.ringkasan}</p>
                      </div>
                    )}

                    {/* KOTAK CATATAN GURU */}
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', marginTop: '20px', fontSize: `${readerFontSize - 1}px`, color: '#92400e' }}>
                      💡 <b>Petunjuk Belajar Siswa:</b> Bacalah materi buku ini dengan cermat untuk memperdalam kompetensi keahlian Anda di SMK YPK Medan.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER MODAL E-READER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {readerMode === 'text' && readingBook.babList && activeChapterIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveChapterIndex((prev) => prev - 1)}
                    style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    ⬅️ Bab Sebelumnya
                  </button>
                )}
                {readerMode === 'text' && readingBook.babList && activeChapterIndex < readingBook.babList.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveChapterIndex((prev) => prev + 1)}
                    style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Bab Selanjutnya ➔
                  </button>
                )}
                {readingBook.pdfUrl && (
                  <a
                    href={readingBook.pdfUrl}
                    download={readingBook.pdfName || `${readingBook.judul}.pdf`}
                    style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    ⬇️ Download File PDF
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => setReadingBook(null)}
                style={{ backgroundColor: '#64748b', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
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
