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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [siswaList, setSiswaList] = useState([]);
  const [absensiLogs, setAbsensiLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
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

  // Modal Registrasi
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerMode, setRegisterMode] = useState('single');
  const [registerType, setRegisterType] = useState('siswa');
  const [modalFilterTingkat, setModalFilterTingkat] = useState('Semua Tingkat');
  const [modalFilterJurusan, setModalFilterJurusan] = useState('Semua Jurusan');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [isWaitingTap, setIsWaitingTap] = useState(false);
  const [scannedUid, setScannedUid] = useState('');

  // Mode Daftar Cepat
  const [fastIndex, setFastIndex] = useState(0);
  const [registeredHistory, setRegisteredHistory] = useState([]);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);

  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);
  const lastProcessedUidRef = useRef('');

  useEffect(() => {
    isMountedRef.current = true;
    setHasMounted(true);
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log_presensi')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) setAuditLogs(data);
    } catch (e) {
      console.error('Audit log fetch error:', e);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const [{ data: siswaData, error: errSiswa }, { data: guruData, error: errGuru }, { data: logs, error: errLogs }] = await Promise.all([
        supabase.from('tb_siswa').select('*'),
        supabase.from('tb_guru').select('*'),
        supabase.from('absensi').select('*').order('created_at', { ascending: false })
      ]);

      if (errSiswa) console.error('Siswa error:', errSiswa);
      if (errGuru) console.error('Guru error:', errGuru);
      if (errLogs) console.error('Logs error:', errLogs);

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
        no_wa_pribadi: s.no_wa_pribadi,
        no_wa_ortu: s.no_wa_ortu,
        role: s.role || 'Siswa',
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

      const combinedList = [...guruFormatted.sort((a, b) => a.nama.localeCompare(b.nama)), ...siswaFormatted.sort((a, b) => a.nama.localeCompare(b.nama))];

      if (isMountedRef.current) {
        setSiswaList(combinedList);
        setAbsensiLogs(safeLogs);
      }
      await fetchAuditLogs();
      return { combinedList, logs: safeLogs };
    } catch (err) {
      console.error('Error fetching data:', err);
      return { combinedList: [], logs: [] };
    }
  }, [fetchAuditLogs]);

  useEffect(() => {
    const totalDuration = 5000;
    const intervalTime = 100;
    const step = 100 / (totalDuration / intervalTime);

    const timer = setInterval(() => {
      if (!isMountedRef.current) return;
      setProgress((prev) => Math.min(prev + step, 100));
    }, intervalTime);

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

  const filteredLogs = useMemo(() => {
    const now = new Date();
    return absensiLogs.filter((log) => {
      const logDate = new Date(log.created_at);
      if (isNaN(logDate.getTime())) return false;

      if (filterPeriode === 'hari') {
        return logDate.toDateString() === now.toDateString();
      } else if (filterPeriode === 'minggu') {
        const diffTime = Math.abs(now - logDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (filterPeriode === 'bulan') {
        return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [absensiLogs, filterPeriode]);

  // Rekap Log Khusus Guru (Hari Ini)
  const guruLogsToday = useMemo(() => {
    const today = new Date().toDateString();
    return absensiLogs.filter(log => {
      const isGuru = log.kelas === 'Guru / Staff' || String(log.rfid_uid).startsWith('GURU');
      const isToday = new Date(log.created_at).toDateString() === today;
      return isGuru && isToday;
    });
  }, [absensiLogs]);

  // Hitung Persentase Kehadiran Harian Khusus Siswa
  const siswaStatsToday = useMemo(() => {
    const today = new Date().toDateString();
    const totalSiswa = siswaList.filter(s => !s.isGuru).length;
    
    const siswaLogsToday = absensiLogs.filter(log => {
      const isToday = new Date(log.created_at).toDateString() === today;
      const isGuru = log.kelas === 'Guru / Staff';
      return isToday && !isGuru;
    });

    const hadirCount = siswaLogsToday.filter(l => {
      const s = (l.status || '').toUpperCase();
      return !s.includes('SAKIT') && !s.includes('IZIN') && !s.includes('ALPA');
    }).length;

    const persentase = totalSiswa > 0 ? ((hadirCount / totalSiswa) * 100).toFixed(1) : '0';
    return { totalSiswa, hadirCount, persentase };
  }, [siswaList, absensiLogs]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handlePrintIndividu = (siswa) => {
    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      const logsSiswa = absensiLogs.filter(log => 
        (siswa.rfid_uid && normalizeUid(log.rfid_uid) === normalizeUid(siswa.rfid_uid)) || 
        (log.nama && log.nama.trim().toLowerCase() === siswa.nama.trim().toLowerCase())
      );

      printWindow.document.write(`
        <html>
          <head>
            <title>Rekap Presensi Individu - ${siswa.nama}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
              th, td { border: 1px solid #333; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <h3 style="margin:0;">YAYASAN PENDIDIKAN KELUARGA MEDAN</h3>
              <h2 style="margin:4px 0;">SMK YPK MEDAN</h2>
              <p style="margin:0; font-size:12px;">REKAPITULASI PRESENSI INDIVIDU</p>
            </div>
            <p><b>Nama:</b> ${siswa.nama}</p>
            <p><b>Kelas / Jabatan:</b> ${siswa.kelas || '-'}</p>
            <p><b>UID RFID:</b> ${siswa.rfid_uid || '-'}</p>
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal & Waktu</th>
                  <th>Status Presensi</th>
                </tr>
              </thead>
              <tbody>
                ${logsSiswa.length === 0 ? '<tr><td colSpan="3" style="text-align:center;">Belum ada data presensi.</td></tr>' : 
                  logsSiswa.map((l, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${new Date(l.created_at).toLocaleString('id-ID')}</td>
                      <td>${l.status}</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading || !hasMounted) {
    return (
      <div style={styles.splashBg}>
        <div style={styles.splashCard}>
          <img src="/logo.png" alt="Logo SMK YPK Medan" style={styles.splashLogoImg} />
          <h2 style={styles.splashTitle}>SISTEM PRESENSI DIGITAL RFID &amp; NFC</h2>
          <p style={styles.splashSubtitlePrimary}>SMK BISA YPK LUAR BIASA</p>
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
            <img src="/logo.png" alt="Logo SMK YPK Medan" style={styles.loginLogoImg} />
            <h1 style={styles.loginTitle}>PORTAL PRESENSI DIGITAL SMK YPK MEDAN</h1>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.label}>Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
            </div>
            <button type="submit" style={styles.btnLogin}>Masuk Portal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4 portrait; margin: 1.2cm; }
        }
      `}</style>

      {/* AREA CETAK PDF RESMI */}
      <div className="print-area" style={{ display: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '3px double #000', paddingBottom: '10px', marginBottom: '15px' }}>
          <img src="/logo.png" alt="Logo Sekolah" style={{ width: '85px', height: '85px', marginRight: '20px', objectFit: 'contain' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>YAYASAN PENDIDIKAN KELUARGA MEDAN</h2>
            <h1 style={{ margin: '2px 0', fontSize: '20px', fontWeight: 'bold' }}>SMK YPK MEDAN</h1>
            <p style={{ margin: 0, fontSize: '11px' }}>Jl. Sakti Lubis No. 12, Medan, Sumatera Utara | Email: smkypkmedan@gmail.com</p>
          </div>
        </div>

        <h3 style={{ textAlign: 'center', textDecoration: 'underline', margin: '15px 0 5px 0', fontSize: '14px' }}>REKAPITULASI PRESENSI KEHADIRAN DIGITAL</h3>
        <p style={{ fontSize: '11px', marginBottom: '15px', textAlign: 'center' }}>Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        {/* Tabel Cetak Utama */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '25px' }} border="1" cellPadding="5">
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ width: '5%' }}>No</th>
              <th style={{ width: '25%' }}>Waktu Tap</th>
              <th style={{ width: '30%' }}>Nama Lengkap</th>
              <th style={{ width: '20%' }}>Kelas / Jabatan</th>
              <th style={{ width: '20%' }}>Status Presensi</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                <td style={{ fontWeight: 'bold' }}>{log.nama}</td>
                <td>{log.kelas}</td>
                <td>{log.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DASHBOARD UTAMA */}
      <div style={styles.dashboardContainer}>
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Logo SMK YPK Medan" style={styles.headerLogoImg} />
            <div>
              <h1 style={styles.headerTitle}>PRESENSI DIGITAL SMK YPK MEDAN</h1>
              <p style={styles.headerSubtitle}>Yayasan Pendidikan Keluarga Medan</p>
            </div>
          </div>
          <button onClick={handlePrint} style={styles.btnPdf}>🖨️ Cetak Rekap PDF</button>
        </header>

        {/* INDIKATOR PERSENTASE KEHADIRAN HARIAN SISWA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #2e7d32' }}>
            <span style={styles.statTitle}>Kehadiran Siswa Hari Ini</span>
            <span style={{ ...styles.statValue, color: '#2e7d32' }}>{siswaStatsToday.persentase}%</span>
            <span style={{ fontSize: '11px', color: '#666' }}>{siswaStatsToday.hadirCount} dari {siswaStatsToday.totalSiswa} Siswa Hadir</span>
          </div>
        </div>

        {/* TABEL MASTER DATA ANGGOTA */}
        <div style={styles.tableCard}>
          <div style={styles.tableHeaderInfo}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>📋 Master Data Anggota</h3>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>No</th>
                <th style={styles.th}>Nama Lengkap</th>
                <th style={styles.th}>Kelas / Jabatan</th>
                <th style={styles.th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((item, idx) => (
                <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td style={styles.td}>{idx + 1}</td>
                  <td style={{ ...styles.td, fontWeight: 'bold' }}>{item.nama}</td>
                  <td style={styles.td}>{item.kelas}</td>
                  <td style={styles.td}>
                    <button onClick={() => setDetailSiswa(item)} style={styles.btnDetailOutline}>👁️ Detail Profil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* REKAP HARIAN GURU (SIAPA AJA YANG HADIR) */}
        <div style={{ ...styles.tableCard, marginTop: '20px' }}>
          <div style={styles.tableHeaderInfo}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#e65100' }}>👨‍🏫 Rekap Harian Kehadiran Guru / Staff Hari Ini</h3>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#fff3e0' }}>
                <th style={styles.th}>No</th>
                <th style={styles.th}>Hari &amp; Tanggal</th>
                <th style={styles.th}>Jam Tap</th>
                <th style={styles.th}>Nama Guru / Staff</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {guruLogsToday.length === 0 ? (
                <tr><td colSpan={5} style={styles.tdEmpty}>Belum ada guru/staff yang tap hadir hari ini.</td></tr>
              ) : (
                guruLogsToday.map((log, idx) => {
                  const d = new Date(log.created_at);
                  const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
                  const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={log.id || idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>{hari}, {tgl}</td>
                      <td style={{ ...styles.td, fontWeight: 'bold', color: '#0288d1' }}>⏰ {jam} WIB</td>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{log.nama}</td>
                      <td style={styles.td}>{renderStatusBadge(log.status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL DETAIL & REKAP INDIVIDU */}
        {detailSiswa && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, color: '#2e7d32' }}>📄 Profil &amp; Rekap Individu</h3>
                <button onClick={() => setDetailSiswa(null)} style={styles.btnCloseModal}>✕</button>
              </div>
              <div style={{ marginTop: '16px' }}>
                <p><b>Nama:</b> {detailSiswa.nama}</p>
                <p><b>Kelas / Jabatan:</b> {detailSiswa.kelas}</p>
                <button onClick={() => handlePrintIndividu(detailSiswa)} style={{ ...styles.btnPdf, width: '100%', marginTop: '10px' }}>
                  📄 Cetak Rekap Individu ({detailSiswa.nama})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  splashBg: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' },
  splashCard: { textAlign: 'center', padding: '36px', borderRadius: '16px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  splashLogoImg: { width: '80px', height: '80px', marginBottom: '14px' },
  splashTitle: { fontSize: '15px', color: '#e65100', margin: '0 0 8px 0' },
  splashSubtitlePrimary: { fontSize: '12px', color: '#333' },
  progressBarBg: { width: '100%', height: '8px', backgroundColor: '#ffe0b2', borderRadius: '4px', marginTop: '16px' },
  progressBarFill: { height: '100%', backgroundColor: '#e65100' },
  splashPercent: { marginTop: '8px', fontSize: '12px', color: '#e65100' },

  loginBg: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#eee' },
  loginCard: { width: '100%', maxWidth: '380px', padding: '24px', backgroundColor: '#fff', borderRadius: '12px' },
  loginLogoImg: { width: '70px', height: '70px' },
  loginTitle: { fontSize: '14px', color: '#e65100', textAlign: 'center' },
  label: { fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' },
  input: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
  btnLogin: { width: '100%', padding: '10px', backgroundColor: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },

  dashboardContainer: { minHeight: '100vh', backgroundColor: '#f9f9f9', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px' },
  headerLogoImg: { width: '45px', height: '45px' },
  headerTitle: { margin: 0, fontSize: '18px', color: '#e65100' },
  headerSubtitle: { margin: 0, fontSize: '12px', color: '#666' },
  btnPdf: { backgroundColor: '#0288d1', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },

  statCard: { backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column' },
  statTitle: { fontSize: '12px', color: '#666' },
  statValue: { fontSize: '22px', fontWeight: 'bold' },

  tableCard: { backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden' },
  tableHeaderInfo: { padding: '16px', borderBottom: '1px solid #eee' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thRow: { backgroundColor: '#fff3e0' },
  th: { padding: '12px', textAlign: 'left', color: '#e65100' },
  td: { padding: '12px', borderBottom: '1px solid #eee' },
  tdEmpty: { padding: '20px', textAlign: 'center', color: '#888' },
  trEven: { backgroundColor: '#fff' },
  trOdd: { backgroundColor: '#fafafa' },

  badgeHadir: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeTelat: { backgroundColor: '#fff3e0', color: '#e65100', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeTanpaKartu: { backgroundColor: '#e1f5fe', color: '#0288d1', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeSakit: { backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeIzin: { backgroundColor: '#f3e5f5', color: '#7b1fa2', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeAlpha: { backgroundColor: '#ffebee', color: '#c62828', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },

  btnDetailOutline: { backgroundColor: '#fff', border: '1px solid #e65100', color: '#e65100', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '20px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnCloseModal: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }
};
