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

  // Edit Status State Modal
  const [editingSiswa, setEditingSiswa] = useState(null);

  // 1. EFEK SPLASH SCREEN PAS 5 DETIK (5000 ms)
  useEffect(() => {
    const totalDuration = 5000;
    const intervalTime = 100;
    const step = 100 / (totalDuration / intervalTime);

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

  // 2. SUBMIT LOGIN
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

  // 3. FUNGSI EDIT STATUS PERSIS DENGAN TOMBOL PILIHAN BARU
  const handleUpdateStatus = async (rfidUid, newStatus) => {
    const { error } = await supabase
      .from('absensi')
      .upsert({ rfid_uid: rfidUid, status: newStatus, updated_at: new Date() });

    if (!error) {
      setEditingSiswa(null);
      fetchInitialData();
    } else {
      alert('Gagal memperbarui status');
    }
  };

  // HITUNG STATISTIK
  const totalSiswa = siswaList.length || 0;
  const totalHadir = absensiLogs.filter((l) => l.status && l.status.includes('Hadir')).length;
  const persentaseHadir = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;

  // FILTER DAN PENGURUTAN ALFABETIS A - Z
  const filteredSiswa = siswaList
    .filter((s) => {
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
    })
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || '')); // PENGURUTAN A-Z PAS

  // ===============================================================
  // A. TAMPILAN SPLASH SCREEN
  // ===============================================================
  if (loading) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.overlay}>
          <div style={{ ...styles.splashCard, position: 'relative' }}>
            {/* BADGE SYSTEM ONLINE DI ATAS KANAN */}
            <div style={styles.systemOnlineBadge}>
              <span style={styles.greenDot}>●</span> SYSTEM ONLINE
            </div>

            <img
              src="/logo.png"
              onError={(e) => {
                e.target.src =
                  'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
              }}
              alt="Logo SMK YPK Medan"
              style={{ width: '90px', margin: '15px auto 15px auto', display: 'block' }}
            />
            <span style={styles.orangeBadge}>SERVER ABSENSI DIGITAL</span>
            <h2 style={{ color: '#4a2c11', margin: '10px 0 5px 0', fontSize: '22px', fontWeight: 'bold' }}>
              SMK YPK MEDAN
            </h2>
            <p style={{ color: '#666', fontSize: '12px', margin: '0 0 20px 0' }}>
              Menghubungkan Server Presensi RFID Real-Time...
            </p>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${Math.round(progress)}%` }}></div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '10px', fontWeight: 'bold' }}>
              Proses Inisialisasi {Math.round(progress)}%
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===============================================================
  // B. TAMPILAN PORTAL LOGIN (TANPA AKSES CEPAT GURU)
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
          </div>
        </div>
      </div>
    );
  }

  // ===============================================================
  // C. TAMPILAN DASHBOARD UTAMA
  // ===============================================================
  return (
    <div style={styles.dashboardBg}>
      {/* NAVBAR DENGAN LOGO */}
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
        {/* CARDS STATISTIK */}
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

        {/* REKAP KELAS */}
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

        {/* FILTER BAR */}
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
            placeholder="🔍 Cari nama siswa (Terurut A-Z) atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchBar}
          />
        </div>

        {/* TABEL SISWA (TERURUT ALFABETIS A-Z) */}
        <div style={styles.cardBox}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ffe0b2' }}>
                <th style={styles.thCol}>STATUS PRESENSI</th>
                <th style={styles.thCol}>WAKTU TAP (HARIAN)</th>
                <th style={styles.thCol}>NAMA SISWA (A-Z)</th>
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
                  const status = log?.status || 'Alpha';

                  return (
                    <tr key={siswa.id} style={{ borderBottom: '1px solid #fff3e0' }}>
                      <td style={styles.tdCol}>
                        {status === 'Hadir' || status === 'Hadir (Tanpa Kartu)' ? (
                          <span style={styles.badgeHadir}>🟢 {status}</span>
                        ) : status === 'Telat' ? (
                          <span style={styles.badgeTelat}>⏰ TELAT</span>
                        ) : status === 'Sakit' ? (
                          <span style={styles.badgeSakit}>🟡 SAKIT</span>
                        ) : status === 'Izin' ? (
                          <span style={styles.badgeIzin}>🔵 IZIN</span>
                        ) : (
                          <span style={styles.badgeAlpha}>🔴 BELUM TAP / ALPHA</span>
                        )}
                      </td>
                      <td style={{ ...styles.tdCol, color: '#777' }}>
                        {log ? new Date(log.created_at).toLocaleString('id-ID') : 'Belum Melakukan Tap'}
                      </td>
                      <td style={{ ...styles.tdCol, fontWeight: 'bold' }}>{siswa.nama}</td>
                      <td style={styles.tdCol}>
                        <span style={styles.badgeClass}>{siswa.kelas || 'X TJKT'}</span>
                      </td>
                      <td style={{ ...styles.tdCol, color: '#1565c0', fontFamily: 'monospace' }}>
                        {siswa.rfid_uid || 'UID_CARDS'}
                      </td>
                      <td style={styles.tdCol}>
                        <button
                          onClick={() => setEditingSiswa(siswa)}
                          style={styles.btnEditOutline}
                        >
                          ✏️ Edit Status
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

      {/* POPUP MODAL PILIHAN STATUS BARU DENGAN DESIGN SANGAT MENARIK */}
      {editingSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ margin: '0 0 5px 0', color: '#e65100', fontSize: '18px' }}>
              Ubah Status Presensi
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#555' }}>
              Siswa: <b>{editingSiswa.nama}</b> ({editingSiswa.kelas})
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              <button
                onClick={() => handleUpdateStatus(editingSiswa.rfid_uid, 'Hadir (Tanpa Kartu)')}
                style={styles.btnStatusHadir}
              >
                🟢 HADIR (TANPA KARTU)
              </button>

              <button
                onClick={() => handleUpdateStatus(editingSiswa.rfid_uid, 'Telat')}
                style={styles.btnStatusTelat}
              >
                ⏰ TELAT
              </button>

              <button
                onClick={() => handleUpdateStatus(editingSiswa.rfid_uid, 'Sakit')}
                style={styles.btnStatusSakit}
              >
                🟡 SAKIT
              </button>

              <button
                onClick={() => handleUpdateStatus(editingSiswa.rfid_uid, 'Izin')}
                style={styles.btnStatusIzin}
              >
                🔵 IZIN
              </button>

              <button
                onClick={() => handleUpdateStatus(editingSiswa.rfid_uid, 'Alpha')}
                style={styles.btnStatusAlpha}
              >
                🔴 ALPHA
              </button>
            </div>

            <button
              onClick={() => setEditingSiswa(null)}
              style={styles.btnCancelModal}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// STYLING LENGKAP & PRESISI
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
  systemOnlineBadge: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '1px solid #a5d6a7'
  },
  greenDot: { color: '#2ecc71', fontSize: '10px' },
  orangeBadge: { backgroundColor: '#fff3e0', color: '#e65100', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px' },
  progressTrack: { backgroundColor: '#ffe0b2', height: '9px', borderRadius: '5px', overflow: 'hidden', marginTop: '15px' },
  progressBar: { backgroundColor: '#e65100', height: '100%', transition: 'width 0.1s linear' },
  fieldLabel: { fontSize: '12px', fontWeight: 'bold', color: '#e65100', display: 'block', marginBottom: '5px' },
  inputStyle: { width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #ffe0b2', outline: 'none', boxSizing: 'border-box' },
  btnOrange: { width: '100%', padding: '14px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
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
  
  badgeAlpha: { backgroundColor: '#ffebee', color: '#c62828', padding: '5px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ffcdd2' },
  badgeHadir: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '5px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #a5d6a7' },
  badgeTelat: { backgroundColor: '#fff8e1', color: '#f57f17', padding: '5px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ffe082' },
  badgeSakit: { backgroundColor: '#fffde7', color: '#fbc02d', padding: '5px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fff59d' },
  badgeIzin: { backgroundColor: '#e3f2fd', color: '#1565c0', padding: '5px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #90caf9' },
  
  badgeClass: { border: '1px solid #ffe0b2', backgroundColor: '#fffdfa', color: '#e65100', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' },
  btnEditOutline: { border: '1px solid #ffe0b2', backgroundColor: '#fff3e0', color: '#e65100', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },

  // MODAL STYLES
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
    zIndex: 999
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '16px',
    width: '320px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    textAlign: 'center'
  },
  btnStatusHadir: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' },
  btnStatusTelat: { backgroundColor: '#f39c12', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' },
  btnStatusSakit: { backgroundColor: '#f1c40f', color: '#333', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' },
  btnStatusIzin: { backgroundColor: '#3498db', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' },
  btnStatusAlpha: { backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left' },
  btnCancelModal: { marginTop: '15px', backgroundColor: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }
};
