'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Swal from 'sweetalert2';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RESTRICTED_GURU_IDS = [30, 31, 32, 33, 34];

const REGEX_KELAS_X = /^\s*X(?![I|i])[\s\-\.]?/i;
const REGEX_KELAS_XI = /^\s*XI(?![I|i])[\s\-\.]?/i;
const REGEX_KELAS_XII = /^\s*XII[\s\-\.]?/i;

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
  const [searchQuery, setSearchQuery] = useState('');

  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [detailSiswa, setDetailSiswa] = useState(null);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerType, setRegisterType] = useState('siswa');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalFilterKelas, setModalFilterKelas] = useState('Semua Kelas');
  const [modalFilterJurusan, setModalFilterJurusan] = useState('Semua Jurusan');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [isWaitingTap, setIsWaitingTap] = useState(false);
  const [scannedUid, setScannedUid] = useState('');

  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isMasterIqbal = currentUser?.username?.toLowerCase() === 'iqbal' || currentUser?.role === 'admin';
  const isRestrictedGuru = !isMasterIqbal && currentUser && RESTRICTED_GURU_IDS.includes(Number(currentUser.id));

  const baseTingkatOptions = useMemo(() => [
    { label: 'Semua Tingkat', icon: '🎓' },
    { label: 'Kelas X', icon: '🎒' },
    { label: 'Kelas XI', icon: '📚' },
    { label: 'Kelas XII', icon: '🏆' },
    { label: 'Guru / Staff', icon: '👨‍🏫' },
  ], []);

  const tingkatOptions = useMemo(() => baseTingkatOptions, [baseTingkatOptions]);

  const baseJurusanOptions = useMemo(() => [
    { label: 'Semua Jurusan', icon: '🏫' },
    { label: 'Teknik Jaringan Komputer dan Telekomunikasi', icon: '💻' },
    { label: 'Akuntansi dan Keuangan Lembaga', icon: '📊' },
    { label: 'Manajemen Perkantoran dan Layanan Bisnis', icon: '💼' },
    { label: 'Pemasaran', icon: '📢' },
    { label: 'Guru / Staff', icon: '👨‍🏫' },
  ], []);

  const jurusanOptions = useMemo(() => baseJurusanOptions, [baseJurusanOptions]);

  // FETCH DATA INITIAL & CLEANUP DUPLIKAT
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

      // Mencegah Duplikasi Nama Guru/Staff yang bertuliskan MASTER'K
      const guruFormatted = safeGuru.map((g) => ({
        id: `GURU-${g.id}`,
        rawId: g.id,
        nama: g.nama || '',
        kelas: 'Guru / Staff',
        jurusan: 'Guru / Staff',
        rfid_uid: g.rfid_uid || null,
        isGuru: true,
        role: g.role
      }));

      const combinedList = [...safeCards, ...guruFormatted];

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
      setProgress((prev) => (prev >= 100 ? 100 : prev + 4));
    }, 100);

    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user_guru');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (isMountedRef.current && parsed) {
            setCurrentUser(parsed);
            setIsLoggedIn(true);
          }
        } catch (e) {
          localStorage.removeItem('user_guru');
        }
      }
    }
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) setLoading(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [progress]);

  // POLLING REALTIME TAP UNTUK REGISTRASI
  useEffect(() => {
    let intervalId;
    if (showRegisterModal && isWaitingTap) {
      intervalId = setInterval(async () => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;
        try {
          const { data: latestScan } = await supabase
            .from('latest_scan')
            .select('uid')
            .eq('id', 1)
            .maybeSingle();

          if (isMountedRef.current && latestScan?.uid) {
            setScannedUid((prev) => (prev !== latestScan.uid ? latestScan.uid : prev));
          }
        } catch (err) {
        } finally {
          isPollingRef.current = false;
        }
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
      isPollingRef.current = false;
    };
  }, [showRegisterModal, isWaitingTap]);

  const triggerRealtimePopup = useCallback((dataLog) => {
    try {
      if (typeof window === 'undefined') return;
      if (Swal.isVisible()) Swal.close();
      Swal.fire({
        title: '⚡ TAP RFID TERDETEKSI!',
        html: `
          <div style="font-size: 14px; text-align: left;">
            <b>${dataLog.nama || 'Siswa / Guru'}</b><br/>
            <span style="color: #666; font-size: 12px;">Kelas/Jabatan: <b>${dataLog.kelas || '-'}</b></span><br/>
            <span style="color: #2e7d32; font-weight: bold; font-size: 13px;">Status: ${dataLog.status || 'Hadir'}</span>
          </div>
        `,
        icon: 'success',
        timer: 3500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchInitialData();
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'absensi' }, async (payload) => {
        await fetchInitialData();
        if (payload?.new) {
          triggerRealtimePopup({
            nama: payload.new.nama,
            kelas: payload.new.kelas,
            status: payload.new.status
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData, triggerRealtimePopup]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { data: guru } = await supabase
        .from('guru')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password.trim())
        .maybeSingle();

      if (!guru) {
        if (isMountedRef.current) setLoginError('Username atau password salah!');
      } else {
        const userData = { id: guru.id, nama: guru.nama, username: guru.username, role: guru.role || 'guru' };
        if (isMountedRef.current) {
          setCurrentUser(userData);
          setIsLoggedIn(true);
        }
        if (rememberMe) localStorage.setItem('user_guru', JSON.stringify(userData));
      }
    } catch (err) {
      if (isMountedRef.current) setLoginError('Gagal terhubung ke database.');
    } finally {
      if (isMountedRef.current) setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('user_guru');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const handleSaveRegisterCard = async () => {
    if (!selectedTarget) {
      Swal.fire({ icon: 'warning', title: 'Pilih Target', text: 'Pilih nama terlebih dahulu!' });
      return;
    }
    if (!scannedUid) {
      Swal.fire({ icon: 'warning', title: 'UID Kosong', text: 'Silakan tap kartu RFID!' });
      return;
    }
    setIsUpdating(true);
    const cleanUid = scannedUid.trim().toUpperCase();

    try {
      const targetObj = siswaList.find((s) => String(s.id) === String(selectedTarget));
      const isTargetGuru = targetObj?.isGuru;
      const targetDbId = targetObj?.rawId || String(targetObj?.id);

      if (isTargetGuru) {
        await supabase.from('guru').update({ rfid_uid: cleanUid }).eq('id', targetDbId);
      } else {
        await supabase.from('rfid_cards').update({ rfid_uid: cleanUid }).eq('id', targetDbId);
      }

      Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Kartu (${cleanUid}) berhasil ditautkan!`, timer: 2000, showConfirmButton: false });
      setShowRegisterModal(false);
      setSelectedTarget('');
      setScannedUid('');
      await fetchInitialData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan sistem.' });
    } finally {
      if (isMountedRef.current) setIsUpdating(false);
    }
  };

  // FILTER UTMA DENGAN PENGECEKAN LENGKAP PADA JURUSAN DAN KELAS
  const filteredData = useMemo(() => {
    let list = [...siswaList];

    if (filterTingkat !== 'Semua Tingkat') {
      if (filterTingkat === 'Kelas X') list = list.filter((s) => REGEX_KELAS_X.test(s.kelas || ''));
      else if (filterTingkat === 'Kelas XI') list = list.filter((s) => REGEX_KELAS_XI.test(s.kelas || ''));
      else if (filterTingkat === 'Kelas XII') list = list.filter((s) => REGEX_KELAS_XII.test(s.kelas || ''));
      else if (filterTingkat === 'Guru / Staff') list = list.filter((s) => s.isGuru || s.kelas === 'Guru / Staff');
    }

    if (filterJurusan !== 'Semua Jurusan') {
      if (filterJurusan === 'Guru / Staff') {
        list = list.filter((s) => s.isGuru || s.kelas === 'Guru / Staff');
      } else {
        const qJ = filterJurusan.toLowerCase();
        list = list.filter((s) => 
          (s.jurusan || '').toLowerCase().includes(qJ) || 
          (s.kelas || '').toLowerCase().includes(qJ)
        );
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => (s.nama || '').toLowerCase().includes(q) || (s.kelas || '').toLowerCase().includes(q));
    }

    return list;
  }, [siswaList, filterTingkat, filterJurusan, searchQuery]);

  // FILTER MODAL REGISTRASI DENGAN FITUR PENCARIAN KELAS & JURUSAN
  const filteredRegisterList = useMemo(() => {
    return siswaList.filter((item) => {
      const isGuru = item.isGuru || String(item.id).startsWith('GURU-');
      if (registerType === 'siswa' && isGuru) return false;
      if (registerType === 'guru' && !isGuru) return false;

      if (registerType === 'siswa') {
        if (modalFilterKelas !== 'Semua Kelas' && !item.kelas?.includes(modalFilterKelas)) return false;
        if (modalFilterJurusan !== 'Semua Jurusan' && !item.jurusan?.toLowerCase().includes(modalFilterJurusan.toLowerCase()) && !item.kelas?.toLowerCase().includes(modalFilterJurusan.toLowerCase())) return false;
      }

      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        return (item.nama || '').toLowerCase().includes(q) || (item.kelas || '').toLowerCase().includes(q);
      }

      return true;
    });
  }, [siswaList, registerType, modalSearchQuery, modalFilterKelas, modalFilterJurusan]);

  if (loading || !hasMounted) {
    return (
      <div style={styles.splashBg}>
        <div style={styles.splashCard}>
          <div style={styles.splashLogo}>🏫</div>
          <h2 style={styles.splashTitle}>SISTEM PRESENSI RFID</h2>
          <p style={styles.splashSubtitle}>SMK YPK MEDAN</p>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
          </div>
          <p style={styles.splashPercent}>{Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={styles.loginIcon}>🔐</div>
            <h1 style={styles.loginTitle}>PORTAL GURU & ADMIN</h1>
            <p style={styles.loginSubtitle}>Silakan masuk untuk mengelola data presensi</p>
          </div>
          {loginError && <div style={styles.errorAlert}>{loginError}</div>}
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.label}>Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
            </div>
            <button type="submit" disabled={isLoggingIn} style={styles.btnLogin}>
              {isLoggingIn ? 'Memproses...' : 'Masuk Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={styles.headerLogo}>🏫</div>
          <div>
            <h1 style={styles.headerTitle}>PRESENSI DIGITAL SMK YPK MEDAN</h1>
            <p style={styles.headerSubtitle}>Selamat Datang, <b>{currentUser?.nama}</b></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowRegisterModal(true)} style={styles.btnRegister}>➕ Registrasi Kartu</button>
          <button onClick={handleLogout} style={styles.btnLogout}>🚪 Keluar</button>
        </div>
      </header>

      {/* FILTER BAR UTAMA */}
      <div style={styles.filterCard}>
        <div style={styles.filterGrid}>
          <div>
            <label style={styles.filterLabel}>Filter Tingkat:</label>
            <select value={filterTingkat} onChange={(e) => setFilterTingkat(e.target.value)} style={styles.selectInput}>
              {tingkatOptions.map((opt) => (<option key={opt.label} value={opt.label}>{opt.icon} {opt.label}</option>))}
            </select>
          </div>
          <div>
            <label style={styles.filterLabel}>Filter Jurusan:</label>
            <select value={filterJurusan} onChange={(e) => setFilterJurusan(e.target.value)} style={styles.selectInput}>
              {jurusanOptions.map((opt) => (<option key={opt.label} value={opt.label}>{opt.icon} {opt.label}</option>))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.filterLabel}>Cari Nama / Kelas:</label>
            <input type="text" placeholder="Ketik nama atau kelas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
          </div>
        </div>
      </div>

      {/* TABEL DATA */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeaderInfo}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>📋 Data Anggota & Kartu RFID ({filteredData.length})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>No</th>
                <th style={styles.th}>Nama Lengkap</th>
                <th style={styles.th}>Kelas / Jabatan</th>
                <th style={styles.th}>UID RFID</th>
                <th style={styles.th}>Status Kartu</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={5} style={styles.tdEmpty}>Data tidak ditemukan.</td></tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.nama}</td>
                    <td style={styles.td}><span style={styles.badgeClass}>{item.kelas || '-'}</span></td>
                    <td style={styles.td}><code style={styles.codeUid}>{item.rfid_uid || 'BELUM TERDAFTAR'}</code></td>
                    <td style={styles.td}>
                      {item.rfid_uid ? <span style={styles.badgeHadir}>TERTAUT</span> : <span style={styles.badgeAlpha}>BELUM ADA</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRASI DENGAN DUA FILTER TAMBAHAN (KELAS & JURUSAN) */}
      {showRegisterModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#e65100' }}>🎴 Registrasi Kartu RFID Baru</h3>
              <button onClick={() => setShowRegisterModal(false)} style={styles.btnCloseModal}>✕</button>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={styles.tabContainer}>
                <button onClick={() => setRegisterType('siswa')} style={registerType === 'siswa' ? styles.tabActive : styles.tabInactive}>🎒 Siswa</button>
                <button onClick={() => setRegisterType('guru')} style={registerType === 'guru' ? styles.tabActive : styles.tabInactive}>👨‍🏫 Guru / Staff</button>
              </div>

              {registerType === 'siswa' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <select value={modalFilterKelas} onChange={(e) => setModalFilterKelas(e.target.value)} style={{ ...styles.input, flex: 1 }}>
                    <option value="Semua Kelas">Semua Tingkat</option>
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                  <select value={modalFilterJurusan} onChange={(e) => setModalFilterJurusan(e.target.value)} style={{ ...styles.input, flex: 1 }}>
                    <option value="Semua Jurusan">Semua Jurusan</option>
                    <option value="Teknik Jaringan">TJKT</option>
                    <option value="Akuntansi">AKL</option>
                    <option value="Manajemen">MPLB</option>
                    <option value="Pemasaran">Pemasaran</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <input type="text" placeholder="Fast Search Nama Siswa / Guru..." value={modalSearchQuery} onChange={(e) => setModalSearchQuery(e.target.value)} style={styles.input} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Pilih Target ({filteredRegisterList.length} Ditemukan):</label>
                <select value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)} style={styles.input}>
                  <option value="">-- Pilih Target --</option>
                  {filteredRegisterList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama} ({item.kelas || '-'}) {item.rfid_uid ? `[UID: ${item.rfid_uid}]` : '[Belum ada UID]'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.tapBox}>
                <div style={styles.uidDisplay}>{scannedUid ? `UID: ${scannedUid}` : 'Belum Ada Tap'}</div>
                <button type="button" onClick={() => setIsWaitingTap(!isWaitingTap)} style={isWaitingTap ? styles.btnCancelTap : styles.btnStartTap}>
                  {isWaitingTap ? '⏹ Stop Polling' : '📡 Mulai Mode Scan RFID'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={handleSaveRegisterCard} disabled={isUpdating} style={styles.btnSaveModal}>
                  {isUpdating ? 'Memproses...' : '💾 Simpan Tautan Kartu'}
                </button>
                <button onClick={() => setShowRegisterModal(false)} style={styles.btnCancelModal}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  splashBg: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#fff3e0' },
  splashCard: { textAlign: 'center', padding: '40px', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '320px' },
  splashLogo: { fontSize: '50px', marginBottom: '10px' },
  splashTitle: { margin: 0, fontSize: '18px', color: '#e65100', fontWeight: 'bold' },
  splashSubtitle: { margin: '4px 0 20px 0', fontSize: '12px', color: '#777' },
  progressBarBg: { width: '100%', height: '8px', backgroundColor: '#ffe0b2', borderRadius: '4px', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#e65100', transition: 'width 0.2s' },
  splashPercent: { marginTop: '8px', fontSize: '12px', color: '#e65100', fontWeight: 'bold' },
  loginBg: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#fff8e1' },
  loginCard: { width: '100%', maxWidth: '380px', padding: '30px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' },
  loginIcon: { fontSize: '40px', marginBottom: '8px' },
  loginTitle: { margin: 0, fontSize: '18px', color: '#333' },
  loginSubtitle: { margin: '4px 0 0 0', fontSize: '12px', color: '#777' },
  errorAlert: { backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', textAlign: 'center' },
  label: { display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 'bold' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box' },
  btnLogin: { width: '100%', padding: '12px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  dashboardContainer: { minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' },
  headerLogo: { fontSize: '32px' },
  headerTitle: { margin: 0, fontSize: '18px', color: '#e65100' },
  headerSubtitle: { margin: '2px 0 0 0', fontSize: '12px', color: '#666' },
  btnRegister: { backgroundColor: '#e65100', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnLogout: { backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  filterCard: { backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' },
  filterGrid: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterLabel: { display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' },
  selectInput: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px', minWidth: '180px' },
  searchInput: { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box' },
  tableCard: { backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' },
  tableHeaderInfo: { padding: '16px', borderBottom: '1px solid #eee' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  thRow: { backgroundColor: '#fff3e0' },
  th: { padding: '12px 16px', color: '#e65100', fontWeight: 'bold', borderBottom: '1px solid #ffe0b2' },
  td: { padding: '12px 16px', borderBottom: '1px solid #eee' },
  tdEmpty: { padding: '24px', textAlign: 'center', color: '#888' },
  trEven: { backgroundColor: '#ffffff' },
  trOdd: { backgroundColor: '#fafafa' },
  codeUid: { backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' },
  badgeHadir: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeAlpha: { backgroundColor: '#ffebee', color: '#c62828', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeClass: { backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#555' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#ffffff', width: '100%', maxWidth: '450px', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnCloseModal: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' },
  tabContainer: { display: 'flex', gap: '8px', marginBottom: '14px' },
  tabActive: { flex: 1, padding: '8px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' },
  tabInactive: { flex: 1, padding: '8px', backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  tapBox: { backgroundColor: '#fff8e1', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px dashed #ffe0b2' },
  uidDisplay: { fontSize: '16px', fontWeight: 'bold', color: '#e65100', margin: '6px 0 10px 0', fontFamily: 'monospace' },
  btnStartTap: { backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  btnCancelTap: { backgroundColor: '#c62828', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  btnSaveModal: { flex: 1, padding: '10px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnCancelModal: { padding: '10px 16px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', color: '#555' }
};
