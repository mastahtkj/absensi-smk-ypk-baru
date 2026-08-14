'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  // --- STATE SYSTEM & LOGIN ---
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Form Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- STATE DASHBOARD ABSENSI ---
  const [siswaList, setSiswaList] = useState([]);
  const [absensiLogs, setAbsensiLogs] = useState([]);
  const [periode, setPeriode] = useState('Hari Ini');
  const [filterTingkat, setFilterTingkat] = useState('Semua Tingkat');
  const [filterJurusan, setFilterJurusan] = useState('Semua Jurusan');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Status State
  const [editingId, setEditingId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Hadir');

  // 1. EFEK SPLASH SCREEN PAS 5 DETIK (5000 ms)
  useEffect(() => {
    const totalDuration = 5000; // 5 Detik
    const intervalTime = 100; // Update setiap 100ms
    const step = 100 / (totalDuration / intervalTime); // +2% per step

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setLoading(false), 300);
          return 100;
        }
        return Math.min(prev + step, 100);
      });
    }, intervalTime);

    // Cek Session LocalStorage
    const savedUser = localStorage.getItem('user_guru');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('user_guru');
      }
    }

    fetchInitialData();

    // Supabase Realtime Listener
    const channel = supabase
      .channel('absensi-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi' }, () => {
        fetchInitialData();
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInitialData = async () => {
    const { data: cards } = await supabase.from('rfid_cards').select('*');
    if (cards) setSiswaList(cards);

    const { data: logs } = await supabase.from('absensi').select('*').order('created_at', { ascending: false });
    if (logs) setAbsensiLogs(logs);
  };

  // 2. FUNGSI SUBMIT LOGIN KE SUPABASE GURU
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { data: guru, error } = await supabase
        .from('guru')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password.trim())
        .single();

      if (error || !guru) {
        setLoginError('Username atau password salah!');
      } else {
        const userData = {
          id: guru.id,
          nama: guru.nama,
          role: guru.role || 'guru'
        };
        setCurrentUser(userData);
        setIsLoggedIn(true);
        if (rememberMe) {
          localStorage.setItem('user_guru', JSON.stringify(userData));
        }
      }
    } catch (err) {
      setLoginError('Gagal terhubung ke database.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_guru');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  // 3. EDIT STATUS ABSENSI
  const handleSaveStatus = async (rfidUid) => {
    const { error } = await supabase
      .from('absensi')
      .upsert({ rfid_uid: rfidUid, status: selectedStatus, updated_at: new Date() });

    if (!error) {
      setEditingId(null);
      fetchInitialData();
      alert('Status berhasil diubah!');
    } else {
      alert('Gagal mengubah status');
    }
  };

  // HITUNG STATISTIK
  const totalSiswa = siswaList.length || 66;
  const totalHadir = absensiLogs.filter((l) => l.status === 'Hadir').length;
  const persentaseHadir = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;

  // FILTER DATA
  const filteredSiswa = siswaList.filter((s) => {
    const matchSearch =
      (s.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.kelas || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchTingkat =
      filterTingkat === 'Semua Tingkat' ||
      (s.kelas && s.kelas.startsWith(filterTingkat.replace('Kelas ', '')));
    const matchJurusan =
      filterJurusan === 'Semua Jurusan' ||
      (s.kelas && s.kelas.includes(filterJurusan.split(' ')[0]));
    return matchSearch && matchTingkat && matchJurusan;
  });

  // ===============================================================
  // A. TAMPILAN SPLASH SCREEN (5 DETIK & BACKGROUND GEDUNG ASLI)
  // ===============================================================
  if (loading) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.overlay}>
          <div style={styles.splashCard}>
            <img
              src="/logo.png"
              onError={(e) => {
                e.target.src =
                  'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
              }}
              alt="Logo SMK YPK Medan"
              style={{ width: '90px', margin: '0 auto 15px auto', display: 'block' }}
            />
            <span style={styles.orangeBadge}>SERVER ABSENSI DIGITAL</span>
            <h2 style={{ color: '#4a2c11', margin: '10px 0 5px 0', fontSize: '22px', fontWeight: 'bold' }}>
              SMK YPK MEDAN
            </h2>
            <p style={{ color: '#666', fontSize: '13px', margin: '0 0 20px 0' }}>
              Menghubungkan Server Presensi RFID Real-Time...
            </p>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${Math.round(progress)}%` }}></div>
            </div>

            <div
              style={{
                display: 'flex',
                justify: 'space-between',
                fontSize: '12px',
                color: '#555',
                marginTop: '12px',
                fontWeight: '600'
              }}
            >
              <span>Proses Inisialisasi {Math.round(progress)}%</span>
              <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>● SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===============================================================
  // B. TAMPILAN PORTAL LOGIN (BACKGROUND GEDUNG ASLI & LOGO)
  // ===============================================================
  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.overlay}>
          <div style={styles.portalCard}>
            <img
              src="/logo.png"
              onError={(e) => {
                e.target.src =
                  'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
              }}
              alt="Logo SMK YPK Medan"
              style={{ width: '85px', margin: '0 auto 10px auto', display: 'block' }}
            />
            <h2 style={{ textAlign: 'center', color: '#e65100', margin: '5px 0 2px 0', fontSize: '20px', fontWeight: 'bold' }}>
              PORTAL ABSENSI DIGITAL
            </h2>
            <p style={{ textAlign: 'center', color: '#777', fontSize: '12px', marginBottom: '22px' }}>
              Silakan login untuk mengakses portal SMK YPK MEDAN
            </p>

            {loginError && <div style={styles.errorAlert}>{loginError}</div>}

            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={styles.fieldLabel}>Username / Peran:</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={styles.inputStyle}
                  placeholder="Masukkan username"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={styles.fieldLabel}>Password:</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.inputStyle}
                  placeholder="••••••••"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember" style={{ fontSize: '12px', color: '#555' }}>
                  Ingat Saya di Perangkat Ini (Simpan Password)
                </label>
              </div>

              <button type="submit" disabled={isLoggingIn} style={styles.btnOrange}>
                {isLoggingIn ? 'MEMPROSES...' : 'MASUK KE DASHBOARD →'}
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <p style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', marginBottom: '8px' }}>
                Akses Cepat Mode Demo Guru:
              </p>
              <button
                type="button"
                onClick={() => {
                  setUsername('guru');
                  setPassword('ypk123');
                }}
                style={styles.btnDemo}
              >
                👩‍🏫 AKSES CEPAT GURU
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===============================================================
  // C. TAMPILAN DASHBOARD UTAMA (LOGO DI HEADER NAV)
  // ===============================================================
  return (
    <div style={styles.dashboardBg}>
      {/* NAVBAR DENGAN LOGO YPK */}
      <header style={styles.headerNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/logo.png"
            onError={(e) => {
              e.target.src =
                'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
            }}
            alt="Logo SMK YPK Medan"
            style={{ width: '48px', height: '48px', objectFit: 'contain' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#e65100', fontWeight: 'bold' }}>
              DASHBOARD ABSENSI REAL-TIME
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#666', fontWeight: '600' }}>
              SMK YPK MEDAN • Integrated IoT RFID Server
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <b style={{ display: 'block', fontSize: '14px', color: '#333' }}>
              {currentUser?.nama || 'Bpk/Ibu Guru'}
            </b>
            <span style={{ fontSize: '11px', color: '#e65100', fontWeight: 'bold' }}>
              {currentUser?.role === 'admin' ? 'ADMINISTRATOR (AKSES PENUH)' : 'Guru Pengajar'}
            </span>
          </div>
          <button onClick={handleLogout} style={styles.btnLogoutOutlined}>
            Keluar 🚪
          </button>
        </div>
      </header>

      <main style={{ padding: '25px 30px', maxWidth: '1300px', margin: '0 auto' }}>
        {/* STATISTIK TOP CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
          <div style={{ ...styles.cardBox, borderLeft: '6px solid #e65100', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={styles.iconCircle}>🎓</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#222' }}>{totalSiswa}</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#777', fontWeight: 'bold' }}>Total Siswa Terdaftar</p>
            </div>
          </div>

          <div style={{ ...styles.cardBox, borderLeft: '6px solid #2ecc71', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#e8f5e9', color: '#2ecc71' }}>✅</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#222' }}>{totalHadir}</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#777', fontWeight: 'bold' }}>Hadir Tepat Waktu</p>
            </div>
          </div>

          <div style={{ ...styles.cardBox, borderLeft: '6px solid #e65100', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#fff3e0', color: '#e65100' }}>📈</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#222' }}>{persentaseHadir}%</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#777', fontWeight: 'bold' }}>Persentase Kehadiran Total</p>
            </div>
          </div>
        </div>

        {/* REKAP KEHADIRAN PER KELAS */}
        <div style={{ ...styles.cardBox, marginBottom: '25px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#e65100', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏫 REKAP KEHADIRAN PER KELAS
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
            <div style={styles.classBoxUrgent}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>X TJKT</b>
                <span style={styles.badgeUrgent}>⚠️ URGENT</span>
              </div>
              <h2 style={{ color: '#e74c3c', margin: '8px 0 4px 0' }}>0%</h2>
              <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Hadir: 0 / Total: 37 Siswa</p>
            </div>

            <div style={styles.classBoxUrgent}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b>XI TJKT</b>
                <span style={styles.badgeUrgent}>⚠️ URGENT</span>
              </div>
              <h2 style={{ color: '#e74c3c', margin: '8px 0 4px 0' }}>0%</h2>
              <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Hadir: 0 / Total: 29 Siswa</p>
            </div>
          </div>
        </div>

        {/* FILTER & PERIODE REKAP */}
        <div style={{ ...styles.cardBox, marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100' }}>📅 PERIODE REKAP:</span>
              {['Hari Ini', '7 Hari', 'Bulanan'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriode(p)}
                  style={periode === p ? styles.btnFilterActive : styles.btnFilter}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={styles.btnGreenExport}>📊 Export Excel (.csv)</button>
              <button style={styles.btnBluePdf}>📄 Cetak PDF Laporan (HARIAN)</button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', width: '80px' }}>TINGKAT:</span>
            {['Semua Tingkat', 'Kelas X', 'Kelas XI', 'Kelas XII'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterTingkat(t)}
                style={filterTingkat === t ? styles.btnFilterActive : styles.btnFilter}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', width: '80px' }}>JURUSAN:</span>
            {['Semua Jurusan', 'TJKT (Jaringan)', 'AKL (Akuntansi)', 'MPLB (Perkantoran)', 'PM (Pemasaran)', 'BM (Bisnis Manajemen)'].map((j) => (
              <button
                key={j}
                onClick={() => setFilterJurusan(j)}
                style={filterJurusan === j ? styles.btnFilterActive : styles.btnFilter}
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        {/* INPUT SEARCH */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="🔍 Cari nama siswa atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchBar}
          />
        </div>

        {/* TABEL PRESENSI RFID */}
        <div style={styles.cardBox}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ffe0b2' }}>
                <th style={styles.thCol}>STATUS PRESENSI</th>
                <th style={styles.thCol}>WAKTU TAP (HARIAN)</th>
                <th style={styles.thCol}>NAMA SISWA</th>
                <th style={styles.thCol}>KELAS / JURUSAN</th>
                <th style={styles.thCol}>RFID UID</th>
                <th style={styles.thCol}>AKSI PERUBAHAN</th>
              </tr>
            </thead>
            <tbody>
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '25px', color: '#999' }}>
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((siswa) => {
                  const log = absensiLogs.find((l) => l.rfid_uid === siswa.rfid_uid);
                  const isHadir = log?.status === 'Hadir';

                  return (
                    <tr key={siswa.id} style={{ borderBottom: '1px solid #fff3e0' }}>
                      <td style={styles.tdCol}>
                        {isHadir ? (
                          <span style={styles.badgeHadir}>Hadir (TEST)</span>
                        ) : (
                          <span style={styles.badgeAlpha}>❌ BELUM TAP / ALPHA</span>
                        )}
                      </td>
                      <td style={{ ...styles.tdCol, color: '#777' }}>
                        {log ? new Date(log.created_at).toLocaleString('id-ID') : 'Belum Melakukan Tap'}
                      </td>
                      <td style={{ ...styles.tdCol, fontWeight: 'bold' }}>{siswa.nama || 'NAMA SISWA'}</td>
                      <td style={styles.tdCol}>
                        <span style={styles.badgeClass}>{siswa.kelas || 'X TJKT'}</span>
                      </td>
                      <td style={{ ...styles.tdCol, color: '#1565c0', fontFamily: 'monospace' }}>
                        {siswa.rfid_uid || 'UID_CARDS'}
                      </td>
                      <td style={styles.tdCol}>
                        {editingId === siswa.id ? (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={{ padding: '4px' }}>
                              <option value="Hadir">Hadir</option>
                              <option value="Sakit">Sakit</option>
                              <option value="Izin">Izin</option>
                              <option value="Alpha">Alpha</option>
                            </select>
                            <button onClick={() => handleSaveStatus(siswa.rfid_uid)} style={styles.btnSmallSave}>OK</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingId(siswa.id)} style={styles.btnEditOutline}>
                            ✏️ Edit Status
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

// STYLING DENGAN BACKGROUND GEDUNG SEKOLAH ASLI
const styles = {
  loginBg: {
    minHeight: '100vh',
    backgroundImage: `url('/gedung.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  },
  overlay: {
    minHeight: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.35)', // Lapisan netral transparan agar kartu menonjol
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  },
  portalCard: {
    backgroundColor: '#ffffff',
    padding: '35px 38px',
    borderRadius: '20px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '400px'
  },
  splashCard: {
    backgroundColor: '#ffffff',
    padding: '35px',
    borderRadius: '20px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '380px',
    textAlign: 'center'
  },
  orangeBadge: { backgroundColor: '#fff3e0', color: '#e65100', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px' },
  progressTrack: { backgroundColor: '#ffe0b2', height: '9px', borderRadius: '5px', overflow: 'hidden', marginTop: '15px' },
  progressBar: { backgroundColor: '#e65100', height: '100%', transition: 'width 0.1s linear' },
  fieldLabel: { fontSize: '12px', fontWeight: 'bold', color: '#e65100', display: 'block', marginBottom: '5px' },
  inputStyle: { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #ffe0b2', outline: 'none', boxSizing: 'border-box' },
  btnOrange: { width: '100%', padding: '14px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  btnDemo: { backgroundColor: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2', padding: '10px 18px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', width: '100%' },
  errorAlert: { backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '15px', textAlign: 'center' },
  
  dashboardBg: {
    minHeight: '100vh',
    backgroundColor: '#fffdfa',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  },
  headerNav: {
    backgroundColor: '#ffffff',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #ffe0b2',
    boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
  },
  btnLogoutOutlined: { border: '1px solid #ffcdd2', backgroundColor: '#fff5f5', color: '#c62828', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  cardBox: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #ffe0b2', boxShadow: '0 2px 8px rgba(230,81,0,0.03)' },
  iconCircle: { width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#fff3e0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px' },
  classBoxUrgent: { border: '1px solid #ffcdd2', backgroundColor: '#fff5f5', padding: '15px', borderRadius: '10px' },
  badgeUrgent: { backgroundColor: '#e74c3c', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '10px' },
  btnFilter: { border: '1px solid #ffe0b2', backgroundColor: '#fff', color: '#e65100', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' },
  btnFilterActive: { border: 'none', backgroundColor: '#e65100', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnGreenExport: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnBluePdf: { backgroundColor: '#2980b9', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  searchBar: { width: '100%', padding: '12px 20px', borderRadius: '20px', border: '1px solid #ffe0b2', outline: 'none', boxSizing: 'border-box' },
  thCol: { textAlign: 'left', padding: '12px', fontSize: '11px', color: '#e65100', fontWeight: 'bold' },
  tdCol: { padding: '14px 12px', fontSize: '13px', color: '#333' },
  badgeAlpha: { border: '1px solid #ffcdd2', backgroundColor: '#fff5f5', color: '#c62828', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeHadir: { backgroundColor: '#fff3e0', color: '#e65100', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeClass: { border: '1px solid #ffe0b2', backgroundColor: '#fffdfa', color: '#e65100', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' },
  btnEditOutline: { border: '1px solid #ffe0b2', backgroundColor: '#fff3e0', color: '#e65100', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  btnSmallSave: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }
};
