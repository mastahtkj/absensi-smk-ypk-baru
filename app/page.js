'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RESTRICTED_GURU_IDS = [30, 31, 32, 33, 34];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [siswaList, setSiswaList] = useState([]);
  const [absensiLogs, setAbsensiLogs] = useState([]);
  const [periode, setPeriode] = useState('Hari Ini');
  const [filterTingkat, setFilterTingkat] = useState('Semua Tingkat');
  const [filterJurusan, setFilterJurusan] = useState('Semua Jurusan');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [detailSiswa, setDetailSiswa] = useState(null);

  const isMasterIqbal = currentUser?.username?.toLowerCase() === 'iqbal' || currentUser?.role === 'admin';
  const isRestrictedGuru = !isMasterIqbal && currentUser && RESTRICTED_GURU_IDS.includes(Number(currentUser.id));

  const baseTingkatOptions = [
    { label: 'Semua Tingkat', icon: '🎓' },
    { label: 'Kelas X', icon: '🎒' },
    { label: 'Kelas XI', icon: '📚' },
    { label: 'Kelas XII', icon: '🏆' },
    { label: 'Guru / Staff', icon: '👨‍🏫' },
  ];
  const tingkatOptions = isMasterIqbal 
    ? [...baseTingkatOptions, { label: "MASTER'K", icon: '👑' }]
    : baseTingkatOptions;

  const baseJurusanOptions = [
    { label: 'Semua Jurusan', icon: '🏫' },
    { label: 'Teknik Jaringan Komputer dan Telekomunikasi', icon: '💻' },
    { label: 'Akuntansi dan Keuangan Lembaga', icon: '📊' },
    { label: 'Manajemen Perkantoran dan Layanan Bisnis', icon: '💼' },
    { label: 'Pemasaran', icon: '📢' },
    { label: 'Guru / Staff', icon: '👨‍🏫' },
  ];
  const jurusanOptions = isMasterIqbal 
    ? [...baseJurusanOptions, { label: "MASTER'K", icon: '👑' }]
    : baseJurusanOptions;

  const triggerRealtimePopup = async (dataLog) => {
    const Swal = (await import('sweetalert2')).default;
    Swal.fire({
      title: '⚡ TAP RFID TERDETEKSI!',
      html: `
        <div style="font-size: 14px; text-align: left;">
          <b>${dataLog.nama}</b><br/>
          <span style="color: #666; font-size: 12px;">Kelas: <b>${dataLog.kelas}</b></span><br/>
          <span style="color: ${dataLog.status.includes('Telat') ? '#d32f2f' : '#2e7d32'}; font-weight: bold;">Status: ${dataLog.status}</span>
        </div>
      `,
      icon: dataLog.status.includes('Telat') ? 'warning' : 'success',
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setLoading(false), 200);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    const savedUser = localStorage.getItem('user_guru');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('user_guru');
      }
    }

    fetchInitialData();

    const channel = supabase
      .channel('absensi-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi' }, (payload) => {
        fetchInitialData();
        if (payload.new) {
          triggerRealtimePopup({
            nama: payload.new.nama || 'Siswa / Guru',
            kelas: payload.new.kelas || '-',
            status: payload.new.status || 'Hadir'
          });
        }
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInitialData = async () => {
    const { data: cards } = await supabase.from('rfid_cards').select('*');
    const { data: guruData } = await supabase.from('guru').select('*');

    let combinedList = cards ? [...cards] : [];
    if (guruData && guruData.length > 0) {
      const guruFormatted = guruData.map((g) => ({
        id: `GURU-${g.id}`,
        nama: g.nama,
        kelas: g.role === 'admin' ? "MASTER'K" : 'Guru / Staff',
        rfid_uid: g.rfid_uid || `GURU-UID-${g.id}`,
        uid: g.rfid_uid || `GURU-UID-${g.id}`,
        isGuru: true,
        role: g.role
      }));
      combinedList = [...combinedList, ...guruFormatted];
    }

    setSiswaList(combinedList);

    const { data: logs } = await supabase.from('absensi').select('*').order('created_at', { ascending: false });
    if (logs) setAbsensiLogs(logs);
  };

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
          username: guru.username,
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

  const handleLogout = async () => {
    localStorage.removeItem('user_guru');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const handleOpenEditModal = async (siswa) => {
    if (isRestrictedGuru) return;
    const validUid = siswa.uid || siswa.rfid_uid || '';
    setEditingSiswa(siswa);
    setEditNama(siswa.nama || '');
    setEditKelas(siswa.kelas || '');
    setEditRfid(validUid);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!editingSiswa || isRestrictedGuru) return;
    setIsUpdating(true);
    const validUid = editRfid || editingSiswa.uid || editingSiswa.rfid_uid;
    const editorInfo = `${currentUser?.nama || 'Guru'} (${currentUser?.role?.toUpperCase() || 'GURU'})`;

    try {
      await supabase.from('absensi').insert({
        rfid_uid: validUid,
        nama: editNama || editingSiswa.nama,
        kelas: editKelas || editingSiswa.kelas,
        status: newStatus,
        edited_by: editorInfo
      });

      setEditingSiswa(null);
      await fetchInitialData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const totalSiswa = siswaList.length || 0;
  const totalHadir = absensiLogs.filter((l) => l.status && l.status.includes('Hadir')).length;
  const persentaseHadir = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;

  const filteredSiswa = siswaList.filter((s) => {
    const matchSearch = (s.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (s.kelas || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  if (loading) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.overlay}>
          <div style={styles.splashCard}>
            <h2 style={{ color: '#e65100' }}>SMK YPK MEDAN</h2>
            <p>Memuat Server Absensi Digital...</p>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.overlay}>
          <div style={styles.portalCard}>
            <h2 style={{ textAlign: 'center', color: '#e65100' }}>PORTAL PRESENSI DIGITAL</h2>
            {loginError && <div style={styles.errorAlert}>{loginError}</div>}
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.fieldLabel}>Username:</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={styles.inputStyle}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.fieldLabel}>Password:</label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.inputStyle}
                />
              </div>
              <button type="submit" disabled={isLoggingIn} style={styles.btnOrange}>
                {isLoggingIn ? 'MEMPROSES...' : 'MASUK DASHBOARD'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardBg}>
      <header style={styles.headerNav}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', color: '#e65100' }}>DASHBOARD ABSENSI REAL-TIME</h1>
          <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>SMK YPK MEDAN</p>
        </div>
        <button onClick={handleLogout} style={styles.btnLogoutOutlined}>Keluar 🚪</button>
      </header>

      <main style={{ padding: '25px 30px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
          <div style={styles.cardBox}>
            <h3>Total Terdaftar</h3>
            <h1>{totalSiswa}</h1>
          </div>
          <div style={styles.cardBox}>
            <h3>Hadir Tepat Waktu</h3>
            <h1>{totalHadir}</h1>
          </div>
          <div style={styles.cardBox}>
            <h3>Persentase Kehadiran</h3>
            <h1>{persentaseHadir}%</h1>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="🔍 Cari nama siswa/guru atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchBar}
          />
        </div>

        <div style={styles.cardBox}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ffe0b2' }}>
                <th style={styles.thCol}>STATUS</th>
                <th style={styles.thCol}>NAMA LENGKAP</th>
                <th style={styles.thCol}>KELAS</th>
                <th style={styles.thCol}>RFID UID</th>
                <th style={styles.thCol}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredSiswa.map((siswa) => {
                const siswaUid = siswa.uid || siswa.rfid_uid || `UID-${siswa.id}`;
                const log = absensiLogs.find((l) => l.rfid_uid === siswaUid);
                const status = log?.status || 'Alpha';

                return (
                  <tr key={siswa.id} style={{ borderBottom: '1px solid #fff3e0' }}>
                    <td style={styles.tdCol}>{status}</td>
                    <td style={styles.tdCol}>{siswa.nama}</td>
                    <td style={styles.tdCol}>{siswa.kelas}</td>
                    <td style={styles.tdCol}>{siswaUid}</td>
                    <td style={styles.tdCol}>
                      <button onClick={() => handleOpenEditModal(siswa)} style={styles.btnEditOutline}>✏️ Edit Status</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {editingSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Ubah Status Presensi</h3>
            <p>{editingSiswa.nama}</p>
            <button onClick={() => handleUpdateStatus('Hadir (Tanpa Kartu)')} style={styles.btnOrange}>🟢 HADIR (TANPA KARTU)</button>
            <button onClick={() => handleUpdateStatus('Sakit')} style={styles.btnOrange}>🤒 SAKIT</button>
            <button onClick={() => handleUpdateStatus('Izin')} style={styles.btnOrange}>✉️ IZIN</button>
            <button onClick={() => handleUpdateStatus('Alpha')} style={styles.btnOrange}>❌ ALPHA</button>
            <button onClick={() => setEditingSiswa(null)} style={styles.btnCancelModal}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  loginBg: { minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  overlay: { width: '100%', display: 'flex', justifyContent: 'center' },
  portalCard: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '350px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  splashCard: { backgroundColor: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center' },
  progressTrack: { backgroundColor: '#ffe0b2', height: '8px', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' },
  progressBar: { backgroundColor: '#e65100', height: '100%' },
  fieldLabel: { fontSize: '12px', fontWeight: 'bold', color: '#333' },
  inputStyle: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' },
  btnOrange: { width: '100%', padding: '10px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', marginTop: '10px', cursor: 'pointer' },
  errorAlert: { color: 'red', fontSize: '12px', marginBottom: '10px' },
  dashboardBg: { minHeight: '100vh', backgroundColor: '#fafafa' },
  headerNav: { backgroundColor: '#fff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ffe0b2' },
  btnLogoutOutlined: { border: '1px solid #ffcdd2', backgroundColor: '#fff5f5', color: '#c62828', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' },
  cardBox: { backgroundColor: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #ffe0b2' },
  searchBar: { width: '100%', padding: '12px', borderRadius: '20px', border: '1px solid #ffe0b2', outline: 'none' },
  thCol: { textAlign: 'left', padding: '10px', fontSize: '12px', color: '#e65100' },
  tdCol: { padding: '10px', fontSize: '13px' },
  btnEditOutline: { border: '1px solid #ffe0b2', backgroundColor: '#fff3e0', color: '#e65100', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '10px', width: '300px', textAlign: 'center' },
  btnCancelModal: { border: 'none', background: 'none', color: '#888', marginTop: '10px', cursor: 'pointer' }
};
