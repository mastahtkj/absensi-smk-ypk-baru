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
  const [userRole, setUserRole] = useState(null); // 'guru', 'kepsek', 'it'
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [dataAbsensi, setDataAbsensi] = useState([]);
  const [activeJurusan, setActiveJurusan] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Splashscreen / Startup Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingSplash(false);
    }, 2800);
    return () => clearTimeout(timer);
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
      const interval = setInterval(ambilData, 2000); // Live refresh tiap 2 detik
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

  // Switch Quick Login dari Card
  const quickLogin = (roleKey) => {
    setUsernameInput(roleKey);
    setPasswordInput(DEMO_USERS[roleKey].password);
  };

  // Filter Data berdasarkan Jurusan & Search Box
  const filteredData = dataAbsensi.filter((item) => {
    const matchJurusan =
      activeJurusan === 'SEMUA' || (item.kelas && item.kelas.toUpperCase().includes(activeJurusan));
    const matchSearch =
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    return matchJurusan && matchSearch;
  });

  // ==========================================
  // TAMPILAN 1: STARTUP LOADING SPLASH SCREEN
  // ==========================================
  if (loadingSplash) {
    return (
      <div style={styles.splashContainer}>
        <div style={styles.splashCard}>
          <div style={styles.spinner}></div>
          <h1 style={styles.splashTitle}>SERVER ABSENSI DIGITAL</h1>
          <h2 style={styles.splashSubTitle}>SMK YPK MEDAN</h2>
          <p style={styles.splashDesc}>Memuat Sistem & Menghubungkan Server Real-time...</p>
          <div style={styles.badgeSuccess}>● SYSTEM ONLINE</div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TAMPILAN 2: FORM LOGIN MULTI-ROLE
  // ==========================================
  if (!userRole) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '40px' }}>🏫</span>
            <h2 style={{ color: '#0f172a', margin: '10px 0 5px 0', fontSize: '22px' }}>
              LOGIN DASHBOARD ABSENSI
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
              Silakan pilih/masukkan akun untuk mengakses portal SMK YPK MEDAN
            </p>
          </div>

          {loginError && <div style={styles.errorBanner}>{loginError}</div>}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={styles.label}>Pilih / Ketik Username Akun:</label>
              <input
                type="text"
                placeholder="guru / kepsek / it"
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

          {/* Quick Account Selector */}
          <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginBottom: '10px' }}>
              Opsi Akses Cepat (Klik untuk isi otomatis):
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button onClick={() => quickLogin('guru')} style={styles.btnQuick}>
                👨‍🏫 GURU
              </button>
              <button onClick={() => quickLogin('kepsek')} style={styles.btnQuick}>
                👔 KEPSEK
              </button>
              <button onClick={() => quickLogin('it')} style={styles.btnQuick}>
                💻 TIM IT
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TAMPILAN 3: MAIN DASHBOARD KEKINIAN
  // ==========================================
  const currentUser = DEMO_USERS[userRole];

  return (
    <div style={styles.dashboardContainer}>
      {/* HEADER BAR */}
      <header style={styles.headerBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.logoBox}>YPK</div>
          <div>
            <h1 style={styles.headerTitle}>DASHBOARD ABSENSI REAL-TIME</h1>
            <p style={styles.headerSub}>SMK YPK MEDAN • Integrated IoT RFID Server</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>{currentUser.name}</div>
            <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>{currentUser.role}</div>
          </div>
          <button onClick={() => setUserRole(null)} style={styles.btnLogout}>
            Keluar 🚪
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '25px auto', padding: '0 15px' }}>
        {/* METRICS STATS CARDS */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ fontSize: '24px' }}>📊</div>
            <div>
              <div style={styles.statNumber}>{dataAbsensi.length}</div>
              <div style={styles.statLabel}>Total Siswa Tap Hari Ini</div>
            </div>
          </div>

          <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '24px' }}>✅</div>
            <div>
              <div style={{ ...styles.statNumber, color: '#10b981' }}>
                {dataAbsensi.filter((d) => d.status && d.status.includes('TEPAT')).length}
              </div>
              <div style={styles.statLabel}>Hadir Tepat Waktu</div>
            </div>
          </div>

          <div style={{ ...styles.statCard, borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '24px' }}>🌧️</div>
            <div>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>
                {dataAbsensi.filter((d) => d.status && d.status.includes('HUJAN')).length}
              </div>
              <div style={styles.statLabel}>Dispensasi Cuaca/Hujan</div>
            </div>
          </div>
        </div>

        {/* TAB PILIHAN JURUSAN & SEARCH BOX */}
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

        {/* TABEL DATA SISWA REALTIME */}
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
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Belum ada data tap siswa untuk jurusan/kategori ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const isHadir = item.status && item.status.includes('TEPAT');
                  return (
                    <tr key={index} style={styles.trHover}>
                      {/* INDIKATOR TANDA WARNA HIJAU */}
                      <td style={styles.td}>
                        {isHadir ? (
                          <span style={styles.badgeHadir}>
                            <span style={styles.dotPulse}></span> HADIR
                          </span>
                        ) : (
                          <span style={styles.badgeLain}>{item.status}</span>
                        )}
                      </td>

                      <td style={{ ...styles.td, color: '#475569', fontWeight: '500' }}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleTimeString('id-ID', {
                              timeZone: 'Asia/Jakarta',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            }) + ' WIB'
                          : '-'}
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

                      <td style={{ ...styles.td, color: isHadir ? '#10b981' : '#f59e0b', fontWeight: '600' }}>
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
  );
}

// ==========================================
// STYLE MODERN / KEKINIAN (CSS-IN-JS)
// ==========================================
const styles = {
  // Splash Styles
  splashContainer: {
    height: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, sans-serif'
  },
  splashCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '40px',
    borderRadius: '20px',
    textAlign: 'center',
    color: '#fff',
    maxWidth: '400px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    margin: '0 auto 20px auto',
    animation: 'spin 1s linear infinite'
  },
  splashTitle: { fontSize: '18px', letterSpacing: '2px', color: '#3b82f6', margin: '0 0 5px 0' },
  splashSubTitle: { fontSize: '24px', fontWeight: '800', margin: '0 0 15px 0' },
  splashDesc: { fontSize: '13px', color: '#94a3b8', marginBottom: '20px' },
  badgeSuccess: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    fontSize: '12px',
    padding: '6px 16px',
    borderRadius: '20px',
    display: 'inline-block',
    fontWeight: 'bold'
  },

  // Login Styles
  loginBg: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, sans-serif'
  },
  loginCard: {
    background: '#fff',
    padding: '35px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid #e2e8f0'
  },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  btnPrimary: {
    width: '100%',
    padding: '12px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnQuick: {
    padding: '8px',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#334155'
  },
  errorBanner: {
    background: '#fef2f2',
    color: '#ef4444',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '15px',
    textAlign: 'center'
  },

  // Dashboard Styles
  dashboardContainer: { minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' },
  headerBar: {
    background: '#fff',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  logoBox: {
    background: '#2563eb',
    color: '#fff',
    fontWeight: '900',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '16px'
  },
  headerTitle: { fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f172a' },
  headerSub: { fontSize: '12px', color: '#64748b', margin: 0 },
  btnLogout: {
    background: '#fef2f2',
    color: '#ef4444',
    border: '1px solid #fca5a5',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px'
  },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' },
  statCard: {
    background: '#fff',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    borderLeft: '4px solid #2563eb'
  },
  statNumber: { fontSize: '24px', fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: '12px', color: '#64748b', fontWeight: '500' },

  filterSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' },
  tabContainer: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' },
  tabBtn: {
    padding: '8px 14px',
    borderRadius: '20px',
    background: '#fff',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  tabBtnActive: { background: '#2563eb', color: '#fff', borderColor: '#2563eb' },
  searchBox: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    width: '240px'
  },

  tableCard: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  tableHeader: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' },
  th: { padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569' },
  td: { padding: '14px 16px', borderBottom: '1px solid #f1f5f9' },
  trHover: { transition: 'background 0.2s' },

  // Badges
  badgeHadir: {
    background: '#dcfce7',
    color: '#166534',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '800',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  badgeLain: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '800'
  },
  badgeKelas: { background: '#f1f5f9', color: '#334155', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  dotPulse: { width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }
};
