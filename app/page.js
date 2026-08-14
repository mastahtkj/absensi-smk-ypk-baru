'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// LIST ID GURU YANG DIBATASI HAK AKSESNYA (READ & PRINT ONLY)
const RESTRICTED_GURU_IDS = [30, 31, 32, 33, 34];

export default function Home() {
  // --- STATE SYSTEM & LOGIN ---
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Form Login
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Status Koneksi Realtime
  const [dbConnected, setDbConnected] = useState(true);

  // Filtering & Pagination Tab Data Absensi
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJurusan, setSelectedJurusan] = useState('ALL');
  const [selectedTanggal, setSelectedTanggal] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Tabs Navigasi
  const [activeTab, setActiveTab] = useState('dashboard');

  // Master Data Supabase
  const [logs, setLogs] = useState([]);
  const [siswaList, setSiswaList] = useState([]);
  const [guruList, setGuruList] = useState([]);

  // Stats Dashboard
  const [stats, setStats] = useState({
    totalSiswa: 0,
    hadir: 0,
    terlambat: 0,
    alfa: 0,
    izin: 0,
    sakit: 0,
  });

  // Modal / Action State
  const [showAddSiswaModal, setShowAddSiswaModal] = useState(false);
  const [newSiswa, setNewSiswa] = useState({ rfid: '', nama: '', nisn: '', kelas: '', jurusan: 'TKJ' });
  const [editingSiswa, setEditingSiswa] = useState(null);

  // Simulasi Loading saat pertama kali buka
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setLoading(false);
          return 100;
        }
        return prev + 15;
      });
    }, 150);

    // Cek Session / Remember Me
    const savedUser = localStorage.getItem('ypk_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('ypk_user');
      }
    }

    return () => clearInterval(timer);
  }, []);

  // Fetch Data dari Supabase ketika sudah Login
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();

      // Realtime subscription ke tabel absensi_logs
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'absensi_logs' },
          (payload) => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      setDbConnected(true);
      // 1. Fetch Data Siswa
      const { data: dataSiswa, error: errSiswa } = await supabase.from('siswa').select('*');
      if (dataSiswa) setSiswaList(dataSiswa);

      // 2. Fetch Data Guru
      const { data: dataGuru, error: errGuru } = await supabase.from('guru').select('*');
      if (dataGuru) setGuruList(dataGuru);

      // 3. Fetch Data Logs Absensi
      const { data: dataLogs, error: errLogs } = await supabase
        .from('absensi_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (dataLogs) {
        setLogs(dataLogs);

        // Kalkulasi Statistik Hari Ini
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLogs = dataLogs.filter(
          (l) => l.created_at && l.created_at.startsWith(todayStr)
        );

        const hadir = todayLogs.filter((l) => l.status === 'HADIR').length;
        const terlambat = todayLogs.filter((l) => l.status === 'TERLAMBAT').length;
        const izin = todayLogs.filter((l) => l.status === 'IZIN').length;
        const sakit = todayLogs.filter((l) => l.status === 'SAKIT').length;
        const alfa = todayLogs.filter((l) => l.status === 'ALFA').length;

        setStats({
          totalSiswa: dataSiswa ? dataSiswa.length : 0,
          hadir,
          terlambat,
          alfa,
          izin,
          sakit,
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setDbConnected(false);
    }
  };

  // --- HANDLER LOGIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    const u = usernameInput.trim().toLowerCase();
    const p = passwordInput;

    // 1. Cek Admin Utama
    if ((u === 'admin' || u === 'iqbal' || u === 'fahrul') && p === 'admin123') {
      const userObj = { id: 1, name: u.toUpperCase(), role: 'ADMIN' };
      setCurrentUser(userObj);
      setIsLoggedIn(true);
      if (rememberMe) localStorage.setItem('ypk_user', JSON.stringify(userObj));
      return;
    }

    // 2. Cek Akun Guru dari Database
    const matchedGuru = guruList.find(
      (g) => g.username && g.username.toLowerCase() === u && g.password === p
    );

    if (matchedGuru) {
      const isRestricted = RESTRICTED_GURU_IDS.includes(matchedGuru.id);
      const userObj = {
        id: matchedGuru.id,
        name: matchedGuru.nama || matchedGuru.username,
        role: isRestricted ? 'GURU_RESTRICTED' : 'GURU',
      };
      setCurrentUser(userObj);
      setIsLoggedIn(true);
      if (rememberMe) localStorage.setItem('ypk_user', JSON.stringify(userObj));
      return;
    }

    setLoginError('Username atau Password yang Anda masukkan salah!');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('ypk_user');
  };

  // --- HANDLER TAMBAH / EDIT SISWA ---
  const handleSaveSiswa = async (e) => {
    e.preventDefault();
    if (currentUser?.role === 'GURU_RESTRICTED') {
      alert('Akses Dibatasi: Anda hanya memiliki izin Lihat & Cetak Data.');
      return;
    }

    try {
      if (editingSiswa) {
        // Update Siswa
        const { error } = await supabase
          .from('siswa')
          .update({
            rfid: newSiswa.rfid,
            nama: newSiswa.nama,
            nisn: newSiswa.nisn,
            kelas: newSiswa.kelas,
            jurusan: newSiswa.jurusan,
          })
          .eq('id', editingSiswa.id);

        if (error) throw error;
        alert('Data siswa berhasil diperbarui!');
      } else {
        // Tambah Siswa Baru
        const { error } = await supabase.from('siswa').insert([newSiswa]);
        if (error) throw error;
        alert('Siswa baru berhasil ditambahkan!');
      }

      setShowAddSiswaModal(false);
      setEditingSiswa(null);
      setNewSiswa({ rfid: '', nama: '', nisn: '', kelas: '', jurusan: 'TKJ' });
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan data siswa: ' + err.message);
    }
  };

  const handleDeleteSiswa = async (id) => {
    if (currentUser?.role === 'GURU_RESTRICTED') {
      alert('Akses Dibatasi: Anda tidak dapat menghapus data.');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus siswa ini?')) return;

    try {
      const { error } = await supabase.from('siswa').delete().eq('id', id);
      if (error) throw error;
      alert('Siswa berhasil dihapus!');
      fetchData();
    } catch (err) {
      alert('Gagal menghapus siswa: ' + err.message);
    }
  };

  // --- FILTERING LOGS ABSENSI ---
  const filteredLogs = logs.filter((item) => {
    const matchSearch =
      (item.nama && item.nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.rfid && item.rfid.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.kelas && item.kelas.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchJurusan =
      selectedJurusan === 'ALL' ||
      (item.jurusan && item.jurusan.toUpperCase() === selectedJurusan.toUpperCase());

    const matchTanggal =
      !selectedTanggal || (item.created_at && item.created_at.startsWith(selectedTanggal));

    return matchSearch && matchJurusan && matchTanggal;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- RENDER LOADING INITIAL ---
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBox}>
          <img src="/logo.png" alt="Logo SMK YPK MEDAN" style={styles.loadingLogo} />
          <h2 style={styles.loadingTitle}>PORTAL ABSENSI DIGITAL</h2>
          <p style={styles.loadingSub}>SMK YPK MEDAN</p>
          <div style={styles.progressBarContainer}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }}></div>
          </div>
          <p style={styles.loadingText}>Memuat sistem... {progress}%</p>
        </div>
      </div>
    );
  }

  // --- RENDER FORM LOGIN ---
  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginOverlay}>
          <div style={styles.loginCard}>
            <div style={styles.loginHeader}>
              <img src="/logo.png" alt="Logo YPK" style={styles.loginLogo} />
              <h1 style={styles.loginTitle}>PORTAL ABSENSI DIGITAL</h1>
              <p style={styles.loginSubtitle}>Silakan login untuk mengakses portal SMK YPK MEDAN</p>
            </div>

            {loginError && <div style={styles.errorBanner}>{loginError}</div>}

            <form onSubmit={handleLogin} style={styles.loginForm}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Username / Peran:</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username..."
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Password:</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={styles.textInput}
                />
              </div>

              <div style={styles.rememberGroup}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember" style={{ marginLeft: 8, fontSize: 14, color: '#555' }}>
                  Ingat Saya di Perangkat Ini
                </label>
              </div>

              <button type="submit" style={styles.btnLoginSubmit}>
                MASUK KE DASHBOARD &rarr;
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN DASHBOARD SYSTEM ---
  return (
    <div style={styles.dashboardContainer}>
      {/* Sidebar Navigasi */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <img src="/logo.png" alt="Logo YPK" style={styles.sidebarLogo} />
          <div>
            <h3 style={styles.sidebarBrandTitle}>SMK YPK MEDAN</h3>
            <span style={styles.sidebarBrandSub}>Absensi RFID Digital</span>
          </div>
        </div>

        <div style={styles.userBadge}>
          <div style={styles.avatarCircle}>{currentUser?.name?.charAt(0) || 'U'}</div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>{currentUser?.name}</div>
            <div style={{ fontSize: 11, color: '#e65100', fontWeight: 'bold' }}>
              {currentUser?.role === 'ADMIN'
                ? 'SUPER ADMIN'
                : currentUser?.role === 'GURU_RESTRICTED'
                ? 'GURU (READ & PRINT)'
                : 'GURU / STAFF'}
            </div>
          </div>
        </div>

        <nav style={styles.sidebarNav}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              ...styles.navItem,
              ...(activeTab === 'dashboard' ? styles.navItemActive : {}),
            }}
          >
            📊 Dashboard Ringkasan
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              ...styles.navItem,
              ...(activeTab === 'logs' ? styles.navItemActive : {}),
            }}
          >
            📋 Data Absensi Siswa
          </button>
          <button
            onClick={() => setActiveTab('siswa')}
            style={{
              ...styles.navItem,
              ...(activeTab === 'siswa' ? styles.navItemActive : {}),
            }}
          >
            🎴 Data Master Siswa
          </button>
        </nav>

        <button onClick={handleLogout} style={styles.btnLogout}>
          🚪 Keluar (Logout)
        </button>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {/* Header Bar */}
        <header style={styles.topHeader}>
          <h2>
            {activeTab === 'dashboard' && 'Dashboard Absensi Digital'}
            {activeTab === 'logs' && 'Laporan & Logs Absensi Siswa'}
            {activeTab === 'siswa' && 'Manajemen Data Siswa & Kartu RFID'}
          </h2>
          <div style={styles.headerStatus}>
            <span
              style={{
                ...styles.statusDot,
                backgroundColor: dbConnected ? '#2e7d32' : '#c62828',
              }}
            ></span>
            <span style={{ fontSize: 13, color: '#555', fontWeight: '500' }}>
              {dbConnected ? 'Terhubung ke Database' : 'Terputus (Offline)'}
            </span>
          </div>
        </header>

        {/* CONTEN TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div style={styles.tabContent}>
            {/* Stat Cards Grid */}
            <div style={styles.statsGrid}>
              <div style={{ ...styles.statCard, borderLeft: '4px solid #1976d2' }}>
                <span style={styles.statLabel}>Total Terdaftar</span>
                <span style={styles.statValue}>{stats.totalSiswa} Siswa</span>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '4px solid #2e7d32' }}>
                <span style={styles.statLabel}>Hadir Tepat Waktu</span>
                <span style={styles.statValue}>{stats.hadir} Siswa</span>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '4px solid #ed6c02' }}>
                <span style={styles.statLabel}>Terlambat</span>
                <span style={styles.statValue}>{stats.terlambat} Siswa</span>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '4px solid #0288d1' }}>
                <span style={styles.statLabel}>Izin / Sakit</span>
                <span style={styles.statValue}>{stats.izin + stats.sakit} Siswa</span>
              </div>
              <div style={{ ...styles.statCard, borderLeft: '4px solid #d32f2f' }}>
                <span style={styles.statLabel}>Tanpa Keterangan (Alfa)</span>
                <span style={styles.statValue}>{stats.alfa} Siswa</span>
              </div>
            </div>

            {/* Quick Live Logs Activity */}
            <div style={styles.cardBox}>
              <h3>Aktivitas Tap Absensi Terbaru Hari Ini</h3>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>
                Memantau rekaman tap kartu RFID secara real-time.
              </p>

              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>Waktu Tap</th>
                    <th>Nama Siswa</th>
                    <th>Kelas / Jurusan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 5).map((log, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td>{log.created_at ? new Date(log.created_at).toLocaleTimeString('id-ID') : '-'}</td>
                      <td><strong>{log.nama}</strong></td>
                      <td>{log.kelas} - {log.jurusan}</td>
                      <td>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor:
                              log.status === 'HADIR'
                                ? '#e8f5e9'
                                : log.status === 'TERLAMBAT'
                                ? '#fff3e0'
                                : '#ffebee',
                            color:
                              log.status === 'HADIR'
                                ? '#2e7d32'
                                : log.status === 'TERLAMBAT'
                                ? '#e65100'
                                : '#c62828',
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: 20, color: '#888' }}>
                        Belum ada data tap absensi hari ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTEN TAB 2: DATA LOGS ABSENSI */}
        {activeTab === 'logs' && (
          <div style={styles.tabContent}>
            {/* Filter Tools Bar */}
            <div style={styles.filterBar}>
              <input
                type="text"
                placeholder="Cari Nama / RFID / Kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.filterInput}
              />

              <select
                value={selectedJurusan}
                onChange={(e) => setSelectedJurusan(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="ALL">Semua Jurusan</option>
                <option value="TKJ">TKJ (Teknik Komputer & Jaringan)</option>
                <option value="TKR">TKR (Teknik Kendaraan Ringan)</option>
                <option value="TSM">TSM (Teknik Sepeda Motor)</option>
                <option value="AKUNTANSI">Akuntansi</option>
              </select>

              <input
                type="date"
                value={selectedTanggal}
                onChange={(e) => setSelectedTanggal(e.target.value)}
                style={styles.filterSelect}
              />

              <button onClick={() => window.print()} style={styles.btnPrint}>
                🖨️ Cetak Laporan
              </button>
            </div>

            {/* Main Table Logs */}
            <div style={styles.cardBox}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>No</th>
                    <th>Tanggal & Waktu</th>
                    <th>ID RFID</th>
                    <th>Nama Siswa</th>
                    <th>Kelas</th>
                    <th>Jurusan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((item, index) => (
                    <tr key={index} style={styles.tableRow}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString('id-ID')
                          : '-'}
                      </td>
                      <td><code>{item.rfid}</code></td>
                      <td><strong>{item.nama}</strong></td>
                      <td>{item.kelas}</td>
                      <td>{item.jurusan}</td>
                      <td>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor:
                              item.status === 'HADIR'
                                ? '#e8f5e9'
                                : item.status === 'TERLAMBAT'
                                ? '#fff3e0'
                                : '#ffebee',
                            color:
                              item.status === 'HADIR'
                                ? '#2e7d32'
                                : item.status === 'TERLAMBAT'
                                ? '#e65100'
                                : '#c62828',
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {currentLogs.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: 25, color: '#888' }}>
                        Tidak ada data absensi yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={styles.paginationBox}>
                <span>
                  Halaman {currentPage} dari {totalPages}
                </span>
                <div>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    style={styles.btnPage}
                  >
                    &laquo; Sebelumnya
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    style={{ ...styles.btnPage, marginLeft: 8 }}
                  >
                    Selanjutnya &raquo;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTEN TAB 3: MASTER DATA SISWA */}
        {activeTab === 'siswa' && (
          <div style={styles.tabContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
              <h3>Daftar Siswa Terdaftar RFID</h3>
              {currentUser?.role !== 'GURU_RESTRICTED' && (
                <button
                  onClick={() => {
                    setEditingSiswa(null);
                    setNewSiswa({ rfid: '', nama: '', nisn: '', kelas: '', jurusan: 'TKJ' });
                    setShowAddSiswaModal(true);
                  }}
                  style={styles.btnAddPrimary}
                >
                  ➕ Tambah Siswa Baru
                </button>
              )}
            </div>

            <div style={styles.cardBox}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>ID RFID</th>
                    <th>NISN</th>
                    <th>Nama Lengkap</th>
                    <th>Kelas</th>
                    <th>Jurusan</th>
                    {currentUser?.role !== 'GURU_RESTRICTED' && <th>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {siswaList.map((s) => (
                    <tr key={s.id} style={styles.tableRow}>
                      <td><code>{s.rfid}</code></td>
                      <td>{s.nisn || '-'}</td>
                      <td><strong>{s.nama}</strong></td>
                      <td>{s.kelas}</td>
                      <td>{s.jurusan}</td>
                      {currentUser?.role !== 'GURU_RESTRICTED' && (
                        <td>
                          <button
                            onClick={() => {
                              setEditingSiswa(s);
                              setNewSiswa(s);
                              setShowAddSiswaModal(true);
                            }}
                            style={styles.btnActionEdit}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSiswa(s.id)}
                            style={styles.btnActionDelete}
                          >
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {siswaList.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: 25, color: '#888' }}>
                        Belum ada master data siswa terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL FORM SISWA */}
      {showAddSiswaModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3>{editingSiswa ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h3>
            <form onSubmit={handleSaveSiswa} style={{ marginTop: 15 }}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>UID RFID / Kartu:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1384729103"
                  value={newSiswa.rfid}
                  onChange={(e) => setNewSiswa({ ...newSiswa, rfid: e.target.value })}
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Nama Lengkap Siswa:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Budi"
                  value={newSiswa.nama}
                  onChange={(e) => setNewSiswa({ ...newSiswa, nama: e.target.value })}
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>NISN Siswa:</label>
                <input
                  type="text"
                  placeholder="Contoh: 0051234567"
                  value={newSiswa.nisn}
                  onChange={(e) => setNewSiswa({ ...newSiswa, nisn: e.target.value })}
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Kelas:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XII TKJ 1"
                  value={newSiswa.kelas}
                  onChange={(e) => setNewSiswa({ ...newSiswa, kelas: e.target.value })}
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Jurusan:</label>
                <select
                  value={newSiswa.jurusan}
                  onChange={(e) => setNewSiswa({ ...newSiswa, jurusan: e.target.value })}
                  style={styles.textInput}
                >
                  <option value="TKJ">TKJ</option>
                  <option value="TKR">TKR</option>
                  <option value="TSM">TSM</option>
                  <option value="AKUNTANSI">Akuntansi</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowAddSiswaModal(false)}
                  style={styles.btnCancel}
                >
                  Batal
                </button>
                <button type="submit" style={styles.btnAddPrimary}>
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- STYLES OBJECT (INLINE CSS) ---
const styles = {
  // Loading
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    fontFamily: 'sans-serif',
  },
  loadingBox: {
    textAlign: 'center',
    padding: 30,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    width: 320,
  },
  loadingLogo: { width: 80, height: 'auto', marginBottom: 15 },
  loadingTitle: { fontSize: 18, color: '#e65100', margin: 0 },
  loadingSub: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 20 },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#e65100',
    transition: 'width 0.2s ease',
  },
  loadingText: { fontSize: 12, color: '#888', marginTop: 10 },

  // Login
  loginBg: {
    minHeight: '100vh',
    // DIPERBAIKI: Panggil gedung.png langsung dari folder public!
    backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url("/gedung.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  loginOverlay: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: '35px 30px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  },
  loginHeader: { textAlign: 'center', marginBottom: 25 },
  loginLogo: { width: 75, height: 'auto', marginBottom: 10 },
  loginTitle: { fontSize: 20, color: '#e65100', fontWeight: 'bold', margin: 0 },
  loginSubtitle: { fontSize: 13, color: '#666', marginTop: 5 },
  errorBanner: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 15,
    border: '1px solid #ffcdd2',
  },
  loginForm: { display: 'flex', flexDirection: 'column', gap: 15 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#e65100' },
  textInput: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #ffcc80',
    fontSize: 14,
    outline: 'none',
  },
  rememberGroup: { display: 'flex', alignItems: 'center' },
  btnLoginSubmit: {
    padding: '12px',
    backgroundColor: '#e65100',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 'bold',
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 10,
  },

  // Main Dashboard
  dashboardContainer: { display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6f8' },
  sidebar: {
    width: 260,
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    padding: 20,
  },
  sidebarBrand: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 25 },
  sidebarLogo: { width: 40, height: 'auto' },
  sidebarBrandTitle: { fontSize: 16, margin: 0, color: '#e65100' },
  sidebarBrandSub: { fontSize: 11, color: '#777' },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 35,
    height: 35,
    borderRadius: '50%',
    backgroundColor: '#e65100',
    color: '#fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
  },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  navItem: {
    padding: '12px 15px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    textAlign: 'left',
    fontSize: 14,
    color: '#444',
    cursor: 'pointer',
  },
  navItemActive: { backgroundColor: '#e65100', color: '#ffffff', fontWeight: 'bold' },
  btnLogout: {
    padding: '10px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 13,
  },

  mainContent: { flex: 1, padding: 30, overflowY: 'auto' },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  headerStatus: { display: 'flex', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: '50%' },

  tabContent: { display: 'flex', flexDirection: 'column', gap: 20 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15 },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#222' },

  cardBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },

  filterBar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 15 },
  filterInput: { flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc' },
  filterSelect: { padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc' },
  btnPrint: {
    padding: '10px 18px',
    backgroundColor: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 'bold',
  },

  table: { width: '100%', borderCollapse: 'collapse', marginTop: 10 },
  tableHeader: { backgroundColor: '#f8f9fa', borderBottom: '2px solid #eee', textAlign: 'left' },
  tableRow: { borderBottom: '1px solid #eee' },
  badge: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    display: 'inline-block',
  },

  paginationBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    fontSize: 13,
    color: '#666',
  },
  btnPage: {
    padding: '6px 12px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    borderRadius: 6,
    cursor: 'pointer',
  },

  btnAddPrimary: {
    padding: '10px 16px',
    backgroundColor: '#e65100',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  btnActionEdit: {
    padding: '4px 10px',
    backgroundColor: '#ffb74d',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    marginRight: 6,
    cursor: 'pointer',
  },
  btnActionDelete: {
    padding: '4px 10px',
    backgroundColor: '#e57373',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalBox: { backgroundColor: '#fff', padding: 25, borderRadius: 12, width: 400, maxWidth: '90%' },
  btnCancel: {
    padding: '10px 16px',
    backgroundColor: '#eee',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
};
