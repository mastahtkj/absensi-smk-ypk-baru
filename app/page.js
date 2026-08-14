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

  // Modal State Lihat Detail Riwayat Tanggal
  const [detailSiswa, setDetailSiswa] = useState(null);

  // DATA DAFTAR JURUSAN & TINGKAT
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

  // CEK APAPUN STATUS RESTRIKSI USER SAAT INI
  const isRestrictedGuru = currentUser && RESTRICTED_GURU_IDS.includes(Number(currentUser.id));

  // 1. INITIAL LOAD & REALTIME
  useEffect(() => {
    const totalDuration = 3000;
    const intervalTime = 100;
    const step = 100 / (totalDuration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setLoading(false), 200);
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

  // 3. EDIT MODAL (PROTEKSI ID GURU DIBATASI)
  const handleOpenEditModal = (siswa) => {
    if (isRestrictedGuru) {
      alert('Akses Ditolak: Akun Anda (ID Guru 30-34) hanya memiliki izin untuk melihat dan mencetak laporan.');
      return;
    }
    const validUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || '';
    setEditingSiswa(siswa);
    setEditNama(siswa.nama || '');
    setEditKelas(siswa.kelas || '');
    setEditRfid(validUid);
  };

  // 4. UPDATE STATUS PRESENSI (PROTEKSI ID GURU DIBATASI)
  const handleUpdateStatus = async (newStatus) => {
    if (isRestrictedGuru) {
      alert('Akses Ditolak: Anda tidak dapat mengedit status presensi.');
      return;
    }

    if (!editingSiswa) return;
    setIsUpdating(true);
    const validUid = editRfid || editingSiswa.rfid_uid || `UID-${editingSiswa.id}`;
    
    // Nama Pengubah (Sesuai User Login)
    const editorInfo = `${currentUser?.nama || 'Guru'} (${currentUser?.role?.toUpperCase() || 'GURU'})`;

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
            kelas: editKelas || editingSiswa.kelas,
            edited_by: editorInfo
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
            status: newStatus,
            edited_by: editorInfo
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

  // 5. UPDATE BIODATA (ADMIN ONLY)
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

  // STATISTIK
  const totalSiswa = siswaList.length || 0;
  const totalHadir = absensiLogs.filter((l) => l.status && l.status.includes('Hadir')).length;
  const persentaseHadir = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;

  // FILTER SISWA
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

  // HELPER REKAP & TANGGAL
  const getRecapForSiswa = (siswaUid) => {
    const logs = absensiLogs.filter((l) => l.rfid_uid === siswaUid);
    
    let cntHadirKartu = 0;
    let cntHadirTanpaKartu = 0;
    let cntTelat = 0;
    let cntSakit = 0;
    let cntIzin = 0;
    let cntAlpha = 0;

    let datesTelat = [];
    let datesSakit = [];
    let datesIzin = [];
    let datesAlpha = [];

    logs.forEach((log) => {
      const st = (log.status || '').toLowerCase();
      const tgl = new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

      if (st === 'hadir' || st === 'hadir (tap rfid)') {
        cntHadirKartu++;
      } else if (st.includes('tanpa kartu')) {
        cntHadirTanpaKartu++;
      } else if (st.includes('telat')) {
        cntTelat++;
        datesTelat.push(tgl);
      } else if (st.includes('sakit')) {
        cntSakit++;
        datesSakit.push(tgl);
      } else if (st.includes('izin')) {
        cntIzin++;
        datesIzin.push(tgl);
      } else {
        cntAlpha++;
        datesAlpha.push(tgl);
      }
    });

    if (logs.length === 0) {
      cntAlpha = 1;
      datesAlpha.push('Hari Ini');
    }

    const totalHadirSemua = cntHadirKartu + cntHadirTanpaKartu;
    const totalLogCount = logs.length || 1;
    const pct = Math.round((totalHadirSemua / totalLogCount) * 100);

    return {
      hadirKartu: cntHadirKartu,
      hadirTanpaKartu: cntHadirTanpaKartu,
      telat: cntTelat,
      sakit: cntSakit,
      izin: cntIzin,
      alpha: cntAlpha,
      datesTelatStr: datesTelat.length > 0 ? datesTelat.join('; ') : '-',
      datesSakitStr: datesSakit.length > 0 ? datesSakit.join('; ') : '-',
      datesIzinStr: datesIzin.length > 0 ? datesIzin.join('; ') : '-',
      datesAlphaStr: datesAlpha.length > 0 ? datesAlpha.join('; ') : '-',
      persentase: pct,
      rawLogs: logs
    };
  };

  // EXPORT EXCEL METODE LENGKAP
  const handleExportExcel = () => {
    if (filteredSiswa.length === 0) {
      alert('Tidak ada data siswa untuk di-export!');
      return;
    }

    let csvData = "\uFEFF";
    csvData += "SEKOLAH MENENGAH KEJURUAN (SMK) YPK MEDAN\n";
    csvData += "Jl. Sisingamangaraja No. 33, Kota Medan, Sumatera Utara | Telp: (061) 123456 | Email: info@smkypkmedan.sch.id\n";
    csvData += `LAPORAN REKAPITULASI DETAIL PRESENSI SISWA - PERIODE: ${periode.toUpperCase()}\n`;
    csvData += `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}\n\n`;

    csvData += "NO,NAMA SISWA,KELAS / JURUSAN,RFID UID,TOTAL HADIR (KARTU),TOTAL HADIR (NO KARTU),TOTAL TELAT,TOTAL SAKIT,TOTAL IZIN,TOTAL ALPHA,RINCIAN TANGGAL TELAT,RINCIAN TANGGAL SAKIT,RINCIAN TANGGAL IZIN,RINCIAN TANGGAL ALPHA,PERSENTASE KEHADIRAN (%)\n";

    filteredSiswa.forEach((siswa, index) => {
      const siswaUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || `UID-${siswa.id}`;
      const recap = getRecapForSiswa(siswaUid);

      const row = [
        index + 1,
        `"${siswa.nama || ''}"`,
        `"${siswa.kelas || ''}"`,
        `"${siswaUid}"`,
        recap.hadirKartu,
        recap.hadirTanpaKartu,
        recap.telat,
        recap.sakit,
        recap.izin,
        recap.alpha,
        `"${recap.datesTelatStr}"`,
        `"${recap.datesSakitStr}"`,
        `"${recap.datesIzinStr}"`,
        `"${recap.datesAlphaStr}"`,
        `"${recap.persentase}%"`
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
                e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
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
                e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
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
          th, td { border: 1px solid #333 !important; padding: 6px 8px !important; font-size: 10px !important; }
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
          transition: all 0.2s ease;
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
        }

        .btn-status-option {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          border: none;
          transition: transform 0.15s ease, filter 0.15s ease;
          color: #ffffff;
        }

        .btn-status-option:hover {
          transform: scale(1.02);
          filter: brightness(1.05);
        }
      `}</style>

      {/* KOP SURAT PRINT PDF */}
      <div className="print-only" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', paddingBottom: '10px' }}>
          <img
            src="/logo.png"
            onError={(e) => {
              e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
            }}
            alt="Logo SMK YPK Medan"
            style={{ width: '75px', height: '75px', objectFit: 'contain' }}
          />
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
              YAYASAN PENDIDIKAN KEBANGSAAN
            </h3>
            <h1 style={{ margin: '3px 0', fontSize: '22px', fontWeight: '800', letterSpacing: '1.5px' }}>
              SMK YPK MEDAN
            </h1>
            <p style={{ margin: 0, fontSize: '10px', color: '#222', lineHeight: '1.4' }}>
              Jl. Sisingamangaraja No. 33, Medan, Sumatera Utara • Telp: (061) 123456
              <br />
              Website: smkypkmedan.sch.id | Email: info@smkypkmedan.sch.id
            </p>
          </div>
        </div>

        {/* GARIS GANDA KOP SURAT RESMI */}
        <div style={{ borderBottom: '3px solid #000', marginBottom: '2px' }}></div>
        <div style={{ borderBottom: '1px solid #000', marginBottom: '15px' }}></div>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
            LAPORAN REKAPITULASI DETAIL PRESENSI SISWA
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 'bold' }}>
            PERIODE: {periode.toUpperCase()} • TANGGAL CETAK: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <header style={styles.headerNav} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/logo.png"
            onError={(e) => {
              e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/2/27/Logo_SMK_YPK_Medan.png';
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
              {currentUser?.nama || 'Bpk/Ibu Guru'} (ID: {currentUser?.id})
            </b>
            <span style={{ fontSize: '11px', color: isRestrictedGuru ? '#c62828' : '#e65100', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {currentUser?.role === 'admin' 
                ? '🛡️ ADMINISTRATOR (AKSES PENUH)' 
                : isRestrictedGuru 
                  ? '🔒 GURU PENINJAU (VIEW & PRINT ONLY)' 
                  : '👨‍🏫 GURU PENGAJAR (IZIN EDIT PRESENSI)'}
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

        {/* GRAFIK TRAFIK */}
        <div style={{ ...styles.cardBox, marginBottom: '25px', backgroundColor: '#ffffff' }} className="no-print">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#e65100', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ height: '10px', width: '10px', backgroundColor: '#2ecc71', borderRadius: '50%', display: 'inline-block' }}></span>
                GRAFIK TRAFIK TAP RFID SISWA (REAL-TIME)
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#666' }}>
                Intensitas siswa melakukan tapping kartu berdasarkan waktu jam masuk sekolah
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

        {/* FILTER BAR MODERN */}
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
                📊 Export Excel (.csv) Kop + Tanggal
              </button>
              <button onClick={handlePrintPDF} style={styles.btnBluePdf}>
                📄 Cetak PDF Laporan
              </button>
            </div>
          </div>

          {/* BARIS TINGKAT KELAS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', width: '90px', flexShrink: 0 }}>
              🎯 TINGKAT:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tingkatOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setFilterTingkat(opt.label)}
                  className={`pill-btn ${filterTingkat === opt.label ? 'active' : ''}`}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* BARIS JURUSAN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e65100', width: '90px', flexShrink: 0 }}>
              🏫 JURUSAN:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {jurusanOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setFilterJurusan(opt.label)}
                  className={`pill-btn ${filterJurusan === opt.label ? 'active' : ''}`}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* SEARCH BAR */}
          <div style={{ marginTop: '15px' }}>
            <input
              type="text"
              placeholder="🔍 Cari berdasarkan Nama Siswa atau Kelas (contoh: 'Fahrul' / 'X TJKT 1')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.inputSearch}
            />
          </div>
        </div>

        {/* TABEL DATA SISWA */}
        <div style={styles.cardBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#e65100', fontSize: '16px', fontWeight: 'bold' }}>
              📋 REKAPITULASI DATA PRESENSI SISWA ({filteredSiswa.length} Siswa)
            </h3>
            <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
              Izin edit dibatasi berdasarkan ID Login Guru.
            </span>
          </div>

          <div style={styles.tableContainer}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#fff3e0', color: '#e65100', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  <th style={styles.thStyle}>No</th>
                  <th style={styles.thStyle}>Nama Siswa</th>
                  <th style={styles.thStyle}>Kelas / Jurusan</th>
                  <th style={styles.thStyle}>RFID UID</th>
                  <th style={styles.thStyle}>Status Presensi</th>
                  <th style={styles.thStyle}>Rekapitulasi ({periode})</th>
                  <th style={styles.thStyle} className="no-print">Aksi & Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredSiswa.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                      Tidak ada data siswa yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredSiswa.map((siswa, idx) => {
                    const siswaUid = siswa.rfid_uid || siswa.uid || siswa.card_uid || `UID-${siswa.id}`;
                    const recap = getRecapForSiswa(siswaUid);

                    // Cek Log Hari Ini
                    const todayLog = absensiLogs.find((l) => l.rfid_uid === siswaUid);
                    const statusText = todayLog ? todayLog.status : 'Belum Tap';

                    return (
                      <tr key={siswa.id || idx} style={{ borderBottom: '1px solid #ffe0b2' }}>
                        <td style={styles.tdStyle}>{idx + 1}</td>
                        <td style={{ ...styles.tdStyle, fontWeight: 'bold', color: '#222' }}>
                          {siswa.nama || '-'}
                        </td>
                        <td style={styles.tdStyle}>
                          <span style={styles.badgeKelas}>{siswa.kelas || '-'}</span>
                        </td>
                        <td style={styles.tdStyle}>
                          <code style={{ fontSize: '11px', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>
                            {siswaUid}
                          </code>
                        </td>
                        <td style={styles.tdStyle}>
                          {statusText.toLowerCase().includes('hadir') ? (
                            <span style={styles.badgeSuccess}>✅ {statusText}</span>
                          ) : statusText.toLowerCase().includes('telat') ? (
                            <span style={styles.badgeWarning}>⚠️ {statusText}</span>
                          ) : statusText.toLowerCase().includes('sakit') ? (
                            <span style={styles.badgeInfo}>🏥 {statusText}</span>
                          ) : statusText.toLowerCase().includes('izin') ? (
                            <span style={styles.badgeInfo}>📩 {statusText}</span>
                          ) : (
                            <span style={styles.badgeDanger}>❌ {statusText}</span>
                          )}
                        </td>
                        <td style={styles.tdStyle}>
                          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                            <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>Hadir: {recap.hadirKartu + recap.hadirTanpaKartu}</span> •{' '}
                            <span style={{ color: '#ed6c02', fontWeight: 'bold' }}>Telat: {recap.telat}</span> •{' '}
                            <span style={{ color: '#0288d1', fontWeight: 'bold' }}>Sakit/Izin: {recap.sakit + recap.izin}</span> •{' '}
                            <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>Alpha: {recap.alpha}</span>
                            <div style={{ marginTop: '2px', fontWeight: 'bold', color: recap.persentase >= 80 ? '#2e7d32' : '#d32f2f' }}>
                              Kehadiran: {recap.persentase}%
                            </div>
                          </div>
                        </td>
                        <td style={styles.tdStyle} className="no-print">
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenEditModal(siswa)}
                              style={isRestrictedGuru ? styles.btnDisabled : styles.btnActionEdit}
                              title={isRestrictedGuru ? 'Akses Terbatas' : 'Edit Status / Biodata'}
                            >
                              ✏️ {isRestrictedGuru ? 'Terbatas' : 'Edit'}
                            </button>
                            <button
                              onClick={() => setDetailSiswa({ siswa, recap })}
                              style={styles.btnActionDetail}
                            >
                              🔍 Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL EDIT STATUS / BIODATA */}
      {editingSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#e65100', fontSize: '16px', fontWeight: 'bold' }}>
                ✏️ UPDATE PRESENSI / BIODATA SISWA
              </h3>
              <button onClick={() => setEditingSiswa(null)} style={styles.btnCloseModal}>✕</button>
            </div>

            <div style={{ backgroundColor: '#fff3e0', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '12px', color: '#e65100' }}>
              Siswa: <b>{editingSiswa.nama}</b> ({editingSiswa.kelas})
            </div>

            {/* FORM BIODATA (ADMIN ONLY) */}
            {currentUser?.role === 'admin' && (
              <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #ffe0b2' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                  🛡️ EDIT BIODATA MASTER (HANYA ADMINISTRATOR):
                </p>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    placeholder="Nama Lengkap Siswa"
                    style={styles.inputStyle}
                  />
                  <input
                    type="text"
                    value={editKelas}
                    onChange={(e) => setEditKelas(e.target.value)}
                    placeholder="Kelas / Jurusan"
                    style={styles.inputStyle}
                  />
                  <input
                    type="text"
                    value={editRfid}
                    onChange={(e) => setEditRfid(e.target.value)}
                    placeholder="Kode RFID UID"
                    style={styles.inputStyle}
                  />
                  <button
                    onClick={handleSaveBiodataAdmin}
                    disabled={isUpdating}
                    style={{ ...styles.btnOrange, width: '100%', marginTop: '5px' }}
                  >
                    💾 Simpan Perubahan Biodata
                  </button>
                </div>
              </div>
            )}

            {/* PILIHAN STATUS PRESENSI */}
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
               UBAH STATUS PRESENSI HARI INI:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <button
                onClick={() => handleUpdateStatus('Hadir (Manual Guru)')}
                disabled={isUpdating || isRestrictedGuru}
                className="btn-status-option"
                style={{ backgroundColor: '#2ecc71' }}
              >
                ✅ Hadir (Tanpa Kartu)
              </button>
              <button
                onClick={() => handleUpdateStatus('Telat')}
                disabled={isUpdating || isRestrictedGuru}
                className="btn-status-option"
                style={{ backgroundColor: '#f39c12' }}
              >
                ⚠️ Telat Masuk
              </button>
              <button
                onClick={() => handleUpdateStatus('Sakit')}
                disabled={isUpdating || isRestrictedGuru}
                className="btn-status-option"
                style={{ backgroundColor: '#3498db' }}
              >
                🏥 Sakit (Surat Dokter)
              </button>
              <button
                onClick={() => handleUpdateStatus('Izin')}
                disabled={isUpdating || isRestrictedGuru}
                className="btn-status-option"
                style={{ backgroundColor: '#9b59b6' }}
              >
                📩 Izin (Keterangan Orang Tua)
              </button>
              <button
                onClick={() => handleUpdateStatus('Alpha')}
                disabled={isUpdating || isRestrictedGuru}
                className="btn-status-option"
                style={{ backgroundColor: '#e74c3c', gridColumn: 'span 2' }}
              >
                ❌ Tanpa Keterangan (Alpha)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL RIWAYAT TANGGAL */}
      {detailSiswa && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#e65100', fontSize: '16px', fontWeight: 'bold' }}>
                🔍 DETAIL RIWAYAT PRESENSI
              </h3>
              <button onClick={() => setDetailSiswa(null)} style={styles.btnCloseModal}>✕</button>
            </div>

            <div style={{ backgroundColor: '#fff3e0', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#e65100' }}>
                {detailSiswa.siswa.nama}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>
                Kelas: {detailSiswa.siswa.kelas} | RFID: {detailSiswa.siswa.rfid_uid || detailSiswa.siswa.uid || '-'}
              </p>
            </div>

            <div style={{ display: 'grid', gap: '10px', fontSize: '12px' }}>
              <div style={styles.detailBox}>
                <b style={{ color: '#f39c12' }}>⚠️ Tanggal Telat:</b>
                <p style={{ margin: '3px 0 0 0', color: '#555' }}>{detailSiswa.recap.datesTelatStr}</p>
              </div>
              <div style={styles.detailBox}>
                <b style={{ color: '#3498db' }}>🏥 Tanggal Sakit:</b>
                <p style={{ margin: '3px 0 0 0', color: '#555' }}>{detailSiswa.recap.datesSakitStr}</p>
              </div>
              <div style={styles.detailBox}>
                <b style={{ color: '#9b59b6' }}>📩 Tanggal Izin:</b>
                <p style={{ margin: '3px 0 0 0', color: '#555' }}>{detailSiswa.recap.datesIzinStr}</p>
              </div>
              <div style={styles.detailBox}>
                <b style={{ color: '#e74c3c' }}>❌ Tanggal Alpha:</b>
                <p style={{ margin: '3px 0 0 0', color: '#555' }}>{detailSiswa.recap.datesAlphaStr}</p>
              </div>
            </div>

            <button
              onClick={() => setDetailSiswa(null)}
              style={{ ...styles.btnOrange, width: '100%', marginTop: '20px' }}
            >
              Tutup Detail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// STYLES INLINE LENGKAP
const styles = {
  loginBg: {
    minHeight: '100vh',
    backgroundImage: 'url("https://absensi-smk-ypk-baru-nlb8adf9z-smk-ypk-medan.vercel.app/bg-sekolah.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  overlay: {
    minHeight: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  splashCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '30px 35px',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
  },
  systemOnlineBadge: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    padding: '4px 10px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  greenDot: {
    color: '#2ecc71',
    fontSize: '12px',
  },
  orangeBadge: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#ffffff',
    backgroundColor: '#e65100',
    padding: '4px 12px',
    borderRadius: '20px',
    letterSpacing: '1px',
  },
  progressTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: '#ffe0b2',
    borderRadius: '10px',
    overflow: 'hidden',
    marginTop: '10px',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#e65100',
    transition: 'width 0.1s linear',
  },
  portalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '35px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
  },
  errorAlert: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '15px',
    textAlign: 'center',
    border: '1px solid #ffcdd2',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: '6px',
  },
  inputStyle: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1.5px solid #ffe0b2',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  inputSearch: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1.5px solid #ffb74d',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnOrange: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#e65100',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
    letterSpacing: '0.5px',
    boxShadow: '0 4px 12px rgba(230,81,0,0.3)',
  },
  dashboardBg: {
    minHeight: '100vh',
    backgroundColor: '#fffcf8',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#333',
  },
  headerNav: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #ffe0b2',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(230,81,0,0.05)',
  },
  btnLogoutOutlined: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#e65100',
    border: '1.5px solid #e65100',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#fff3e0',
    color: '#e65100',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  cardBox: {
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    padding: '22px',
    border: '1px solid #ffe0b2',
    boxShadow: '0 4px 15px rgba(230,81,0,0.03)',
  },
  btnGreenExport: {
    padding: '9px 16px',
    backgroundColor: '#2e7d32',
    color: '#ffffff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnBluePdf: {
    padding: '9px 16px',
    backgroundColor: '#0288d1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  thStyle: {
    padding: '12px 14px',
    textAlign: 'left',
    borderBottom: '2px solid #ffe0b2',
    fontWeight: 'bold',
  },
  tdStyle: {
    padding: '12px 14px',
    verticalAlign: 'middle',
  },
  badgeKelas: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  badgeSuccess: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  badgeWarning: {
    backgroundColor: '#fff3e0',
    color: '#ed6c02',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  badgeInfo: {
    backgroundColor: '#e1f5fe',
    color: '#0288d1',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  badgeDanger: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  btnActionEdit: {
    padding: '6px 12px',
    backgroundColor: '#e65100',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnActionDetail: {
    padding: '6px 12px',
    backgroundColor: '#0288d1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnDisabled: {
    padding: '6px 12px',
    backgroundColor: '#e0e0e0',
    color: '#9e9e9e',
    border: 'none',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'not-allowed',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '25px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  btnCloseModal: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#888',
    cursor: 'pointer',
  },
  detailBox: {
    backgroundColor: '#f9f9f9',
    padding: '10px 14px',
    borderRadius: '10px',
    borderLeft: '4px solid #e65100',
  },
};
