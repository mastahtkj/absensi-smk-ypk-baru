'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Data Akses Akun
const DEMO_USERS = {
  guru: { password: 'guru123', role: 'Guru Pengajar', name: 'Bpk/Ibu Guru' },
  kepsek: { password: 'kepsek123', role: 'Kepala Sekolah', name: 'Kepala Sekolah' },
  it: { password: 'it123', role: 'Administrator IT', name: 'Tim IT SMK YPK' }
};

// List Pilihan Jurusan
const JURUSAN_LIST = [
  { id: 'SEMUA', label: 'Semua Jurusan', icon: '⚡' },
  { id: 'TJKT', label: 'TJKT (Jaringan)', icon: '🌐' },
  { id: 'AKL', label: 'AKL (Akuntansi)', icon: '📊' },
  { id: 'MPLB', label: 'MPLB (Perkantoran)', icon: '💼' },
  { id: 'PM', label: 'PM (Pemasaran)', icon: '🛍️' },
  { id: 'BM', label: 'BM (Bisnis Manajemen)', icon: '📈' }
];

// List Pilihan Tingkat Kelas
const TINGKAT_LIST = [
  { id: 'SEMUA', label: 'Semua Tingkat' },
  { id: 'X', label: 'Kelas X' },
  { id: 'XI', label: 'Kelas XI' },
  { id: 'XII', label: 'Kelas XII' }
];

export default function App() {
  const [loadingSplash, setLoadingSplash] = useState(true);
  const [progress, setProgress] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [dataAbsensi, setDataAbsensi] = useState([]);
  const [activeJurusan, setActiveJurusan] = useState('SEMUA');
  const [activeTingkat, setActiveTingkat] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Edit Presensi & Data Siswa
  const [editingItem, setEditingItem] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Modal Tambah Siswa Baru (Khusus IT)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUid, setNewUid] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newKelas, setNewKelas] = useState('');

  // 1. Cek Simpanan Login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('ypk_saved_username');
      const savedPass = localStorage.getItem('ypk_saved_password');
      if (savedUser && savedPass) {
        setUsernameInput(savedUser);
        setPasswordInput(savedPass);
        setRememberMe(true);
      }
    }
  }, []);

  // 2. Splashscreen Timer 5 Detik
  useEffect(() => {
    const totalTime = 5000;
    const intervalTime = 50;
    const step = 100 / (totalTime / intervalTime);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setLoadingSplash(false), 200);
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);

  // 3. Fetch Data & Setup Realtime Listener Supabase WebSocket
  const ambilData = async () => {
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      setDataAbsensi(data);
    }
  };

  useEffect(() => {
    if (userRole) {
      ambilData();

      // Langsung mendengarkan perubahan data realtime di Supabase
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'absensi' },
          () => {
            ambilData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userRole]);

  // Handler Login
  const handleLogin = (e) => {
    e.preventDefault();
    const userKey = usernameInput.toLowerCase().trim();
    if (DEMO_USERS[userKey] && DEMO_USERS[userKey].password === passwordInput) {
      setUserRole(userKey);
      setLoginError('');

      if (rememberMe) {
        localStorage.setItem('ypk_saved_username', usernameInput);
        localStorage.setItem('ypk_saved_password', passwordInput);
      } else {
        localStorage.removeItem('ypk_saved_username');
        localStorage.removeItem('ypk_saved_password');
      }
    } else {
      setLoginError('Username atau Password salah!');
    }
  };

  const quickLoginGuru = () => {
    setUsernameInput('guru');
    setPasswordInput(DEMO_USERS['guru'].password);
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditingItem(item);
    setEditNama(item.nama);
    setEditKelas(item.kelas);
    setEditStatus(item.status);
  };

  // Simpan Perubahan Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const payload = { status: editStatus };
    if (userRole === 'it') {
      payload.nama = editNama;
      payload.kelas = editKelas;

      // Update juga di tabel rfid_cards jika UID terdaftar
      if (editingItem.rfid_uid) {
        await supabase
          .from('rfid_cards')
          .update({ nama: editNama, kelas: editKelas })
          .eq('uid', editingItem.rfid_uid);
      }
    }

    const { error } = await supabase
      .from('absensi')
      .update(payload)
      .eq('id', editingItem.id);

    if (!error) {
      setEditingItem(null);
      ambilData();
    } else {
      alert('Gagal mengupdate data: ' + error.message);
    }
  };

  // Tambah Siswa Baru (Akses Khusus IT)
  const handleAddSiswa = async (e) => {
    e.preventDefault();
    if (!newUid || !newNama || !newKelas) {
      alert('Mohon isi semua kolom!');
      return;
    }

    // Insert ke rfid_cards Supabase
    const { error } = await supabase
      .from('rfid_cards')
      .insert([{ uid: newUid.trim(), nama: newNama.trim(), kelas: newKelas.trim() }]);

    if (!error) {
      alert(`Siswa Baru (${newNama}) Berhasil Didaftarkan!`);
      setShowAddModal(false);
      setNewUid('');
      setNewNama('');
      setNewKelas('');
    } else {
      alert('Gagal menambah siswa: ' + error.message);
    }
  };

  // --- EXPORT REKAP ABSEN (EXCEL & PRINT PDF) ---
  const handleExportExcel = () => {
    let csvContent = 'data:text/csv;charset=utf-8,WAKTU TAP,NAMA SISWA,KELAS / JURUSAN,STATUS,RFID UID\n';
    filteredData.forEach((row) => {
      const waktu = formatFullDate(row.created_at).replace(/,/g, '');
      csvContent += `"${waktu}","${row.nama}","${row.kelas}","${row.status}","${row.rfid_uid || '-'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `REKAP_ABSENSI_YPK_${activeTingkat}_${activeJurusan}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // --- REKAP STATISTIK PER KELAS ---
  const rekapPerKelas = () => {
    const mapKelas = {};
    dataAbsensi.forEach((item) => {
      if (!item.kelas) return;
      const k = item.kelas.toUpperCase().trim();
      if (!mapKelas[k]) {
        mapKelas[k] = { total: 0, hadir: 0 };
      }
      mapKelas[k].total += 1;
      if (item.status && item.status.toUpperCase().includes('TEPAT')) {
        mapKelas[k].hadir += 1;
      }
    });

    return Object.keys(mapKelas).map((kelasName) => {
      const data = mapKelas[kelasName];
      const percent = data.total > 0 ? Math.round((data.hadir / data.total) * 100) : 0;
      return {
        kelas: kelasName,
        total: data.total,
        hadir: data.hadir,
        percent: percent,
        isUrgent: percent < 50 && data.total > 0
      };
    });
  };

  const listKelasStat = rekapPerKelas();

  // Filter Data Tabel
  const filteredData = dataAbsensi.filter((item) => {
    const matchJurusan =
      activeJurusan === 'SEMUA' || (item.kelas && item.kelas.toUpperCase().includes(activeJurusan));

    let matchTingkat = true;
    if (activeTingkat !== 'SEMUA' && item.kelas) {
      const k = item.kelas.toUpperCase().trim();
      if (activeTingkat === 'X') {
        matchTingkat = k.startsWith('X ') || k.startsWith('X-') || k === 'X';
      } else if (activeTingkat === 'XI') {
        matchTingkat = k.startsWith('XI ') || k.startsWith('XI-') || k === 'XI';
      } else if (activeTingkat === 'XII') {
        matchTingkat = k.startsWith('XII ') || k.startsWith('XII-') || k === 'XII';
      }
    }

    const matchSearch =
      (item.nama && item.nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.kelas && item.kelas.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchJurusan && matchTingkat && matchSearch;
  });

  const totalSiswaTapped = dataAbsensi.length;
  const totalTepatWaktu = dataAbsensi.filter(
    (d) => d.status && d.status.toUpperCase().includes('TEPAT')
  ).length;
  const persenHadir = totalSiswaTapped > 0 ? Math.round((totalTepatWaktu / totalSiswaTapped) * 100) : 0;

  // Format Tanggal Lengkap
  const formatFullDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ' - ' + d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' WIB';
  };

  return (
    <>
      <style jsx global>{`
        @keyframes pulseLogo {
          0% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(234, 88, 12, 0.3)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 15px rgba(234, 88, 12, 0.5)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(234, 88, 12, 0.3)); }
        }
        @keyframes pulseDot {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif;
          background-color: #fff7ed;
          color: #1e293b;
        }
        @media print {
          header, .no-print { display: none !important; }
          body { background: #fff !important; }
          .cardTable { border: none !important; box-shadow: none !important; }
        }
      `}</style>

      {/* ========================================== */}
      {/* TAMPILAN 1: SPLASH SCREEN 5 DETIK          */}
      {/* ========================================== */}
      {loadingSplash ? (
        <div style={styles.heroBackground}>
          <div style={styles.whiteCardSplash}>
            <div style={styles.logoBox}>
              <img
                src="/logo.png"
                alt="Logo SMK YPK"
                style={styles.logoImg}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <span style={styles.badgeOrange}>SERVER ABSENSI DIGITAL</span>
            <h1 style={styles.titleDark}>SMK YPK MEDAN</h1>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '25px', fontWeight: '500' }}>
              Menghubungkan Server Presensi RFID Real-Time...
            </p>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${Math.min(progress, 100)}%` }}></div>
            </div>

            <div style={styles.splashStatus}>
              <span>Proses Inisialisasi {Math.min(Math.round(progress), 100)}%</span>
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>● SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
      ) : !userRole ? (
        /* ========================================== */
        /* TAMPILAN 2: LOGIN CARD PUTIH ORANGE        */
        /* ========================================== */
        <div style={styles.heroBackground}>
          <div style={styles.whiteCardLogin}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ ...styles.logoBox, margin: '0 auto 10px auto' }}>
                <img
                  src="/logo.png"
                  alt="Logo SMK YPK"
                  style={styles.logoImg}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <h2 style={{ color: '#ea580c', margin: '5px 0', fontSize: '22px', fontWeight: '900', letterSpacing: '0.5px' }}>
                PORTAL ABSENSI DIGITAL
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0, fontWeight: '500' }}>
                Silakan login untuk mengakses portal SMK YPK MEDAN
              </p>
            </div>

            {loginError && <div style={styles.errorBanner}>{loginError}</div>}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '15px' }}>
                <label style={styles.labelDark}>Username / Peran:</label>
                <input
                  type="text"
                  placeholder="Masukkan username (guru / kepsek / it)"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={styles.inputWhite}
                  required
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={styles.labelDark}>Password:</label>
                <input
                  type="password"
                  placeholder="Masukkan password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={styles.inputWhite}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <input
                  type="checkbox"
                  id="rememberCheck"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ea580c' }}
                />
                <label htmlFor="rememberCheck" style={{ fontSize: '12px', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Ingat Saya di Perangkat Ini (Simpan Password)
                </label>
              </div>

              <button type="submit" style={styles.btnOrange}>
                MASUK KE DASHBOARD →
              </button>
            </form>

            <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #fed7aa' }}>
              <p style={{ fontSize: '12px', color: '#c2410c', textAlign: 'center', marginBottom: '10px', fontWeight: '700' }}>
                Akses Cepat Mode Demo Guru:
              </p>
              <button onClick={quickLoginGuru} style={{ ...styles.btnQuick, width: '100%' }}>
                👨‍🏫 AKSES CEPAT GURU
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================== */
        /* TAMPILAN 3: MAIN DASHBOARD                 */
        /* ========================================== */
        <div style={styles.dashboardWrapper}>
          {/* HEADER DASHBOARD */}
          <header style={styles.headerWhite}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ ...styles.logoBox, width: '45px', height: '45px' }}>
                <img
                  src="/logo.png"
                  alt="Logo SMK YPK"
                  style={styles.logoImg}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: '#ea580c' }}>
                  DASHBOARD ABSENSI REAL-TIME
                </h1>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: '500' }}>
                  SMK YPK MEDAN • Integrated IoT RFID Server
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {/* TOMBOL TAMBAH SISWA BARU (KHUSUS IT) */}
              {userRole === 'it' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  style={styles.btnAddSiswa}
                  className="no-print"
                >
                  ➕ Tambah Kartu/Siswa Baru
                </button>
              )}

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
                  {DEMO_USERS[userRole].name}
                </div>
                <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: '800' }}>
                  {DEMO_USERS[userRole].role}
                </div>
              </div>
              <button onClick={() => setUserRole(null)} style={styles.btnLogout} className="no-print">
                Keluar 🚪
              </button>
            </div>
          </header>

          <main style={{ maxWidth: '1280px', margin: '25px auto', padding: '0 20px' }}>
            
            {/* STATS CARDS UTAMA */}
            <div style={styles.statsGrid} className="no-print">
              <div style={styles.cardStat}>
                <div style={{ fontSize: '32px' }}>📊</div>
                <div>
                  <div style={styles.statNumber}>{totalSiswaTapped}</div>
                  <div style={styles.statLabel}>Total Siswa Tap RFID Hari Ini</div>
                </div>
              </div>

              <div style={{ ...styles.cardStat, borderLeft: '5px solid #22c55e' }}>
                <div style={{ fontSize: '32px' }}>✅</div>
                <div>
                  <div style={{ ...styles.statNumber, color: '#16a34a' }}>{totalTepatWaktu}</div>
                  <div style={styles.statLabel}>Hadir Tepat Waktu</div>
                </div>
              </div>

              <div style={{ ...styles.cardStat, borderLeft: '5px solid #ea580c' }}>
                <div style={{ fontSize: '32px' }}>📈</div>
                <div>
                  <div style={{ ...styles.statNumber, color: '#ea580c' }}>{persenHadir}%</div>
                  <div style={styles.statLabel}>Persentase Kehadiran Total</div>
                </div>
              </div>
            </div>

            {/* STATISTIK KELAS URGENT */}
            <div style={styles.cardSection} className="no-print">
              <h3 style={styles.sectionTitle}>🏫 STATISTIK KEHADIRAN PER KELAS (INDIKATOR URGENT)</h3>
              {listKelasStat.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Belum ada data kelas yang terdaftar hari ini.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {listKelasStat.map((k, idx) => (
                    <div
                      key={idx}
                      style={{
                        ...styles.cardKelasBox,
                        border: k.isUrgent ? '2px solid #ef4444' : '1px solid #fed7aa',
                        background: k.isUrgent ? '#fef2f2' : '#fff7ed'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>{k.kelas}</span>
                        {k.isUrgent && <span style={styles.badgeUrgent}>⚠️ URGENT</span>}
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: k.isUrgent ? '#dc2626' : '#ea580c', margin: '6px 0' }}>
                        {k.percent}%
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Hadir: <strong>{k.hadir}</strong> / Total: <strong>{k.total}</strong> Siswa
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FILTER & MENU EXPORT (EXCEL & PDF) */}
            <div style={styles.cardSection} className="no-print">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#ea580c', width: '90px' }}>
                    FILTER TINGKAT:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {TINGKAT_LIST.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTingkat(t.id)}
                        style={{
                          ...styles.filterPill,
                          ...(activeTingkat === t.id ? styles.filterPillActive : {})
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MENU EXPORT */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleExportExcel} style={styles.btnExportExcel}>
                    📥 Export Excel (.csv)
                  </button>
                  <button onClick={handlePrintPDF} style={styles.btnPrintPdf}>
                    📄 Cetak PDF Laporan
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#ea580c', width: '90px' }}>
                  FILTER JURUSAN:
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {JURUSAN_LIST.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => setActiveJurusan(j.id)}
                      style={{
                        ...styles.filterPill,
                        ...(activeJurusan === j.id ? styles.filterPillActive : {})
                      }}
                    >
                      {j.icon} {j.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #fed7aa' }}>
                <input
                  type="text"
                  placeholder="🔍 Cari nama siswa atau kelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchBox}
                />
              </div>
            </div>

            {/* TABEL DATA HASIL FILTER */}
            <div style={styles.cardTable}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>STATUS</th>
                    <th style={styles.th}>HARI, TANGGAL & WAKTU TAP</th>
                    <th style={styles.th}>NAMA SISWA</th>
                    <th style={styles.th}>KELAS / JURUSAN</th>
                    <th style={styles.th}>RFID UID</th>
                    <th style={{ ...styles.th, textAlign: 'center' }} className="no-print">AKSI PERUBAHAN</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Tidak ada data siswa ditemukan untuk kriteria filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => {
                      const isHadir = item.status && item.status.toUpperCase().includes('TEPAT');
                      return (
                        <tr key={index} style={styles.trHover}>
                          <td style={styles.td}>
                            {isHadir ? (
                              <span style={styles.badgeHadir}>
                                <span style={styles.dotPulse}></span> HADIR
                              </span>
                            ) : (
                              <span style={styles.badgeDispensasi}>{item.status}</span>
                            )}
                          </td>

                          <td style={{ ...styles.td, color: '#0f172a', fontWeight: '600' }}>
                            {formatFullDate(item.created_at)}
                          </td>

                          <td style={{ ...styles.td, fontWeight: 'bold', color: '#0f172a' }}>
                            {item.nama}
                          </td>

                          <td style={styles.td}>
                            <span style={styles.badgeKelas}>{item.kelas}</span>
                          </td>

                          <td style={{ ...styles.td, fontFamily: 'monospace', color: '#64748b' }}>
                            {item.rfid_uid || '-'}
                          </td>

                          <td style={{ ...styles.td, textAlign: 'center' }} className="no-print">
                            <button
                              onClick={() => openEditModal(item)}
                              style={styles.btnEditData}
                            >
                              ✏️ Edit Status {userRole === 'it' ? '& Data' : ''}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </main>

          {/* MODAL EDIT DATA */}
          {editingItem && (
            <div style={styles.modalOverlay}>
              <div style={styles.modalBox}>
                <h3 style={{ margin: '0 0 15px 0', color: '#ea580c', fontSize: '18px', fontWeight: '800' }}>
                  ✏️ Edit Presensi Siswa
                </h3>

                {userRole === 'it' ? (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={styles.labelModal}>Nama Siswa (Akses IT):</label>
                      <input
                        type="text"
                        value={editNama}
                        onChange={(e) => setEditNama(e.target.value)}
                        style={styles.inputWhite}
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={styles.labelModal}>Kelas / Jurusan (Akses IT):</label>
                      <input
                        type="text"
                        value={editKelas}
                        onChange={(e) => setEditKelas(e.target.value)}
                        style={styles.inputWhite}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: '15px', background: '#fff7ed', padding: '12px', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{editingItem.nama}</div>
                    <div style={{ fontSize: '12px', color: '#ea580c', fontWeight: '600' }}>Kelas: {editingItem.kelas}</div>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.labelModal}>Ubah Status Presensi:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={styles.selectWhite}
                  >
                    <option value="TEPAT WAKTU (HADIR)">TEPAT WAKTU (HADIR)</option>
                    <option value="TELAT">TELAT</option>
                    <option value="IZIN">IZIN</option>
                    <option value="SAKIT">SAKIT</option>
                    <option value="ALPHA">ALPHA</option>
                    <option value="DISPENSASI (HUJAN)">DISPENSASI (HUJAN)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingItem(null)} style={styles.btnCancel}>
                    Batal
                  </button>
                  <button onClick={handleSaveEdit} style={styles.btnSave}>
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL TAMBAH SISWA BARU (KHUSUS IT) */}
          {showAddModal && (
            <div style={styles.modalOverlay}>
              <div style={styles.modalBox}>
                <h3 style={{ margin: '0 0 15px 0', color: '#ea580c', fontSize: '18px', fontWeight: '800' }}>
                  ➕ Tambah Kartu RFID / Siswa Baru
                </h3>

                <form onSubmit={handleAddSiswa}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={styles.labelModal}>UID Kartu RFID:</label>
                    <input
                      type="text"
                      placeholder="Contoh: 49AAD705"
                      value={newUid}
                      onChange={(e) => setNewUid(e.target.value)}
                      style={styles.inputWhite}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={styles.labelModal}>Nama Lengkap Siswa:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={newNama}
                      onChange={(e) => setNewNama(e.target.value)}
                      style={styles.inputWhite}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={styles.labelModal}>Kelas & Jurusan:</label>
                    <input
                      type="text"
                      placeholder="Contoh: X TJKT"
                      value={newKelas}
                      onChange={(e) => setNewKelas(e.target.value)}
                      style={styles.inputWhite}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowAddModal(false)} style={styles.btnCancel}>
                      Batal
                    </button>
                    <button type="submit" style={styles.btnSave}>
                      Daftarkan Siswa Baru
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}
    </>
  );
}

// ==========================================
// STYLESHEET CLEAN WHITE & ORANGE ELEGANT
// ==========================================
const bgGedungOverlayLight = "linear-gradient(135deg, rgba(255, 247, 237, 0.92) 0%, rgba(255, 237, 213, 0.88) 100%), url('/gedung.png') center/cover no-repeat fixed";

const styles = {
  heroBackground: {
    height: '100vh',
    background: bgGedungOverlayLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box'
  },
  
  whiteCardSplash: {
    background: '#ffffff',
    border: '2px solid #ffedd5',
    padding: '40px 30px',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(234, 88, 12, 0.12)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%'
  },
  
  logoBox: {
    width: '90px',
    height: '90px',
    margin: '0 auto 12px auto',
    animation: 'pulseLogo 2.5s infinite ease-in-out'
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },

  badgeOrange: {
    background: '#fff7ed',
    color: '#ea580c',
    border: '1px solid #fed7aa',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '1px'
  },
  titleDark: {
    fontSize: '24px',
    fontWeight: '900',
    color: '#431407',
    margin: '12px 0 4px 0'
  },
  progressTrack: {
    height: '8px',
    width: '100%',
    background: '#ffedd5',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '15px'
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
    borderRadius: '10px',
    transition: 'width 0.05s linear'
  },
  splashStatus: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#9a3412',
    fontWeight: '600'
  },

  whiteCardLogin: {
    background: '#ffffff',
    border: '2px solid #ffedd5',
    padding: '35px',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(234, 88, 12, 0.12)',
    width: '100%',
    maxWidth: '420px'
  },
  labelDark: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#7c2d12', marginBottom: '6px' },
  inputWhite: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #fdba74',
    background: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  btnOrange: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 10px 20px -5px rgba(234, 88, 12, 0.4)'
  },
  btnQuick: {
    padding: '10px 5px',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    color: '#c2410c'
  },
  btnAddSiswa: {
    padding: '8px 14px',
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  errorBanner: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    padding: '10px',
    borderRadius: '10px',
    fontSize: '12px',
    marginBottom: '15px',
    textAlign: 'center',
    fontWeight: '600'
  },

  dashboardWrapper: { minHeight: '100vh', background: bgGedungOverlayLight },
  headerWhite: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #ffedd5',
    boxShadow: '0 4px 15px rgba(234, 88, 12, 0.05)'
  },
  btnLogout: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    padding: '8px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px'
  },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' },
  cardStat: {
    background: '#ffffff',
    border: '1px solid #ffedd5',
    padding: '20px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    borderLeft: '5px solid #ea580c',
    boxShadow: '0 4px 15px rgba(234, 88, 12, 0.05)'
  },
  statNumber: { fontSize: '28px', fontWeight: '900', color: '#431407' },
  statLabel: { fontSize: '12px', color: '#9a3412', fontWeight: '600' },

  cardSection: {
    background: '#ffffff',
    border: '1px solid #ffedd5',
    padding: '20px',
    borderRadius: '18px',
    marginBottom: '20px',
    boxShadow: '0 4px 15px rgba(234, 88, 12, 0.05)'
  },
  sectionTitle: { fontSize: '14px', fontWeight: '800', color: '#ea580c', margin: '0 0 15px 0' },
  
  cardKelasBox: {
    borderRadius: '12px',
    padding: '12px 15px',
    display: 'flex',
    flexDirection: 'column'
  },
  badgeUrgent: {
    background: '#ef4444',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '10px'
  },

  filterPill: {
    padding: '8px 16px',
    borderRadius: '20px',
    background: '#ffffff',
    border: '1px solid #fed7aa',
    fontSize: '12px',
    fontWeight: '700',
    color: '#c2410c',
    cursor: 'pointer'
  },
  filterPillActive: { background: '#ea580c', color: '#ffffff', borderColor: '#ea580c', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' },

  btnExportExcel: {
    padding: '8px 14px',
    borderRadius: '10px',
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnPrintPdf: {
    padding: '8px 14px',
    borderRadius: '10px',
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  searchBox: {
    padding: '10px 18px',
    borderRadius: '20px',
    border: '1px solid #fdba74',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    maxWidth: '350px',
    background: '#ffffff',
    color: '#0f172a'
  },

  cardTable: {
    background: '#ffffff',
    borderRadius: '18px',
    overflow: 'hidden',
    border: '1px solid #ffedd5',
    boxShadow: '0 4px 15px rgba(234, 88, 12, 0.05)'
  },
  tableHeader: { background: '#fff7ed', borderBottom: '2px solid #fed7aa', textAlign: 'left' },
  th: { padding: '16px', fontSize: '12px', fontWeight: '800', color: '#ea580c' },
  td: { padding: '16px', borderBottom: '1px solid #fff7ed' },
  trHover: { transition: 'background 0.2s' },

  btnEditData: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#ea580c',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  badgeHadir: {
    background: '#dcfce7',
    color: '#15803d',
    border: '1px solid #86efac',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  badgeDispensasi: {
    background: '#ffedd5',
    color: '#c2410c',
    border: '1px solid #fed7aa',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800'
  },
  badgeKelas: {
    background: '#fff7ed',
    color: '#ea580c',
    border: '1px solid #fed7aa',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700'
  },
  dotPulse: { width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'pulseDot 1.5s infinite' },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  modalBox: {
    background: '#ffffff',
    border: '2px solid #ffedd5',
    borderRadius: '20px',
    padding: '25px',
    width: '90%',
    maxWidth: '420px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
  },
  labelModal: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#7c2d12', marginBottom: '6px' },
  selectWhite: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #fdba74',
    outline: 'none',
    fontSize: '13px'
  },
  btnCancel: {
    padding: '8px 16px',
    borderRadius: '8px',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    color: '#475569',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  },
  btnSave: {
    padding: '8px 16px',
    borderRadius: '8px',
    background: '#ea580c',
    border: 'none',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px'
  }
};
