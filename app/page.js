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
  const [loginError, setLoginError] = useState('');

  const [dataAbsensi, setDataAbsensi] = useState([]);
  const [activeJurusan, setActiveJurusan] = useState('SEMUA');
  const [activeTingkat, setActiveTingkat] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State untuk Edit Data (IT & Guru/Kepsek)
  const [editingItem, setEditingItem] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // 1. Splashscreen Progress Bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setLoadingSplash(false), 300);
          return 100;
        }
        return prev + 3;
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

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditingItem(item);
    setEditNama(item.nama);
    setEditKelas(item.kelas);
    setEditStatus(item.status);
  };

  // Simpan Perubahan ke Supabase
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const payload = { status: editStatus };
    // Jika Role IT, perbolehkan edit Nama dan Kelas
    if (userRole === 'it') {
      payload.nama = editNama;
      payload.kelas = editKelas;
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

  // --- STATISTIK & WARNING SYSTEM ---
  const hitungStatJurusan = (kodeJurusan) => {
    return dataAbsensi.filter(
      (item) => item.kelas && item.kelas.toUpperCase().includes(kodeJurusan)
    ).length;
  };

  const hitungStatTingkat = (tingkat) => {
    return dataAbsensi.filter((item) => {
      if (!item.kelas) return false;
      const k = item.kelas.toUpperCase().trim();
      if (tingkat === 'X') return k.startsWith('X ') || k.startsWith('X-') || k === 'X';
      if (tingkat === 'XI') return k.startsWith('XI ') || k.startsWith('XI-') || k === 'XI';
      if (tingkat === 'XII') return k.startsWith('XII ') || k.startsWith('XII-') || k === 'XII';
      return false;
    }).length;
  };

  // Deteksi Jurusan dengan Kehadiran di Bawah 50%
  const totalSiswaTapped = dataAbsensi.length;
  const listWarningJurusan = JURUSAN_LIST.filter((j) => {
    if (j.id === 'SEMUA') return false;
    const totalJurusan = hitungStatJurusan(j.id);
    if (totalJurusan === 0) return false;
    
    const hadirJurusan = dataAbsensi.filter(
      (item) =>
        item.kelas &&
        item.kelas.toUpperCase().includes(j.id) &&
        item.status &&
        item.status.toUpperCase().includes('TEPAT')
    ).length;

    const persen = (hadirJurusan / totalJurusan) * 100;
    return persen < 50;
  });

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

  const totalTepatWaktu = dataAbsensi.filter(
    (d) => d.status && d.status.toUpperCase().includes('TEPAT')
  ).length;
  const persenHadir = totalSiswaTapped > 0 ? Math.round((totalTepatWaktu / totalSiswaTapped) * 100) : 0;

  return (
    <>
      <style jsx global>{`
        @keyframes pulseLogo {
          0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.6)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 25px rgba(249, 115, 22, 0.9)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.6)); }
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
          background-color: #0f172a;
          color: #f8fafc;
        }
      `}</style>

      {/* ========================================== */}
      {/* TAMPILAN 1: SPLASH SCREEN GLASSFUTURISTIC  */}
      {/* ========================================== */}
      {loadingSplash ? (
        <div style={styles.heroBackground}>
          <div style={styles.glassCardSplash}>
            <div style={styles.logoBadgeContainer}>
              <img
                src="/logo.png"
                alt="Logo SMK YPK"
                style={styles.logoClean}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <span style={styles.badgeTag}>IOT ATTENDANCE SYSTEM</span>
            <h1 style={styles.splashTitle}>SMK YPK MEDAN</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '25px' }}>
              Memuat Data Presensi RFID Siswa Real-Time...
            </p>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }}></div>
            </div>

            <div style={styles.splashStatus}>
              <span>Mengisi Cache {progress}%</span>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>● SERVER READY</span>
            </div>
          </div>
        </div>
      ) : !userRole ? (
        /* ========================================== */
        /* TAMPILAN 2: LOGIN MODERN GLASSMORPHISM     */
        /* ========================================== */
        <div style={styles.heroBackground}>
          <div style={styles.glassCardLogin}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ ...styles.logoBadgeContainer, margin: '0 auto 12px auto' }}>
                <img
                  src="/logo.png"
                  alt="Logo SMK YPK"
                  style={styles.logoClean}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <h2 style={{ color: '#f97316', margin: '5px 0', fontSize: '24px', fontWeight: '900', letterSpacing: '0.5px' }}>
                PORTAL ABSENSI
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0 }}>
                Sistem Presensi RFID SMK YPK MEDAN
              </p>
            </div>

            {loginError && <div style={styles.errorBanner}>{loginError}</div>}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '15px' }}>
                <label style={styles.label}>Username / Peran:</label>
                <input
                  type="text"
                  placeholder="Ketik: guru / kepsek / it"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={styles.inputGlass}
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
                  style={styles.inputGlass}
                  required
                />
              </div>

              <button type="submit" style={styles.btnGradient}>
                MASUK KE DASHBOARD →
              </button>
            </form>

            <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginBottom: '10px' }}>
                Akses Cepat Mode Demo:
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
        /* TAMPILAN 3: MAIN DASHBOARD                 */
        /* ========================================== */
        <div style={styles.dashboardWrapper}>
          {/* HEADER DASHBOARD */}
          <header style={styles.headerGlass}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ ...styles.logoBadgeContainer, width: '45px', height: '45px', padding: '4px' }}>
                <img
                  src="/logo.png"
                  alt="Logo SMK YPK"
                  style={styles.logoClean}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: '#f97316' }}>
                  DASHBOARD MONITORED PRESENSI
                </h1>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                  SMK YPK MEDAN • Realtime RFID Hardware Live System
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#f8fafc' }}>
                  {DEMO_USERS[userRole].name}
                </div>
                <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>
                  {DEMO_USERS[userRole].role}
                </div>
              </div>
              <button onClick={() => setUserRole(null)} style={styles.btnLogout}>
                Keluar 🚪
              </button>
            </div>
          </header>

          <main style={{ maxWidth: '1280px', margin: '25px auto', padding: '0 20px' }}>
            
            {/* ALERT BANNER JIKA KEHADIRAN JURUSAN < 50% */}
            {listWarningJurusan.length > 0 && (
              <div style={styles.alertBanner}>
                <div style={{ fontSize: '24px' }}>⚠️</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>
                    PERINGATAN TINGKAT KEHADIRAN KRITIS (&lt; 50%)
                  </h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#fecaca' }}>
                    Jurusan berikut memiliki persentase kehadiran di bawah 50%: {' '}
                    <strong>{listWarningJurusan.map((j) => j.label).join(', ')}</strong>.
                    Mohon perhatian untuk Bapak/Ibu Guru, Kepala Sekolah, dan Tim IT.
                  </p>
                </div>
              </div>
            )}

            {/* STATS CARDS UTAMA */}
            <div style={styles.statsGrid}>
              <div style={styles.cardGlassStat}>
                <div style={{ fontSize: '32px' }}>🎴</div>
                <div>
                  <div style={styles.statNumber}>{totalSiswaTapped}</div>
                  <div style={styles.statLabel}>Total Siswa Tap RFID Hari Ini</div>
                </div>
              </div>

              <div style={{ ...styles.cardGlassStat, borderLeft: '4px solid #22c55e' }}>
                <div style={{ fontSize: '32px' }}>✅</div>
                <div>
                  <div style={{ ...styles.statNumber, color: '#4ade80' }}>{totalTepatWaktu}</div>
                  <div style={styles.statLabel}>Hadir Tepat Waktu</div>
                </div>
              </div>

              <div style={{ ...styles.cardGlassStat, borderLeft: '4px solid #38bdf8' }}>
                <div style={{ fontSize: '32px' }}>📈</div>
                <div>
                  <div style={{ ...styles.statNumber, color: '#38bdf8' }}>{persenHadir}%</div>
                  <div style={styles.statLabel}>Persentase Kehadiran Total</div>
                </div>
              </div>
            </div>

            {/* SEKSI STATISTIK PER JURUSAN & TINGKAT */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '25px' }}>
              
              {/* STATISTIK PER JURUSAN */}
              <div style={styles.cardGlassSection}>
                <h3 style={styles.sectionTitle}>📊 STATISTIK KEHADIRAN PER JURUSAN</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { code: 'TJKT', name: 'TJKT (Teknik Jaringan)', color: '#38bdf8' },
                    { code: 'AKL', name: 'AKL (Akuntansi)', color: '#4ade80' },
                    { code: 'MPLB', name: 'MPLB (Perkantoran)', color: '#facc15' },
                    { code: 'PM', name: 'PM (Pemasaran)', color: '#f97316' },
                    { code: 'BM', name: 'BM (Bisnis Manajemen)', color: '#a855f7' }
                  ].map((j) => {
                    const count = hitungStatJurusan(j.code);
                    const percent = totalSiswaTapped > 0 ? Math.round((count / totalSiswaTapped) * 100) : 0;
                    return (
                      <div key={j.code}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{j.name}</span>
                          <span style={{ color: percent < 50 && count > 0 ? '#ef4444' : j.color, fontWeight: 'bold' }}>
                            {count} Siswa ({percent}%) {percent < 50 && count > 0 ? '⚠️' : ''}
                          </span>
                        </div>
                        <div style={styles.trackBar}>
                          <div style={{ ...styles.fillBar, width: `${percent}%`, backgroundColor: percent < 50 && count > 0 ? '#ef4444' : j.color }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STATISTIK PER TINGKAT KELAS */}
              <div style={styles.cardGlassSection}>
                <h3 style={styles.sectionTitle}>🏫 REKAP KEHADIRAN PER TINGKAT</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '15px' }}>
                  {[
                    { id: 'X', label: 'KELAS X', color: '#f97316' },
                    { id: 'XI', label: 'KELAS XI', color: '#38bdf8' },
                    { id: 'XII', label: 'KELAS XII', color: '#4ade80' }
                  ].map((t) => {
                    const count = hitungStatTingkat(t.id);
                    return (
                      <div key={t.id} style={{ ...styles.boxTingkat, borderColor: t.color }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>{t.label}</div>
                        <div style={{ fontSize: '28px', fontWeight: '900', color: t.color, margin: '5px 0' }}>{count}</div>
                        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Siswa Hadir</div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* FILTER AREA */}
            <div style={styles.cardGlassSection}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#f97316', width: '90px' }}>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#f97316', width: '90px' }}>
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

              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <input
                  type="text"
                  placeholder="🔍 Cari nama siswa atau kelas spesifik..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchBoxGlass}
                />
              </div>
            </div>

            {/* TABEL DATA HASIL FILTER */}
            <div style={styles.cardGlassTable}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>STATUS</th>
                    <th style={styles.th}>WAKTU TAP</th>
                    <th style={styles.th}>NAMA SISWA</th>
                    <th style={styles.th}>KELAS / JURUSAN</th>
                    <th style={styles.th}>RFID UID</th>
                    <th style={styles.th}>AKSI PERUBAHAN</th>
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

                          <td style={{ ...styles.td, color: '#38bdf8', fontWeight: 'bold' }}>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleTimeString('id-ID', {
                                  timeZone: 'Asia/Jakarta',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                }) + ' WIB'
                              : '-'}
                          </td>

                          <td style={{ ...styles.td, fontWeight: 'bold', color: '#f8fafc' }}>
                            {item.nama}
                          </td>

                          <td style={styles.td}>
                            <span style={styles.badgeKelas}>{item.kelas}</span>
                          </td>

                          <td style={{ ...styles.td, fontFamily: 'monospace', color: '#cbd5e1' }}>
                            {item.rfid_uid || '-'}
                          </td>

                          <td style={styles.td}>
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

          {/* MODAL POPUP EDIT DATA */}
          {editingItem && (
            <div style={styles.modalOverlay}>
              <div style={styles.modalBox}>
                <h3 style={{ margin: '0 0 15px 0', color: '#f97316', fontSize: '18px' }}>
                  ✏️ Edit Presensi Siswa
                </h3>

                {/* Edit Nama & Kelas (KHUSUS IT) */}
                {userRole === 'it' ? (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={styles.labelModal}>Nama Siswa (Akses IT):</label>
                      <input
                        type="text"
                        value={editNama}
                        onChange={(e) => setEditNama(e.target.value)}
                        style={styles.inputGlass}
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={styles.labelModal}>Kelas / Jurusan (Akses IT):</label>
                      <input
                        type="text"
                        value={editKelas}
                        onChange={(e) => setEditKelas(e.target.value)}
                        style={styles.inputGlass}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: '15px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{editingItem.nama}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Kelas: {editingItem.kelas}</div>
                  </div>
                )}

                {/* Edit Status PRESENSI (BISA UNTUK GURU, KEPSEK, IT) */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={styles.labelModal}>Ubah Status Presensi:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={styles.selectGlass}
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

        </div>
      )}
    </>
  );
}

// ==========================================
// STYLESHEET HIGH CONTRAST & LOGO EMBED
// ==========================================
const bgGedungOverlay = "linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(30, 41, 59, 0.82) 100%), url('/gedung.png') center/cover no-repeat fixed";

const styles = {
  heroBackground: {
    height: '100vh',
    background: bgGedungOverlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box'
  },
  glassCardSplash: {
    background: 'rgba(30, 41, 59, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '40px 30px',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%'
  },
  
  // CONTAINER UNTUK LOGO AGAR BERSIH & TIDAK GELAP
  logoBadgeContainer: {
    width: '80px',
    height: '80px',
    background: '#ffffff',
    borderRadius: '50%',
    padding: '8px',
    boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px auto',
    animation: 'pulseLogo 2.5s infinite ease-in-out'
  },
  logoClean: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },

  badgeTag: {
    background: 'rgba(249, 115, 22, 0.2)',
    color: '#f97316',
    border: '1px solid rgba(249, 115, 22, 0.4)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '1px'
  },
  splashTitle: {
    fontSize: '24px',
    fontWeight: '900',
    color: '#ffffff',
    margin: '15px 0 5px 0'
  },
  progressTrack: {
    height: '8px',
    width: '100%',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '15px'
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #f97316 0%, #eab308 100%)',
    borderRadius: '10px',
    transition: 'width 0.05s linear'
  },
  splashStatus: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#94a3b8'
  },

  glassCardLogin: {
    background: 'rgba(30, 41, 59, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '35px',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    width: '100%',
    maxWidth: '420px'
  },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#e2e8f0', marginBottom: '6px' },
  inputGlass: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(15, 23, 42, 0.8)',
    color: '#ffffff',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  btnGradient: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(90deg, #ea580c 0%, #f97316 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 10px 20px -5px rgba(234, 88, 12, 0.5)'
  },
  btnQuick: {
    padding: '10px 5px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    color: '#f8fafc'
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    padding: '10px',
    borderRadius: '10px',
    fontSize: '12px',
    marginBottom: '15px',
    textAlign: 'center'
  },

  dashboardWrapper: { minHeight: '100vh', background: bgGedungOverlay },
  headerGlass: {
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(12px)',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  btnLogout: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    padding: '8px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px'
  },

  alertBanner: {
    background: 'rgba(239, 68, 68, 0.25)',
    border: '2px solid #ef4444',
    borderRadius: '16px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px',
    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)'
  },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' },
  cardGlassStat: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '20px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    borderLeft: '4px solid #f97316'
  },
  statNumber: { fontSize: '28px', fontWeight: '900', color: '#ffffff' },
  statLabel: { fontSize: '12px', color: '#94a3b8', fontWeight: '600' },

  cardGlassSection: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '20px',
    borderRadius: '18px',
    marginBottom: '20px'
  },
  sectionTitle: { fontSize: '14px', fontWeight: '800', color: '#f97316', margin: '0 0 15px 0' },
  trackBar: { height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', overflow: 'hidden' },
  fillBar: { height: '100%', borderRadius: '10px', transition: 'width 0.4s ease' },

  boxTingkat: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '2px solid #38bdf8',
    borderRadius: '14px',
    padding: '15px',
    textAlign: 'center'
  },

  filterPill: {
    padding: '8px 16px',
    borderRadius: '20px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    fontSize: '12px',
    fontWeight: '700',
    color: '#cbd5e1',
    cursor: 'pointer'
  },
  filterPillActive: { background: '#f97316', color: '#ffffff', borderColor: '#f97316', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)' },

  searchBoxGlass: {
    padding: '10px 18px',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    maxWidth: '350px',
    background: 'rgba(15, 23, 42, 0.8)',
    color: '#ffffff'
  },

  cardGlassTable: {
    background: 'rgba(30, 41, 59, 0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: '18px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  tableHeader: { background: 'rgba(15, 23, 42, 0.95)', textAlign: 'left' },
  th: { padding: '16px', fontSize: '12px', fontWeight: '800', color: '#f97316' },
  td: { padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' },
  trHover: { transition: 'background 0.2s' },

  btnEditData: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'rgba(249, 115, 22, 0.2)',
    border: '1px solid #f97316',
    color: '#fb923c',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  badgeHadir: {
    background: 'rgba(34, 197, 94, 0.2)',
    color: '#4ade80',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  badgeDispensasi: {
    background: 'rgba(249, 115, 22, 0.2)',
    color: '#fb923c',
    border: '1px solid rgba(249, 115, 22, 0.4)',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800'
  },
  badgeKelas: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#f8fafc',
    border: '1px solid rgba(255, 255, 255, 0.15)',
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
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  modalBox: {
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '25px',
    width: '90%',
    maxWidth: '420px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
  },
  labelModal: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '6px' },
  selectGlass: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    background: '#0f172a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    outline: 'none',
    fontSize: '13px'
  },
  btnCancel: {
    padding: '8px 16px',
    borderRadius: '8px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '12px'
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
