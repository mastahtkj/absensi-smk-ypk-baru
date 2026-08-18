'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Swal from 'sweetalert2';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const normalizeUid = (uid) => (uid ? String(uid).trim().toUpperCase() : '');

const renderStatusBadge = (status = 'Hadir') => {
  const s = status.toUpperCase();
  if (s.includes('TELAT')) return <span style={styles.badgeTelat}>{status}</span>;
  if (s.includes('TANPA KARTU')) return <span style={styles.badgeTanpaKartu}>{status}</span>;
  if (s.includes('SAKIT')) return <span style={styles.badgeSakit}>{status}</span>;
  if (s.includes('IZIN')) return <span style={styles.badgeIzin}>{status}</span>;
  if (s.includes('ALPA')) return <span style={styles.badgeAlpha}>{status}</span>;
  return <span style={styles.badgeHadir}>{status}</span>;
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [siswaList, setSiswaList] = useState([]);
  const [absensiLogs, setAbsensiLogs] = useState([]);
  const [filterTingkat, setFilterTingkat] = useState('Semua Tingkat');
  const [filterPeriode, setFilterPeriode] = useState('hari');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingSiswa, setEditingSiswa] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editRfid, setEditRfid] = useState('');

  const [detailSiswa, setDetailSiswa] = useState(null);
  const [manualStatus, setManualStatus] = useState('Hadir (Tanpa Kartu)');
  const [isUpdating, setIsUpdating] = useState(false);

  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin' || currentUser?.username?.toLowerCase() === 'iqbal';

  const fetchInitialData = useCallback(async () => {
    try {
      const [{ data: siswaData }, { data: guruData }, { data: logs }] = await Promise.all([
        supabase.from('tb_siswa').select('*'),
        supabase.from('tb_guru').select('*'),
        supabase.from('absensi').select('*').order('created_at', { ascending: false })
      ]);

      const safeSiswa = Array.isArray(siswaData) ? siswaData : [];
      const safeGuru = Array.isArray(guruData) ? guruData : [];
      const safeLogs = Array.isArray(logs) ? logs : [];

      const siswaFormatted = safeSiswa.map((s) => ({
        id: s.id_siswa,
        rawId: s.id_siswa,
        nama: s.nama_siswa || '',
        kelas: s.kelas || '-',
        jurusan: s.jurusan || '',
        rfid_uid: s.uid_rfid || '',
        role: 'Siswa',
        isGuru: false
      }));

      const guruFormatted = safeGuru.map((g) => ({
        id: `GURU-${g.id_guru}`,
        rawId: g.id_guru,
        nama: g.nama_guru || '',
        kelas: 'Guru / Staff',
        jurusan: 'Guru / Staff',
        rfid_uid: g.uid_rfid || '',
        isGuru: true,
        role: g.role || 'Guru'
      }));

      let combinedList = [...siswaFormatted, ...guruFormatted];
      combinedList.sort((a, b) => (a.nama || '').localeCompare((b.nama || ''), 'id'));

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
    if (progress >= 100 && isMountedRef.current) {
      setLoading(false);
    }
  }, [progress]);

  const triggerRealtimePopup = useCallback((dataLog) => {
    try {
      if (typeof window === 'undefined') return;
      
      const isTargetGuru = dataLog.kelas === 'Guru / Staff';
      if (!isAdmin && isTargetGuru) return; 

      if (Swal.isVisible()) Swal.close();

      const statusText = dataLog.status || 'Hadir';
      const isTelat = statusText.toUpperCase().includes('TELAT');

      Swal.fire({
        title: `⚡ TAP RFID ${isTargetGuru ? 'GURU' : 'SISWA'}!`,
        html: `
          <div style="font-size: 14px; text-align: left;">
            <b>${dataLog.nama || 'Anggota'}</b><br/>
            <span style="color: #666; font-size: 12px;">Kelas/Jabatan: <b>${dataLog.kelas || '-'}</b></span><br/>
            <span style="color: ${isTelat ? '#d32f2f' : '#2e7d32'}; font-weight: bold;">Status: ${statusText}</span>
          </div>
        `,
        icon: isTelat ? 'warning' : 'success',
        timer: 3500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (err) {
      console.error(err);
    }
  }, [isAdmin]);

  const realtimeHandlersRef = useRef({ fetchInitialData, triggerRealtimePopup });
  useEffect(() => {
    realtimeHandlersRef.current = { fetchInitialData, triggerRealtimePopup };
  }, [fetchInitialData, triggerRealtimePopup]);

  useEffect(() => {
    fetchInitialData();
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'absensi' }, async (payload) => {
        const { fetchInitialData: refresh, triggerRealtimePopup: popUp } = realtimeHandlersRef.current;
        const freshData = await refresh();
        const currentSiswa = freshData?.combinedList || [];

        if (payload?.new) {
          const newRecord = payload.new;
          let displayName = newRecord.nama;
          let displayKelas = newRecord.kelas;

          if (!displayName || !displayKelas) {
            const cleanUid = normalizeUid(newRecord.rfid_uid);
            const localMatched = currentSiswa.find((s) => normalizeUid(s.rfid_uid) === cleanUid);
            if (localMatched) {
              displayName = localMatched.nama;
              displayKelas = localMatched.kelas;
            }
          }

          popUp({
            nama: displayName || 'Siswa / Guru',
            kelas: displayKelas || '-',
            status: newRecord.status || 'Hadir'
          });
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { data: guru, error } = await supabase
        .from('tb_guru')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password.trim())
        .maybeSingle();

      if (error || !guru) {
        if (isMountedRef.current) setLoginError('Username atau password salah!');
      } else {
        const userData = { 
          id: guru.id_guru, 
          nama: guru.nama_guru || guru.username, 
          username: guru.username, 
          role: (guru.role || 'guru').toLowerCase() 
        };
        if (isMountedRef.current) {
          setCurrentUser(userData);
          setIsLoggedIn(true);
        }
        localStorage.setItem('user_guru', JSON.stringify(userData));
        Swal.fire({ icon: 'success', title: 'Login Berhasil', text: `Selamat datang, ${userData.nama}`, timer: 1500, showConfirmButton: false });
      }
    } catch (err) {
      if (isMountedRef.current) setLoginError('Terjadi kesalahan koneksi.');
    } finally {
      if (isMountedRef.current) setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_guru');
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const handleSaveManualAbsensi = async () => {
    if (!detailSiswa) return;
    setIsUpdating(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const statusFormatted = `${manualStatus} (Diubah oleh: ${currentUser?.nama || 'Guru'})`;

      const { data: existing } = await supabase
        .from('absensi')
        .select('id')
        .eq('nama', detailSiswa.nama)
        .gte('created_at', `${todayStr}T00:00:00+07:00`)
        .maybeSingle();

      if (existing) {
        await supabase.from('absensi').update({ status: statusFormatted }).eq('id', existing.id);
      } else {
        await supabase.from('absensi').insert([{
          rfid_uid: detailSiswa.rfid_uid || 'MANUAL_ENTRY',
          nama: detailSiswa.nama,
          kelas: detailSiswa.kelas || '-',
          status: statusFormatted,
          wa_sent: false
        }]);
      }

      Swal.fire({ icon: 'success', title: 'Status Diperbarui!', timer: 1500, showConfirmButton: false });
      await fetchInitialData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSiswaOrGuru = async (item) => {
    if (!isAdmin) return;

    const res = await Swal.fire({
      title: 'Hapus Data?',
      text: `Apakah Anda yakin ingin menghapus "${item.nama}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    });

    if (res.isConfirmed) {
      try {
        if (item.isGuru) {
          await supabase.from('tb_guru').delete().eq('id_guru', item.rawId);
        } else {
          await supabase.from('tb_siswa').delete().eq('id_siswa', item.id);
        }
        Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1500, showConfirmButton: false });
        await fetchInitialData();
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
      }
    }
  };

  const filteredLogs = useMemo(() => {
    const now = new Date();
    return absensiLogs.filter((log) => {
      const logDate = new Date(log.created_at);
      if (isNaN(logDate.getTime())) return false;

      if (filterPeriode === 'hari') {
        return logDate.toDateString() === now.toDateString();
      } else if (filterPeriode === 'minggu') {
        const diffTime = Math.abs(now - logDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 7;
      } else if (filterPeriode === 'bulan') {
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [absensiLogs, filterPeriode]);

  const filteredData = useMemo(() => {
    let list = [...siswaList];
    if (filterTingkat !== 'Semua Tingkat') {
      if (filterTingkat === 'Kelas X') list = list.filter((s) => s.kelas.startsWith('X '));
      else if (filterTingkat === 'Kelas XI') list = list.filter((s) => s.kelas.startsWith('XI '));
      else if (filterTingkat === 'Kelas XII') list = list.filter((s) => s.kelas.startsWith('XII '));
      else if (filterTingkat === 'Guru / Staff') list = list.filter((s) => s.isGuru);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.nama.toLowerCase().includes(q) || s.kelas.toLowerCase().includes(q));
    }
    return list;
  }, [siswaList, filterTingkat, searchQuery]);

  if (loading || !hasMounted) {
    return (
      <div style={styles.splashBg}>
        <div style={styles.splashCard}>
          <img src="/logo.png" alt="Logo" style={styles.splashLogoImg} />
          <h2 style={styles.splashTitle}>SISTEM PRESENSI DIGITAL RFID &amp; NFC</h2>
          <p style={styles.splashSubtitlePrimary}>SMK BISA YPK LUAR BIASA</p>
          <p style={styles.splashSubtitleSecondary}>TJKT PROJECT&apos;S</p>
          <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${progress}%` }} /></div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={styles.loginBg}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img src="/logo.png" alt="Logo" style={styles.loginLogoImg} />
            <h1 style={styles.loginTitle}>PORTAL PRESENSI DIGITAL SMK YPK MEDAN</h1>
            <p style={styles.loginSubtitlePrimary}>SMK BISA ! YPK LUAR BIASA</p>
          </div>
          {loginError && <div style={styles.errorAlert}>{loginError}</div>}
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input type="text" placeholder="Username" required value={username} onChange={(e) => setUsername(e.target.value)} style={styles.input} />
            <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
            <button type="submit" disabled={isLoggingIn} style={styles.btnLogin}>{isLoggingIn ? 'Memproses...' : 'Masuk Portal'}</button>
            <p style={styles.loginSubtitleSecondary}>TJKT PROJECT&apos;S</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      {/* HEADER UTAMA */}
      <header style={styles.header} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Logo" style={styles.headerLogoImg} />
          <div>
            <h1 style={styles.headerTitle}>PRESENSI DIGITAL SMK YPK MEDAN</h1>
            <p style={styles.headerSubtitle}>User: <b>{currentUser?.nama}</b> ({isAdmin ? 'ADMINISTRATOR' : 'GURU'})</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => window.print()} style={styles.btnPdf}>🖨️ Cetak Rekap PDF</button>
          {isAdmin && (
            <button onClick={() => setShowRegisterModal(true)} style={styles.btnRegister}>➕ Registrasi RFID</button>
          )}
          <button onClick={handleLogout} style={styles.btnLogout}>🚪 Keluar</button>
        </div>
      </header>

      {/* KOP SURAT RESMI (KHUSUS CETAK/PDF) */}
      <div className="print-only" style={styles.kopSurat}>
        <img src="/logo.png" alt="Logo" style={styles.kopLogo} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>YAYASAN PENDIDIKAN KELUARGA (YPK) MEDAN</h2>
          <h1 style={{ margin: '2px 0', fontSize: '22px', color: '#e65100', fontWeight: 'bold' }}>SMK YPK MEDAN</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#333' }}>Jl. Menteng Raya No.158, Medan, Sumatera Utara</p>
          <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>Email: smkypkmedan@sch.id | Website: www.smkypkmedan.sch.id</p>
        </div>
      </div>
      <div className="print-only" style={styles.kopGaris}></div>

      {/* FILTER BAR */}
      <div style={styles.filterCard} className="no-print">
        <div style={styles.filterGrid}>
          <div>
            <label style={styles.filterLabel}>Periode Rekap Log:</label>
            <select value={filterPeriode} onChange={(e) => setFilterPeriode(e.target.value)} style={styles.selectInput}>
              <option value="hari">📅 Rekap Hari Ini</option>
              <option value="minggu">📅 Rekap Minggu Ini (7 Hari)</option>
              <option value="bulan">📅 Rekap Bulan Ini</option>
            </select>
          </div>
          <div>
            <label style={styles.filterLabel}>Cari Nama/Kelas:</label>
            <input type="text" placeholder="Ketik nama..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
          </div>
        </div>
      </div>

      {/* TABEL DATA ANGGOTA */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeaderInfo}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>📋 Master Data Siswa &amp; Guru ({filteredData.length})</h3>
        </div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>No</th>
              <th style={styles.th}>Nama Lengkap</th>
              <th style={styles.th}>Kelas / Status</th>
              <th style={styles.th}>UID RFID</th>
              <th style={styles.th}>Status Hari Ini</th>
              <th style={styles.th} className="no-print">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, idx) => {
              const todayStr = new Date().toDateString();
              const todayLog = absensiLogs.find(log => new Date(log.created_at).toDateString() === todayStr && log.nama === item.nama);
              return (
                <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td style={styles.td}>{idx + 1}</td>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.nama}</td>
                  <td style={styles.td}>{item.kelas}</td>
                  <td style={styles.td}><code>{item.rfid_uid || 'BELUM ADA'}</code></td>
                  <td style={styles.td}>{todayLog ? renderStatusBadge(todayLog.status) : <span style={styles.badgeAlpha}>Belum Tap</span>}</td>
                  <td style={styles.td} className="no-print">
                    <button onClick={() => setDetailSiswa(item)} style={styles.btnDetailOutline}>👁️ Status</button>
                    {isAdmin && (
                      <>
                        <button onClick={() => { setEditingSiswa(item); setEditNama(item.nama); setEditKelas(item.kelas); setEditRfid(item.rfid_uid); }} style={styles.btnEditOutline}>✏️ Edit</button>
                        <button onClick={() => handleDeleteSiswaOrGuru(item)} style={styles.btnDeleteOutline}>🗑️ Hapus</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AREA TANDA TANGAN UNTUK REKAP PDF/PRINT */}
      <div className="print-only" style={styles.ttdContainer}>
        <div style={styles.ttdBox}>
          <p>Mengetahui,</p>
          <p style={{ fontWeight: 'bold' }}>Kepala Sekolah SMK YPK Medan</p>
          <br /><br /><br />
          <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Hartati Patiwael, S.Si</p>
          <p>NIP. -</p>
        </div>
        <div style={styles.ttdBox}>
          <p>Medan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style={{ fontWeight: 'bold' }}>Guru / Petugas Presensi</p>
          <br /><br /><br />
          <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{currentUser?.nama || 'Petugas'}</p>
          <p>NIP/ID. {currentUser?.id || '-'}</p>
        </div>
      </div>

      {/* MODAL UPDATE STATUS / AUDIT GURU (MAKSIMAL 8 PERUBAHAN TERCATAT) */}
      {detailSiswa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Update Status &amp; Tracking Log Guru</h3>
            <p><b>Anggota:</b> {detailSiswa.nama}</p>
            <div style={{ margin: '10px 0' }}>
              <select value={manualStatus} onChange={(e) => setManualStatus(e.target.value)} style={styles.input}>
                <option value="Hadir (Tanpa Kartu)">Hadir (Tanpa Kartu)</option>
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option>
                <option value="Alpa">Alpa</option>
              </select>
              <button onClick={handleSaveManualAbsensi} style={{ ...styles.btnSaveModal, marginTop: '8px' }}>Simpan Status</button>
            </div>
            <h4>Riwayat Perubahan (Max 8 Guru Terakhir):</h4>
            <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '12px' }}>
              {absensiLogs.filter(l => l.nama === detailSiswa.nama).slice(0, 8).map((l, i) => (
                <div key={i} style={{ borderBottom: '1px solid #eee', padding: '4px 0' }}>
                  <span>{new Date(l.created_at).toLocaleTimeString('id-ID')} - Status: {l.status}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setDetailSiswa(null)} style={{ ...styles.btnCancelModal, marginTop: '12px', width: '100%' }}>Tutup</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: flex !important; }
          body { background: white !important; padding: 0 !important; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}

const styles = {
  splashBg: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#e65100', fontFamily: 'sans-serif' },
  splashCard: { textAlign: 'center', padding: '30px', borderRadius: '12px', backgroundColor: '#fff', width: '320px' },
  splashLogoImg: { width: '70px' },
  splashTitle: { fontSize: '14px', color: '#e65100' },
  splashSubtitlePrimary: { fontSize: '12px', fontWeight: 'bold' },
  splashSubtitleSecondary: { fontSize: '10px', color: '#888' },
  progressBarBg: { width: '100%', height: '6px', backgroundColor: '#eee', borderRadius: '3px' },
  progressBarFill: { height: '100%', backgroundColor: '#e65100' },

  loginBg: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif' },
  loginCard: { width: '320px', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  loginLogoImg: { width: '60px' },
  loginTitle: { fontSize: '14px', color: '#e65100' },
  loginSubtitlePrimary: { fontSize: '12px', fontWeight: 'bold' },
  loginSubtitleSecondary: { fontSize: '10px', color: '#888', marginTop: '10px', textAlign: 'center' },
  errorAlert: { color: 'red', fontSize: '12px', marginBottom: '8px' },
  input: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  btnLogin: { width: '100%', padding: '10px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },

  dashboardContainer: { padding: '20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px' },
  headerLogoImg: { width: '40px' },
  headerTitle: { margin: 0, fontSize: '16px', color: '#e65100' },
  headerSubtitle: { margin: 0, fontSize: '12px', color: '#555' },
  btnPdf: { backgroundColor: '#0288d1', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' },
  btnRegister: { backgroundColor: '#e65100', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' },
  btnLogout: { backgroundColor: '#c62828', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' },

  filterCard: { backgroundColor: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '16px' },
  filterGrid: { display: 'flex', gap: '16px' },
  filterLabel: { display: 'block', fontSize: '12px', fontWeight: 'bold' },
  selectInput: { padding: '6px', borderRadius: '6px', border: '1px solid #ccc' },
  searchInput: { padding: '6px', borderRadius: '6px', border: '1px solid #ccc', width: '200px' },

  tableCard: { backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' },
  tableHeaderInfo: { padding: '12px', backgroundColor: '#fafafa', borderBottom: '1px solid #eee' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  thRow: { backgroundColor: '#fff3e0' },
  th: { padding: '10px', textAlign: 'left', color: '#e65100' },
  td: { padding: '10px', borderBottom: '1px solid #eee' },
  trEven: { backgroundColor: '#fff' },
  trOdd: { backgroundColor: '#fafafa' },

  badgeHadir: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '4px' },
  badgeTelat: { backgroundColor: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: '4px' },
  badgeTanpaKartu: { backgroundColor: '#e1f5fe', color: '#0288d1', padding: '2px 8px', borderRadius: '4px' },
  badgeSakit: { backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px' },
  badgeIzin: { backgroundColor: '#f3e5f5', color: '#7b1fa2', padding: '2px 8px', borderRadius: '4px' },
  badgeAlpha: { backgroundColor: '#ffebee', color: '#c62828', padding: '2px 8px', borderRadius: '4px' },

  btnDetailOutline: { border: '1px solid #e65100', color: '#e65100', background: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' },
  btnEditOutline: { border: '1px solid #0288d1', color: '#0288d1', background: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' },
  btnDeleteOutline: { border: '1px solid #c62828', color: '#c62828', background: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },

  kopSurat: { display: 'flex', alignItems: 'center', marginBottom: '10px' },
  kopLogo: { width: '80px', height: '80px', marginRight: '15px' },
  kopGaris: { borderBottom: '3px solid black', marginBottom: '20px' },

  ttdContainer: { justifyContent: 'space-between', marginTop: '40px', padding: '0 30px' },
  ttdBox: { textAlign: 'center', width: '220px', fontSize: '12px' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '350px' },
  btnSaveModal: { width: '100%', padding: '8px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  btnCancelModal: { padding: '8px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }
};
