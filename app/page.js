'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Swal from 'sweetalert2';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RESTRICTED_GURU_IDS = [30, 31, 32, 33, 34];

const normalizeUid = (uid) => (uid ? String(uid).trim().toUpperCase() : '');

// Logo Resmi SMK YPK Medan Emblem Component
const LogoSekolah = () => (
  <div style={styles.logoWrapper}>
    <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#1e3a8a" stroke="#f59e0b" strokeWidth="4" />
      <circle cx="50" cy="50" r="40" fill="#ffffff" />
      <path d="M50 15 L62 28 L80 28 L68 40 L74 58 L50 48 L26 58 L32 40 L20 28 L38 28 Z" fill="#d97706" />
      <rect x="35" y="52" width="30" height="25" fill="#1e3a8a" rx="3" />
      <path d="M42 62 L50 56 L58 62 L58 77 L42 77 Z" fill="#ffffff" />
      <text x="50" y="90" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">YPK MEDAN</text>
    </svg>
  </div>
);

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [siswaList, setSiswaList] = useState([]);
  const [absensiLogs, setAbsensiLogs] = useState([]);
  const [filterTingkat, setFilterTingkat] = useState('Semua Tingkat');
  const [filterJurusan, setFilterJurusan] = useState('Semua Jurusan');
  const [filterPeriode, setFilterPeriode] = useState('hari');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [detailSiswa, setDetailSiswa] = useState(null);
  const [manualStatus, setManualStatus] = useState('Hadir (Tanpa Kartu)');

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerType, setRegisterType] = useState('siswa');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [isWaitingTap, setIsWaitingTap] = useState(false);
  const [scannedUid, setScannedUid] = useState('');

  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    return () => { isMountedRef.current = false; };
  }, []);

  const isMasterIqbal = currentUser?.username?.toLowerCase() === 'iqbal' || currentUser?.role === 'admin';
  const isRestrictedGuru = !isMasterIqbal && currentUser && RESTRICTED_GURU_IDS.includes(Number(currentUser.id));

  const fetchInitialData = useCallback(async () => {
    try {
      const [{ data: cards }, { data: guruData }, { data: logs }] = await Promise.all([
        supabase.from('rfid_cards').select('*'),
        supabase.from('guru').select('*'),
        supabase.from('absensi').select('*').order('created_at', { ascending: false })
      ]);

      const safeCards = Array.isArray(cards) ? cards : [];
      const safeGuru = Array.isArray(guruData) ? guruData : [];
      const safeLogs = Array.isArray(logs) ? logs : [];

      let combinedList = [...safeCards];

      if (safeGuru.length > 0) {
        const guruFormatted = safeGuru.map((g) => ({
          id: `GURU-${g.id}`,
          rawId: g.id,
          nama: g.nama || '',
          kelas: g.role === 'admin' ? "MASTER'K" : 'Guru / Staff',
          rfid_uid: g.rfid_uid || null,
          isGuru: true,
          role: g.role
        }));
        combinedList = [...combinedList, ...guruFormatted];
      }

      combinedList.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

      if (isMountedRef.current) {
        setSiswaList(combinedList);
        setAbsensiLogs(safeLogs);
      }
      return { combinedList, logs: safeLogs };
    } catch (err) {
      console.error('Error fetching data:', err);
      return { combinedList: [], logs: [] };
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isMountedRef.current) return;
      setProgress((prev) => Math.min(prev + 10, 100));
    }, 80);

    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user_guru');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed) { setCurrentUser(parsed); setIsLoggedIn(true); }
        } catch (e) { localStorage.removeItem('user_guru'); }
      }
    }
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress >= 100 && isMountedRef.current) setLoading(false);
  }, [progress]);

  // Polling kartu tap untuk registrasi
  useEffect(() => {
    let intervalId;
    if (showRegisterModal && isWaitingTap) {
      intervalId = setInterval(async () => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;
        try {
          const { data: latestScan } = await supabase.from('latest_scan').select('uid').eq('id', 1).maybeSingle();
          if (isMountedRef.current && latestScan?.uid) {
            setScannedUid((prev) => (prev !== latestScan.uid ? latestScan.uid : prev));
          }
        } catch (err) {} finally { isPollingRef.current = false; }
      }, 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [showRegisterModal, isWaitingTap]);

  // Toast Notifikasi Tap Realtime
  const triggerRealtimePopup = useCallback((dataLog) => {
    if (typeof window === 'undefined') return;
    if (Swal.isVisible()) Swal.close();

    const isTelat = (dataLog.status || '').toUpperCase().includes('TELAT');

    Swal.fire({
      title: '⚡ SCAN RFID TERDETEKSI',
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.5;">
          <b style="font-size: 15px; color: #1e293b;">${dataLog.nama}</b><br/>
          <span style="color: #64748b;">Kelas/Jabatan: <b>${dataLog.kelas}</b></span><br/>
          <span style="color: ${isTelat ? '#ef4444' : '#10b981'}; font-weight: bold;">Status: ${dataLog.status}</span>
        </div>
      `,
      icon: isTelat ? 'warning' : 'success',
      timer: 3500,
      toast: true,
      position: 'top-end',
      showConfirmButton: false
    });
  }, []);

  useEffect(() => {
    fetchInitialData();
    const channel = supabase.channel('realtime-absensi')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'absensi' }, async (payload) => {
        const fresh = await fetchInitialData();
        if (payload?.new) {
          const newRec = payload.new;
          const match = fresh.combinedList.find((s) => normalizeUid(s.rfid_uid) === normalizeUid(newRec.rfid_uid));
          triggerRealtimePopup({
            nama: match?.nama || newRec.nama || 'Siswa / Guru',
            kelas: match?.kelas || newRec.kelas || '-',
            status: newRec.status || 'Hadir'
          });
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchInitialData, triggerRealtimePopup]);

  // Statistik Realtime Hari Ini
  const statsHariIni = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayLogs = absensiLogs.filter(log => new Date(log.created_at).toDateString() === todayStr);
    
    const hadir = todayLogs.filter(l => l.status.toLowerCase().includes('hadir')).length;
    const telat = todayLogs.filter(l => l.status.toLowerCase().includes('telat')).length;
    const totalSiswa = siswaList.length;
    const belumTap = Math.max(0, totalSiswa - todayLogs.length);

    return { hadir, telat, belumTap, totalSiswa };
  }, [absensiLogs, siswaList]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { data: guru, error } = await supabase.from('guru').select('*').eq('username', username.trim()).eq('password', password.trim()).maybeSingle();
      if (error || !guru) {
        setLoginError('Username atau password tidak ditemukan!');
      } else {
        const userData = { id: guru.id, nama: guru.nama, username: guru.username, role: (guru.role || 'guru').toLowerCase() };
        setCurrentUser(userData);
        setIsLoggedIn(true);
        if (rememberMe) localStorage.setItem('user_guru', JSON.stringify(userData));
      }
    } catch (err) {
      setLoginError('Koneksi ke database gagal.');
    } finally { setIsLoggingIn(false); }
  };

  const handleSaveRegisterCard = async () => {
    if (!selectedTarget || !scannedUid) {
      Swal.fire({ icon: 'warning', title: 'Data Belum Lengkap', text: 'Pilih nama dan pastikan UID kartu sudah terisi!' });
      return;
    }
    setIsUpdating(true);
    const cleanUid = normalizeUid(scannedUid);

    try {
      const targetObj = siswaList.find((s) => String(s.id) === String(selectedTarget));
      const isGuru = targetObj?.isGuru || String(targetObj?.id).startsWith('GURU-');
      const targetDbId = targetObj?.rawId || String(targetObj?.id).replace('GURU-', '');

      if (isGuru) {
        await supabase.from('guru').update({ rfid_uid: cleanUid }).eq('id', targetDbId);
      } else {
        await supabase.from('rfid_cards').update({ rfid_uid: cleanUid }).eq('id', targetObj.id);
      }

      Swal.fire({ icon: 'success', title: 'Kartu Berhasil Ditautkan!', timer: 2000, showConfirmButton: false });
      setShowRegisterModal(false);
      await fetchInitialData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    } finally { setIsUpdating(false); }
  };

  const filteredData = useMemo(() => {
    return siswaList.filter((s) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return s.nama.toLowerCase().includes(q) || (s.kelas || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [siswaList, searchQuery]);

  if (loading || !hasMounted) {
    return (
      <div style={styles.splashBg}>
        <LogoSekolah />
        <h2 style={{ color: '#1e3a8a', marginTop: 12 }}>SMK YPK MEDAN</h2>
        <p style={{ color: '#64748b', fontSize: 13 }}>Memuat Sistem Presensi Digital...</p>
        <div style={styles.progressBg}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <LogoSekolah />
            <h2 style={styles.loginTitle}>PRESENSI DIGITAL</h2>
            <p style={styles.loginSub}>SMK YPK MEDAN</p>
          </div>

          {loginError && <div style={styles.errorAlert}>{loginError}</div>}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={styles.label}>Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username" style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Password</label>
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" style={styles.input} />
            </div>
            <button type="submit" disabled={isLoggingIn} style={styles.btnPrimary}>
              {isLoggingIn ? 'Memproses...' : 'Masuk Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboard}>
      {/* HEADER UTAMA */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LogoSekolah />
          <div>
            <h1 style={styles.headerTitle}>SMK YPK MEDAN</h1>
            <p style={styles.headerSub}>Sistem Presensi Kartu Digital RFID | User: <b>{currentUser?.nama}</b></p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.print()} style={styles.btnSecondary}>🖨️ Cetak PDF</button>
          {!isRestrictedGuru && (
            <button onClick={() => setShowRegisterModal(true)} style={styles.btnPrimary}>➕ Registrasi Kartu</button>
          )}
          <button onClick={() => setIsLoggedIn(false)} style={styles.btnDanger}>Keluar</button>
        </div>
      </header>

      {/* CARDS STATISTIK HARI INI */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
          <span style={styles.statLabel}>Hadir Tepat Waktu</span>
          <span style={{ ...styles.statValue, color: '#10b981' }}>{statsHariIni.hadir}</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #f59e0b' }}>
          <span style={styles.statLabel}>Terlambat</span>
          <span style={{ ...styles.statValue, color: '#f59e0b' }}>{statsHariIni.telat}</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #ef4444' }}>
          <span style={styles.statLabel}>Belum Tap</span>
          <span style={{ ...styles.statValue, color: '#ef4444' }}>{statsHariIni.belumTap}</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #3b82f6' }}>
          <span style={styles.statLabel}>Total Siswa & Guru</span>
          <span style={{ ...styles.statValue, color: '#3b82f6' }}>{statsHariIni.totalSiswa}</span>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 Cari nama siswa, guru, atau kelas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* TABEL MASTER DATA */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>No</th>
              <th style={styles.th}>Nama Lengkap</th>
              <th style={styles.th}>Kelas / Jabatan</th>
              <th style={styles.th}>UID RFID</th>
              <th style={styles.th}>Status Hari Ini</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, idx) => {
              const cleanUid = normalizeUid(item.rfid_uid);
              const todayStr = new Date().toDateString();
              const todayLog = absensiLogs.find(
                (l) => new Date(l.created_at).toDateString() === todayStr && normalizeUid(l.rfid_uid) === cleanUid
              );

              return (
                <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td style={styles.td}>{idx + 1}</td>
                  <td style={{ ...styles.td, fontWeight: 'bold', color: '#1e293b' }}>{item.nama}</td>
                  <td style={styles.td}><span style={styles.badgeClass}>{item.kelas || '-'}</span></td>
                  <td style={styles.td}><code>{item.rfid_uid || 'BELUM TERDAFTAR'}</code></td>
                  <td style={styles.td}>
                    <span style={todayLog ? styles.badgeSuccess : styles.badgeMuted}>
                      {todayLog ? todayLog.status : 'Belum Tap'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL REGISTRASI KARTU */}
      {showRegisterModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ margin: 0, color: '#1e3a8a' }}>🎴 Registrasi Kartu Baru</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>Tautkan kartu RFID ke data siswa atau guru.</p>
            
            <div style={{ margin: '14px 0' }}>
              <label style={styles.label}>Pilih Target Personel:</label>
              <select value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)} style={styles.input}>
                <option value="">-- Pilih Nama --</option>
                {siswaList.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama} ({s.kelas})</option>
                ))}
              </select>
            </div>

            <div style={styles.tapBox}>
              <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>UID Kartu Scan:</p>
              <h2 style={{ margin: '6px 0', color: '#1e3a8a' }}>{scannedUid || 'Silakan Tap Kartu...'}</h2>
              <button onClick={() => setIsWaitingTap(!isWaitingTap)} style={styles.btnSecondary}>
                {isWaitingTap ? 'Stop Mode Scan' : 'Mulai Auto Scan'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={handleSaveRegisterCard} disabled={isUpdating} style={styles.btnPrimary}>Simpan Tautan</button>
              <button onClick={() => setShowRegisterModal(false)} style={styles.btnDanger}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  splashBg: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc' },
  progressBg: { width: 200, height: 6, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', backgroundColor: '#1e3a8a', transition: 'width 0.2s' },
  loginBg: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a' },
  loginCard: { width: 340, padding: 28, backgroundColor: '#ffffff', borderRadius: 16, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  loginTitle: { margin: '8px 0 0 0', fontSize: 18, color: '#1e3a8a', fontWeight: 'bold' },
  loginSub: { margin: 0, fontSize: 12, color: '#64748b' },
  errorAlert: { backgroundColor: '#fef2f2', color: '#dc2626', padding: 8, borderRadius: 6, fontSize: 12, marginBottom: 10 },
  label: { display: 'block', fontSize: 12, color: '#475569', fontWeight: 'bold', marginBottom: 4 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' },
  dashboard: { padding: 24, backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 20 },
  logoWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { margin: 0, fontSize: 18, color: '#1e3a8a', fontWeight: 'bold' },
  headerSub: { margin: '2px 0 0 0', fontSize: 12, color: '#64748b' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 },
  statCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  filterBar: { marginBottom: 16 },
  searchInput: { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: 13 },
  tableCard: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 },
  thRow: { backgroundColor: '#f1f5f9' },
  th: { padding: '12px 16px', color: '#475569', fontWeight: 'bold' },
  td: { padding: '12px 16px', borderTop: '1px solid #f1f5f9' },
  trEven: { backgroundColor: '#ffffff' },
  trOdd: { backgroundColor: '#f8fafc' },
  badgeClass: { backgroundColor: '#e2e8f0', color: '#334155', padding: '3px 8px', borderRadius: 6, fontSize: 11 },
  badgeSuccess: { backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' },
  badgeMuted: { backgroundColor: '#f1f5f9', color: '#94a3b8', padding: '4px 10px', borderRadius: 12, fontSize: 11 },
  btnPrimary: { backgroundColor: '#1e3a8a', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 12 },
  btnSecondary: { backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 12 },
  btnDanger: { backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 12 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#ffffff', padding: 24, borderRadius: 16, width: 380, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  tapBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 10, border: '1px dashed #cbd5e1', textAlign: 'center', margin: '10px 0' }
};
