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

  // Modal State Edit Data & Status
  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // DATA DAFTAR JURUSAN & TINGKAT BESERTA IKON
  const tingkatOptions = [
    { label: 'Semua Tingkat', icon: '🎓' },
    { label: 'Kelas X', icon: '🎒' },
    { label: 'Kelas XI', icon: '📚' },
    { label: 'Kelas XII', icon: '🏆' },
  ];

  const jurusanOptions = [
    { label: 'Semua Jurusan', icon: '🏫' },
    { label: 'Teknik Jaringan Komputer dan Telekomunikasi', icon: '💻' },
    { label: 'Akuntansi dan Keuangan Lembaga', icon: '📊' },
    { label: 'Manajemen Perkantoran dan Layanan Bisnis', icon: '💼' },
    { label: 'Pemasaran', icon: '📢' },
    { label: 'Bisnis dan Manajemen', icon: '📈' },
  ];

  // 1. INITIAL LOAD & REALTIME SUBSCRIPTION
  useEffect(() => {
    const totalDuration = 4000;
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
          role: (guru.role || 'guru').toLowerCase()
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

  // 3. FUNGSI EDIT MODAL
  const handleOpenEditModal = (siswa) => {
    const validUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || '';
    setEditingSiswa(siswa);
    setEditNama(siswa.nama || '');
    setEditKelas(siswa.kelas || '');
    setEditRfid(validUid);
  };

  // 4. FUNGSI UPDATE STATUS PRESENSI
  const handleUpdateStatus = async (newStatus) => {
    if (!editingSiswa) return;
    setIsUpdating(true);
    const validUid = editRfid || editingSiswa.rfid_uid || `UID-${editingSiswa.id}`;

    try {
      const { data: existing } = await supabase
        .from('absensi')
        .select('id')
        .eq('rfid_uid', validUid)
        .limit(1);

      let error = null;

      if (existing && existing.length > 0) {
        const res = await supabase
          .from('absensi')
          .update({ 
            status: newStatus, 
            nama: editNama || editingSiswa.nama,
            kelas: editKelas || editingSiswa.kelas
          })
          .eq('rfid_uid', validUid);
        error = res.error;
      } else {
        const res = await supabase
          .from('absensi')
          .insert({
            rfid_uid: validUid,
            nama: editNama || editingSiswa.nama,
            kelas: editKelas || editingSiswa.kelas,
            status: newStatus
          });
        error = res.error;
      }

      if (!error) {
        setEditingSiswa(null);
        await fetchInitialData();
      } else {
        alert('Gagal memperbarui status: ' + error.message);
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi database.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 5. FUNGSI SIMPAN BIODATA SISWA (KHUSUS ADMIN)
  const handleSaveBiodataAdmin = async () => {
    if (currentUser?.role !== 'admin') {
      alert('Hanya Administrator yang diperbolehkan mengubah Biodata Siswa.');
      return;
    }

    setIsUpdating(true);
    try {
      const { error: cardError } = await supabase
        .from('rfid_cards')
        .update({
          nama: editNama,
          kelas: editKelas,
          rfid_uid: editRfid
        })
        .eq('id', editingSiswa.id);

      if (cardError) {
        alert('Gagal memperbarui master siswa: ' + cardError.message);
      } else {
        const oldUid = editingSiswa.rfid_uid || editingSiswa.uid;
        if (oldUid) {
          await supabase
            .from('absensi')
            .update({
              nama: editNama,
              kelas: editKelas,
              rfid_uid: editRfid
            })
            .eq('rfid_uid', oldUid);
        }

        alert('Data siswa berhasil diperbarui oleh Admin!');
        setEditingSiswa(null);
        await fetchInitialData();
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsUpdating(false);
    }
  };

  // HITUNG STATISTIK
  const totalSiswa = siswaList.length || 0;
  const totalHadir = absensiLogs.filter((l) => l.status && l.status.includes('Hadir')).length;
  const persentaseHadir = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;

  // FILTER LOGIC PINTAR (SINKRON NAMA PENUH & SINGKATAN)
  const filteredSiswa = siswaList
    .filter((s) => {
      const namaMatch = (s.nama || '').toLowerCase().includes(searchQuery.toLowerCase());
      const kelasMatch = (s.kelas || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchSearch = namaMatch || kelasMatch;

      let matchTingkat = true;
      if (filterTingkat === 'Kelas X') {
        matchTingkat = /^\s*X[\s\-]/i.test(s.kelas) || s.kelas === 'X';
      } else if (filterTingkat === 'Kelas XI') {
        matchTingkat = /^\s*XI[\s\-]/i.test(s.kelas) || s.kelas === 'XI';
      } else if (filterTingkat === 'Kelas XII') {
        matchTingkat = /^\s*XII[\s\-]/i.test(s.kelas) || s.kelas === 'XII';
      }

      let matchJurusan = true;
      if (filterJurusan !== 'Semua Jurusan') {
        const k = (s.kelas || '').toUpperCase();
        if (filterJurusan === 'Teknik Jaringan Komputer dan Telekomunikasi') {
          matchJurusan = k.includes('TJKT') || k.includes('TEKNIK JARINGAN') || k.includes('KOMPUTER');
        } else if (filterJurusan === 'Akuntansi dan Keuangan Lembaga') {
          matchJurusan = k.includes('AKL') || k.includes('AKUNTANSI');
        } else if (filterJurusan === 'Manajemen Perkantoran dan Layanan Bisnis') {
          matchJurusan = k.includes('MPLB') || k.includes('MANAJEMEN PERKANTORAN') || k.includes('PERKANTORAN');
        } else if (filterJurusan === 'Pemasaran') {
          matchJurusan = k.includes('PM') || k.includes('PEMASARAN');
        } else if (filterJurusan === 'Bisnis dan Manajemen') {
          matchJurusan = k.includes('BM') || k.includes('BISNIS');
        }
      }

      return matchSearch && matchTingkat && matchJurusan;
    })
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

  // EXPORT EXCEL (.CSV)
  const handleExportExcel = () => {
    if (filteredSiswa.length === 0) {
      alert('Tidak ada data siswa untuk di-export!');
      return;
    }

    let csvData = "\uFEFFNO,STATUS PRESENSI,WAKTU TAP,NAMA SISWA,KELAS / JURUSAN,RFID UID\n";

    filteredSiswa.forEach((siswa, index) => {
      const siswaUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || `UID-${siswa.id}`;
      const log = absensiLogs.find((l) => l.rfid_uid === siswaUid);
      const status = log?.status || 'Alpha';
      const waktu = log ? new Date(log.created_at).toLocaleString('id-ID').replace(/,/g, '') : 'Belum Tap';

      const row = [
        index + 1,
        `"${status}"`,
        `"${waktu}"`,
        `"${siswa.nama || ''}"`,
        `"${siswa.kelas || ''}"`,
        `"${siswaUid}"`
      ].join(",");

      csvData += row + "\n";
    });

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Absensi_SMK_YPK_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // GRAFIK TRAFIK
  const trafficHours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  const trafficData = trafficHours.map((hour) => {
    const h = parseInt(hour.split(':')[0]);
    return absensiLogs.filter((log) => {
      const logDate = new Date(log.created_at);
      return logDate.getHours() === h;
    }).length;
  });

  const maxTraffic = Math.max(...trafficData, 5);

  // SPLASH SCREEN
  if (loading) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.overlay}>
          <div style={{ ...styles.splashCard, position: 'relative' }}>
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
            <h2 style={{ color: '#333', margin: '10px 0 5px 0', fontSize: '22px', fontWeight: 'bold' }}>
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

            <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #ffe0b2', fontSize: '12px', color: '#e65100', fontWeight: 'bold', letterSpacing: '1px' }}>
              Dibuat Oleh : TJKT Projects
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOGIN PORTAL
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
                  Ingat Saya di Perangkat Ini
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

  // MAIN DASHBOARD
  return (
    <div style={styles.dashboardBg}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background-color: #ffffff !important; color: #000000 !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #333 !important; padding: 8px !important; font-size: 12px !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }

        .pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #ffe0b2;
          background-color: #ffffff;
          color: #d84315;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .pill-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(230,81,0,0.12);
          border-color: #ffb74d;
        }

        .pill-btn.active {
          background: linear-gradient(135deg, #e65100 0%, #f57c00 100%);
          color: #ffffff;
          border: none;
          box-shadow: 0 4px 12px rgba(230,81,0,0.25);
        }

        .stat-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #ffe0b2;
          box-shadow: 0 4px 15px rgba(230,81,0,0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(230,81,0,0.08);
        }
      `}</style>

      {/* HEADER PRINT PDF */}
      <div className="print-only" style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '3px double #000', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>SEKOLAH MENENGAH KEJURUAN YPK MEDAN</h2>
        <p style={{ margin: '2px 0', fontSize: '12px' }}>LAPORAN REKAPITULASI PRESENSI SISWA DIGITALLY REAL-TIME</p>
        <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>
          Dicetak Pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <header style={styles.headerNav} className="no-print">
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
            <span style={{ fontSize: '11px', color: '#e65100', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {currentUser?.role === 'admin' ? '🛡️ ADMINISTRATOR (AKSES PENUH)' : '👨‍🏫 GURU PENGAJAR (IZIN TERBATAS)'}
            </span>
          </div>
          <button onClick={handleLogout} style={styles.btnLogoutOutlined}>
            Keluar 🚪
          </button>
        </div>
      </header>

      <main style={{ padding: '25px 30px', maxWidth: '1350px', margin: '0 auto' }}>
        
        {/* STATS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }} className="no-print">
          <div className="stat-card" style={{ borderLeft: '6px solid #e65100', display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={styles.iconCircle}>🎓</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#222', fontWeight: '800' }}>{totalSiswa}</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#777', fontWeight: 'bold' }}>Total Siswa Terdaftar</p>
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '6px solid #2ecc71', display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#e8f5e9', color: '#2ecc71' }}>✅</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#222', fontWeight: '800' }}>{totalHadir}</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#777', fontWeight: 'bold' }}>Hadir Tepat Waktu</p>
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '6px solid #ff9800', display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#fff3e0', color: '#e65100' }}>📈</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px', color: '#222', fontWeight: '800' }}>{persentaseHadir}%</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#777', fontWeight: 'bold' }}>Persentase Kehadiran Total</p>
            </div>
          </div>
        </div>

        {/* GRAFIK TRAFIK TAP RFID */}
        <div style={{ ...styles.cardBox, marginBottom: '25px', backgroundColor: '#ffffff' }} className="no-print">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#e65100', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ height: '10px', width: '10px', backgroundColor: '#2ecc71', borderRadius: '50%', display: 'inline-block' }}></span>
                GRAFIK TRAFIK TAP RFID SISWA (REAL-TIME)
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#666' }}>
                Intensitas siswa melakukan tapping kartu berdasarkan waktu jam masuk sekolah hari ini
              </p>
            </div>
            <span style={{ fontSize: '11px', backgroundColor: '#fff3e0', color: '#e65100', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(230,81,0,0.1)' }}>
              ⚡ LIVE PULSE
            </span>
          </div>

          <div style={{ height: '150px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 500 120" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="gradientOrange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e65100" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#e65100" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="30" x2="500" y2="30" stroke="#f0f0f0" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="#f0f0f0" strokeDasharray="3 3" />

              <polygon
                fill="url(#gradientOrange)"
                points={`0,110 ${trafficData.map((val, idx) => `${(idx / (trafficData.length - 1)) * 500},${110 - (val / maxTraffic) * 90}`).join(' ')} 500,110`}
              />

              <polyline
                fill="none"
                stroke="#e65100"
                strokeWidth="3"
                points={trafficData.map((val, idx) => `${(idx / (trafficData.length - 1)) * 500},${110 - (val / maxTraffic) * 90}`).join(' ')}
              />

              {trafficData.map((val, idx) => {
                const cx = (idx / (trafficData.length - 1)) * 500;
                const cy = 110 - (val / maxTraffic) * 90;
                return (
                  <g key={idx}>
                    <circle cx={cx} cy={cy} r="4" fill="#ffffff" stroke="#e65100" strokeWidth="2" />
                    {val > 0 && (
                      <text x={cx} y={cy - 8} fontSize="9" fill="#e65100" fontWeight="bold" textAnchor="middle">
                        {val} tap
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid #ffe0b2', paddingTop: '8px' }}>
            {trafficHours.map((h) => (
              <span key={h} style={{ fontSize: '10px', color: '#777', fontWeight: 'bold' }}>
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* FILTER BAR MODERN DENGAN IKON JURUSAN & TINGKAT */}
        <div style={{ ...styles.cardBox, marginBottom: '25px', backgroundColor: '#ffffff' }} className="no-print">
          
          {/* BARIS PERIODE REKAP & EXPORT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #fff3e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', display: 'flex', alignItems: 'center', gap: '5px' }}>
                📅 PERIODE REKAP:
              </span>
              {['Hari Ini', '7 Hari', 'Bulanan'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriode(p)}
                  className={`pill-btn ${periode === p ? 'active' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleExportExcel} style={styles.btnGreenExport}>
                📊 Export Excel (.csv)
              </button>
              <button onClick={handlePrintPDF} style={styles.btnBluePdf}>
                📄 Cetak PDF Laporan
              </button>
            </div>
          </div>

          {/* BARIS TINGKAT KELAS DENGAN IKON */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', width: '90px', flexShrink: 0 }}>
              🎯 TINGKAT:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tingkatOptions.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setFilterTingkat(t.label)}
                  className={`pill-btn ${filterTingkat === t.label ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '14px' }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BARIS JURUSAN DENGAN IKON KHUSUS */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', width: '90px', flexShrink: 0, marginTop: '8px' }}>
              🏛️ JURUSAN:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {jurusanOptions.map((j) => (
                <button
                  key={j.label}
                  onClick={() => setFilterJurusan(j.label)}
                  className={`pill-btn ${filterJurusan === j.label ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '15px' }}>{j.icon}</span>
                  <span>{j.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* INPUT SEARCH */}
        <div style={{ marginBottom: '20px' }} className="no-print">
          <input
            type="text"
            placeholder="🔍 Cari nama siswa (Terurut A-Z) atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchBar}
          />
        </div>

        {/* TABEL DATA SISWA */}
        <div style={styles.cardBox}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ffe0b2' }}>
                <th style={styles.thCol}>STATUS PRESENSI</th>
                <th style={styles.thCol}>WAKTU TAP (HARIAN)</th>
                <th style={styles.thCol}>NAMA SISWA (A-Z)</th>
                <th style={styles.thCol}>KELAS / JURUSAN</th>
                <th style={styles.thCol}>RFID UID</th>
                <th style={{ ...styles.thCol }} className="no-print">AKSI PERUBAHAN</th>
              </tr>
            </thead>
            <tbody>
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '35px', color: '#888' }}>
                    <div style={{ fontSize: '30px', marginBottom: '8px' }}>🔍</div>
                    <b>Tidak ada siswa ditemukan untuk filter ini.</b>
                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#aaa' }}>
                      Coba ganti kata kunci pencarian atau ubah filter jurusan/tingkat di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((siswa) => {
                  const siswaUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || `UID-${siswa.id}`;
                  const log = absensiLogs.find((l) => l.rfid_uid === siswaUid);
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
                      <td style={{ ...styles.tdCol, color: '#666' }}>
                        {log ? new Date(log.created_at).toLocaleString('id-ID') : 'Belum Melakukan Tap'}
                      </td>
                      <td style={{ ...styles.tdCol, fontWeight: 'bold' }}>{siswa.nama}</td>
                      <td style={styles.tdCol}>
                        <span style={styles.badgeClass}>{siswa.kelas || 'X Teknik Jaringan Komputer dan Telekomunikasi'}</span>
                      </td>
                      <td style={{ ...styles.tdCol, color: '#1565c0', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {siswaUid}
                      </td>
                      <td style={styles.tdCol} className="no-print">
                        <button
                          onClick={() => handleOpenEditModal(siswa)}
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

      {/* POPUP MODAL UBAH DATA / STATUS */}
      {editingSiswa && (
        <div style={styles.modalOverlay} className="no-print">
          <div style={{ ...styles.modalContent, width: '400px' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#e65100', fontSize: '18px', fontWeight: 'bold' }}>
              {currentUser?.role === 'admin' ? '⚙️ Pengaturan Data Siswa & Status' : '✏️ Ubah Status Presensi'}
            </h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#666' }}>
              {currentUser?.role === 'admin' 
                ? 'Administrator dapat mengubah biodata dan status presensi'
                : 'Guru hanya memiliki akses mengubah status presensi'}
            </p>

            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#e65100', display: 'block', marginBottom: '3px' }}>
                Nama Siswa:
              </label>
              <input
                type="text"
                value={editNama}
                disabled={currentUser?.role !== 'admin'}
                onChange={(e) => setEditNama(e.target.value)}
                style={{
                  ...styles.inputStyle,
                  backgroundColor: currentUser?.role === 'admin' ? '#fff' : '#f5f5f5',
                  cursor: currentUser?.role === 'admin' ? 'text' : 'not-allowed',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#e65100', display: 'block', marginBottom: '3px' }}>
                    Kelas / Jurusan:
                  </label>
                  <input
                    type="text"
                    value={editKelas}
                    disabled={currentUser?.role !== 'admin'}
                    onChange={(e) => setEditKelas(e.target.value)}
                    style={{
                      ...styles.inputStyle,
                      backgroundColor: currentUser?.role === 'admin' ? '#fff' : '#f5f5f5',
                      cursor: currentUser?.role === 'admin' ? 'text' : 'not-allowed',
                      fontSize: '12px',
                      padding: '8px 12px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#e65100', display: 'block', marginBottom: '3px' }}>
                    RFID UID:
                  </label>
                  <input
                    type="text"
                    value={editRfid}
                    disabled={currentUser?.role !== 'admin'}
                    onChange={(e) => setEditRfid(e.target.value)}
                    style={{
                      ...styles.inputStyle,
                      backgroundColor: currentUser?.role === 'admin' ? '#fff' : '#f5f5f5',
                      cursor: currentUser?.role === 'admin' ? 'text' : 'not-allowed',
                      fontSize: '12px',
                      padding: '8px 12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {currentUser?.role === 'admin' && (
                <button
                  disabled={isUpdating}
                  onClick={handleSaveBiodataAdmin}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px',
                    backgroundColor: '#1565c0',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(21,101,192,0.3)'
                  }}
                >
                  💾 Simpan Perubahan Biodata
                </button>
              )}
            </div>

            <hr style={{ border: '0.5px solid #ffe0b2', margin: '15px 0' }} />

            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#e65100', textAlign: 'left', marginBottom: '8px' }}>
              PILIH STATUS PRESENSI:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Hadir (Tanpa Kartu)')}
                style={styles.btnStatusHadir}
              >
                🟢 HADIR (TANPA KARTU)
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Telat')}
                style={styles.btnStatusTelat}
              >
                ⏰ TELAT
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Sakit')}
                style={styles.btnStatusSakit}
              >
                🟡 SAKIT
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Izin')}
                style={styles.btnStatusIzin}
              >
                🔵 IZIN
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('Alpha')}
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

// STYLING
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
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  btnLogoutOutlined: { border: '1px solid #ffcdd2', backgroundColor: '#fff5f5', color: '#c62828', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  cardBox: { backgroundColor: '#ffffff', borderRadius: '16px', padding: '22px', border: '1px solid #ffe0b2', boxShadow: '0 4px 15px rgba(230,81,0,0.03)' },
  iconCircle: { width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#fff3e0', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' },
  btnGreenExport: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(46,204,113,0.3)' },
  btnBluePdf: { backgroundColor: '#2980b9', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(41,128,185,0.3)' },
  searchBar: { width: '100%', padding: '14px 22px', borderRadius: '30px', border: '1px solid #ffe0b2', outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', fontSize: '13px' },
  thCol: { textAlign: 'left', padding: '12px', fontSize: '11px', color: '#e65100', fontWeight: 'bold' },
  tdCol: { padding: '14px 12px', fontSize: '13px', color: '#333' },
  
  badgeAlpha: { backgroundColor: '#ffebee', color: '#c62828', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ffcdd2' },
  badgeHadir: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #a5d6a7' },
  badgeTelat: { backgroundColor: '#fff8e1', color: '#f57f17', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #ffe082' },
  badgeSakit: { backgroundColor: '#fffde7', color: '#fbc02d', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fff59d' },
  badgeIzin: { backgroundColor: '#e3f2fd', color: '#1565c0', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #90caf9' },
  
  badgeClass: { border: '1px solid #ffe0b2', backgroundColor: '#fffdfa', color: '#e65100', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' },
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
    padding: '28px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    textAlign: 'center'
  },
  btnStatusHadir: { backgroundColor: '#2ecc71', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  btnStatusTelat: { backgroundColor: '#f39c12', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  btnStatusSakit: { backgroundColor: '#f1c40f', color: '#333', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  btnStatusIzin: { backgroundColor: '#3498db', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  btnStatusAlpha: { backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  btnCancelModal: { marginTop: '15px', backgroundColor: 'transparent', color: '#888', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }
};
