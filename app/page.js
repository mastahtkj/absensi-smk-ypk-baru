'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Data Akses Akun Demo
const DEMO_USERS = {
  guru: { password: 'guru123', role: 'Guru Pengajar', name: 'Bpk/Ibu Guru' },
  kepsek: { password: 'kepsek123', role: 'Kepala Sekolah', name: 'Kepala Sekolah' },
  it: { password: 'it123', role: 'Administrator IT', name: 'Tim IT SMK YPK' }
};

const JURUSAN_LIST = [
  { id: 'SEMUA', label: 'Semua Jurusan', icon: '⚡' },
  { id: 'TJKT', label: 'TJKT (Teknik Jaringan)', icon: '🌐' },
  { id: 'AKL', label: 'AKL (Akuntansi)', icon: '📊' },
  { id: 'MPLB', label: 'MPLB (Perkantoran)', icon: '💼' },
  { id: 'PM', label: 'PM (Pemasaran)', icon: '🛍️' },
  { id: 'BM', label: 'BM (Bisnis Manaj.)', icon: '📈' }
];

export default function App() {
  const [loadingSplash, setLoadingSplash] = useState(true);
  const [progress, setProgress] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [dataAbsensi, setDataAbsensi] = useState([]);
  const [activeJurusan, setActiveJurusan] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Splashscreen Progress Bar Super Halus (60 FPS)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setLoadingSplash(false), 300);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Data Realtime dari Supabase
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
      const interval = setInterval(ambilData, 2000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  // Handler Login
  const handleLogin = (e) => {
    e.preventDefault();
    const userKey = usernameInput.toLowerCase().trim();
    if (DEMO_USERS[userKey] && DEMO_USERS[userKey].password === passwordInput) {
      setUserRole(userKey);
      setLoginError('');
    } else {
      setLoginError('Username atau Password salah! (Gunakan: guru, kepsek, atau it)');
    }
  };

  const quickLogin = (roleKey) => {
    setUsernameInput(roleKey);
    setPasswordInput(DEMO_USERS[roleKey].password);
  };

  // Filter Data
  const filteredData = dataAbsensi.filter((item) => {
    const matchJurusan =
      activeJurusan === 'SEMUA' || (item.kelas && item.kelas.toUpperCase().includes(activeJurusan));
    const matchSearch =
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    return matchJurusan && matchSearch;
  });

  return (
    <>
      {/* INJECT ANIMASI CSS UNTUK SPLASH HALUS */}
      <style jsx global>{`
        @keyframes pulseLogo {
          0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.4)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(249, 115, 22, 0.8)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.4)); }
        }
        @keyframes pulseDot {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        body {
          margin: 0;
          padding: 0;
          background-color: #fff7ed;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
      `}</style>

      {/* ========================================== */}
      {/* TAMPILAN 1: SPLASH SCREEN ORANGE ELEGANT   */}
      {/* ========================================== */}
      {loadingSplash ? (
        <div style={styles.splashBg}>
          <div style={styles.splashCard}>
            <div style={styles.logoWrapper}>
              <img
                src="/logo.png"
                alt="Logo SMK YPK Medan"
                style={styles.splashLogo}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1200px-React-icon.svg.png';
                }}
              />
            </div>
            <h3 style={styles.splashSubText}>SERVER ABSENSI DIGITAL</h3>
            <h1 style={styles.splashTitle}>SMK YPK MEDAN</h1>
            
            {/* Progress Bar Smooth */}
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }}></div>
            </div>

            <div style={styles.splashStatus}>
              <span>Memuat Sistem {progress}%</span>
              <span style={styles.badgeOnline}>● ONLINE</span>
            </div>
          </div>
        </div>
      ) : !userRole ? (
        /* ========================================== */
        /* TAMPILAN 2: FORM LOGIN NUANSA ORANGE       */
        /* ========================================== */
        <div style={styles.loginBg}>
          <div style={styles.loginCard}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <img
                src="/logo.png"
                alt="Logo SMK YPK Medan"
                style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '10px' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <h2 style={{ color: '#ea580c', margin: '5px 0', fontSize: '22px', fontWeight: '800' }}>
                ABSENSI DIGITAL YPK
              </h2>
              <p style={{ color: '#9a3412', fontSize: '13px', margin: 0, fontWeight: '500' }}>
                Silakan login untuk mengakses portal SMK YPK MEDAN
              </p>
            </div>

            {loginError && <div style={styles.errorBanner}>{loginError}</div>}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '15px' }}>
                <label style={styles.label}>Username Akun:</label>
                <input
                  type="text"
                  placeholder="Ketik: guru / kepsek / it"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={styles.label}>Password:</label>
                <input
                  type="password"
                  placeholder="Masukkan password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <button type="submit" style={styles.btnPrimary}>
                MASUK KE DASHBOARD →
              </button>
            </form>

            <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #fed7aa' }}>
              <p style={{ fontSize: '12px', color: '#c2410c', textAlign: 'center', marginBottom: '10px', fontWeight: '600' }}>
                Akses Cepat (Klik untuk memilih):
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button onClick={() => quickLogin('guru')} style={styles.btnQuick}>👨‍🏫 GURU</button>
                <button onClick={() => quickLogin('kepsek')} style={styles.btnQuick}>👔 KEPSEK</button>
                <button onClick={() => quickLogin('it')} style={styles.btnQuick}>💻 TIM IT</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================== */
        /* TAMPILAN 3: MAIN DASHBOARD ORANGE & PUTIH  */
        /* ========================================== */
        <div style={styles.dashboardContainer}>
          {/* HEADER BAR */}
          <header style={styles.headerBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img
                src="/logo.png"
                alt="Logo SMK YPK Medan"
                style={{ width: '45px', height: '45px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <h1 style={styles.headerTitle}>DASHBOARD ABSENSI REAL-TIME</h1>
                <p style={styles.headerSub}>SMK YPK MEDAN • Sistem IoT RFID Terintegrasi</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#431407' }}>
                  {DEMO_USERS[userRole].name}
                </div>
                <div style={{ fontSize: '12px', color: '#ea580c', fontWeight: '700' }}>
                  {DEMO_USERS[userRole].role}
                </div>
              </div>
              <button onClick={() => setUserRole(null)} style={styles.btnLogout}>
                Keluar 🚪
              </button>
            </div>
          </header>

          <main style={{ maxWidth: '1200px', margin: '25px auto', padding: '0 15px' }}>
            {/* STATS CARDS */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={{ fontSize: '28px' }}>📊</div>
                <div>
                  <div style={styles.statNumber}>{dataAbsensi.length}</div>
                  <div style={styles.statLabel}>Total Siswa Tap Hari Ini</div>
                </div>
              </div>

              <div style={{ ...styles.statCard, borderLeft: '5px solid #22c55e' }}>
                <div style={{ fontSize: '28px' }}>✅</div>
                <div>
                  <div style={{ ...styles.statNumber, color: '#16a34a' }}>
                    {dataAbsensi.filter((d) => d.status && d.status.includes('TEPAT')).length}
                  </div>
                  <div style={styles.statLabel}>Hadir Tepat Waktu</div>
                </div>
              </div>

              <div style={{ ...styles.statCard, borderLeft: '5px solid #f97316' }}>
                <div style={{ fontSize: '28px' }}>🌧️</div>
                <div>
                  <div style={{ ...styles.statNumber, color: '#ea580c' }}>
                    {dataAbsensi.filter((d) => d.status && d.status.includes('HUJAN')).length}
                  </div>
                  <div style={styles.statLabel}>Dispensasi Hujan</div>
                </div>
              </div>
            </div>

            {/* TAB JURUSAN & SEARCH BOX */}
            <div style={styles.filterSection}>
              <div style={styles.tabContainer}>
                {JURUSAN_LIST.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => setActiveJurusan(j.id)}
                    style={{
                      ...styles.tabBtn,
                      ...(activeJurusan === j.id ? styles.tabBtnActive : {})
                    }}
                  >
                    <span>{j.icon}</span> {j.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="🔍 Cari Nama Siswa / Kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchBox}
              />
            </div>

            {/* TABEL ABSENSI REALTIME */}
            <div style={styles.tableCard}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>STATUS HADIR</th>
                    <th style={styles.th}>WAKTU TAP</th>
                    <th style={styles.th}>NAMA SISWA</th>
                    <th style={styles.th}>KELAS / JURUSAN</th>
                    <th style={styles.th}>RFID UID</th>
                    <th style={styles.th}>KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '35px', color: '#9a3412' }}>
                        Belum ada data tap siswa untuk jurusan/kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => {
                      const isHadir = item.status && item.status.includes('TEPAT');
                      return (
                        <tr key={index} style={styles.trHover}>
                          <td style={styles.td}>
                            {isHadir ? (
                              <span style={styles.badgeHadir}>
                                <span style={styles.dotPulse}></span> HADIR
                              </span>
                            ) : (
                              <span style={styles.badgeLain}>{item.status}</span>
                            )}
                          </td>

                          <td style={{ ...styles.td, color: '#7c2d12', fontWeight: '600' }}>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleTimeString('id-ID', {
                                  timeZone: 'Asia/Jakarta',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                }) + ' WIB'
                              : '-'}
                          </td>

                          <td style={{ ...styles.td, fontWeight: '800', color: '#431407' }}>
                            {item.nama}
                          </td>

                          <td style={styles.td}>
                            <span style={styles.badgeKelas}>{item.kelas}</span>
                          </td>

                          <td style={{ ...styles.td, fontFamily: 'monospace', color: '#9a3412' }}>
                            {item.rfid_uid || '-'}
                          </td>

                          <td style={{ ...styles.td, color: isHadir ? '#16a34a' : '#ea580c', fontWeight: '700' }}>
                            {item.status}
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
      )}
    </>
  );
}

// ==========================================
// STYLESHEET ORANGE & PUTIH (CLEAN & SMOOTH)
// ==========================================
const styles = {
  // Splash Screen Styles
  splashBg: {
    height: '100vh',
    background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box'
  },
  splashCard: {
    background: '#ffffff',
    padding: '40px 30px',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(234, 88, 12, 0.12)',
    textAlign: 'center',
    maxWidth: '380px',
    width: '90%',
    border: '2px solid #ffedd5'
  },
  logoWrapper: {
    width: '100px',
    height: '100px',
    margin: '0 auto 15px auto',
    animation: 'pulseLogo 2.5s infinite ease-in-out'
  },
  splashLogo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },
  splashSubText: {
    fontSize: '13px',
    letterSpacing: '2px',
    color: '#ea580c',
    margin: '0 0 4px 0',
    fontWeight: '700'
  },
  splashTitle: {
    fontSize: '22px',
    fontWeight: '900',
    color: '#431407',
    margin: '0 0 20px 0'
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
  badgeOnline: {
    color: '#16a34a',
    fontWeight: 'bold'
  },

  // Login Styles
  loginBg: {
    minHeight: '100vh',
    background: '#fff7ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  loginCard: {
    background: '#ffffff',
    padding: '35px',
    borderRadius: '20px',
    boxShadow: '0 15px 35px rgba(234, 88, 12, 0.1)',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid #fed7aa'
  },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#7c2d12', marginBottom: '6px' },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1px solid #fdba74',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box',
    background: '#fff'
  },
  btnPrimary: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)'
  },
  btnQuick: {
    padding: '9px 5px',
    background: '#fff7ed',
    border: '1px solid #ffedd5',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    color: '#c2410c'
  },
  errorBanner: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '12px',
    marginBottom: '15px',
    textAlign: 'center',
    fontWeight: '600'
  },

  // Dashboard Styles
  dashboardContainer: { minHeight: '100vh', background: '#fff7ed' },
  headerBar: {
    background: '#ffffff',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #ffedd5',
    boxShadow: '0 4px 15px rgba(234, 88, 12, 0.05)'
  },
  headerTitle: { fontSize: '18px', fontWeight: '900', margin: 0, color: '#ea580c' },
  headerSub: { fontSize: '12px', color: '#9a3412', margin: 0, fontWeight: '500' },
  btnLogout: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    padding: '8px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px'
  },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' },
  statCard: {
    background: '#ffffff',
    padding: '20px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 4px 15px rgba(234, 88, 12, 0.05)',
    borderLeft: '5px solid #ea580c',
    border: '1px solid #ffedd5',
    borderLeftWidth: '5px'
  },
  statNumber: { fontSize: '26px', fontWeight: '900', color: '#431407' },
  statLabel: { fontSize: '12px', color: '#9a3412', fontWeight: '600' },

  filterSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' },
  tabContainer: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' },
  tabBtn: {
    padding: '9px 16px',
    borderRadius: '20px',
    background: '#ffffff',
    border: '1px solid #fed7aa',
    fontSize: '12px',
    fontWeight: '700',
    color: '#c2410c',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  tabBtnActive: { background: '#ea580c', color: '#ffffff', borderColor: '#ea580c', boxShadow: '0 4px 10px rgba(234, 88, 12, 0.3)' },
  searchBox: {
    padding: '9px 18px',
    borderRadius: '20px',
    border: '1px solid #fdba74',
    fontSize: '13px',
    outline: 'none',
    width: '240px',
    background: '#fff'
  },

  tableCard: { background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(234, 88, 12, 0.05)', border: '1px solid #ffedd5' },
  tableHeader: { background: '#fff7ed', borderBottom: '2px solid #fed7aa', textAlign: 'left' },
  th: { padding: '14px 16px', fontSize: '12px', fontWeight: '800', color: '#c2410c' },
  td: { padding: '14px 16px', borderBottom: '1px solid #fff7ed' },
  trHover: { transition: 'background 0.2s' },

  badgeHadir: {
    background: '#dcfce7',
    color: '#15803d',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  badgeLain: {
    background: '#ffedd5',
    color: '#c2410c',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800'
  },
  badgeKelas: { background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' },
  dotPulse: { width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'pulseDot 1.5s infinite' }
};
